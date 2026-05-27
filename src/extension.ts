import * as path from "path";
import * as vscode from "vscode";
import { discoverTicketProject, discoverTicketProjects } from "./tickets/discovery";
import type { HierarchyGroup, HierarchyTicketNode } from "./tickets/hierarchy";
import { loadTicketIndex, type TicketIndex } from "./tickets/indexer";
import { isPathInsideOrEqual } from "./tickets/paths";
import type { TicketRelationshipMetadata } from "./tickets/relationships";
import type { TicketProject, TicketRecord, TicketWarning } from "./tickets/types";

type ViewNode = EmptyNode | GroupNode | TicketNode | WarningNode;

const selectedProjectRootKey = "vscode-tk.selectedProjectRoot";
const watcherRefreshDebounceMs = 150;

interface EmptyNode {
  readonly kind: "empty";
  readonly label: string;
  readonly description?: string;
}

interface GroupNode {
  readonly kind: "group";
  readonly label: string;
  readonly description?: string;
  readonly children: readonly ViewNode[];
}

interface TicketNode {
  readonly kind: "ticket";
  readonly ticket: TicketRecord;
  readonly hierarchyNode?: HierarchyTicketNode;
  readonly relationships?: TicketRelationshipMetadata;
  readonly children: readonly ViewNode[];
}

interface WarningNode {
  readonly kind: "warning";
  readonly warning: TicketWarning;
}

class TicketsTreeProvider implements vscode.TreeDataProvider<ViewNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ViewNode | undefined | null | void>();
  private readonly watcherDisposables: vscode.Disposable[] = [];
  private index: TicketIndex | null = null;
  private loading: Promise<boolean> | null = null;
  private treeView: vscode.TreeView<ViewNode> | null = null;
  private watchedTicketsDir: string | null = null;
  private selectedTicketIdentity: string | null = null;
  private rootNodes: readonly ViewNode[] = [
    {
      kind: "empty",
      label: "Open a workspace to browse tickets"
    }
  ];
  private searchQuery = "";
  private refreshGeneration = 0;
  private refreshTimer: NodeJS.Timeout | null = null;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly extensionContext: vscode.ExtensionContext) {}

  bindTreeView(treeView: vscode.TreeView<ViewNode>): void {
    this.treeView = treeView;
    this.extensionContext.subscriptions.push(
      treeView.onDidChangeSelection((event) => {
        const selected = event.selection[0];
        if (selected?.kind === "ticket") {
          this.selectedTicketIdentity = ticketIdentity(selected.ticket);
        }
      })
    );
  }

  async refresh(): Promise<void> {
    const generation = ++this.refreshGeneration;
    this.loading = this.reload(generation);
    const applied = await this.loading;
    if (!applied) {
      return;
    }
    this.onDidChangeTreeDataEmitter.fire();
    await this.revealSelectedTicket();
  }

  async search(): Promise<void> {
    const query = await vscode.window.showInputBox({
      title: "Search Tickets",
      prompt: "Search ticket id, title, status, priority, type, assignee, tags, or external ref",
      value: this.searchQuery
    });

    if (query === undefined) {
      return;
    }

    this.searchQuery = query.trim();
    this.rootNodes = this.createRootNodes();
    this.onDidChangeTreeDataEmitter.fire();
  }

  clearFilters(): void {
    this.searchQuery = "";
    this.rootNodes = this.createRootNodes();
    this.onDidChangeTreeDataEmitter.fire();
  }

  async switchProject(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
    const configuredProjectRoot = vscode.workspace.getConfiguration("vscode-tk").get<string | null>("projectRoot");

    if (configuredProjectRoot?.trim()) {
      await vscode.window.showInformationMessage("vscode-tk.projectRoot is set; clear that setting to switch projects from the UI.");
      return;
    }

    const projects = discoverTicketProjects(folders);
    if (projects.length === 0) {
      await vscode.window.showInformationMessage("No .tickets projects were discovered in the current workspace.");
      return;
    }

    const selected = await vscode.window.showQuickPick(projects.map((project) => ({
      label: projectLabel(project),
      description: project.source,
      detail: project.projectRoot,
      project
    })), {
      title: "Switch Ticket Project",
      placeHolder: "Choose the .tickets project to show in the Tickets view"
    });

    if (!selected) {
      return;
    }

    await this.extensionContext.workspaceState.update(selectedProjectRootKey, selected.project.projectRoot);
    this.searchQuery = "";
    this.selectedTicketIdentity = null;
    await this.refresh();
  }

  async openTicket(item: ViewNode | undefined, options?: vscode.TextDocumentShowOptions): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket to open its Markdown file.");
      return;
    }

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(ticket.filePath));
    await vscode.window.showTextDocument(document, options);
  }

  async copyTicketId(item: ViewNode | undefined): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket to copy its id.");
      return;
    }

    await vscode.env.clipboard.writeText(ticket.id);
  }

  async revealTicketFile(item: ViewNode | undefined): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket to reveal its file.");
      return;
    }

    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(ticket.filePath));
  }

  getTreeItem(item: ViewNode): vscode.TreeItem {
    switch (item.kind) {
      case "empty":
        return this.emptyTreeItem(item);
      case "group":
        return this.groupTreeItem(item);
      case "ticket":
        return this.ticketTreeItem(item);
      case "warning":
        return this.warningTreeItem(item);
    }
  }

  async getChildren(item?: ViewNode): Promise<ViewNode[]> {
    if (!item && !this.index && !this.loading) {
      await this.refresh();
    } else if (!item && this.loading) {
      await this.loading;
    }

    if (item?.kind === "group" || item?.kind === "ticket") {
      return [...item.children];
    }

    if (item) {
      return [];
    }

    return [...this.rootNodes];
  }

  private async reload(generation: number): Promise<boolean> {
    const folders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
    const configuredProjectRoot = vscode.workspace.getConfiguration("vscode-tk").get<string | null>("projectRoot");
    const allowExternalProjectRoot = vscode.workspace.getConfiguration("vscode-tk").get<boolean>("allowExternalProjectRoot") ?? false;
    const selectedProjectRoot = this.extensionContext.workspaceState.get<string>(selectedProjectRootKey);
    const discovery = discoverTicketProject(folders, configuredProjectRoot, selectedProjectRoot, allowExternalProjectRoot);

    if (discovery.kind === "none") {
      this.index = null;
      this.updateTreeDescription(null);
      this.updateWatcher(null);
      this.rootNodes = [
        {
          kind: "empty",
          label: folders.length === 0 ? "Open a workspace to browse tickets" : "No .tickets project found",
          description: folders.length === 0 ? undefined : "Set vscode-tk.projectRoot or open a tk repo"
        }
      ];
      return true;
    }

    if (discovery.kind === "ambiguous") {
      this.index = null;
      this.updateTreeDescription(null);
      this.updateWatcher(null);
      this.rootNodes = [
        {
          kind: "empty",
          label: "Multiple ticket projects found",
          description: "Run Switch Ticket Project or set vscode-tk.projectRoot"
        },
        ...discovery.candidates.map((project) => projectNode(project))
      ];
      return true;
    }

    if (discovery.kind === "blockedExternal") {
      this.index = null;
      this.updateTreeDescription(null);
      this.updateWatcher(null);
      this.rootNodes = [
        {
          kind: "empty",
          label: "External ticket project blocked",
          description: "Enable vscode-tk.allowExternalProjectRoot to use this path"
        },
        projectNode(discovery.project)
      ];
      return true;
    }

    const index = await loadTicketIndex(discovery.project);
    if (generation !== this.refreshGeneration) {
      return false;
    }

    this.index = index;
    this.updateTreeDescription(discovery.project);
    this.updateWatcher(discovery.project.ticketsDir);
    this.rootNodes = this.createRootNodes();
    return true;
  }

  private updateTreeDescription(project: TicketProject | null): void {
    if (!this.treeView) {
      return;
    }

    this.treeView.description = project ? projectLabel(project) : undefined;
  }

  private updateWatcher(ticketsDir: string | null): void {
    if (this.watchedTicketsDir === ticketsDir) {
      return;
    }

    this.clearPendingWatcherRefresh();
    for (const disposable of this.watcherDisposables.splice(0)) {
      disposable.dispose();
    }
    this.watchedTicketsDir = ticketsDir;

    if (!ticketsDir) {
      return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ticketsDir, "*.md"));
    const refresh = () => {
      this.scheduleWatcherRefresh();
    };
    this.watcherDisposables.push(
      watcher,
      watcher.onDidCreate(refresh),
      watcher.onDidChange(refresh),
      watcher.onDidDelete(refresh)
    );
    this.extensionContext.subscriptions.push(watcher);
  }

  private scheduleWatcherRefresh(): void {
    this.clearPendingWatcherRefresh();
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, watcherRefreshDebounceMs);
  }

  private clearPendingWatcherRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private createRootNodes(): readonly ViewNode[] {
    if (!this.index) {
      return this.rootNodes;
    }

    if (this.index.tickets.length === 0 && this.index.parseWarnings.length === 0) {
      return [
        {
          kind: "empty",
          label: "No tickets found",
          description: path.relative(this.index.project.projectRoot, this.index.project.ticketsDir)
        }
      ];
    }

    if (this.searchQuery) {
      const matches = this.index.tickets.filter((ticket) => ticketMatches(ticket, this.searchQuery));
      return matches.length > 0
        ? [{
            kind: "group",
            label: "Search Results",
            description: `${matches.length}`,
            children: matches.map((ticket) => this.ticketNodeFromRecord(ticket))
          }]
        : [{
            kind: "empty",
            label: "No matching tickets",
            description: this.searchQuery
          }];
    }

    const nodes: ViewNode[] = this.index.hierarchy.groups.map((group) => this.groupNodeFromHierarchy(group));
    const warningsNode = this.warningsNode();
    if (warningsNode) {
      nodes.push(warningsNode);
    }

    return nodes.length > 0
      ? nodes
      : [{
          kind: "empty",
          label: "No visible tickets",
          description: "Closed-only subtrees are hidden by default"
        }];
  }

  private groupNodeFromHierarchy(group: HierarchyGroup): GroupNode {
    return {
      kind: "group",
      label: group.label,
      description: `${group.children.length}`,
      children: group.children.map((node) => this.ticketNodeFromHierarchy(node))
    };
  }

  private ticketNodeFromHierarchy(node: HierarchyTicketNode): TicketNode {
    const relationships = this.index?.relationships.byTicketId.get(node.ticket.id);
    return {
      kind: "ticket",
      ticket: node.ticket,
      hierarchyNode: node,
      relationships,
      children: node.children.map((child) => this.ticketNodeFromHierarchy(child))
    };
  }

  private ticketNodeFromRecord(ticket: TicketRecord): TicketNode {
    return {
      kind: "ticket",
      ticket,
      relationships: this.index?.relationships.byTicketId.get(ticket.id),
      children: []
    };
  }

  private warningsNode(): GroupNode | null {
    if (!this.index) {
      return null;
    }

    const parseWarnings = [...this.index.parseWarnings];
    const relationshipWarnings = [
      ...this.index.hierarchy.warnings,
      ...this.index.relationships.warnings
    ];
    const children: GroupNode[] = [];

    if (parseWarnings.length > 0) {
      children.push({
        kind: "group",
        label: "Parse",
        description: `${parseWarnings.length}`,
        children: parseWarnings.map((warning) => ({ kind: "warning", warning }))
      });
    }

    if (relationshipWarnings.length > 0) {
      children.push({
        kind: "group",
        label: "Relationships",
        description: `${relationshipWarnings.length}`,
        children: relationshipWarnings.map((warning) => ({ kind: "warning", warning }))
      });
    }

    return children.length > 0
      ? {
          kind: "group",
          label: "Warnings",
          description: `${parseWarnings.length + relationshipWarnings.length}`,
          children
        }
      : null;
  }

  private emptyTreeItem(item: EmptyNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
    treeItem.description = item.description;
    treeItem.contextValue = "empty";
    return treeItem;
  }

  private groupTreeItem(item: GroupNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.Expanded);
    treeItem.description = item.description;
    treeItem.contextValue = "group";
    return treeItem;
  }

  private ticketTreeItem(item: TicketNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(`${item.ticket.id} ${item.ticket.title}`, item.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    treeItem.description = ticketDescription(item);
    treeItem.tooltip = ticketTooltip(item);
    treeItem.resourceUri = vscode.Uri.file(item.ticket.filePath);
    treeItem.command = {
      command: "vscode-tk.openTicket",
      title: "Open Ticket",
      arguments: [item]
    };
    treeItem.contextValue = "ticket";
    return treeItem;
  }

  private warningTreeItem(item: WarningNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(item.warning.message, vscode.TreeItemCollapsibleState.None);
    treeItem.description = path.basename(item.warning.filePath);
    treeItem.resourceUri = vscode.Uri.file(item.warning.filePath);
    treeItem.contextValue = "warning";
    return treeItem;
  }

  private async revealSelectedTicket(): Promise<void> {
    if (!this.selectedTicketIdentity || !this.treeView) {
      return;
    }

    const selectedNode = findTicketNode(this.rootNodes, this.selectedTicketIdentity);
    if (!selectedNode) {
      return;
    }

    try {
      await this.treeView.reveal(selectedNode, {
        select: true,
        focus: false,
        expand: true
      });
    } catch {
      // Revealing is best-effort; refresh should still succeed if VS Code cannot reveal.
    }
  }

  private indexedTicketFromItem(item?: ViewNode): TicketRecord | null {
    if (!this.index || item?.kind !== "ticket") {
      return null;
    }

    const node = findTicketNode(this.rootNodes, ticketIdentity(item.ticket));
    if (!node || !isPathInsideOrEqual(node.ticket.filePath, this.index.project.ticketsDir)) {
      return null;
    }

    return node.ticket;
  }
}

function projectNode(project: TicketProject): EmptyNode {
  return {
    kind: "empty",
    label: projectLabel(project),
    description: project.source
  };
}

function projectLabel(project: TicketProject): string {
  return path.basename(project.projectRoot) || project.projectRoot;
}

function ticketMatches(ticket: TicketRecord, query: string): boolean {
  const normalized = query.toLowerCase();
  const haystack = [
    ticket.id,
    ticket.title,
    ticket.status,
    ticket.priority?.toString() ?? "",
    ticket.type,
    ticket.assignee,
    ticket.externalRef ?? "",
    ...ticket.tags
  ].join(" ").toLowerCase();

  return haystack.includes(normalized);
}

function findTicketNode(nodes: readonly ViewNode[], identity: string): TicketNode | null {
  for (const node of nodes) {
    if (node.kind === "ticket" && ticketIdentity(node.ticket) === identity) {
      return node;
    }
    if ((node.kind === "group" || node.kind === "ticket") && node.children.length > 0) {
      const child = findTicketNode(node.children, identity);
      if (child) {
        return child;
      }
    }
  }

  return null;
}

function ticketIdentity(ticket: TicketRecord): string {
  return `${ticket.projectRoot}::${ticket.id}`;
}

function ticketDescription(item: TicketNode): string {
  const pieces = [
    `p${item.ticket.priority ?? "?"}`,
    item.ticket.status
  ];
  const relationships = item.relationships;
  if (relationships) {
    pieces.push(`deps ${relationships.dependencyCount}`);
    pieces.push(`blocks ${relationships.blockerCount}`);
    pieces.push(`links ${relationships.linkCount}`);
  }
  if (item.hierarchyNode?.closedChildCount) {
    pieces.push(`${item.hierarchyNode.closedChildCount} closed`);
  }
  return pieces.join(" · ");
}

function ticketTooltip(item: TicketNode): string {
  const relationships = item.relationships;
  const lines = [
    `${item.ticket.id}: ${item.ticket.title}`,
    `Status: ${item.ticket.status}`,
    `Priority: ${item.ticket.priority ?? "unknown"}`,
    `Type: ${item.ticket.type}`
  ];
  if (relationships) {
    lines.push(`Dependencies: ${relationships.dependencyIds.join(", ") || "none"}`);
    lines.push(`Blocks: ${relationships.blockerIds.join(", ") || "none"}`);
    lines.push(`Links: ${relationships.linkIds.join(", ") || "none"}`);
  }
  return lines.join("\n");
}

export function activate(context: vscode.ExtensionContext): void {
  const ticketsProvider = new TicketsTreeProvider(context);
  const treeView = vscode.window.createTreeView("vscodeTk.tickets", {
    treeDataProvider: ticketsProvider,
    showCollapseAll: true
  });
  ticketsProvider.bindTreeView(treeView);

  context.subscriptions.push(
    treeView,
    vscode.commands.registerCommand("vscode-tk.refresh", () => ticketsProvider.refresh()),
    vscode.commands.registerCommand("vscode-tk.switchProject", () => ticketsProvider.switchProject()),
    vscode.commands.registerCommand("vscode-tk.search", () => ticketsProvider.search()),
    vscode.commands.registerCommand("vscode-tk.clearFilters", () => ticketsProvider.clearFilters()),
    vscode.commands.registerCommand("vscode-tk.openTicket", (item?: ViewNode) => ticketsProvider.openTicket(item, { preview: true })),
    vscode.commands.registerCommand("vscode-tk.openTicketPinned", (item?: ViewNode) => ticketsProvider.openTicket(item, { preview: false })),
    vscode.commands.registerCommand("vscode-tk.openTicketToSide", (item?: ViewNode) => ticketsProvider.openTicket(item, { preview: false, viewColumn: vscode.ViewColumn.Beside })),
    vscode.commands.registerCommand("vscode-tk.copyTicketId", (item?: ViewNode) => ticketsProvider.copyTicketId(item)),
    vscode.commands.registerCommand("vscode-tk.revealTicketFile", (item?: ViewNode) => ticketsProvider.revealTicketFile(item))
  );
}

export function deactivate(): void {
  // No extension-owned resources need shutdown in the MVP TreeView.
}

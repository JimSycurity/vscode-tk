import * as path from "path";
import * as vscode from "vscode";
import { checkTkCli, defaultTkCommand, runTkMutation, type TkMutation, type TkRunResult } from "./tickets/cli";
import { discoverTicketProject, discoverTicketProjects } from "./tickets/discovery";
import type { HierarchyGroup, HierarchyTicketNode } from "./tickets/hierarchy";
import { loadTicketIndex, type TicketIndex } from "./tickets/indexer";
import { isPathInsideOrEqual } from "./tickets/paths";
import type { TicketRelationshipMetadata } from "./tickets/relationships";
import type { TicketProject, TicketRecord, TicketWarning } from "./tickets/types";

type ViewNode = EmptyNode | GroupNode | TicketNode | WarningNode | ProjectNode;

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

interface ProjectNode {
  readonly kind: "project";
  readonly project: TicketProject;
  readonly children: readonly ViewNode[];
}

interface TicketPickItem extends vscode.QuickPickItem {
  readonly ticketId: string;
}

class TicketsTreeProvider implements vscode.TreeDataProvider<ViewNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ViewNode | undefined | null | void>();
  private readonly watcherDisposables: vscode.Disposable[] = [];
  private indexes: readonly TicketIndex[] = [];
  private loading: Promise<boolean> | null = null;
  private treeView: vscode.TreeView<ViewNode> | null = null;
  private watchedTicketsDirs = new Set<string>();
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
    const allowExternalProjectRoot = vscode.workspace.getConfiguration("vscode-tk").get<boolean>("allowExternalProjectRoot") ?? false;

    if (configuredProjectRoot?.trim()) {
      await vscode.window.showInformationMessage("vscode-tk.projectRoot is set; clear that setting to switch projects from the UI.");
      return;
    }

    const discoveredProjects = discoverTicketProjects(folders);
    const projects = allowExternalProjectRoot
      ? discoveredProjects
      : discoveredProjects.filter((project) => !project.isExternal);
    if (projects.length === 0) {
      if (discoveredProjects.some((project) => project.isExternal)) {
        await vscode.window.showInformationMessage("Only external .tickets projects were discovered. Enable vscode-tk.allowExternalProjectRoot to switch to them.");
        return;
      }
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

    await this.revealProject(selected.project);
  }

  async selectProjectFromNode(item?: ViewNode): Promise<void> {
    if (item?.kind !== "project") {
      await vscode.window.showInformationMessage("Select a ticket project first.");
      return;
    }

    const configuredProjectRoot = vscode.workspace.getConfiguration("vscode-tk").get<string | null>("projectRoot");
    if (configuredProjectRoot?.trim()) {
      await vscode.window.showInformationMessage("vscode-tk.projectRoot is set; clear that setting to switch projects from the UI.");
      return;
    }

    await this.revealProject(item.project);
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

  async createTicket(): Promise<void> {
    const title = await vscode.window.showInputBox({
      title: "Create Ticket",
      prompt: "Ticket title",
      validateInput: (value) => value.trim() ? undefined : "A title is required"
    });
    if (title === undefined) {
      return;
    }

    const project = await this.pickProjectForCreate();
    if (!project) {
      return;
    }

    await this.runMutation({ kind: "create", title: title.trim() }, "Ticket created.", project);
  }

  async createChildTicket(item?: ViewNode): Promise<void> {
    const parent = this.indexedTicketFromItem(item);
    if (!parent) {
      await vscode.window.showInformationMessage("Select an indexed parent ticket first.");
      return;
    }

    const title = await vscode.window.showInputBox({
      title: "Add Child Ticket",
      prompt: `Child ticket title for ${parent.id}`,
      validateInput: (value) => value.trim() ? undefined : "A title is required"
    });
    if (title === undefined) {
      return;
    }

    await this.runMutation({ kind: "create", title: title.trim(), parent: parent.id }, "Child ticket created.", parent);
  }

  async startTicket(item?: ViewNode): Promise<void> {
    await this.runTicketMutation(item, (ticket) => ({ kind: "start", id: ticket.id }), "Ticket started.");
  }

  async closeTicket(item?: ViewNode): Promise<void> {
    await this.runTicketMutation(item, (ticket) => ({ kind: "close", id: ticket.id }), "Ticket closed.");
  }

  async reopenTicket(item?: ViewNode): Promise<void> {
    await this.runTicketMutation(item, (ticket) => ({ kind: "reopen", id: ticket.id }), "Ticket reopened.");
  }

  async addDependency(item?: ViewNode): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket first.");
      return;
    }

    const dependencyId = await this.pickTicketId(ticket.projectRoot, "Add Dependency", `${ticket.id} depends on...`, [ticket.id, ...ticket.deps]);
    if (!dependencyId) {
      return;
    }

    await this.runMutation({ kind: "addDependency", id: ticket.id, dependencyId }, "Dependency added.", ticket);
  }

  async removeDependency(item?: ViewNode): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket first.");
      return;
    }

    const dependencyId = await this.pickExistingRelationshipId(ticket.projectRoot, "Remove Dependency", "Dependency to remove", ticket.deps);
    if (!dependencyId) {
      return;
    }

    await this.runMutation({ kind: "removeDependency", id: ticket.id, dependencyId }, "Dependency removed.", ticket);
  }

  async linkTicket(item?: ViewNode): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket first.");
      return;
    }

    const targetIds = await this.pickTicketIds(ticket.projectRoot, "Link Ticket", "Tickets to link", [ticket.id, ...ticket.links]);
    if (targetIds.length === 0) {
      return;
    }

    await this.runMutation({ kind: "link", id: ticket.id, targetIds }, "Ticket linked.", ticket);
  }

  async unlinkTicket(item?: ViewNode): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket first.");
      return;
    }

    const targetId = await this.pickExistingRelationshipId(ticket.projectRoot, "Unlink Ticket", "Linked ticket to remove", ticket.links);
    if (!targetId) {
      return;
    }

    await this.runMutation({ kind: "unlink", id: ticket.id, targetId }, "Ticket unlinked.", ticket);
  }

  async addNote(item?: ViewNode): Promise<void> {
    await this.runTicketMutationWithInput(item, "Add Note", "Note text", "Note added.", (ticket, value) => ({
      kind: "addNote",
      id: ticket.id,
      text: value
    }));
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
      case "project":
        return this.projectTreeItem(item);
    }
  }

  async getChildren(item?: ViewNode): Promise<ViewNode[]> {
    if (!item && this.indexes.length === 0 && !this.loading) {
      await this.refresh();
    } else if (!item && this.loading) {
      await this.loading;
    }

    if (item?.kind === "group" || item?.kind === "ticket" || item?.kind === "project") {
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
    const discovery = discoverTicketProject(folders, configuredProjectRoot, null, allowExternalProjectRoot);

    if (discovery.kind === "none") {
      this.indexes = [];
      this.updateTreeDescription(null);
      this.updateWatchers([]);
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
      const indexes = await Promise.all(discovery.candidates.map((project) => loadTicketIndex(project)));
      if (generation !== this.refreshGeneration) {
        return false;
      }

      this.indexes = indexes;
      this.updateTreeDescription(null);
      this.updateWatchers(indexes.map((index) => index.project.ticketsDir));
      this.rootNodes = this.createRootNodes();
      return true;
    }

    if (discovery.kind === "blockedExternal") {
      this.indexes = [];
      this.updateTreeDescription(null);
      this.updateWatchers([]);
      this.rootNodes = [
        {
          kind: "empty",
          label: "External ticket project blocked",
          description: "Enable vscode-tk.allowExternalProjectRoot to use this path"
        },
        projectNode(discovery.project, [])
      ];
      return true;
    }

    const index = await loadTicketIndex(discovery.project);
    if (generation !== this.refreshGeneration) {
      return false;
    }

    this.indexes = [index];
    this.updateTreeDescription(discovery.project);
    this.updateWatchers([discovery.project.ticketsDir]);
    this.rootNodes = this.createRootNodes();
    return true;
  }

  private updateTreeDescription(project: TicketProject | null): void {
    if (!this.treeView) {
      return;
    }

    this.treeView.description = project ? projectLabel(project) : undefined;
  }

  private updateWatchers(ticketsDirs: readonly string[]): void {
    const nextTicketsDirs = new Set(ticketsDirs);
    if (setsEqual(this.watchedTicketsDirs, nextTicketsDirs)) {
      return;
    }

    this.clearPendingWatcherRefresh();
    for (const disposable of this.watcherDisposables.splice(0)) {
      disposable.dispose();
    }
    this.watchedTicketsDirs = nextTicketsDirs;

    for (const ticketsDir of ticketsDirs) {
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
    if (this.indexes.length === 0) {
      return this.rootNodes;
    }

    return this.indexes.map((index) => projectNode(index.project, this.projectChildren(index)));
  }

  private projectChildren(index: TicketIndex): readonly ViewNode[] {
    if (index.tickets.length === 0 && index.parseWarnings.length === 0) {
      return [{
        kind: "empty",
        label: "No tickets found",
        description: path.relative(index.project.projectRoot, index.project.ticketsDir)
      }];
    }

    if (this.searchQuery) {
      const matches = index.tickets.filter((ticket) => ticketMatches(ticket, this.searchQuery));
      return matches.length > 0
        ? matches.map((ticket) => this.ticketNodeFromRecord(index, ticket))
        : [{
            kind: "empty",
            label: "No matching tickets",
            description: this.searchQuery
          }];
    }

    const nodes: ViewNode[] = index.hierarchy.groups.flatMap((group) => this.nodesFromHierarchyGroup(index, group));
    const warningsNode = this.warningsNode(index);
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

  private nodesFromHierarchyGroup(index: TicketIndex, group: HierarchyGroup): readonly ViewNode[] {
    if (group.id === "unparented") {
      return group.children.map((node) => this.ticketNodeFromHierarchy(index, node));
    }

    return [this.groupNodeFromHierarchy(index, group)];
  }

  private groupNodeFromHierarchy(index: TicketIndex, group: HierarchyGroup): GroupNode {
    return {
      kind: "group",
      label: group.label,
      description: `${group.children.length}`,
      children: group.children.map((node) => this.ticketNodeFromHierarchy(index, node))
    };
  }

  private ticketNodeFromHierarchy(index: TicketIndex, node: HierarchyTicketNode): TicketNode {
    const relationships = index.relationships.byTicketId.get(node.ticket.id);
    return {
      kind: "ticket",
      ticket: node.ticket,
      hierarchyNode: node,
      relationships,
      children: node.children.map((child) => this.ticketNodeFromHierarchy(index, child))
    };
  }

  private ticketNodeFromRecord(index: TicketIndex, ticket: TicketRecord): TicketNode {
    return {
      kind: "ticket",
      ticket,
      relationships: index.relationships.byTicketId.get(ticket.id),
      children: []
    };
  }

  private warningsNode(index: TicketIndex): GroupNode | null {
    const parseWarnings = [...index.parseWarnings];
    const relationshipWarnings = [
      ...index.hierarchy.warnings,
      ...index.relationships.warnings
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
    if (item.children.length === 0) {
      treeItem.command = {
        command: "vscode-tk.openTicket",
        title: "Open Ticket",
        arguments: [item]
      };
    }
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

  private projectTreeItem(item: ProjectNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(projectLabel(item.project), item.children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    treeItem.description = `${item.project.source} · ${item.children.length}`;
    treeItem.tooltip = item.project.projectRoot;
    treeItem.contextValue = "project";
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
    if (item?.kind !== "ticket") {
      return null;
    }

    const index = this.indexForTicket(item.ticket);
    if (!index) {
      return null;
    }

    const node = findTicketNode(this.rootNodes, ticketIdentity(item.ticket));
    if (!node || !isPathInsideOrEqual(node.ticket.filePath, index.project.ticketsDir)) {
      return null;
    }

    return node.ticket;
  }

  private projectForMutation(ticketOrProject?: TicketRecord | TicketProject): TicketProject | null {
    if (ticketOrProject && "filePath" in ticketOrProject) {
      return this.indexForTicket(ticketOrProject)?.project ?? null;
    }

    if (ticketOrProject) {
      return ticketOrProject;
    }

    return this.indexes.length === 1 ? this.indexes[0].project : null;
  }

  private indexForTicket(ticket: TicketRecord): TicketIndex | null {
    return this.indexes.find((index) => index.project.projectRoot === ticket.projectRoot && index.project.ticketsDir === ticket.ticketsDir) ?? null;
  }

  private async revealProject(project: TicketProject): Promise<void> {
    await this.extensionContext.workspaceState.update(selectedProjectRootKey, project.projectRoot);
    const node = findProjectNode(this.rootNodes, project.projectRoot);
    if (node && this.treeView) {
      await this.treeView.reveal(node, { select: true, focus: true, expand: true });
    }
  }

  private ticketPickItems(projectRoot: string, excludedIds: readonly string[] = []): TicketPickItem[] {
    const index = this.indexForProjectRoot(projectRoot);
    if (!index) {
      return [];
    }

    const excluded = new Set(excludedIds);
    return index.tickets
      .filter((ticket) => !excluded.has(ticket.id))
      .map((ticket) => ({
        label: `${ticket.id} ${ticket.title}`,
        description: ticket.status,
        detail: ticketDescriptionText(ticket),
        ticketId: ticket.id
      }));
  }

  private async pickTicketId(projectRoot: string, title: string, placeHolder: string, excludedIds: readonly string[] = []): Promise<string | null> {
    const selected = await vscode.window.showQuickPick(this.ticketPickItems(projectRoot, excludedIds), {
      title,
      placeHolder,
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selected?.ticketId ?? null;
  }

  private async pickTicketIds(projectRoot: string, title: string, placeHolder: string, excludedIds: readonly string[] = []): Promise<readonly string[]> {
    const selected = await vscode.window.showQuickPick(this.ticketPickItems(projectRoot, excludedIds), {
      title,
      placeHolder,
      canPickMany: true,
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selected?.map((item) => item.ticketId) ?? [];
  }

  private async pickExistingRelationshipId(projectRoot: string, title: string, placeHolder: string, ids: readonly string[]): Promise<string | null> {
    const selected = await vscode.window.showQuickPick(ids.map((id) => relationshipPickItem(id, this.ticketById(projectRoot, id))), {
      title,
      placeHolder,
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selected?.ticketId ?? null;
  }

  private indexForProjectRoot(projectRoot: string): TicketIndex | null {
    return this.indexes.find((index) => index.project.projectRoot === projectRoot) ?? null;
  }

  private ticketById(projectRoot: string, id: string): TicketRecord | undefined {
    return this.indexForProjectRoot(projectRoot)?.tickets.find((ticket) => ticket.id === id);
  }

  private async runTicketMutation(item: ViewNode | undefined, mutation: (ticket: TicketRecord) => TkMutation, successMessage: string): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket first.");
      return;
    }

    await this.runMutation(mutation(ticket), successMessage, ticket);
  }

  private async runTicketMutationWithInput(
    item: ViewNode | undefined,
    title: string,
    prompt: string,
    successMessage: string,
    mutation: (ticket: TicketRecord, value: string) => TkMutation
  ): Promise<void> {
    const ticket = this.indexedTicketFromItem(item);
    if (!ticket) {
      await vscode.window.showInformationMessage("Select an indexed ticket first.");
      return;
    }

    const value = await vscode.window.showInputBox({
      title,
      prompt,
      validateInput: (input) => input.trim() ? undefined : "A value is required"
    });
    if (value === undefined) {
      return;
    }

    await this.runMutation(mutation(ticket, value.trim()), successMessage, ticket);
  }

  private async pickProjectForCreate(): Promise<TicketProject | null> {
    if (this.indexes.length === 1) {
      return this.indexes[0].project;
    }

    const selected = await vscode.window.showQuickPick(this.indexes.map((index) => ({
      label: projectLabel(index.project),
      description: index.project.source,
      detail: index.project.projectRoot,
      project: index.project
    })), {
      title: "Create Ticket",
      placeHolder: "Choose the ticket project for the new ticket"
    });

    return selected?.project ?? null;
  }

  private async runMutation(mutation: TkMutation, successMessage: string, target?: TicketRecord | TicketProject): Promise<void> {
    const project = this.projectForMutation(target);
    if (!project) {
      await vscode.window.showInformationMessage("Open a ticket project before running ticket CLI commands.");
      return;
    }

    const command = ticketCliCommand();
    const diagnostic = await checkTkCli(command);
    await vscode.commands.executeCommand("setContext", "vscodeTk.tkCliAvailable", diagnostic.available);
    if (!diagnostic.available) {
      await vscode.window.showWarningMessage(diagnostic.message);
      return;
    }

    const allowExternalProjectRoot = vscode.workspace.getConfiguration("vscode-tk").get<boolean>("allowExternalProjectRoot") ?? false;
    const result = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Running ${command}`,
      cancellable: false
    }, () => runTkMutation(mutation, { project, command, allowExternalProjectRoot }));

    if (!result.ok) {
      await showTkFailure(result);
      return;
    }

    await this.refresh();
    await vscode.window.showInformationMessage(successMessage);
  }
}

function ticketCliCommand(): string {
  const configured = vscode.workspace.getConfiguration("vscode-tk").get<string>("command");
  const command = configured?.trim();
  return command && command.length > 0 ? command : defaultTkCommand;
}

function projectNode(project: TicketProject, children: readonly ViewNode[]): ProjectNode {
  return {
    kind: "project",
    project,
    children
  };
}

function projectLabel(project: TicketProject): string {
  return path.basename(project.projectRoot) || project.projectRoot;
}

function relationshipPickItem(id: string, ticket?: TicketRecord): TicketPickItem {
  return {
    label: ticket ? `${ticket.id} ${ticket.title}` : id,
    description: ticket?.status ?? "unresolved",
    detail: ticket ? ticketDescriptionText(ticket) : undefined,
    ticketId: id
  };
}

function ticketDescriptionText(ticket: TicketRecord): string {
  return [
    `p${ticket.priority ?? "?"}`,
    ticket.type,
    ticket.assignee
  ].filter(Boolean).join(" · ");
}

async function showTkFailure(result: Extract<TkRunResult, { readonly ok: false }>): Promise<void> {
  const output = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
  const message = output ? `${result.message}\n${truncate(output, 800)}` : result.message;
  await vscode.window.showErrorMessage(message);
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
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
    if ((node.kind === "group" || node.kind === "ticket" || node.kind === "project") && node.children.length > 0) {
      const child = findTicketNode(node.children, identity);
      if (child) {
        return child;
      }
    }
  }

  return null;
}

function findProjectNode(nodes: readonly ViewNode[], projectRoot: string): ProjectNode | null {
  for (const node of nodes) {
    if (node.kind === "project" && node.project.projectRoot === projectRoot) {
      return node;
    }
  }

  return null;
}

function ticketIdentity(ticket: TicketRecord): string {
  return `${ticket.projectRoot}::${ticket.id}`;
}

function setsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
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
    vscode.commands.registerCommand("vscode-tk.selectProject", (item?: ViewNode) => ticketsProvider.selectProjectFromNode(item)),
    vscode.commands.registerCommand("vscode-tk.search", () => ticketsProvider.search()),
    vscode.commands.registerCommand("vscode-tk.clearFilters", () => ticketsProvider.clearFilters()),
    vscode.commands.registerCommand("vscode-tk.openTicket", (item?: ViewNode) => ticketsProvider.openTicket(item, { preview: true })),
    vscode.commands.registerCommand("vscode-tk.openTicketPinned", (item?: ViewNode) => ticketsProvider.openTicket(item, { preview: false })),
    vscode.commands.registerCommand("vscode-tk.openTicketToSide", (item?: ViewNode) => ticketsProvider.openTicket(item, { preview: false, viewColumn: vscode.ViewColumn.Beside })),
    vscode.commands.registerCommand("vscode-tk.copyTicketId", (item?: ViewNode) => ticketsProvider.copyTicketId(item)),
    vscode.commands.registerCommand("vscode-tk.revealTicketFile", (item?: ViewNode) => ticketsProvider.revealTicketFile(item)),
    vscode.commands.registerCommand("vscode-tk.createTicket", () => ticketsProvider.createTicket()),
    vscode.commands.registerCommand("vscode-tk.createChildTicket", (item?: ViewNode) => ticketsProvider.createChildTicket(item)),
    vscode.commands.registerCommand("vscode-tk.startTicket", (item?: ViewNode) => ticketsProvider.startTicket(item)),
    vscode.commands.registerCommand("vscode-tk.closeTicket", (item?: ViewNode) => ticketsProvider.closeTicket(item)),
    vscode.commands.registerCommand("vscode-tk.reopenTicket", (item?: ViewNode) => ticketsProvider.reopenTicket(item)),
    vscode.commands.registerCommand("vscode-tk.addDependency", (item?: ViewNode) => ticketsProvider.addDependency(item)),
    vscode.commands.registerCommand("vscode-tk.removeDependency", (item?: ViewNode) => ticketsProvider.removeDependency(item)),
    vscode.commands.registerCommand("vscode-tk.linkTicket", (item?: ViewNode) => ticketsProvider.linkTicket(item)),
    vscode.commands.registerCommand("vscode-tk.unlinkTicket", (item?: ViewNode) => ticketsProvider.unlinkTicket(item)),
    vscode.commands.registerCommand("vscode-tk.addNote", (item?: ViewNode) => ticketsProvider.addNote(item))
  );
}

export function deactivate(): void {
  // No extension-owned resources need shutdown in the MVP TreeView.
}

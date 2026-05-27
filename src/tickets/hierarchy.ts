import type { TicketRecord, TicketWarning } from "./types";

export type TicketStatusKind = "active" | "closed" | "unknown";

export interface HierarchyTicketNode {
  readonly kind: "ticket";
  readonly ticket: TicketRecord;
  readonly statusKind: TicketStatusKind;
  readonly children: readonly HierarchyTicketNode[];
  readonly closedChildCount: number;
}

export interface HierarchyGroup {
  readonly kind: "group";
  readonly id: "unparented" | "unresolvedParent";
  readonly label: string;
  readonly children: readonly HierarchyTicketNode[];
}

export interface TicketHierarchy {
  readonly groups: readonly HierarchyGroup[];
  readonly warnings: readonly TicketWarning[];
}

interface MutableNode {
  readonly ticket: TicketRecord;
  readonly statusKind: TicketStatusKind;
  readonly children: MutableNode[];
}

export function classifyStatus(status: string): TicketStatusKind {
  switch (status) {
    case "open":
    case "in_progress":
      return "active";
    case "closed":
      return "closed";
    default:
      return "unknown";
  }
}

export function buildTicketHierarchy(tickets: readonly TicketRecord[]): TicketHierarchy {
  const nodes = new Map<string, MutableNode>();
  const warnings: TicketWarning[] = [];

  for (const ticket of tickets) {
    const statusKind = classifyStatus(ticket.status);
    nodes.set(ticket.id, {
      ticket,
      statusKind,
      children: []
    });

    if (statusKind === "unknown") {
      warnings.push({
        kind: "relationship",
        filePath: ticket.filePath,
        message: `Unknown ticket status '${ticket.status}' on ${ticket.id}`
      });
    }
  }

  const unparented: MutableNode[] = [];
  const unresolvedParent: MutableNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.ticket.parent;
    if (!parent) {
      unparented.push(node);
      continue;
    }

    const parentNode = nodes.get(parent);
    if (!parentNode) {
      unresolvedParent.push(node);
      warnings.push({
        kind: "relationship",
        filePath: node.ticket.filePath,
        message: `${node.ticket.id} references missing parent ${parent}`
      });
      continue;
    }

    parentNode.children.push(node);
  }

  const groups: HierarchyGroup[] = [];
  const visibleUnparented = sortNodes(unparented.filter((node) => isVisibleByDefault(node))).map(toHierarchyNode);
  const visibleUnresolved = sortNodes(unresolvedParent.filter((node) => isVisibleByDefault(node))).map(toHierarchyNode);

  if (visibleUnparented.length > 0) {
    groups.push({
      kind: "group",
      id: "unparented",
      label: "Unparented",
      children: visibleUnparented
    });
  }

  if (visibleUnresolved.length > 0) {
    groups.push({
      kind: "group",
      id: "unresolvedParent",
      label: "Unresolved Parent",
      children: visibleUnresolved
    });
  }

  return { groups, warnings };
}

function toHierarchyNode(node: MutableNode): HierarchyTicketNode {
  return {
    kind: "ticket",
    ticket: node.ticket,
    statusKind: node.statusKind,
    children: sortNodes(node.children.filter((child) => isVisibleByDefault(child))).map(toHierarchyNode),
    closedChildCount: node.children.filter((child) => child.statusKind === "closed").length
  };
}

function isVisibleByDefault(node: MutableNode): boolean {
  if (node.statusKind !== "closed") {
    return true;
  }

  return node.children.some((child) => isVisibleByDefault(child));
}

function sortNodes(nodes: readonly MutableNode[]): MutableNode[] {
  return [...nodes].sort(compareNodes);
}

function compareNodes(left: MutableNode, right: MutableNode): number {
  return comparePriority(left.ticket.priority, right.ticket.priority)
    || compareStatus(left.statusKind, right.statusKind)
    || left.ticket.title.localeCompare(right.ticket.title)
    || left.ticket.id.localeCompare(right.ticket.id);
}

function comparePriority(left: number | null, right: number | null): number {
  return priorityValue(left) - priorityValue(right);
}

function priorityValue(priority: number | null): number {
  return priority ?? Number.MAX_SAFE_INTEGER;
}

function compareStatus(left: TicketStatusKind, right: TicketStatusKind): number {
  return statusSortValue(left) - statusSortValue(right);
}

function statusSortValue(status: TicketStatusKind): number {
  switch (status) {
    case "active":
      return 0;
    case "unknown":
      return 1;
    case "closed":
      return 2;
  }
}

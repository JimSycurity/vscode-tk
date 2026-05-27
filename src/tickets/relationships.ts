import { classifyStatus } from "./hierarchy";
import type { TicketRecord, TicketWarning } from "./types";

export interface TicketRelationshipMetadata {
  readonly ticketId: string;
  readonly dependencyIds: readonly string[];
  readonly dependencyCount: number;
  readonly activeDependencyIds: readonly string[];
  readonly unresolvedDependencyIds: readonly string[];
  readonly blockerIds: readonly string[];
  readonly blockerCount: number;
  readonly activeBlockerIds: readonly string[];
  readonly linkIds: readonly string[];
  readonly linkCount: number;
  readonly unresolvedLinkIds: readonly string[];
}

export interface RelationshipIndex {
  readonly byTicketId: ReadonlyMap<string, TicketRelationshipMetadata>;
  readonly warnings: readonly TicketWarning[];
}

export function buildRelationshipIndex(tickets: readonly TicketRecord[]): RelationshipIndex {
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const blockerIdsByTicket = new Map<string, string[]>();
  const warnings: TicketWarning[] = [];

  for (const ticket of tickets) {
    for (const dependencyId of ticket.deps) {
      const blockers = blockerIdsByTicket.get(dependencyId) ?? [];
      blockers.push(ticket.id);
      blockerIdsByTicket.set(dependencyId, blockers);

      if (!ticketsById.has(dependencyId)) {
        warnings.push({
          kind: "relationship",
          filePath: ticket.filePath,
          message: `${ticket.id} references missing dependency ${dependencyId}`
        });
      }
    }

    for (const linkId of ticket.links) {
      if (!ticketsById.has(linkId)) {
        warnings.push({
          kind: "relationship",
          filePath: ticket.filePath,
          message: `${ticket.id} references missing linked ticket ${linkId}`
        });
      }
    }
  }

  const byTicketId = new Map<string, TicketRelationshipMetadata>();
  for (const ticket of tickets) {
    const dependencyIds = [...ticket.deps];
    const unresolvedDependencyIds = dependencyIds.filter((id) => !ticketsById.has(id));
    const activeDependencyIds = dependencyIds.filter((id) => {
      const dependency = ticketsById.get(id);
      return dependency ? classifyStatus(dependency.status) !== "closed" : false;
    });
    const blockerIds = blockerIdsByTicket.get(ticket.id) ?? [];
    const activeBlockerIds = blockerIds.filter((id) => {
      const blocker = ticketsById.get(id);
      return blocker ? classifyStatus(blocker.status) !== "closed" : false;
    });
    const linkIds = [...ticket.links];
    const unresolvedLinkIds = linkIds.filter((id) => !ticketsById.has(id));

    byTicketId.set(ticket.id, {
      ticketId: ticket.id,
      dependencyIds,
      dependencyCount: dependencyIds.length,
      activeDependencyIds,
      unresolvedDependencyIds,
      blockerIds,
      blockerCount: blockerIds.length,
      activeBlockerIds,
      linkIds,
      linkCount: linkIds.length,
      unresolvedLinkIds
    });
  }

  return { byTicketId, warnings };
}

import * as fs from "fs/promises";
import * as path from "path";
import { buildTicketHierarchy } from "./hierarchy";
import { parseTicketFile } from "./parser";
import { buildRelationshipIndex } from "./relationships";
import type { RelationshipIndex } from "./relationships";
import type { TicketHierarchy } from "./hierarchy";
import type { TicketProject, TicketRecord, TicketWarning } from "./types";

export interface TicketIndex {
  readonly project: TicketProject;
  readonly tickets: readonly TicketRecord[];
  readonly parseWarnings: readonly TicketWarning[];
  readonly hierarchy: TicketHierarchy;
  readonly relationships: RelationshipIndex;
}

export async function loadTicketIndex(project: TicketProject): Promise<TicketIndex> {
  const entries = await fs.readdir(project.ticketsDir, { withFileTypes: true });
  const ticketFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(project.ticketsDir, entry.name))
    .sort();

  const tickets: TicketRecord[] = [];
  const parseWarnings: TicketWarning[] = [];

  for (const filePath of ticketFiles) {
    const result = await parseTicketFile(filePath, project.projectRoot, project.ticketsDir);
    if (result.ok) {
      tickets.push(result.ticket);
    } else {
      parseWarnings.push(result.warning);
    }
  }

  const hierarchy = buildTicketHierarchy(tickets);
  const relationships = buildRelationshipIndex(tickets);

  return {
    project,
    tickets,
    parseWarnings,
    hierarchy,
    relationships
  };
}

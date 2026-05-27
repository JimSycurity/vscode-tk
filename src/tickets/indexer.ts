import * as fs from "fs/promises";
import * as path from "path";
import { buildTicketHierarchy } from "./hierarchy";
import { parseTicketFile } from "./parser";
import { isPathInsideOrEqual } from "./paths";
import { buildRelationshipIndex } from "./relationships";
import type { RelationshipIndex } from "./relationships";
import type { TicketHierarchy } from "./hierarchy";
import type { TicketProject, TicketRecord, TicketWarning } from "./types";

const defaultMaxTicketFiles = 2_000;
const defaultMaxTicketFileBytes = 1_000_000;

export interface TicketIndexOptions {
  readonly maxTicketFiles?: number;
  readonly maxTicketFileBytes?: number;
}

export interface TicketIndex {
  readonly project: TicketProject;
  readonly tickets: readonly TicketRecord[];
  readonly parseWarnings: readonly TicketWarning[];
  readonly hierarchy: TicketHierarchy;
  readonly relationships: RelationshipIndex;
}

export async function loadTicketIndex(project: TicketProject, options: TicketIndexOptions = {}): Promise<TicketIndex> {
  const maxTicketFiles = options.maxTicketFiles ?? defaultMaxTicketFiles;
  const maxTicketFileBytes = options.maxTicketFileBytes ?? defaultMaxTicketFileBytes;
  const canonicalTicketsDir = await fs.realpath(project.ticketsDir);
  const entries = await fs.readdir(project.ticketsDir, { withFileTypes: true });
  const allTicketFiles = entries
    .filter((entry) => entry.name.endsWith(".md"))
    .map((entry) => path.join(project.ticketsDir, entry.name))
    .sort();
  const ticketFiles = allTicketFiles.slice(0, maxTicketFiles);

  const tickets: TicketRecord[] = [];
  const parseWarnings: TicketWarning[] = [];

  for (const filePath of allTicketFiles.slice(maxTicketFiles)) {
    parseWarnings.push(skippedTicketWarning(filePath, `ticket file limit exceeded (${maxTicketFiles})`));
  }

  for (const filePath of ticketFiles) {
    const warning = await validateTicketFile(filePath, canonicalTicketsDir, maxTicketFileBytes);
    if (warning) {
      parseWarnings.push(warning);
      continue;
    }

    const result = await parseTicketFile(filePath, project.projectRoot, project.ticketsDir);
    if (result.ok) {
      tickets.push(result.ticket);
    } else {
      parseWarnings.push(result.warning);
    }
  }

  const { uniqueTickets, duplicateWarnings } = removeDuplicateTickets(tickets);
  parseWarnings.push(...duplicateWarnings);

  const hierarchy = buildTicketHierarchy(uniqueTickets);
  const relationships = buildRelationshipIndex(uniqueTickets);

  return {
    project,
    tickets: uniqueTickets,
    parseWarnings,
    hierarchy,
    relationships
  };
}

function removeDuplicateTickets(tickets: readonly TicketRecord[]): { uniqueTickets: TicketRecord[]; duplicateWarnings: TicketWarning[] } {
  const counts = new Map<string, number>();
  for (const ticket of tickets) {
    counts.set(ticket.id, (counts.get(ticket.id) ?? 0) + 1);
  }

  const duplicateIds = new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
  if (duplicateIds.size === 0) {
    return { uniqueTickets: [...tickets], duplicateWarnings: [] };
  }

  return {
    uniqueTickets: tickets.filter((ticket) => !duplicateIds.has(ticket.id)),
    duplicateWarnings: tickets
      .filter((ticket) => duplicateIds.has(ticket.id))
      .map((ticket) => ({
        kind: "parse",
        filePath: ticket.filePath,
        message: `Skipped ${path.basename(ticket.filePath)}: duplicate ticket id ${ticket.id}`
      }))
  };
}

async function validateTicketFile(filePath: string, canonicalTicketsDir: string, maxTicketFileBytes: number): Promise<TicketWarning | null> {
  const stat = await fs.lstat(filePath);
  if (!stat.isFile()) {
    return skippedTicketWarning(filePath, "not a regular file");
  }

  if (stat.size > maxTicketFileBytes) {
    return skippedTicketWarning(filePath, `file size limit exceeded (${maxTicketFileBytes} bytes)`);
  }

  const canonicalFilePath = await fs.realpath(filePath);
  if (!isPathInsideOrEqual(canonicalFilePath, canonicalTicketsDir)) {
    return skippedTicketWarning(filePath, "canonical path escapes the active .tickets directory");
  }

  return null;
}

function skippedTicketWarning(filePath: string, reason: string): TicketWarning {
  return {
    kind: "parse",
    filePath,
    message: `Skipped ${path.basename(filePath)}: ${reason}`
  };
}

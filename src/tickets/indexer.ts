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
const maxScannedDirectories = 2_000;

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
  const { files: allTicketFiles, warnings: scanWarnings } = await collectTicketFiles(project.ticketsDir, maxTicketFiles);
  const ticketFiles = allTicketFiles.slice(0, maxTicketFiles);

  const tickets: TicketRecord[] = [];
  const parseWarnings: TicketWarning[] = [...scanWarnings];

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

async function collectTicketFiles(ticketsDir: string, maxTicketFiles: number): Promise<{ files: string[]; warnings: TicketWarning[] }> {
  const files: string[] = [];
  const warnings: TicketWarning[] = [];
  let scannedDirectories = 0;
  let hasDirectoryLimitWarning = false;
  async function visit(directory: string): Promise<boolean> {
    scannedDirectories++;
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (directory === ticketsDir) {
        throw error;
      }
      warnings.push(skippedTicketWarning(directory, `unable to read directory: ${error instanceof Error ? error.message : String(error)}`));
      return true;
    }
    for (const entry of entries.sort((left, right) => {
      const leftPath = left.name + (left.isDirectory() ? path.sep : "");
      const rightPath = right.name + (right.isDirectory() ? path.sep : "");
      return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
    })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (scannedDirectories >= maxScannedDirectories) {
          if (!hasDirectoryLimitWarning) {
            warnings.push(skippedTicketWarning(entryPath, `directory limit exceeded (${maxScannedDirectories})`));
            hasDirectoryLimitWarning = true;
          }
          continue;
        }
        if (!await visit(entryPath)) {
          return false;
        }
      } else if (entry.name.endsWith(".md")) {
        files.push(entryPath);
        if (files.length > maxTicketFiles) {
          return false;
        }
      }
    }
    return true;
  }
  await visit(ticketsDir);
  return { files, warnings };
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

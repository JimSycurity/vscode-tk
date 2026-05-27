import * as fs from "fs/promises";
import * as path from "path";
import type { TicketParseResult, TicketRecord } from "./types";

type RawFrontmatter = Record<string, string>;

interface ParseTicketOptions {
  readonly filePath: string;
  readonly projectRoot: string;
  readonly ticketsDir?: string;
  readonly fileCreatedAt?: number | null;
  readonly fileUpdatedAt?: number | null;
}

export async function parseTicketFile(filePath: string, projectRoot: string, ticketsDir = path.join(projectRoot, ".tickets")): Promise<TicketParseResult> {
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf8"),
      fs.stat(filePath)
    ]);

    return parseTicketContent(content, {
      filePath,
      projectRoot,
      ticketsDir,
      fileCreatedAt: stat.birthtimeMs,
      fileUpdatedAt: stat.mtimeMs
    });
  } catch (error) {
    return parseWarning(filePath, `Unable to read ticket file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function parseTicketContent(content: string, options: ParseTicketOptions): TicketParseResult {
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter.ok) {
    return parseWarning(options.filePath, frontmatter.message);
  }

  const id = scalar(frontmatter.fields, "id");
  if (!id) {
    return parseWarning(options.filePath, "Ticket frontmatter is missing required id field");
  }

  const bodyStart = frontmatter.body.trimStart();
  const titleMatch = /^#\s+(.+)$/m.exec(bodyStart);
  const title = titleMatch?.[1]?.trim() || id;
  const body = titleMatch
    ? bodyStart.slice((titleMatch.index ?? 0) + titleMatch[0].length).trim()
    : bodyStart.trim();

  const ticket: TicketRecord = {
    id,
    filePath: options.filePath,
    projectRoot: options.projectRoot,
    ticketsDir: options.ticketsDir ?? path.join(options.projectRoot, ".tickets"),
    title,
    body,
    status: scalar(frontmatter.fields, "status") || "unknown",
    priority: numberField(frontmatter.fields, "priority"),
    type: scalar(frontmatter.fields, "type") || "task",
    assignee: scalar(frontmatter.fields, "assignee") || "",
    tags: arrayField(frontmatter.fields, "tags"),
    deps: arrayField(frontmatter.fields, "deps"),
    links: arrayField(frontmatter.fields, "links"),
    parent: nullableScalar(frontmatter.fields, "parent"),
    externalRef: nullableScalar(frontmatter.fields, "external-ref"),
    created: nullableScalar(frontmatter.fields, "created"),
    fileCreatedAt: options.fileCreatedAt ?? null,
    fileUpdatedAt: options.fileUpdatedAt ?? null
  };

  return { ok: true, ticket };
}

function extractFrontmatter(content: string): { ok: true; fields: RawFrontmatter; body: string } | { ok: false; message: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { ok: false, message: "Ticket file must start with YAML frontmatter" };
  }

  const closingDelimiter = /\n---[ \t]*(?:\n|$)/g;
  closingDelimiter.lastIndex = 4;
  const closing = closingDelimiter.exec(normalized);
  if (!closing) {
    return { ok: false, message: "Ticket frontmatter is missing closing delimiter" };
  }

  const raw = normalized.slice(4, closing.index);
  const fields: RawFrontmatter = {};
  for (const [index, line] of raw.split("\n").entries()) {
    if (!line.trim()) {
      continue;
    }

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      return { ok: false, message: `Invalid frontmatter line ${index + 1}: ${line}` };
    }

    fields[match[1]] = match[2].trim();
  }

  return { ok: true, fields, body: normalized.slice(closing.index + closing[0].length) };
}

function scalar(fields: RawFrontmatter, name: string): string {
  const value = fields[name];
  if (value === undefined) {
    return "";
  }

  return stripQuotes(value).trim();
}

function nullableScalar(fields: RawFrontmatter, name: string): string | null {
  const value = scalar(fields, name);
  if (!value || value === "null") {
    return null;
  }

  return value;
}

function numberField(fields: RawFrontmatter, name: string): number | null {
  const value = scalar(fields, name);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function arrayField(fields: RawFrontmatter, name: string): string[] {
  const value = scalar(fields, name);
  if (!value || value === "[]" || value === "null") {
    return [];
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => stripQuotes(part.trim()))
      .filter(Boolean);
  }

  return [value].filter(Boolean);
}

function stripQuotes(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function parseWarning(filePath: string, message: string): TicketParseResult {
  return {
    ok: false,
    warning: {
      kind: "parse",
      filePath,
      message
    }
  };
}

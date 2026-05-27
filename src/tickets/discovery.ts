import * as fs from "fs";
import * as path from "path";
import type { DiscoveryResult, TicketProject } from "./types";

export function discoverTicketProject(workspaceFolders: readonly string[], projectRootSetting?: string | null): DiscoveryResult {
  if (projectRootSetting?.trim()) {
    const project = projectFromSetting(projectRootSetting.trim());
    return project ? { kind: "active", project } : { kind: "none" };
  }

  const candidates = uniqueProjects(workspaceFolders.flatMap((folder) => {
    const local = workspaceLocalProject(folder);
    return local.length > 0 ? local : ancestorProject(folder);
  }));

  if (candidates.length === 0) {
    return { kind: "none" };
  }

  if (candidates.length === 1) {
    return { kind: "active", project: candidates[0] };
  }

  return { kind: "ambiguous", candidates };
}

function projectFromSetting(setting: string): TicketProject | null {
  const resolved = path.resolve(setting);
  const ticketsDir = path.basename(resolved) === ".tickets" ? resolved : path.join(resolved, ".tickets");
  if (!directoryExists(ticketsDir)) {
    return null;
  }

  return {
    projectRoot: path.basename(resolved) === ".tickets" ? path.dirname(resolved) : resolved,
    ticketsDir,
    source: "setting"
  };
}

function workspaceLocalProject(folder: string): TicketProject[] {
  const projectRoot = path.resolve(folder);
  const ticketsDir = path.join(projectRoot, ".tickets");
  if (!directoryExists(ticketsDir)) {
    return [];
  }

  return [{ projectRoot, ticketsDir, source: "workspace" }];
}

function ancestorProject(folder: string): TicketProject[] {
  let current = path.dirname(path.resolve(folder));
  const root = path.parse(current).root;

  while (current !== root) {
    const ticketsDir = path.join(current, ".tickets");
    if (directoryExists(ticketsDir)) {
      return [{ projectRoot: current, ticketsDir, source: "ancestor" }];
    }
    current = path.dirname(current);
  }

  return [];
}

function uniqueProjects(projects: readonly TicketProject[]): TicketProject[] {
  const seen = new Set<string>();
  const unique: TicketProject[] = [];

  for (const project of projects) {
    if (seen.has(project.ticketsDir)) {
      continue;
    }
    seen.add(project.ticketsDir);
    unique.push(project);
  }

  return unique;
}

function directoryExists(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

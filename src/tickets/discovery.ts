import * as fs from "fs";
import * as path from "path";
import { isPathInsideOrEqual } from "./paths";
import type { DiscoveryResult, TicketProject } from "./types";

export function discoverTicketProject(
  workspaceFolders: readonly string[],
  projectRootSetting?: string | null,
  selectedProjectRoot?: string | null,
  allowExternalProjectRoot = false
): DiscoveryResult {
  if (projectRootSetting?.trim()) {
    const project = projectFromSetting(projectRootSetting.trim(), workspaceFolders);
    if (!project) {
      return { kind: "none" };
    }

    if (project.isExternal && !allowExternalProjectRoot) {
      return { kind: "blockedExternal", project };
    }

    return { kind: "active", project };
  }

  const candidates = discoverTicketProjects(workspaceFolders);
  if (selectedProjectRoot?.trim()) {
    const selected = matchSelectedProject(candidates, selectedProjectRoot.trim());
    if (selected) {
      return { kind: "active", project: selected };
    }
  }

  if (candidates.length === 0) {
    return { kind: "none" };
  }

  if (candidates.length === 1) {
    return { kind: "active", project: candidates[0] };
  }

  return { kind: "ambiguous", candidates };
}

export function discoverTicketProjects(workspaceFolders: readonly string[]): TicketProject[] {
  return uniqueProjects(workspaceFolders.flatMap((folder) => {
    const local = workspaceLocalProject(folder);
    return local.length > 0 ? local : ancestorProject(folder);
  }));
}

function projectFromSetting(setting: string, workspaceFolders: readonly string[]): TicketProject | null {
  const resolved = path.resolve(setting);
  const ticketsDir = path.basename(resolved) === ".tickets" ? resolved : path.join(resolved, ".tickets");
  if (!directoryExists(ticketsDir)) {
    return null;
  }

  const projectRoot = path.basename(resolved) === ".tickets" ? path.dirname(resolved) : resolved;
  return {
    projectRoot,
    ticketsDir,
    source: "setting",
    isExternal: !isPathInAnyWorkspace(projectRoot, workspaceFolders)
  };
}

function workspaceLocalProject(folder: string): TicketProject[] {
  const projectRoot = path.resolve(folder);
  const ticketsDir = path.join(projectRoot, ".tickets");
  if (!directoryExists(ticketsDir)) {
    return [];
  }

  return [{ projectRoot, ticketsDir, source: "workspace", isExternal: false }];
}

function ancestorProject(folder: string): TicketProject[] {
  let current = path.dirname(path.resolve(folder));
  const root = path.parse(current).root;

  while (current !== root) {
    const ticketsDir = path.join(current, ".tickets");
    if (directoryExists(ticketsDir)) {
      return [{ projectRoot: current, ticketsDir, source: "ancestor", isExternal: false }];
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

function matchSelectedProject(candidates: readonly TicketProject[], selectedProjectRoot: string): TicketProject | null {
  const resolved = path.resolve(selectedProjectRoot);
  const normalizedRoot = path.basename(resolved) === ".tickets" ? path.dirname(resolved) : resolved;
  const normalizedTicketsDir = path.basename(resolved) === ".tickets" ? resolved : path.join(resolved, ".tickets");

  return candidates.find((candidate) => candidate.projectRoot === normalizedRoot || candidate.ticketsDir === normalizedTicketsDir) ?? null;
}

function directoryExists(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function isPathInAnyWorkspace(candidate: string, workspaceFolders: readonly string[]): boolean {
  return workspaceFolders.some((folder) => isPathInsideOrEqual(candidate, path.resolve(folder)));
}

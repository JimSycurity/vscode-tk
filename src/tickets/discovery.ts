import * as fs from "fs";
import * as path from "path";
import { isPathInsideOrEqual } from "./paths";
import type { DiscoveryResult, TicketProject } from "./types";

const ignoredDiscoveryDirectories = new Set([
  ".cache",
  ".git",
  ".hg",
  ".svn",
  ".venv",
  "build",
  "dist",
  "node_modules",
  "out",
  "target"
]);
const defaultDiscoveryMaxDepth = 1;
const maxDiscoveryDepth = 2;
const maxDiscoveryDirectories = 250;

export function discoverTicketProject(
  workspaceFolders: readonly string[],
  projectRootSetting?: string | null,
  selectedProjectRoot?: string | null,
  allowExternalProjectRoot = false,
  ticketRootSettings: readonly string[] = [],
  discoveryMaxDepth = defaultDiscoveryMaxDepth
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

  const discoveredCandidates = discoverTicketProjects(workspaceFolders, ticketRootSettings, discoveryMaxDepth);
  const selected = selectedProjectRoot?.trim() ? matchSelectedProject(discoveredCandidates, selectedProjectRoot.trim()) : null;
  if (selected?.isExternal && !allowExternalProjectRoot) {
    return { kind: "blockedExternal", project: selected };
  }

  const blockedExternal = discoveredCandidates.find((candidate) => candidate.isExternal);
  const candidates = allowExternalProjectRoot
    ? discoveredCandidates
    : discoveredCandidates.filter((candidate) => !candidate.isExternal);
  if (selectedProjectRoot?.trim()) {
    if (selected) {
      return { kind: "active", project: selected };
    }
  }

  if (candidates.length === 0) {
    if (blockedExternal && !allowExternalProjectRoot) {
      return { kind: "blockedExternal", project: blockedExternal };
    }
    return { kind: "none" };
  }

  if (candidates.length === 1) {
    return { kind: "active", project: candidates[0] };
  }

  return { kind: "ambiguous", candidates };
}

export function discoverTicketProjects(
  workspaceFolders: readonly string[],
  ticketRootSettings: readonly string[] = [],
  discoveryMaxDepth = defaultDiscoveryMaxDepth
): TicketProject[] {
  const configured = configuredTicketRootProjects(ticketRootSettings, workspaceFolders);
  if (configured.length > 0) {
    return uniqueProjects(configured);
  }

  const workspaceProjects = discoverWorkspaceTicketProjects(workspaceFolders, discoveryMaxDepth);
  if (workspaceProjects.length > 0) {
    return workspaceProjects;
  }

  return uniqueProjects(workspaceFolders.flatMap((folder) => ancestorProject(folder)));
}

export function discoverWorkspaceTicketProjects(
  workspaceFolders: readonly string[],
  discoveryMaxDepth = defaultDiscoveryMaxDepth
): TicketProject[] {
  return uniqueProjects(workspaceFolders.flatMap((folder) => workspaceDescendantProjects(folder, discoveryMaxDepth)));
}

function projectFromSetting(setting: string, workspaceFolders: readonly string[]): TicketProject | null {
  const resolved = path.resolve(setting);
  const ticketsDir = path.basename(resolved) === ".tickets" ? resolved : path.join(resolved, ".tickets");
  if (!directoryExists(ticketsDir)) {
    return null;
  }

  const projectRoot = path.basename(resolved) === ".tickets" ? path.dirname(resolved) : resolved;
  return ticketProject(projectRoot, ticketsDir, "setting", workspaceFolders);
}

function workspaceLocalProject(folder: string): TicketProject[] {
  const projectRoot = path.resolve(folder);
  const ticketsDir = path.join(projectRoot, ".tickets");
  if (!directoryExists(ticketsDir)) {
    return [];
  }

  return [ticketProject(projectRoot, ticketsDir, "workspace", [])];
}

function configuredTicketRootProjects(settings: readonly string[], workspaceFolders: readonly string[]): TicketProject[] {
  return settings.flatMap((setting) => {
    const value = setting.trim();
    if (!value || path.isAbsolute(value)) {
      return [];
    }

    return workspaceFolders.flatMap((folder) => {
      const workspaceRoot = realpathOrResolve(folder);
      const resolved = path.resolve(workspaceRoot, value);
      if (!isPathInsideOrEqual(resolved, workspaceRoot)) {
        return [];
      }

      const ticketsDir = path.basename(resolved) === ".tickets" ? resolved : path.join(resolved, ".tickets");
      if (!directoryExists(ticketsDir)) {
        return [];
      }

      const projectRoot = path.basename(resolved) === ".tickets" ? path.dirname(resolved) : resolved;
      return [ticketProject(projectRoot, ticketsDir, "ticketRoots", workspaceFolders)];
    });
  });
}

function workspaceDescendantProjects(folder: string, discoveryMaxDepth: number): TicketProject[] {
  const workspaceRoot = realpathOrResolve(folder);
  const depthLimit = Math.min(Math.max(0, Math.floor(discoveryMaxDepth)), maxDiscoveryDepth);
  const projects: TicketProject[] = [];
  const queue: Array<{ readonly dir: string; readonly depth: number }> = [{ dir: workspaceRoot, depth: 0 }];
  let visited = 0;

  while (queue.length > 0 && visited < maxDiscoveryDirectories) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    visited += 1;

    const local = workspaceLocalProject(current.dir);
    projects.push(...local);

    if (current.depth >= depthLimit) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || ignoredDiscoveryDirectories.has(entry.name)) {
        continue;
      }

      const child = path.join(current.dir, entry.name);
      if (!isSafeDiscoveryDirectory(child, workspaceRoot)) {
        continue;
      }

      queue.push({ dir: child, depth: current.depth + 1 });
    }
  }

  return uniqueProjects(projects);
}

function isSafeDiscoveryDirectory(candidate: string, workspaceRoot: string): boolean {
  try {
    const stat = fs.lstatSync(candidate);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return false;
    }
  } catch {
    return false;
  }

  return isPathInsideOrEqual(realpathOrResolve(candidate), workspaceRoot);
}

function ancestorProject(folder: string): TicketProject[] {
  let current = path.dirname(path.resolve(folder));
  const root = path.parse(current).root;

  while (current !== root) {
    const ticketsDir = path.join(current, ".tickets");
    if (directoryExists(ticketsDir)) {
      return [ticketProject(current, ticketsDir, "ancestor", [])];
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
  const resolved = realpathOrResolve(selectedProjectRoot);
  const normalizedRoot = path.basename(resolved) === ".tickets" ? path.dirname(resolved) : resolved;
  const normalizedTicketsDir = path.basename(resolved) === ".tickets" ? resolved : realpathOrResolve(path.join(resolved, ".tickets"));

  return candidates.find((candidate) => candidate.projectRoot === normalizedRoot || candidate.ticketsDir === normalizedTicketsDir) ?? null;
}

function directoryExists(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function ticketProject(projectRoot: string, ticketsDir: string, source: TicketProject["source"], workspaceFolders: readonly string[]): TicketProject {
  const canonicalProjectRoot = realpathOrResolve(projectRoot);
  const canonicalTicketsDir = realpathOrResolve(ticketsDir);
  const projectRootIsExternal = source === "setting" && !isPathInAnyWorkspace(canonicalProjectRoot, workspaceFolders);
  return {
    projectRoot: canonicalProjectRoot,
    ticketsDir: canonicalTicketsDir,
    source,
    isExternal: projectRootIsExternal || !isPathInsideOrEqual(canonicalTicketsDir, canonicalProjectRoot)
  };
}

function realpathOrResolve(candidate: string): string {
  try {
    return fs.realpathSync(candidate);
  } catch {
    return path.resolve(candidate);
  }
}

function isPathInAnyWorkspace(candidate: string, workspaceFolders: readonly string[]): boolean {
  return workspaceFolders.some((folder) => isPathInsideOrEqual(candidate, realpathOrResolve(folder)));
}

import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { discoverTicketProject, discoverTicketProjects, discoverWorkspaceTicketProjects } from "../tickets/discovery";

function tempRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vscode-tk-"));
}

function mkdir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

test("uses explicit project root setting when provided", () => {
  const repo = tempRepo();
  mkdir(path.join(repo, ".tickets"));

  const result = discoverTicketProject([repo], repo);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, repo);
  assert.equal(result.project.source, "setting");
  assert.equal(result.project.isExternal, false);
});

test("blocks explicit external project root by default", () => {
  const workspace = tempRepo();
  const external = tempRepo();
  mkdir(path.join(workspace, ".tickets"));
  mkdir(path.join(external, ".tickets"));

  const result = discoverTicketProject([workspace], external);
  assert.equal(result.kind, "blockedExternal");
  assert.equal(result.project.projectRoot, external);
  assert.equal(result.project.isExternal, true);
});

test("allows explicit external project root when opted in", () => {
  const workspace = tempRepo();
  const external = tempRepo();
  mkdir(path.join(workspace, ".tickets"));
  mkdir(path.join(external, ".tickets"));

  const result = discoverTicketProject([workspace], external, null, true);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, external);
  assert.equal(result.project.isExternal, true);
});

test("uses workspace-local tickets before ancestor tickets", () => {
  const repo = tempRepo();
  const child = path.join(repo, "child");
  mkdir(path.join(repo, ".tickets"));
  mkdir(path.join(child, ".tickets"));

  const result = discoverTicketProject([child]);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, child);
  assert.equal(result.project.source, "workspace");
});

test("blocks workspace-local symlinked tickets that escape the project root by default", () => {
  const repo = tempRepo();
  const externalTickets = path.join(tempRepo(), ".tickets");
  mkdir(externalTickets);
  fs.symlinkSync(externalTickets, path.join(repo, ".tickets"), "dir");

  const result = discoverTicketProject([repo]);
  assert.equal(result.kind, "blockedExternal");
  assert.equal(result.project.projectRoot, fs.realpathSync(repo));
  assert.equal(result.project.ticketsDir, fs.realpathSync(externalTickets));
  assert.equal(result.project.isExternal, true);
});

test("allows workspace-local symlinked tickets that escape the project root when opted in", () => {
  const repo = tempRepo();
  const externalTickets = path.join(tempRepo(), ".tickets");
  mkdir(externalTickets);
  fs.symlinkSync(externalTickets, path.join(repo, ".tickets"), "dir");

  const result = discoverTicketProject([repo], null, null, true);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, fs.realpathSync(repo));
  assert.equal(result.project.ticketsDir, fs.realpathSync(externalTickets));
  assert.equal(result.project.isExternal, true);
});

test("marks discovered symlinked tickets as external with canonical ticket paths", () => {
  const repo = tempRepo();
  const externalTickets = path.join(tempRepo(), ".tickets");
  mkdir(externalTickets);
  fs.symlinkSync(externalTickets, path.join(repo, ".tickets"), "dir");

  const projects = discoverTicketProjects([repo]);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].projectRoot, fs.realpathSync(repo));
  assert.equal(projects[0].ticketsDir, fs.realpathSync(externalTickets));
  assert.equal(projects[0].isExternal, true);
});

test("uses nearest ancestor tickets when workspace has no local tickets", () => {
  const repo = tempRepo();
  const child = path.join(repo, "nested", "child");
  mkdir(path.join(repo, ".tickets"));
  mkdir(child);

  const result = discoverTicketProject([child]);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, repo);
  assert.equal(result.project.source, "ancestor");
});

test("reports ambiguity for multiple workspace projects", () => {
  const first = tempRepo();
  const second = tempRepo();
  mkdir(path.join(first, ".tickets"));
  mkdir(path.join(second, ".tickets"));

  const result = discoverTicketProject([first, second]);
  assert.equal(result.kind, "ambiguous");
  assert.equal(result.candidates.length, 2);
});

test("lists discovered ticket projects without merging identity spaces", () => {
  const first = tempRepo();
  const second = tempRepo();
  mkdir(path.join(first, ".tickets"));
  mkdir(path.join(second, ".tickets"));

  const projects = discoverTicketProjects([first, second]);
  assert.deepEqual(projects.map((project) => project.projectRoot), [first, second]);
});

test("uses selected project root when it matches a discovered project", () => {
  const first = tempRepo();
  const second = tempRepo();
  mkdir(path.join(first, ".tickets"));
  mkdir(path.join(second, ".tickets"));

  const result = discoverTicketProject([first, second], null, second);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, second);
});

test("falls back to ambiguity when selected project root no longer exists in discovery", () => {
  const first = tempRepo();
  const second = tempRepo();
  const missing = tempRepo();
  mkdir(path.join(first, ".tickets"));
  mkdir(path.join(second, ".tickets"));

  const result = discoverTicketProject([first, second], null, missing);
  assert.equal(result.kind, "ambiguous");
});

test("discovers immediate descendant ticket projects with bounded workspace discovery", () => {
  const repo = tempRepo();
  mkdir(path.join(repo, "nested", ".tickets"));

  const result = discoverTicketProject([repo]);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, path.join(repo, "nested"));
  assert.equal(result.project.source, "workspace");
});

test("does not discover descendant ticket projects when discovery depth is zero", () => {
  const repo = tempRepo();
  mkdir(path.join(repo, "nested", ".tickets"));

  const projects = discoverWorkspaceTicketProjects([repo], 0);
  assert.deepEqual(projects, []);
});

test("does not discover ticket projects deeper than the discovery depth cap", () => {
  const repo = tempRepo();
  mkdir(path.join(repo, "a", "b", "c", ".tickets"));

  const projects = discoverWorkspaceTicketProjects([repo], 2);
  assert.deepEqual(projects, []);
});

test("uses saved workspace-relative ticket roots when configured", () => {
  const workspace = tempRepo();
  const first = path.join(workspace, "vscode-tk");
  const second = path.join(workspace, "go-ticket");
  mkdir(path.join(first, ".tickets"));
  mkdir(path.join(second, ".tickets"));

  const projects = discoverTicketProjects([workspace], ["vscode-tk/.tickets", "go-ticket"]);
  assert.deepEqual(projects.map((project) => project.projectRoot), [first, second]);
  assert.deepEqual(projects.map((project) => project.source), ["ticketRoots", "ticketRoots"]);
});

test("ignores saved absolute ticket roots", () => {
  const workspace = tempRepo();
  const external = tempRepo();
  mkdir(path.join(external, ".tickets"));

  const projects = discoverTicketProjects([workspace], [external]);
  assert.deepEqual(projects, []);
});

test("ignores saved ticket roots that escape the workspace", () => {
  const parent = tempRepo();
  const workspace = path.join(parent, "workspace");
  const external = path.join(parent, "external");
  mkdir(workspace);
  mkdir(path.join(external, ".tickets"));

  const projects = discoverTicketProjects([workspace], ["../external"]);
  assert.deepEqual(projects, []);
});

test("does not follow symlinked descendant directories during workspace discovery", () => {
  const workspace = tempRepo();
  const external = tempRepo();
  mkdir(path.join(external, ".tickets"));
  fs.symlinkSync(external, path.join(workspace, "external-link"), "dir");

  const projects = discoverWorkspaceTicketProjects([workspace], 1);
  assert.deepEqual(projects, []);
});

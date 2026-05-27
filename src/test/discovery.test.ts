import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { discoverTicketProject } from "../tickets/discovery";

function tempRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vscode-tk-"));
}

function mkdir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

test("uses explicit project root setting when provided", () => {
  const repo = tempRepo();
  mkdir(path.join(repo, ".tickets"));

  const result = discoverTicketProject([], repo);
  assert.equal(result.kind, "active");
  assert.equal(result.project.projectRoot, repo);
  assert.equal(result.project.source, "setting");
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

test("does not recursively discover descendant ticket projects", () => {
  const repo = tempRepo();
  mkdir(path.join(repo, "nested", ".tickets"));

  const result = discoverTicketProject([repo]);
  assert.equal(result.kind, "none");
});

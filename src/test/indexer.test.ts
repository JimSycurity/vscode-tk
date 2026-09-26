import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createdTicket } from "./fixtures";
import { loadTicketIndex } from "../tickets/indexer";
import type { TicketProject } from "../tickets/types";

function tempRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vscode-tk-"));
}

function ticketProject(repo: string): TicketProject {
  return {
    projectRoot: repo,
    ticketsDir: path.join(repo, ".tickets"),
    source: "workspace",
    isExternal: false
  };
}

test("indexes regular Markdown ticket files", async () => {
  const repo = tempRepo();
  fs.mkdirSync(path.join(repo, ".tickets"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".tickets", "vt-demo.md"), createdTicket);

  const index = await loadTicketIndex(ticketProject(repo));
  assert.equal(index.tickets.length, 1);
  assert.equal(index.tickets[0].id, "vt-demo");
  assert.equal(index.parseWarnings.length, 0);
});

test("indexes nested tickets alongside flat tickets", async () => {
  const repo = tempRepo();
  const nested = path.join(repo, ".tickets", "okta", "research");
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(repo, ".tickets", "vt-flat.md"), createdTicket.replace("vt-demo", "vt-flat"));
  fs.writeFileSync(path.join(nested, "vt-nested.md"), createdTicket.replace("vt-demo", "vt-nested"));

  const index = await loadTicketIndex(ticketProject(repo));
  assert.deepEqual(index.tickets.map((ticket) => ticket.id).sort(), ["vt-flat", "vt-nested"]);
  assert.equal(index.parseWarnings.length, 0);
});

test("does not traverse symlinked child directories", async () => {
  const repo = tempRepo();
  const external = tempRepo();
  fs.mkdirSync(path.join(repo, ".tickets"), { recursive: true });
  fs.writeFileSync(path.join(external, "vt-external.md"), createdTicket);
  fs.symlinkSync(external, path.join(repo, ".tickets", "linked"), "dir");

  const index = await loadTicketIndex(ticketProject(repo));
  assert.equal(index.tickets.length, 0);
});

test("skips duplicate ticket ids across child directories", async () => {
  const repo = tempRepo();
  for (const directory of ["okta", "github"]) {
    const child = path.join(repo, ".tickets", directory);
    fs.mkdirSync(child, { recursive: true });
    fs.writeFileSync(path.join(child, "vt-demo.md"), createdTicket);
  }

  const index = await loadTicketIndex(ticketProject(repo));
  assert.equal(index.tickets.length, 0);
  assert.equal(index.parseWarnings.length, 2);
});

test("skips non-regular Markdown directory entries", async () => {
  const repo = tempRepo();
  const external = tempRepo();
  fs.mkdirSync(path.join(repo, ".tickets"), { recursive: true });
  fs.writeFileSync(path.join(external, "vt-linked.md"), createdTicket);
  fs.symlinkSync(path.join(external, "vt-linked.md"), path.join(repo, ".tickets", "vt-linked.md"));

  const index = await loadTicketIndex(ticketProject(repo));
  assert.equal(index.tickets.length, 0);
  assert.equal(index.parseWarnings.length, 1);
  assert.match(index.parseWarnings[0].message, /not a regular file/);
});

test("skips duplicate ticket ids instead of indexing ambiguous records", async () => {
  const repo = tempRepo();
  fs.mkdirSync(path.join(repo, ".tickets"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".tickets", "vt-first.md"), createdTicket);
  fs.writeFileSync(path.join(repo, ".tickets", "vt-second.md"), createdTicket);

  const index = await loadTicketIndex(ticketProject(repo));
  assert.equal(index.tickets.length, 0);
  assert.equal(index.parseWarnings.length, 2);
  assert.match(index.parseWarnings[0].message, /duplicate ticket id vt-demo/);
});

test("skips ticket files over the configured size limit", async () => {
  const repo = tempRepo();
  fs.mkdirSync(path.join(repo, ".tickets"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".tickets", "vt-large.md"), createdTicket);

  const index = await loadTicketIndex(ticketProject(repo), { maxTicketFileBytes: 10 });
  assert.equal(index.tickets.length, 0);
  assert.equal(index.parseWarnings.length, 1);
  assert.match(index.parseWarnings[0].message, /file size limit exceeded/);
});

test("skips ticket files over the configured file-count limit", async () => {
  const repo = tempRepo();
  fs.mkdirSync(path.join(repo, ".tickets"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".tickets", "vt-a.md"), createdTicket.replace("vt-demo", "vt-a"));
  fs.writeFileSync(path.join(repo, ".tickets", "vt-b.md"), createdTicket.replace("vt-demo", "vt-b"));

  const index = await loadTicketIndex(ticketProject(repo), { maxTicketFiles: 1 });
  assert.equal(index.tickets.length, 1);
  assert.equal(index.parseWarnings.length, 1);
  assert.match(index.parseWarnings[0].message, /ticket file limit exceeded/);
});

test("file limit keeps the first ticket in sorted path order across folders", async () => {
  const repo = tempRepo();
  const nested = path.join(repo, ".tickets", "a-folder");
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(nested, "vt-first.md"), createdTicket.replace("vt-demo", "vt-first"));
  fs.writeFileSync(path.join(repo, ".tickets", "z-last.md"), createdTicket.replace("vt-demo", "vt-last"));

  const index = await loadTicketIndex(ticketProject(repo), { maxTicketFiles: 1 });
  assert.deepEqual(index.tickets.map((ticket) => ticket.id), ["vt-first"]);
  assert.equal(index.parseWarnings.length, 1);
});

test("file limit sorts a flat file before a same-stem child directory", async () => {
  const repo = tempRepo();
  const nested = path.join(repo, ".tickets", "a");
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(repo, ".tickets", "a.md"), createdTicket.replace("vt-demo", "vt-flat"));
  fs.writeFileSync(path.join(nested, "vt-nested.md"), createdTicket.replace("vt-demo", "vt-nested"));

  const index = await loadTicketIndex(ticketProject(repo), { maxTicketFiles: 1 });
  assert.deepEqual(index.tickets.map((ticket) => ticket.id), ["vt-flat"]);
  assert.equal(index.parseWarnings.length, 1);
});

test("directory limit warns once and keeps flat tickets", async () => {
  const repo = tempRepo();
  const ticketsDir = path.join(repo, ".tickets");
  fs.mkdirSync(ticketsDir, { recursive: true });
  for (let index = 0; index < 2_001; index++) {
    fs.mkdirSync(path.join(ticketsDir, `dir-${index}`));
  }
  fs.writeFileSync(path.join(ticketsDir, "z-ticket.md"), createdTicket);

  const index = await loadTicketIndex(ticketProject(repo));
  assert.equal(index.tickets.length, 1);
  assert.equal(index.parseWarnings.length, 1);
  assert.match(index.parseWarnings[0].message, /directory limit exceeded/);
});

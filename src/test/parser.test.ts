import test from "node:test";
import assert from "node:assert/strict";
import { parseTicketContent } from "../tickets/parser";
import { closedTicket, createdTicket, linkedTicket, malformedTicket, migratedTicket } from "./fixtures";

const options = {
  filePath: "/repo/.tickets/vt-demo.md",
  projectRoot: "/repo",
  ticketsDir: "/repo/.tickets",
  fileCreatedAt: 1,
  fileUpdatedAt: 2
};

test("parses real tk create-style frontmatter and Markdown body", () => {
  const result = parseTicketContent(createdTicket, options);
  assert.equal(result.ok, true);
  assert.equal(result.ticket.id, "vt-demo");
  assert.equal(result.ticket.title, "Draft VS Code extension spec for tk tickets");
  assert.equal(result.ticket.status, "open");
  assert.equal(result.ticket.priority, 1);
  assert.equal(result.ticket.assignee, "Jim Sykora");
  assert.equal(result.ticket.externalRef, "openspec/changes/tickets-explorer-vscode-extension/");
  assert.equal(result.ticket.parent, "vt-parent");
  assert.deepEqual(result.ticket.tags, ["vscode", "extension", "tickets", "openspec"]);
  assert.match(result.ticket.body, /Acceptance Criteria/);
});

test("parses dependency and link arrays", () => {
  const result = parseTicketContent(linkedTicket, { ...options, filePath: "/repo/.tickets/vt-child.md" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.ticket.deps, ["vt-demo", "vt-other"]);
  assert.deepEqual(result.ticket.links, ["vt-related"]);
  assert.equal(result.ticket.parent, null);
  assert.deepEqual(result.ticket.tags, []);
});

test("parses closed tickets and null parent values", () => {
  const result = parseTicketContent(closedTicket, { ...options, filePath: "/repo/.tickets/vt-closed.md" });
  assert.equal(result.ok, true);
  assert.equal(result.ticket.status, "closed");
  assert.equal(result.ticket.parent, null);
  assert.deepEqual(result.ticket.tags, ["done"]);
});

test("parses migrated ticket external references", () => {
  const result = parseTicketContent(migratedTicket, { ...options, filePath: "/repo/.tickets/vt-migrated.md" });
  assert.equal(result.ok, true);
  assert.equal(result.ticket.externalRef, "beads:abc123");
  assert.equal(result.ticket.type, "bug");
  assert.deepEqual(result.ticket.links, ["vt-demo", "vt-child"]);
});

test("returns parse warnings for malformed frontmatter", () => {
  const result = parseTicketContent(malformedTicket, { ...options, filePath: "/repo/.tickets/vt-bad.md" });
  assert.equal(result.ok, false);
  assert.equal(result.warning.kind, "parse");
  assert.match(result.warning.message, /Invalid frontmatter line/);
});

test("requires a standalone closing frontmatter delimiter", () => {
  const result = parseTicketContent(`---
id: vt-bad
---not-a-delimiter
status: open
---
# Bad delimiter
`, { ...options, filePath: "/repo/.tickets/vt-bad-delimiter.md" });
  assert.equal(result.ok, false);
  assert.match(result.warning.message, /Invalid frontmatter line/);
});

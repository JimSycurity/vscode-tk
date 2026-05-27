import test from "node:test";
import assert from "node:assert/strict";
import { buildTicketHierarchy, classifyStatus } from "../tickets/hierarchy";
import type { TicketRecord } from "../tickets/types";

function ticket(overrides: Partial<TicketRecord> & Pick<TicketRecord, "id" | "title">): TicketRecord {
  return {
    id: overrides.id,
    filePath: overrides.filePath ?? `/repo/.tickets/${overrides.id}.md`,
    projectRoot: "/repo",
    ticketsDir: "/repo/.tickets",
    title: overrides.title,
    body: overrides.body ?? "",
    status: overrides.status ?? "open",
    priority: overrides.priority ?? 2,
    type: overrides.type ?? "task",
    assignee: overrides.assignee ?? "",
    tags: overrides.tags ?? [],
    deps: overrides.deps ?? [],
    links: overrides.links ?? [],
    parent: overrides.parent ?? null,
    externalRef: overrides.externalRef ?? null,
    created: overrides.created ?? null,
    fileCreatedAt: overrides.fileCreatedAt ?? null,
    fileUpdatedAt: overrides.fileUpdatedAt ?? null
  };
}

test("classifies known and unknown statuses", () => {
  assert.equal(classifyStatus("open"), "active");
  assert.equal(classifyStatus("in_progress"), "active");
  assert.equal(classifyStatus("closed"), "closed");
  assert.equal(classifyStatus("parked"), "unknown");
});

test("builds parent child hierarchy under unparented roots", () => {
  const hierarchy = buildTicketHierarchy([
    ticket({ id: "vt-parent", title: "Parent", priority: 1 }),
    ticket({ id: "vt-child", title: "Child", parent: "vt-parent", priority: 1 })
  ]);

  assert.equal(hierarchy.groups.length, 1);
  assert.equal(hierarchy.groups[0].id, "unparented");
  assert.equal(hierarchy.groups[0].children[0].ticket.id, "vt-parent");
  assert.equal(hierarchy.groups[0].children[0].children[0].ticket.id, "vt-child");
});

test("groups missing parent references under unresolved parent", () => {
  const hierarchy = buildTicketHierarchy([
    ticket({ id: "vt-child", title: "Child", parent: "vt-missing" })
  ]);

  assert.equal(hierarchy.groups.length, 1);
  assert.equal(hierarchy.groups[0].id, "unresolvedParent");
  assert.equal(hierarchy.groups[0].children[0].ticket.id, "vt-child");
  assert.match(hierarchy.warnings[0].message, /missing parent vt-missing/);
});

test("hides closed children by default and records closed child counts", () => {
  const hierarchy = buildTicketHierarchy([
    ticket({ id: "vt-parent", title: "Parent" }),
    ticket({ id: "vt-open", title: "Open child", parent: "vt-parent", status: "open" }),
    ticket({ id: "vt-closed", title: "Closed child", parent: "vt-parent", status: "closed" })
  ]);

  const parent = hierarchy.groups[0].children[0];
  assert.equal(parent.closedChildCount, 1);
  assert.deepEqual(parent.children.map((node) => node.ticket.id), ["vt-open"]);
});

test("shows closed parents only when they have visible active children", () => {
  const hierarchy = buildTicketHierarchy([
    ticket({ id: "vt-closed-parent", title: "Closed Parent", status: "closed" }),
    ticket({ id: "vt-active-child", title: "Active Child", parent: "vt-closed-parent" }),
    ticket({ id: "vt-closed-root", title: "Closed Root", status: "closed" })
  ]);

  assert.deepEqual(hierarchy.groups[0].children.map((node) => node.ticket.id), ["vt-closed-parent"]);
  assert.deepEqual(hierarchy.groups[0].children[0].children.map((node) => node.ticket.id), ["vt-active-child"]);
});

test("keeps unknown statuses visible with warnings", () => {
  const hierarchy = buildTicketHierarchy([
    ticket({ id: "vt-unknown", title: "Unknown", status: "parked" })
  ]);

  assert.equal(hierarchy.groups[0].children[0].ticket.id, "vt-unknown");
  assert.equal(hierarchy.groups[0].children[0].statusKind, "unknown");
  assert.match(hierarchy.warnings[0].message, /Unknown ticket status/);
});

test("sorts siblings by priority, status, title, then id", () => {
  const hierarchy = buildTicketHierarchy([
    ticket({ id: "vt-z", title: "Zulu", priority: 2, status: "open" }),
    ticket({ id: "vt-b", title: "Bravo", priority: 1, status: "open" }),
    ticket({ id: "vt-a", title: "Alpha", priority: 1, status: "in_progress" }),
    ticket({ id: "vt-u", title: "Unknown", priority: 1, status: "parked" })
  ]);

  assert.deepEqual(hierarchy.groups[0].children.map((node) => node.ticket.id), [
    "vt-a",
    "vt-b",
    "vt-u",
    "vt-z"
  ]);
});

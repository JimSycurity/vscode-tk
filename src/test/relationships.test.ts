import test from "node:test";
import assert from "node:assert/strict";
import { buildRelationshipIndex } from "../tickets/relationships";
import type { TicketRecord } from "../tickets/types";

function ticket(overrides: Partial<TicketRecord> & Pick<TicketRecord, "id">): TicketRecord {
  return {
    id: overrides.id,
    filePath: overrides.filePath ?? `/repo/.tickets/${overrides.id}.md`,
    projectRoot: "/repo",
    ticketsDir: "/repo/.tickets",
    title: overrides.title ?? overrides.id,
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

test("computes dependency counts and active dependencies", () => {
  const index = buildRelationshipIndex([
    ticket({ id: "vt-task", deps: ["vt-open", "vt-closed", "vt-missing"] }),
    ticket({ id: "vt-open", status: "open" }),
    ticket({ id: "vt-closed", status: "closed" })
  ]);

  const metadata = index.byTicketId.get("vt-task");
  assert.ok(metadata);
  assert.equal(metadata.dependencyCount, 3);
  assert.deepEqual(metadata.activeDependencyIds, ["vt-open"]);
  assert.deepEqual(metadata.unresolvedDependencyIds, ["vt-missing"]);
  assert.match(index.warnings[0].message, /missing dependency vt-missing/);
});

test("computes reverse blocker counts and active blockers", () => {
  const index = buildRelationshipIndex([
    ticket({ id: "vt-root" }),
    ticket({ id: "vt-open-blocker", deps: ["vt-root"], status: "open" }),
    ticket({ id: "vt-closed-blocker", deps: ["vt-root"], status: "closed" })
  ]);

  const metadata = index.byTicketId.get("vt-root");
  assert.ok(metadata);
  assert.equal(metadata.blockerCount, 2);
  assert.deepEqual(metadata.blockerIds, ["vt-open-blocker", "vt-closed-blocker"]);
  assert.deepEqual(metadata.activeBlockerIds, ["vt-open-blocker"]);
});

test("computes related-link counts separately from blockers", () => {
  const index = buildRelationshipIndex([
    ticket({ id: "vt-task", links: ["vt-related", "vt-missing-link"] }),
    ticket({ id: "vt-related" })
  ]);

  const metadata = index.byTicketId.get("vt-task");
  assert.ok(metadata);
  assert.equal(metadata.linkCount, 2);
  assert.deepEqual(metadata.linkIds, ["vt-related", "vt-missing-link"]);
  assert.deepEqual(metadata.unresolvedLinkIds, ["vt-missing-link"]);
  assert.equal(metadata.blockerCount, 0);
  assert.match(index.warnings[0].message, /missing linked ticket vt-missing-link/);
});

test("creates metadata rows for tickets without relationships", () => {
  const index = buildRelationshipIndex([
    ticket({ id: "vt-lone" })
  ]);

  const metadata = index.byTicketId.get("vt-lone");
  assert.ok(metadata);
  assert.equal(metadata.dependencyCount, 0);
  assert.equal(metadata.blockerCount, 0);
  assert.equal(metadata.linkCount, 0);
});

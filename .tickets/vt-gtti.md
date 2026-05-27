---
id: vt-gtti
status: closed
deps: [vt-36pm]
links: []
created: 2026-05-27T17:18:56Z
type: feature
priority: 1
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#3-mvp-hierarchy-model
parent: vt-ynrq
tags: [mvp, hierarchy, model, test]
---
# Model hierarchy and closed-ticket visibility

Build the MVP hierarchy model over parsed tickets, focused on parent-child structure, active/closed visibility, unresolved parents, status classification, and sibling sorting.

## Acceptance Criteria

Parent-child reverse edges are computed; Unparented and Unresolved Parent groups are modeled; closed children are hidden by default with closed counts; closed parents appear only for visible active children; unknown statuses remain visible with warnings; sort order matches the OpenSpec; unit tests cover the model.


## Notes

**2026-05-27T17:26:25Z**

Implemented MVP hierarchy model: status classification, parent-child reverse edges, Unparented and Unresolved Parent grouping, closed child hiding with closed counts, closed parent anchors for visible active children, unknown-status warnings, and priority/status/title/id sorting. Validation: npm test passed 17/17 tests; npm run lint passed.

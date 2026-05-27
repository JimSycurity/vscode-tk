---
id: vt-xfbv
status: open
deps: []
links: []
created: 2026-05-27T18:56:28Z
type: feature
priority: 2
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#post-mvp-roadmap-context
parent: vt-esrr
tags: [post-mvp, dependencies, navigation, relationships]
---
# Add dependency-focused ticket navigation

Make blocker chains, blocked-by relationships, related links, unresolved references, and parent/child chains easier to inspect than compact metadata alone.

## Acceptance Criteria

Users can navigate dependency and blocked-by chains from a selected ticket; unresolved references are inspectable; related links are distinct from blockers; dependency-focused UI works with the existing relationship model; tests cover chain traversal, cycles, missing references, and closed versus active blockers.


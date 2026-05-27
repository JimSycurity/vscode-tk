---
id: vt-13fh
status: closed
deps: [vt-gtti]
links: []
created: 2026-05-27T17:18:56Z
type: feature
priority: 1
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#4-relationship-metadata-and-warnings
parent: vt-ynrq
tags: [mvp, relationships, warnings, test]
---
# Add relationship metadata and warning groups

Compute dependency, blocker, and related-link metadata for tickets and expose parse versus relationship warning groups for the sidebar model.

## Acceptance Criteria

Dependency, reverse-blocker, and related-link edges are computed; counts include all references and identify active or unresolved blockers where useful; parse and relationship warnings are split; tests cover missing parent, dependency, link, blocker, and count behavior.


## Notes

**2026-05-27T17:27:33Z**

Implemented relationship metadata slice: dependency edges, reverse blockers, related links, active/unresolved dependency metadata, missing dependency/link relationship warnings, and tests for counts and warning behavior. Validation: npm test passed 21/21 tests; npm run lint passed.

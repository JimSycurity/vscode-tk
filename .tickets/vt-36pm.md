---
id: vt-36pm
status: closed
deps: [vt-x48g]
links: []
created: 2026-05-27T17:18:56Z
type: feature
priority: 0
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#2-parser-and-discovery
parent: vt-ynrq
tags: [mvp, parser, discovery, test]
---
# Build ticket parser and active project discovery

Implement the centralized parser and active-project discovery boundary for wedow/ticket Markdown files, including optional tk CLI diagnostics and real tk fixture coverage.

## Acceptance Criteria

Discovery follows projectRoot, workspace-local .tickets, nearest ancestor, and selection rules; parser normalizes ticket frontmatter and body fields; malformed files become parse warnings; real tk fixture tests cover create, parent, dependency, link, close, malformed, and migrated examples; read-only browsing does not require tk on PATH.


## Notes

**2026-05-27T17:25:05Z**

Implemented parser/discovery slice: centralized Markdown frontmatter parser, active project discovery with projectRoot/workspace-local/ancestor selection, narrow discovery scope, optional tk CLI diagnostic helper, parse-warning results, and representative fixture tests for created, dependency/link, closed, migrated, and malformed tickets. Validation: npm test passed 10/10 tests; npm run lint passed.

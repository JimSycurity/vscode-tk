---
id: vt-o8hz
status: closed
deps: []
links: []
created: 2026-05-27T19:41:16Z
type: task
priority: 2
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md#file-watching-and-project-discovery-across-workspaceancestor-paths
parent: vt-ukm8
tags: [security, watcher, indexing, performance]
---
# Debounce watcher refresh and bound ticket indexing

Protect the extension host from noisy file-watch events and oversized .tickets directories by serializing refreshes and adding ticket indexing guardrails.

## Acceptance Criteria

Watcher events are debounced; concurrent refreshes cannot apply stale tree state; indexing has documented file-count and file-size limits; skipped files are surfaced through warning nodes; tests cover debounce/stale reload behavior or the extracted guard logic.


## Notes

**2026-05-27T19:56:39Z**

Implemented watcher/indexer resource hardening: watcher refreshes are debounced, stale async reloads are ignored with a generation guard, indexing defaults to 2,000 Markdown files and 1 MB per ticket file, and skipped files surface warnings. README documents the limits. npm test passed 35/35.

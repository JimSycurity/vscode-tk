---
id: vt-kemo
status: closed
deps: []
links: []
created: 2026-05-27T19:40:48Z
type: task
priority: 1
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md#packaging-distribution-assumptions-before-installable-vsix-use
parent: vt-ukm8
tags: [security, packaging, vsix]
---
# Package VSIX with explicit runtime allowlist

Add packaging controls so installable VSIX builds include compiled runtime files and required extension assets, while excluding local planning state, tickets, OpenSpec artifacts, source tests, and agent metadata found by the security review.

## Acceptance Criteria

VSIX/package dry-run includes out/**, package.json, README.md, LICENSE, and resources/**; dry-run excludes .tickets/**, .codex/**, openspec/**, src/**, tests, .vscode/**, and unwanted source maps unless intentionally retained; README documents the packaging command and smoke expectation.


## Notes

**2026-05-27T19:43:26Z**

Implemented packaging controls: added package files allowlist, .vscodeignore exclusions, and README packaging smoke docs. Verified npm_config_cache=/tmp/vscode-tk-npm-cache npm pack --dry-run now includes only 12 runtime/package files and excludes tickets/OpenSpec/source/tests/maps. npm test passed 24/24.

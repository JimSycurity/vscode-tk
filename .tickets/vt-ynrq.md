---
id: vt-ynrq
status: closed
deps: []
links: []
created: 2026-05-27T15:10:14Z
type: feature
priority: 1
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/
tags: [vscode, extension, tickets, openspec]
---
# Draft a VS Code extension spec for tk tickets

Create the initial OpenSpec proposal for a lightweight VS Code extension that discovers .tickets directories, indexes Markdown ticket frontmatter, supports search/filter/dependency navigation, and opens ticket Markdown files for editing rather than becoming a second issue editor.

## Acceptance Criteria

OpenSpec change artifacts exist for a read-mostly VS Code tickets explorer; scope explicitly avoids Beads/Dolt server lifecycle; MVP and later polish are separated; ticket Markdown remains the source of truth.


## Notes

**2026-05-27T18:34:24Z**

MVP implementation complete. Child tickets vt-x48g, vt-36pm, vt-gtti, vt-13fh, vt-2p83, vt-avs5, and vt-6zrn are closed. OpenSpec tasks are all checked. Validation: npm test passed 21/21 tests; npm run lint passed; npm run compile passed; openspec validate tickets-explorer-vscode-extension --strict passed. Real llm-wiki Extension Host smoke was good for normal repo scenarios; malformed and unknown-status behavior is covered by unit tests rather than synthetic manual tickets.

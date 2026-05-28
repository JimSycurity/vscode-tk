---
id: vt-3ha9
status: closed
deps: []
links: []
created: 2026-05-27T18:56:28Z
type: task
priority: 2
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#post-mvp-roadmap-context
parent: vt-esrr
tags: [post-mvp, packaging, release, docs]
---
# Package and prepare vscode-tk for distribution

Prepare the extension for normal installation and eventual Marketplace/Open VSX distribution, with compatibility docs and release assets.

## Acceptance Criteria

VSIX packaging works; README includes install-from-VSIX and Extension Host workflows; screenshots or screen captures show the MVP; changelog/release notes exist; compatibility expectations for VS Code, wedow/ticket file format, and optional tk CLI are documented; Marketplace/Open VSX publishing decision is recorded.


## Notes

**2026-05-27T21:51:33Z**

Prepared local VSIX distribution path: added @vscode/vsce packaging scripts, repository metadata, CHANGELOG.md, release-assets notes, README install-from-VSIX/compatibility/publishing-decision docs, and package allowlist cleanup. Built /home/jsykora/Repos/vscode-tk/vscode-tk-0.0.1.vsix. Validation: npm test passed 36/36; npm run lint passed; npm run package:dry-run listed only expected runtime/docs/resources; npm run package:vsix produced a 17-file VSIX; npm pack --dry-run listed 15 expected package files; npm audit --omit=optional found 0 vulnerabilities.

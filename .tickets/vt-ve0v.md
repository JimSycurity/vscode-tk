---
id: vt-ve0v
status: closed
deps: [vt-fjw3]
links: []
created: 2026-05-27T18:56:28Z
type: feature
priority: 2
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#post-mvp-roadmap-context
parent: vt-esrr
tags: [post-mvp, tk-cli, mutations, commands]
---
# Add optional tk CLI-backed mutation commands

Add mutation commands while keeping wedow/ticket and Markdown files as the source of truth. Extension writes should go through tk or a compatibility layer rather than ad hoc frontmatter editing.

## Acceptance Criteria

Commands exist for create, start, close, reopen, add dependency, remove dependency, link, unlink, and add note; commands are disabled with a clear diagnostic when tk is unavailable; successful mutations refresh the tree; failure output is surfaced clearly; tests or smoke fixtures prove commands call the mutation boundary rather than hand-editing frontmatter.


## Notes

**2026-05-27T20:31:48Z**

Implemented tk CLI-backed mutation commands: create, start, close, reopen, add/remove dependency, link/unlink, and add note. Commands use the hardened runTkMutation boundary, check tk availability before writes, show diagnostics on unavailable/failure, refresh after success, and expose context-menu actions when tk is detected. README documents the commands. Validation: npm test passed 36/36; npm pack dry-run still contains 13 runtime/package files only.

**2026-05-27T21:02:49Z**

Follow-up fix after Extension Host smoke: added command icons so Tickets view/title actions render compactly, and replaced freeform dependency/link target entry with QuickPick selection from indexed tickets. Remove dependency/unlink now pick existing relationship ids, preserving unresolved ids when present. Validation: npm test passed 36/36; npm pack dry-run still contains 13 runtime/package files only.

**2026-05-27T21:07:14Z**

Added right-click Add Child Ticket workflow for parent/epic tickets. The command prompts for a child title and calls the hardened create mutation with --parent set to the selected ticket id. README and CLI argv tests updated. Validation: npm test passed 36/36; npm pack dry-run still contains 13 runtime/package files only.

**2026-05-27T21:38:02Z**

Context-menu polish after manual smoke test: moved Copy Ticket ID from VS Code inline-only menu placement into the normal ticket right-click menu and removed Reveal Ticket File from that menu. Validation: npm test passes 36/36; npm pack --dry-run includes expected package files.

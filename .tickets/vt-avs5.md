---
id: vt-avs5
status: closed
deps: [vt-2p83]
links: []
created: 2026-05-27T17:18:56Z
type: feature
priority: 2
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#6-editor-integration
parent: vt-ynrq
tags: [mvp, editor, watcher]
---
# Wire editor integration and refresh loop

Connect TreeView actions to VS Code editor behavior and refresh the model when ticket files change after activation.

## Acceptance Criteria

Activating a ticket opens its Markdown in preview-style behavior; explicit pinned/to-side, copy id, and reveal file commands exist; selection survives refresh when possible; file watchers and manual refresh update the explorer after ticket file creates, changes, renames, and deletes.


## Notes

**2026-05-27T17:30:37Z**

Implemented editor integration and refresh loop code: preview open, pinned open, copy ticket id, reveal file, selected-ticket preservation on refresh, file watcher registration after active project load, and manual refresh. Validation: npm test passed 21/21 tests; npm run lint passed. Remaining: Extension Host/manual smoke to verify editing ticket Markdown updates the explorer through the watcher.

**2026-05-27T17:50:09Z**

Manual Extension Host watcher smoke confirmed by user: closing vt-avs5 in Markdown refreshed it out of the Tickets tree after save.

**2026-05-27T18:28:36Z**

Follow-up UI affordance fix after llm-wiki smoke: Open Ticket Pinned existed as a command but was not discoverable from the Tickets tree, and Open to Side was missing. Added view/item/context menu entries for Open Ticket, Open Ticket Pinned, Open Ticket to Side, Copy Ticket ID, and Reveal Ticket File; added view title menu entries for Refresh, Search, and Clear Filters; added vscode-tk.openTicketToSide command using ViewColumn.Beside. Validation: npm test passed 21/21 tests; npm run lint passed; npm run compile passed.

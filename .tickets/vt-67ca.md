---
id: vt-67ca
status: in_progress
deps: []
links: []
created: 2026-05-27T18:56:28Z
type: feature
priority: 1
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#post-mvp-roadmap-context
parent: vt-esrr
tags: [post-mvp, multi-project, discovery, ui]
---
# Add project and repo isolation for ticket projects

Allow users to isolate, switch, and reason about multiple discovered .tickets projects without merging ticket id spaces. This is the next layer after the MVP's single active project model.

## Acceptance Criteria

The extension discovers multiple candidate projects; users can switch active project/repo from the UI or settings; ticket identity is consistently project-root plus ticket id; tree/search state is isolated per project; documentation explains projectRoot, discovery order, and multi-project behavior.


## Notes

**2026-05-27T18:59:40Z**

Implemented project/repo isolation first pass: added discovery of multiple candidate ticket projects, workspace-state selected project root, Tickets: Switch Ticket Project command, view-title switch action, active project tree description, project-root-plus-ticket-id selection identity, and README discovery/switching docs. Validation: npm test passed 24/24 tests; npm run lint passed; npm run compile passed. Remaining: Extension Host smoke with a multi-root workspace or multiple discovered .tickets projects to confirm switching UX.

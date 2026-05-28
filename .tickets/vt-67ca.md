---
id: vt-67ca
status: closed
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

**2026-05-27T21:18:05Z**

Follow-up UX improvement: project rows shown for ambiguous discovery are now actionable. Clicking a project row selects it, and right-click exposes Select Ticket Project. Validation: npm test passed 36/36; npm pack dry-run still contains 13 runtime/package files only.

**2026-05-27T21:22:27Z**

Follow-up tree model change: Tickets now lists all discovered workspace/ancestor tk projects as top-level repo nodes instead of forcing a selected project or showing Unparented at the root. Unparented/root tickets are flattened directly under the repo node; unresolved/warning groups remain nested. Mutations are scoped to the ticket's own project, and top-level create prompts for a target project when multiple are loaded. Validation: npm test passed 36/36; npm pack dry-run still contains 13 runtime/package files only.

**2026-05-27T21:29:06Z**

Bug fix after multi-project repo-root tree smoke: indexed-ticket validation now descends through project root nodes, so open/reveal/add-child and other ticket actions recognize visible tickets as indexed again. Also removed direct click command from expandable ticket rows to avoid VS Code tree command warnings; leaf tickets still open on click and all ticket rows retain context actions. Validation: npm test passed 36/36; npm pack dry-run still contains 13 runtime/package files only.

**2026-05-27T21:35:22Z**

test note

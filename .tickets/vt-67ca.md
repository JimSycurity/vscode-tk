---
id: vt-67ca
status: open
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


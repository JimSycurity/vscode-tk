---
id: vt-ve0v
status: open
deps: []
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


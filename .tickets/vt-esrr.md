---
id: vt-esrr
status: open
deps: []
links: []
created: 2026-05-27T18:56:09Z
type: epic
priority: 1
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#post-mvp-roadmap-context
tags: [post-mvp, roadmap, planning]
---

# Plan post-MVP vscode-tk roadmap

Parent ticket for the post-MVP roadmap preserved in openspec/changes/tickets-explorer-vscode-extension/tasks.md. This tracks the next product layers after the read-only hierarchy-first MVP: project isolation, richer table/search, dependency navigation, CLI-backed mutations, board workflows, and packaging/distribution.

## Acceptance Criteria

Each post-MVP roadmap lane has a child ticket with clear scope, acceptance criteria, and dependencies; implementation proceeds through explicit follow-up tickets/OpenSpec changes rather than treating the MVP as the final product definition.


## Notes

**2026-05-27T18:56:36Z**

Created post-MVP roadmap child tickets from openspec/changes/tickets-explorer-vscode-extension/tasks.md: vt-67ca project/repo isolation; vt-f0y1 rich table/search and saved filters; vt-xfbv dependency-focused navigation; vt-ve0v optional tk CLI-backed mutation commands; vt-48ik Kanban/planning views after mutation boundary; vt-3ha9 packaging/distribution. Added dependency vt-48ik -> vt-ve0v because board/drag workflows require a proven mutation boundary.

**2026-05-29T17:00:56Z**

Archive prep: verified the Post-MVP Roadmap Context in openspec/changes/tickets-explorer-vscode-extension/tasks.md is represented by roadmap tickets under this epic before archiving the OpenSpec change. Existing coverage: vt-67ca project/repo isolation; vt-f0y1 rich table/search/saved filters; vt-xfbv dependency-focused navigation; vt-ve0v CLI-backed mutations; vt-48ik Kanban/planning after mutation boundary; vt-3ha9 packaging/distribution.

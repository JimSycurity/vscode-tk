## Why

[`wedow/ticket`](https://github.com/wedow/ticket), exposed as the `tk` CLI, keeps
issue tracking intentionally simple by storing tickets as Markdown files with
YAML frontmatter in `.tickets/`. That simplicity is useful, but it also means VS
Code users lose the fast issue-navigation surface they may have had with heavier
systems such as Beads. A lightweight VS Code extension can restore hierarchy and
dependency context without adding a server, database, or second editing surface.

The project should explicitly attribute UI and workflow inspiration to
[`jdillon/vscode-beads`](https://github.com/jdillon/vscode-beads), which is
licensed under the Apache License 2.0, while keeping the initial implementation
original and MIT-licensed.

## What Changes

- Add a VS Code extension project for browsing `tk`
  (`wedow/ticket`) tickets from one active project/repo at a time.
- Provide a dedicated Tickets sidebar with a hierarchy-first TreeView focused on
  parent/child ticket structure.
- Discover the active `.tickets/` project from the workspace-local directory
  first, the nearest ancestor second, or an explicit `vscode-tk.projectRoot`
  workspace/user setting.
- Parse ticket Markdown frontmatter and headings into a centralized in-memory
  index with fixture tests generated from real `tk` output.
- Open the backing ticket Markdown file in a normal VS Code editor when a ticket
  is selected; the MVP performs no writes to ticket files.
- Surface relationship context in one view: parent/child hierarchy first, with
  dependency/link counts and warnings for parse or relationship problems.
- Keep Markdown ticket files as the source of truth; the extension must not
  require a daemon, Dolt server, SQLite database, long-running backend, or the
  `tk` CLI for read-only browsing.
- Treat the hierarchy-first TreeView as the MVP, not the final product shape.
  Preserve the broader product goal of becoming a richer VS Code workbench for
  `tk` issue navigation over time.
- Defer rich webview tables, saved filters, body/full-text search, write
  commands, drag-and-drop status changes, Kanban workflows, repository/project
  isolation controls, and full Beads-parity features to later changes.

## Capabilities

### New Capabilities

- `ticket-workspace-discovery`: Discover candidate ticket projects, select one
  active project, and maintain an index of Markdown-backed ticket records.
- `ticket-explorer-ui`: Present active-project tickets in a dedicated VS Code
  sidebar TreeView and navigate to the backing Markdown file.
- `ticket-relationship-visibility`: Surface parent/child, dependency, blocking,
  related-ticket, unresolved-reference, and warning context derived from ticket
  frontmatter.

### Modified Capabilities

- None.

## Future Direction

The MVP is the first working slice, not the end state. The longer-term project
goal is to recover much of the useful day-to-day issue-navigation experience
from vscode-beads while staying faithful to `wedow/ticket`'s simpler
Markdown-backed model. Future changes should be able to add:

- Project/repo isolation and switching for workspaces that contain multiple
  `.tickets/` projects.
- A richer table or webview mode with multi-column sorting, stacked filters,
  saved filters, and full body/text search.
- Deeper dependency exploration, including dependency-focused views and easier
  navigation through blockers, blocked tickets, related links, and parent/child
  chains.
- Optional CLI-backed actions for create, start, close, reopen, add dependency,
  link, and add note, with `tk` remaining the mutation authority.
- Optional Kanban/board-style status views and drag workflows after the read-only
  navigation surface is proven.
- Packaging and distribution as a normal VS Code extension once the local
  Extension Host MVP is useful.

## Impact

- New VS Code extension codebase, likely TypeScript targeting VS Code 1.85+.
- New parser/indexing code for `.tickets/*.md` files and YAML frontmatter.
- New hierarchy-first TreeView contribution in a dedicated Tickets activity/sidebar.
- Optional `tk` CLI detection for diagnostics and future commands, but MVP
  browsing reads files directly and continues when `tk` is unavailable.
- No change to the `tk` ticket file format in this proposal, though the extension
  will document the stable frontmatter fields it consumes.
- Attribution documentation for vscode-beads as an inspiration source; no
  Apache-licensed code or assets are planned for the MVP.
- Future implementation phases should remain explicit OpenSpec changes rather
  than being silently treated as part of MVP completion.

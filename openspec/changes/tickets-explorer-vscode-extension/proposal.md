## Why

[`wedow/ticket`](https://github.com/wedow/ticket), exposed as the `tk` CLI, keeps
issue tracking intentionally simple by storing tickets as Markdown files with
YAML frontmatter in `.tickets/`. That simplicity is useful, but it also means VS
Code users lose the fast issue-navigation surface they may have had with heavier
systems such as Beads. A lightweight VS Code extension can restore search,
filtering, and dependency visibility without adding a server, database, or
second editing surface.

The project should explicitly attribute UI and workflow inspiration to
[`jdillon/vscode-beads`](https://github.com/jdillon/vscode-beads), which is
licensed under the Apache License 2.0, while keeping the initial implementation
original and MIT-licensed.

## What Changes

- Add a VS Code extension project for browsing `tk`
  (`wedow/ticket`) tickets from one or more workspace folders.
- Discover `.tickets/` directories by walking workspace folders and parents,
  matching `tk`'s project-discovery behavior where practical.
- Parse ticket Markdown frontmatter and headings into an in-memory ticket index.
- Provide a read-mostly Tickets Explorer UI with search, status/priority/type/tag
  filtering, and dependency/parent-child visibility.
- Open the backing ticket Markdown file in a normal VS Code editor when a ticket
  is selected.
- Keep Markdown ticket files as the source of truth; the extension must not
  require a daemon, Dolt server, SQLite database, or long-running backend.
- Defer rich editing, drag-and-drop status changes, and Beads-parity Kanban
  workflows to later polish unless explicitly added by a follow-up change.

## Capabilities

### New Capabilities

- `ticket-workspace-discovery`: Discover ticket projects in VS Code workspaces and
  maintain an index of Markdown-backed ticket records.
- `ticket-explorer-ui`: Present tickets in a searchable/filterable VS Code UI and
  navigate to the backing Markdown file.
- `ticket-relationship-visibility`: Surface parent/child, dependency, blocking,
  and related-ticket relationships derived from ticket frontmatter.

### Modified Capabilities

- None.

## Impact

- New VS Code extension codebase, likely TypeScript targeting VS Code 1.85+.
- New parser/indexing code for `.tickets/*.md` files and YAML frontmatter.
- New UI surface, either a VS Code tree/webview hybrid or a webview-backed table.
- Optional use of the `tk` CLI for project compatibility checks and future
  commands, but the MVP should read files directly.
- No change to the `tk` ticket file format in this proposal, though the extension
  will document the stable frontmatter fields it consumes.
- Attribution documentation for vscode-beads as an inspiration source; no
  Apache-licensed code or assets are planned for the MVP.

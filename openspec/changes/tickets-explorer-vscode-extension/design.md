## Context

The target issue tracker is [`wedow/ticket`](https://github.com/wedow/ticket),
exposed locally as the `tk` CLI. Its tickets are plain Markdown files under
`.tickets/` with YAML frontmatter for fields such as `id`, `status`, `deps`,
`links`, `type`, `priority`, `assignee`, `parent`, `tags`, and `external-ref`.
This makes tickets durable and easy for agents to inspect, but the day-to-day VS
Code experience is currently less rich than issue trackers with a dedicated
extension.

The first extension should preserve the lightweight `wedow/ticket` model. The
extension is a navigation and visibility layer over files already in the
workspace; it should not become a required ticket database, daemon supervisor,
or alternate issue editor.

The user experience is intentionally inspired by
[`jdillon/vscode-beads`](https://github.com/jdillon/vscode-beads), especially
its issue list, filtering, dependency visibility, and editor-adjacent workflow.
That project is licensed under the Apache License 2.0. This design uses it as
attribution-worthy inspiration, but does not plan to copy source code, assets, or
Apache-licensed implementation material into the MVP. If implementation later
adapts upstream code or assets, the project must preserve the applicable
Apache-2.0 license and notice obligations for that material alongside this
repo's MIT-licensed original code.

## Goals / Non-Goals

**Goals:**

- Provide a fast VS Code surface for discovering and browsing `.tickets/`
  projects.
- Build an in-memory index from ticket Markdown frontmatter and headings.
- Support common daily workflow filters: text search, status, priority, type,
  assignee, tag, ready/blocked, and parent/child relationships.
- Open ticket Markdown files in standard VS Code editors for edits.
- Keep the MVP implementation small enough to ship and test without recreating
  the full Beads extension.

**Non-Goals:**

- No Dolt, SQLite, local server, daemon lifecycle, or background database.
- No required write path beyond opening Markdown files.
- No drag-and-drop Kanban, inline rich editing, or full Beads parity in the
  initial implementation.
- No changes to the `tk` ticket file format unless a later change explicitly
  introduces a compatibility contract.

## Decisions

1. Read ticket files directly for the MVP.

   Direct file parsing matches the `tk` design and avoids depending on command
   output formats. The `tk` CLI can still be used later for create/status/dependency
   commands, but the base explorer should work anywhere `.tickets/*.md` files are
   present.

2. Treat Markdown files as the edit surface.

   Selecting a ticket opens the backing `.md` file. This keeps VS Code's native
   editor, Git diff, and agent-readable Markdown as the authoritative workflow,
   while the extension focuses on navigation.

3. Start with an in-memory index and file watchers.

   Ticket collections are expected to be small enough that scanning `.tickets/`
   on activation and refreshing on file changes is simpler and more reliable
   than introducing persistent state. If larger repos need optimization later,
   that can be added behind the same indexing contract.

4. Prefer a webview-backed table for the main MVP.

   A tree view is quick for grouped navigation, but the desired interaction is
   search plus multi-field filtering and sorting. A webview table can support
   this without fighting the limitations of the VS Code tree API. A small command
   or tree contribution can still provide quick entry points if useful.

5. Derive relationships from stable frontmatter fields.

   Dependencies come from `deps`, symmetric related links from `links`, ownership
   hierarchy from `parent`, and reverse edges are computed during indexing. The
   extension should not invent relationship state outside the files.

## Risks / Trade-offs

- Attribution drift -> keep README and design notes clear that vscode-beads is
  an inspiration source, and add Apache-2.0 notices if implementation starts
  incorporating upstream code or assets.
- Frontmatter shape drift -> document the consumed fields and tolerate missing
  optional fields with warnings rather than hard failures.
- Webview complexity -> keep the first UI limited to table, filters, counts, and
  open-file navigation before adding board or details-panel polish.
- Multi-root ambiguity -> expose a project selector when more than one `.tickets/`
  directory is discovered, and include project names in UI state.
- File watcher missed events -> provide a manual refresh command and cheap full
  rescan path.
- Write-command temptation -> keep the MVP read-mostly; add CLI-backed commands
  only when they preserve Markdown as source of truth and have tests.

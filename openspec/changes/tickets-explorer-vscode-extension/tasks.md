## 1. Project Scaffolding

- [ ] 1.1 Create the VS Code extension package structure with TypeScript build, unit test, and lint scripts.
- [ ] 1.2 Add lazy activation for the dedicated Tickets sidebar/view and ticket commands.
- [ ] 1.3 Add extension contributions for the Tickets activity/sidebar, refresh command, search command, clear-filters command, open-ticket command, open-pinned/to-side command, and reveal-ticket-file command.
- [ ] 1.4 Add baseline README/development notes that describe the read-only MVP, vscode-beads attribution, and local Extension Host smoke workflow.

## 2. Parser And Discovery

- [ ] 2.1 Implement active-project discovery in order: `vscode-tk.projectRoot`, workspace-local `.tickets/`, nearest ancestor `.tickets/`, then user selection if ambiguous.
- [ ] 2.2 Keep discovery narrow to workspace folders and ancestors, with no broad recursive descendant scan.
- [ ] 2.3 Detect optional `tk` CLI availability and expose a non-blocking diagnostic state when it is missing.
- [ ] 2.4 Implement centralized Markdown ticket parsing for frontmatter, first heading title, body text, file path, file timestamps, and project root.
- [ ] 2.5 Normalize optional fields including deps, links, parent, tags, assignee, external reference, type, status, and priority.
- [ ] 2.6 Add fixture tests generated from real `wedow/ticket` output for create, parent, dependency, link, close, malformed, and migrated tickets.
- [ ] 2.7 Implement parse-warning collection so malformed tickets do not block the rest of the index.

## 3. MVP Hierarchy Model

- [ ] 3.1 Compute parent/child reverse edges from `parent` fields.
- [ ] 3.2 Group parentless active tickets under Unparented.
- [ ] 3.3 Group tickets with missing parent references under Unresolved Parent.
- [ ] 3.4 Hide closed children by default while computing closed-child counts for parents.
- [ ] 3.5 Show closed parents only when they have visible active children.
- [ ] 3.6 Classify active statuses as `open` and `in_progress`, terminal status as `closed`, and unknown statuses as visible warnings.
- [ ] 3.7 Sort sibling tickets by priority ascending, status order `in_progress`, `open`, `unknown`, `closed`, title, then id.
- [ ] 3.8 Add unit tests for hierarchy, unresolved parents, closed visibility, status classification, sorting, and unknown-status warnings.

## 4. Relationship Metadata And Warnings

- [ ] 4.1 Compute dependency and reverse-blocking edges from `deps` fields.
- [ ] 4.2 Compute related-ticket edges from `links` fields without treating them as blockers.
- [ ] 4.3 Include all referenced tickets in dependency, blocker, and link counts while identifying active or unresolved blockers when useful.
- [ ] 4.4 Split warning state into Parse and Relationships groups for sidebar display.
- [ ] 4.5 Add unit tests for dependency counts, blocker counts, related-link counts, missing dependency/link warnings, and missing parent warnings.

## 5. MVP Tickets TreeView

- [ ] 5.1 Build the dedicated Tickets TreeView for the active project using the hierarchy model.
- [ ] 5.2 Render parent/child hierarchy, Unparented, Unresolved Parent, and Warnings groups.
- [ ] 5.3 Show compact metadata for priority, status, dependency count, blocker count, link count, and closed-child count.
- [ ] 5.4 Add metadata-focused Search Tickets behavior over id, title, status, priority, type, assignee, tags, and external reference.
- [ ] 5.5 Add Clear Filters behavior that returns the TreeView to the default hierarchy.
- [ ] 5.6 Add empty states for no workspace, no active `.tickets/` project, no tickets, and no filtered results.

## 6. Editor Integration

- [ ] 6.1 Open the backing `.tickets/<id>.md` file with normal preview-style editor behavior when a ticket row is activated.
- [ ] 6.2 Add explicit pinned/open-to-side behavior for tickets.
- [ ] 6.3 Add copy-ticket-id and reveal-ticket-file commands.
- [ ] 6.4 Preserve selected ticket and active project state across refreshes when the ticket still exists.
- [ ] 6.5 Add file watchers and manual refresh support for created, changed, renamed, and deleted ticket files after first activation.
- [ ] 6.6 Verify that editing ticket Markdown updates the explorer after file watcher refresh.

## 7. Validation And Packaging

- [ ] 7.1 Run parser, discovery, hierarchy, relationship, warning, and sorting unit tests.
- [ ] 7.2 Run TypeScript build and lint.
- [ ] 7.3 Document manual Extension Host smoke steps for the read-only MVP.
- [ ] 7.4 Smoke test against a real `.tickets/` repo with open, in-progress, closed, parent, child, dependency, linked, malformed, unknown-status, unresolved-parent, ready, and blocked tickets.
- [ ] 7.5 Document deferred polish such as multi-project isolation/switching, webview table, body/full-text search, saved filters, CLI-backed create/status commands, Kanban board, and inline details editing.

## Post-MVP Roadmap Context

This section is intentionally not an MVP checklist. It preserves the next-step
context so the first implementation slice does not accidentally become the final
product definition.

- Project/repo isolation and switching across multiple discovered `.tickets/`
  projects.
- Rich webview/table mode with multi-column sorting, stacked filters, saved
  filters, and body/full-text search.
- Dependency-focused navigation for blocker chains, blocked-by relationships,
  related links, and unresolved graph references.
- Optional CLI-backed mutation commands for create, start, close, reopen, add
  dependency, link, unlink, and add note.
- Optional Kanban/status board and drag workflows once mutation boundaries are
  proven.
- Extension packaging, screenshots, release notes, marketplace decisions, and
  compatibility documentation.

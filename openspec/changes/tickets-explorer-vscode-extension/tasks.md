## 1. Project Scaffolding

- [ ] 1.1 Create the VS Code extension package structure with TypeScript build, test, and lint scripts.
- [ ] 1.2 Add extension contributions for the Tickets activity/view, refresh command, project switcher command, and open-ticket command.
- [ ] 1.3 Add baseline README/development notes that describe the read-mostly MVP and local extension-host workflow.

## 2. Ticket Discovery And Indexing

- [ ] 2.1 Implement workspace discovery for `.tickets/` directories across workspace folders and parent paths.
- [ ] 2.2 Implement Markdown ticket parsing for frontmatter, first heading title, body text, file path, and file timestamps.
- [ ] 2.3 Normalize optional fields including deps, links, parent, tags, assignee, external reference, type, status, and priority.
- [ ] 2.4 Implement parse-warning collection so malformed tickets do not block the rest of the index.
- [ ] 2.5 Add file watchers and manual refresh support for created, changed, renamed, and deleted ticket files.
- [ ] 2.6 Add unit tests covering discovery, parsing, optional fields, malformed frontmatter, and refresh behavior.

## 3. Relationship Model

- [ ] 3.1 Compute parent/child reverse edges from `parent` fields.
- [ ] 3.2 Compute dependency and reverse-blocking edges from `deps` fields.
- [ ] 3.3 Compute related-ticket edges from `links` fields without treating them as blockers.
- [ ] 3.4 Classify open and in-progress tickets as ready or blocked based on dependency status.
- [ ] 3.5 Add unit tests for parent/child, dependency, blocker, related-link, missing-reference, ready, and blocked behavior.

## 4. Explorer UI

- [ ] 4.1 Build the initial ticket list view with id, title, status, priority, type, assignee, tags, and project context.
- [ ] 4.2 Add text search over id, title, body, tags, assignee, and external reference.
- [ ] 4.3 Add structured filters for project, status, priority, type, assignee, tag, ready, and blocked.
- [ ] 4.4 Add sorting for priority, status, title, updated time, created time, type, and assignee.
- [ ] 4.5 Add relationship indicators and navigation for parent, children, dependencies, blockers, and related tickets.
- [ ] 4.6 Add empty states for no workspace, no `.tickets/`, no tickets, and filtered-out results.

## 5. Editor Integration

- [ ] 5.1 Open the backing `.tickets/<id>.md` file in a normal VS Code editor when a ticket row is activated.
- [ ] 5.2 Preserve selected ticket and active project state across refreshes when the ticket still exists.
- [ ] 5.3 Add copy-ticket-id and reveal-ticket-file commands.
- [ ] 5.4 Verify that editing ticket Markdown updates the explorer after file watcher refresh.

## 6. Validation And Packaging

- [ ] 6.1 Run extension unit tests and fix failures.
- [ ] 6.2 Run TypeScript build and lint.
- [ ] 6.3 Package a local VSIX or document extension-host launch steps for manual smoke testing.
- [ ] 6.4 Smoke test against a real `.tickets/` repo with open, closed, parent, dependency, linked, malformed, ready, and blocked tickets.
- [ ] 6.5 Document deferred polish such as CLI-backed create/status commands, Kanban board, saved filters, and inline details editing.

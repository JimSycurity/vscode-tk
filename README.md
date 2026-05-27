# vscode-tk

A VS Code extension for https://github.com/wedow/ticket.

## MVP

The first implementation is a read-only Tickets sidebar for Markdown-backed
`tk` tickets. The MVP opens ticket files in the normal VS Code editor and keeps
`wedow/ticket` files as the source of truth.

## Development

Install dependencies, compile, and launch the extension host:

```sh
npm install
npm run compile
```

In VS Code, use the **Run Extension** launch configuration. The extension
contributes a dedicated **Tickets** activity/sidebar and command stubs for the
read-only MVP workflow.

Useful checks:

```sh
npm run lint
npm test
```

## Manual MVP Smoke Test

1. Open this repository in VS Code.
2. Run `npm install` and `npm run compile`.
3. Start **Run Extension** from the Run and Debug panel, or press `F5`.
4. In the Extension Development Host window, open a repository that contains a
   `.tickets/` directory.
5. Open the **Tickets** activity/sidebar.
6. Confirm the tree shows parent/child hierarchy, Unparented tickets, compact
   metadata, and warning groups when applicable.
7. Select a ticket and confirm its backing Markdown file opens in the editor.
8. Edit a visible ticket title or status in Markdown, save it, and confirm the
   Tickets tree refreshes without running the refresh command.
9. Run **Tickets: Search Tickets** and confirm metadata search narrows the tree.
10. Run **Tickets: Clear Ticket Filters** and confirm the hierarchy returns.

The current MVP smoke evidence was captured against this repo's `.tickets/`
tree in the Extension Development Host. Closing a visible child ticket removed
it from the default tree after save, confirming the watcher refresh path.

## Post-MVP Direction

The MVP is intentionally read-only and hierarchy-first. Later changes should
preserve the larger goal of a richer `wedow/ticket` workbench:

- Project/repo isolation and switching across multiple `.tickets/` projects.
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

## Attribution

This project is inspired by the user experience and issue-navigation concepts in
https://github.com/jdillon/vscode-beads, which is licensed under the Apache
License 2.0. The initial design does not incorporate vscode-beads source code or
assets; if that changes, Apache-2.0 license and notice obligations must be
preserved for the incorporated material.

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

## Packaging

Before building an installable VSIX, compile the extension and inspect the
package payload:

```sh
npm run compile
npm pack --dry-run
```

The installable payload should contain the compiled `out/` runtime, manifest,
license, README, and resources. It should not include local tickets, OpenSpec
artifacts, source tests, `.vscode/`, or agent metadata.

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

## Project Discovery And Switching

vscode-tk can discover more than one `wedow/ticket` project when a VS Code
workspace contains multiple folders or nested repos. The extension keeps ticket
identity scoped to the active project root so duplicate ticket ids in different
repos are not merged.

Discovery order:

1. `vscode-tk.projectRoot`, when explicitly configured.
2. A workspace folder's local `.tickets/` directory.
3. The nearest ancestor `.tickets/` directory when the workspace folder has no
   local ticket project.

When more than one project is discovered and `vscode-tk.projectRoot` is unset,
use **Tickets: Switch Ticket Project** from the command palette or the Tickets
view title menu. The selected project is stored in VS Code workspace state, so
it does not write `.vscode/settings.json` for you.

Set `vscode-tk.projectRoot` only when you want an explicit user/workspace
override. While that setting is present, UI project switching is disabled so the
configured project stays authoritative.

By default, an explicit `vscode-tk.projectRoot` must be inside the opened
workspace. Set `vscode-tk.allowExternalProjectRoot` only when you intentionally
want the extension to read, watch, open, reveal, and eventually mutate a ticket
project outside the workspace.

The ticket indexer is bounded to protect the extension host from unusually large
or noisy repositories. By default it indexes up to 2,000 Markdown ticket files
and skips individual ticket files larger than 1 MB, surfacing skipped files in
the Warnings group.

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

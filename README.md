# vscode-tk

A VS Code extension for browsing and managing
[wedow/ticket](https://github.com/wedow/ticket) Markdown tickets.

## Features

vscode-tk contributes a dedicated **Tickets** activity/sidebar for `.tickets/`
projects while keeping `wedow/ticket` Markdown files as the source of truth.

- Discover workspace-local and nearest-ancestor `.tickets/` projects.
- Show every discovered workspace project as a top-level tree node, so
  duplicate ticket ids in different repos stay isolated.
- Render parent/child ticket hierarchy with unparented/root tickets under each
  project.
- Show priority, status, dependency/blocker/link counts, closed-child counts,
  and parse/relationship warnings.
- Search indexed ticket metadata and clear filters from the view toolbar.
- Open ticket Markdown in the normal VS Code editor, including pinned and
  side-by-side open commands.
- Copy ticket ids from ticket context menus.
- Run optional ticket CLI-backed mutations for create, add child ticket, start,
  close, reopen, dependency/link updates, and notes.

The extension does not try to become a second Markdown editor. Ticket text and
frontmatter stay in the normal `.tickets/*.md` files, and edits made by `tk`,
`gtk`, or another editor are picked up through refresh/file watching.

## Install

Download the latest `.vsix` from the
[GitHub Releases](https://github.com/JimSycurity/vscode-tk/releases) page.

Install the generated VSIX in VS Code:

1. Open the Extensions view.
2. Select **Views and More Actions...**.
3. Choose **Install from VSIX...**.
4. Select the downloaded file, for example `vscode-tk-0.0.2.vsix`.
5. Reload VS Code if prompted.

Local/private VSIX installation is the current distribution target. Marketplace
and Open VSX publishing are deferred until there is more live workspace usage,
final screenshots, and another security review.

## Development

Install dependencies, compile, and launch the extension host:

```sh
npm install
npm run compile
```

In VS Code, use the **Run Extension** launch configuration. The extension
contributes the **Tickets** activity/sidebar and command palette entries under
the **Tickets** category.

Useful checks:

```sh
npm run lint
npm test
```

## Packaging

Before building an installable VSIX locally, compile the extension, run tests,
and inspect the package payload:

```sh
npm run compile
npm test
npm run package:dry-run
```

Build an installable VSIX:

```sh
npm run package:vsix
```

CI runs on pushes and pull requests to `main` and `dev`. Tagged releases matching
`v*` run tests, build the VSIX, generate `SHA256SUMS.txt`, upload workflow
artifacts, and create a GitHub Release.

The installable payload should contain the compiled `out/` runtime, manifest,
license, README, changelog, release-asset notes, and resources. It should not
include local tickets, OpenSpec artifacts, source tests, `.vscode/`, source
TypeScript, package-lock metadata, or agent metadata.

Compatibility expectations:

- VS Code `^1.85.0`.
- Node 20 is recommended for local development and packaging because the current
  `@vscode/vsce` toolchain requires it.
- Ticket files are Markdown files using `wedow/ticket` frontmatter fields such
  as `id`, `status`, `deps`, `links`, `parent`, `type`, and `priority`.
- A ticket CLI is optional for browsing and opening tickets. It is required only
  for mutation commands. By default vscode-tk runs `tk`; set
  `vscode-tk.command` to `gtk` when using
  [`go-ticket`](https://github.com/JimSycurity/go-ticket) side-by-side with
  upstream `wedow/ticket`.
- Explicit `vscode-tk.projectRoot` values outside the current workspace require
  `vscode-tk.allowExternalProjectRoot`.

## Project Discovery And Switching

vscode-tk can discover more than one `wedow/ticket` project when a VS Code
workspace contains multiple folders or nested repos. Each discovered project is
shown as a top-level tree node, and unparented/root tickets appear directly under
their project. Ticket identity stays scoped to the project root so duplicate
ticket ids in different repos are not merged.

Discovery order:

1. `vscode-tk.projectRoot`, when explicitly configured.
2. A workspace folder's local `.tickets/` directory.
3. The nearest ancestor `.tickets/` directory when the workspace folder has no
   local ticket project.

When more than one project is discovered and `vscode-tk.projectRoot` is unset,
the Tickets view lists all discovered workspace/ancestor projects. **Tickets:
Switch Ticket Project** is still available as a quick reveal command, but it is
not required for browsing.

Set `vscode-tk.projectRoot` only when you want an explicit user/workspace
override. While that setting is present, only the configured project is shown so
the configured project stays authoritative.

By default, an explicit `vscode-tk.projectRoot` must be inside the opened
workspace. Set `vscode-tk.allowExternalProjectRoot` only when you intentionally
want the extension to read, watch, open, reveal, and eventually mutate a ticket
project outside the workspace.

Workspace-local `.tickets/` directories are canonicalized during discovery. If
`.tickets/` is a symlink whose real target escapes the project root, the project
is treated as external and blocked unless `vscode-tk.allowExternalProjectRoot`
is enabled.

The ticket indexer is bounded to protect the extension host from unusually large
or noisy repositories. By default it indexes up to 2,000 Markdown ticket files
and skips individual ticket files larger than 1 MB, surfacing skipped files in
the Warnings group.

## Mutation Commands

The extension can run optional ticket CLI-backed mutation commands. Markdown
ticket files remain the source of truth; vscode-tk does not hand-edit ticket
frontmatter.

Available commands:

- **Tickets: Create Ticket**
- **Tickets: Add Child Ticket**
- **Tickets: Start Ticket**
- **Tickets: Close Ticket**
- **Tickets: Reopen Ticket**
- **Tickets: Add Dependency**
- **Tickets: Remove Dependency**
- **Tickets: Link Ticket**
- **Tickets: Unlink Ticket**
- **Tickets: Add Note**

Commands are available from the command palette and ticket context menus. The
extension checks for the configured command lazily when a mutation is invoked,
not on activation. If the command is unavailable, mutation commands show a
diagnostic and leave the read-only explorer usable. Successful mutations refresh
the tree.

### CLI Command Setting

`vscode-tk.command` controls which executable mutation commands run. The default
is `tk` for compatibility with upstream `wedow/ticket`. Set it to `gtk` to use
`go-ticket` without replacing upstream `tk` on your PATH.

The setting accepts an executable name or absolute path only. Inline arguments
are not supported, and vscode-tk runs the command without a shell. The setting is
machine-scoped so a repository cannot silently replace the mutation executable
through workspace settings.

## Future Plans

vscode-tk now covers the working explorer path: multi-project discovery,
parent/child hierarchy, ticket opening, metadata search, packageable VSIX builds,
and optional ticket CLI-backed mutations. Future work should build on that without
turning the extension into a second Markdown editor.

- Dependency-focused navigation for blocker chains, blocked-by relationships,
  related links, and unresolved graph references.
- Rich table or webview mode with multi-column sorting, stacked filters, saved
  filters, and body/full-text search.
- Kanban/status board views once the mutation workflows have more live usage.
- Final screenshot assets and public Marketplace/Open VSX publishing decisions.

## Attribution

This project is inspired by the user experience and issue-navigation concepts in
https://github.com/jdillon/vscode-beads, which is licensed under the Apache
License 2.0. The initial design does not incorporate vscode-beads source code or
assets; if that changes, Apache-2.0 license and notice obligations must be
preserved for the incorporated material.

# Changelog

## 0.0.2

Release hardening and packaging update.

- Add GitHub Actions CI for pushes and pull requests to `main` and `dev`.
- Add tag-driven GitHub Release workflow that builds the VSIX, writes
  `SHA256SUMS.txt`, uploads artifacts, and attaches them to the release.
- Update the VSIX packaging toolchain to `@vscode/vsce` 3.9.1.
- Harden project discovery so symlinked `.tickets/` directories that escape the
  project root are treated as external and require
  `vscode-tk.allowExternalProjectRoot`.
- Stop running `tk --help` on activation; CLI availability is checked lazily
  when mutation commands are invoked.

## 0.0.1

Initial private preview package for vscode-tk.

- Add a Tickets activity/sidebar for `wedow/ticket` Markdown ticket projects.
- Discover workspace and nearest ancestor `.tickets/` projects without merging
  ticket id spaces across repos.
- Show project roots, parent/child ticket hierarchy, relationship counts, and
  parse/relationship warnings.
- Open ticket Markdown files in the normal VS Code editor, including pinned and
  side-by-side open commands.
- Search indexed ticket metadata and clear filters.
- Run optional `tk` CLI-backed mutations for create, add child ticket, start,
  close, reopen, dependency/link updates, and notes.
- Keep explicit external project roots opt-in with
  `vscode-tk.allowExternalProjectRoot`.

Publishing note: this release is prepared for local VSIX installation first.
Marketplace and Open VSX publishing are deferred until the extension has more
real-workspace smoke time and final screenshots.

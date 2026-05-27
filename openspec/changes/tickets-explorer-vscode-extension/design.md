## Context

The target issue tracker is [`wedow/ticket`](https://github.com/wedow/ticket),
exposed locally as the `tk` CLI. Its tickets are plain Markdown files under
`.tickets/` with YAML frontmatter for fields such as `id`, `status`, `deps`,
`links`, `type`, `priority`, `assignee`, `parent`, `tags`, and `external-ref`.
This makes tickets durable and easy for agents to inspect, but the day-to-day VS
Code experience is currently less rich than issue trackers with a dedicated
extension.

The first extension should preserve the lightweight `wedow/ticket` model. The
extension is a read-only navigation and visibility layer over files already in
the workspace; it should not become a required ticket database, daemon
supervisor, or alternate issue editor.

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

- Provide a fast VS Code surface for discovering and browsing one active
  `.tickets/` project.
- Build a centralized in-memory index from ticket Markdown frontmatter and
  headings.
- Make parent/child ticket structure the primary MVP experience.
- Show dependency/link counts and relationship warnings without building a graph
  browser yet.
- Open ticket Markdown files in standard VS Code editors for edits.
- Keep the MVP implementation small enough to ship and test without recreating
  the full Beads extension.
- Preserve a clear path from the MVP to the broader product goal: a richer VS
  Code ticket workbench for `wedow/ticket`.

**Non-Goals:**

- No Dolt, SQLite, local server, daemon lifecycle, or background database.
- No extension-owned writes to ticket files in the MVP.
- No broad recursive search for `.tickets/` directories.
- No combined multi-project dashboard in the MVP.
- No drag-and-drop Kanban, inline rich editing, webview table, saved filters, or
  full Beads parity in the initial implementation.
- No changes to the `tk` ticket file format unless a later change explicitly
  introduces a compatibility contract.

## Product Trajectory

The MVP is deliberately small because the first milestone should prove the core
navigation loop: discover one `tk` project, parse tickets reliably, show
parent/child structure, expose relationship context, and open Markdown quickly.
That constraint should not erase the larger ambition.

The fuller product should eventually feel closer to the useful parts of
vscode-beads: a high-signal issue workbench inside VS Code with fast filtering,
search, dependency inspection, and project-aware navigation. The difference is
that vscode-tk should keep `wedow/ticket`'s source of truth intact: Markdown
ticket files, Git diffs, and optional `tk` CLI mutations rather than a server or
separate database.

Post-MVP work should be sequenced as separate changes so each layer earns its
weight:

1. Project/repo isolation and switching.

   The MVP stores project root in the internal model but shows one active
   project. The next layer should let users switch among discovered projects and
   isolate views by repo without merging ticket id spaces.

2. Rich search and filter workspace.

   The TreeView's metadata search is only the beginning. A later webview/table
   should support multi-column sorting, stacked filters, saved filters, and
   body/full-text search across descriptions, notes, and acceptance criteria.

3. Deeper relationship navigation.

   Parent/child hierarchy is first because that is hardest to see from the CLI.
   Later views should make blocker chains, blocked-by relationships, related
   links, unresolved references, and dependency-focused navigation easier to
   explore.

4. Optional CLI-backed mutations.

   The extension can eventually add create, start, close, reopen, add dependency,
   link, unlink, and add-note actions, but those actions should call `tk` or a
   compatibility layer rather than hand-editing frontmatter ad hoc.

5. Board and planning views.

   Kanban/status board views, drag workflows, and richer planning screens should
   come only after the read-only navigation model and mutation boundary are
   trustworthy.

6. Packaging and distribution.

   The local Extension Host workflow is enough for MVP. Later phases should add
   release packaging, Marketplace/Open VSX decisions, screenshots, changelog, and
   documented compatibility expectations.

## Decisions

1. Read ticket files directly for the MVP, but centralize compatibility.

   Direct file parsing matches the `tk` design and avoids depending on command
   output formats. The parser must live behind one module and be fixture-tested
   against real `tk` command output for create, parent, dependency, link, close,
   malformed, and migrated-ticket examples. The `tk` CLI can still be used later
   for create/status/dependency commands, but the base explorer should work
   anywhere `.tickets/*.md` files are present.

2. Treat `tk` CLI availability as optional for read-only browsing.

   Missing `tk` must not prevent discovery, indexing, or navigation. The
   extension should expose a non-blocking diagnostic state when the CLI is absent
   so future CLI-backed commands can be disabled with a clear reason.

3. Select one active ticket project for the MVP.

   Full implementation should support isolating by project/repo, but the MVP
   should avoid a combined multi-root dashboard. Discovery checks
   `workspaceFolder/.tickets` first, then the nearest ancestor `.tickets` only
   when no workspace-local project exists. If multiple candidates remain, the
   user selects one active project. Internally, records should still carry
   `projectRoot` so later multi-project features do not require a data-model
   rewrite.

4. Use a dedicated sidebar TreeView before a webview table.

   The first product surface should be a dedicated Tickets activity/sidebar with
   a native TreeView. The TreeView defaults to parent/child hierarchy, with
   unparented and unresolved-parent groups. Rich multi-column filtering, saved
   filters, and full text/body search belong in a later webview/table phase.

5. Make the MVP read-only.

   Selecting a ticket opens the backing Markdown file. Default activation should
   use VS Code's preview-style editor behavior; explicit context actions can
   open pinned or to the side. The extension should not start, close, create, or
   mutate tickets during the MVP.

6. Show current work with historical context, not every closed subtree.

   Active statuses are `open` and `in_progress`; `closed` is terminal; unknown
   statuses remain visible with warnings. Closed parents are visible only when
   they explain visible active children, and closed children are hidden by
   default while contributing closed-child counts to their parent.

7. Keep relationship visualization compact.

   Parent/child hierarchy is first-class. Dependencies, blockers, and links show
   as compact counts/metadata on ticket items. Missing parent/dependency/link
   references are relationship warnings. Full relationship traversal can be
   added later if the compact model feels insufficient.

8. Activate lazily.

   The extension should activate when the Tickets view or a ticket command is
   used, then scan and start watchers. This keeps VS Code startup polite while
   still making refresh cheap after first activation.

9. Use unit-first validation.

   Parser, discovery, hierarchy, sorting, warning classification, and relationship
   model tests should run without launching VS Code. MVP validation also includes
   a manual Extension Host smoke checklist.

## Risks / Trade-offs

- Attribution drift -> keep README and design notes clear that vscode-beads is
  an inspiration source, and add Apache-2.0 notices if implementation starts
  incorporating upstream code or assets.
- Frontmatter shape drift -> centralize parser logic, fixture-test against real
  `tk` output, and tolerate missing optional fields with warnings rather than
  hard failures.
- TreeView limits -> keep MVP hierarchy-first and defer rich table/search
  interactions to a webview phase.
- Multi-root ambiguity -> select one active project in MVP, preserve project root
  in the internal model, and add repo isolation/switching later.
- File watcher missed events -> provide a manual refresh command and cheap full
  rescan path.
- Write-command temptation -> keep the MVP read-only; add CLI-backed commands
  only when they preserve Markdown as source of truth and have tests.
- Roadmap loss -> keep future goals in this design and split them into explicit
  follow-up OpenSpec changes after the MVP instead of letting the MVP spec become
  the final product definition.

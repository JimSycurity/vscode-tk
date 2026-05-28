# Release Assets

## Current MVP Screenshots

Manual smoke testing has captured the MVP in an Extension Development Host with:

- Multiple discovered ticket projects shown as top-level repo nodes.
- Parent/child ticket hierarchy under a repo node.
- Ticket metadata, warning groups, and malformed-status warning display.
- Context menu actions for opening tickets, copying ticket ids, child ticket
  creation, status changes, dependencies, links, and notes.

Before a public Marketplace or Open VSX listing, capture fresh committed images:

- `docs/screenshots/tickets-multi-project.png`
- `docs/screenshots/ticket-context-menu.png`
- `docs/screenshots/warnings.png`

## Publishing Decision

The current distribution target is local/private VSIX installation. Marketplace
and Open VSX publishing are intentionally deferred until the extension has a
little more live workspace usage, final screenshots, and another security review
after the packaging work lands.

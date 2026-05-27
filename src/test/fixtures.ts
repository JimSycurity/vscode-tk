export const createdTicket = `---
id: vt-demo
status: open
deps: []
links: []
created: 2026-05-27T15:10:14Z
type: feature
priority: 1
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/
parent: vt-parent
tags: [vscode, extension, tickets, openspec]
---
# Draft VS Code extension spec for tk tickets

Create the initial OpenSpec proposal for a lightweight VS Code extension.

## Acceptance Criteria

Ticket Markdown remains the source of truth.
`;

export const linkedTicket = `---
id: vt-child
status: in_progress
deps: [vt-demo, vt-other]
links: [vt-related]
created: 2026-05-27T15:12:00Z
type: task
priority: 0
assignee:
parent: ""
tags: []
---
# Child implementation slice

The body can mention dependencies without changing frontmatter parsing.
`;

export const closedTicket = `---
id: vt-closed
status: closed
deps: []
links: []
created: 2026-05-27T15:13:00Z
type: task
priority: 3
assignee: unassigned
parent: null
tags: [done]
---
# Closed ticket
`;

export const migratedTicket = `---
id: vt-migrated
status: open
deps: [vt-closed]
links: [vt-demo, vt-child]
created: 2026-05-27T15:14:00Z
type: bug
priority: 2
assignee: Migrated User
external-ref: beads:abc123
tags: [migrated, beads]
---
# Migrated Beads ticket

Imported from a prior issue tracker.
`;

export const malformedTicket = `---
id vt-bad
status: open
---
# Bad ticket
`;

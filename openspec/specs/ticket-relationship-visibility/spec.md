# ticket-relationship-visibility Specification

## Purpose
TBD - created by archiving change tickets-explorer-vscode-extension. Update Purpose after archive.
## Requirements
### Requirement: Parent Child Relationships
The extension SHALL derive parent and child ticket relationships from the
`parent` frontmatter field and make them the primary TreeView structure.

#### Scenario: Ticket has a parent
- **WHEN** a ticket frontmatter field declares `parent: <id>`
- **THEN** the extension shows the ticket beneath that parent when the parent is
  indexed

#### Scenario: Parent ticket is missing
- **WHEN** a ticket references a parent id that is not present in the active
  project index
- **THEN** the extension marks the parent reference as unresolved and displays
  the ticket under the Unresolved Parent group

### Requirement: Dependency And Blocking Metadata
The extension SHALL derive dependency and reverse-blocking relationships from
the `deps` frontmatter field and show them as compact metadata in the single MVP
view.

#### Scenario: Ticket depends on another ticket
- **WHEN** a ticket declares `deps: [<id>]`
- **THEN** the extension includes the dependency in that ticket's dependency
  count and identifies unresolved or active blockers when useful

#### Scenario: Ticket blocks another ticket
- **WHEN** another ticket declares the current ticket id in its `deps` list
- **THEN** the extension includes the dependent ticket in the current ticket's
  blocker count

### Requirement: Related Ticket Link Metadata
The extension SHALL surface non-blocking related-ticket links from the `links`
frontmatter field as compact metadata.

#### Scenario: Ticket has related links
- **WHEN** a ticket declares `links: [<id>]`
- **THEN** the extension includes those linked tickets in the link count without
  treating them as blockers

### Requirement: Relationship Counts
The extension SHALL include all referenced tickets in dependency, blocker, and
link counts while distinguishing active or unresolved blockers when useful.

#### Scenario: Ticket references closed and active dependencies
- **WHEN** a ticket has dependencies with mixed statuses
- **THEN** the extension counts all dependencies and can indicate how many are
  active or unresolved

### Requirement: Status Classification
The extension SHALL classify known and unknown ticket statuses for display.

#### Scenario: Ticket status is known
- **WHEN** a ticket status is `open`, `in_progress`, or `closed`
- **THEN** the extension classifies `open` and `in_progress` as active and
  `closed` as terminal

#### Scenario: Ticket status is unknown
- **WHEN** a ticket status is not recognized
- **THEN** the extension keeps the ticket visible and records an unknown-status
  warning

### Requirement: Warning Groups
The extension SHALL show parse and relationship warnings in the Tickets sidebar.

#### Scenario: Parse warning exists
- **WHEN** a ticket file is malformed or unreadable
- **THEN** the TreeView includes the warning under a Warnings Parse group

#### Scenario: Relationship warning exists
- **WHEN** a ticket references a missing parent, dependency, or linked ticket
- **THEN** the TreeView includes the warning under a Warnings Relationships group

### Requirement: Relationship Navigation
The extension SHALL allow users to navigate from visible relationship references
to referenced tickets when the UI exposes those references.

#### Scenario: User activates a visible relationship reference
- **WHEN** the user activates an indexed parent, child, dependency, blocker, or
  related-ticket reference
- **THEN** the extension opens or focuses that ticket's Markdown file


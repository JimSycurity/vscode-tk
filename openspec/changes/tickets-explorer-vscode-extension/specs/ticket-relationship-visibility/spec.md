## ADDED Requirements

### Requirement: Parent Child Relationships
The extension SHALL derive parent and child ticket relationships from the
`parent` frontmatter field.

#### Scenario: Ticket has a parent
- **WHEN** a ticket frontmatter field declares `parent: <id>`
- **THEN** the extension shows the parent relationship and includes the ticket in
  the parent's child list

#### Scenario: Parent ticket is missing
- **WHEN** a ticket references a parent id that is not present in the active
  project index
- **THEN** the extension marks the parent reference as unresolved without hiding
  the ticket

### Requirement: Dependency And Blocking Relationships
The extension SHALL derive dependency and reverse-blocking relationships from
the `deps` frontmatter field.

#### Scenario: Ticket depends on another ticket
- **WHEN** a ticket declares `deps: [<id>]`
- **THEN** the extension shows that dependency on the ticket and shows the ticket
  as blocked by the dependency while the dependency is not closed

#### Scenario: Ticket blocks another ticket
- **WHEN** another ticket declares the current ticket id in its `deps` list
- **THEN** the extension shows the dependent ticket as blocked by the current
  ticket

### Requirement: Related Ticket Links
The extension SHALL surface non-blocking related-ticket links from the `links`
frontmatter field.

#### Scenario: Ticket has related links
- **WHEN** a ticket declares `links: [<id>]`
- **THEN** the extension displays those linked tickets separately from blocking
  dependencies

### Requirement: Ready And Blocked Classification
The extension SHALL classify active tickets as ready or blocked based on
dependency status.

#### Scenario: Active ticket has no unresolved dependencies
- **WHEN** a ticket is open or in progress and all dependency tickets are closed
- **THEN** the extension marks the ticket as ready

#### Scenario: Active ticket has unresolved dependencies
- **WHEN** a ticket is open or in progress and at least one dependency ticket is
  missing, open, or in progress
- **THEN** the extension marks the ticket as blocked and lists the blocking ids

### Requirement: Relationship Navigation
The extension SHALL allow users to navigate from visible relationship references
to the referenced ticket when it is indexed.

#### Scenario: User activates a relationship reference
- **WHEN** the user activates a visible parent, child, dependency, blocker, or
  related-ticket reference
- **THEN** the extension selects that ticket and opens or focuses its Markdown
  file


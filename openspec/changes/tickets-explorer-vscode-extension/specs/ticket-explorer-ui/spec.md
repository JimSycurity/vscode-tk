## ADDED Requirements

### Requirement: Ticket List View
The extension SHALL provide a VS Code UI that lists indexed tickets with their
core metadata.

#### Scenario: Tickets are indexed
- **WHEN** at least one ticket project has indexed tickets
- **THEN** the UI displays ticket id, title, status, priority, type, assignee,
  tags, and project context for each visible ticket

#### Scenario: No tickets are available
- **WHEN** no `.tickets/` directory or ticket files are found
- **THEN** the UI displays an empty state with refresh and project-discovery
  guidance

### Requirement: Ticket Filtering And Search
The extension SHALL allow users to narrow visible tickets by text and structured
fields.

#### Scenario: Text search is entered
- **WHEN** the user enters a search query
- **THEN** the UI filters tickets by id, title, body text, tags, assignee, and
  external reference

#### Scenario: Structured filters are selected
- **WHEN** the user filters by status, priority, type, assignee, tag, or project
- **THEN** the UI shows only tickets matching the selected filter set

### Requirement: Ticket Sorting
The extension SHALL support sorting ticket lists by commonly scanned fields.

#### Scenario: User selects a sort field
- **WHEN** the user sorts by priority, status, title, updated time, created time,
  type, or assignee
- **THEN** the visible ticket list is ordered by that field

### Requirement: Open Backing Markdown File
The extension SHALL open the backing ticket Markdown file in a VS Code editor
when a ticket is selected.

#### Scenario: Ticket row is activated
- **WHEN** the user activates a ticket row or card
- **THEN** VS Code opens the corresponding `.tickets/<id>.md` file in a normal
  editor

### Requirement: Read-Mostly MVP
The initial extension SHALL keep ticket Markdown files as the primary editing
surface.

#### Scenario: User wants to edit ticket text
- **WHEN** the user needs to change description, acceptance criteria, notes, or
  frontmatter
- **THEN** the extension opens the ticket Markdown file instead of rendering a
  separate rich editing form


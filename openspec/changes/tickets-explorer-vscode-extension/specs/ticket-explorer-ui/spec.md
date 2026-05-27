## ADDED Requirements

### Requirement: Dedicated Tickets Sidebar
The extension SHALL provide a dedicated VS Code Tickets activity/sidebar for the
active ticket project.

#### Scenario: Tickets view is opened
- **WHEN** the user opens the Tickets view
- **THEN** the extension activates, discovers the active project, indexes tickets,
  and renders the Tickets TreeView

#### Scenario: No tickets are available
- **WHEN** no active `.tickets/` project or ticket files are found
- **THEN** the UI displays an empty state with refresh and project-discovery
  guidance

### Requirement: Hierarchy First TreeView
The extension SHALL render active-project tickets in a native TreeView organized
around parent/child hierarchy.

#### Scenario: Parent has visible children
- **WHEN** an indexed ticket has child tickets
- **THEN** the TreeView displays the parent as a collapsible node with visible
  child tickets beneath it

#### Scenario: Ticket has no parent
- **WHEN** an indexed ticket has no parent
- **THEN** the TreeView displays it under an Unparented group

#### Scenario: Ticket references a missing parent
- **WHEN** an indexed ticket has a parent id that is not in the active project
  index
- **THEN** the TreeView displays it under an Unresolved Parent group

### Requirement: Active Work Default Visibility
The extension SHALL emphasize active tickets by default while preserving summary
context for closed tickets.

#### Scenario: Closed child tickets exist
- **WHEN** a parent has closed child tickets
- **THEN** the TreeView hides those closed children by default and shows a closed
  child count on the parent

#### Scenario: Closed parent has active children
- **WHEN** a closed parent has visible open or in-progress children
- **THEN** the TreeView shows the closed parent as a muted grouping anchor

#### Scenario: Closed subtree has no active children
- **WHEN** a closed parent and its descendants are all closed
- **THEN** the TreeView hides that subtree by default

### Requirement: Ticket Sorting
The extension SHALL sort sibling ticket nodes predictably.

#### Scenario: Sibling tickets are displayed
- **WHEN** sibling ticket nodes appear in the TreeView
- **THEN** they are sorted by priority ascending, status order
  `in_progress`, `open`, `unknown`, `closed`, then title, then id

### Requirement: Minimal MVP Search And Filters
The extension SHALL support lightweight metadata-focused navigation in the MVP.

#### Scenario: User searches tickets
- **WHEN** the user runs the Search Tickets command
- **THEN** the extension searches id, title, status, priority, type, assignee,
  tags, and external reference for the active project

#### Scenario: User clears filters
- **WHEN** the user runs the Clear Filters command
- **THEN** the TreeView returns to its default hierarchy view

### Requirement: Open Backing Markdown File
The extension SHALL open the backing ticket Markdown file in a VS Code editor
when a ticket is selected.

#### Scenario: Ticket row is activated
- **WHEN** the user activates a ticket row
- **THEN** VS Code opens the corresponding `.tickets/<id>.md` file using normal
  preview-style editor behavior

#### Scenario: User opens ticket explicitly
- **WHEN** the user runs an explicit pinned or open-to-side action
- **THEN** VS Code opens the corresponding ticket Markdown file using the
  requested editor behavior

### Requirement: Read Only MVP
The initial extension SHALL keep ticket Markdown files as the primary editing
surface and SHALL NOT write to ticket files.

#### Scenario: User wants to edit ticket text
- **WHEN** the user needs to change description, acceptance criteria, notes, or
  frontmatter
- **THEN** the extension opens the ticket Markdown file instead of rendering a
  separate rich editing form

#### Scenario: User wants to start close or mutate a ticket
- **WHEN** the MVP extension is installed
- **THEN** no start, close, create, dependency-edit, or note-write command is
  available from the extension

## ADDED Requirements

### Requirement: Active Ticket Project Discovery
The extension SHALL discover [`wedow/ticket`](https://github.com/wedow/ticket)
projects, exposed locally as `tk`, by locating one active `.tickets/` project for
the current VS Code workspace.

#### Scenario: Workspace contains a tickets directory
- **WHEN** a workspace folder contains a `.tickets/` directory
- **THEN** the extension selects that directory as the active ticket project

#### Scenario: Workspace has no local tickets directory but an ancestor has one
- **WHEN** a workspace folder does not contain `.tickets/` and a nearest ancestor
  contains `.tickets/`
- **THEN** the extension selects the nearest ancestor project as the active
  ticket project

#### Scenario: Multiple candidate projects are present
- **WHEN** discovery finds multiple plausible `.tickets/` projects
- **THEN** the extension prompts or otherwise allows the user to choose one
  active project instead of merging ticket identity spaces

### Requirement: Project Root Override
The extension SHALL support an optional `vscode-tk.projectRoot` setting for
explicitly selecting the active ticket project.

#### Scenario: Project root setting is configured
- **WHEN** `vscode-tk.projectRoot` points to a repo root or `.tickets/` directory
- **THEN** the extension uses that project as the active ticket project

#### Scenario: Project root setting is not configured
- **WHEN** `vscode-tk.projectRoot` is unset
- **THEN** the extension uses workspace discovery to choose the active ticket
  project

### Requirement: Narrow Discovery Scope
The extension SHALL limit MVP discovery to workspace folders and their ancestors.

#### Scenario: Workspace contains nested directories
- **WHEN** a workspace folder contains arbitrary nested directories
- **THEN** the extension does not recursively search all descendants for
  `.tickets/` projects

### Requirement: Markdown Ticket Indexing
The extension SHALL parse active-project `.tickets/*.md` files into ticket records
using YAML frontmatter and the first Markdown heading.

#### Scenario: Ticket file has complete frontmatter
- **WHEN** a ticket file contains recognized frontmatter fields and a title
  heading
- **THEN** the index includes the ticket id, path, title, status, priority, type,
  assignee, tags, parent, deps, links, external reference, body text, file
  timestamps, and project root

#### Scenario: Ticket file omits optional fields
- **WHEN** a ticket file is missing optional fields such as assignee, tags, links,
  deps, parent, or external reference
- **THEN** the index still includes the ticket with empty values for missing
  optional fields

### Requirement: Parser Compatibility Boundary
The extension SHALL centralize ticket parsing and test it against fixture files
generated from real `wedow/ticket` output.

#### Scenario: Parser fixtures are run
- **WHEN** the parser test suite runs
- **THEN** it verifies tickets created from real `tk` create, parent, dependency,
  link, close, malformed, and migrated-ticket examples

### Requirement: Optional CLI Availability
The extension SHALL allow read-only browsing when the `tk` CLI is unavailable.

#### Scenario: CLI is unavailable
- **WHEN** `.tickets/*.md` files exist but the `tk` CLI is missing from PATH
- **THEN** the extension indexes and displays tickets while reporting a
  non-blocking CLI diagnostic

### Requirement: Index Refresh
The extension SHALL refresh its ticket index when ticket Markdown files are
created, modified, renamed, or deleted after activation.

#### Scenario: Ticket file changes
- **WHEN** a file watcher observes a change under the active `.tickets/`
  directory
- **THEN** the extension refreshes the active project index and updates visible
  ticket views

#### Scenario: Manual refresh is requested
- **WHEN** the user runs the refresh command
- **THEN** the extension performs a full rescan of the active ticket project

### Requirement: Parse Error Tolerance
The extension SHALL tolerate malformed ticket files without preventing other
tickets from loading.

#### Scenario: One ticket cannot be parsed
- **WHEN** a ticket file has invalid frontmatter or an unreadable structure
- **THEN** the extension records a parse warning and continues indexing the
  remaining tickets

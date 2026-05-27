## ADDED Requirements

### Requirement: Ticket Project Discovery
The extension SHALL discover [`wedow/ticket`](https://github.com/wedow/ticket)
projects, exposed locally as `tk`, by locating `.tickets/` directories in the
active VS Code workspace.

#### Scenario: Workspace contains a tickets directory
- **WHEN** a workspace folder contains a `.tickets/` directory
- **THEN** the extension indexes that directory as a ticket project

#### Scenario: Multiple ticket projects are present
- **WHEN** multiple workspace folders or parent paths contain `.tickets/`
  directories
- **THEN** the extension exposes each discovered project without merging their
  ticket identity spaces

### Requirement: Markdown Ticket Indexing
The extension SHALL parse `.tickets/*.md` files into ticket records using YAML
frontmatter and the first Markdown heading.

#### Scenario: Ticket file has complete frontmatter
- **WHEN** a ticket file contains recognized frontmatter fields and a title
  heading
- **THEN** the index includes the ticket id, path, title, status, priority, type,
  assignee, tags, parent, deps, links, external reference, and body text

#### Scenario: Ticket file omits optional fields
- **WHEN** a ticket file is missing optional fields such as assignee, tags, links,
  deps, parent, or external reference
- **THEN** the index still includes the ticket with empty values for missing
  optional fields

### Requirement: Index Refresh
The extension SHALL refresh its ticket index when ticket Markdown files are
created, modified, renamed, or deleted.

#### Scenario: Ticket file changes
- **WHEN** a file watcher observes a change under a discovered `.tickets/`
  directory
- **THEN** the extension refreshes the affected project index and updates visible
  ticket views

#### Scenario: Manual refresh is requested
- **WHEN** the user runs the refresh command
- **THEN** the extension performs a full rescan of discovered ticket projects

### Requirement: Parse Error Tolerance
The extension SHALL tolerate malformed ticket files without preventing other
tickets from loading.

#### Scenario: One ticket cannot be parsed
- **WHEN** a ticket file has invalid frontmatter or an unreadable structure
- **THEN** the extension reports the file as a warning and continues indexing the
  remaining tickets

---
id: vt-h7wc
status: closed
deps: []
links: []
created: 2026-05-27T19:41:26Z
type: task
priority: 2
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md#duplicate-ticket-ids-and-frontmatter
parent: vt-ukm8
tags: [security, parser, indexing]
---
# Warn on duplicate ids and strict frontmatter delimiters

Improve parser and index integrity so duplicate ticket ids and malformed frontmatter cannot silently collapse tree state or misdirect future mutation commands.

## Acceptance Criteria

Frontmatter delimiter parsing only accepts standalone delimiter lines; duplicate ticket ids produce warnings instead of silent map overwrites; mutation commands can detect duplicate-id ambiguity and refuse unsafe writes; tests cover malformed delimiter and duplicate id cases.


## Notes

**2026-05-27T19:50:19Z**

Implemented parser/index integrity hardening: frontmatter closing delimiter must be a standalone line; indexer detects duplicate ticket ids, removes ambiguous records from the active index, and surfaces warnings for each duplicate file. npm test passed 30/30.

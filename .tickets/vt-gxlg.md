---
id: vt-gxlg
status: closed
deps: []
links: []
created: 2026-05-27T19:41:08Z
type: task
priority: 1
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md#markdown-file-openingrevealing-behavior
parent: vt-ukm8
tags: [security, paths, open-reveal]
---
# Canonicalize ticket project paths for open reveal and writes

Add canonical path containment checks for discovered projects, tickets directories, and indexed Markdown files so open/reveal behavior and future CLI-backed writes stay within the active .tickets project.

## Acceptance Criteria

Indexer rejects or warns on ticket files whose canonical path is outside the active .tickets directory; open/reveal commands only operate on contained indexed ticket files; mutation work has a reusable containment helper for validating targets.


## Notes

**2026-05-27T19:48:58Z**

Implemented containment hardening: added shared path containment helper, discovery reuses it, indexer realpaths the tickets dir and skips non-regular/canonical-escaping Markdown entries with warnings, and open/copy/reveal commands re-resolve supplied tree items against the active index before acting. npm test passed 28/28.

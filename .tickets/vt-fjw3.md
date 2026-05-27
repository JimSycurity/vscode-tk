---
id: vt-fjw3
status: closed
deps: [vt-1env, vt-gxlg, vt-h7wc]
links: []
created: 2026-05-27T19:41:36Z
type: task
priority: 1
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md#future-write-surface-planned-in-vt-ve0v
parent: vt-ukm8
tags: [security, tk-cli, mutations]
---
# Build hardened tk CLI mutation runner

Create the command-execution boundary required before vt-ve0v adds create/start/close/reopen/dependency/link/note UI commands.

## Acceptance Criteria

tk invocations use one runner with execFile/no shell, fixed argv construction, bounded timeout and output, cwd set to the active project root, sanitized environment, clear unavailable/failure diagnostics, and tests proving command strings are never assembled from untrusted text; vt-ve0v depends on this ticket.


## Notes

**2026-05-27T19:53:54Z**

Implemented hardened tk CLI mutation runner: typed mutation intents build fixed argv arrays, run through execFile with shell:false, project-root cwd, bounded timeout/maxBuffer, sanitized allowlisted env plus TICKETS_DIR, external-project refusal by default, and structured failure diagnostics. Tests prove shell-looking text stays as argv values and no secret env leakage. npm test passed 33/33; npm pack dry-run still contains runtime payload only.

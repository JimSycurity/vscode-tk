---
id: vt-ukm8
status: closed
deps: []
links: []
created: 2026-05-27T19:40:30Z
type: epic
priority: 1
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md
parent: vt-esrr
tags: [security, hardening, post-mvp]
---
# Harden vscode-tk security posture before mutation commands

Parent ticket for security review follow-up from /srv/llm-wiki/repo/.tmp/SecurityReview.md. Coordinates packaging, path containment, persistence, watcher/indexing limits, parser integrity, duplicate-ID handling, and tk CLI mutation-boundary work before vt-ve0v adds write commands.

## Acceptance Criteria

Security review findings are represented as child tickets; vt-ve0v is blocked by the mutation-boundary ticket and any required path-containment ticket; implemented hardening is tested before CLI-backed writes proceed.


## Notes

**2026-05-27T19:57:19Z**

Closed all security-review child tickets from /srv/llm-wiki/repo/.tmp/SecurityReview.md: vt-kemo packaging allowlist, vt-1env external projectRoot policy, vt-gxlg path containment/open-reveal validation, vt-h7wc duplicate-id and delimiter integrity, vt-o8hz watcher/indexing resource guards, and vt-fjw3 hardened tk mutation runner. Final validation: npm test passed 35/35 and npm pack dry-run contains runtime package payload only.

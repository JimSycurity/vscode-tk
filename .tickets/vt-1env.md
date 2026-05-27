---
id: vt-1env
status: closed
deps: []
links: []
created: 2026-05-27T19:40:57Z
type: task
priority: 1
assignee: Jim Sykora
external-ref: /srv/llm-wiki/repo/.tmp/SecurityReview.md#userworkspace-setting-vscode-tkprojectroot
parent: vt-ukm8
tags: [security, discovery, project-root]
---
# Constrain external projectRoot before write support

Harden vscode-tk.projectRoot handling so an explicit configured root cannot silently expand read/watch/open or future write behavior outside the intended workspace without an explicit user opt-in.

## Acceptance Criteria

Default discovery accepts workspace-local and ancestor tk projects but treats configured roots outside workspace folders as external; external roots require an explicit allow setting or clear user-facing diagnostic; future mutation callers can reliably tell whether the active project is write-eligible.


## Notes

**2026-05-27T19:45:12Z**

Implemented configured-root policy: added vscode-tk.allowExternalProjectRoot, discovery now marks configured roots outside workspace folders as blockedExternal unless opted in, and the tree shows a diagnostic instead of reading/watching external roots. README documents the opt-in. npm test passed 26/26.

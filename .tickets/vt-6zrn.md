---
id: vt-6zrn
status: closed
deps: [vt-avs5]
links: []
created: 2026-05-27T17:18:56Z
type: task
priority: 2
assignee: Jim Sykora
external-ref: openspec/changes/tickets-explorer-vscode-extension/tasks.md#7-validation-and-packaging
parent: vt-ynrq
tags: [mvp, validation, docs]
---
# Validate package and document MVP smoke path

Run and document MVP validation, including unit tests, TypeScript build/lint, Extension Host smoke steps, and deferred post-MVP roadmap context.

## Acceptance Criteria

Parser/discovery/hierarchy/relationship/warning/sorting tests pass; TypeScript build and lint run; README documents manual Extension Host smoke testing; a real .tickets repo smoke covers the OpenSpec scenarios; deferred roadmap remains documented.


## Notes

**2026-05-27T17:50:09Z**

Validation/docs progress: README now documents manual Extension Host MVP smoke steps and post-MVP roadmap; npm test passed 21/21 tests; npm run lint passed; npm run compile passed; openspec validate tickets-explorer-vscode-extension --strict passed. Remaining: full real-repo smoke matrix for open/in_progress/closed, parent/child, dependency/link, malformed, unknown-status, unresolved-parent, ready, and blocked cases.

**2026-05-27T18:34:01Z**

Final smoke closeout: user ran the extension against the llm-wiki repo and confirmed normal real-repo scenarios looked good, including hierarchy, dependency/link metadata, open/closed behavior, and watcher refresh. User did not create synthetic malformed or unknown-status tickets during manual smoke; those cases are covered by unit tests. Final validation rerun: npm test passed 21/21 tests; npm run lint passed; npm run compile passed; openspec validate tickets-explorer-vscode-extension --strict passed.

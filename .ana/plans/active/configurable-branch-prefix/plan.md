# Plan: configurable-branch-prefix

**Branch:** feature/configurable-branch-prefix

## Phases

- [x] Foundation — add branchPrefix to ana.json schema, init writer, and reader helper
  - Spec: spec-1.md
- [x] Migration — replace all hardcoded feature/ references in source, templates, and tests
  - Spec: spec-2.md
  - Depends on: Phase 1

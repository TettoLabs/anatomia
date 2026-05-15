# Plan: fix-merge-json-pollution

**Branch:** feature/fix-merge-json-pollution

## Phases

- [ ] Guard unguarded console.log calls in --merge and pull-recovery paths behind `if (!options?.json)`, add test coverage for --merge --json interaction
  - Spec: spec.md

# Plan: proof-intelligence-hardening

**Branch:** feature/proof-intelligence-hardening

## Phases

- [ ] Data integrity fixes — parseACResults section scoping, FAIL guard dedup, zero-run defaults, recovery-path counting
  - Spec: spec-1.md
- [ ] Infrastructure extraction — exitError factory, truncation helper, applied across close/promote/strengthen
  - Spec: spec-2.md
  - Depends on: Phase 1
- [ ] User-facing improvements — audit headline split, lesson command, staleness normalization, Learn template edits
  - Spec: spec-3.md
  - Depends on: Phase 2

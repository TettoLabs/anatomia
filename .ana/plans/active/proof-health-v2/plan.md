# Plan: proof-health-v2

**Branch:** feature/proof-health-v2

## Phases

- [ ] Health Stats Polish — rename sections, add Verification and Pipeline, merge Recurring+Promote into Next Actions
  - Spec: spec-1.md
- [ ] Timing Fix — add `ana work start`, fix `computeTiming`, update Think templates
  - Spec: spec-2.md
  - Depends on: Phase 1
- [ ] Guard Proof Chain Entry — block `ana work complete` when verify result is FAIL
  - Spec: spec-3.md
  - Depends on: Phase 2

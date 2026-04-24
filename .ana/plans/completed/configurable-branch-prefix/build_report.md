# Build Report: Configurable branch prefix — Phase 1 (Foundation)

**Created by:** AnaBuild
**Date:** 2026-04-24
**Spec:** .ana/plans/active/configurable-branch-prefix/spec-1.md
**Branch:** feature/configurable-branch-prefix

## What Was Built

- `src/commands/init/anaJsonSchema.ts` (modified): Added `branchPrefix` field to `AnaJsonSchema` — `z.string().optional().default('feature/').catch('feature/')` — between `artifactBranch` and `setupPhase`.
- `src/commands/init/state.ts` (modified): Added `branchPrefix: 'feature/'` to the `anaConfig` object in `createAnaJson()`, after `artifactBranch`.
- `src/utils/git-operations.ts` (modified): Added `readBranchPrefix()` function below `readArtifactBranch()`. Same structure but returns `'feature/'` fallback instead of `process.exit(1)`. Checks `typeof prefix !== 'string'` to handle null, number, and missing field cases.
- `tests/utils/git-operations.test.ts` (created): 12 tests covering `readBranchPrefix()` reader behavior and `AnaJsonSchema` branchPrefix handling.

## PR Summary

- Add `branchPrefix` as a first-class config field in `ana.json` with `'feature/'` default
- Schema uses `.optional().default('feature/').catch('feature/')` for fail-soft recovery on parse
- Init writer explicitly writes `branchPrefix: 'feature/'` so the field is discoverable in fresh installs
- New `readBranchPrefix()` reader returns configured value or `'feature/'` fallback for backward compatibility
- 12 unit tests prove reader fallback, schema round-trip, empty-string support, and invalid-value recovery

## Acceptance Criteria Coverage

- AC1 "Fresh ana init writes branchPrefix" → git-operations.test.ts `AnaJsonSchema branchPrefix > defaults branchPrefix to "feature/" when field is absent` (1 assertion) + state.ts line 389 literal
- AC2 "Re-init preserves user-modified branchPrefix" → git-operations.test.ts `AnaJsonSchema branchPrefix > preserves a user-modified branchPrefix through round-trip` (1 assertion). preserveUserState merge semantics preserve it automatically since branchPrefix is in the schema and not in the overwrite list.
- AC3 "readBranchPrefix returns feature/ when absent" → git-operations.test.ts `returns "feature/" when branchPrefix field is absent` (1 assertion)
- AC3a "readBranchPrefix returns configured value" → git-operations.test.ts `returns configured value when branchPrefix is present` (1 assertion)
- AC3b "readBranchPrefix returns feature/ when file missing" → git-operations.test.ts `returns "feature/" when ana.json is missing entirely` (1 assertion)
- AC3c "readBranchPrefix returns empty string" → git-operations.test.ts `returns empty string when branchPrefix is ""` (1 assertion)
- AC7 "Tests pass" → 1429 passed, 2 skipped (see below)
- AC8 "No build errors" → `pnpm run build` clean

## Implementation Decisions

- `readBranchPrefix()` uses `typeof prefix !== 'string'` check rather than `!config['branchPrefix']` (which `readArtifactBranch` uses) because empty string is a valid value — the falsy check would incorrectly reject it.
- The function returns the raw string from `config['branchPrefix']` rather than parsing through `AnaJsonSchema` — this keeps the reader lightweight and avoids importing the schema from a utils module. The schema is the write-side/merge-side validator; the reader is the runtime consumer.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  95 passed (95)
     Tests  1417 passed | 2 skipped (1419)
  Duration  12.71s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  96 passed (96)
     Tests  1429 passed | 2 skipped (1431)
  Duration  13.09s
```

### Comparison
- Tests added: 12
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/git-operations.test.ts`: readBranchPrefix — configured value, absent field, missing file, empty string, number type, null type, corrupted JSON. AnaJsonSchema — default, round-trip preservation, catch on invalid, empty string preservation, strip unknown fields.

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
ad4a728 [configurable-branch-prefix:s1] Add readBranchPrefix reader and tests
58e8cef [configurable-branch-prefix:s1] Add branchPrefix to schema and init writer
```

## Open Issues

None — verified by second pass.

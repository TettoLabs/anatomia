# Build Report: Timing Fix

**Created by:** AnaBuild
**Date:** 2026-05-02
**Spec:** .ana/plans/active/proof-health-v2/spec-2.md
**Branch:** feature/proof-health-v2

## What Was Built

- `packages/cli/src/commands/work.ts` (modified): Added `startWork` function with slug validation (kebab-case regex), branch validation (artifact branch required), uniqueness check (active + completed), git pull --rebase, directory creation, and `work_started_at` timestamp in `.saves.json`. Registered `start` as a third subcommand alongside `status` and `complete`.
- `packages/cli/src/utils/proofSummary.ts` (modified): Fixed `computeTiming` to read `work_started_at` as a top-level ISO string from `.saves.json`. When present: think = scopeTime - workStartedAt, plan = contractTime - scopeTime (different values). Total includes think phase. Falls back to identical think/plan for old entries.
- `packages/cli/templates/.claude/agents/ana.md` (modified): Replaced Step 1 manual `mkdir -p` instruction with `ana work start {slug}`.
- `.claude/agents/ana.md` (modified): Same Step 1 replacement as shipped template.
- `packages/cli/tests/commands/work.test.ts` (modified): Added 16 tests for `startWork` (happy path, slug validation, uniqueness, branch validation) plus 3 template content assertion tests.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 3 tests for `computeTiming` with `work_started_at` (separate think/plan, fallback, total_minutes).

## PR Summary

- Add `ana work start {slug}` command that validates inputs, creates the plan directory, and records `work_started_at` timestamp for accurate pipeline timing
- Fix `computeTiming` to produce separate think and plan durations when `work_started_at` exists, with backward-compatible fallback for old entries
- Update both shipped and dogfood Think templates to use `ana work start` instead of manual `mkdir`

## Acceptance Criteria Coverage

- AC9 "creates plan directory" -> work.test.ts "creates plan directory on start" (1 assertion) ✅
- AC10 "rejects non-kebab-case slugs" -> work.test.ts "rejects non-kebab-case slug with uppercase" + double-hyphen + leading-hyphen + trailing-hyphen tests (4 tests) ✅
- AC11 "rejects slugs in active or completed" -> work.test.ts "rejects slug that exists in active plans" + "rejects slug that exists in completed plans" (2 tests, 4 assertions) ✅
- AC12 "validates artifact branch" -> work.test.ts "rejects start on non-artifact branch" (3 assertions) ✅
- AC13 "writes work_started_at" -> work.test.ts "writes work_started_at to saves.json" (3 assertions) ✅
- AC14 "computeTiming uses work_started_at" -> proofSummary.test.ts "computes think from work_started_at and plan differs from think" (6 assertions) ✅
- AC15 "Think and Plan show different values" -> proofSummary.test.ts same test asserts think !== plan ✅
- AC16 "Old entries fallback" -> proofSummary.test.ts "falls back when work_started_at missing" (4 assertions) ✅
- AC17 "Think template Step 1 uses ana work start" -> work.test.ts "shipped template contains ana work start" ✅
- AC18 "Dogfood matches shipped" -> work.test.ts "dogfood template contains ana work start" + "templates do not contain mkdir instruction" ✅
- AC: Tests pass -> 1792 passed, 0 failed ✅
- AC: No build errors -> build clean ✅

## Implementation Decisions

- Slug validation happens before project root discovery. This means invalid slugs fail fast without needing a valid project directory — consistent with how other CLI tools handle argument validation.
- `work_started_at` is written as a plain ISO string (not inside a `{ saved_at, hash }` object) per spec's explicit constraint. The `SavesData` index signature allows this via `[key: string]: SaveEntry | PreCheckData | undefined`.
- Template tests use `path.join(__dirname, ...)` relative paths rather than requiring a git repo setup, since the template files are statically present in the repo.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1773 passed | 2 skipped (1775)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1792 passed | 2 skipped (1794)
```

### Comparison
- Tests added: 19
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/work.test.ts`: 16 startWork tests (happy path x4, slug validation x4, uniqueness x2, branch validation x1, confirmation message x1, saves.json content x1, template assertions x3)
- `packages/cli/tests/utils/proofSummary.test.ts`: 3 computeTiming tests (work_started_at present, absent fallback, total_minutes includes think)

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
09b54ec [proof-health-v2:s2] Update Think templates to use ana work start
a10e411 [proof-health-v2:s2] Fix computeTiming to use work_started_at
86d2469 [proof-health-v2:s2] Add ana work start command
34101e7 [proof-health-v2] Verify report 1
225f49e [proof-health-v2] Build report
495b68b [proof-health-v2:s1] Update health tests for new display layout
9e8657d [proof-health-v2:s1] Rewrite formatHealthDisplay for new section layout
89df74d [proof-health-v2:s1] Add verification and pipeline types and computation
```

## Open Issues

- `SavesData` type allows `work_started_at` via the index signature `[key: string]: SaveEntry | PreCheckData | undefined`, which means TypeScript doesn't enforce that `work_started_at` is a string. The `computeTiming` function uses a runtime `typeof` check (`typeof workStartedAtRaw === 'string'`) to handle this safely, but a dedicated type field would be cleaner.
- `startWork` uses `process.exit(1)` for validation errors, matching the pattern in `completeWork` and `validateBranch`. This makes unit testing require `vi.spyOn(process, 'exit')` mockery. A future refactor could return result objects instead, but that's a broader pattern change across all work commands.

Verified complete by second pass.

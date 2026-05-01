# Build Report: Learn V3 Phase 3 — Stale + Audit Full + Template Cleanups

**Created by:** AnaBuild
**Date:** 2026-05-01
**Spec:** .ana/plans/active/learn-v3-cli-commands/spec-3.md
**Branch:** feature/learn-v3-cli-commands

## What Was Built

- `packages/cli/src/types/proof.ts` (modified): Added `StaleFinding` and `StalenessResult` interfaces for the return type of `computeStaleness()`.
- `packages/cli/src/utils/proofSummary.ts` (modified): Added `computeStaleness()` pure function. Cross-references active findings' files against `modules_touched` in subsequent entries. Returns structured result with high/medium confidence tiers. Supports `afterSlug` and `minConfidence` filters.
- `packages/cli/src/commands/proof.ts` (modified): Added `stale` subcommand (read-only, no branch check, no git pull). Options: `--after <slug>`, `--min-confidence <level>`, `--json`. Added `--full` option to `audit` subcommand — bypasses MAX_FILES (8) and MAX_PER_FILE (3) caps when used with `--json`. Without `--json`, prints usage hint.
- `packages/cli/templates/.claude/agents/ana-learn.md` (modified): Stripped all V2 degradation paths ("if command doesn't exist", "perform manually", "fall back to"). Replaced manual staleness detection section with `ana proof stale` command reference. Added variadic ID examples (C1 C2 C3) for close, promote, strengthen. Updated audit reference to include `--json --full`.
- `.claude/agents/ana-learn.md` (modified): Synced to match template copy exactly.
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Added staleness awareness instruction for when proof context shows active findings that the current build's code changes may resolve. Preserved existing `If the command is not available` fallback.
- `.claude/agents/ana-verify.md` (modified): Synced to match template copy exactly.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 10 `computeStaleness` unit tests covering cross-referencing, confidence tiers, filters, edge cases.
- `packages/cli/tests/commands/proof.test.ts` (modified): Added 7 integration tests — stale command (basic, read-only, --after, --min-confidence, --json, zero results) and audit --full (--json --full bypasses caps, --full without --json shows hint).

## PR Summary

- Add `ana proof stale` subcommand — read-only staleness analysis that cross-references active findings' files against subsequent pipeline runs' `modules_touched`, grouped by confidence tier (high: 3+, medium: 1-2)
- Add `--full` flag to `ana proof audit` — removes truncation caps when used with `--json` for agent consumption; prints usage hint without `--json`
- Strip all V2 degradation paths from Learn template — no more "if command doesn't exist" or "perform manually" fallback language
- Add variadic ID examples (C1 C2 C3) to Learn template for close, promote, and strengthen commands
- Update Verify template with staleness awareness — instructs noting stale findings when proof context shows active findings resolved by the current build

## Acceptance Criteria Coverage

- AC1 "`ana proof stale` shows findings with staleness signals grouped by confidence tier" → proofSummary.test.ts "detects findings whose files were modified" + proof.test.ts "shows stale findings grouped by confidence" (5 assertions)
- AC2 "`ana proof stale` is read-only — no branch check, no git pull" → proof.test.ts "succeeds without branch check from non-artifact branch" (1 assertion)
- AC3 "`ana proof stale --after <slug>` filters to findings from that entry only" → proofSummary.test.ts "filters by afterSlug" + proof.test.ts "only shows findings from the specified entry" (3 assertions)
- AC4 "`ana proof stale --min-confidence high` filters to high-confidence only" → proofSummary.test.ts "filters by minConfidence high" + proof.test.ts stale --min-confidence (3 assertions)
- AC5 "`ana proof stale --json` returns structured output" → proof.test.ts "returns JSON with total_stale and confidence tiers" (5 assertions)
- AC6 "High confidence = 3+ subsequent entries" → proofSummary.test.ts "assigns high confidence when 3+ subsequent entries" (3 assertions)
- AC7 "Medium confidence = 1-2 subsequent entries" → proofSummary.test.ts "assigns medium confidence when 1-2 subsequent entries" (3 assertions)
- AC8 "`ana proof audit --json --full` returns all active findings without truncation" → proof.test.ts "returns all files and findings without truncation" (3 assertions)
- AC9 "`ana proof audit --full` without --json prints usage hint" → proof.test.ts "shows usage hint instead of output" (3 assertions)
- AC10 "Verify template instructs noting stale findings" → verified by reading template content (contains "Stale finding" text)
- AC11 "Learn template has zero degradation paths" → grep confirmed zero matches for "if command doesn't exist", "perform manually", "fall back", "if unavailable"
- AC12 "Learn template shows variadic ID examples (C-prefixed IDs)" → template contains `C1 C2 C3` in close, promote, strengthen examples
- AC13 "Learn template uses `ana proof stale` instead of manual cross-referencing" → Staleness Detection section replaced with `ana proof stale` command reference
- AC14 "Dogfood ana-learn.md matches template" → `diff` confirmed IDENTICAL
- AC15 "Dogfood ana-verify.md matches template" → `diff` confirmed IDENTICAL
- AC16 "All new/modified commands have tests" → 10 unit tests + 7 integration tests added
- AC17 "`(cd packages/cli && pnpm vitest run)` passes with no regressions" → 93 files, 1757 passed, 2 skipped
- AC18 "No build errors" → build and typecheck pass

## Implementation Decisions

- Placed `computeStaleness` between `detectHealthChange` and `computeChainHealth` in proofSummary.ts, following the existing pattern of computation functions being grouped together.
- Used conditional object building for `stalenessOpts` to satisfy `exactOptionalPropertyTypes: true` — cannot pass `undefined` as optional property value.
- In the stale human-readable output, slugs are shown in a comma-separated list with truncation at 3+ (showing "... (N entries)") to keep output readable for large subsequent counts.
- Preserved the Verify template's existing `If the command is not available` fallback for `ana proof context` — the spec didn't call for removing it, and an existing test (`agent-proof-context.test.ts`) validates its presence.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1737 passed | 2 skipped (1739)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1757 passed | 2 skipped (1759)
```

### Comparison
- Tests added: 20 (1757 - 1737)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: 10 tests for `computeStaleness` — basic cross-referencing, high confidence tier, medium confidence tier, afterSlug filter, minConfidence filter, no stale findings, null file skip, non-active findings skip, own entry not counted, prior entries not counted, nonexistent afterSlug, empty modules_touched
- `tests/commands/proof.test.ts`: 7 tests — stale detects subsequent touches, stale read-only no branch check, stale --after filter, stale --min-confidence, stale --json envelope, stale zero results, audit --json --full bypasses caps, audit --full without --json prints hint

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
74741bc [learn-v3-cli-commands:s3] Update Learn and Verify templates, sync dogfood copies
a869390 [learn-v3-cli-commands:s3] Add stale subcommand and audit --full flag
de88465 [learn-v3-cli-commands:s3] Add computeStaleness pure function and types
```

## Open Issues

1. The `stale` command does direct string comparison on file paths (`f.file === touched path`). If proof chain entries use inconsistent path formats (e.g., `./src/a.ts` vs `src/a.ts`), matches will be missed. The spec says "direct string comparison works" per the Gotchas section, so this is by-design but worth noting for future path normalization work.

2. The Verify template's `If the command is not available` fallback for `ana proof context` was preserved because an existing test validates it. The spec for Phase 3 only covers the Learn template's degradation path cleanup — Verify's existing fallbacks are out of scope. If Verify's fallbacks should also be cleaned up, that should be a separate scope.

Verified complete by second pass.

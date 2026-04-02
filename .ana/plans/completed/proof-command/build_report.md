# Build Report: ana proof {slug} command

**Created by:** AnaBuild
**Date:** 2026-04-01
**Spec:** .ana/plans/active/proof-command/spec.md
**Branch:** feature/proof-command

## What Was Built

- **packages/cli/src/commands/proof.ts** (created): New command implementing `ana proof {slug}`. Reads `.ana/proof_chain.json`, finds matching entry, displays terminal card with feature name, result, contract compliance, assertions with status icons, timing breakdown, and deviations. Supports `--json` flag.

- **packages/cli/src/index.ts** (modified): Added import for `proofCommand` and registration with `program.addCommand(proofCommand)`.

- **packages/cli/tests/commands/proof.test.ts** (created): 27 tests covering all contract assertions. Uses temp directories for isolation, `execSync` for CLI invocation.

## PR Summary

- Add `ana proof {slug}` command to display proof chain entries for completed work items
- Terminal card shows feature name, verification result, contract compliance summary, assertions with status icons, and timing breakdown
- Deviations section appears only when deviations exist; omitted otherwise
- Supports `--json` flag for programmatic consumption
- Error messages guide users when slug not found or proof_chain.json missing

## Acceptance Criteria Coverage

- AC1 "displays terminal card" → proof.test.ts:72 "displays feature name from entry" (1 assertion)
- AC2 "assertions with status icons" → proof.test.ts:109-126 "shows checkmark/warning icon" (3 tests)
- AC3 "contract summary shows counts" → proof.test.ts:96 "shows contract compliance counts" (3 assertions)
- AC4 "timing section shows breakdown" → proof.test.ts:131-147 "shows total/per-phase time" (2 tests)
- AC5 "deviations section lists each" → proof.test.ts:151-165 "shows deviations section" (2 tests)
- AC6 "--json outputs raw entry" → proof.test.ts:180-213 "outputs JSON with --json flag" (4 tests)
- AC7 "helpful errors" → proof.test.ts:218-252 "shows helpful error" (4 tests)
- AC8 "terminal styling matches ana scan" → proof.test.ts:256-272 "uses box-drawing characters" (2 tests)
- AC9 "tests pass" → Verified: 430 passed
- AC10 "no build errors" → Verified: build succeeds
- AC11 "lint passes" → Verified: lint clean

## Contract Assertion Coverage

All 24 contract assertions tagged:
- A001: proof.test.ts:67 — displays feature name ✓
- A002: proof.test.ts:78 — shows Result: PASS ✓
- A003: proof.test.ts:85 — shows "satisfied" in summary ✓
- A004: proof.test.ts:85 — shows "deviated" in summary ✓
- A005: proof.test.ts:106 — checkmark for satisfied ✓
- A006: proof.test.ts:113 — warning icon for deviated ✓
- A007: proof.test.ts:120 — says text displayed ✓
- A008: proof.test.ts:129 — Total timing shown ✓
- A009: proof.test.ts:138 — Build phase shown ✓
- A010: proof.test.ts:149 — Deviations section appears ✓
- A011: proof.test.ts:156 — Arrow shows deviation ✓
- A012: proof.test.ts:166 — Deviations omitted when none ✓
- A013: proof.test.ts:181 — JSON is valid ✓
- A014: proof.test.ts:193 — JSON has slug ✓
- A015: proof.test.ts:202 — JSON has assertions ✓
- A016: proof.test.ts:211 — JSON has timing ✓
- A017: proof.test.ts:222 — Error for unknown slug ✓
- A018: proof.test.ts:230 — Suggests work status ✓
- A019: proof.test.ts:241 — Error for missing file ✓
- A020: proof.test.ts:249 — Suggests work complete ✓
- A021: proof.test.ts:259 — Box-drawing chars ✓
- A022: proof.test.ts:268 — Horizontal rules ✓
- A023: proof.test.ts:276 — Handles missing timing fields ✓
- A024: proof.test.ts:222 — Non-zero exit on error ✓

Contract coverage: 24/24 assertions tagged.

## Implementation Decisions

1. **Defined ProofChainEntry locally** instead of importing from work.ts. The spec mentioned importing from `./work.js`, but the interface in work.ts references `ProofSummary` types that would create unnecessary dependencies. Defined the interface directly in proof.ts to keep it self-contained.

2. **Used synchronous fs for reads.** The command is simple read-only, and synchronous reads match the scan.ts pattern for simplicity.

3. **Status icon color mapping:** SATISFIED=green✓, UNSATISFIED=red✗, DEVIATED=yellow⚠, UNCOVERED=gray?. Matches the mockup in spec.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
pnpm --filter anatomia-cli test -- --run
Test Files  27 passed (27)
     Tests  403 passed (403)
```

### After Changes
```
pnpm --filter anatomia-cli test -- --run
Test Files  28 passed (28)
     Tests  430 passed (430)
  Duration  8.82s
```

### Comparison
- Tests added: 27
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/commands/proof.test.ts`: 27 tests covering valid slug display, contract summary, assertions with icons, timing breakdown, deviations section, JSON output, error handling, box-drawing styling, edge cases (multiple entries, empty array, FAIL result, UNSATISFIED/UNCOVERED icons, minimal timing).

## Verification Commands
```bash
pnpm --filter anatomia-cli build
pnpm --filter anatomia-cli test -- --run
pnpm --filter anatomia-cli lint
```

## Git History
```
a63baa1 [proof-command] Add ana proof command for displaying proof chain entries
```

## Open Issues

None — verified by second pass.

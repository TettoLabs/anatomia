# Build Report: V1 Code Changes

**Created by:** AnaBuild
**Date:** 2026-05-03
**Spec:** .ana/plans/active/v1-code-changes/spec.md
**Branch:** feature/v1-code-changes

## What Was Built

- `packages/cli/src/utils/proofSummary.ts` (modified): Replaced emoji-coupled regex in `parseACResults` with word-based matching anchored to bullet-list format (`^\s*-\s+.*\bSTATUS\b/gm`). Matches status words regardless of prefix symbols while excluding `**Result:** PASS` lines.
- `packages/cli/tests/utils/proofSummary.test.ts` (modified): Added 3 test cases — Format B (bold AC label before status), Format C (status at end after arrow), and Result-line exclusion (ensures `**Result:** PASS` doesn't inflate counts).
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Replaced 3 occurrences of `🔍 UNVERIFIABLE` with `-- UNVERIFIABLE`.
- `.claude/agents/ana-verify.md` (modified): Same `🔍` → `--` replacement in dogfood copy (3 occurrences).
- `packages/cli/src/commands/scan.ts` (modified): Removed `verbose` from `ScanOptions` interface, removed `--verbose` option registration, removed verbose from spinner condition, deleted the verbose block. Rewrote `--quick` description to plain language.
- `packages/cli/docs/TROUBLESHOOTING.md` (modified): Replaced all 9 `--verbose` references — removed verbose-specific diagnostic steps, updated commands to plain `ana scan`.
- `packages/cli/src/commands/init/index.ts` (modified): Replaced `❌ Init failed:` with `Error: Init failed:`.
- `packages/cli/src/commands/setup.ts` (modified): Removed `🔍` from validating setup message. Rewrote description from `'Setup-related commands'` to `'Configure project context (check, complete)'`.
- `packages/cli/src/index.ts` (modified): Changed version output from bare `pkg.version` to `anatomia-cli/${pkg.version}`.
- `packages/cli/src/commands/verify.ts` (modified): Rewrote description from `'Verification tools'` to `'Check contract seal integrity'`.
- `packages/cli/src/commands/artifact.ts` (modified): Rewrote description from `'Manage pipeline artifacts'` to `'Save and validate plan artifacts'`. Changed `chalk.dim` to `chalk.gray` on line 852.
- `packages/cli/src/commands/work.ts` (modified): Rewrote description from `'Manage pipeline work items'` to `'Track work items and complete pipelines'`.
- `packages/cli/src/commands/proof.ts` (modified): Rewrote description from `'Display proof chain entry for a completed work item'` to `'View proof chain entries, health, and findings'`.
- `packages/cli/src/commands/agents.ts` (modified): Changed `chalk.dim` to `chalk.gray` on line 65.
- `packages/cli/src/commands/pr.ts` (modified): Changed `chalk.dim` to `chalk.gray` on lines 174, 191, 206, 223.
- `packages/cli/tsup.config.ts` (modified): Removed `external: ['anatomia-analyzer']` and `dts: true`.
- `.husky/pre-commit` (modified): Rewrote comment to remove "Item 20 decision" sprint jargon.

## PR Summary

- Fix `parseACResults` to match status words instead of emoji codepoints, preventing silent parser breakage when verify agents output non-standard emoji
- Remove unimplemented `--verbose` flag from scan command and update all 9 troubleshooting doc references
- Clean decorative emoji from CLI error/status output (init, setup) and replace `🔍 UNVERIFIABLE` with neutral `--` marker in verify templates
- Rewrite all command descriptions to be stranger-friendly, standardize error hints to `chalk.gray`, and remove dead `external`/`dts` from tsup config
- Remove sprint jargon from pre-commit hook comments

## Acceptance Criteria Coverage

- AC1 "--verbose flag removed" → scan.ts: option registration, ScanOptions, spinner condition, verbose block all deleted. TROUBLESHOOTING.md: all 9 references updated. ✅ Verified (grep confirms 0 `--verbose` in both files)
- AC2 "Zero decorative emoji" → init/index.ts: `❌` → `Error:`, setup.ts: `🔍` removed. ✅ Verified (grep `❌|🔍` in src/commands/ returns only pr.ts verify protocol display, which is excluded)
- AC3 "parseACResults matches words not emoji" → proofSummary.ts: regex replaced with `^\s*-\s+.*\bSTATUS\b/gm`. ✅ Verified (3 test cases prove all formats work)
- AC4 "All existing proofSummary tests pass" → proofSummary.test.ts: 172 tests passed (169 existing + 3 new). ✅ Verified
- AC5 "New test cases for Format B and C" → proofSummary.test.ts: 3 new tests added (Format B, Format C, Result-line exclusion). ✅ Verified
- AC6 "All existing work.test.ts tests pass" → work.test.ts: 113 tests passed. ✅ Verified
- AC7 "🔍 UNVERIFIABLE replaced with --" → Both template and dogfood copy updated (3 occurrences each). ✅ Verified
- AC8 "ana --version outputs anatomia-cli/{version}" → index.ts: `.version(\`anatomia-cli/${pkg.version}\`)`. ✅ Verified
- AC9 "All --help descriptions clear to stranger" → All 6 descriptions rewritten (setup, verify, artifact, work, proof, scan --quick). ✅ Verified
- AC10 "chalk.dim → chalk.gray in hints" → agents.ts:65, pr.ts:174/191/206/223, artifact.ts:852 all changed. ✅ Verified
- AC11 "⚠ in proof.ts:64 preserved" → proof.ts:64 untouched. ✅ Verified
- AC12 "tsup.config.ts no external/dts" → Both lines removed. ✅ Verified
- AC13 "husky no sprint jargon" → Comment rewritten, "Item 20 decision" removed. ✅ Verified
- AC14 "pnpm build succeeds, no dist/index.d.ts" → Build succeeds, `npm pack --dry-run` shows no `.d.ts` files. ✅ Verified
- AC15 "Full test suite passes" → 1807 passed, 2 skipped, 93 test files. ✅ Verified

## Implementation Decisions

- Kept the scan.ts header comment updated to match the new `--quick` description text for consistency.
- For TROUBLESHOOTING.md "Still Having Issues?" section: replaced the entire "Enable Debug Mode" block (which had `ana scan --verbose` and `ana scan --verbose 2>&1 | grep "phase:"`) with a simpler "Review Scan Output" section, since both commands are meaningless after flag removal.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run --run
Test Files  93 passed (93)
      Tests  1804 passed | 2 skipped (1806)
   Duration  30.76s
```

### After Changes
```
cd packages/cli && pnpm vitest run --run
Test Files  93 passed (93)
      Tests  1807 passed | 2 skipped (1809)
   Duration  30.86s
```

### Comparison
- Tests added: 3
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/utils/proofSummary.test.ts`: Format B (bold AC label before status), Format C (status at end after arrow), Result-line exclusion (verifies `**Result:** PASS` doesn't inflate count)

## Verification Commands
```bash
cd packages/cli && pnpm run build
cd packages/cli && pnpm vitest run --run
pnpm run lint
```

## Git History
```
e1f0dfc [v1-code-changes] Clean up CLI output: emoji, descriptions, chalk.dim, tsup, husky
5c3a344 [v1-code-changes] Remove --verbose flag from scan, update troubleshooting docs
6f64379 [v1-code-changes] Replace 🔍 UNVERIFIABLE with -- UNVERIFIABLE in verify templates
50e0577 [v1-code-changes] Fix parseACResults to match status words not emoji codepoints
```

## Open Issues

- The `npm pack --dry-run` still includes `ARCHITECTURE.md` and `CONTRIBUTING.md` in the tarball because the `files` field in `package.json` currently doesn't restrict to `["dist"]` — that's scoped for v1-release-prep, not this spec.
- Pre-existing lint warnings (14 `@typescript-eslint/no-explicit-any`) in test files — not introduced by this build.

Verified complete by second pass.

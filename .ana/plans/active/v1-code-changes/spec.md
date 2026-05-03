# Spec: V1 Code Changes

**Created by:** AnaPlan
**Date:** 2026-05-03
**Scope:** .ana/plans/active/v1-code-changes/scope.md

## Approach

11 surgical changes, ordered by risk. The parser fix (Item 19) goes first and must pass all existing tests before the template change (Item 19b). All other items are independent and low-risk.

The parser fix decouples `parseACResults` from emoji codepoints. The current regex (`✅\s*PASS`) matches the emoji literally. The replacement anchors to bullet-list line format (`^\s*-\s+`) and matches the uppercase status WORD. This excludes `**Result:** PASS` (which doesn't start with a bullet) while matching all three real-world AC formats.

Design decision: use `^\s*-\s+.*\bSTATUS\b` (multiline, global). This mirrors the philosophy of `parseAssertionResults` at line 171 (match the word, ignore prefix symbols) but adapted for full-content context where we need line-shape discrimination to avoid false matches.

## Output Mockups

### `ana --version`
```
anatomia-cli/1.0.0
```

### `ana --help` (relevant descriptions)
```
Commands:
  init        Initialize project context framework
  scan        Scan project and display tech stack, file counts, and structure
  setup       Configure project context (check, complete)
  artifact    Save and validate plan artifacts
  work        Track work items and complete pipelines
  proof       View proof chain entries, health, and findings
  verify      Check contract seal integrity
  pr          Create pull request from pipeline artifacts
  agents      List deployed agents
```

### `ana scan --help` (--verbose gone, --quick rewritten)
```
Options:
  --json       Output JSON format for programmatic consumption
  --save       Save scan results to .ana/scan.json
  -q, --quiet  Suppress informational stdout
  --quick      Fast scan — skip deep code analysis
  -h, --help   Display help for command
```

## File Changes

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Replace emoji-coupled regex in `parseACResults` (lines 201-204) with word-based matching anchored to bullet-list format.
**Pattern to follow:** `parseAssertionResults` at line 171 in the same file — matches the status word regardless of prefix symbol.
**Why:** Parser silently breaks if verify agent outputs status without exact emoji codepoint. This is a bug — same file has the correct pattern 30 lines above.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Add test cases for Format B and Format C AC walkthrough patterns. Existing fixtures stay unchanged.
**Pattern to follow:** Existing `parseACResults`/`computeProofSummary` tests in the same file.
**Why:** Existing tests only cover Format A. New tests prove the regex handles all real-world formats.

### `packages/cli/src/commands/scan.ts` (modify)
**What changes:** Remove `verbose` from `ScanOptions` interface, remove `--verbose` option registration, remove `options.verbose` from spinner condition, delete the verbose block (lines 401-411).
**Pattern to follow:** The remaining options (`--json`, `--save`, `--quiet`, `--quick`) for structure.
**Why:** Flag prints "not yet implemented" — a stranger sees an unfinished product.

### `packages/cli/docs/TROUBLESHOOTING.md` (modify)
**What changes:** Replace all 9 `ana scan --verbose` references with `ana scan` (or remove verbose-specific guidance where the instruction no longer applies).
**Pattern to follow:** Other troubleshooting steps that use `ana scan` without flags.
**Why:** Broken troubleshooting instructions after flag removal.

### `packages/cli/src/commands/init/index.ts` (modify)
**What changes:** Line 162: replace `❌ Init failed:` with `Error: Init failed:`.
**Pattern to follow:** Every other error in the codebase uses `chalk.red('Error: ...')` with no emoji.
**Why:** Inconsistent error formatting.

### `packages/cli/src/commands/setup.ts` (modify)
**What changes:** Line 74: remove `🔍` from `'🔍 Validating setup...'`. Line 28: rewrite description from `'Setup-related commands'` to a stranger-friendly string.
**Pattern to follow:** Other status messages in the codebase (no emoji prefix).
**Why:** Decorative emoji + circular description.

### `packages/cli/src/index.ts` (modify)
**What changes:** Line 33: change `.version(pkg.version, ...)` to `.version(\`anatomia-cli/${pkg.version}\`, ...)`.
**Pattern to follow:** Professional CLIs identify themselves (`gh version 2.40.1`).
**Why:** Bare version number gives no confirmation the user ran the right binary.

### `packages/cli/src/commands/verify.ts` (modify)
**What changes:** Rewrite `.description('Verification tools')` to a stranger-friendly string.
**Pattern to follow:** Other command descriptions after this change.
**Why:** "Verification tools" is vague.

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:** Rewrite `.description('Manage pipeline artifacts')`. Change `chalk.dim` to `chalk.gray` at line 852.
**Pattern to follow:** Other hint messages using `chalk.gray`.
**Why:** Jargon description + inconsistent hint styling.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Rewrite `.description('Manage pipeline work items')`.
**Pattern to follow:** Other command descriptions after this change.
**Why:** Jargon.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Rewrite `.description('Display proof chain entry for a completed work item')` to reflect that proof has 7 subcommands. Do NOT touch line 64 (`⚠` DEVIATED icon). Do NOT touch any `chalk.dim` in this file.
**Pattern to follow:** Parent commands with subcommands should describe the group.
**Why:** Description doesn't reflect the command's actual breadth.

### `packages/cli/src/commands/scan.ts` (modify — second change)
**What changes:** Rewrite `--quick` description from `'Force surface-tier analysis (skip tree-sitter)'` to `'Fast scan — skip deep code analysis'`.
**Pattern to follow:** Other option descriptions (plain language, no internal jargon).
**Why:** "surface-tier" and "tree-sitter" are internal jargon.

### `packages/cli/src/commands/agents.ts` (modify)
**What changes:** Line 65: change `chalk.dim` to `chalk.gray`.
**Pattern to follow:** Other hint messages (pr.ts uses the same pattern).
**Why:** Inconsistent hint styling. Line 74 `chalk.dim('  (none)')` stays — it's display, not a hint.

### `packages/cli/src/commands/pr.ts` (modify)
**What changes:** Lines 174, 191, 206, 223: change `chalk.dim` to `chalk.gray`.
**Pattern to follow:** Standardizing all error hints to `chalk.gray`.
**Why:** Inconsistent hint styling.

### `packages/cli/tsup.config.ts` (modify)
**What changes:** Remove `external: ['anatomia-analyzer']` line and `dts: true` line.
**Pattern to follow:** Resulting config is minimal: entry, format, target, shims, clean.
**Why:** Dead reference to deleted dependency + useless .d.ts output for a CLI binary.

### `.husky/pre-commit` (modify)
**What changes:** Rewrite comment block (lines 3-6) to remove "Item 20 decision" sprint jargon.
**Pattern to follow:** The replacement text from the requirements doc.
**Why:** Sprint jargon in a file contributors read.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Replace `🔍 UNVERIFIABLE` with `-- UNVERIFIABLE` in all 3 occurrences.
**Pattern to follow:** The other status markers use symbols (✅, ❌, ⚠️) but 🔍 doesn't map to a terminal color. `--` is neutral.
**Why:** After parser fix, the symbol is pure display. `--` is a better neutral marker than a magnifying glass.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Same `🔍` → `--` replacement as the template (dogfood copy).
**Pattern to follow:** Must stay in sync with template.
**Why:** Dogfood copy must match template.

## Acceptance Criteria

- [ ] AC1: `--verbose` flag removed from scan — does not appear in `ana scan --help`, all 9 references in `docs/TROUBLESHOOTING.md` updated or removed
- [ ] AC2: Zero decorative emoji in CLI error/status output — `❌` removed from init/index.ts, `🔍` removed from setup.ts (grep `src/commands/` for `❌|🔍` — zero matches, excluding pr.ts verify protocol display)
- [ ] AC3: `parseACResults` matches on status WORDS not emoji codepoints — regex anchors to bullet-list prefix (`^\s*-\s+`), does NOT false-match on `**Result:** PASS`, handles all three formats
- [ ] AC4: All existing proofSummary.test.ts tests pass WITHOUT modifying existing test fixtures
- [ ] AC5: New test cases added for Format B and Format C AC walkthrough patterns
- [ ] AC6: All existing work.test.ts tests pass
- [ ] AC7: `🔍 UNVERIFIABLE` replaced with `-- UNVERIFIABLE` in verify template and dogfood copy — done AFTER parser fix passes tests
- [ ] AC8: `ana --version` outputs `anatomia-cli/{version}` not bare version number
- [ ] AC9: All `--help` descriptions are clear to a stranger — no jargon, all capitalized
- [ ] AC10: `chalk.dim` in error/warning hints changed to `chalk.gray` — ONLY in agents.ts:65, pr.ts:174/191/206/223, artifact.ts:852
- [ ] AC11: `⚠` in proof.ts:64 DEVIATED status icon preserved
- [ ] AC12: `tsup.config.ts` has no `external` key and no `dts` key
- [ ] AC13: `.husky/pre-commit` comment references no sprint jargon
- [ ] AC14: `pnpm build` succeeds, `npm pack --dry-run` produces expected file list (minus `dist/index.d.ts`)
- [ ] AC15: Full test suite passes: `cd packages/cli && pnpm vitest run`

## Testing Strategy

- **Unit tests:** Add 2-3 test cases to proofSummary.test.ts exercising `parseACResults` (via `computeProofSummary`) with Format B and Format C fixture text. Follow the existing test structure — create a verify_report.md in a temp dir, call `generateProofSummary`, assert on `acResults.total` and `acResults.met`.
- **Integration tests:** Existing work.test.ts exercises the full chain (writeProofChain → computeProofSummary → parseACResults). Must pass unchanged.
- **Edge cases:** Verify that a fixture containing `**Result:** PASS` on its own line does NOT inflate the `passCount`. Include this in the new Format B/C test (real reports contain both the Result line and AC lines).

## Dependencies

None. All changes are to existing files in the current package.

## Constraints

- Ordering constraint: Item 19 (parser fix) MUST pass tests before Item 19b (template `🔍` → `--` change). Build the parser fix, run `pnpm vitest run tests/utils/proofSummary.test.ts` and `pnpm vitest run tests/commands/work.test.ts`, then proceed to the template change.
- Do NOT modify existing test fixture content for the parser fix. The new regex must match existing emoji-containing fixtures as-is.
- Do NOT touch `chalk.dim` in proof.ts or scan.ts `formatHumanReadable`.
- Do NOT touch `⚠` at proof.ts:64.

## Gotchas

- The `--quick` option description rewrite happens in scan.ts — the SAME file where `--verbose` is being removed. Don't accidentally delete `--quick` while removing verbose.
- `agents.ts:74` uses `chalk.dim('  (none)')` — this is a display placeholder, NOT a hint. Leave it as `chalk.dim`.
- The TROUBLESHOOTING.md has `ana scan --verbose 2>&1 | grep "phase:"` — this entire instruction is meaningless after removal. Remove the diagnostic step, don't just delete the flag from the command.
- `proof.ts` line 450 description is for the TOP-LEVEL `proof` command which has subcommands (context, close, promote, strengthen, findings, health, staleness). The description should reflect the group, not just the default action.
- After removing `dts: true`, the build output no longer includes `dist/index.d.ts`. This is expected — verify with `npm pack --dry-run`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Explicit return types on all exported functions.
- Error handling: commands use `chalk.red` + `process.exit(1)`. Engine functions catch internally.
- Engine files have zero CLI dependencies — no chalk, no commander, no ora.
- Vitest: always use `--run` flag to avoid watch mode hang.

### Pattern Extracts

**parseAssertionResults (the model for the fix) — proofSummary.ts:170-172:**
```typescript
      const statusMatch = statusCell.match(/(SATISFIED|UNSATISFIED|DEVIATED|UNCOVERED)/i);
      const status = statusMatch && statusMatch[1] ? statusMatch[1].toUpperCase() : 'UNKNOWN';
```

**Current parseACResults (what to replace) — proofSummary.ts:199-209:**
```typescript
function parseACResults(content: string): { total: number; met: number } {
  // Count all AC markers
  const passCount = (content.match(/✅\s*PASS/g) || []).length;
  const failCount = (content.match(/❌\s*FAIL/g) || []).length;
  const partialCount = (content.match(/⚠️?\s*PARTIAL/g) || []).length;
  const unverifiableCount = (content.match(/🔍\s*UNVERIFIABLE/g) || []).length;

  const total = passCount + failCount + partialCount + unverifiableCount;
  const met = passCount;

  return { total: total || 0, met };
}
```

**Replacement regex design:**
```typescript
const passCount = (content.match(/^\s*-\s+.*\bPASS\b/gm) || []).length;
const failCount = (content.match(/^\s*-\s+.*\bFAIL\b/gm) || []).length;
const partialCount = (content.match(/^\s*-\s+.*\bPARTIAL\b/gm) || []).length;
const unverifiableCount = (content.match(/^\s*-\s+.*\bUNVERIFIABLE\b/gm) || []).length;
```

This anchors to bullet-list lines (`^\s*-\s+`), matches the uppercase status word anywhere on the line, uses multiline mode (`m` flag). Excludes `**Result:** PASS` because that line starts with `**`, not `- `.

**Existing test fixture (Format A only) — proofSummary.test.ts:108-109:**
```typescript
- ✅ PASS: AC1 Payment works
- ✅ PASS: AC2 Webhook fires
```

**work.test.ts fixture (Format A, no colon) — line 1102-1104:**
```typescript
- ✅ PASS Item creation works
- ✅ PASS Status returned correctly
- ✅ PASS Validation applied
```

**Format B (for new test):**
```
- **AC1:** ✅ PASS — Test at proofSummary.ts:397
```

**Format C (for new test):**
```
- **AC1:** Template has frontmatter ... → ✅ PASS
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After parser fix (proofSummary.ts change): `cd packages/cli && pnpm vitest run --run tests/utils/proofSummary.test.ts` — Expected: all existing tests pass
- After parser fix: `cd packages/cli && pnpm vitest run --run tests/commands/work.test.ts` — Expected: all work tests pass
- After all changes: `cd packages/cli && pnpm vitest run --run` — Expected: 1804+ tests pass (baseline 1804), 93+ test files
- Build: `cd packages/cli && pnpm run build` — Expected: success, no `dist/index.d.ts` in output
- Lint: `cd packages/cli && pnpm lint`

### Build Baseline
- Current tests: 1804 passed, 2 skipped (93 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected 1804 + ~3-4 new tests (Format B, Format C, Result-line exclusion)
- Regression focus: proofSummary.test.ts, work.test.ts, proof.test.ts (⚠ icon assertion)

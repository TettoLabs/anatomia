# Spec: Strengthen Weak Test Assertions

**Created by:** AnaPlan
**Date:** 2026-05-02
**Scope:** .ana/plans/active/strengthen-weak-test-assertions/scope.md

## Approach

11 discrete test fixes across 3 files. No production code changes. Each fix replaces a weak, coincidental, or vacuous assertion with one that would fail if the tested behavior regressed.

The structural analog is the single-promote test at `packages/cli/tests/commands/proof.test.ts:2706-2708` — it asserts both `status` and `promoted_to` with exact values. Several fixes copy this pattern directly. The commit-counting pattern at proof.test.ts:3357 (`git log --oneline | wc -l`) provides the second reusable pattern.

**Open question from scope: AC3 options.** Answer: behavioral test. The health display outputs "insufficient data (need 10+ runs)" when classified entries < 10. Two boundary tests (9 vs 10 entries) verify the threshold without reading source. This replaces the source-content assertion that violates testing-standards ("Never assert on source code content").

**Open question from scope: Cap test values.** Answer: confirmed `MAX_ACTIVE = 30` at `src/utils/proofSummary.ts:490`. Test fixture creates 35 findings, expects 30 shown. The cap preserves insertion order — `allActive.slice(0, 30)`.

## Output Mockups

No user-facing output changes. All fixes are test-only — the test runner output should show the same test names passing with stronger assertions.

## File Changes

### `packages/cli/tests/commands/proof.test.ts` (modify)
**What changes:** 4 fixes — AC1 (dry-run commit count), AC2 (variadic promoted_to), AC3 (behavioral boundary test replacing source-content), AC4 (JSON promotions check)
**Pattern to follow:** Single-promote test at line 2706-2708 for assertion style. Commit-counting at line 3357 for git-based assertions.
**Why:** These 4 tests currently pass without proving what they claim — dry-run could create commits, variadic could skip promoted_to, source check proves string exists not behavior, Promotions check is vacuous because terminal never shows it.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** 4 fixes — AC6 (timestamp specificity), AC7 (multi-phase FAIL error message), AC8 (conditional guard removal), AC10 (UNVERIFIED fallback coverage)
**Pattern to follow:** A029 FAIL test at line 802-819 for process.exit mock + console.error capture pattern. Existing `createMergedProject` helper for UNVERIFIED test setup.
**Why:** timestamp passes with any defined value, multi-phase FAIL proves nothing about the error, conditional guard runs zero assertions, UNVERIFIED path has zero coverage.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** 2 fixes — AC5 (three `toBe(1)` replacements), AC9 (cap specificity)
**Pattern to follow:** Existing assertion style in the same describe blocks.
**Why:** `toBeGreaterThan(0)` passes for any positive number when fixtures create exactly 1. Cap test proves count but not which items survived.

## Acceptance Criteria

- [ ] AC1: Dry-run test asserts no git commit was created — commit count before and after dry-run are equal
- [ ] AC2: Variadic strengthen test asserts `promoted_to` contains the skill file path on each finding, not just `status === 'promoted'`
- [ ] AC3: A029 source-content test replaced with behavioral boundary test — 9 entries shows "insufficient data", 10 entries shows actual trend
- [ ] AC4: `not.toContain('Promotions')` test replaced with `--json` output check that verifies no promotions data when none exist
- [ ] AC5: Three `toBeGreaterThan(0)` assertions in proofSummary.test.ts replaced with `toBe(1)`
- [ ] AC6: Timestamp `toBeDefined()` replaced with ISO format assertion and recency check
- [ ] AC7: Multi-phase FAIL test asserts error message content ('FAIL' and remediation guidance), not just that it throws
- [ ] AC8: Conditional `if (output.includes('Health:'))` guard removed — fixture redesigned to deterministically produce health output, then assert directly
- [ ] AC9: Dashboard cap test verifies which items were kept and which were dropped, not just the count
- [ ] AC10: UNVERIFIED fallback path has test coverage — test creates assertions with no verifyStatus, completes work, asserts proof chain entry has status 'UNVERIFIED'
- [ ] AC11: All existing tests continue to pass — 1796 tests across 93 files

## Testing Strategy

- **Unit tests:** This IS the test fix — no separate test layer. Run each file after its changes.
- **Regression:** Full suite run after all changes. Baseline: 93 files, 1796 passed, 2 skipped.
- **Edge cases:** AC8 fixture math (stable → improving transition), AC10 fixture with missing compliance table.

## Dependencies

None. All test infrastructure (helpers, fixtures, patterns) already exists.

## Constraints

- No production code changes. Test-only.
- Test count must not decrease. Expected: +3 net new tests (AC3 replaces 1 test with 2 boundary tests, AC10 adds 1 new test).
- All tests must pass on CI (3 OS × 2 Node versions).

## Gotchas

- **AC3 boundary math:** `computeHealthReport` only counts entries with classified findings (those with a `severity` field) in `riskCounts`. Entries without any severity-bearing findings are skipped entirely. The boundary tests need entries with `severity: 'risk'` (or any classified severity) to count toward the MIN_ENTRIES_FOR_TREND threshold.
- **AC8 fixture math:** The current fixture creates entries with improving trend (3→1 risks), so previous=improving, current=improving → no health change → health line never appears → zero assertions run. The fix needs previous=stable, current=improving. Use 10 entries with 1 risk each (stable), then completeWork adds 0 risk → tips to improving. The `detectHealthChange` comparison at proofSummary.ts:1020 requires both previous and current trends to be in `['worsening', 'stable', 'improving']` — 'insufficient_data' is excluded.
- **AC10 contract.yaml:** The existing `createMergedProject` helper does NOT create contract.yaml. To test the UNVERIFIED path, add a contract.yaml with assertions to the slug directory. When `generateProofSummary` parses, it initializes assertions from contract with `verifyStatus: null`. The verify report has `**Result:** PASS` but no compliance table, so `verifyStatus` stays null → becomes 'UNVERIFIED' at work.ts:802.
- **AC4 JSON structure:** Check what the JSON output actually contains for promotions. The `computeHealthReport` return includes `promotions` array and `promotion_candidates` array. With no promoted findings, `promotions` should be empty.
- **`console.log` capture pattern:** work.test.ts uses manual `console.log` override (save original → capture → restore). Always restore in the same test scope to avoid cross-test pollution.

## Build Brief

### Rules That Apply
- Always use `--run` with pnpm vitest to avoid watch mode hang
- Test behavior, not implementation — assert on what the code returns/produces
- Never assert on source code content (AC3 violation being fixed)
- Assert on specific expected values: `toBe(1)` not `toBeGreaterThan(0)` when fixture count is known
- Use `unknown` and narrow with type guards for parsed JSON in tests (existing pattern uses `{ id: string }` inline types)

### Pattern Extracts

**Single-promote assertion pattern (proof.test.ts:2705-2708):**
```typescript
      const chain = JSON.parse(await fs.readFile(path.join(tempDir, '.ana', 'proof_chain.json'), 'utf-8'));
      const finding = chain.entries[0].findings.find((f: { id: string }) => f.id === 'F001');
      expect(finding.status).toBe('promoted');
      expect(finding.promoted_to).toBe('.claude/skills/coding-standards/SKILL.md');
```

**Commit-counting pattern (proof.test.ts:3357-3358):**
```typescript
      const commitCount = execSync('git log --oneline | wc -l', { cwd: tempDir, encoding: 'utf-8' }).trim();
      expect(parseInt(commitCount)).toBe(2);
```

**Process.exit mock + console.error capture (work.test.ts:806-819):**
```typescript
        const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
          throw new Error('process.exit');
        }) as never);
        const originalError = console.error;
        const errors: string[] = [];
        console.error = (...args: unknown[]) => { errors.push(args.join(' ')); };

        await expect(completeWork('test-slug')).rejects.toThrow('process.exit');

        console.error = originalError;
        const errorOutput = errors.join('\n');
        expect(errorOutput).toContain('claude --agent ana-build');
        expect(errorOutput).toContain('FAIL');
        mockExit.mockRestore();
```

**makeHealthEntry fixture helper (proof.test.ts:1847-1907):**
```typescript
    function makeHealthEntry(opts: {
      slug: string;
      risks?: number;
      debts?: number;
      observations?: number;
      file?: string;
      action?: string;
    }): Record<string, unknown> {
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After AC1+AC2 changes: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts --run)` — Expected: 193 tests pass
- After AC5+AC9 changes: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts --run)` — Expected: tests pass (count may increase by 0-1)
- After AC6+AC7+AC8+AC10 changes: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: tests pass (count increases by 1 for UNVERIFIED)
- After AC3+AC4 changes: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts --run)` — Expected: tests pass (count increases by 1 for boundary split)
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: ~1799 tests in 93 files
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1796 passed, 2 skipped
- Current test files: 93
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1799 tests in 93 files
- Regression focus: proof.test.ts (193 tests — largest file, 4 fixes), work.test.ts (4 fixes including new UNVERIFIED test)

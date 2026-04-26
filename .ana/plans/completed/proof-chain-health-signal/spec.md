# Spec: Proof chain health signal

**Created by:** AnaPlan
**Date:** 2026-04-25
**Scope:** .ana/plans/active/proof-chain-health-signal/scope.md

## Approach

Replace the static `Proof saved to chain.` confirmation (line 1101 of work.ts) with a dynamic chain balance: `Chain: {N} run(s) · {M} callout(s)`. The data already exists inside `writeProofChain()` — after `chain.entries.push(entry)`, the full chain is in memory. Change `writeProofChain` from `Promise<void>` to `Promise<{ runs: number; callouts: number }>`, compute the counts there, and return them. The single call site (line 1056) destructures the result and uses it in the summary print block.

This keeps the data boundary clean: the function that owns the chain data produces the summary. No re-reading the file, no side channels, no new parameters.

The existing test fixture for `existingChain: true` creates a prior entry with no `callouts` array — the sum logic must handle `entry.callouts || []` defensively, matching the pattern already used at line 845 of work.ts.

## Output Mockups

First-ever pipeline run (1 entry, 3 callouts):
```
✓ PASS — User Authentication
  5/5 covered · 5/5 satisfied · 0 deviations
  Chain: 1 run · 3 callouts
```

Subsequent run (4 entries, 12 cumulative callouts):
```
✓ PASS — Payment Integration
  8/8 covered · 7/8 satisfied · 1 deviation
  Chain: 4 runs · 12 callouts
```

Zero callouts across all entries:
```
✓ PASS — Config Refactor
  3/3 covered · 3/3 satisfied · 0 deviations
  Chain: 2 runs · 0 callouts
```

The third line is styled with `chalk.gray()`. The first two lines remain unstyled.

## File Changes

### packages/cli/src/commands/work.ts (modify)
**What changes:** Two locations. (1) `writeProofChain` return type changes from `Promise<void>` to `Promise<{ runs: number; callouts: number }>`. After the existing `chain.entries.push(entry)` and `writeFile`, compute `runs` from `chain.entries.length` and `callouts` by summing `(entry.callouts || []).length` across all entries. Return the object. (2) The summary block at lines 1097-1101: capture the return value from `writeProofChain`, replace the `Proof saved to chain.` line with `Chain: {N} run(s) · {M} callout(s)` using `chalk.gray()` and inline pluralization ternaries.
**Pattern to follow:** The pluralization ternary on line 1100 (`deviation${proof.deviations.length !== 1 ? 's' : ''}`). The `·` separator convention on the same line. The `chalk.gray()` usage throughout work.ts.
**Why:** Without this change, the developer gets a static write confirmation that tells them nothing about institutional memory accumulating.

### packages/cli/tests/commands/work.test.ts (modify)
**What changes:** The `prints proof summary line` test (line 1075) asserts `Proof saved to chain` — update this assertion to match the new format. The test uses `createProofProject` without `existingChain`, so the chain has 1 entry with 0 callouts (the fixture's verify report has no callouts section). Assert `Chain: 1 run · 0 callouts` instead. Add a second test case using `existingChain: true` to verify cumulative counts show 2 runs.
**Pattern to follow:** The existing `prints proof summary line` test structure — same `console.log` capture pattern, same `expect(output).toContain()` style.
**Why:** Existing test would fail on the removed text. New test validates the cumulative counting path.

## Acceptance Criteria

- [ ] AC1: After `ana work complete`, the third line of the summary shows `Chain: {N} run(s) · {M} callout(s)` with correct counts from the full proof chain
- [ ] AC2: The line `Proof saved to chain.` no longer appears in completion output
- [ ] AC3: On the first-ever pipeline run (chain has 1 entry), the line prints with singular "run" and correct callout count
- [ ] AC4: When an entry has zero callouts, the total callout count reflects only other entries' callouts (no inflation, no error)
- [ ] AC5: Appending to an existing chain shows cumulative totals (not just the current entry's counts)
- [ ] AC6: The existing `prints proof summary line` test passes with updated assertions
- [ ] AC7: All existing tests pass — no regressions
- [ ] AC8: `writeProofChain` returns `{ runs, callouts }` — clean function boundary

## Testing Strategy

- **Unit tests:** Update the existing `prints proof summary line` test to assert the new chain balance format instead of `Proof saved to chain`. Add a test using `existingChain: true` that verifies cumulative counts (2 runs, 0 callouts — since neither fixture entry has callouts).
- **Edge cases:** The existing fixture's prior entry has no `callouts` array — this naturally exercises the defensive `|| []` path. Zero callouts across all entries is covered by the default fixture (no callouts in verify report). Singular "run" is covered by the single-entry test.

## Dependencies

None. All data is already in memory after `writeProofChain` runs.

## Constraints

- The chain line must use `chalk.gray()` — secondary information, not primary.
- Pluralization must handle both dimensions: "1 run" vs "N runs", "1 callout" vs "N callouts".
- The `·` separator matches the established vocabulary on the line above.
- `writeProofChain` JSDoc must be updated for the new return type (`@returns` tag).

## Gotchas

- The `existingChain` fixture's prior entry has NO `callouts` array (lines 868-874 of work.test.ts). The sum logic must use `entry.callouts || []` — a bare `.length` on `entry.callouts` will throw.
- `writeProofChain` currently has `@returns` in its JSDoc (implicit void). The JSDoc must be updated to document the new return shape or the lint pre-commit hook will flag it.
- The test fixture's new entry also produces 0 callouts (the verify_report.md in the fixture has no `## Callouts` section). So the single-entry test case yields `Chain: 1 run · 0 callouts`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Explicit return types on all exported functions. `writeProofChain` is not exported but has an explicit return type annotation — update it.
- Exported functions require `@param` and `@returns` JSDoc tags. `writeProofChain` is internal but already has JSDoc — keep it consistent.
- Use `--run` flag with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

Pluralization ternary and `·` separator (work.ts line 1100):
```typescript
  console.log(`  ${proof.contract.covered}/${proof.contract.total} covered · ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
```

Defensive callout access (work.ts line 845):
```typescript
    const callouts = historyEntry.callouts || [];
```

Summary block to modify (work.ts lines 1097-1101):
```typescript
  // 13. Print summary (3-line proof summary)
  const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
  console.log(`  ${proof.contract.covered}/${proof.contract.total} covered · ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
  console.log('  Proof saved to chain.');
```

Existing test assertion to update (work.test.ts lines 1090-1093):
```typescript
        expect(output).toContain('✓ PASS');
        expect(output).toContain('Test Feature');
        expect(output).toContain('2/2 covered');
        expect(output).toContain('Proof saved to chain');
```

Console capture pattern (work.test.ts lines 1079-1088):
```typescript
        const originalLog = console.log;
        const logs: string[] = [];
        console.log = (...args: unknown[]) => {
          logs.push(args.join(' '));
        };

        await completeWork('test-feature');

        console.log = originalLog;
        const output = logs.join('\n');
```

### Checkpoint Commands

- After modifying `writeProofChain` return type: `cd packages/cli && pnpm vitest run --run tests/commands/work.test.ts` — Expected: tests fail on `Proof saved to chain` assertion (confirms old text removed)
- After updating test assertions: `cd packages/cli && pnpm vitest run` — Expected: all 1475 tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1475 passed, 2 skipped (1477 total)
- Current test files: 97
- Command used: `cd packages/cli && pnpm vitest run`
- After build: 1476 passed in 97 test files (1 new test added for cumulative counts)
- Regression focus: `packages/cli/tests/commands/work.test.ts` — the proof chain test suite

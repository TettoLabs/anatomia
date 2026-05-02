# Spec: Guard Proof Chain Entry

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/proof-health-v2/scope.md

## Approach

Add a FAIL guard in `completeWork` that blocks proof chain entry creation when the verify result is FAIL. Insert after `generateProofSummary` is called (which reads the verify report and determines the result) and before the proof chain entry is constructed. The guard pattern mirrors the existing UNKNOWN warning at work.ts:776-781, but exits instead of warning.

The UNKNOWN warning stays as-is — it warns but doesn't block. FAIL blocks unconditionally with no `--force` escape hatch.

## Output Mockups

### FAIL result blocks completion
```
$ ana work complete fix-auth-timeout
Error: Cannot complete work with a FAIL verification result.
The verify report says FAIL. Fix the issues and re-verify before completing.
Run: claude --agent ana-build to fix, then claude --agent ana-verify
```

### UNKNOWN result still warns (existing behavior, unchanged)
```
$ ana work complete fix-auth-timeout
Warning: Entry 'fix-auth-timeout' has result UNKNOWN but a verify report exists. Check verify_report.md for a Result line.
```

### PASS result completes normally (existing behavior, unchanged)

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Add FAIL check after `generateProofSummary` call (around line 783), before proof chain entry construction. When `proof.result === 'FAIL'`: print error with chalk.red, print guidance with chalk.gray, exit with code 1.
**Pattern to follow:** The UNKNOWN warning block at work.ts:776-781 — same structure, different result value, different severity (exit vs warn).
**Why:** A FAIL verification means the build doesn't meet the contract. Writing it to the proof chain would record a known-bad result as completed work.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Add tests for FAIL guard — verify that `completeWork` exits/throws when verify result is FAIL, and that UNKNOWN still completes (existing behavior confirmed).
**Pattern to follow:** Existing work complete tests in the file — `createMergedProject` helper with `verifyResults` parameter. There's already a test at line 783: "errors when verify report shows FAIL" — check if it covers the guard or needs updating.
**Why:** Guard is the only behavioral change. Must verify it blocks FAIL and permits UNKNOWN and PASS.

## Acceptance Criteria

- [ ] AC19: `ana work complete` blocks with error when verify result is FAIL
- [ ] AC20: `ana work complete` still allows UNKNOWN result (existing warning behavior)
- [ ] AC21: Error message tells the developer what to do next (fix + re-verify)
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests:**
  - FAIL result → process exits with error, proof chain entry NOT written
  - UNKNOWN result → warning printed, proof chain entry IS written (existing)
  - PASS result → no error, proof chain entry IS written (existing)
  - Error message contains guidance text ("claude --agent ana-build")
- **Edge cases:**
  - Multi-phase with mixed results (Phase 1 PASS, Phase 2 FAIL → overall FAIL → blocks). This is handled by `generateProofSummary` aggregation — the guard just reads `proof.result`.

## Dependencies

Phases 1 and 2 must be complete.

## Constraints

- No `--force` flag. FAIL blocks unconditionally in v1.
- The guard must go AFTER `generateProofSummary` (which computes `proof.result`) and BEFORE the proof chain entry construction (line 783).
- `proof.result` is the OVERALL result aggregated by `generateProofSummary`. Multi-phase entries where any phase FAILs produce an overall FAIL. The guard uses the aggregated result.

## Gotchas

- There may already be a test at work.test.ts line 783 that tests "errors when verify report shows FAIL". Read it — if it tests the existing behavior (which currently does NOT block FAIL), the test expectation may need to change. If it already expects blocking, it might be a pre-existing test that was written for a planned feature.
- The insertion point is between the UNKNOWN warning (line 776-781) and the entry construction (line 783). The FAIL check must read `proof.result`, which is set by `generateProofSummary` earlier in the function.
- Don't modify the UNKNOWN warning behavior — it stays as a warning that doesn't block.

## Build Brief

### Rules That Apply
- `chalk.red` for error messages, `chalk.gray` for guidance/hints
- `process.exit(1)` for blocking errors in commands
- Early returns over nested conditionals
- Always use `--run` with vitest

### Pattern Extracts

UNKNOWN warning pattern to mirror (work.ts:774-781):
```typescript
  // UNKNOWN result warning (AC12)
  const completedPlanDir = path.join(anaDir, 'plans', 'completed', slug);
  if (proof.result === 'UNKNOWN') {
    const verifyReportPath = path.join(completedPlanDir, 'verify_report.md');
    if (fs.existsSync(verifyReportPath)) {
      console.error(`Warning: Entry '${slug}' has result UNKNOWN but a verify report exists. Check verify_report.md for a Result line.`);
    }
  }
```

Proof chain entry construction start (work.ts:783-789):
```typescript
  const entry: ProofChainEntry = {
    slug,
    feature: proof.feature,
    result: proof.result,
    author: proof.author,
    contract: proof.contract,
    assertions: proof.assertions.map(a => {
```

### Proof Context

No active proof findings for work.ts from recent cycles.

### Checkpoint Commands

- After guard implementation: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run)` — Expected: all work tests pass including new FAIL guard tests
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1762 passed, 2 skipped (93 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1765+ tests (2-3 new guard tests)
- Regression focus: `tests/commands/work.test.ts` — existing FAIL test behavior may change

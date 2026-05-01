# Scope: Fix Type Lies

**Created by:** Ana
**Date:** 2026-05-01

## Intent
The code says one thing but reality is different. Tests hardcode 4-5 agents when 6 exist — every new agent requires finding and updating 7 locations. A template gives the wrong filename for multi-phase builds, causing save failures. A type says `skill: string` but Commander makes it optional at runtime. A comment references a function that was deleted. A test asserts inside an `if` guard so it passes without checking. Six fixes. Each corrects a lie.

## Complexity Assessment
- **Size:** small
- **Files affected:**
  - `packages/cli/tests/templates/agent-proof-context.test.ts` — import AGENT_FILES, expand dogfood check to all 6 agents (~5 lines changed)
  - `packages/cli/tests/commands/init/init.test.ts` — import AGENT_FILES, replace hardcoded arrays and counts (~15 lines changed)
  - `packages/cli/tests/templates/agent-proof-context.test.ts` or new test — guard test: template dir matches AGENT_FILES (~5 lines added)
  - `packages/cli/templates/.claude/agents/ana-verify.md` — multi-phase data naming (2 lines changed)
  - `.claude/agents/ana-verify.md` — dogfood copy, same changes
  - `packages/cli/src/commands/proof.ts` — `skill: string` → `skill?: string` (1 character)
  - `packages/cli/src/commands/work.ts` — delete stale comment reference (~3 words)
  - `packages/cli/tests/utils/proofSummary.test.ts` — remove conditional assertion guard (~3 lines changed)
- **Blast radius:** Low. Each fix is independent. No cascading type changes. No behavioral changes. The AGENT_FILES import is the largest change — it touches 2 test files in multiple locations but is mechanical replacement.
- **Estimated effort:** ~30 minutes pipeline time
- **Multi-phase:** no

## Approach
Six surgical fixes, each correcting a case where the code doesn't match reality.

### Fix 1: Import AGENT_FILES in tests (INT-012)

`AGENT_FILES` in `packages/cli/src/constants.ts` (line 152) is the single source of truth — 6 agents:
```typescript
export const AGENT_FILES = [
  'ana.md', 'ana-plan.md', 'ana-setup.md',
  'ana-build.md', 'ana-verify.md', 'ana-learn.md',
] as const;
```

Tests hardcode 4 or 5 agents in multiple locations:

**`agent-proof-context.test.ts:68`** — dogfood sync test lists 4 agents (missing `ana-setup.md` and `ana-learn.md`):
```typescript
// Current
const files = ['ana.md', 'ana-plan.md', 'ana-build.md', 'ana-verify.md'];
// Fix: import AGENT_FILES and use [...AGENT_FILES]
```

**`init.test.ts` — 6 locations:**
- Lines 61-65: hardcodes 5 agent paths in expected init output (missing `ana-learn.md`)
- Lines 212-216: hardcodes 5 agent names in template existence check
- Line 230: `expect(files).toHaveLength(5)` — should be `AGENT_FILES.length`
- Lines 232-236: hardcodes 5 `expect(files).toContain(...)` assertions
- Lines 244-248: iterates agent names for template source check — use `AGENT_FILES`
- Lines 267-281: frontmatter test iterates agent names WITH per-agent conditional logic (`if (agentFile === 'ana.md')` branches). Import `AGENT_FILES` for the iteration list but keep the per-agent assertions — the agent-specific logic can't be replaced mechanically.

**Fix:** Import `AGENT_FILES` from `../../src/constants.js` (or appropriate relative path) in both test files. Replace hardcoded arrays with `[...AGENT_FILES]`. Replace hardcoded counts with `AGENT_FILES.length`. Keep per-agent conditional logic where it exists.

### Fix 2: Guard test — template directory matches AGENT_FILES (INT-013)

Nothing verifies that `AGENT_FILES` matches the actual template directory. An orphaned template or missing constant goes undetected.

**Fix:** Add one test (in `agent-proof-context.test.ts` alongside existing template tests):
```typescript
it('AGENT_FILES matches template directory contents', () => {
  const templateDir = path.join(__dirname, '../../templates/.claude/agents');
  const templateFiles = readdirSync(templateDir).filter(f => f.endsWith('.md'));
  expect(templateFiles.sort()).toEqual([...AGENT_FILES].sort());
});
```

The relative path `../../templates/.claude/agents` is relative to `tests/templates/agent-proof-context.test.ts`. Adjust if the test goes in a different file.

### Fix 3: Verify template multi-phase data naming (P26 / AGENT-051)

The Verify template says `create verify_data.yaml`. The CLI expects `verify_data_1.yaml` for multi-phase builds. Verify creates the wrong filename, save fails with "verify_data_1.yaml not found," Verify retries.

**Fix — two lines in `packages/cli/templates/.claude/agents/ana-verify.md`:**

Line 73 (re-verify cleanup):
```
# Current
Delete the previous `verify_report.md` (or `verify_report_N.md`) and `verify_data.yaml` from
# Fix — add the multi-phase variant
Delete the previous `verify_report.md` (or `verify_report_N.md`) and `verify_data.yaml` (or `verify_data_N.yaml`) from
```

Line 107 (Step 6b):
```
# Current
Before writing the narrative report, create `verify_data.yaml` in
# Fix — add the multi-phase variant
Before writing the narrative report, create `verify_data.yaml` (or `verify_data_N.yaml` for multi-phase, matching the report number) in
```

Apply the same changes to the dogfood copy at `.claude/agents/ana-verify.md`.

### Fix 4: Fix promote options.skill type (proof-promote-C2)

Line 836 of `proof.ts` declares `--skill` with `.option()` (optional), not `.requiredOption()`. But line 841 types it as `skill: string` (non-optional). Commander delivers `undefined` when `--skill` is omitted. The runtime check at line 888 (`if (!options.skill)`) handles this correctly — but TypeScript thinks line 888 is dead code.

**Fix:** Change `skill: string` to `skill?: string` on line 841. One character.

### Fix 5: Delete stale comment (delete-backward-compat-C1)

`work.ts:843` says:
```
// Staleness checks — run after path resolution, reopen, and status assignment
```

The reopen loop was deleted by `delete-backward-compat` (entry #32). The comment references code that no longer exists.

**Fix:** Change to:
```
// Staleness checks — run after path resolution and status assignment
```

Remove "reopen, and" — three words.

### Fix 6: Fix conditional test assertion (proof-health-v1-C2)

`proofSummary.test.ts:2632` — the "detects trend improvement" test:
```typescript
// Current — assertion only fires if change.changed is true
if (change.changed) {
  expect(change.triggers).toContain('trend_improved');
}
```

If `change.changed` is false, the test passes without verifying the claim in its name. The test data creates 11 entries designed to show improvement (10 with risk, then 1 without).

**Fix:** Assert unconditionally:
```typescript
expect(change.changed).toBe(true);
expect(change.triggers).toContain('trend_improved');
```

If the test data doesn't produce a change detection, the test should fail — that means the test data is wrong, not that the test should pass silently.

## Acceptance Criteria

- AC1: `agent-proof-context.test.ts` dogfood sync test iterates all 6 agents from `AGENT_FILES`, not a hardcoded 4-element array
- AC2: `init.test.ts` uses `AGENT_FILES.length` for count assertions, not hardcoded `5`
- AC3: `init.test.ts` agent name arrays reference `AGENT_FILES` instead of hardcoded lists (where per-agent logic allows)
- AC4: A guard test exists that verifies the template directory contents match `AGENT_FILES`
- AC5: Verify template Step 6b mentions `verify_data_N.yaml` for multi-phase builds
- AC6: Verify template re-verify cleanup (line 73) mentions `verify_data_N.yaml`
- AC7: Dogfood copy of `ana-verify.md` matches the template
- AC8: `proof.ts` promote action handler types `skill` as optional (`skill?: string`)
- AC9: `work.ts:843` comment no longer references the deleted reopen loop
- AC10: `proofSummary.test.ts` "detects trend improvement" test asserts unconditionally — no `if (change.changed)` guard
- AC11: All existing tests pass. Build compiles without errors.

## Edge Cases & Risks

- **AGENT_FILES import path.** The import path depends on the test file's location relative to `src/constants.ts`. `agent-proof-context.test.ts` is in `tests/templates/` — path is `../../src/constants.js`. `init.test.ts` is in `tests/commands/init/` — path is `../../../src/constants.js`. Get the relative path right or the import fails.
- **Per-agent logic in frontmatter test.** `init.test.ts` lines 267-281 have `if (agentFile === 'ana.md')` branches with agent-specific assertions. Import `AGENT_FILES` for the loop variable but keep the conditional logic. Don't try to make it fully generic.
- **Guard test relative path.** The guard test reads the template directory with `readdirSync`. The relative path from the test file to `packages/cli/templates/.claude/agents/` must be correct.
- **Conditional assertion test data.** The "detects trend improvement" test creates 10 entries with 1 risk each, then an 11th with 0 risk. Removing the `if` guard means the test asserts `change.changed` is `true`. If `detectHealthChange` doesn't fire on this data, the test fails — which is correct. But verify the test data actually produces a trend improvement before removing the guard. The 10→11 entry transition with decreasing risk should trigger `trend_improved`.

## Rejected Approaches

- **Export `fileMatches` for direct testing.** Considered for the clean-proofsummary scope. Same principle applies here — test through public APIs, don't change module boundaries for test convenience.
- **Fix vacuous health assertion (proof-command-ux-C1).** Investigated and dropped. The `if (output.includes('Health:'))` guard at `work.test.ts:2311` is intentional — the test data creates optional output. The comment says "Health line **may** appear." The conditional assertion matches the test's design. Not a lie — honest uncertainty about optional output.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered
- `AGENT_FILES` at constants.ts:152 is `as const` — a readonly tuple. Tests should spread it (`[...AGENT_FILES]`) to get a mutable array for `.sort()` comparisons.
- The frontmatter test (init.test.ts:267-281) has per-agent conditional logic that can't be fully generalized. The iteration array can use AGENT_FILES but the body keeps agent-specific assertions.
- The guard test pattern (directory contents = constant list) exists in other projects as a "drift detection" test. Simple and effective.

### Constraints Discovered
- [TYPE-VERIFIED] `AGENT_FILES` has 6 entries. Tests hardcode 4 or 5. Confirmed gap.
- [TYPE-VERIFIED] `skill: string` at proof.ts:841 but `.option()` at line 836. Runtime handles undefined at line 888. Type lies.
- [TYPE-VERIFIED] work.ts:843 comment says "reopen" — the reopen function was deleted in entry #32.
- [TYPE-VERIFIED] proofSummary.test.ts:2632 wraps assertion in `if (change.changed)`. Test can pass without asserting.
- [OBSERVED] ana-verify.md line 73 and 107 both say `verify_data.yaml` without mentioning the numbered variant.

### Test Infrastructure
- `agent-proof-context.test.ts` — uses `readTemplate()` helper and `readFileSync()` for dogfood copies. Follow this pattern for the guard test.
- `init.test.ts` — creates temp directories with `fs.mkdtemp`, runs init, checks output. The AGENT_FILES import replaces hardcoded arrays in the output verification.
- `proofSummary.test.ts:2625-2635` — the conditional assertion test. Uses `detectHealthChange` with synthetic chain data.

## For AnaPlan

### Structural Analog
`agent-proof-context.test.ts` — already tests template/dogfood sync for 4 agents. The AGENT_FILES fix extends it to all 6. The guard test adds one more assertion in the same file.

### Relevant Code Paths
- `constants.ts:152-159` — `AGENT_FILES` constant (the SSOT)
- `agent-proof-context.test.ts:68` — hardcoded 4-agent list for dogfood sync
- `init.test.ts:61-65, 212-216, 230-236, 244-248, 267-281` — hardcoded agent lists
- `ana-verify.md:73` — re-verify cleanup, missing `verify_data_N.yaml`
- `ana-verify.md:107` — Step 6b, missing `verify_data_N.yaml`
- `proof.ts:841` — `skill: string` type lie
- `work.ts:843` — stale comment referencing deleted reopen loop
- `proofSummary.test.ts:2632` — conditional assertion guard

### Patterns to Follow
- Import constants from `src/constants.js` — existing pattern in other test files
- Template/dogfood sync: edit template first, then `cp` to dogfood location, verify with `diff`
- Test through public APIs — don't export private functions for testing

### Known Gotchas
- `init.test.ts` has multiple agent list locations. Grep for `ana-plan.md` to find them all — don't miss one.
- The frontmatter test at init.test.ts:267-281 has per-agent `if` branches. Import `AGENT_FILES` for the loop but keep the conditional body.
- `AGENT_FILES` is `as const` (readonly). Use `[...AGENT_FILES]` to create a mutable copy for `.sort()`.
- The guard test's `readdirSync` path must be relative to the test file's directory. Get the `..` count right.

### Things to Investigate
- Whether the "detects trend improvement" test data (10 entries with risk → 11th without) actually produces `change.changed === true`. Run the test with the guard removed before committing. If it fails, the test data needs adjustment — don't add back the guard.

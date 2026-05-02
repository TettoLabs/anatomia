# Spec: Fix Type Lies

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/fix-type-lies/scope.md

## Approach

Six independent surgical fixes. Each corrects a case where code says one thing but reality differs. No behavioral changes, no new features — just making the code honest.

The unifying disease: hardcoded values that drift from their source of truth. Five of the six fixes address this directly. The sixth (conditional assertion) is a test that can pass without testing.

Each fix is self-contained. Order doesn't matter. No cascading type changes.

## Output Mockups

No user-facing output changes. All fixes are internal — test corrections, type alignment, template accuracy, comment accuracy. The only observable difference: tests that previously passed with wrong counts now pass with correct counts, and one test that previously passed without asserting now actually asserts.

## File Changes

### `packages/cli/tests/templates/agent-proof-context.test.ts` (modify)
**What changes:** Import `AGENT_FILES` from constants. Replace hardcoded 4-agent array at the dogfood sync test with `[...AGENT_FILES]`. Add a new guard test that verifies template directory contents match `AGENT_FILES`.
**Pattern to follow:** Existing import pattern in `tests/commands/injectors.test.ts` line 17: `import { getStackSummary } from '../../src/constants.js'`
**Why:** The dogfood test currently checks 4 agents, missing `ana-setup.md` and `ana-learn.md`. A new agent added to `AGENT_FILES` won't be tested unless someone finds and updates this array. The guard test closes the gap between the constant and the filesystem.

### `packages/cli/tests/commands/init.test.ts` (modify)
**What changes:** Import `AGENT_FILES` from constants. Replace hardcoded agent arrays and counts in 6 locations. Fix the test title that says "8 agent files" (should reflect `AGENT_FILES.length`). Update the `expectedFiles` array to generate agent entries from `AGENT_FILES.map(f => '.claude/agents/' + f)` and update the `toHaveLength` count from 12 to 7 + AGENT_FILES.length (settings + skills + CLAUDE.md = 7 non-agent entries). Fix the comment that says "5 agent files" to reference the constant.
**Pattern to follow:** The existing `expectedFiles` construction at lines 57-74 — same structure, just make the agent section dynamic.
**Why:** Tests hardcode 5 agents, missing `ana-learn.md`. Every new agent requires finding and updating 6 locations in this file.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Two lines. Line 73 (re-verify cleanup): add `(or \`verify_data_N.yaml\`)` alongside the existing `verify_data.yaml` mention. Line 107 (Step 6b): add `(or \`verify_data_N.yaml\` for multi-phase, matching the report number)` after `verify_data.yaml`.
**Pattern to follow:** The existing pattern on the same lines for `verify_report.md` — both lines already show `(or \`verify_report_N.md\`)` for the report file. Mirror that exact parenthetical style for data files.
**Why:** Verify creates `verify_data.yaml` but the CLI expects `verify_data_1.yaml` for multi-phase builds. Verify creates the wrong filename, save fails, Verify retries.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Identical changes as the template above. This is the dogfood copy.
**Pattern to follow:** Must match `packages/cli/templates/.claude/agents/ana-verify.md` exactly after both are edited.
**Why:** Dogfood copy must stay in sync with template. The dogfood sync test (Fix 1) will catch drift.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Line 841: change `skill: string` to `skill?: string` in the promote action handler's options type.
**Pattern to follow:** The existing `text?: string` on the same line — `skill` should match the same optional pattern.
**Why:** `.option('--skill <skill>')` at line 836 makes it optional at runtime. Commander delivers `undefined` when omitted. The runtime check at line 888 handles this correctly — but TypeScript thinks that check is dead code.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Line 843: change `// Staleness checks — run after path resolution, reopen, and status assignment` to `// Staleness checks — run after path resolution and status assignment`. Remove ", reopen," (three words).
**Pattern to follow:** N/A — comment edit.
**Why:** The reopen loop was deleted. The comment references code that no longer exists.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Lines 2632-2634: replace the `if (change.changed)` guard with unconditional assertions: `expect(change.changed).toBe(true)` followed by `expect(change.triggers).toContain('trend_improved')`.
**Pattern to follow:** Every other assertion in this test file asserts unconditionally.
**Why:** The conditional guard means the test passes without verifying its claim. If `detectHealthChange` doesn't fire on this data, the test should fail — that means the test data is wrong, not that the test should silently pass.

## Acceptance Criteria

- [ ] AC1: `agent-proof-context.test.ts` dogfood sync test iterates all 6 agents from `AGENT_FILES`, not a hardcoded 4-element array
- [ ] AC2: `init.test.ts` uses `AGENT_FILES.length` for count assertions, not hardcoded `5`
- [ ] AC3: `init.test.ts` agent name arrays reference `AGENT_FILES` instead of hardcoded lists (where per-agent logic allows)
- [ ] AC4: A guard test exists that verifies the template directory contents match `AGENT_FILES`
- [ ] AC5: Verify template Step 6b mentions `verify_data_N.yaml` for multi-phase builds
- [ ] AC6: Verify template re-verify cleanup (line 73) mentions `verify_data_N.yaml`
- [ ] AC7: Dogfood copy of `ana-verify.md` matches the template
- [ ] AC8: `proof.ts` promote action handler types `skill` as optional (`skill?: string`)
- [ ] AC9: `work.ts` comment no longer references the deleted reopen loop
- [ ] AC10: `proofSummary.test.ts` "detects trend improvement" test asserts unconditionally — no `if (change.changed)` guard
- [ ] AC11: All existing tests pass. Build compiles without errors.

## Testing Strategy

- **Unit tests:** No new test files. One new test case (guard test in `agent-proof-context.test.ts`). All other changes modify existing tests.
- **Integration tests:** None needed — changes are internal corrections.
- **Edge cases:** The guard test IS the edge case test — it catches drift between `AGENT_FILES` and the template directory. Run the "detects trend improvement" test after removing the `if` guard to confirm it passes unconditionally (the scope notes this is important — if it fails, the test data needs fixing, not a new guard).

## Dependencies

None. All files exist. No new packages or infrastructure needed.

## Constraints

- Test count must not decrease. The guard test adds 1 new test. All others are modifications.
- `AGENT_FILES` is `as const` (readonly tuple). Use `[...AGENT_FILES]` to create a mutable array for `.sort()` comparisons.
- The `.js` extension is required on the import: `import { AGENT_FILES } from '../../src/constants.js'`

## Gotchas

- **Import path is `../../src/constants.js` for BOTH test files.** The scope's Edge Cases section says `init.test.ts` is in `tests/commands/init/` (3 levels deep) — that's wrong. `init.test.ts` is at `tests/commands/init.test.ts` (there IS a `tests/commands/init/` directory with other files, but `init.test.ts` itself is in `tests/commands/`). Confirmed by the existing import at line 5: `import { createEmptyEngineResult } from '../../src/engine/types/engineResult.js'`.
- **init.test.ts line 76: `expect(expectedFiles).toHaveLength(12)`.** After adding ana-learn.md via AGENT_FILES, the array has 13 items (1 settings + 6 agents + 5 skills + 1 CLAUDE.md). Update to `7 + AGENT_FILES.length` or just `13`.
- **init.test.ts line 60: comment says `// 5 agent files`.** Update to reference AGENT_FILES.
- **init.test.ts line 198: test title says "8 agent files".** Should say `${AGENT_FILES.length} agent files` or just "agent files". The "8" was never correct.
- **Frontmatter test (lines 267-286):** Has per-agent `if` branches (`if (agentFile === 'ana.md')`, etc.). Import `AGENT_FILES` for the iteration array but keep all conditional logic inside the loop body. The `ana-learn.md` agent will need its own branch or fall into an `else` — check its frontmatter to decide which branch it belongs in (likely same as `ana-build.md`/`ana-verify.md`: model opus, no tools, no memory).
- **Guard test `readdirSync` path:** The `templatesDir` constant already exists at line 5 of `agent-proof-context.test.ts`: `const templatesDir = path.join(__dirname, '../../templates/.claude/agents')`. Reuse it directly — don't compute a new path.
- **Dogfood sync test (agent-proof-context.test.ts line 68):** The existing test iterates a hardcoded array in a single `it` block. If the first file fails, remaining files aren't checked (noted by proof context). This is a pre-existing issue — not in scope to fix. Just replace the array with `[...AGENT_FILES]`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { AGENT_FILES } from '../../src/constants.js'`
- Use `node:` prefix for built-ins: `import { readdirSync } from 'node:fs'`
- `readdirSync` is already available via the existing `readFileSync` import in `agent-proof-context.test.ts` — add it to that import.
- Prefer named exports. `AGENT_FILES` is already a named export.
- Use `import type` for type-only imports — not relevant here, all imports are value imports.

### Pattern Extracts

**Existing constant import in test file** (`tests/commands/injectors.test.ts:17`):
```typescript
import { getStackSummary } from '../../src/constants.js';
```

**Dogfood sync test to modify** (`tests/templates/agent-proof-context.test.ts:66-75`):
```typescript
  // @ana A008
  it('dogfood agent definitions match the shipped templates exactly', () => {
    const dogfoodDir = path.join(__dirname, '../../../../.claude/agents');
    const files = ['ana.md', 'ana-plan.md', 'ana-build.md', 'ana-verify.md'];

    for (const file of files) {
      const template = readTemplate(file);
      const dogfood = readFileSync(path.join(dogfoodDir, file), 'utf-8');
      expect(dogfood, `${file} dogfood should match template`).toBe(template);
    }
  });
```

**Verify template line 73 — re-verify cleanup** (`templates/.claude/agents/ana-verify.md:73`):
```
3. **Write fresh artifacts.** Delete the previous `verify_report.md` (or `verify_report_N.md`) and `verify_data.yaml` from `.ana/plans/active/{slug}/`. You already extracted what you need in step 2. Writing to a clean path ensures no FAIL-round content leaks into the PASS report. Do NOT delete `build_data.yaml` — that is Build's artifact, not yours.
```

**Verify template line 107 — Step 6b** (`templates/.claude/agents/ana-verify.md:107`):
```
Before writing the narrative report, create `verify_data.yaml` in `.ana/plans/active/{slug}/`. This is the structured companion to the narrative `## Findings` section. Build it as you verify — add findings as you discover them.
```

**Proof.ts promote type to fix** (`src/commands/proof.ts:841`):
```typescript
    .action(async (ids: string[], options: { skill: string; text?: string; section?: string; force?: boolean; json?: boolean }) => {
```

**Conditional assertion to fix** (`tests/utils/proofSummary.test.ts:2632-2634`):
```typescript
    if (change.changed) {
      expect(change.triggers).toContain('trend_improved');
    }
```

### Proof Context

- `proof.ts` has an active finding: "options.skill typed as non-optional string but can be undefined after requiredOption→option change" — this is exactly what Fix 4 addresses.
- `agent-proof-context.test.ts` has an active finding about the dogfood sync test loop short-circuiting. Pre-existing, not in scope.
- No active proof findings for `init.test.ts`, `work.ts`, or `proofSummary.test.ts`.

### Checkpoint Commands

- After Fix 1+2 (test file changes): `cd packages/cli && pnpm vitest run tests/templates/agent-proof-context.test.ts tests/commands/init.test.ts --run` — Expected: all tests pass with updated counts
- After Fix 6 (conditional assertion): `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts --run` — Expected: "detects trend improvement" passes unconditionally
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: 1778+ tests pass (1777 existing + 1 guard test)
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1777 passed, 2 skipped (93 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected 1778 passed (1 new guard test), 2 skipped, 93 test files
- Regression focus: `agent-proof-context.test.ts`, `init.test.ts`, `proofSummary.test.ts` — the files being modified

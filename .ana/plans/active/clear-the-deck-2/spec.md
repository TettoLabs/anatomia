# Spec: Clear the Deck Phase 2

**Created by:** AnaPlan
**Date:** 2026-04-26
**Scope:** .ana/plans/active/clear-the-deck-2/scope.md

## Approach

Eight items in three commits, organized by what they change. The order matters: templates first (zero code, zero risk), code corrections second (type changes that existing tests already cover), glob fallback + new tests third (new behavior with new coverage).

**Commit 1 — Templates.** All 5 agent frontmatter blocks get `opus[1m]`. Verify gets a confirmation step. Build step 0 gets rewording. Setup gets three investigation gaps filled.

**Commit 2 — Code corrections.** `slugDir2` renamed. `validateSetupCompletion` gets scan.json wired in. `build_concerns` becomes non-optional on both `ProofChainEntry` and `ProofSummary`. The write path in work.ts always includes `build_concerns: []`. Seven proof_chain.json entries get backfilled.

**Commit 3 — Glob fallback + tests.** `resolveCalloutPaths` gains `projectRoot` parameter and `globSync` fallback. New tests for glob behavior. Nonzero callout fixture in work.test.ts.

**ProofSummary decision:** `ProofSummary.build_concerns` also becomes non-optional (`Array<...>` instead of `Array<...> | undefined`). The `generateProofSummary` function at proofSummary.ts:810 currently conditionally creates the array. After this change, the summary initializer sets `build_concerns: []` and the parsing code pushes directly. This eliminates every `|| []` fallback in the chain from summary through entry to JSON.

## Output Mockups

**Agent template frontmatter (all 5):**
```yaml
model: opus[1m]
```

**Verify confirmation (new step between Find Work and Check Out):**
```
Found clear-the-deck-2 ready for verification. Should I proceed?
```

**Build step 0 (reworded):**
```
Run `ana work status` immediately — this is a read-only check, not a commitment to start work.
```

**`work complete` callout accumulation line (with nonzero callouts):**
```
Chain: 2 runs · 3 callouts
```

## File Changes

### `templates/.claude/agents/ana.md` (modify)
**What changes:** Frontmatter `model: opus` becomes `model: opus[1m]`.
**Pattern to follow:** The frontmatter is YAML between `---` fences. Line 3.
**Why:** Agents currently run at ~200K context. 1M unlocks full project understanding.

### `templates/.claude/agents/ana-build.md` (modify)
**What changes:** (1) Frontmatter `model: opus[1m]`. (2) Step 0 rewording — remove "Do not ask permission" and replace with language that scopes the instruction to the status check only, not to starting work.
**Pattern to follow:** The current step 0 text at line 30 says "Do not ask permission — this is your first action." Change to make clear the no-permission instruction applies to running `ana work status` (a read-only command), not to beginning implementation. Step 3's confirmation ("Found spec for {name}...") remains untouched.
**Why:** "Do not ask permission" is read broadly by agents. Build's step 3 confirmation works, but the contradiction is confusing. Plan has identical wording at its step 0 — do NOT change Plan's version. Only change Build's.

### `templates/.claude/agents/ana-plan.md` (modify)
**What changes:** Frontmatter `model: opus[1m]` only.
**Pattern to follow:** Same as ana.md.
**Why:** Context window upgrade.

### `templates/.claude/agents/ana-verify.md` (modify)
**What changes:** (1) Frontmatter `model: opus[1m]`. (2) New confirmation step between Find Work (step 1) and Check Out (step 2). (3) Callout format section updated with project-relative path instruction.
**Pattern to follow:** For the confirmation step, follow Plan's step 1 pattern (ana-plan.md line 38): name the work item, wait for explicit developer confirmation. The wording should be: "Found {slug} ready for verification. Should I proceed?" The existing step 2 says "After the developer confirms" for branch checkout — with the new step, step 2's confirmation becomes specifically about branch switching (which only fires when branches differ). Renumber subsequent steps.
For callout paths: the example at line 319 shows `api/client.ts:47` — this is already project-relative. Add an explicit instruction ABOVE the examples: "Use project-relative paths in file references (e.g., `src/utils/helper.ts:42` not `helper.ts:42`). Basenames without paths degrade proof chain data quality." Keep the existing examples as-is — they already use relative paths.
**Why:** Verify had no confirmation step. Agents could skip straight to checkout and verification without developer awareness. The callout path instruction ensures file references resolve correctly in the proof chain.

### `templates/.claude/agents/ana-setup.md` (modify)
**What changes:** (1) Frontmatter `model: opus[1m]`. (2) SETUP-032: Step 3 gets instruction to read validation library files (Zod/Joi/Yup schemas) when `stack.validation` is detected. (3) SETUP-031: Step 4 investigation adds validation schemas and test patterns to the list of things surfaced in the Step 5 presentation. (4) SETUP-033: Step 4 adds instruction to read auth config files when `stack.auth` is non-null.
**Pattern to follow:** Step 3 (line 158-204) already has a "Product Identity" section with investigation. The validation read belongs in Step 4 "Codebase Investigation" (line 206), alongside other file reads. Follow the existing investigation pattern: "If `stack.validation` is non-null, read up to 3 schema files to understand validation patterns and conventions." For auth: same pattern — "If `stack.auth` is non-null, read auth configuration (middleware, providers, session config)." Step 5 (line 234) drafts project-context — the findings from Step 4 (validation patterns, auth setup) should appear in the Architecture section of the draft.
**Why:** Setup misses validation library patterns and auth config, producing thin context files for projects that use them.

### `src/commands/artifact.ts` (modify)
**What changes:** `slugDir2` at line 721 becomes `slugDir`. The variable shadowed a block-scoped `slugDir` at line 626, but that scope is inside an `if (verify-report)` block — no actual JavaScript shadowing exists. The `2` suffix was protective and is now unnecessary (scope 1 extracted the verify-report handling, further reducing any ambiguity).
**Pattern to follow:** Read lines 620-627 to confirm `slugDir` at line 626 is block-scoped inside an `if` statement. Then rename `slugDir2` to `slugDir` at lines 721, 723, 724.
**Why:** Misleading variable name suggests shadowing that doesn't exist.

### `src/commands/check.ts` (modify)
**What changes:** In `validateSetupCompletion` (around line 1315), replace the `null` third argument to `checkConsistency` with an actual scan.json read. The `readScanJson` function already exists in the same file at line 670. Call `const scanJson = await readScanJson(cwd);` before the `checkConsistency` call, then pass `scanJson` as the third argument.
**Pattern to follow:** The `ana check` display command at line 1419-1422 does exactly this: `const scanJson = await readScanJson(cwd); const consistencyResults = await checkConsistency(cwd, anaJson, scanJson);`. Mirror that pattern.
**Why:** `validateSetupCompletion` runs cross-reference checks but passes null for scan data, missing scan-dependent consistency checks.

### `src/types/proof.ts` (modify)
**What changes:** Line 60: `build_concerns?: Array<{ summary: string; file: string | null }>` becomes `build_concerns: Array<{ summary: string; file: string | null }>` (remove the `?`).
**Pattern to follow:** The other intelligence fields on the same type (`callouts`, `rejection_cycles`, `previous_failures`) are already non-optional.
**Why:** 7 of 17 entries lack the field. Every consumer uses `|| []`. Making it required + backfilling eliminates all defensive fallbacks.

### `src/utils/proofSummary.ts` (modify)
**What changes:** Two changes. (1) Line 73: `build_concerns?` becomes `build_concerns` (non-optional) on the `ProofSummary` interface. The summary initializer (where the object literal is created in `generateProofSummary`) must set `build_concerns: []` as a default. The conditional creation at line 810 (`if (!summary.build_concerns) summary.build_concerns = [];`) becomes unnecessary — just push directly into `summary.build_concerns`. (2) `resolveCalloutPaths` at line 327 gains an optional third parameter `projectRoot?: string`. When provided and `modules_touched` matching fails for a basename, use `globSync` to find `**/{basename}` in the project filesystem. Resolve if exactly one match. Skip if 0 or 2+ matches. Exclude `node_modules` and `.ana` directories.
**Pattern to follow:** For the glob fallback, follow the existing resolution pattern: check condition, resolve if unambiguous, skip otherwise. Import `globSync` from `glob` (the package is already a dependency at v10.3.0+, `globSync` is a named export). The glob call: `globSync('**/' + basename, { cwd: projectRoot, ignore: ['**/node_modules/**', '**/.ana/**'] })`. If result length is exactly 1, set `item.file = result[0]`. The glob fallback is a second-pass resolution — it only runs for items that the `modules_touched` matching didn't resolve (basename still lacks `/`).
**Why:** (1) Type consistency — ProofSummary feeds ProofChainEntry, both should agree. (2) Callouts referencing unmodified files or backfilled entries can't resolve against `modules_touched` because the file wasn't touched. Glob catches these.

### `src/commands/work.ts` (modify)
**What changes:** Two changes. (1) Line 803: the conditional spread `...(proof.build_concerns && proof.build_concerns.length > 0 ? { build_concerns: proof.build_concerns } : {})` becomes `build_concerns: proof.build_concerns ?? []`. Always write the field. (2) Lines 808-814: all `resolveCalloutPaths` calls gain `projectRoot` as a third argument. The `projectRoot` variable is already available in this function's scope — verify by reading the surrounding context. Both the new-entry resolution (line 808-809) and the existing-entry backfill loop (lines 812-814) get the parameter.
**Pattern to follow:** The entry construction object literal is at ~line 790-804. Change only the `build_concerns` line. For `resolveCalloutPaths` calls, add the third argument to all 4 call sites (2 for the new entry: callouts + build_concerns, 2 inside the loop for existing entries).
**Why:** (1) Conditional omission means the type says non-optional but the data says otherwise. Always-write eliminates the gap. (2) Glob fallback needs project root to search the filesystem.

### `.ana/proof_chain.json` (modify)
**What changes:** Add `"build_concerns": []` to 7 entries that lack the field: proof-list-view (index 0), fix-skill-template-gaps (2), monorepo-primary-agents-md (3), proof-chain-active-issues (6), configurable-branch-prefix (11), proof-chain-targeted-queries (13), proof-chain-health-signal (14). Do NOT add other missing fields (entry 0 is also missing `modules_touched`, `rejection_cycles`, `previous_failures` — those stay as-is, handled by existing `|| []` fallbacks).
**Pattern to follow:** Entries that already have `build_concerns` use `"build_concerns": []` (empty array). Add the same. Place the field after `previous_failures` to match existing entry ordering.
**Why:** Makes data match the now-non-optional type. Consumers can drop `|| []` fallbacks.

### `tests/utils/proofSummary.test.ts` (modify)
**What changes:** Add new tests to the existing `resolveCalloutPaths` describe block (after line 1189). New tests exercise the glob fallback with a real temp directory. Minimum 4 tests: (1) glob resolves basename when modules_touched fails, (2) glob skips ambiguous basename (2+ matches on disk), (3) glob ignores node_modules matches, (4) glob ignores .ana matches. Tests create a temp directory with real files using `fs.promises.mkdtemp` (same pattern as `getProofContext` tests at line 1191).
**Pattern to follow:** The existing `resolveCalloutPaths` tests at line 1124 use arrays of `{ file: string }` objects. New glob tests need: (a) a temp directory with files at known paths, (b) items with basenames, (c) `resolveCalloutPaths(items, [], tempDir)` — empty modules array forces the glob path. Use `beforeEach`/`afterEach` for temp directory lifecycle, matching the `getProofContext` test block.
**Why:** The glob fallback is new behavior with filesystem interaction. Must be tested with real files.

### `tests/commands/work.test.ts` (modify)
**What changes:** Add a test that exercises proof chain callout accumulation with nonzero callouts. The existing `createProofProject` helper creates a verify report with no callouts section. Create a variant (or parameterize the helper) that includes a `## Callouts` section with actual callout entries. The test asserts that the `Chain: N runs · M callouts` output shows M > 0.
**Pattern to follow:** The existing `prints proof summary line` test at line 1074 captures console.log and asserts on `Chain: 1 run · 0 callouts`. The new test follows the same pattern but with a verify report containing callouts. The callout format in verify reports is: `- **Code — title:** \`file.ts:line\` — description`. The proof summary parser for callouts is `parseCallouts` in proofSummary.ts — read it to understand the expected format.
**Why:** Current tests only exercise the zero-callout path. AC16 requires nonzero callout accumulation coverage.

## Acceptance Criteria

- [ ] AC1: All 5 agent template frontmatter blocks specify `model: opus[1m]`.
- [ ] AC2: Verify template has a confirmation step between Find Work and Check Out.
- [ ] AC3: Build template step 0 does not contain "Do not ask permission."
- [ ] AC4: Verify template callout format section instructs project-relative paths.
- [ ] AC5: Setup template Step 3 instructs reading validation library files when detected.
- [ ] AC6: Setup template Step 4 findings for test patterns and schema files surfaced in Step 5 draft.
- [ ] AC7: Setup template instructs reading auth config when `stack.auth` is non-null.
- [ ] AC8: `artifact.ts` uses `slugDir` (not `slugDir2`) at the post-validation metadata write site.
- [ ] AC9: `validateSetupCompletion` passes scan.json to `checkConsistency` instead of null.
- [ ] AC10: `ProofChainEntry.build_concerns` is non-optional.
- [ ] AC11: `writeProofChain` always writes `build_concerns: []` when no concerns exist.
- [ ] AC12: All 7 proof_chain.json entries backfilled with `"build_concerns": []`.
- [ ] AC13: `resolveCalloutPaths` accepts optional `projectRoot` and uses `globSync` fallback.
- [ ] AC14: Glob fallback does NOT resolve ambiguous basenames (2+ matches).
- [ ] AC15: All `resolveCalloutPaths` call sites in `writeProofChain` pass `projectRoot`.
- [ ] AC16: A test exercises nonzero callout accumulation with M > 0 in output.
- [ ] AC17: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC18: Lint passes: `pnpm lint`

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** 4+ new tests in the `resolveCalloutPaths` describe block for glob fallback. Use real temp directories with files at known paths. Test: single-match resolution, ambiguous-match skip, node_modules exclusion, .ana exclusion.
- **Integration tests (work.test.ts):** 1 new test for nonzero callout accumulation. Modify the verify report fixture to include a `## Callouts` section with real callout entries. Assert `Chain: N runs · M callouts` with M > 0.
- **Existing tests:** All 1481 existing tests must continue passing. The type changes (non-optional build_concerns) may require updating test fixtures that construct ProofChainEntry or ProofSummary objects — add `build_concerns: []` where missing.

## Dependencies

None. All changes build on existing code and patterns.

## Constraints

- `globSync` must exclude `node_modules` and `.ana` directories to avoid matching dependencies or proof chain artifacts.
- Template changes are text-only — no code validation possible. Rely on manual review.
- The proof_chain.json backfill must ONLY add `build_concerns: []`. Entry 0 has other missing fields — leave them for a future scope.
- Do NOT change Plan template's step 0 "Do not ask permission" wording. Only Build's.

## Gotchas

- **Import for globSync.** Use `import { globSync } from 'glob';` — it's a named export from glob v10+. All existing codebase glob imports use async `glob`. This is the first sync usage. The import goes at the top of proofSummary.ts alongside existing imports.
- **ProofSummary initializer location.** The object literal for ProofSummary is constructed inside `generateProofSummary`. Search for where the initial object is built (all the `assertions:`, `timing:`, etc. fields) and add `build_concerns: []` there. Then simplify the conditional at ~line 810 to push directly.
- **Test fixtures constructing ProofChainEntry.** Any test that builds a `ProofChainEntry` object literal without `build_concerns` will get a TypeScript error after the type change. Search for these and add `build_concerns: []`. The work.test.ts `createProofProject` helper's existing chain entry at line 869 may need this.
- **Verify template step renumbering.** Adding a confirmation step between step 1 and step 2 means step 2 → step 3, step 3 → step 4, etc. Check for any internal cross-references between steps in the template and update them.
- **proof_chain.json is large.** Don't rewrite the entire file by hand. Read it, parse it, add the field to entries that lack it, write it back with `JSON.stringify(chain, null, 2)` formatting. Or edit surgically — either approach works, but preserve the existing formatting and field ordering.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always pass `--run` with vitest to avoid watch mode hang.
- Test behavior, not implementation. Assert specific values.
- Use real temp directories (fs.mkdtemp) for filesystem tests, not mocks.

### Pattern Extracts

**resolveCalloutPaths — current implementation (proofSummary.ts:327-342):**
```typescript
export function resolveCalloutPaths(
  items: Array<{ file: string | null }>,
  modules: string[],
): void {
  for (const item of items) {
    if (!item.file) continue;
    if (item.file.includes('/')) continue;

    const basename = item.file;
    const matches = modules.filter(m => m.endsWith('/' + basename));

    if (matches.length === 1) {
      item.file = matches[0]!;
    }
  }
}
```

**Glob fallback test pattern — getProofContext tests (proofSummary.test.ts:1191-1197):**
```typescript
let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'proof-context-test-'));
  await fs.promises.mkdir(path.join(tempDir, '.ana'), { recursive: true });
});
```

**work.ts entry construction — conditional build_concerns (work.ts:797-804):**
```typescript
    callouts: proof.callouts.map((c, i) => ({
      ...c,
      id: `${slug}-C${i + 1}`,
    })),
    rejection_cycles: proof.rejection_cycles,
    previous_failures: proof.previous_failures,
    ...(proof.build_concerns && proof.build_concerns.length > 0 ? { build_concerns: proof.build_concerns } : {}),
```

**work.ts resolveCalloutPaths calls (work.ts:808-814):**
```typescript
  resolveCalloutPaths(entry.callouts, entry.modules_touched || []);
  resolveCalloutPaths(entry.build_concerns || [], entry.modules_touched || []);

  // Existing entries: backfill (idempotent — already-resolved files are skipped)
  for (const existing of chain.entries) {
    resolveCalloutPaths(existing.callouts || [], existing.modules_touched || []);
    resolveCalloutPaths(existing.build_concerns || [], existing.modules_touched || []);
  }
```

**Existing resolveCalloutPaths test (proofSummary.test.ts:1132-1136):**
```typescript
  it('resolves single-match basename to full path', () => {
    const items = [{ file: 'census.ts' }];
    resolveCalloutPaths(items, modules);
    expect(items[0]!.file).toBe('packages/cli/src/engine/census.ts');
  });
```

**Callout accumulation test pattern (work.test.ts:1074-1095):**
```typescript
      it('prints proof summary line', async () => {
        await createProofProject('test-feature');

        const originalLog = console.log;
        const logs: string[] = [];
        console.log = (...args: unknown[]) => {
          logs.push(args.join(' '));
        };

        await completeWork('test-feature');

        console.log = originalLog;
        const output = logs.join('\n');

        expect(output).toContain('Chain: 1 run · 0 callouts');
      });
```

### Checkpoint Commands

- After template changes: `pnpm lint` — Expected: clean (templates aren't linted, but verify no accidental code changes)
- After code corrections: `(cd packages/cli && pnpm vitest run)` — Expected: 1481+ tests pass
- After glob fallback + tests: `(cd packages/cli && pnpm vitest run)` — Expected: 1486+ tests pass (5+ new)
- Final lint: `pnpm lint` — Expected: clean

### Build Baseline
- Current tests: 1481 passed, 2 skipped
- Current test files: 97
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1488 tests in 97 files (4+ glob tests + 1 callout test + possible fixture updates)
- Regression focus: `tests/utils/proofSummary.test.ts`, `tests/commands/work.test.ts` — both touched directly. Also any test constructing `ProofChainEntry` or `ProofSummary` objects may need `build_concerns: []` added.

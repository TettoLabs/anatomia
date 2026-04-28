# Spec: Clean Ground for Foundation 3

**Created by:** AnaPlan
**Date:** 2026-04-28
**Scope:** .ana/plans/active/clean-ground/scope.md

## Approach

Three independent fixes shipped in one commit. All changes are internal to `writeProofChain` and `resolveFindingPaths` — no public API changes, no downstream consumers affected.

1. **Dead fallback removal (work.ts lines 828-829).** Remove `|| []` from the two `resolveFindingPaths` calls on the new entry. `entry.modules_touched` is always an array (initialized as `[]` at line 763). `entry.build_concerns` is always an array (guaranteed by `?? []` at line 814). `entry.findings` is always an array (constructed via `.map()` at line 807). The backfill loop at lines 844-845 keeps its `|| []` because historical JSON entries may lack these fields.

2. **Stale assertion deletion (artifact.test.ts line 1243).** Delete `expect(saves.scope.commit).toBeUndefined()`. `writeSaveMetadata` no longer writes a `commit` field. The assertion tests `undefined === undefined` — it verifies nothing. The surrounding test still validates `.saves.json` structure through `saved_at` and `hash` assertions.

3. **Glob cache for resolveFindingPaths.** Add an optional `globCache` parameter with a default `new Map()`. Inside the glob fallback branch (current line 355), check the cache before calling `globSync` and store results after. In `writeProofChain`, declare one shared `Map<string, string[]>` before the new-entry resolution calls and pass it to all four `resolveFindingPaths` invocations (lines 828, 829, 844, 845).

## Output Mockups

No user-visible output changes. All fixes are internal to the proof chain write path.

## File Changes

### packages/cli/src/commands/work.ts (modify)
**What changes:** (a) Remove `|| []` from the two `resolveFindingPaths` calls at lines 828-829. (b) Declare `const globCache = new Map<string, string[]>()` before line 828. (c) Pass `globCache` as the fourth argument to all four `resolveFindingPaths` calls (lines 828, 829, 844, 845).
**Pattern to follow:** The `globResultCache` pattern at work.ts:900 — same data structure, same lifecycle (created by caller, consumed in loop).
**Why:** Dead fallbacks obscure guarantees. Uncached globs re-scan the filesystem for every unresolved basename across every proof chain entry.

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** Add an optional fourth parameter `globCache: Map<string, string[]> = new Map()` to `resolveFindingPaths`. Before the `globSync` call, check `globCache.get(basename)`. If hit, use cached result. If miss, call `globSync` and store the result in `globCache`.
**Pattern to follow:** work.ts:942-948 — the staleness loop's glob cache check/store pattern.
**Why:** `resolveFindingPaths` is called 4 times per `writeProofChain` invocation. Without caching, each call re-globs the same basenames. With a shared cache, each unique basename is globbed once.

### packages/cli/tests/commands/artifact.test.ts (modify)
**What changes:** Delete the line `expect(saves.scope.commit).toBeUndefined();` at line 1243.
**Pattern to follow:** N/A — pure deletion.
**Why:** The assertion tests `undefined === undefined` since the `commit` field was removed from `writeSaveMetadata`.

### packages/cli/tests/utils/proofSummary.test.ts (modify)
**What changes:** Add two new tests in the `resolveFindingPaths` describe block: (a) a test that verifies glob is called once per unique basename when a shared cache is passed across multiple calls, (b) a test that verifies calling `resolveFindingPaths` without a cache parameter still resolves paths correctly via glob fallback (default behavior preserved).
**Pattern to follow:** The existing `resolveFindingPaths` glob fallback tests at lines 1229-1271 — same temp directory setup, same `fs.promises.mkdir`/`writeFile` pattern.
**Why:** The cache is the only behavioral change. Both the shared-cache and default-cache paths need verification.

## Acceptance Criteria

- [ ] AC1: `resolveFindingPaths` call at work.ts:828 passes `entry.modules_touched` directly without `|| []`
- [ ] AC2: `resolveFindingPaths` call at work.ts:829 passes `entry.build_concerns` and `entry.modules_touched` directly without `|| []`
- [ ] AC3: The `expect(saves.scope.commit).toBeUndefined()` assertion no longer exists in artifact.test.ts
- [ ] AC4: `resolveFindingPaths` accepts an optional `globCache` parameter (defaults to a new `Map<string, string[]>`)
- [ ] AC5: When `globCache` is provided, `resolveFindingPaths` checks the cache before calling `globSync` and stores results after
- [ ] AC6: `writeProofChain` creates one shared `Map<string, string[]>` and passes it to all `resolveFindingPaths` calls (new entry + backfill loop)
- [ ] AC7: A test verifies that repeated calls with the same cache reuse glob results (glob called once per unique basename, not once per finding)
- [ ] AC8: A test verifies that calling `resolveFindingPaths` without a cache parameter still resolves paths correctly (default behavior preserved)
- [ ] AC9: All existing tests pass without modification (except the deleted assertion)
- [ ] Tests pass with `cd packages/cli && pnpm vitest run`
- [ ] No build errors from `pnpm run build`
- [ ] No lint errors from `pnpm run lint`

## Testing Strategy

- **Unit tests (cache reuse):** Create a temp directory with one unique file (e.g., `src/utils/helper.ts`). Create two items with the same unresolvable basename (`helper.ts`). Create a shared `Map`, call `resolveFindingPaths` twice (once per item array), assert both resolve correctly. Use `vi.spyOn` on the `glob` module's `globSync` to assert it was called exactly once for `**/helper.ts`. Restore the spy after.
- **Unit tests (default behavior):** Call `resolveFindingPaths` with only three arguments (no cache). Assert resolution still works via glob fallback — same setup as the existing "resolves basename via glob when modules_touched fails" test but explicitly omitting the fourth argument.
- **Edge cases:** The existing test suite covers null files, empty modules, ambiguous matches, path boundary checking, and node_modules/`.ana` exclusion. No new edge case tests needed — the cache doesn't change resolution logic, only whether `globSync` is called.

## Dependencies

None. All affected files exist on main.

## Constraints

- The `resolveFindingPaths` function is exported. The cache parameter must be optional with a default to preserve backward compatibility for all existing callers.
- The backfill loop's `|| []` at lines 844-845 must be preserved — historical JSON entries may lack `findings`, `build_concerns`, or `modules_touched` fields.

## Gotchas

- **Lines 828-829 vs 844-845.** The scope explicitly warns: only lines 828-829 lose the `|| []`. Lines 844-845 keep them. The difference: 828-829 operate on the freshly constructed `entry` object (guaranteed arrays), while 844-845 operate on `existing` entries deserialized from JSON (may lack fields).
- **Cache key is the basename string.** In `resolveFindingPaths`, the variable `basename` at line 348 is `item.file` — which could be a bare filename or a partial path. The cache key must be exactly this value, because the glob pattern is `'**/' + basename`. Two items with the same `item.file` value will produce the same glob — correct for caching. Two items with different `item.file` values that happen to share a filename but differ in partial path will NOT cache-collide — also correct.
- **JSDoc update.** `resolveFindingPaths` has a JSDoc block at lines 330-338. Add `@param globCache` documentation to match the existing `@param` tags. The eslint rules enforce `@param` on exported functions — pre-commit will reject missing tags.
- **`globSync` import.** `proofSummary.ts` already imports `globSync` from the `glob` package (verify the import exists before adding the cache logic). The spy in the test must target this same import.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags — pre-commit enforces this.
- Use `import type` for type-only imports, separate from value imports.
- Always use `--run` flag with vitest to avoid watch mode hang.

### Pattern Extracts

**Structural analog — glob cache in staleness loop (work.ts:900, 942-948):**
```typescript
const globResultCache = new Map<string, string[]>();

// ... inside loop:
const basename = path.basename(finding.file);
let matches = globResultCache.get(basename);
if (matches === undefined) {
  matches = globSync('**/' + basename, {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/.ana/**'],
  });
  globResultCache.set(basename, matches);
}
```

**Current resolveFindingPaths glob call (proofSummary.ts:354-361):**
```typescript
// Glob fallback: search the project filesystem for an unambiguous match
const globMatches = globSync('**/' + basename, {
  cwd: projectRoot,
  ignore: ['**/node_modules/**', '**/.ana/**'],
});
if (globMatches.length === 1) {
  item.file = globMatches[0]!;
}
```

### Checkpoint Commands

- After modifying `proofSummary.ts`: `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts` — Expected: all existing resolveFindingPaths tests pass
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: 1575 tests (1573 passed + 2 skipped), plus 2 new tests = 1577 total (1575 passed + 2 skipped)
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1573 passed, 2 skipped (1575 total)
- Current test files: 97
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected 1575 passed, 2 skipped (1577 total) in 97 test files
- Regression focus: `tests/utils/proofSummary.test.ts` (resolveFindingPaths tests), `tests/commands/artifact.test.ts` (saves.json test)

# Spec: Clean proofSummary.ts

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/clean-proofsummary/scope.md

## Approach

Three independent fixes to proofSummary.ts, each closing a diagnosed proof chain finding. Ordered by diff size: dead code deletion first (biggest, safest), type tightening second (compiler-guided), fileMatches fix third (needs new tests).

**Fix 1 — Delete `generateActiveIssuesMarkdown` and supporting dead code.** The function was created in entry #9, superseded by `generateDashboard` in entry #19. `generateDashboard` reimplements the same grouping logic inline — the comment at line 527 says "reuse generateActiveIssuesMarkdown logic" but it's copy-paste, not a call. Zero production imports. Delete the function, its interface (`ProofChainEntryForIndex`), its constant (`MAX_ACTIVE_ISSUES`), and its tests. Update the dangling comment in `generateDashboard`'s JSDoc.

**Fix 2 — Tighten `ProofSummary.result` type.** `parseResult` (line 188) already returns only `'PASS'`, `'FAIL'`, or `'UNKNOWN'` via regex match + default. The function body IS the union type — only the `string` signature lies. `ProofChainEntry` in `src/types/proof.ts:50` already has `result: 'PASS' | 'FAIL' | 'UNKNOWN'`. Aligning `ProofSummary.result` removes the cast in `work.ts:786`. Verified: all test fixtures use valid values (`'PASS'`).

**Fix 3 — Fix `fileMatches` false positives.** When both stored and queried paths have directory components, require full suffix match. `packages/a/census.ts` must NOT match `packages/b/census.ts`. The guard goes BEFORE the existing one-directory checks. Existing backward-compat cases (bare basename queries, legacy stored paths) are untouched.

## Output Mockups

No user-visible output changes. All three fixes are internal: dead code removal, type correctness, and matching precision. The only observable difference is `getProofContext` no longer returning false-positive findings when querying files in different directories with the same basename.

## File Changes

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:**
1. Delete lines 385–489: `ProofChainEntryForIndex` interface, `generateActiveIssuesMarkdown` function, `MAX_ACTIVE_ISSUES` constant (~105 lines)
2. Update `generateDashboard` JSDoc (line 527): remove reference to "generateActiveIssuesMarkdown logic" — replace with "grouped by file"
3. Change `result: string` → `result: 'PASS' | 'FAIL' | 'UNKNOWN'` in `ProofSummary` interface (line 40)
4. Change `parseResult` return type from `string` → `'PASS' | 'FAIL' | 'UNKNOWN'` (line 188)
5. Add both-directories guard to `fileMatches` between the basename check (line 1752) and the existing path-suffix checks (lines 1754–1758)

**Pattern to follow:** The existing `fileMatches` guard structure — early returns with comments explaining each tier.
**Why:** Dead code confuses contributors. Loose type hides behind a cast. False positives erode trust in proof context queries.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Remove `as ProofChainEntry['result']` cast at line 786. With `ProofSummary.result` tightened, the types align without a cast.
**Pattern to follow:** The surrounding code — `proof.result` is assigned directly.
**Why:** The cast is a symptom of the type being too loose. Once the type is correct, the cast is noise.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:**
1. Remove `generateActiveIssuesMarkdown` from the import statement (line 16)
2. Delete the entire `generateActiveIssuesMarkdown` describe block (lines 746–1068, ~322 lines)
3. Add new tests inside the existing `getProofContext` describe block for the fileMatches false-positive fix

**Pattern to follow:** The existing `getProofContext` tests (lines 1313–1429): `writeChain` helper, `baseEntry` fixture, temp dir setup/teardown.
**Why:** Dead function tests are dead tests. New tests verify the fix through the public API.

## Acceptance Criteria

- [ ] AC1: `generateActiveIssuesMarkdown` function is deleted from proofSummary.ts
- [ ] AC2: `ProofChainEntryForIndex` interface is deleted from proofSummary.ts
- [ ] AC3: `MAX_ACTIVE_ISSUES` constant is deleted from proofSummary.ts
- [ ] AC4: `generateActiveIssuesMarkdown` is not exported from proofSummary.ts
- [ ] AC5: `FindingWithFeature` interface is preserved (used by `generateDashboard`)
- [ ] AC6: `generateDashboard` is unchanged (except JSDoc comment update)
- [ ] AC7: `ProofSummary.result` type is `'PASS' | 'FAIL' | 'UNKNOWN'` not `string`
- [ ] AC8: `parseResult` return type is `'PASS' | 'FAIL' | 'UNKNOWN'` not `string`
- [ ] AC9: The `as ProofChainEntry['result']` cast at work.ts is removed
- [ ] AC10: `fileMatches` returns false when both paths have directories and neither is a suffix of the other (`packages/a/census.ts` vs `packages/b/census.ts`)
- [ ] AC11: `fileMatches` returns true when one path is a suffix of the other (`engine/census.ts` vs `packages/cli/src/engine/census.ts`)
- [ ] AC12: `fileMatches` returns true when queried is a bare basename against a stored full path (`census.ts` vs `packages/b/census.ts`) — backward compat
- [ ] AC13: `fileMatches` returns true when stored is a bare basename against a queried full path (legacy data compat)
- [ ] AC14: `generateActiveIssuesMarkdown` tests are deleted from proofSummary.test.ts
- [ ] AC15: New `getProofContext` tests cover the false-positive fix and backward compat cases
- [ ] AC16: All remaining tests pass. Build compiles without errors.

## Testing Strategy

- **Unit tests (delete):** Remove the `generateActiveIssuesMarkdown` describe block (lines 746–1068). Remove the import.
- **Unit tests (add):** Add tests inside the existing `getProofContext` describe block. Use the existing `writeChain` helper and `baseEntry` fixture pattern. Test matrix:

| Scenario | Stored path | Queried path | Expected |
|----------|------------|-------------|----------|
| Both have dirs, different parents | `packages/a/census.ts` | `packages/b/census.ts` | No match (false positive fix) |
| Both have dirs, suffix match | `engine/census.ts` | `packages/cli/src/engine/census.ts` | Match |
| Bare basename query → full stored | `packages/b/census.ts` | `census.ts` | Match (backward compat) |
| Full query → bare stored (legacy) | `census.ts` | `packages/cli/src/engine/census.ts` | Match (legacy compat) |
| Both have dirs, exact match | `packages/cli/src/engine/census.ts` | `packages/cli/src/engine/census.ts` | Match (exact) |

- **Type checking:** Run `tsc --noEmit` after the type tightening. All consumers already use valid values.
- **Regression:** Run full test suite. No test count decrease (net: delete ~15 tests, add ~5 = net decrease is expected and correct — dead tests are dead).

## Dependencies

None. All changes are internal to existing files.

## Constraints

- `FindingWithFeature` (line 378) must be preserved — `generateDashboard` uses it at lines 580, 609.
- `fileMatches` is private (not exported). Test only through `getProofContext`.
- The both-directories guard must go BEFORE existing one-directory checks, not replace them.
- Net test count will decrease (deleting ~15 dead tests, adding ~5 new tests). This is correct — dead tests are not coverage.

## Gotchas

- **`FindingWithFeature` looks like dead code.** It's adjacent to the dead function (line 378) but used by `generateDashboard` (lines 580, 609). Don't delete it.
- **Import removal.** `proofSummary.test.ts` line 16 imports `generateActiveIssuesMarkdown`. Removing the tests without removing the import causes an unused-import lint error. Removing the import without removing the tests causes a compile error. Do both together.
- **`generateDashboard` JSDoc.** Line 527 says "via generateActiveIssuesMarkdown logic" — this becomes a dangling reference after deletion. Update to just say "grouped by file."
- **fileMatches guard order.** The both-directories check MUST come before lines 1754–1758 (the one-directory checks). If placed after, it never fires because the one-directory checks match first. If placed instead of them, bare basename queries break.
- **Line numbers will shift.** After deleting ~105 lines of dead code (Fix 1), all subsequent line numbers in the file shift. Apply Fix 1 first, then locate the remaining targets by content, not line number.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always use `--run` with pnpm vitest to avoid watch mode hang.

### Pattern Extracts

**Existing `getProofContext` test pattern** (proofSummary.test.ts lines 1313–1331):
```typescript
describe('getProofContext', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'proof-context-test-'));
    await fs.promises.mkdir(path.join(tempDir, '.ana'), { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  function writeChain(entries: unknown[]): void {
    fs.writeFileSync(
      path.join(tempDir, '.ana', 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2),
    );
  }
```

**Existing `fileMatches` function** (proofSummary.ts lines 1744–1764):
```typescript
function fileMatches(stored: string, queried: string): boolean {
  // Exact match
  if (stored === queried) return true;

  const storedBasename = path.basename(stored);
  const queriedBasename = path.basename(queried);

  // Basenames must match for any non-exact match
  if (storedBasename !== queriedBasename) return false;

  // Path-suffix: stored (full path) ends with '/' + queriedBasename
  if (stored.includes('/') && stored.endsWith('/' + queriedBasename)) return true;

  // Path-suffix: queried (full path) ends with '/' + storedBasename
  if (queried.includes('/') && queried.endsWith('/' + storedBasename)) return true;

  // Basename match: stored has no '/' (legacy data)
  if (!stored.includes('/')) return true;

  return false;
}
```

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After Fix 1 (dead code deletion): `cd packages/cli && pnpm vitest run --run` — Expected: compiles, tests pass (count decreases by ~15)
- After Fix 2 (type tightening): `npx tsc --noEmit` — Expected: no errors
- After all changes: `cd packages/cli && pnpm vitest run --run` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1777 passed, 2 skipped (1779 total)
- Current test files: 93 passed (93)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1762+ passed (delete ~15 dead tests, add ~5 new tests)
- Regression focus: `proofSummary.test.ts` (modified), `work.test.ts` (type change may surface compile errors in fixtures — verified: all use valid `'PASS'` values)

# Spec: Fix Proof Chain Mechanical Accuracy

**Created by:** AnaPlan
**Date:** 2026-04-27
**Scope:** .ana/plans/active/fix-proof-chain-mechanical-accuracy/scope.md

## Approach

Three bugs produce 57% closure accuracy. All three share a root cause: the mechanical layer acts on assumptions instead of verifications. This spec replaces each assumption with a filesystem check, removes the mechanism that can't work without semantic judgment, and reopens everything the broken logic wrongly closed.

**Fix 1 — `resolveFindingPaths` semantic gate.** Replace the `includes('/')` syntactic gate with an `existsSync` gate. A file that exists at its declared path needs no resolution. A file that doesn't exist — whether it's a bare basename or a partial monorepo path — enters the resolution chain (suffix match on `modules_touched`, then glob fallback). The `projectRoot` parameter changes from optional to required. All call sites already provide it.

**Fix 2 — Staleness file-deleted check.** Replace the `includes('/')` gate in the staleness loop with `existsSync`. For findings where the file doesn't exist at the declared path, use glob to distinguish genuinely deleted files (0 matches → close) from ambiguous basenames (2+ matches → skip) and relocated files (1 match → skip). A `globResultCache` (`Map<string, string[]>`) prevents repeated glob calls for the same basename across findings.

**Fix 3 — Upstream exemption.** Skip findings with `category === 'upstream'` at the top of the staleness loop. Upstream observations are institutional memory — their value doesn't depend on file existence or anchor presence.

**Fix 4 — Remove supersession.** Delete the entire supersession block. The same-file + same-category heuristic can't distinguish same-issue from different-issue. 9 of 11 closures were wrong. Semantic deduplication belongs in a judgment layer.

**Fix 5 — Reopen wrongly-closed findings.** New loop between backfill and `resolveFindingPaths`. Reopens ALL findings where `closed_by === 'mechanical'` AND `closed_reason` matches a known-broken pattern: starts with `'superseded by'`, equals `'file removed'`, or equals `'code changed, anchor absent'` on upstream findings. This is a broad reopen — the corrected staleness checks re-run AFTER reopening and AFTER resolution, so anything genuinely stale gets correctly re-closed. Simpler and safer than building selective existence checks into the reopen logic.

**Fix 7A — Template path example.** Change the example path in the Callouts section from `src/utils/helper.ts:42` to `packages/cli/src/utils/helper.ts:42` with explicit repo-relative guidance.

**Fix 7B — Template duplicate guidance.** Add guidance near the proof context instruction about referencing existing active findings instead of creating duplicate observations.

**Execution order is load-bearing.** The restructured `writeProofChain` phases:
1. Backfill status (existing code, unchanged)
2. Reopen wrongly-closed findings (new)
3. `resolveFindingPaths` (existing calls, unchanged position)
4. Staleness checks with corrected logic (restructured)
5. No supersession phase (deleted)

A code comment documenting this ordering constraint must be present above the maintenance section.

## Output Mockups

No user-visible output changes. The proof chain summary line (`Chain: N runs · M active findings`) remains the same format. The mechanical difference: fewer wrongly-closed findings means `active findings` count may increase for projects with existing incorrect closures.

## File Changes

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** `resolveFindingPaths` gate replacement. Line 337's `if (item.file.includes('/')) continue;` becomes an `existsSync` check: if the file exists at `path.join(projectRoot, item.file)`, skip it. The `projectRoot` parameter changes from optional to required. The JSDoc updates to reflect the new gate semantics.
**Pattern to follow:** The existing resolution chain below the gate (suffix match at line 340, glob fallback at line 344) is unchanged — only the entry condition changes.
**Why:** The `includes('/')` gate skips partial monorepo paths like `src/types/contract.ts` (contains `/` but doesn't exist at that path) and processes bare basenames like `projectKind.ts` (no `/` but file is genuinely deleted). Both behaviors are wrong. The `existsSync` gate correctly distinguishes "file exists where declared" from "file needs resolution or is gone."

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Four changes in the `writeProofChain` function:

1. **Add `globSync` import** from the `glob` package (same import style as proofSummary.ts).

2. **Add reopen loop** after the backfill loop (after line ~864) and before the existing `resolveFindingPaths` calls. Iterates all existing entries' findings. Reopens findings matching known-broken mechanical closure patterns: `closed_by === 'mechanical'` AND (`closed_reason` starts with `'superseded by'` OR `closed_reason === 'file removed'` OR (`closed_reason === 'code changed, anchor absent'` AND `finding.category === 'upstream'`)). Reopen clears `status` back to `'active'` (or `'lesson'` if `category === 'upstream'`), and clears `closed_reason`, `closed_at`, `closed_by`.

3. **Restructure staleness loop** (lines 883–911). Replace the `finding.file.includes('/')` gate with:
   - Skip if `finding.category === 'upstream'` (upstream exemption)
   - Skip if no `finding.file`
   - Check `existsSync(path.join(projectRoot, finding.file))`
   - If file exists: run anchor-absent check (existing logic, unchanged)
   - If file does NOT exist: glob for the basename with the `globResultCache`. 0 matches → close as `'file removed'`. 1+ matches → skip (file exists elsewhere, conservative).

4. **Delete supersession block** (lines 915–935 entirely).

**Pattern to follow:** The existing `fileContentCache` pattern at line 869 for the new `globResultCache`. The existing staleness loop structure for the restructured checks.
**Why:** The current staleness gate (`includes('/')`) allows wrong closures on resolved paths and skips genuinely deleted basenames. The supersession heuristic is 18% accurate.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Update existing `resolveFindingPaths` tests and add new ones for the semantic gate:
- The existing "skips files already containing path separator" test (line 1159) must change — the gate is no longer `/` presence. Replace with a test that creates a file at the declared path in a temp directory and verifies it's skipped.
- Add test: file with `/` in path that does NOT exist at `projectRoot` enters resolution (the monorepo partial-path case from AC1).
- Add test: bare basename where file genuinely doesn't exist still enters resolution (existing behavior preserved).
- All `resolveFindingPaths` tests that don't use the glob fallback must now provide `projectRoot` (required parameter). For the pure suffix-match tests, pass a temp dir or any valid directory — the gate checks `existsSync` which needs a real `projectRoot`.
**Pattern to follow:** The existing glob fallback test structure (lines 1192–1244) — `beforeEach`/`afterEach` with `fs.promises.mkdtemp`/`rm`, real files on disk.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Update and add staleness tests:
- **Update supersession test** (line 1295): Flip expectations — the older finding should remain active (not closed), the newer finding should also be active. Rename test to "does not supersede findings on same file+category".
- **Add test:** Finding with `file: 'src/types/contract.ts'` in a project where the actual file is at a different location (e.g., `packages/cli/src/types/contract.ts`) — file is NOT closed as "file removed" (AC1).
- **Add test:** Finding with `file: 'deleted-basename.ts'` (bare basename, file genuinely doesn't exist anywhere) — IS closed as "file removed" (AC2).
- **Add test:** Finding with `file: 'index.ts'` where 5+ files named `index.ts` exist — NOT closed (AC3, ambiguous basename conservative).
- **Add test:** Finding with `category: 'upstream'` and a non-existent file — NOT subject to staleness checks, stays as `lesson` (AC4).
- **Add test:** Reopen loop — set up a chain with findings closed by `'mechanical'` with `closed_reason: 'superseded by X'`, verify they're reopened to `'active'` after `completeWork` (AC6).
**Pattern to follow:** The existing staleness test structure (lines 1214–1336) — `createProofProject` with `existingChain: true`, patch `proof_chain.json` directly, call `completeWork`, assert on updated chain state.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Two changes:
1. **Fix 7A (line 323):** Change `src/utils/helper.ts:42` to `packages/cli/src/utils/helper.ts:42`. Add clarifying note about repo-relative paths in the surrounding prose if not already clear.
2. **Fix 7B (near line 98):** After the `ana proof context` instruction, add guidance that when a verifier discovers an issue already documented in the proof chain, they should reference the existing finding rather than creating a duplicate observation. Something like: "If your finding matches an active proof chain issue, reference it (e.g., 'still present — see {finding-id}') rather than re-describing it. This counts toward the minimum callout requirement."
**Pattern to follow:** Existing template prose style — imperative, concise.
**Why:** Misleading path examples cause verifiers to emit bare basenames, which degrade proof chain data quality. Duplicate observations create noise for Foundation 2.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Identical changes as the template file above. Copy the template file to this location after modifying it.
**Pattern to follow:** These two files must be identical. Apply the same edits or copy one to the other.
**Why:** The dogfood copy must stay in sync with the template.

## Acceptance Criteria

- [ ] AC1: A finding with `file: 'src/types/contract.ts'` in a monorepo where the actual file is at `packages/cli/src/types/contract.ts` is NOT closed as "file removed"
- [ ] AC2: A finding with `file: 'projectKind.ts'` (bare basename, file genuinely deleted) IS closed as "file removed" when glob returns 0 matches
- [ ] AC3: A finding with `file: 'index.ts'` where glob returns 5+ matches is NOT closed (ambiguous basename, conservative)
- [ ] AC4: A finding with `category: 'upstream'` is never subject to file-deleted or anchor-absent staleness checks, regardless of file or anchor state
- [ ] AC5: No supersession closures occur — the supersession code is removed entirely
- [ ] AC6: Previously wrongly-closed findings (superseded, file-removed-but-exists, upstream-closed) are reopened before corrected staleness re-runs
- [ ] AC7: `resolveFindingPaths` uses `existsSync` gate instead of `includes('/')` — files that exist at declared path are skipped, files that don't exist enter resolution (suffix match, then glob fallback)
- [ ] AC8: Anchor-absent checks only run on files verified to exist at the declared path via `existsSync`
- [ ] AC9: The verify template's path example is corrected from `src/utils/helper.ts:42` to `packages/cli/src/utils/helper.ts:42` with explicit repo-relative vs package-relative distinction
- [ ] AC10: The verify template includes guidance to reference existing active findings instead of creating duplicate observations
- [ ] AC11: Both template (`packages/cli/templates/.claude/agents/ana-verify.md`) and dogfood (`.claude/agents/ana-verify.md`) copies are updated identically
- [ ] AC12: Tests pass with `cd packages/cli && pnpm vitest run`
- [ ] AC13: No build errors — `pnpm run build` succeeds
- [ ] AC14: All existing staleness tests updated to reflect corrected behavior

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** Test `resolveFindingPaths` semantic gate in isolation. Each test creates real files in a temp directory. Tests: file exists at declared path → skipped; file has `/` but doesn't exist → enters resolution; bare basename → enters resolution; `projectRoot` required (all calls provide it).
- **Integration tests (work.test.ts):** Test full `writeProofChain` flow through `completeWork`. Each staleness scenario uses `createProofProject` with `existingChain: true`, patches the chain JSON, and asserts on the written result. Tests cover: monorepo partial path not closed, deleted basename closed, ambiguous basename not closed, upstream exempt, no supersession, reopen loop.
- **Edge cases:** Finding with `file: null` still skipped (existing test preserved). Finding already closed by `'manual'` not reopened. Multiple findings on same basename share glob cache (implicit — no direct test, but cache prevents incorrect behavior on repeated calls).

## Dependencies

None. All changes are within the existing codebase. `glob` package already imported in proofSummary.ts; needs import added in work.ts.

## Constraints

- The `existsSync` gate and glob calls operate on the filesystem, not git. Sparse checkout edge case accepted per scope decision.
- Glob ignore list (`node_modules`, `.ana`) must match the existing pattern in `resolveFindingPaths`.
- Reopen logic must be idempotent — running `completeWork` twice on an already-corrected chain should produce the same result.

## Gotchas

- **Execution order.** Reopen MUST happen before `resolveFindingPaths` and before staleness. If staleness runs first on still-closed findings, it skips them. Then reopens activate them. Then they never get checked by corrected logic. The phases are: backfill → reopen → resolve → stale. A code comment documenting this is required.
- **`projectRoot` is required now.** The `resolveFindingPaths` signature changes from `projectRoot?: string` to `projectRoot: string`. The function is called in two locations (lines 828 and 844), both already provide `projectRoot`. But the type change will cause a build error if any future call site omits it — which is the correct behavior.
- **Existing test expects `/` gate behavior.** The test "skips files already containing path separator" at proofSummary.test.ts:1159 will fail because the gate logic changed. This test must be rewritten to test the new `existsSync` gate.
- **Supersession test expectations flip.** The test at work.test.ts:1295 currently expects `closed_reason` to contain `'superseded'`. After removing supersession, both findings should be active. The test name and all assertions must change.
- **`globSync` import in work.ts.** Import from `'glob'` (not `'node:glob'`). Match the import style in proofSummary.ts line 11: `import { globSync } from 'glob';`
- **Reopen clears all closure fields.** When reopening, set `status` to `'active'` (or `'lesson'` if upstream), and clear `closed_reason`, `closed_at`, `closed_by` to `undefined`. Don't use `delete` — set explicitly so the JSON serialization is clean.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions for relative imports; `node:` prefix for built-ins. `glob` is a package import — no extension.
- `import type` separate from value imports.
- Explicit return types on exported functions. `resolveFindingPaths` already has `: void`.
- Early returns over nested conditionals in the staleness loop.
- `@param` and `@returns` JSDoc on exported functions — update `resolveFindingPaths` JSDoc for new `projectRoot` semantics.
- Always pass `--run` with `pnpm vitest` to avoid watch mode hang.
- Test behavior not implementation — assert on chain state after `completeWork`, not on internal function calls.
- Temp directory pattern: `fs.promises.mkdtemp` in `beforeEach`, `fs.promises.rm` in `afterEach`.

### Pattern Extracts

**Existing staleness loop structure (work.ts:883–911):**
```typescript
  for (const chainEntry of allEntries) {
    for (const finding of chainEntry.findings || []) {
      // Skip already-closed findings
      if (finding.status === 'closed') continue;

      // AC6: File-deleted check
      if (finding.file && finding.file.includes('/')) {
        const fullPath = path.join(projectRoot, finding.file);
        if (!fs.existsSync(fullPath)) {
          finding.status = 'closed';
          finding.closed_reason = 'file removed';
          finding.closed_at = new Date().toISOString();
          finding.closed_by = 'mechanical';
          autoClosed++;
          continue;
        }

        // AC7: Anchor-absent check
        if (finding.anchor) {
          const content = readFileContent(fullPath);
          if (content !== null && !content.includes(finding.anchor)) {
            finding.status = 'closed';
            finding.closed_reason = 'code changed, anchor absent';
            finding.closed_at = new Date().toISOString();
            finding.closed_by = 'mechanical';
            autoClosed++;
          }
        }
      }
    }
  }
```

**Existing `resolveFindingPaths` gate (proofSummary.ts:335–337):**
```typescript
  for (const item of items) {
    if (!item.file) continue;
    if (item.file.includes('/')) continue;
```

**Existing fileContentCache pattern (work.ts:869–881):**
```typescript
  const fileContentCache = new Map<string, string | null>();

  const readFileContent = (filePath: string): string | null => {
    if (fileContentCache.has(filePath)) return fileContentCache.get(filePath)!;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContentCache.set(filePath, content);
      return content;
    } catch {
      fileContentCache.set(filePath, null);
      return null;
    }
  };
```

**Existing staleness test pattern (work.test.ts:1214–1231):**
```typescript
      it('closes findings for deleted files', async () => {
        await createProofProject('test-feature', { existingChain: true });

        const chainPath = path.join(tempDir, '.ana', 'proof_chain.json');
        const chain = JSON.parse(fsSync.readFileSync(chainPath, 'utf-8'));
        chain.entries[0].findings = [
          { id: 'old-C1', category: 'code', summary: 'Issue', file: 'src/deleted-file.ts', anchor: null },
        ];
        fsSync.writeFileSync(chainPath, JSON.stringify(chain));

        await completeWork('test-feature');

        const updated = JSON.parse(fsSync.readFileSync(chainPath, 'utf-8'));
        expect(updated.entries[0].findings[0].status).toBe('closed');
        expect(updated.entries[0].findings[0].closed_reason).toBe('file removed');
        expect(updated.entries[0].findings[0].closed_by).toBe('mechanical');
      });
```

**Existing `resolveFindingPaths` test with filesystem (proofSummary.test.ts:1192–1211):**
```typescript
  describe('glob fallback', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'finding-glob-test-'));
    });

    afterEach(async () => {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    it('resolves basename via glob when modules_touched fails', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'src', 'utils'), { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, 'src', 'utils', 'helper.ts'), '');

      const items = [{ file: 'helper.ts' }];
      resolveFindingPaths(items, [], tempDir);
      expect(items[0]!.file).toBe('src/utils/helper.ts');
    });
```

### Checkpoint Commands

- After `resolveFindingPaths` gate change: `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts --run` — Expected: proofSummary tests pass (update the `/` gate test first)
- After staleness restructure + reopen + supersession removal: `cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run` — Expected: work tests pass (update supersession test first)
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: 1529+ tests pass, 0 failures
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1529 passed, 2 skipped (97 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1541+ tests (12 new) in 97 test files
- Regression focus: `tests/commands/work.test.ts` (staleness and supersession tests change), `tests/utils/proofSummary.test.ts` (`resolveFindingPaths` gate tests change)

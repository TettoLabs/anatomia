# Spec: Delete backward-compatibility code

**Created by:** AnaPlan
**Date:** 2026-04-30
**Scope:** .ana/plans/active/delete-backward-compat/scope.md

## Approach

Pure deletion. Every change removes dead code — migration logic that matches zero data, a reopen loop that actively churns findings, regex branches that never match, guards for states that no longer exist. The 4 backward-compat test files test a schema through migration paths with zero production callers. Delete them.

The `for...of chain.entries` loop in `writeProofChain` currently does migration AND `resolveFindingPaths`. After deleting migration, the loop body is just the two `resolveFindingPaths` calls — keep the loop.

The 6-line phase ordering comment (lines 879-884) gets deleted entirely. After removing backfill and reopen, the remaining flow is "resolve paths, then check staleness" — obvious from reading the code.

`lessonsClassified` is only incremented inside the status backfill block being deleted. The variable, its condition, and the `lessons_classified` field on `ProofChainStats.maintenance` are all dead after deletion.

## Output Mockups

No user-visible output changes. `work complete` produces identical output — the deleted code ran silently. The only observable difference: `work complete` no longer reopens 5 findings every run (the reopen→re-close churn disappears from proof_chain.json).

## File Changes

### `src/commands/work.ts` (modify)
**What changes:** Delete the migration block (lines 839-877: callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion). Delete the reopen-wrongly-closed loop (lines 886-904). Delete the phase ordering comment (lines 879-884). Delete `lessonsClassified` declaration (line 836). Simplify the maintenance stats condition (line 1001) to `if (autoClosed > 0)` and remove `lessons_classified` from the maintenance object.
**Pattern to follow:** The staleness check loop (lines 906-972) shows the surviving pattern — iterate entries, process findings, skip closed/upstream.
**Why:** The migration block runs 6 checks that match zero data on every `work complete`. The reopen loop actively harms the proof chain — it reopens 5 findings that get immediately re-closed by staleness.

### `src/utils/proofSummary.ts` (modify)
**What changes:** Two changes. (1) In `parseFindings` (line 1207): replace regex `## (?:Callouts|Findings)` with `## Findings`. Update the comment on line 1206 to remove "backward compatible" language. Update the docstring at line 1190 from "Callouts section" to "Findings section." (2) In `generateActiveIssuesMarkdown` (line 417-418): replace the backward-compat guard `if (finding.status && finding.status !== 'active') continue` with explicit check `if (finding.status !== 'active') continue`. Remove the comment on line 414.
**Pattern to follow:** Other filter conditions in the same file use explicit equality checks without undefined guards.
**Why:** The `Callouts` regex branch can never match on new reports. The undefined guard protects against a state (missing status) that no longer exists after migrations completed.

### `src/engine/types/index.ts` (modify)
**What changes:** Delete or rewrite the comment at line 120. Current text: "AnalysisResultSchema retained for backward-compat tests that validate the shape." After deleting those tests, the comment is wrong. Replace with a note that the schema is used by `types.test.ts` and `parsed-integration.test.ts` for shape validation.
**Pattern to follow:** The comment on line 119 ("validateAnalysisResult DELETED — S20 cleanup") provides context on the previous deletion — follow same style.
**Why:** Stale comment would mislead future agents into thinking the schema exists for backward-compat tests that no longer exist.

### `src/commands/scan.ts` (modify)
**What changes:** Delete the re-export at lines 466-467 (the `export { getLanguageDisplayName, getFrameworkDisplayName, getPatternDisplayName }` with its backward-compat comment).
**Pattern to follow:** N/A — pure deletion.
**Why:** The re-export exists solely for `scan.test.ts` backward compatibility. After fixing the test import, the re-export is dead.

### `tests/commands/scan.test.ts` (modify)
**What changes:** Change the import on lines 14-18 from `../../src/commands/scan.js` to `../../src/utils/displayNames.js`. The imported symbols (`getLanguageDisplayName`, `getFrameworkDisplayName`, `getPatternDisplayName`) are defined in `displayNames.ts`.
**Pattern to follow:** The `fileCounts` import on line 13 already imports directly from `../../src/utils/fileCounts.js` — same pattern.
**Why:** After deleting the re-export from scan.ts, the test must import from the source module.

### `src/types/proof.ts` (modify)
**What changes:** Remove `lessons_classified` from the `maintenance` type on `ProofChainStats`. The type becomes `maintenance?: { auto_closed: number }`.
**Pattern to follow:** N/A — field deletion.
**Why:** `lessonsClassified` is only incremented inside the status backfill being deleted. The field is always 0 after this change — dead type.

### `tests/engine/backward-compat.test.ts` (delete)
### `tests/engine/parsed-backward-compat.test.ts` (delete)
### `tests/engine/patterns-backward-compat.test.ts` (delete)
### `tests/engine/structure-backward-compat.test.ts` (delete)
**Why:** All four test `AnalysisResultSchema` through migration paths with zero production callers. `types.test.ts` and `parsed-integration.test.ts` cover the schema adequately.

## Acceptance Criteria

- [ ] AC1: `work complete` no longer iterates existing entries for migration purposes (callouts rename, status backfill, severity migration, scope_summary backfill, seal_commit deletion all removed)
- [ ] AC2: The reopen-wrongly-closed loop is deleted — no code checks `closed_by === 'mechanical'` to reopen findings
- [ ] AC3: `parseFindings` matches `## Findings` only, not `## (?:Callouts|Findings)`
- [ ] AC4: The undefined backward-compat guard on finding status in `generateActiveIssuesMarkdown` is removed — status is always checked explicitly
- [ ] AC5: The 4 backward-compat test files are deleted (418 lines total)
- [ ] AC6: `scan.ts` no longer re-exports display name functions; `scan.test.ts` imports from `displayNames.js` directly
- [ ] AC7: The backward-compat comment on `AnalysisResultSchema` is rewritten to reflect actual purpose
- [ ] AC8: `work complete` still runs `resolveFindingPaths` and staleness checks on existing entries (the legitimate parts)
- [ ] AC9: All remaining tests pass
- [ ] AC10: Build compiles
- [ ] AC11: Lint passes
- [ ] AC12: Test count decreases (this is correct — tests for unused code are not testing anything)
- [ ] AC13: The `lessonsClassified` counter is deleted — maintenance stats condition simplified to `autoClosed > 0` only, `lessons_classified` removed from the maintenance object and `ProofChainStats` type

## Testing Strategy

- **Unit tests:** No new tests. This is pure deletion — the existing test suite validates that surviving code still works. The 4 deleted test files covered migration paths with zero callers.
- **Integration tests:** The `work complete` integration tests in `tests/commands/work.test.ts` exercise `writeProofChain` end-to-end. They must still pass after deletion.
- **Edge cases:** None — edge cases are being deleted, not added.

## Dependencies

None. All changes are self-contained deletions.

## Constraints

- `resolveFindingPaths` calls on existing entries must survive — they do legitimate path resolution.
- Staleness checks must survive — they check current filesystem state.
- `AnalysisResultSchema` must survive — `types.test.ts` and `parsed-integration.test.ts` use it.

## Gotchas

- The `for...of chain.entries` loop at line 839 must NOT be deleted — after removing migration code, it still contains the `resolveFindingPaths` calls (lines 847-848). Delete the migration lines INSIDE the loop, keep the loop and its path resolution calls.
- The `lessonsClassified` variable at line 836 is declared between `autoClosed` (line 835) and the loop (line 838). Delete the `lessonsClassified` line, keep `autoClosed`.
- When simplifying the maintenance condition at line 1001, the entire `maintenance` object shape changes — it drops `lessons_classified`. The type in `src/types/proof.ts` must match.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.

### Pattern Extracts

The staleness loop (the surviving pattern after deletion) — `src/commands/work.ts` lines 906-932:
```typescript
  // Staleness checks — run after path resolution, reopen, and status assignment
  // Process all entries (existing + new)
  const allEntries = [...chain.entries, entry];
  const fileContentCache = new Map<string, string | null>();
  const globResultCache = new Map<string, string[]>();

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

  for (const chainEntry of allEntries) {
    for (const finding of chainEntry.findings || []) {
      // Skip already-closed findings
      if (finding.status === 'closed') continue;

      // Upstream findings are institutional memory — not subject to staleness
      if (finding.category === 'upstream') continue;
```

The scan.test.ts import pattern to follow — line 13:
```typescript
import { countFiles, formatNumber } from '../../src/utils/fileCounts.js';
```

### Proof Context

**work.ts** — The "severity migration does not handle unexpected old values" finding is about code being deleted. The "AC4 backfill has no integration test" build concern is about code being deleted. Both resolve themselves with this change.

**proofSummary.ts** — No findings directly relevant to the two lines being changed.

### Checkpoint Commands

- After deleting migration block in work.ts: `cd packages/cli && pnpm vitest run tests/commands/work.test.ts --run` — Expected: work tests pass
- After fixing scan.test.ts import: `cd packages/cli && pnpm vitest run tests/commands/scan.test.ts --run` — Expected: scan tests pass
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: 93 test files pass (97 - 4 deleted)
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1733 passed, 2 skipped across 97 test files
- Command used: `cd packages/cli && pnpm vitest run`
- After build: 93 test files, test count decreases by the number of tests in the 4 deleted files
- Regression focus: `tests/commands/work.test.ts` (exercises writeProofChain), `tests/commands/scan.test.ts` (import path change)

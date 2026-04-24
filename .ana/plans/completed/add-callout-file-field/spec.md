# Spec: Add file field to proof chain callouts

**Created by:** AnaPlan
**Date:** 2026-04-23
**Scope:** .ana/plans/active/add-callout-file-field/scope.md

## Approach

Store `file: string | null` on each callout at parse time. The renderer reads the field directly — no defensive fallback, no re-derivation via `extractFileRefs()`.

Four cross-cutting type locations must be updated (documented in `types/proof.ts:16-21`):
1. `ProofChainEntry.callouts` in `types/proof.ts`
2. `ProofSummary.callouts` in `utils/proofSummary.ts` (independently defined, same shape)
3. `CalloutWithFeature` in `utils/proofSummary.ts`
4. `ProofChainEntryForIndex.callouts` in `utils/proofSummary.ts`

`parseCallouts()` calls `extractFileRefs()` inside `flushCallout()` on the assembled summary and stores the first match (or null). `generateActiveIssuesMarkdown()` switches from `extractFileRefs(callout.summary)` to reading `callout.file`. A one-time migration script backfills `.ana/proof_chain.json`.

Trust the field unconditionally. `parseCallouts` is the only producer. `work.ts` passes `proof.callouts` through unchanged. The data file is backfilled. No old-format entries survive.

## Output Mockups

No user-visible output changes. The Active Issues markdown renders identically — the grouping source changes from runtime regex to stored field, but the output is the same.

## File Changes

### packages/cli/src/types/proof.ts (modify)
**What changes:** `ProofChainEntry.callouts` type gains `file: string | null` on each element.
**Pattern to follow:** The cross-cutting comment at lines 16-21 documents the update process. Follow it.
**Why:** This is the canonical type. All consumers downstream reference it.

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** Four updates in this file:
1. `ProofSummary.callouts` (line 70) — add `file: string | null` to the element type.
2. `parseCallouts()` (line 406-466) — inside `flushCallout()`, after assembling the summary, call `extractFileRefs(summary)` and store the first match as `file` (or null). Update the return type annotation to include `file`.
3. `CalloutWithFeature` (line 270-274) — add `file: string | null`.
4. `ProofChainEntryForIndex.callouts` (line 279-283) — add `file: string | null` to the element type.
5. `generateActiveIssuesMarkdown()` (lines 340-357) — replace the `extractFileRefs(callout.summary)` call with a read of `callout.file`. The grouping logic simplifies: `callout.file` is the key (null → "General"), no regex call needed.

**Pattern to follow:** The existing `flushCallout()` accumulator pattern — add the `extractFileRefs` call right before the `results.push()`.
**Why:** This is the disease — file association is derived repeatedly instead of stored once. Fixing it here means downstream features (proof file queries, learn matching, resolution detection) get the field for free.

### packages/cli/tests/utils/proofSummary.test.ts (modify)
**What changes:** Two categories of test updates:
1. `parseCallouts` tests (10 tests) — add `file` assertions to tests that check parsed output. Tests that check `.toHaveLength(0)` or `.toBeLessThanOrEqual(200)` don't need `file` assertions.
2. `generateActiveIssuesMarkdown` tests (15 tests) — add `file: string | null` to every inline callout object. The field value should match what `extractFileRefs` would return for that summary — e.g., `{ category: 'code', summary: 'Dead logic in projectKind.ts:105', file: 'projectKind.ts' }`.

**Pattern to follow:** Existing test structure. Each inline callout object is `{ category, summary }` — becomes `{ category, summary, file }`.
**Why:** Tests must exercise the new field and verify the renderer uses it correctly.

### .ana/proof_chain.json (modify)
**What changes:** Every callout in every entry gets a `file` field. Run `extractFileRefs` logic mentally (or via script) on each summary to determine the value. Callouts without file refs get `file: null`.
**Why:** No backward compatibility — we migrate once and only support the new format.

### Migration script (create, then delete)
**What changes:** A one-time Node script that reads `proof_chain.json`, runs `extractFileRefs` on each callout summary, adds `file`, and writes back. Run it, commit the result, delete the script.
**Why:** Mechanical backfill of 21 callouts across 8 entries. The script is throwaway — committed result is what matters.

## Acceptance Criteria

- [ ] AC1: `parseCallouts()` returns `Array<{ category: string; summary: string; file: string | null }>` — file is the first file ref from the summary text, or null when no file ref is found.
- [ ] AC2: `ProofChainEntry.callouts` type includes `file: string | null`.
- [ ] AC3: `generateActiveIssuesMarkdown()` groups callouts by `callout.file` (falling back to "General" when null) instead of calling `extractFileRefs()`.
- [ ] AC4: `.ana/proof_chain.json` entries are backfilled — every existing callout has a `file` field.
- [ ] AC5: All existing `parseCallouts` and `generateActiveIssuesMarkdown` tests pass with updated assertions.
- [ ] AC6: `extractFileRefs` remains exported and its tests unchanged.
- [ ] AC7: No build errors (`pnpm run build`).
- [ ] AC8: All proofSummary tests pass (`cd packages/cli && pnpm vitest run`).

## Testing Strategy

- **Unit tests (parseCallouts):** Existing 10 tests get `file` assertions where they check parsed output. Add 2 new tests: one verifying `file` is the first ref when multiple files appear in summary, one verifying `file` is null when no file ref exists. These are the core behavioral assertions.
- **Unit tests (generateActiveIssuesMarkdown):** Existing 15 tests get `file` field on inline callout objects. No new tests needed — the grouping behavior is already tested, only the source of truth changes.
- **extractFileRefs tests:** Unchanged. The function is reused, not rewritten.
- **Edge cases:** Callout with no file refs → `file: null` → grouped under "General". Callout with multiple file refs → `file` is the first one. Both match current behavior.

## Dependencies

None. All referenced functions and types exist.

## Constraints

- `extractFileRefs` must remain exported and unchanged — other consumers may use it.
- `ProofSummary.callouts` and `ProofChainEntry.callouts` must stay in sync. They're independently defined.
- The `work.ts` callout pass-through (line 790: `callouts: proof.callouts`) works without changes because it copies the full object.

## Gotchas

- **Two independent callout type definitions.** `ProofSummary.callouts` (proofSummary.ts:70) and `ProofChainEntry.callouts` (types/proof.ts:42) define the same shape independently. The cross-cutting comment in `types/proof.ts` only mentions `ProofChainEntry`. Both must be updated.
- **~15 inline callout objects in generateActiveIssuesMarkdown tests.** Every `{ category, summary }` literal needs `file` added. Miss one and TypeScript won't catch it — the test constructs plain objects, not typed ones. Grep for `category:.*summary:` in the test file to find them all.
- **`CalloutWithFeature` also needs `file`.** It's used internally by the renderer to carry feature context. The `file` field flows from the input callout through to `CalloutWithFeature` during the loop at line 304.
- **Migration script output must be valid JSON.** Use `JSON.stringify(data, null, 2)` with a trailing newline to match the existing file format.

## Build Brief

### Rules That Apply
- All local imports use `.js` extensions. `import { extractFileRefs } from './proofSummary.js'` if needed (it's already in the same file).
- Use `import type` for type-only imports, separate from value imports.
- `| null` for fields that were checked and found empty (not `?:` optional).
- Explicit return types on exported functions.
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

**flushCallout() — where file extraction goes (proofSummary.ts:419-425):**
```typescript
  const flushCallout = () => {
    if (currentCategory && currentSummary.length > 0) {
      const summary = currentSummary.join(' ').trim().substring(0, 200).trim();
      if (summary) results.push({ category: currentCategory, summary });
    }
    currentSummary = [];
  };
```

**generateActiveIssuesMarkdown grouping — what gets simplified (proofSummary.ts:342-357):**
```typescript
  for (const callout of cappedCallouts) {
    const fileRefs = extractFileRefs(callout.summary);

    if (fileRefs.length === 0) {
      // No file refs → General
      const existing = fileGroups.get('General') || [];
      existing.push(callout);
      fileGroups.set('General', existing);
    } else {
      // Assign to first file only (dedup). Cross-references are preserved
      // in the summary text — the other files are still mentioned.
      const primaryFile = fileRefs[0]!;
      const existing = fileGroups.get(primaryFile) || [];
      existing.push(callout);
      fileGroups.set(primaryFile, existing);
    }
  }
```

**Cross-cutting type comment (types/proof.ts:16-21):**
```typescript
 * CROSS-CUTTING: Adding a field requires changes in 4+ locations:
 *   1. Type definition below
 *   2. Default in generateProofSummary() (utils/proofSummary.ts)
 *   3. Entry construction in writeProofChain() (commands/work.ts)
 *   4. Display in formatHumanReadable() or formatListTable() (commands/proof.ts)
 * Old entries in proof_chain.json may lack new fields — consumers must handle undefined.
```

### Checkpoint Commands

- After type changes compile: `pnpm run build` — Expected: clean build, no errors
- After all source changes: `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts` — Expected: 55+ tests pass (53 existing + 2 new)
- Full suite: `cd packages/cli && pnpm vitest run` — Expected: all tests pass, no regressions
- Lint: `pnpm run lint`

### Build Baseline
- Current tests in proofSummary.test.ts: 53 passing
- Current test files: 1 (proofSummary.test.ts)
- Command used: `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts`
- After build: expected 55+ tests (53 existing + 2 new for file field extraction)
- Regression focus: `generateActiveIssuesMarkdown` tests — they construct callout objects that must gain `file` field

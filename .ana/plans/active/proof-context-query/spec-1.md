# Spec: Resolve callout file paths at write time

**Created by:** AnaPlan
**Date:** 2026-04-24
**Scope:** .ana/plans/active/proof-context-query/scope.md

## Approach

Callout `file` fields currently store basenames (`census.ts`) because `extractFileRefs` extracts basenames from summary text. For customer repos with hundreds of files sharing the same basename, this makes any downstream query return wrong results.

The fix: in `writeProofChain()`, cross-reference each callout's basename against `modules_touched` (which stores full relative paths from `git diff`). When exactly one module ends with that basename at a path boundary, upgrade the file field to the full path. Apply the same logic to `build_concerns`.

Extract a `resolveCalloutPaths` function to `proofSummary.ts`. It applies to both callouts and build concerns, for both new and existing entries. The function is idempotent — files already containing `/` are skipped. This means running resolution on ALL entries before writing handles backfill automatically, since the entire chain is rewritten on every `writeProofChain()` call.

Four of twelve current entries have `modules_touched` data. Those four will get their callout files resolved on the next write. The other eight have empty `modules_touched` — no resolution possible, callouts stay as basenames.

## Output Mockups

No user-facing output changes from this spec. The observable effect is in `proof_chain.json` data:

Before:
```json
{
  "callouts": [
    { "id": "drizzle-C1", "category": "code", "file": "census.ts", "summary": "...", "anchor": null }
  ],
  "modules_touched": ["packages/cli/src/engine/census.ts", "packages/cli/src/engine/scan-engine.ts"]
}
```

After resolution:
```json
{
  "callouts": [
    { "id": "drizzle-C1", "category": "code", "file": "packages/cli/src/engine/census.ts", "summary": "...", "anchor": null }
  ]
}
```

PROOF_CHAIN.md headings change from `## census.ts` to `## packages/cli/src/engine/census.ts`. This is a positive consequence — `generateActiveIssuesMarkdown` uses `callout.file` as the grouping key, so full paths produce unambiguous headings.

## File Changes

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** Add exported `resolveCalloutPaths` function. Takes an array of `{ file: string | null }` objects and an array of module paths. For each item where `file` is non-null and contains no `/`, finds matching modules using path-boundary check (`module.endsWith('/' + file)`). If exactly one match, replaces `file` with the full path. Mutates in place.
**Pattern to follow:** `extractFileRefs` in the same file — same domain (file reference operations), same export style, same JSDoc conventions.
**Why:** Extracted because it's called for callouts AND build_concerns, for the new entry AND existing entries. Without extraction, the same logic appears 3 times in `writeProofChain`.

### packages/cli/src/commands/work.ts (modify)
**What changes:** In `writeProofChain()`, after constructing the new entry and before `chain.entries.push(entry)`: (1) resolve the new entry's callouts and build_concerns against its `modules_touched`, (2) resolve ALL existing entries' callouts and build_concerns against their own `modules_touched`. The resolution is idempotent so re-resolving already-resolved entries is a no-op.
**Pattern to follow:** The existing `modulesTouched` read block at lines 764-775 — same style of guarded access with fallback.
**Why:** Write-time resolution fixes the data at the source. All downstream consumers (Active Issues, proof context query in spec-2) benefit without any per-consumer logic.

### packages/cli/tests/utils/proofSummary.test.ts (modify)
**What changes:** Add test suite for `resolveCalloutPaths`. Tests: single match resolves, zero match stays, 2+ match stays, file with `/` already skipped, null file skipped, build_concerns resolved same as callouts.
**Pattern to follow:** Existing `extractFileRefs` tests in the same file — direct function tests, no temp dirs needed since the function operates on in-memory data.
**Why:** The resolution function is the core logic. Unit tests verify all branches independently of `writeProofChain`.

## Acceptance Criteria
- [x] AC1: When a callout's `file` is a basename matching exactly one `modules_touched` entry, the stored `file` is upgraded to the full relative path
- [x] AC2: When a basename matches zero or 2+ `modules_touched` entries, the `file` stays as-is
- [x] AC3: Build concern file fields are resolved using the same logic as callouts
- [x] AC4: Existing proof chain entries with `modules_touched` have their callout files resolved on the next `writeProofChain` call (backfill)
- [x] Tests pass with `pnpm vitest run` from `packages/cli`
- [x] No build errors from `pnpm run build`

## Testing Strategy
- **Unit tests:** Test `resolveCalloutPaths` directly in `proofSummary.test.ts`. Cover: single match resolves to full path, zero matches leaves basename, multiple matches leaves basename, file already containing `/` is skipped, null file is skipped, empty modules_touched array. Also test build_concerns array with the same function.
- **Edge cases:** Callout with `file: null`, entry without `build_concerns` field (older entries), entry with empty `modules_touched` array, file that is a suffix of another path without path boundary (e.g., `route.ts` should not match `subroute.ts`).

## Dependencies
None. This spec modifies existing files only.

## Constraints
- Resolution must use path-boundary checking: `module.endsWith('/' + basename)`, not `module.endsWith(basename)`. Without the `/` prefix, `subroute.ts` would match a query for `route.ts`.
- The function must be idempotent. Files already containing `/` must be skipped so repeated resolution doesn't corrupt paths.
- `build_concerns` is optional on `ProofChainEntry`. Guard with `entry.build_concerns || []`.

## Gotchas
- `callout.file` can be `null`. The resolution function must check for null before testing `.includes('/')`.
- `modules_touched` is an empty array for older entries, not undefined. But guard with `|| []` for safety since the type allows optional fields on older entries.
- The resolution mutates the entry objects in place. This is fine because the entire chain is serialized to JSON immediately after. Don't clone — it's unnecessary overhead.
- Don't change the `ProofChainEntry` type — `file: string | null` already accepts full paths.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Explicit return types on exported functions.
- Prefer early returns over nested conditionals.
- Engine boundary: `proofSummary.ts` is a utility, not engine — chalk is not used here but it's not an engine file.
- Always use `--run` with `pnpm vitest` to avoid watch mode.

### Pattern Extracts

`extractFileRefs` function signature and style (proofSummary.ts:296-311):
```typescript
export function extractFileRefs(summary: string): string[] {
  const pattern = /((?:[\w./-]+\/)?[a-zA-Z0-9_.-]+\.(?:tsx|ts|jsx|json|js|yaml|yml|md))(?::\d+(?:-\d+)?)?/g;
  const matches = summary.matchAll(pattern);
  const refs = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      if (match[1].startsWith('//') || match[1].includes('://')) continue;
      refs.add(match[1]);
    }
  }
  return Array.from(refs);
}
```

Callout construction in `writeProofChain` (work.ts:801-804):
```typescript
    callouts: proof.callouts.map((c, i) => ({
      ...c,
      id: `${slug}-C${i + 1}`,
    })),
```

Build concerns spread in entry (work.ts:807):
```typescript
    ...(proof.build_concerns && proof.build_concerns.length > 0 ? { build_concerns: proof.build_concerns } : {}),
```

### Checkpoint Commands
- After adding `resolveCalloutPaths`: `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts --run` — Expected: all existing + new tests pass
- After all changes: `cd packages/cli && pnpm vitest run --run` — Expected: 1440+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1440 passed, 2 skipped (96 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1448 tests (adding ~8 resolution tests)
- Regression focus: `proofSummary.test.ts` (modified), `proof.test.ts` (reads proof chain data)

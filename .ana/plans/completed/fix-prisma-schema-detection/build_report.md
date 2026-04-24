# Build Report: Fix Prisma schema detection bugs

**Created by:** AnaBuild
**Date:** 2026-04-23
**Spec:** .ana/plans/active/fix-prisma-schema-detection/spec.md
**Branch:** feature/fix-prisma-schema-detection

## What Was Built

- `packages/cli/src/engine/census.ts` (modified): Removed the early `break` in the Prisma candidate loop so both `prisma/schema.prisma` and `schema.prisma` are reported when they coexist. Added a directory-only fallback: when no file candidate is found for a root, checks whether `prisma/` contains `.prisma` files and reports it as a directory entry with trailing `/`.
- `packages/cli/src/engine/scan-engine.ts` (modified): Three changes in the Prisma detection block: (1) directory entries (`path.endsWith('/')`) branch to read all `.prisma` files instead of calling `readFile` on the path; (2) provider extraction extended into the sibling loop so datasource blocks in non-anchor files are found; (3) second fallback glob (`**/prisma/*.prisma`) deduplicates by directory when no `schema.prisma` is found anywhere.
- `packages/cli/tests/engine/scanProject.test.ts` (modified): Added 4 integration tests covering dual candidates, directory-only multi-file schema, provider in non-anchor file, and SQL-only edge case.

## PR Summary

- Fix Prisma schema detection to handle dual candidates, directory-only multi-file schemas, and provider extraction from non-anchor files
- Remove early `break` in census so both `prisma/schema.prisma` and root `schema.prisma` are reported; scanner scores all candidates by model count
- Add directory-only fallback in census for `prisma/` dirs containing `.prisma` files without a traditional anchor
- Extend scan-engine to read all `.prisma` files in directory entries and extract provider from sibling files
- Add second fallback glob (`**/prisma/*.prisma`) with directory deduplication when no `schema.prisma` exists

## Acceptance Criteria Coverage

- AC1 "dual candidates scored" -> scanProject.test.ts "picks best candidate when dual Prisma schema files exist" (4 assertions: found, modelCount=3, path contains schema.prisma, defined)
- AC2 "directory-only multi-file schema" -> scanProject.test.ts "detects directory-only multi-file Prisma schema" (5 assertions: found, modelCount=3, provider=postgresql, defined, no blind spot)
- AC3 "provider from non-anchor file" -> scanProject.test.ts "extracts provider from non-anchor Prisma file" (3 assertions: defined, provider=postgresql, modelCount>0)
- Edge case "SQL-only prisma/ ignored" -> scanProject.test.ts "ignores prisma directory with only SQL files" (2 assertions: defined, found=false)
- Tests pass -> 1394 passed, 2 skipped
- No build errors -> pnpm run build passes (verified by pre-commit hook)
- No lint errors -> pnpm run lint passes (verified by pre-commit hook)

## Implementation Decisions

- **`const` to `let` for `matches`:** The spec noted `matches` was `const` and suggested changing to `let`. Used `let` and push the second fallback's directory entries onto it. Cleanest approach with minimal diff.
- **Directory entry path format:** Directory entries from census use trailing `/` (e.g., `prisma/`). In scan-engine, `isDirectory` is detected via `relStr.endsWith('/')`. This is consistent with how Drizzle reports directories.
- **Provider extraction order in directory entries:** For directory entries, provider is extracted from the first `.prisma` file that has a datasource block (alphabetical readdir order). This matches the spec's "first non-null provider wins" guidance.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  95 passed (95)
     Tests  1390 passed | 2 skipped (1392)
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  95 passed (95)
     Tests  1394 passed | 2 skipped (1396)
```

### Comparison
- Tests added: 4
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/engine/scanProject.test.ts`: 4 new integration tests
  - "picks best candidate when dual Prisma schema files exist" — dual candidates, scorer picks higher model count
  - "detects directory-only multi-file Prisma schema" — prisma/ with .prisma files, no anchor, verifies model count, provider, and no blind spot
  - "extracts provider from non-anchor Prisma file" — datasource block in sibling, not schema.prisma
  - "ignores prisma directory with only SQL files" — migration-only dir, no false detection

## Verification Commands
```
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
abff11a [fix-prisma-schema-detection] Tag existing regression tests for contract coverage
49c6fef [fix-prisma-schema-detection] Add integration tests for Prisma schema detection
e73c4cc [fix-prisma-schema-detection] Fix scan-engine: directory entries, sibling provider, second fallback
a16a9d7 [fix-prisma-schema-detection] Fix census: remove break, add directory fallback
```

Contract coverage: 13/13 assertions tagged.

## Open Issues

- **A010 assertion ambiguity:** Contract A010 uses `matcher: "exists"` on `schemas.prisma` without specifying a value. Interpreted as "the key exists in the schemas object" (it does — with `found: false`). The test asserts `schemas.prisma` is defined AND `found` is false (A011). If the contract intended `exists: false` (key should NOT exist), the test would need adjustment — but `found: false` is consistent with how the codebase handles "dependency present, schema not found" throughout scan-engine.
- **Readdir ordering:** Directory entry provider extraction depends on `fs.readdir` order (platform-dependent). In practice this is fine since a Prisma project should have exactly one datasource block across all files. If multiple datasource blocks existed with different providers, the first alphabetically would win. Not a real-world concern but worth noting.

Verified complete by second pass.

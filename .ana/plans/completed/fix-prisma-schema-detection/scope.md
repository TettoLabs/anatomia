# Scope: Fix Prisma schema detection bugs

**Created by:** Ana
**Date:** 2026-04-23

## Intent
Census breaks on first Prisma schema match per root, starving scan-engine's best-match scorer. Three bugs share one disease: census assumes every Prisma project has exactly one `schema.prisma` at a hardcoded path. This breaks dual-candidate roots, multi-file schemas (`prismaSchemaFolder`, GA since Prisma 5.15), and provider detection in split-file layouts.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/engine/census.ts`, `packages/cli/src/engine/scan-engine.ts`
- **Blast radius:** Low. `SchemaFileEntry` type unchanged. `dependencies.ts` uses `schemaFiles.some(s => s.orm === 'prisma')` — boolean check, unaffected by more entries or directory paths. Existing tests cover monolith and monorepo-sub-package layouts; new tests needed for the three new cases.
- **Estimated effort:** ~1 hour
- **Multi-phase:** no

## Approach
Remove the assumption that one `schema.prisma` file per root is sufficient. Let census report all Prisma candidates it finds — including directory-only multi-file layouts — so scan-engine's existing scorer sees the full picture. Extend the provider regex to search all `.prisma` files in the schema directory instead of only the anchor file.

## Acceptance Criteria
- AC1: When both `prisma/schema.prisma` and `schema.prisma` exist in the same root, census reports both. Scan-engine scores both and picks the one with more models.
- AC2: When a root has a `prisma/` directory containing `.prisma` files but no `schema.prisma` anchor, census reports it with `path` set to the directory (e.g., `prisma/`). Scan-engine's fallback glob includes `**/prisma/*.prisma` when `**/schema.prisma` returns empty.
- AC3: Provider regex runs on all `.prisma` files in the schema directory, not just the anchor. First non-null provider wins. Verified by a test where the datasource block lives in a non-anchor file (e.g., `base.prisma`).

## Edge Cases & Risks
- A `prisma/` directory containing only migration SQL files and no `.prisma` files should NOT be reported as a schema entry.
- Scan-engine already reads siblings for model counting (lines 294-301). AC3 extends the same loop for provider extraction — no new filesystem traversal needed.
- AC2 directory entry has no single file to `readFile` on. Scan-engine must handle this: read all `.prisma` files in the directory for model count and provider, skip `readFile` on the directory path itself.

## Rejected Approaches
- **Change `SchemaFileEntry.path` type to support both files and directories explicitly.** Adds type complexity for a distinction scan-engine can already infer (path ends with `/` or `existsSync` shows directory). Not worth the type change.
- **Always glob instead of using census.** Census exists to avoid repeated filesystem traversal. Removing census as the primary source would regress scan performance and break the census model's design intent.

## Open Questions
None — directory-as-path confirmed by developer.

## Exploration Findings

### Patterns Discovered
- census.ts:199-207 — iterates `['prisma/schema.prisma', 'schema.prisma']` with early `break`
- scan-engine.ts:281-284 — census entries are primary, glob `**/schema.prisma` is fallback
- scan-engine.ts:286-309 — best-match scorer: counts models across siblings, extracts provider from anchor only
- scan-engine.ts:294-301 — sibling `.prisma` file reading loop already exists for model counting
- dependencies.ts:216 — `schemaFiles.some(s => s.orm === 'prisma')` boolean check, unaffected

### Constraints Discovered
- [TYPE-VERIFIED] SchemaFileEntry (types/census.ts:38-42) — `{ orm: string, sourceRootPath: string, path: string }`. No type change needed.
- [OBSERVED] SCHEMA_GLOB_OPTS (scan-engine.ts:267-271) — `maxDepth: 6`, ignores node_modules/dist/.git. Reusable for the new fallback glob.
- [OBSERVED] Provider regex (scan-engine.ts:304) — `/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"/s`. Correct pattern, just applied to wrong scope.

### Test Infrastructure
- scanProject.test.ts — integration tests using `createFiles()` helper and temp directories. Two existing Prisma tests: monolith layout (line 96) and monorepo sub-package (line 119). Same pattern for new tests.

## For AnaPlan

### Structural Analog
`discoverSchemas` Drizzle block (census.ts:211-218) — same function, same shape, no break. Shows the intended pattern when an ORM can appear in multiple forms.

### Relevant Code Paths
- `packages/cli/src/engine/census.ts` lines 190-220 — `discoverSchemas`, the break, and the Drizzle analog
- `packages/cli/src/engine/scan-engine.ts` lines 260-318 — schema detection, glob fallback, scorer, provider regex
- `packages/cli/tests/engine/scanProject.test.ts` lines 96-137 — existing Prisma schema tests

### Patterns to Follow
- scanProject.test.ts `createFiles()` helper for temp directory test fixtures
- Existing sibling-reading loop at scan-engine.ts:294-301 for extending provider extraction

### Known Gotchas
- scan-engine `readFile` on a directory path will throw. When census reports a directory entry (AC2), scan-engine must detect this and read directory contents instead of calling `readFile` on the path directly.
- The fallback glob at scan-engine.ts:284 currently only fires when `censusPrisma.length === 0`. After AC2, census will report directory entries — the fallback logic may need adjustment to handle entries that are directories vs. files.

### Things to Investigate
- How should scan-engine handle a census entry whose `path` is a directory? Two options: (a) detect directory entries and glob their contents inline, or (b) expand directory entries into file entries before the scoring loop. Design judgment call — (a) is simpler, (b) is more consistent with the scorer's file-by-file model.

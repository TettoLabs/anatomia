# Scope: Fix Drizzle schema detection

**Created by:** Ana
**Date:** 2026-04-23

## Intent
Drizzle schema detection is a stub — census checks the migrations directory, scan-engine globs inside it, model counting and provider detection are absent, no blind spot fires, and census results are ignored by the scorer. A project using Drizzle gets no model count, no provider, wrong schema path, and no warning when the schema is missing. This is the same class of disease that was just fixed for Prisma (see proof chain: "Fix Prisma schema detection bugs"), applied to the second most popular TypeScript ORM.

The consumer bug compounds the problem: `scaffold-generators.ts` and `scan.ts` pick the first found schema across ORMs regardless of model count, so even correct Drizzle data loses to weaker Prisma data.

## Complexity Assessment
- **Size:** medium
- **Files affected:** `packages/cli/src/engine/census.ts`, `packages/cli/src/engine/scan-engine.ts`, `packages/cli/src/commands/scan.ts`, `packages/cli/src/utils/scaffold-generators.ts`, `packages/cli/tests/engine/scanProject.test.ts`
- **Blast radius:** Low-moderate. `SchemaFileEntry` type unchanged. Census gains a new discovery path (config file reading) but the entry shape is the same. Scan-engine Drizzle block is self-contained — rewrite doesn't touch Prisma or Supabase paths. Consumer fix changes selection logic for all ORMs but the only behavioral change is tie-breaking by model count instead of insertion order.
- **Estimated effort:** ~2 hours
- **Multi-phase:** no

## Approach
Three layers, matching the Prisma detection architecture:

**Census (config-driven discovery).** Read `drizzle.config.ts` (or `.js`, `.mjs`) via regex to extract the `schema` field (path to schema files) and `dialect` field (provider hint). Report entries with the extracted path. Don't hardcode common source locations — the config file is the source of truth, just as `prisma/schema.prisma` is for Prisma. If no config file exists, census reports nothing and scan-engine handles discovery via glob fallback.

**Scan-engine (scoring with glob fallback).** Use census entries as the primary source. When census finds nothing, fall back to targeted globs for common Drizzle schema patterns. Read matched files, count table definitions (`pgTable`, `mysqlTable`, `sqliteTable`), extract provider from table helper names. Score candidates by model count and pick the best. Fire a blind spot when `drizzle-orm` is in deps but no schema is found.

**Consumers (cross-ORM priority).** Replace first-found selection with highest-model-count selection in both `scaffold-generators.ts` and `scan.ts`.

## Acceptance Criteria
- AC1: Census reads `drizzle.config.{ts,js,mjs}` when present and extracts the `schema` field value as the entry path. Verified by a test with a config file pointing to a non-default location.
- AC2: Census extracts the `dialect` field from the config file. The value is available downstream for provider detection.
- AC3: When `drizzle-orm` is in deps and census finds no config file, scan-engine falls back to glob patterns and finds schema files containing table definitions.
- AC4: Scan-engine counts `pgTable`, `mysqlTable`, and `sqliteTable` calls in Drizzle schema files and reports `modelCount`.
- AC5: Scan-engine detects provider from table helper names (`pgTable` → postgresql, `mysqlTable` → mysql, `sqliteTable` → sqlite), with census dialect as fallback.
- AC6: When `drizzle-orm` is in deps but no schema files are found (neither via census nor glob), a blind spot is emitted.
- AC7: `scaffold-generators.ts` and `scan.ts` select the schema with the highest `modelCount` across all ORMs, not the first found.

## Edge Cases & Risks
- `drizzle.config.ts` may use `schema: "./src/db/schema.ts"` (single file) or `schema: "./src/db/schema"` (directory) or `schema: ["./src/db/users.ts", "./src/db/posts.ts"]` (array). Regex extraction should handle the single-string case; array and directory forms can be passed through to scan-engine for expansion.
- The `dialect` field in drizzle config uses values like `"postgresql"`, `"mysql"`, `"sqlite"` — these map directly to the provider field with no translation needed.
- Config files may use `export default defineConfig({...})` or `export default {...}` — regex should handle both.
- Table helpers may be aliased on import (`import { pgTable as table }`). Regex on call sites won't catch aliases. Acceptable limitation — aliasing is rare and can be addressed later if real-world projects show it matters.
- Model count of 0 is possible (config exists, schema file exists but is empty/has no tables). Should still report `found: true` with `modelCount: 0`.
- Consumer fix: when all found schemas have `modelCount: null`, fall back to current first-found behavior. Don't break existing behavior for ORMs that don't count models yet.

## Rejected Approaches
- **Hardcode common source paths in census (`src/db/schema.ts`, `db/schema.ts`, etc.).** Fragile — Drizzle has no path convention. The config file IS the convention. Hardcoded paths would need constant maintenance and still miss non-standard layouts.
- **Parse config files with TS compiler or AST.** Overkill for extracting two string fields. Regex is sufficient, matches Prisma's approach (regex on `.prisma` file content), and avoids a heavyweight dependency.
- **Add a new `dialect` field to `SchemaFileEntry`.** Census entries don't need it — dialect maps directly to provider, which scan-engine already stores. Pass dialect through as provider when table-helper detection doesn't yield a result.

## Open Questions
None — config-driven approach confirmed by developer.

## Exploration Findings

### Patterns Discovered
- census.ts:233-241 — current Drizzle block: checks for `drizzle/` directory existence only, no file reading
- scan-engine.ts:359-367 — current Drizzle block: `**/drizzle/**/*.ts` glob, no census consultation, no model counting, no provider, no blind spot
- scan-engine.ts:279-356 — Prisma block: census-first → glob fallback → multi-candidate scoring → model counting → provider extraction → blind spot. This is the template.
- scaffold-generators.ts:60 — `Object.values(result.schemas || {}).find(sc => sc?.found)` — first-found
- scan.ts:110 — `Object.keys(result.schemas).find(k => result.schemas[k]?.found)` — first-found
- census.ts:196-210 — Prisma discovery iterates candidate paths, reports all matches. Drizzle analog should iterate config file extensions.

### Constraints Discovered
- [TYPE-VERIFIED] SchemaFileEntry (types/census.ts:38-42) — `{ orm: string, sourceRootPath: string, path: string }`. No type change needed.
- [TYPE-VERIFIED] schemas record (types/engineResult.ts:143-148) — `{ found: boolean, path: string | null, modelCount: number | null, provider?: string | null }`. Provider field already optional.
- [OBSERVED] SCHEMA_GLOB_OPTS (scan-engine.ts:267-271) — `maxDepth: 6`, ignores node_modules/dist/.git. Reusable for Drizzle globs.
- [OBSERVED] Prisma provider regex (scan-engine.ts:304) — `/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"/s`. Different pattern needed for Drizzle but same extraction approach.
- [OBSERVED] Census uses `existsSync` and `readdirSync` only — synchronous, fast. Config file reading will need `readFileSync`, consistent with census's synchronous design.

### Test Infrastructure
- scanProject.test.ts — integration tests using `createFiles()` helper and temp directories. One existing Drizzle test (line 219, SCAN-042) that creates `apps/api/drizzle/schema.ts`. This test currently passes because the glob matches; it will need updating if the glob patterns change. New tests needed for: config-driven discovery, model counting, provider detection, blind spot, consumer priority.

## For AnaPlan

### Structural Analog
The Prisma block in scan-engine.ts (lines 279-356) is the direct structural analog: census-first discovery, glob fallback, multi-candidate scoring by model count, provider extraction, blind spot on failure. The Drizzle block should follow this exact architecture.

### Relevant Code Paths
- `packages/cli/src/engine/census.ts` lines 233-241 — `discoverSchemas` Drizzle block (rewrite target)
- `packages/cli/src/engine/scan-engine.ts` lines 359-367 — schema detection Drizzle block (rewrite target)
- `packages/cli/src/engine/scan-engine.ts` lines 279-356 — Prisma block (structural template)
- `packages/cli/src/commands/scan.ts` lines 108-125 — `enrichDatabase` consumer (fix target)
- `packages/cli/src/utils/scaffold-generators.ts` lines 59-63 — project-context consumer (fix target)
- `packages/cli/tests/engine/scanProject.test.ts` line 219 — existing Drizzle test (update + expand)

### Patterns to Follow
- Prisma's census-first → glob fallback → scorer pattern in scan-engine.ts
- `createFiles()` helper in scanProject.test.ts for fixture-based tests
- Regex content extraction (not AST parsing) for config files, matching how Prisma extracts provider from `.prisma` files

### Known Gotchas
- The existing Drizzle test (SCAN-042) creates files at `apps/api/drizzle/schema.ts` — inside a `drizzle/` directory. This test will likely break when the glob patterns change since it relies on `**/drizzle/**/*.ts`. Decide whether to update the fixture or keep backward-compatible globs.
- Census is synchronous. `readFileSync` for config files is fine but keep the read small (config files are tiny).
- `drizzle.config.ts` schema field can be a string, array, or directory path. Regex extraction gets the raw value; scan-engine needs to handle all three forms when resolving to actual files.
- scan-engine.ts proof chain callout: "First-provider-wins with no conflict detection" at lines 313/337 for Prisma. The Drizzle implementation should avoid replicating this — use table-helper majority or census dialect, not first-found.

### Things to Investigate
- What glob patterns should scan-engine use as fallback when no config file exists? Broad `**/*.ts` is too expensive. Need to identify patterns that cover real Drizzle projects without false positives — likely `**/schema.ts`, `**/schema/*.ts`, `**/db/schema*.ts` filtered by content (must contain table helper imports or calls). Design judgment on breadth vs. precision.
- Should the config file regex handle multiline `schema` values (array syntax spread across lines)? Tradeoff between regex complexity and coverage of edge cases.

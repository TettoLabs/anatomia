# Spec: Fix Drizzle schema detection

**Created by:** AnaPlan
**Date:** 2026-04-23
**Scope:** .ana/plans/active/fix-drizzle-schema-detection/scope.md

## Approach

Mirror the Prisma detection architecture across three layers: census discovers schema location from config files, scan-engine scores candidates by model count with glob fallback, consumers select the best schema across all ORMs by model count instead of first-found.

Census reads `drizzle.config.{ts,js,mjs}` via `readFileSync` + regex to extract the `schema` field (path to schema files) and reports entries with `orm: 'drizzle'`. The `SchemaFileEntry` type is unchanged — `{ orm, sourceRootPath, path }` is sufficient.

Scan-engine's Drizzle block is rewritten to follow the Prisma block's architecture: census-first → glob fallback → multi-candidate scoring → model counting → provider extraction → blind spot. Provider comes from table helper names (`pgTable` → `postgresql`, etc.) with config `dialect` as fallback.

The consumer fix in `scan.ts` and `scaffold-generators.ts` replaces `.find(s => s?.found)` with highest-`modelCount` selection. When all `modelCount` values are `null`, first-found is preserved for backward compatibility.

**Open question from scope: "What glob patterns for fallback?"** — Using `**/schema.ts`, `**/schema/*.ts`, `**/db/schema*.ts` with content filtering (file must contain a `Table(` call). Narrow enough to avoid scanning every `.ts` file, broad enough to cover real Drizzle layouts.

**Open question from scope: "Multiline array config?"** — Regex handles single-string `schema` values. Array and directory forms are extracted as raw strings and passed to scan-engine, which resolves them to files or falls back to glob. This avoids regex complexity for a rare edge case.

## Output Mockups

### Scan output with Drizzle detected (human-readable)

```
│  Database    Drizzle → PostgreSQL (12 models)             │
```

### Scan output when drizzle-orm is in deps but no schema found

Blind spot emitted:
```
│  ⚠  Database   drizzle-orm found but no schema files      │
│                 Create a drizzle.config.ts pointing to     │
│                 your schema directory                       │
```

### scan.json schemas section

```json
{
  "schemas": {
    "drizzle": {
      "found": true,
      "path": "src/db/schema.ts",
      "modelCount": 12,
      "provider": "postgresql"
    }
  }
}
```

## File Changes

### `packages/cli/src/engine/census.ts` (modify)
**What changes:** Replace the Drizzle stub (lines 233–241) with config-file-driven discovery. Iterate `drizzle.config.{ts,js,mjs}` in each source root, read via `readFileSync`, extract `schema` field value via regex. Report entries with the extracted path. If no config file exists, report nothing — scan-engine handles glob fallback.
**Pattern to follow:** The Prisma discovery block immediately above (lines 196–231) — iterate candidate paths, report all matches.
**Why:** The current stub checks for a `drizzle/` directory, which is the migrations directory, not the schema location. Projects with Drizzle get wrong paths and no model counting.

### `packages/cli/src/engine/scan-engine.ts` (modify)
**What changes:** Replace the Drizzle block (lines 359–367) with a full detection block mirroring the Prisma block (lines 279–356). Census-first discovery, glob fallback (`**/schema.ts`, `**/schema/*.ts`, `**/db/schema*.ts` filtered by table-helper content), multi-candidate scoring by model count (`pgTable`, `mysqlTable`, `sqliteTable` calls), provider extraction from table helper names with config dialect fallback, blind spot when `drizzle-orm` is in deps but no schema found.
**Pattern to follow:** The Prisma block at lines 279–356 — same structure, same scoring approach, same blind spot pattern.
**Why:** Current block does a single glob, takes the first match, reports no model count, no provider, and no blind spot.

### `packages/cli/src/commands/scan.ts` (modify)
**What changes:** In `enrichDatabase()` (line 110), replace `Object.keys(result.schemas).find(k => result.schemas[k]?.found)` with selection by highest `modelCount`. When all `modelCount` values are `null`, fall back to first-found.
**Pattern to follow:** No direct analog — this is a small logic change.
**Why:** Current first-found selection means insertion order determines which ORM's schema data is displayed, regardless of which ORM has richer detection data.

### `packages/cli/src/utils/scaffold-generators.ts` (modify)
**What changes:** In `generateProjectContextMd()` (line 60), replace `Object.values(result.schemas || {}).find(sc => sc?.found)` with selection by highest `modelCount`. Same fallback to first-found when all `modelCount` are `null`.
**Pattern to follow:** Same logic as the `scan.ts` fix — extract to a shared helper if the logic is more than a few lines, or inline if it's a simple sort.
**Why:** Same disease as `scan.ts` — first-found loses richer data to weaker data.

### `packages/cli/tests/engine/scanProject.test.ts` (modify)
**What changes:** Update existing SCAN-042 test to assert on `modelCount` and `provider`. Add new tests for: config-driven discovery (AC1, AC2), glob fallback without config (AC3), model counting (AC4), provider detection from table helpers and dialect fallback (AC5), blind spot when no schema found (AC6), cross-ORM priority by model count (AC7).
**Pattern to follow:** Existing `createFiles()` helper and `describe`/`it` structure in the same file.
**Why:** Current Drizzle test coverage is one test that verifies glob matching only.

## Acceptance Criteria

- [ ] AC1: Census reads `drizzle.config.{ts,js,mjs}` when present and extracts the `schema` field value as the entry path. Verified by a test with a config file pointing to a non-default location.
- [ ] AC2: Census extracts the `dialect` field from the config file. The value is available downstream for provider detection.
- [ ] AC3: When `drizzle-orm` is in deps and census finds no config file, scan-engine falls back to glob patterns and finds schema files containing table definitions.
- [ ] AC4: Scan-engine counts `pgTable`, `mysqlTable`, and `sqliteTable` calls in Drizzle schema files and reports `modelCount`.
- [ ] AC5: Scan-engine detects provider from table helper names (`pgTable` → postgresql, `mysqlTable` → mysql, `sqliteTable` → sqlite), with census dialect as fallback.
- [ ] AC6: When `drizzle-orm` is in deps but no schema files are found (neither via census nor glob), a blind spot is emitted.
- [ ] AC7: `scaffold-generators.ts` and `scan.ts` select the schema with the highest `modelCount` across all ORMs, not the first found.
- [ ] AC8: All tests pass with `(cd packages/cli && pnpm vitest run)`.
- [ ] AC9: No build errors from `pnpm run build`.
- [ ] AC10: Existing SCAN-042 test continues to pass (updated to assert modelCount/provider).

## Testing Strategy

- **Integration tests:** All tests in `scanProject.test.ts` using the `createFiles()` helper with temp directories. Each test creates a realistic fixture and runs `scanProject()` against it.
- **Config discovery tests:** Config file with `schema` pointing to a non-default path. Config with `defineConfig({...})` wrapper. Config with `dialect` field. Multiple config extensions (`.ts`, `.js`, `.mjs`).
- **Scoring tests:** Multiple schema files — verify highest model count wins. Schema file with zero models — verify `found: true, modelCount: 0`.
- **Provider tests:** File with `pgTable` calls → `postgresql`. File with `mysqlTable` → `mysql`. File with `sqliteTable` → `sqlite`. Config dialect as fallback when no table helpers found.
- **Blind spot test:** `drizzle-orm` in deps, no config file, no schema files matching globs → blind spot emitted.
- **Consumer priority test:** Two ORMs with schemas, one with higher model count → higher count wins. Both with `null` model count → first-found preserved.
- **Edge cases:** Config file exists but `schema` field is missing. Schema file exists but contains no table definitions. `drizzle-orm` not in deps → no Drizzle detection at all.

## Dependencies

The Prisma detection fix (proof chain: "Fix Prisma schema detection bugs") is already merged. The Prisma block at scan-engine.ts:279–356 is the structural template. No other dependencies.

## Constraints

- `SchemaFileEntry` type is unchanged. No new fields.
- Census remains fully synchronous — `readFileSync` only.
- Engine files have zero CLI dependencies — no chalk, no ora.
- The `provider` field on the schemas record is already optional (`provider?: string | null`). No type change needed.
- Backward compatibility: existing scans that detected Drizzle via the old glob should still detect it (the glob fallback covers the old `**/drizzle/**/*.ts` cases, and content filtering ensures only real schema files match).

## Gotchas

- **Census `readFileSync` import:** Census currently imports `existsSync` and `readdirSync` from `node:fs`. Add `readFileSync` to that import.
- **Config file is TypeScript:** `readFileSync` reads raw text. The regex extracts the `schema` string value — it doesn't evaluate the TypeScript. This is fine because config values are string literals. Template literals or variables won't be extracted, but that's an acceptable limitation (same as Prisma regex extraction).
- **`drizzle.config.ts` lives in the project root, not source roots.** Unlike Prisma where `prisma/schema.prisma` is per source root, Drizzle config is typically one per project at the repository root. Census should check the root path first, then source roots. Avoid reporting duplicates if the root IS a source root.
- **Existing SCAN-042 test fixture:** Creates `apps/api/drizzle/schema.ts` with content `export const users = pgTable("users", {});`. This file is inside a `drizzle/` directory (the old glob target). The new glob fallback patterns (`**/schema.ts`, etc.) will still match `apps/api/drizzle/schema.ts` because it matches `**/schema.ts`. The content contains `pgTable` so it passes content filtering. The test should continue to pass — but update assertions to include `modelCount: 1` and `provider: 'postgresql'`.
- **Content filtering for glob fallback:** The glob patterns are intentionally broad (`**/schema.ts`). Without content filtering, they'd match non-Drizzle schema files (e.g., Zod schemas, GraphQL schemas). Filter by checking that file content contains a Drizzle table helper call — specifically look for `Table(` which catches `pgTable(`, `mysqlTable(`, `sqliteTable(` without false-matching common English words.
- **Consumer fix and `null` model counts:** Supabase detection doesn't set `modelCount`. If the consumer blindly sorts by `modelCount`, Supabase schemas (with `modelCount: null`) would lose to any ORM with `modelCount: 0`. The fix should treat `null` as "unknown" (not zero) — when comparing, `null` loses to any number, but when ALL are `null`, fall back to first-found.
- **Dialect field extraction:** The `dialect` field in `drizzle.config.ts` uses values like `"postgresql"`, `"mysql"`, `"sqlite"`. These map directly to the provider field — no translation needed. But the regex must handle both `dialect: "postgresql"` and `dialect: 'postgresql'` (single and double quotes).
- **Path resolution from config:** The `schema` field value is relative to the config file location (project root). When census reports it, the path should be relative to `rootPath`, same as all other census paths. If the extracted path starts with `./`, strip it.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Engine files have zero CLI dependencies — no chalk, no commander, no ora.
- Census is synchronous — `existsSync`, `readdirSync`, `readFileSync` only.
- Prefer early returns over nested conditionals.
- Explicit return types on all exported functions.
- Always pass `--run` flag when invoking Vitest.
- Test behavior, not implementation — assert on specific expected values.
- Use `| null` for fields that were checked and found empty.

### Pattern Extracts

**Prisma census discovery (census.ts:196–231) — the structural template for Drizzle census:**
```typescript
    // Prisma — check both conventional locations:
    // - {root}/prisma/schema.prisma (monolith, most monorepos)
    // - {root}/schema.prisma (prisma package root, e.g., cal.com's @calcom/prisma)
    // Report ALL candidates found — scan-engine's scorer picks the best one.
    let foundPrismaFile = false;
    for (const candidate of ['prisma/schema.prisma', 'schema.prisma']) {
      const prismaPath = path.join(root.absolutePath, candidate);
      if (existsSync(prismaPath)) {
        entries.push({
          orm: 'prisma',
          sourceRootPath: root.relativePath,
          path: path.relative(rootPath, prismaPath),
        });
        foundPrismaFile = true;
      }
    }
```

**Prisma scan-engine scoring (scan-engine.ts:279–356) — the structural template for Drizzle scan-engine:**
```typescript
  const hasPrisma = allDeps['prisma'] || allDeps['@prisma/client'];
  if (hasPrisma) {
    try {
      const censusPrisma = censusSchemas.filter(s => s.orm === 'prisma').map(s => s.path);
      let matches = censusPrisma.length > 0
        ? censusPrisma
        : await glob('**/schema.prisma', SCHEMA_GLOB_OPTS);
      // ...scoring loop...
      if (!best || modelCount > best.modelCount) {
        best = { path: relStr, modelCount, provider };
      }
      // ...
      schemas['prisma'] = { found: true, path: best!.path, modelCount: best!.modelCount, provider: best!.provider };
    } catch {
      schemas['prisma'] = { found: false, path: null, modelCount: null };
      blindSpots.push({ area: 'Database', issue: '...', resolution: '...' });
    }
  }
```

**Current consumer first-found (scan.ts:110):**
```typescript
    const schemaKey = Object.keys(result.schemas).find(k => result.schemas[k]?.found);
```

**Current consumer first-found (scaffold-generators.ts:60):**
```typescript
    const schema = Object.values(result.schemas || {}).find(sc => sc?.found);
```

**Test fixture pattern (scanProject.test.ts:219–233):**
```typescript
  it('detects Drizzle schema in a monorepo sub-package (SCAN-042)', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'monorepo-root',
        dependencies: { 'drizzle-orm': '0.30.0' },
      }),
      'apps/api/drizzle/schema.ts': 'export const users = pgTable("users", {});',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.schemas['drizzle']).toBeDefined();
    expect(result.schemas['drizzle']!.found).toBe(true);
    expect(result.schemas['drizzle']!.path).toBe('apps/api/drizzle/schema.ts');
  });
```

### Checkpoint Commands

- After census changes: `(cd packages/cli && pnpm vitest run --run)` — Expected: existing tests still pass (1394 passing)
- After all changes: `(cd packages/cli && pnpm vitest run --run)` — Expected: 1394 + new tests pass
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1394 passed, 2 skipped (95 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1404+ tests (est. 10+ new tests for Drizzle detection + consumer priority)
- Regression focus: `scanProject.test.ts` (existing SCAN-042 test), `scan.ts` and `scaffold-generators.ts` consumer behavior for projects with existing Prisma or Supabase schemas

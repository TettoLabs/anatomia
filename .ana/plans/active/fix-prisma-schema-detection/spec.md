# Spec: Fix Prisma schema detection bugs

**Created by:** AnaPlan
**Date:** 2026-04-23
**Scope:** .ana/plans/active/fix-prisma-schema-detection/scope.md

## Approach

Three bugs share one disease: census assumes every Prisma project has exactly one `schema.prisma` at a hardcoded path. The fix has three parts that must land together:

1. **Census: remove early break.** The `break` at census.ts line 207 stops after the first Prisma candidate per root. The Drizzle block (census.ts:211-218) is the structural analog — same function, same loop, no break. Remove the break so census reports all file candidates it finds per root.

2. **Census: add directory-only fallback.** After checking both file candidates, if neither was found for a root, check whether `prisma/` exists and contains `.prisma` files. If so, report it as a directory entry with path ending in `/` (e.g., `prisma/`). This trailing `/` convention signals scan-engine to handle it differently. Only report the directory if it contains at least one `.prisma` file — a `prisma/` directory with only SQL migrations or other non-Prisma files must be ignored.

3. **Scan-engine: handle directory entries + extend provider extraction.** Two changes in the Prisma scorer loop:
   - When a match path ends with `/`, it's a directory entry. Read all `.prisma` files in that directory (instead of calling `readFile` on the path directly, which would throw). Count models across all files. Extract provider from the first file that has a datasource block.
   - For file entries (existing behavior), extend provider extraction into the sibling loop. Currently provider is extracted only from the anchor file (scan-engine.ts:304). Move provider extraction above the sibling loop, then in the sibling loop, if provider is still null, check each sibling's content. First non-null provider wins. This means the existing sibling loop at scan-engine.ts:294-301 gains one conditional inside it — no new filesystem traversal.
   - Add a second fallback glob. Currently: census entries → `**/schema.prisma` glob. Add: if both are empty, try `**/prisma/*.prisma`, deduplicate by directory (group results, take unique `path.dirname()` + `/`), and feed the directory paths into the same scorer. Reuse `SCHEMA_GLOB_OPTS`.

## Output Mockups

No user-facing output changes. The scan JSON `schemas.prisma` object shape is unchanged:

```json
{
  "prisma": {
    "found": true,
    "path": "prisma/schema.prisma",
    "modelCount": 5,
    "provider": "postgresql"
  }
}
```

For a directory-only layout, `path` will be the file path of the best-scoring directory's representative. The scorer selects the best candidate — the path stored in `schemas.prisma.path` is the winning candidate's path (file or directory).

Wait — for directory entries, what path should `schemas.prisma.path` report? The directory path (e.g., `prisma/`). This is consistent with how Drizzle reports directory paths. The `path` field tells the user where the schema lives; for multi-file schemas, that's the directory.

## File Changes

### packages/cli/src/engine/census.ts (modify)
**What changes:** Remove the `break` on line 207 so both `prisma/schema.prisma` and `schema.prisma` candidates are reported when they coexist. Add a directory-only fallback after the file candidate loop: if no file candidate was found for a root, check `prisma/` for `.prisma` files and report as a directory entry with trailing `/`.
**Pattern to follow:** The Drizzle block at census.ts:211-218 — same function, no break, reports directories.
**Why:** Without this, census starves scan-engine's scorer. The scorer can only pick the best match from what census gives it.

### packages/cli/src/engine/scan-engine.ts (modify)
**What changes:** Three changes in the Prisma detection block (lines 280-318):
1. In the scorer loop, detect directory entries (`relativePath.endsWith('/')`) and read all `.prisma` files in the directory instead of calling `readFile` on the path.
2. For file entries, extend provider extraction into the existing sibling loop — if the anchor file doesn't have a datasource block, check siblings.
3. After the existing fallback glob (`**/schema.prisma`), add a second fallback (`**/prisma/*.prisma`) that deduplicates by directory and feeds directory-style paths into the scorer.
**Pattern to follow:** The existing sibling-reading loop at scan-engine.ts:294-301 for model counting. The provider regex at scan-engine.ts:304 stays unchanged — it's just applied to more files.
**Why:** Without directory handling, `readFile` on a directory path throws. Without sibling provider extraction, split-file schemas where the datasource block lives in a non-anchor file report `provider: null`.

### packages/cli/tests/engine/scanProject.test.ts (modify)
**What changes:** Add 4 new integration tests using the existing `createFiles()` + `scanProject()` pattern:
1. Dual candidates — both `prisma/schema.prisma` and `schema.prisma` exist; scanner picks the one with more models.
2. Directory-only multi-file schema — `prisma/` has `.prisma` files but no `schema.prisma`; schema is detected with correct model count and provider.
3. Provider in non-anchor file — `prisma/schema.prisma` has models but no datasource; `prisma/base.prisma` has the datasource; provider is extracted.
4. Edge case — `prisma/` directory with only `.sql` files; no schema entry created, blind spot fires.
**Pattern to follow:** Existing Prisma tests at scanProject.test.ts:96-137. Same `createFiles()` helper, same assertion style.
**Why:** Each AC needs a test. The edge case prevents regression where migration-only directories get reported as schemas.

## Acceptance Criteria

- [ ] AC1: When both `prisma/schema.prisma` and `schema.prisma` exist in the same root, census reports both. Scan-engine scores both and picks the one with more models.
- [ ] AC2: When a root has a `prisma/` directory containing `.prisma` files but no `schema.prisma` anchor, census reports it with `path` set to the directory. Scan-engine detects directory entries and reads all `.prisma` files for model counting and provider extraction.
- [ ] AC3: Provider regex runs on all `.prisma` files in the schema directory, not just the anchor. First non-null provider wins. Verified by a test where the datasource block lives in a non-anchor file.
- [ ] Edge case: `prisma/` with only SQL files does not produce a schema entry.
- [ ] Tests pass: `cd packages/cli && pnpm vitest run`
- [ ] No build errors: `pnpm run build`
- [ ] No lint errors: `pnpm run lint`

## Testing Strategy

- **Integration tests:** All 4 tests go through `scanProject()` end-to-end using `createFiles()` temp directories. This tests census → scan-engine integration, not just one layer.
- **Unit tests:** Not needed — census and scan-engine are tested through their integration point. The changes are small enough that integration coverage is sufficient.
- **Edge cases:**
  - Dual candidates where root-level `schema.prisma` has more models than `prisma/schema.prisma` (verifies scorer picks root-level)
  - Directory with zero `.prisma` files (must not produce an entry)
  - Provider in a sibling file, not the anchor (AC3)
  - Directory-only layout with provider in one file and models in another (AC2)

## Dependencies

None — all changes are in existing files with no new dependencies.

## Constraints

- `SchemaFileEntry` type must not change. Directory entries use the same `{ orm, sourceRootPath, path }` shape with trailing `/` convention.
- `dependencies.ts:216` uses `schemaFiles.some(s => s.orm === 'prisma')` — boolean check, unaffected by more entries or directory paths. Do not change.
- Existing Prisma tests (scanProject.test.ts:96-137) must continue passing. The monolith and monorepo-sub-package layouts are regression tests.
- Engine files have zero CLI dependencies — no chalk, no ora. All changes stay in engine layer.

## Gotchas

- **`readFile` on a directory throws.** When census reports a directory entry (AC2), scan-engine must detect this BEFORE calling `readFile`. Check `relativePath.endsWith('/')` at the top of the scorer loop and branch to directory-reading logic.
- **`path.relative()` strips trailing slashes.** When creating directory entries in census, manually append `/` after `path.relative()`. Don't rely on the path library to preserve it.
- **The fallback glob fires on `censusPrisma.length === 0`.** After AC1/AC2 changes, census will report more entries (dual candidates, directory entries). The fallback should still only fire when census has NO Prisma entries at all. This is already correct — census finding more entries means the fallback fires less, not more.
- **Deduplication in the second fallback glob.** `**/prisma/*.prisma` may return multiple files from the same directory. Group by `path.dirname()`, produce one directory entry per unique directory. Don't feed individual files into the scorer — that would score the same directory N times.
- **The `matches` variable is `const`.** To add the second fallback, either change to `let` or restructure. The cleanest approach: make `matches` a `let` and push directory entries onto it if both primary sources are empty.

## Build Brief

### Rules That Apply
- All local imports use `.js` extensions. `import { foo } from './bar.js'`.
- Use `import type` for type-only imports, separate from value imports.
- Engine files have zero CLI dependencies — no chalk, no commander, no ora.
- Prefer early returns over nested conditionals.
- Empty catch blocks in engine are intentional — graceful degradation.
- Use `| null` for fields checked and found empty.

### Pattern Extracts

**Structural analog — Drizzle block in census.ts (no break):**
```typescript
// census.ts:211-218
    // Drizzle
    const drizzlePath = path.join(root.absolutePath, 'drizzle');
    if (existsSync(drizzlePath)) {
      entries.push({
        orm: 'drizzle',
        sourceRootPath: root.relativePath,
        path: path.relative(rootPath, drizzlePath),
      });
    }
```

**Existing sibling loop in scan-engine.ts (extend for provider):**
```typescript
// scan-engine.ts:294-301
          const schemaDir = path.dirname(absPath);
          try {
            const siblings = await fs.readdir(schemaDir);
            const prismaFiles = siblings.filter(f => f.endsWith('.prisma') && f !== path.basename(absPath));
            for (const sibling of prismaFiles) {
              const sibContent = await fs.readFile(path.join(schemaDir, sibling), 'utf-8');
              modelCount += (sibContent.match(/^model\s+/gm) || []).length;
            }
          } catch { /* directory read failed — use single-file count */ }
```

**Provider regex (unchanged, applied to more files):**
```typescript
// scan-engine.ts:304
          const providerMatch = content.match(/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"/s);
```

**Test pattern — existing Prisma tests:**
```typescript
// scanProject.test.ts:96-114
  it('detects external services and schemas', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { stripe: '15.0.0', '@prisma/client': '5.0.0' },
      }),
      'prisma/schema.prisma': 'model User { id Int @id }\nmodel Post { id Int @id }',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.schemas['prisma']).toBeDefined();
    expect(result.schemas['prisma']!.found).toBe(true);
    expect(result.schemas['prisma']!.modelCount).toBe(2);
    expect(result.schemas['prisma']!.path).toBe('prisma/schema.prisma');
  });
```

**Census imports (line 11 — `readdirSync` already imported):**
```typescript
import { existsSync, readdirSync } from 'node:fs';
```

### Checkpoint Commands

- After census changes: `cd packages/cli && pnpm vitest run -- tests/engine/scanProject.test.ts --run` — Expected: existing Prisma tests still pass
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: 1394+ tests pass (1390 + 4 new)
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1390 passed, 2 skipped (95 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected 1394+ tests in 95 test files
- Regression focus: `tests/engine/scanProject.test.ts` — existing Prisma tests at lines 96-137

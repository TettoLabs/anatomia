# Spec: Add `ana proof context` query command

**Created by:** AnaPlan
**Date:** 2026-04-24
**Scope:** .ana/plans/active/proof-context-query/scope.md

## Approach

Add a query function `getProofContext` to `proofSummary.ts` and a `context` subcommand to `proof.ts`. The function reads `proof_chain.json`, matches callouts and build concerns against queried file paths, and returns structured results. The CLI wrapper formats them for human or JSON consumption.

After spec-1, the proof chain contains a mix of full-path callouts (recent entries) and basename callouts (older entries without `modules_touched`). The matching strategy handles both:

1. **Exact match** — stored file equals queried file exactly
2. **Path-suffix match** — stored file (full path) ends with `'/' + queriedBasename`, or queried file (full path) ends with `'/' + storedBasename`
3. **Basename match** — stored file has no `/` (legacy data) and its basename equals the queried file's basename

This three-tier approach finds all relevant callouts regardless of data vintage. Path-boundary checks (`'/' +`) prevent false positives from partial directory names.

The function returns a structured result per queried file. The CLI formats it. This keeps the utility importable without CLI dependencies.

## Output Mockups

### Human-readable (default)

```
$ ana proof context packages/cli/src/engine/census.ts

Proof context for packages/cli/src/engine/census.ts
Touched in 2 pipeline cycles (last: 2026-04-24)

Callouts:
  [code] drizzle-dialect overloads SchemaFileEntry semantics: census.ts:267-274 — The
         orm: 'drizzle-dialect' entry stores the dialect string in the path field...
         From: Fix Drizzle schema detection

  [code] Config regex can match comments: census.ts:251 — schema\s*:\s*["']([^"']+)["']
         would match a commented-out // schema: "old/path"...
         From: Fix Drizzle schema detection

  [code] Census directory check is non-recursive: census.ts:219 — readdirSync(prismaDir)
         only checks top-level entries...
         From: Fix Prisma schema detection bugs

No build concerns for this file.
```

### No data found

```
$ ana proof context src/unknown/file.ts

No proof context found for src/unknown/file.ts
```

### Multiple files

```
$ ana proof context census.ts scan-engine.ts

Proof context for census.ts
...

───

Proof context for scan-engine.ts
...
```

### JSON output

```
$ ana proof context census.ts --json
{
  "results": [
    {
      "query": "census.ts",
      "callouts": [
        {
          "id": "drizzle-C1",
          "category": "code",
          "summary": "drizzle-dialect overloads SchemaFileEntry semantics...",
          "file": "packages/cli/src/engine/census.ts",
          "anchor": "census.ts:267-274",
          "from": "Fix Drizzle schema detection",
          "date": "2026-04-24"
        }
      ],
      "build_concerns": [],
      "touch_count": 2,
      "last_touched": "2026-04-24"
    }
  ]
}
```

### No proof chain exists

```
$ ana proof context anything.ts

No proof chain found. Complete pipeline cycles to build proof context.
```

## File Changes

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** Add exported `getProofContext` function. Takes an array of queried file paths and a project root path. Reads `proof_chain.json`, iterates all entries, matches callouts and build concerns against queried files using the three-tier matching strategy. Returns an array of result objects with callouts, build concerns, touch count, and last-touched date per queried file.
**Pattern to follow:** `generateActiveIssuesMarkdown` in the same file — same shape of reading entries, iterating callouts, grouping results. The proof context function is the same pattern with different grouping (per queried file) and different output (structured data, not markdown).
**Why:** The query function must be importable from `proofSummary.ts` without CLI dependencies (AC9). It belongs with `extractFileRefs` and `generateActiveIssuesMarkdown` — same domain.

### packages/cli/src/commands/proof.ts (modify)
**What changes:** Register a `context` subcommand on the `proof` command using `proofCommand.addCommand()`. The subcommand accepts variadic file arguments and a `--json` flag. It calls `getProofContext`, then formats results for terminal (chalk, indentation) or JSON output.
**Pattern to follow:** The existing `proof` command's slug detail view for formatting style, and the list view's `--json` handling. The subcommand gets its own `--json` option — Commander subcommands have independent option scopes.
**Why:** Thin CLI wrapper. All logic is in the utility function. The command handles formatting and error output only.

### packages/cli/tests/utils/proofSummary.test.ts (modify)
**What changes:** Add test suite for `getProofContext`. Tests use temp dirs with mock `proof_chain.json` files. Cover: full-path match, basename match, partial-path match, no-match returns empty, null-file callouts not matched, build concerns included, multiple files queried, touch count and last-touched date correct.
**Pattern to follow:** Existing `generateActiveIssuesMarkdown` tests in the same file — create mock entries, call function, assert on returned structure.
**Why:** Unit tests for the query function verify matching logic independently of CLI formatting.

### packages/cli/tests/commands/proof.test.ts (modify)
**What changes:** Add integration tests for `ana proof context`. Tests use `createTestProject` + `execSync` pattern. Cover: basic query returns callouts, `--json` returns valid JSON, no proof chain file shows clean message, no matches shows clean message, multiple file arguments work.
**Pattern to follow:** Existing proof command integration tests — `runProof` helper, `createProofChain` helper, `createTestProject` for setup.
**Why:** Integration tests verify the CLI wrapper end-to-end: argument parsing, output formatting, exit codes.

## Acceptance Criteria
- [x] AC5: `ana proof context census.ts` returns all callouts and build concerns for that file
- [x] AC6: `ana proof context census.ts --json` returns structured JSON output
- [x] AC7: Querying a file with no proof chain data produces a clean message, not an error
- [x] AC8: Querying when no proof_chain.json exists produces a clean message, not an error
- [x] AC9: The query function is importable from `proofSummary.ts` without CLI dependencies
- [x] AC10: Matching handles full paths, partial paths, and basenames with path-boundary checks (no false positives from partial directory names)
- [x] Tests pass with `pnpm vitest run` from `packages/cli`
- [x] No build errors from `pnpm run build`

## Testing Strategy
- **Unit tests (proofSummary.test.ts):** Test `getProofContext` with mock proof chain data in temp dirs. Matrix:
  - Full-path query matching full-path callout → found
  - Basename query matching full-path callout (path-suffix) → found
  - Full-path query matching basename callout (legacy) → found
  - Basename query matching basename callout (legacy) → found
  - Query for file with no callouts → empty result
  - Query when `proof_chain.json` doesn't exist → empty result, no error
  - Null-file callouts → never matched
  - Build concerns matched same as callouts
  - Multiple files queried → separate results per file
  - Touch count reflects number of entries touching the file
  - Last-touched date is most recent entry date
  - Path-boundary check: `route.ts` query does NOT match `subroute.ts` callout

- **Integration tests (proof.test.ts):** Test CLI via `execSync`. Matrix:
  - `ana proof context census.ts` returns callout text (exit 0)
  - `ana proof context census.ts --json` returns parseable JSON
  - `ana proof context unknown.ts` shows "no proof context" message (exit 0)
  - `ana proof context` with no proof chain file shows clean message (exit 0)
  - `ana proof context file1.ts file2.ts` returns results for both files

## Dependencies
Spec-1 must be complete. The query function works with both old basename data and new full-path data, but the value of the feature depends on resolved paths.

## Constraints
- `getProofContext` must have zero CLI dependencies (no chalk, no commander). It returns data; the command formats it.
- Exit code 0 for all query results, including "not found." This is a query, not an assertion — no data is not an error.
- The `context` subcommand must not conflict with slug positional argument. Commander resolves subcommands before positional args.

## Gotchas
- `callout.file` can be `null`. Skip null files during matching — they are ambient observations, not file-specific.
- `build_concerns` is optional on `ProofChainEntry`. Use `entry.build_concerns || []`.
- The `--json` flag on the parent `proof` command already exists. The `context` subcommand needs its own `--json` option — Commander subcommands have independent option scopes. Define it on the subcommand, not inherited from parent.
- When no files are provided to `context`, show usage help, don't query with zero files.
- `completed_at` may be missing on very old entries (see `undatedEntry` in proof.test.ts). Guard access for touch-count and last-touched calculations.
- The `from` field in JSON output comes from `entry.feature`, not a field on the callout itself. The function must carry feature context when collecting matches.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Explicit return types on exported functions.
- Engine boundary: `proofSummary.ts` is utils, not engine. No chalk here. Chalk belongs in `proof.ts` only.
- Prefer early returns over nested conditionals.
- Always use `--run` with `pnpm vitest` to avoid watch mode.

### Pattern Extracts

`generateActiveIssuesMarkdown` grouping logic (proofSummary.ts:388-396):
```typescript
  const fileGroups = new Map<string, CalloutWithFeature[]>();

  for (const callout of cappedCallouts) {
    const key = callout.file ?? 'General';
    const existing = fileGroups.get(key) || [];
    existing.push(callout);
    fileGroups.set(key, existing);
  }
```

Commander subcommand registration (proof.ts:220-225):
```typescript
export function registerProofCommand(program: Command): void {
  const proofCommand = new Command('proof')
    .description('Display proof chain entry for a completed work item')
    .argument('[slug]', 'Work item slug to display proof for')
    .option('--json', 'Output JSON format for programmatic consumption')
    .action(async (slug: string | undefined, options: { json?: boolean }) => {
```

Proof chain reading pattern (proof.ts:232-241):
```typescript
      let chain: ProofChain = { entries: [] };
      if (fs.existsSync(proofChainPath)) {
        try {
          const content = fs.readFileSync(proofChainPath, 'utf-8');
          chain = JSON.parse(content);
        } catch {
          chain = { entries: [] };
        }
      }
```

Integration test helper (proof.test.ts:32-49):
```typescript
  function runProof(args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
    const cliPath = path.join(__dirname, '../../dist/index.js');
    try {
      const stdout = execSync(`node ${cliPath} proof ${args.join(' ')}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; status?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        exitCode: execError.status || 1,
      };
    }
  }
```

### Checkpoint Commands
- After adding `getProofContext`: `cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts --run` — Expected: all existing + new tests pass
- After adding `context` subcommand: `pnpm run build && cd packages/cli && pnpm vitest run tests/commands/proof.test.ts --run` — Expected: all existing + new tests pass
- After all changes: `cd packages/cli && pnpm vitest run --run` — Expected: 1448+ tests pass (building on spec-1 count)
- Lint: `pnpm run lint`

### Build Baseline
- Current tests (after spec-1): ~1448 passed (96 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1462 tests (adding ~14 query tests: ~9 unit + ~5 integration)
- Regression focus: `proofSummary.test.ts` (modified), `proof.test.ts` (modified)

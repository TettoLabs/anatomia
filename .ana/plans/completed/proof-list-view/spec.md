# Spec: Proof List View

**Created by:** AnaPlan
**Date:** 2026-04-05
**Scope:** .ana/plans/active/proof-list-view/scope.md

## Approach

Make the `<slug>` argument optional (`[slug]`) in the Commander definition. Add a branch early in the action handler: when slug is undefined, read proof_chain.json and render a summary table. When slug is present, existing detail card logic runs unchanged.

The list view has two sub-branches: `--json` outputs the raw proof chain object; human-readable renders a chalk + padEnd table. Both sub-branches follow existing patterns already in proof.ts and work.ts.

The key structural change is that the `!slug` branch must handle the missing-file case differently from the detail view. Detail view errors (exit 1). List view outputs "No proofs yet." (exit 0). This means the `!slug` branch runs its own file-existence check before the existing one.

## Output Mockups

### Human-readable list (multiple entries)

```
  Proof History

  Slug                    Result   Assertions   Date
  stripe-payments         PASS     20/22        2026-04-01
  auth-refactor           FAIL     8/12         2026-03-28
  user-signup             PASS     15/15        2026-03-25
```

Result column: PASS in green, FAIL in red. Header row in bold. "Assertions" shows `contract.satisfied/contract.total`.

### Empty / missing file

```
No proofs yet.
```

Exit code 0. Output to stdout.

### JSON list (`ana proof --json`)

```json
{
  "entries": [
    { "slug": "stripe-payments", "feature": "...", ... },
    { "slug": "auth-refactor", "feature": "...", ... }
  ]
}
```

Raw contents of proof_chain.json, pretty-printed with `JSON.stringify(chain, null, 2)`.

### JSON list — empty / missing file (`ana proof --json`)

```json
{
  "entries": []
}
```

Exit code 0.

## File Changes

### packages/cli/src/commands/proof.ts (modify)
**What changes:** Make slug optional, add list view branch with human-readable table and JSON output, handle missing/empty file gracefully for list mode.
**Pattern to follow:** The existing action handler structure in this same file (json vs human-readable branching). Table column formatting follows work.ts `printHumanReadable()` style (chalk + padEnd, no table library).
**Why:** This is the entire feature — without this change, `ana proof` with no args fails because slug is required.

### packages/cli/tests/commands/proof.test.ts (modify)
**What changes:** Add test cases for list view: table output with columns, sort order, empty/missing file handling, JSON list output, single entry, multiple entries.
**Pattern to follow:** Existing test structure in this same file — `createProofChain()` helper, `runProof()` with args array, assert on stdout content. Use `FORCE_COLOR=0` to strip chalk.
**Why:** New behavior needs test coverage. Existing tests remain unchanged — they all pass a slug argument.

## Acceptance Criteria

- [ ] AC1: `ana proof` with no arguments displays a table with columns: slug, result, assertion ratio (satisfied/total), timestamp
- [ ] AC2: Table rows are sorted most-recent-first (reverse chronological by `completed_at`)
- [ ] AC3: Assertion ratio column shows `contract.satisfied / contract.total` (not covered/total)
- [ ] AC4: When proof_chain.json is missing or has zero entries, output is "No proofs yet." (not an error, exit 0)
- [ ] AC5: `ana proof --json` (no slug) outputs the full proof_chain.json contents as JSON
- [ ] AC6: `ana proof <slug>` detail card behavior is unchanged
- [ ] AC7: `ana proof <slug> --json` detail JSON behavior is unchanged
- [ ] Tests pass: `pnpm run test`
- [ ] No build errors: `pnpm run build`
- [ ] Lint clean: `pnpm run lint`

## Testing Strategy

- **Unit tests:** Not applicable — this is a CLI command, tested via integration.
- **Integration tests:** Run the built CLI via `execSync` in temp directories (existing pattern). Test both human-readable and JSON output modes for the list view.
- **Edge cases:**
  - proof_chain.json missing entirely → "No proofs yet.", exit 0
  - proof_chain.json with empty entries array → "No proofs yet.", exit 0
  - Single entry → table renders cleanly with one row
  - Multiple entries → sorted most-recent-first
  - Entries with undefined `completed_at` → pushed to end of sorted list
  - Existing detail view tests still pass (regression)

## Dependencies

- Built CLI binary at `dist/index.js` (tests run against built output)
- No new dependencies

## Constraints

- No new npm dependencies. chalk + padEnd only.
- ESM imports with `.js` extensions.
- Must not break any of the 24 existing proof command tests.

## Gotchas

- **Commander argument change:** `<slug>` → `[slug]` changes the action handler signature. First param becomes `string | undefined`. The handler must guard on `slug` being undefined before any logic that uses it.
- **Divergent error handling for missing file:** Detail view exits 1 when proof_chain.json is missing. List view exits 0 with "No proofs yet." The `!slug` branch must run its own file-existence check and return early — it cannot fall through to the existing error handler.
- **Sort stability with undefined timestamps:** `completed_at` is a string (ISO 8601). If undefined, push to end. Use a comparator that handles this: entries without `completed_at` sort after entries with it.
- **ProofChain interface:** Duplicated in both proof.ts (line 28) and work.ts (line 674). No change needed — just awareness that both exist.
- **FORCE_COLOR=0 in tests:** Tests disable chalk coloring via env var. Table output assertions must match uncolored text.
- **`--json` with empty/missing file:** Must output `{ "entries": [] }` (valid JSON), not an error. This is a distinct behavior from the human-readable "No proofs yet." message.

## Build Brief

### Rules That Apply
- ESM imports with `.js` extension: `import { foo } from './bar.js'`
- Strict TypeScript: `noUncheckedIndexedAccess` means array access returns `T | undefined`
- No new dependencies. Reuse chalk and padEnd for table formatting.
- Graceful degradation: list view never errors on missing data, returns empty state.
- Co-authored-by: Ana <build@anatomia.dev>

### Pattern Extracts

**Commander argument + options pattern (proof.ts lines 172-176):**
```typescript
export const proofCommand = new Command('proof')
  .description('Display proof chain entry for a completed work item')
  .argument('<slug>', 'Work item slug to display proof for')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action(async (slug: string, options: { json?: boolean }) => {
```

**Table formatting with padEnd (work.ts lines 508-524):**
```typescript
for (const item of output.items) {
    console.log(chalk.bold(`  ${item.slug} (${item.totalPhases} phase${item.totalPhases === 1 ? '' : 's'}):`));
    const scopeMark = item.artifacts.scope.exists ? chalk.green('✓') : chalk.red('✗');
    const scopeLocation = item.artifacts.scope.location || 'missing';
    console.log(`    scope.md         ${scopeMark} ${scopeLocation}`);
```

**JSON list output pattern (work.ts line 643-645):**
```typescript
if (options.json) {
    console.log(JSON.stringify(output, null, 2));
} else {
```

**Test helper pattern (proof.test.ts lines 31-48):**
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
```

### Checkpoint Commands

- After making slug optional and adding list view: `pnpm run build` — Expected: clean build
- After all changes: `pnpm run test` — Expected: all tests pass (932 existing + new list view tests)
- Lint: `pnpm run lint` — Expected: clean

### Build Baseline
- Current tests: 932 passed
- Current test files: 74 passed
- Command used: `pnpm run test` (runs vitest across all packages)
- After build: expected ~942 tests in 74 files (proof.test.ts gains ~10 new tests)
- Regression focus: existing proof.test.ts tests (24 tests) — the Commander argument change could break them if the optional argument isn't handled correctly

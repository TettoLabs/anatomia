# Spec: Findings Lifecycle Foundation

**Created by:** AnaPlan
**Date:** 2026-04-27
**Scope:** .ana/plans/active/findings-lifecycle-foundation/scope.md

## Approach

The proof chain records intelligence but can't act on it. 82 undifferentiated findings include stale observations about deleted files, absent anchors, and superseded data alongside genuine active findings. After this scope: findings have lifecycle state, mechanical maintenance removes verified stale data, agents receive ~27 active findings instead of 82, and PROOF_CHAIN.md becomes a quality dashboard.

Four internal phases, executed in order within one build:

1. **Rename** — mechanical find-and-replace of `callouts` → `findings` across all source, test, and type files (315 references). No logic changes. This is the broadest touch and should be done first to avoid merge conflicts with subsequent phases.

2. **Schema + Backfill + Classification** — add lifecycle fields to types, expand `ProofChainStats`, implement status assignment in the backfill loop. New findings get `status: 'active'` (or `'lesson'` for upstream). Existing findings without status are backfilled the same way. The `callouts` → `findings` field migration in `proof_chain.json` also rides here.

3. **Staleness Checks** — three mechanical checks in the backfill loop, running after path resolution and status assignment: file-deleted, anchor-absent, supersession. Each sets `status: 'closed'` with appropriate metadata. Already-closed findings are skipped.

4. **Dashboard + Output + Validation** — replace the chronological history in PROOF_CHAIN.md with a quality dashboard (summary line, Hot Modules, Promoted Rules placeholder, Active Findings). Update `completeWork` output to show active counts and maintenance activity. Add UNKNOWN result warning.

The rename and schema changes ship together because they touch the same 315 references — doing them separately means two passes through the same code. The staleness checks ship with the status field because status without garbage collection leaves known stale findings classified as active.

## Output Mockups

### work complete output (AC15)

Normal completion with maintenance activity:
```
✓ PASS — Findings Lifecycle Foundation
  14/14 covered · 14/14 satisfied · 0 deviations
  Chain: 19 runs · 27 active findings
  Maintenance: 38 auto-closed, 17 classified as lessons
```

Normal completion with no maintenance activity (all entries already processed):
```
✓ PASS — Some Feature
  5/5 covered · 5/5 satisfied · 0 deviations
  Chain: 20 runs · 29 active findings
```

### PROOF_CHAIN.md dashboard (AC13, AC14)

```markdown
# Proof Chain Dashboard

19 runs · 27 active · 17 lessons · 0 promoted · 38 closed

## Hot Modules

| File | Active | Entries |
|------|--------|---------|
| packages/cli/src/utils/proofSummary.ts | 4 | 3 |
| packages/cli/src/commands/work.ts | 3 | 2 |
| packages/cli/src/engine/census.ts | 2 | 2 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (27)

### packages/cli/src/utils/proofSummary.ts

- **code:** Description of finding — *Feature Name*
- **test:** Description of finding — *Feature Name*

### packages/cli/src/commands/work.ts

- **code:** Description of finding — *Feature Name*

### General

- **upstream:** Description of upstream observation — *Feature Name*
```

When more than 30 active findings exist:
```
## Active Findings (30 shown of 42 total)
```

### UNKNOWN result warning (AC12)

```
Warning: Entry 'some-slug' has result UNKNOWN but a verify report exists. Check verify_report.md for a Result line.
```

Printed to stderr. Entry still written.

## File Changes

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Rename `callouts` → `findings` on `ProofChainEntry`. Add optional lifecycle fields to the finding array element type: `status`, `closed_reason`, `closed_at`, `closed_by`, `promoted_to`. Add `scope_summary?: string` to `ProofChainEntry`. Expand `ProofChainStats` from `{ runs, callouts }` to `{ runs, findings, active, lessons, promoted, closed, maintenance? }`.
**Pattern to follow:** Existing `ProofChainEntry` field structure — optional fields use `?:` convention, consistent with how `modules_touched`, `rejection_cycles`, etc. were added.
**Why:** All downstream changes depend on these type definitions. Without the expanded stats type, the output format change in `completeWork` won't type-check.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Rename all `callouts` references to `findings` (~15 refs). Extend the backfill loop to: (a) migrate existing `callouts` field to `findings`, (b) assign status to findings lacking one, (c) run staleness checks (file-deleted, anchor-absent, supersession), (d) backfill `scope_summary`. Replace the PROOF_CHAIN.md history generation (lines 826-882) with a call to a new `generateDashboard` function. Update the stats computation to return expanded `ProofChainStats`. Update `completeWork` output (line 1098-1102) to show active counts and conditional maintenance line. Add UNKNOWN result warning before pushing the entry to the chain.
**Pattern to follow:** Existing backfill loop at lines 812-815 — idempotent, skip-if-already-set, mutate in place. Existing stats return pattern at line 884-887.
**Why:** This is the write path. All lifecycle behavior (backfill, staleness, migration, dashboard generation) executes here during `work complete`. Without these changes, findings have types but no runtime behavior.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Rename throughout (~68 refs): `resolveCalloutPaths` → `resolveFindingPaths`, `CalloutWithFeature` → `FindingWithFeature`, `parseCallouts` → `parseFindings`, `ProofChainEntryForIndex.callouts` → `.findings`, `ProofChainEntryForContext.callouts` → `.findings`, `ProofContextResult.callouts` → `.findings`. Add `status` field to `ProofContextResult.findings` element shape and to `FindingWithFeature`. Add status filtering in `generateActiveIssuesMarkdown` (filter to `active` or `undefined` before cap). Change cap from 20 to 30. Add `options?: { includeAll?: boolean }` parameter to `getProofContext`, with status filtering in the inner loop. Add `scope_summary?: string` to `ProofSummary` type. Add `scope_summary` extraction in `generateProofSummary` (read `scope.md` from slug directory). Create new exported `generateDashboard` function that composes: summary line, Hot Modules section, Promoted Rules placeholder, and Active Findings (via `generateActiveIssuesMarkdown`).
**Pattern to follow:** `generateActiveIssuesMarkdown` for the file-grouping and markdown generation pattern. `getProofContext`'s existing three-tier file matching for the status filter insertion point.
**Why:** This is the query/render path. Without status filtering, agents still receive all 82 findings. Without the dashboard function, PROOF_CHAIN.md can't be regenerated. Without `scope_summary` in `ProofSummary`, new entries don't capture intent context.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Rename all `callouts` references to `findings` (~10 refs). This includes the `ProofContextResult` property access in `formatContextResult` (`result.callouts` → `result.findings`) and display labels ("Callouts:" → "Findings:" in terminal output).
**Pattern to follow:** Existing `formatContextResult` structure at line 340.
**Why:** proof.ts is a consumer of `ProofContextResult`. Without the rename, it accesses a property that no longer exists after the type change.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Rename throughout (~203 refs): all `callouts` keys in test fixtures, function names in imports and calls, interface references. Add new test cases for: status filtering in `generateActiveIssuesMarkdown` (active-only, excludes closed), status filtering in `getProofContext` (default vs `includeAll`), `status` field in `getProofContext` results, `scope_summary` population in `generateProofSummary`.
**Pattern to follow:** Existing `generateActiveIssuesMarkdown` test fixtures at line 748 — inline entry objects with `feature`, `completed_at`, and `findings` arrays. Existing `getProofContext` test pattern at line 1245 — temp dir with `writeChain` helper.
**Why:** Tests validate the behavioral changes. The rename is mechanical but the new tests for filtering and scope_summary are the proof that lifecycle behavior works.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Rename `callouts` references (~8 refs). Add new test cases for: backfill status assignment (active default, lesson for upstream), file-deleted staleness closure, anchor-absent staleness closure, supersession closure, dashboard content in PROOF_CHAIN.md, UNKNOWN result warning, maintenance stats in output, `callouts` → `findings` migration in JSON.
**Pattern to follow:** Existing `createProofProject` helper at line 933 — full pipeline scenario with temp dir, git init, planning artifacts, verify report. Extend the helper or create similar setup for scenarios requiring multiple entries or specific finding states.
**Why:** The staleness checks and backfill behavior are in `writeProofChain` (work.ts). These tests exercise the full write path including migration, status assignment, and maintenance.

### `packages/cli/tests/commands/proof.test.ts` (modify)
**What changes:** Rename `callouts` references (~6 refs). No new behavior tests — proof.ts is display-only and the rename is mechanical.
**Pattern to follow:** Existing test structure.
**Why:** Test fixtures use `callouts` as JSON keys. Must match the renamed field.

## Acceptance Criteria

- [ ] AC1: `ProofChainEntry` has field `findings` (not `callouts`). The `findings` array element type includes optional fields: `status?: 'active' | 'lesson' | 'promoted' | 'closed'`, `closed_reason?: string`, `promoted_to?: string`, `closed_at?: string`, `closed_by?: 'mechanical' | 'human' | 'agent'`.
- [ ] AC2: All source references to `callouts` on proof chain data are renamed to `findings` — field names, variable names, interface names (`CalloutWithFeature` → `FindingWithFeature`, `ProofChainEntryForIndex` and `ProofChainEntryForContext` projections updated). `parseCallouts` is renamed to `parseFindings` but its internal regex still matches `## Callouts\n` in verify reports.
- [ ] AC3: `ProofChainStats` has fields: `runs`, `findings` (was `callouts`), `active`, `lessons`, `promoted`, `closed`, and optional `maintenance?: { auto_closed: number; lessons_classified: number }`.
- [ ] AC4: The `writeProofChain` backfill loop sets `status: 'active'` on existing findings that lack a status. Findings with `category === 'upstream'` get `status: 'lesson'` instead. Backfill is idempotent — findings with an existing status are not overwritten.
- [ ] AC5: New findings at write time get `status: 'lesson'` when `category === 'upstream'`, `status: 'active'` otherwise.
- [ ] AC6: The backfill loop closes findings whose `file` references a path that does not exist on disk: sets `status: 'closed'`, `closed_reason: 'file removed'`, `closed_at` to ISO timestamp, `closed_by: 'mechanical'`. Runs after path resolution. Skips findings without a `file` reference.
- [ ] AC7: The backfill loop closes findings whose `file` exists but whose `anchor` string is not present in the file's content: sets `status: 'closed'`, `closed_reason: 'code changed, anchor absent'`, `closed_at`, `closed_by: 'mechanical'`. Skips findings without an `anchor`.
- [ ] AC8: The backfill loop closes older findings that are superseded — when a newer finding exists on the same `file` + same `category` from a later entry: sets `status: 'closed'`, `closed_reason` referencing the superseding finding's ID, `closed_at`, `closed_by: 'mechanical'`. Only the newest finding per `(file, category)` pair remains active. Supersession only operates on fully-resolved paths (containing `/`). Findings within the same entry are never superseded against each other.
- [ ] AC9: `generateActiveIssuesMarkdown` filters to findings with `status === 'active'` (or `status === undefined` for backward compat) before applying the FIFO cap.
- [ ] AC10: `getProofContext` returns only findings with `status === 'active'` (or `undefined`) by default. Accepts an optional `options?: { includeAll?: boolean }` parameter. When `includeAll` is true, returns all findings regardless of status.
- [ ] AC11: `ProofChainEntry` has optional field `scope_summary?: string`. Populated during `generateProofSummary` by reading the first paragraph of the `## Intent` section from `scope.md` in the completed plan directory.
- [ ] AC12: When `result` is `'UNKNOWN'` and a verify report file exists in the completed plan directory, `writeProofChain` logs a warning to stderr. The entry is still written with `result: 'UNKNOWN'` to preserve the record, but the warning surfaces the data quality issue for the developer.
- [ ] AC13: PROOF_CHAIN.md is regenerated as a quality dashboard. Contains: a summary line with run count and per-status finding counts, a Hot Modules section listing files with the most active findings across multiple entries (2+ distinct entries required, top 5, sorted by active count), a Promoted Rules section (placeholder until promotions exist), and an Active Findings section grouped by file (capped — see AC14). The chronological history section is removed.
- [ ] AC14: The Active Findings section in PROOF_CHAIN.md shows findings with `status === 'active'`, grouped by file, capped at 30. When more than 30 active findings exist, shows the 30 most recent with a count indicator.
- [ ] AC15: `work complete` output shows `Chain: {N} runs · {active} active findings` (was `{total} callouts`). When mechanical maintenance closed or classified findings this cycle, an additional line shows: `Maintenance: {N} auto-closed, {N} classified as lessons`. The maintenance line is omitted when both counts are zero.
- [ ] AC16: The `callouts` field in all 18 existing proof_chain.json entries is renamed to `findings` during the first `writeProofChain` run after this scope ships. This migration runs in the backfill loop alongside status assignment.
- [ ] AC17: Finding IDs retain the existing `-C{N}` format. No migration of ID strings.
- [ ] AC18: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC19: Lint passes: `pnpm lint`

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** Extend the existing `generateActiveIssuesMarkdown` describe block with tests for status filtering — entries containing a mix of active, closed, and lesson findings should only render active ones. Test the 30-cap (currently tests the 20-cap — update the existing cap test). Extend the `getProofContext` describe block with tests for default filtering (closed findings excluded) and `includeAll: true` (all findings returned). Verify the returned finding shape includes `status`. Add tests for `scope_summary` in the `generateProofSummary` describe block — create a scope.md with an Intent section in the temp dir, verify it's extracted; test with missing scope.md (undefined).

- **Integration tests (work.test.ts):** Extend the proof chain integration tests using the `createProofProject` pattern. For staleness tests: create a project with findings referencing files, then delete or modify those files before running `writeProofChain` through `completeWork`. For backfill: create entries with findings lacking status, run completion, verify status assignment. For supersession: create multiple entries with overlapping file+category findings, verify only the newest survives. For dashboard: verify PROOF_CHAIN.md content after completion contains the dashboard sections (summary line, Hot Modules, Active Findings). For migration: create entries with the old `callouts` field name, verify they're migrated to `findings` after completion. For UNKNOWN warning: create an entry with result UNKNOWN and a verify report, capture stderr.

- **Edge cases:** Finding without `file` field skipped by staleness. Finding without `anchor` skipped by anchor check. Unresolved basename (no `/`) skipped by staleness and supersession. Supersession within same entry (should not happen). Empty proof chain (no existing entries). `scope.md` without Intent section. `scope.md` with empty Intent paragraph. Hot Modules with only 1 entry per file (shouldn't appear in Hot Modules).

## Dependencies

None. All changes are internal to the CLI package. No new npm packages required. The `node:fs` APIs used for file-exists and file-read checks are already imported in the affected files.

## Constraints

- **Backward compatibility.** All new fields on the finding type are optional. `status === undefined` is treated as `active` everywhere. Consumers reading `proof_chain.json` directly won't break on new fields.
- **No test count decrease.** 1486 tests currently pass. All existing tests must continue to pass after the rename. New tests add to the count.
- **Pre-commit hooks.** The pre-commit hook runs `tsc --noEmit` and lint. All type changes must be consistent across files. A renamed field in the type that isn't renamed at a usage site will fail typecheck.
- **`parseFindings` regex unchanged.** The function is renamed but the regex `## Callouts\n` must stay — all 18 existing verify reports use that heading. The template heading rename is deferred to Foundation 2.
- **Finding IDs.** The `-C{N}` format is retained. No ID string migration.

## Gotchas

- **Backfill loop ordering is critical.** The sequence is: (1) migrate `callouts` → `findings` field name, (2) resolve paths via `resolveFindingPaths`, (3) assign status (active/lesson) to findings lacking one, (4) run staleness checks. Path resolution must precede staleness because unresolved basenames can't be checked for file existence. Status assignment must precede staleness because staleness checks skip already-closed findings — and status assignment might set some to `lesson` which staleness should then skip (lessons aren't subject to file-deleted/anchor-absent checks since they're informational observations, not code-anchored findings). Wait — actually, lessons CAN have file references (upstream findings sometimes reference files). But the scope's staleness checks (AC6, AC7) don't distinguish by status before checking — they check any finding with a file/anchor. The skip condition is: already has `status === 'closed'`. Lessons with deleted files should still be closed. So the correct ordering: (1) migrate field name, (2) resolve paths, (3) assign status (active/lesson), (4) staleness checks (skip closed only, process active AND lesson).

- **Supersession map must use entry index order.** Build the map iterating entries from oldest (index 0) to newest (index N). For each finding with a resolved file path, store `(file, category) → finding` in the map. When a newer finding overwrites an older one in the map, the older finding gets closed with supersession. The map key should be the resolved `file` + `category` string. Only process findings with `status === 'active'` (or `undefined`) — don't supersede already-closed or lesson findings. Don't supersede within a single entry (multiple findings from the same Verify session).

- **`ProofContextResult.findings` rename affects proof.ts.** The `formatContextResult` function in `proof.ts` accesses `result.callouts` and `result.callouts.length`. After the type rename, these become `result.findings`. The display label "Callouts:" in the terminal output should become "Findings:". Miss this and the proof context command breaks.

- **`scope_summary` extraction in `generateProofSummary`.** This function takes `slugDir` (the completed plan directory path). It reads `path.join(slugDir, 'scope.md')`. For backfill of existing entries in `writeProofChain`, the backfill loop must read from `.ana/plans/completed/{entry.slug}/scope.md` — a different code path from the `generateProofSummary` extraction. The extraction logic (find `## Intent`, take first paragraph) should be a shared helper or duplicated with the same behavior.

- **`scope_summary` first-paragraph extraction.** "First paragraph" means: the text between `## Intent\n` and the next blank line (or next `##` heading). Trim leading/trailing whitespace. If the Intent section is empty or missing, result is `undefined`.

- **Hot Modules requires entry attribution.** For each active finding, track which entry (by slug or index) it came from. A file qualifies as "hot" only if it has active findings from 2+ distinct entries. After supersession closes older findings, fewer files will qualify — this is correct. The metric reflects genuine cross-session signal.

- **Maintenance counters span all entries.** The `auto_closed` and `lessons_classified` counters track how many findings changed status during THIS invocation of `writeProofChain`. They're not per-entry — they accumulate across all entries processed in the backfill loop PLUS the new entry. On the first run after this scope ships, expect high numbers (38 closures, 17 lesson classifications based on the data analysis). On subsequent runs, expect 0 unless new findings trigger new staleness.

- **`proof-list-view` entry (index 0) is sparse.** It lacks `modules_touched`, `rejection_cycles`, `previous_failures`. The backfill only adds `status` to findings and runs staleness checks. Don't try to backfill other missing fields — existing `|| []` fallbacks handle them.

- **`configurable-branch-prefix` entry has `result: 'UNKNOWN'`.** The UNKNOWN result guard (AC12) prevents future occurrences by warning. It does NOT fix this existing entry. Don't attempt retroactive correction.

- **File existence checks use the project root.** Staleness file-deleted checks must resolve finding `file` paths relative to `projectRoot`, not relative to the `.ana/` directory. Use `path.join(projectRoot, finding.file)` with `fs.existsSync`.

- **Anchor check reads file content.** For findings where the file exists but has an anchor, read the file content and check `content.includes(anchor)`. This is synchronous (`fs.readFileSync`), consistent with the existing sync file reads in `writeProofChain`. Cache file contents during the loop — multiple findings may reference the same file.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Use `?:` for optional fields that may not have been checked (all new lifecycle fields are optional).
- Explicit return types on all exported functions. Add `@param` and `@returns` JSDoc on new exported functions.
- Test behavior, not implementation. Assert on specific expected values.
- Always use `--run` flag with `pnpm vitest` to avoid watch mode hang.
- Temp directory pattern: `fs.promises.mkdtemp(path.join(os.tmpdir(), 'prefix-'))` with cleanup in `afterEach`.

### Pattern Extracts

**Backfill loop pattern (work.ts:811-815)** — the insertion point for all backfill behavior:
```typescript
  // Existing entries: backfill (idempotent — already-resolved files are skipped)
  for (const existing of chain.entries) {
    resolveCalloutPaths(existing.callouts || [], existing.modules_touched || [], projectRoot);
    resolveCalloutPaths(existing.build_concerns || [], existing.modules_touched || [], projectRoot);
  }
```

**Stats computation and return (work.ts:884-888)** — expand this pattern for new stats:
```typescript
  // Compute chain health counts
  const runs = chain.entries.length;
  const callouts = chain.entries.reduce((sum, e) => sum + (e.callouts || []).length, 0);
  return { runs, callouts };
```

**Stats consumption in completeWork (work.ts:1057, 1098-1102)** — destructure and format:
```typescript
  const { runs, callouts } = await writeProofChain(slug, proof, projectRoot);
  // ...
  console.log(chalk.gray(`  Chain: ${runs} ${runs !== 1 ? 'runs' : 'run'} · ${callouts} ${callouts !== 1 ? 'callouts' : 'callout'}`));
```

**Status filtering insertion point in generateActiveIssuesMarkdown (proofSummary.ts:391-403):**
```typescript
  for (const entry of reversedEntries) {
    // Handle entries without callouts (older entries may not have this field)
    const callouts = entry.callouts || [];
    for (const callout of callouts) {
      allCallouts.push({
        category: callout.category,
        summary: callout.summary,
        file: callout.file,
        feature: entry.feature,
        entryDate: entry.completed_at,
      });
    }
  }
```

**getProofContext inner loop (proofSummary.ts:947-960):**
```typescript
      // Match callouts
      for (const callout of entry.callouts ?? []) {
        if (!callout.file) continue;
        if (fileMatches(callout.file, query)) {
          matchedCallouts.push({
            id: callout.id,
            category: callout.category,
            summary: callout.summary,
            file: callout.file,
            anchor: callout.anchor,
            from: entry.feature,
            date: entryDate,
          });
          entryTouches = true;
        }
      }
```

**Test fixture pattern for generateActiveIssuesMarkdown (proofSummary.test.ts:748-761):**
```typescript
  it('generateActiveIssuesMarkdown uses callout.file not extractFileRefs', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { id: 'test-C1', category: 'code', summary: 'Issue mentions test.ts:42 in text', file: null, anchor: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('## General');
  });
```

**Test fixture pattern for getProofContext (proofSummary.test.ts:1257-1275):**
```typescript
  function writeChain(entries: unknown[]): void {
    fs.writeFileSync(
      path.join(tempDir, '.ana', 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2),
    );
  }

  const baseEntry = {
    feature: 'Fix Drizzle schema detection',
    completed_at: '2026-04-24T10:00:00Z',
    modules_touched: ['packages/cli/src/engine/census.ts', 'packages/cli/src/engine/scan-engine.ts'],
    callouts: [
      { id: 'drizzle-C1', category: 'code', summary: 'drizzle-dialect overloads', file: 'packages/cli/src/engine/census.ts', anchor: 'census.ts:267-274' },
    ],
    build_concerns: [
      { summary: 'Census dialect as sentinel entry', file: 'packages/cli/src/engine/census.ts' },
    ],
  };
```

### Checkpoint Commands

- After rename phase (all `callouts` → `findings` in source + tests): `(cd packages/cli && pnpm vitest run)` — Expected: 1486 tests pass (rename is behavior-preserving)
- After schema + backfill + staleness: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: existing tests pass + new filter/scope_summary tests pass
- After dashboard + output: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts)` — Expected: existing tests pass + new dashboard/output tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: ~1508+ tests pass
- Lint: `pnpm lint`

### Build Baseline
- Current tests: 1486 passed, 2 skipped (1488 total)
- Current test files: 97
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1508+ tests in 97 test files (no new test files, ~22 new tests in existing files)
- Regression focus: `tests/utils/proofSummary.test.ts` (203 rename refs, most fragile), `tests/commands/work.test.ts` (proof chain integration)

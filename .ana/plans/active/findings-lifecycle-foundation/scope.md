# Scope: Findings Lifecycle Foundation

**Created by:** Ana
**Date:** 2026-04-27

## Intent

The proof chain records intelligence but can't act on it. Verify produces findings every pipeline run. Those findings sit in a flat list with no lifecycle state — no way to distinguish "needs attention" from "already handled," no way to mark stale observations, no way to classify informational upstream findings separately from actionable code/test findings. Agents consuming `ana proof context` receive 82 undifferentiated findings including observations about deleted files, absent code anchors, and superseded older observations alongside genuine active findings.

After this scope: findings have lifecycle state, mechanical maintenance removes verified stale data every cycle, agents receive ~27 genuine active observations instead of 82 mixed-quality entries, and PROOF_CHAIN.md becomes a quality dashboard that earns its place in the repo.

This is Foundation 1 of the Learning Loop. Everything downstream — close, audit, promote, health, Ana Learn — chains from the status field and the mechanical maintenance layer shipped here.

## Complexity Assessment

- **Size:** large (11 items, ~25-32 assertions)
- **Files affected:**
  - `src/types/proof.ts` — rename `callouts` → `findings`, add status/lifecycle fields, expand `ProofChainStats`
  - `src/commands/work.ts` — rename throughout `writeProofChain`, add backfill/staleness/classification logic, dashboard generation, entry validation, output update
  - `src/utils/proofSummary.ts` — rename throughout (68 refs), status-aware filters in `generateActiveIssuesMarkdown` and `getProofContext`, rename interfaces (`CalloutWithFeature` → `FindingWithFeature`, projections), `scope_summary` population in `generateProofSummary`
  - `src/commands/proof.ts` — rename throughout (10 refs)
  - `tests/utils/proofSummary.test.ts` — rename throughout (203 refs), new tests for status filtering and lifecycle behavior
  - `tests/commands/proof.test.ts` — rename (6 refs)
  - `tests/commands/work.test.ts` — rename (8 refs), new tests for staleness checks, backfill, dashboard, entry validation
  - `.ana/proof_chain.json` — field rename migration + status backfill + staleness closure (18 entries, 82 findings)
- **Blast radius:** 315 references across 4 source files and 3 test files. The rename is mechanical (find-and-replace on field/variable/interface names). The behavioral changes (staleness checks, status filtering) modify `writeProofChain`, `generateActiveIssuesMarkdown`, and `getProofContext` — the three functions that write, index, and query proof chain data. Every agent session after this scope receives filtered findings. PROOF_CHAIN.md changes from a history dump to a dashboard — any tooling or workflow that reads PROOF_CHAIN.md for entry history should use `ana proof` instead.
- **Estimated effort:** ~45 minutes pipeline time based on calibration data (medium scopes average 45m for this project)
- **Multi-phase:** no

## Approach

One disease: "the system records intelligence but can't act on it." One scope to cure it.

The rename (`callouts` → `findings`) and the status field ship together because they touch the same code paths — every function that references `callouts` is also where status fields, filters, and maintenance logic land. Doing them separately means two passes through the same 315 references.

The mechanical maintenance layer (file-deleted, anchor-absent, supersession checks) ships with the status field because status without garbage collection leaves known stale findings classified as active. We've verified that 55 of 82 findings are stale or informational — the mechanical layer acts on what's verified.

The dashboard replaces the current PROOF_CHAIN.md history dump. Net code removal (~30 lines replacing ~40 lines). The dashboard consumes the status counts that the rest of the scope produces.

Build should phase the work: rename first (mechanical, broad, no logic changes), then schema + backfill + classification, then staleness checks, then dashboard + output + validation. If any phase runs long, the dashboard is the most deferrable piece — but it's net removal, so it should be straightforward.

## Acceptance Criteria

- AC1: `ProofChainEntry` has field `findings` (not `callouts`). The `findings` array element type includes optional fields: `status?: 'active' | 'lesson' | 'promoted' | 'closed'`, `closed_reason?: string`, `promoted_to?: string`, `closed_at?: string`, `closed_by?: 'mechanical' | 'human' | 'agent'`.
- AC2: All source references to `callouts` on proof chain data are renamed to `findings` — field names, variable names, interface names (`CalloutWithFeature` → `FindingWithFeature`, `ProofChainEntryForIndex` and `ProofChainEntryForContext` projections updated). `parseCallouts` is renamed to `parseFindings` but its internal regex still matches `## Callouts\n` in verify reports.
- AC3: `ProofChainStats` has fields: `runs`, `findings` (was `callouts`), `active`, `lessons`, `promoted`, `closed`, and optional `maintenance?: { auto_closed: number; lessons_classified: number }`.
- AC4: The `writeProofChain` backfill loop sets `status: 'active'` on existing findings that lack a status. Findings with `category === 'upstream'` get `status: 'lesson'` instead. Backfill is idempotent — findings with an existing status are not overwritten.
- AC5: New findings at write time get `status: 'lesson'` when `category === 'upstream'`, `status: 'active'` otherwise.
- AC6: The backfill loop closes findings whose `file` references a path that does not exist on disk: sets `status: 'closed'`, `closed_reason: 'file removed'`, `closed_at` to ISO timestamp, `closed_by: 'mechanical'`. Runs after path resolution. Skips findings without a `file` reference.
- AC7: The backfill loop closes findings whose `file` exists but whose `anchor` string is not present in the file's content: sets `status: 'closed'`, `closed_reason: 'code changed, anchor absent'`, `closed_at`, `closed_by: 'mechanical'`. Skips findings without an `anchor`.
- AC8: The backfill loop closes older findings that are superseded — when a newer finding exists on the same `file` + same `category` from a later entry: sets `status: 'closed'`, `closed_reason` referencing the superseding finding's ID, `closed_at`, `closed_by: 'mechanical'`. Only the newest finding per `(file, category)` pair remains active.
- AC9: `generateActiveIssuesMarkdown` filters to findings with `status === 'active'` (or `status === undefined` for backward compat) before applying the FIFO cap.
- AC10: `getProofContext` returns only findings with `status === 'active'` (or `undefined`) by default. Accepts an optional `options?: { includeAll?: boolean }` parameter. When `includeAll` is true, returns all findings regardless of status.
- AC11: `ProofChainEntry` has optional field `scope_summary?: string`. Populated during `generateProofSummary` by reading the first paragraph of the `## Intent` section from `scope.md` in the completed plan directory.
- AC12: `writeProofChain` validates that `result` is not `'UNKNOWN'` when a verify report exists in the completed plan directory. If the verify report contains a clear PASS or FAIL verdict and the computed result is UNKNOWN, the function either uses the correct result from the report or warns and aborts.
- AC13: PROOF_CHAIN.md is regenerated as a quality dashboard. Contains: a summary line with run count and per-status finding counts, a Hot Modules section listing files with the most active findings across multiple entries, a Promoted Rules section (placeholder until promotions exist), and an Active Findings section grouped by file (capped — see AC14). The chronological history section is removed.
- AC14: The Active Findings section in PROOF_CHAIN.md shows findings with `status === 'active'`, grouped by file, capped at 30. When more than 30 active findings exist, shows the 30 most recent with a count indicator.
- AC15: `work complete` output shows `Chain: {N} runs · {active} active findings` (was `{total} callouts`). When mechanical maintenance closed or classified findings this cycle, an additional line shows: `Maintenance: {N} auto-closed, {N} classified as lessons`. The maintenance line is omitted when both counts are zero.
- AC16: The `callouts` field in all 18 existing proof_chain.json entries is renamed to `findings` during the first `writeProofChain` run after this scope ships. This migration runs in the backfill loop alongside status assignment.
- AC17: Finding IDs retain the existing `-C{N}` format. No migration of ID strings.
- AC18: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC19: Lint passes: `pnpm lint`

## Edge Cases & Risks

**Staleness check ordering.** Path resolution must run before staleness checks — a finding with `file: 'proofSummary.ts'` (unresolved basename) can't be checked for file existence until resolved to `packages/cli/src/utils/proofSummary.ts`. The backfill loop order: resolve paths → assign status (backfill active/lesson) → run staleness checks (file deleted, anchor absent, supersession). Already-closed findings are skipped by staleness checks.

**Supersession false positives.** Two findings on the same file + category from different entries might observe genuinely different issues. Supersession assumes the newer observation replaces the older one. This is correct for the mechanical layer — the newer Verify session had access to more recent code and produced a more current observation. If the older finding was genuinely independent, it can be reopened by a future lifecycle command (`ana proof reopen`, not in this scope).

**Anchor matching precision.** `anchor` values range from single tokens (`globSync`) to multi-word strings (`expect(true).toBe(true)`). The check is `fileContent.includes(anchor)` — simple string containment. This can produce false negatives (anchor present but with slightly different whitespace) or false positives (anchor is a common string that matches a different location). The Deep Think analysis shows the current anchors are specific enough that false matches are unlikely. False negatives (anchor changed slightly but issue persists) are acceptable — they result in a conservative close that can be corrected.

**Race condition on proof_chain.json.** Two simultaneous `work complete` calls could race on read-modify-write. This is the existing behavior — no change. At current usage (one developer, sequential completions), this is not a real risk.

**Dashboard at scale.** At 27 active findings, the dashboard is ~50 lines. At 100, the capped list (30 shown) keeps it under ~80 lines. At 500 active findings, Hot Modules becomes the primary value and the list is a sample. The design degrades gracefully.

**Backward compatibility.** All new fields on the finding type are optional. Consumers that read proof_chain.json directly (none currently besides the CLI) will see new fields but won't break on their absence. `status === undefined` is treated as `active` everywhere.

**`scope_summary` extraction.** Reads the first paragraph after `## Intent` from scope.md. If scope.md doesn't exist or has no Intent section, `scope_summary` is omitted (undefined). No error, no fallback — the field is optional.

## Rejected Approaches

**Minimal scope (status + backfill + filter only, ~15 assertions).** Ships faster individually but leaves 55 verified-stale findings in agent context until the maintenance scope follows. Before the analysis, we didn't know the findings were stale. Now we do. Knowingly shipping classification without acting on verified staleness violates "verified over trusted."

**Full event model (append-only lifecycle log alongside immutable entries).** Purer — Verify's findings are never mutated, all transitions are events. But adds two data structures, computed status lookups, and conceptual overhead at our 18-entry scale. The hybrid approach (status on the finding + `closed_at`/`closed_by` metadata) captures WHEN and WHO without the event model's complexity. Upgradeable to events later if needed.

**Deferring the rename.** Cheaper in isolation but more expensive in total — doing the rename separately means a second pass through 315 references across the same files this scope already touches. The rename is cheapest now, during the schema migration.

**Renaming finding IDs from `-C{N}` to `-F{N}`.** 82 existing IDs use the C suffix. Renaming creates migration churn and potential string-matching breakdowns in any reference to finding IDs (proof chain cross-references, closed_reason supersession messages). The letter is arbitrary and established. Keep it.

**`scope_complexity` field.** Requires parsing "Size: medium" from unstructured scope.md — the same regex-fragility disease we named for findings. Belongs with Foundation 2 when scopes get structured frontmatter.

**Self-resolution detection (finding's file was touched → maybe fixed).** Heuristic, not deterministic. Touching a file doesn't mean fixing the issue. Violates "verified over trusted." Belongs in the judgment layer (Ana Learn).

**Age-based expiration.** A security finding doesn't expire with age. Auto-closing based on time violates "verified over trusted." Ana Learn can flag old findings for human review.

**Template prose updates.** The verify template has 18 uses of "callout" in instructional prose. The `## Callouts` section heading stays because `## Independent Findings` already exists in the template — renaming creates a collision. Both the section heading rename and the prose updates are deferred to Foundation 2 (structured YAML frontmatter), which makes the parser a fallback and the heading change safe.

**Verify template fallback reference removal.** The template says "If the command is not available: check `.ana/PROOF_CHAIN.md`..." The command is always available. But this is template prose — deferred alongside other template prose updates to Foundation 2. Not worth a template change in isolation.

## Open Questions

None for Ana. All design decisions resolved through prior analysis and developer confirmation.

## Exploration Findings

### Patterns Discovered

- `writeProofChain` backfill loop at work.ts:812-815 — iterates all existing entries, mutates in place, idempotent (skips already-resolved). This is where rename migration, status backfill, and staleness checks ride.
- `resolveCalloutPaths` at proofSummary.ts:329-354 — the path resolution that staleness checks depend on. Handles both `modules_touched` matching and glob fallback.
- `generateActiveIssuesMarkdown` at proofSummary.ts:384-468 — collects all callouts newest-first, caps at 20 (FIFO), groups by file. The status filter inserts before the cap.
- `getProofContext` at proofSummary.ts:915-993 — three-tier file matching, returns all matching findings. The status filter inserts in the inner loop or post-collection.
- PROOF_CHAIN.md generation at work.ts:826-882 — 57 lines of history formatting (reversed entries, timing, modules, callout digest). Replaced entirely by dashboard generation.
- `work complete` output at work.ts:1098-1102 — 3-line summary using `ProofChainStats`. Consumes the expanded stats.

### Constraints Discovered

- [TYPE-VERIFIED] `ProofChainEntry.callouts` at proof.ts:57 — array with `id`, `category`, `summary`, `file`, `anchor`. 2 references in file.
- [TYPE-VERIFIED] `ProofChainStats` at proof.ts:33-36 — `{ runs: number; callouts: number }`. Returned by `writeProofChain`, consumed at work.ts:1102.
- [TYPE-VERIFIED] `CalloutWithFeature` at proofSummary.ts:359-364 — interface used by `generateActiveIssuesMarkdown`. Rename target.
- [TYPE-VERIFIED] `ProofChainEntryForIndex` at proofSummary.ts:369-373 — projection with `callouts?` field. Needs rename + `status` on finding elements.
- [TYPE-VERIFIED] `ProofChainEntryForContext` at proofSummary.ts:860-866 — projection with `callouts?` field. Needs rename + `status` on finding elements.
- [TYPE-VERIFIED] `ProofContextResult` at proofSummary.ts:831-855 — has `callouts` field in its return type. Rename to `findings`.
- [DATA-VERIFIED] 82 findings across 18 entries. Category split: 35 code, 30 test, 17 upstream. 65 have file+anchor, 3 file-only, 14 no file ref.
- [DATA-VERIFIED] Staleness: 5 file-deleted, 22 anchor-absent, 17 upstream. ~14 additional superseded (net of staleness overlap). Active after mechanical maintenance: ~27.
- [OBSERVED] `parseCallouts` at proofSummary.ts:486-553 — regex matches `## Callouts\n`. Function rename to `parseFindings` is safe; regex must not change.
- [OBSERVED] Finding IDs use `${slug}-C${i + 1}` format (work.ts:799). 82 existing IDs.

### Test Infrastructure

- `tests/utils/proofSummary.test.ts` — 203 references to `callouts`. Largest test touchpoint. Test fixtures use `callouts` as JSON keys extensively. Mechanical rename handles bulk. New tests needed for: status filtering in `generateActiveIssuesMarkdown`, status filtering in `getProofContext` with `includeAll` option, `scope_summary` population.
- `tests/commands/work.test.ts` — 8 references. `createProofProject` helper at line 933 creates full pipeline scenario. New tests needed for: backfill behavior (status assignment), staleness checks (file-deleted, anchor-absent, supersession), dashboard content, entry validation (UNKNOWN guard), maintenance stats in output.
- `tests/commands/proof.test.ts` — 6 references. Rename only, no new behavior tests needed.
- Existing `resolveCalloutPaths` tests at proofSummary.test.ts:1124+ — 8 tests including glob fallback. Rename only.

## For AnaPlan

### Structural Analog

`clear-the-deck-2` (completed) — batch modifications to existing proof chain infrastructure, multiple files touched, schema changes with backward compatibility, backfill loop extensions, proof_chain.json data migration. Same code paths, same test patterns, same backfill-loop-riding approach.

### Relevant Code Paths

- `packages/cli/src/types/proof.ts` — type definitions being modified (ProofChainEntry, ProofChainStats, ProofChain)
- `packages/cli/src/commands/work.ts:739-888` — `writeProofChain`: entry construction, backfill loop, JSON write, PROOF_CHAIN.md generation, stats return
- `packages/cli/src/commands/work.ts:1098-1102` — `completeWork` output consuming ProofChainStats
- `packages/cli/src/utils/proofSummary.ts:329-354` — `resolveCalloutPaths` (rename parameter types)
- `packages/cli/src/utils/proofSummary.ts:359-373` — `CalloutWithFeature`, `ProofChainEntryForIndex` (rename)
- `packages/cli/src/utils/proofSummary.ts:384-468` — `generateActiveIssuesMarkdown` (status filter + rename)
- `packages/cli/src/utils/proofSummary.ts:486-553` — `parseCallouts` → `parseFindings` (function rename, regex stays)
- `packages/cli/src/utils/proofSummary.ts:831-866` — `ProofContextResult`, `ProofChainEntryForContext` (rename + status)
- `packages/cli/src/utils/proofSummary.ts:915-993` — `getProofContext` (status filter + options param + rename)
- `packages/cli/src/commands/proof.ts:24-210` — display code (rename throughout)
- `.ana/proof_chain.json` — 18 entries, migration target

### Patterns to Follow

- Backfill loop pattern in work.ts:812-815 — idempotent, skip-if-already-set, mutate in place
- `resolveCalloutPaths` idempotency — `if (item.file.includes('/')) continue` to skip already-resolved
- `clear-the-deck-2` scope structure — batch modifications, multiple commits organized by change type
- `ProofChainStats` consumption pattern at work.ts:1098-1102 — destructure return, format in output

### Known Gotchas

- `parseCallouts` (→ `parseFindings`) regex must still match `## Callouts\n` in existing verify reports. All 18 reports use that heading. Don't change the regex.
- `ProofContextResult` has a `callouts` field that external consumers (proof.ts display code) import and use. The rename to `findings` on this interface affects the import sites in proof.ts.
- Supersession map must be built from entry index order (oldest=0 to newest=N). The "newest" finding for a (file, category) pair is the one from the highest-index entry. If multiple findings in the same entry share file+category, they're all from the same Verify session — don't supersede within a single entry.
- Some findings have unresolved basenames (`proofSummary.ts` vs `packages/cli/src/utils/proofSummary.ts`). Staleness file-exists checks must run AFTER `resolveCalloutPaths`. Unresolved basenames (no `/` in path) should be skipped by staleness checks — they can't be reliably checked.
- The `scope_summary` reads from `.ana/plans/completed/{slug}/scope.md`. For the 18 existing entries, this file exists for all completed plans. But future entries where scope.md was deleted or the completed directory was cleaned would get `undefined` — which is fine (optional field).
- `proof-list-view` (entry index 0) is missing several fields (`modules_touched`, `rejection_cycles`, `previous_failures`). The backfill only adds `status` to findings and runs staleness checks. Don't backfill other missing fields — that's handled by existing `|| []` fallbacks.
- The `configurable-branch-prefix` entry has `result: 'UNKNOWN'` — the entry-level validation prevents future occurrences but does NOT retroactively fix this entry. Fixing it would require reading the verify report and determining the correct result, which is a separate concern.

### Things to Investigate

- **Dashboard active findings reuse.** Should the dashboard's Active Findings section reuse `generateActiveIssuesMarkdown` (with a higher cap of 30) or implement fresh dashboard-specific rendering? The existing function groups by file and truncates summaries — which is close to the dashboard format but has a different heading style and cap. Plan should decide whether to parameterize the existing function or write dashboard-specific generation. This is a code organization decision, not a scope decision.
- **Supersession and unresolved paths.** Two findings might reference the same file as `proofSummary.ts` (unresolved) and `packages/cli/src/utils/proofSummary.ts` (resolved). After path resolution runs, both should resolve to the same path. But if one fails to resolve (ambiguous basename), it won't match the resolved one. Plan should decide whether supersession should attempt basename-level matching as a fallback, or only match on fully-resolved paths.
- **`getProofContext` return type.** The `ProofContextResult` interface has a `callouts` field that becomes `findings`. Should the returned finding objects include `status` in their shape? Callers that pass `includeAll: true` would want to see lifecycle state. Plan should decide whether to add `status` to the returned finding shape always (even when filtering to active-only) or only when `includeAll` is true.

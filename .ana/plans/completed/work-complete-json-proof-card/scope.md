# Scope: Work Complete JSON + Proof Card Findings

**Created by:** Ana
**Date:** 2026-04-29
**Depends on:** `finding-enrichment-schema` (Phase B) must ship first. Enriched meta block (`by_severity`, `by_action`) and finding badges (`[severity · action]`) require the Phase B schema changes.

## Intent

Every pipeline-critical command has `--json` except the one that finalizes every run. `work complete` produces console output but no structured data. The autonomous pipeline needs structured completion output. Learn chains from completion to triage. CI gates read the result.

And the proof card (`ana proof {slug}`) hides the most valuable verification data — findings are invisible on the product surface. After Phase B ships, every finding carries severity and suggested_action. The proof card should surface them.

## Complexity Assessment

- **Size:** medium
- **Files affected:**
  - `packages/cli/src/commands/work.ts` — `--json` flag on `work complete`, JSON output on both main path (lines 1285-1292) and recovery path (lines 1081-1099)
  - `packages/cli/src/commands/proof.ts` — findings section in `formatHumanReadable`, build concerns section
  - Test files — `--json` output tests for both completion paths, proof card display tests
- **Blast radius:** Low. `--json` is additive — the non-JSON path is unchanged. Proof card changes are display-only, consuming enriched data that already exists in the proof chain after Phase B.
- **Estimated effort:** ~45 minutes pipeline time
- **Multi-phase:** no

## Approach

Add `--json` to `work complete` with the four-key envelope that every proof command uses. The `results` key carries the completion summary: slug, feature, result, contract counts, new findings, rejection cycles. The `meta` key uses `computeChainHealth` — after Phase B, this automatically includes `by_severity` and `by_action` breakdowns. No new computation needed.

Both completion paths must produce JSON: the main path (lines 1285-1292) and the recovery path (lines 1081-1099). The recovery path currently has its own ad-hoc output logic — manually computing runs and findings instead of using `computeChainHealth`, then returning early at line 1099. The `--json` implementation must handle the early return.

The proof card gains a Findings section showing `[severity · action]` badges per finding, sorted by severity (risk → debt → observation). Top 5 with truncation (`... and N more`). Build concerns get the same treatment — after Phase B they're first-class classified data with severity and action. The card is a summary. `--json` is the full picture.

## Acceptance Criteria

- AC1: `work complete` accepts `--json` flag.
- AC2: Main completion path outputs four-key JSON envelope when `--json` is passed: `command: "work complete"`, `timestamp`, `results`, `meta`.
- AC3: `results` includes: `slug` (string), `feature` (string), `result` (`'PASS' | 'FAIL' | 'UNKNOWN'`), `contract` (`{ total, satisfied, unsatisfied, deviated }`), `new_findings` (number), `rejection_cycles` (number).
- AC4: `meta` uses `computeChainHealth` — includes `by_severity` and `by_action` breakdowns from Phase B.
- AC5: Recovery path (work.ts:1060-1099) outputs the same four-key JSON envelope when `--json` is passed. The recovery path's early return produces JSON instead of console output.
- AC6: Recovery path JSON `results` matches the main path structure. Fields computed from `generateProofSummary` on the completed path.
- AC7: Non-JSON output is unchanged on both paths. `--json` is purely additive.
- AC8: Proof card (`ana proof {slug}`) displays a Findings section with `[severity · action]` badges per finding.
- AC9: Findings sorted by severity: risk → debt → observation.
- AC10: Top 5 findings displayed. If more exist: `... and N more`.
- AC11: Build concerns section in proof card with same `[severity · action]` badge format and same truncation rule.
- AC12: Findings and concerns without severity/action (pre-Phase B entries) display without badges — no crash, graceful degradation.
- AC13: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC14: Lint passes: `pnpm lint`

## Edge Cases & Risks

- **Recovery path divergence.** The recovery path currently duplicates output logic (manual loop counting instead of `computeChainHealth`). Adding `--json` to both paths without unifying the output risks further divergence. The planner should consider whether to unify output formatting or handle each path independently.
- **Pre-Phase B entries in proof card.** Entries completed before Phase B ships will have findings without severity or suggested_action. The proof card must handle `undefined` on both fields — display the finding without badges, don't crash.
- **Empty findings.** Some entries have zero findings. The Findings section should not appear when there are no findings to show.
- **`--json` suppresses console output.** When `--json` is passed, only JSON goes to stdout. No status icon, no chain line, no nudge. The JSON IS the output.

## Rejected Approaches

- **JSON on main path only, skip recovery.** The recovery path produces output that consumers may depend on. A CI gate calling `work complete --json` that hits the recovery path would get console text instead of JSON. Both paths must speak the same language.
- **Proof card shows all findings.** A card with 12+ findings is a wall of text. Top 5 sorted by severity gives the most important information. `--json` provides the full list.

## Open Questions

- The planner should check whether the recovery path's manual findings count (work.ts:1090-1092) should be replaced with `computeChainHealth` for both JSON and non-JSON output. This would eliminate the duplicate counting mechanism flagged by finding `harden-git-commit-calls-C3`.

## Exploration Findings

### Patterns Discovered

- Main completion output at work.ts:1285-1292: `statusIcon`, result, feature, contract counts, chain line with stats. This is the human-readable format that `--json` replaces.
- Recovery path at work.ts:1081-1099: manual loop counting (`for (const e of chain.entries)`) instead of `computeChainHealth`. Returns early at line 1099. Finding `harden-git-commit-calls-C3` flags this as "two different counting mechanisms for the same display."
- `work status --json` already exists (work.ts:1306) — follows the same four-key envelope pattern. Structural precedent for `work complete --json`.
- `computeChainHealth` (proofSummary.ts:682-707) is the canonical health computation. After Phase B it includes `by_severity` and `by_action`. Using it in both completion paths guarantees consistent meta blocks.

### Constraints Discovered

- [TYPE-VERIFIED] Main path has `proof` (ProofSummary) and `stats` (ProofChainStats) available at output time (work.ts:1285)
- [TYPE-VERIFIED] Recovery path has `proof` (from `generateProofSummary`) but computes its own stats inline (work.ts:1084-1093)
- [OBSERVED] Recovery path doesn't have `stats.newFindings` — it only counts total findings. The JSON `results.new_findings` field may need to be `0` or omitted on recovery.
- [OBSERVED] `formatHumanReadable` in proof.ts is the proof card formatter. Currently shows result, assertions, timing, hashes. Findings section is a new block added after existing sections.

### Test Infrastructure

- `work.test.ts` — completion tests create plan directories with artifacts, run `completeWork`, assert console output. `--json` tests follow the same setup but assert JSON structure.
- `proof.test.ts` — `formatHumanReadable` tests pass a ProofSummary object and assert output string content. Finding display tests add findings to the summary and assert badge format.

## For AnaPlan

### Structural Analog

`close-the-loop` (`.ana/plans/completed/close-the-loop/scope.md`). Same shape: adding `--json` output to an existing command + display enhancements on proof commands. `close-the-loop` added `--json` to `proof close`, `proof audit`, `proof context`, `proof list`. This scope adds `--json` to `work complete` and display to `proof {slug}`.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts:1285-1292` — main completion output (the code `--json` replaces)
- `packages/cli/src/commands/work.ts:1060-1099` — recovery path with early return (must also produce JSON)
- `packages/cli/src/commands/work.ts:1300-1330` — `registerWorkCommand` where `--json` option is added
- `packages/cli/src/commands/proof.ts` — `formatHumanReadable` function (proof card formatter)
- `packages/cli/src/utils/proofSummary.ts:682-707` — `computeChainHealth` (meta block source)
- `packages/cli/src/utils/proofSummary.ts:649-657` — `JsonEnvelope` type (four-key envelope)

### Patterns to Follow

- JSON envelope pattern from `proof.ts` — `{ command: string, timestamp: string, results: T, meta: ChainHealth }`. Every proof command uses this exact shape.
- `--json` suppression pattern from `proof close` — when `--json` passed, `console.log(JSON.stringify(envelope, null, 2))` replaces all console output.
- Proof card section pattern from `formatHumanReadable` — section header with `────────` underline, indented content lines.

### Known Gotchas

- The recovery path returns early (line 1099). The `--json` check must happen BEFORE the return, not after. If the planner puts JSON output logic only at the main path's end, recovery produces no JSON.
- The recovery path doesn't call `computeChainHealth`. It reads the chain file and loops manually. For JSON output, it should call `computeChainHealth` to produce the meta block. This means importing `computeChainHealth` at the recovery path call site (it may already be imported for the main path).
- `stats.newFindings` is available on the main path but not the recovery path. The JSON `results` object should handle this: either compute it on recovery or default to `0` with a note that recovery can't determine new findings.

### Things to Investigate

- Does the recovery path need to unify its output logic with the main path? The duplicate counting mechanism is a known finding. The planner should decide whether `--json` is the right moment to refactor, or whether to handle both paths independently and leave unification for a future scope.

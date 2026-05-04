# Scope: Phase-Aware Work Start

**Created by:** Ana
**Date:** 2026-05-02

## Intent

Extend `ana work start {slug}` to auto-detect the current pipeline phase and record phase-specific timestamps. Currently only Think uses work start. Plan, Build, and Verify have no start timestamp — their timing is computed from artifact save gaps, which includes developer idle time between agents and produces Plan=0 when plan+contract save atomically.

After this ships, every agent runs `ana work start {slug}` after the developer confirms what to work on. The CLI detects the phase from what artifacts exist, validates prerequisites, pulls, and records the timestamp. Timing becomes accurate per phase. Prerequisite validation becomes mechanical.

## Complexity Assessment
- **Size:** medium
- **Files affected:** `src/commands/work.ts` (extend startWork), `src/utils/proofSummary.ts` (update computeTiming), `tests/commands/work.test.ts` (new phase tests), `tests/utils/proofSummary.test.ts` (timing tests), `templates/.claude/agents/ana-plan.md`, `templates/.claude/agents/ana-build.md`, `templates/.claude/agents/ana-verify.md`, `.claude/agents/` dogfood copies
- **Blast radius:** work start gains new behavior for existing slugs. computeTiming gains new timestamp sources with fallbacks. Three agent templates gain one line and lose a few lines each. No changes to artifact save, work complete, or work status.
- **Estimated effort:** 1-2 days across 2 specs
- **Multi-phase:** yes — CLI changes first, then template updates

## Approach

**Phase 1: CLI changes.** Extend `startWork` in work.ts to handle existing slugs. Currently it exits with "slug already exists." After this change, if the slug exists, it detects which phase is next from the artifacts present, validates prerequisites, pulls, records the phase timestamp, and prints what to do. Add corresponding changes to `computeTiming` to use the new timestamps with fallbacks for old entries.

**Phase 2: Template updates.** Add `ana work start {slug}` to Plan, Build, and Verify templates. Remove the lines it replaces (branch check for Plan, pull instructions for all three). Sync dogfood copies.

### Phase detection logic

The command looks at what artifacts exist in `.ana/plans/active/{slug}/`:

| Artifacts present | Phase | Timestamp key | Prerequisite check |
|---|---|---|---|
| Nothing (directory just created) | Think | `work_started_at` (existing) | — |
| `scope.md` exists, no `plan.md` | Plan | `plan_started_at` | scope.md exists |
| `spec.md` + `contract.yaml` exist, no `build_report.md` | Build | `build_started_at` | spec + contract exist |
| `build_report.md` exists, no `verify_report.md` | Verify | `verify_started_at` | build report exists |

If the state doesn't match any phase (e.g., all artifacts exist — work is complete), the command prints an error: "Work item {slug} is already complete or in an unrecognized state."

### What the command does per phase

**All phases:** pull (skip if no remotes, warn on conflict — existing pattern from Think).

**Plan phase additionally:** validate artifact branch (same check as Think — must be on artifact branch). This is the same code path, no new logic.

**Build phase additionally:** validate prerequisites only. No branch handling — template keeps branch creation/checkout.

**Verify phase additionally:** validate prerequisites only. No branch handling — template keeps branch checkout.

### Timing computation update

```
Think  = scope.saved_at - work_started_at          (existing, unchanged)
Plan   = contract.saved_at - plan_started_at        (NEW — falls back to old computation if plan_started_at absent)
Build  = build_report.saved_at - build_started_at   (NEW — falls back to contractTime if build_started_at absent)
Verify = verify_report.saved_at - verify_started_at (NEW — falls back to buildTime if verify_started_at absent)
```

Old entries without the new timestamps compute timing the old way. New entries get accurate per-phase timing.

## Acceptance Criteria

- AC1: `ana work start {slug}` on an existing slug with scope.md (but no plan) records `plan_started_at` in `.saves.json`
- AC2: `ana work start {slug}` on an existing slug with spec+contract (but no build report) records `build_started_at` in `.saves.json`
- AC3: `ana work start {slug}` on an existing slug with build report (but no verify report) records `verify_started_at` in `.saves.json`
- AC4: Plan phase validates artifact branch and exits with error if wrong
- AC5: Build phase validates spec.md and contract.yaml exist and exits with error if missing
- AC6: Verify phase validates build_report.md exists and exits with error if missing
- AC7: All phases pull before recording timestamp
- AC8: `computeTiming` uses `plan_started_at` for Plan timing when available, falls back to old computation when absent
- AC9: `computeTiming` uses `build_started_at` for Build timing when available, falls back to old computation when absent
- AC10: `computeTiming` uses `verify_started_at` for Verify timing when available, falls back to old computation when absent
- AC11: Existing Think phase behavior is unchanged (new slug creates directory, records work_started_at)
- AC12: Plan template adds `ana work start {slug}` and removes branch check instructions
- AC13: Build template adds `ana work start {slug}` and removes pull from resume/fix paths
- AC14: Verify template adds `ana work start {slug}` and removes pull instruction
- AC15: Dogfood copies match templates
- AC16: All existing tests pass, new tests cover each phase

## Edge Cases & Risks

- **Slug exists but is complete (in completed/).** The existing check at line 1366 handles this — exits with "already exists in completed." This stays unchanged. Work start only auto-detects for active slugs.
- **Multi-phase builds.** Build might run multiple times (spec-1.md, spec-2.md). Each `ana work start` overwrites `build_started_at`. Timing for each phase is from the latest start to the latest build report save. This is correct — we want the timing for the current phase, not the first.
- **Re-verification after FAIL.** Verify report exists with FAIL result. The developer runs Build to fix, then Verify again. When Build runs work start, build_report.md exists AND verify_report.md exists. Phase detection: if verify_report contains FAIL and the work status is "needs-fixes", this is Build phase. For v1: defer this case. The command prints an error for unrecognized state. The agent falls back to the template's manual startup. This is an edge case that doesn't block the primary value (timestamp recording for clean runs).
- **Developer runs work start twice.** The timestamp overwrites. No harm — the latest start is the correct one.

## Rejected Approaches

- **Separate commands per agent (`ana plan start`, `ana build start`, `ana verify start`).** More surface area, same functionality. One command with auto-detection is simpler for agents and developers.
- **Include branch creation for Build.** Complex — new build vs resume vs needs-fixes have different branch requirements. Defer to v2.
- **Include branch checkout for Verify.** Medium complexity — needs to know the feature branch name. Defer to v2.
- **Include work status in work start.** They serve different purposes. Status is read-only discovery. Start is a commitment with side effects (timestamp, pull). Keep them separate.

## Open Questions

- Should the command handle the needs-fixes case in v1 (verify_report exists with FAIL), or print an error and let the template handle it? Recommend: print error, defer to v2. The template already handles this case.
- For multi-phase, should `build_started_at` track per-phase (`build_started_at_1`, `build_started_at_2`) or overwrite? Recommend: overwrite. Per-phase timing is computed from the latest start to the latest report. Simpler.

## Exploration Findings

### Patterns Discovered
- `work.ts:1336-1404`: existing `startWork` function. Currently exits at line 1362 if slug exists in active. The change: instead of exiting, detect phase and continue.
- `proofSummary.ts:1405-1445`: existing `computeTiming` function. Uses `work_started_at` for Think timing. Same pattern extends to `plan_started_at`, `build_started_at`, `verify_started_at`.
- The `.saves.json` already stores mixed types — `SaveEntry` objects (saved_at + hash) for artifacts and a raw ISO string for `work_started_at`. The new timestamps are the same shape as `work_started_at` — raw ISO strings.

### Constraints Discovered
- [TYPE-VERIFIED] `SavesData` interface allows string index access but types it as `SaveEntry | PreCheckData | undefined`. The `work_started_at` workaround reads it as `unknown` and checks `typeof === 'string'`. Same pattern for new timestamps.
- [OBSERVED] `startWork` currently has 7 steps. Phase detection inserts between step 4 (uniqueness check) and step 5 (pull). If slug exists in active → detect phase instead of exiting.
- [OBSERVED] `strengthen-weak-test-assertions` used `ana work start` and got Think=1min, Plan=12min — first proof that the pattern works.

### Test Infrastructure
- `work.test.ts`: existing tests for `startWork` at lines ~2610-2690. Test helper `createMergedProject` creates full project fixtures. New tests create active slugs with various artifact combinations to test phase detection.
- `proofSummary.test.ts`: existing `computeTiming` tests. Add tests with new timestamp keys.

## For AnaPlan

### Structural Analog
The existing `startWork` function IS the analog. Phase detection extends it — same branch check, same pull, same timestamp write, just conditional on what artifacts exist.

### Relevant Code Paths
- `src/commands/work.ts:1336-1404` — `startWork` (extend with phase detection)
- `src/commands/work.ts:1360-1365` — the "slug exists" exit (change to phase detection)
- `src/utils/proofSummary.ts:1405-1445` — `computeTiming` (add new timestamp sources)
- `tests/commands/work.test.ts:2610-2690` — work start tests
- `templates/.claude/agents/ana-plan.md` — Plan startup
- `templates/.claude/agents/ana-build.md` — Build startup
- `templates/.claude/agents/ana-verify.md` — Verify startup

### Patterns to Follow
- `work_started_at` read pattern at proofSummary.ts:1412-1415 — `typeof === 'string'` check, same for new timestamps
- Branch validation at work.ts:1347-1357 — reuse for Plan phase
- Pull logic at work.ts:1371-1384 — shared across all phases

### Known Gotchas
- The "slug already exists in active" error at line 1362 is the current behavior. Changing it to "detect phase" is a behavior change for the existing command. The Think phase path must still create the directory — only when the slug is truly new (directory doesn't exist). When the directory exists, it's a subsequent phase.
- `computeTiming` must not break for old entries. Every new timestamp check needs a `?? null` fallback that triggers the old computation path.
- Template changes should NOT remove `ana work status` — it stays as the first action. `ana work start` runs AFTER the developer confirms which work item to proceed with.

### Things to Investigate
- The exact artifact file names for multi-phase builds (`build_report_1.md` vs `build_report.md`). Phase detection for Build needs to check both single-spec and multi-spec filenames.
- Whether `plan.md` or `spec.md` is the better Plan-complete signal. `plan.md` is always present (required by CLI). `spec.md` (or `spec-1.md`) is the actual plan output. Contract is saved with the spec via `save-all`. Check what `ana work status` uses.

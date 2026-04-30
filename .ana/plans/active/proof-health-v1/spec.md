# Spec: Proof Health V1

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/proof-health-v1/scope.md

## Approach

Health V1 adds two surfaces: `ana proof health` (a read-only subcommand) and a change-driven fourth line in `work complete` output.

All computation lives in a single pure function `computeHealthReport()` in `proofSummary.ts`, placed directly after `computeChainHealth()` (line 756). The function takes a parsed chain and returns a `HealthReport` — trajectory, hot modules, promotion candidates, and promotion effectiveness. The subcommand in `proof.ts` calls this function and formats output. The fourth line in `work.ts` calls it twice (full chain vs chain-minus-last-entry) and compares.

`HealthReport` is a separate type from `ChainHealth`. `ChainHealth` is the meta block (what exists). `HealthReport` is the analysis layer (what's trending, what's hot, what's actionable). Zero field overlap. `HealthReport` lives in `types/proof.ts` alongside the other proof types.

### Key design decisions

**Trajectory is per-entry, not cumulative.** Each entry's risk count is the number of `severity: risk` findings in that entry's `findings` array. This measures "is each pipeline run getting cleaner?" — not "is the total growing." `computeChainHealth` counts across ALL findings including closed/lesson. Trajectory counts per-entry production only.

**Change detection via chain slicing.** Compute `computeHealthReport(chain)` and `computeHealthReport({ entries: chain.entries.slice(0, -1) })`. Compare: trend direction changed? New hot modules crossed threshold? New promote candidates appeared? If any trigger fires, show the fourth line. No persistence file needed.

**Promotion effectiveness matches severity + category + file.** When a finding is promoted, effectiveness tracks findings with the same `severity`, `category`, and `file` in subsequent entries. A promoted debt/code finding on `proofSummary.ts` tracks subsequent debt + code findings on that file — not risk findings generically. This ensures the computation is correct from launch even though zero promotions exist.

**Named constants for thresholds.** `MIN_FINDINGS_HOT = 3` and `MIN_ENTRIES_HOT = 2` are exported module-level constants in `proofSummary.ts`. `TRAJECTORY_WINDOW = 5` and `MIN_ENTRIES_FOR_TREND = 10` likewise. These aren't magic numbers in comparisons — they're documented, testable, and future-configurable.

## Output Mockups

### `ana proof health` (terminal)

```
Proof Health: 28 runs

Trajectory
  Risks/run (last 5):  0.8
  Risks/run (all):     1.2
  Trend:               improving
  Unclassified:        3 findings (excluded from trajectory)

Hot Modules (3+ findings from 2+ runs)
  src/utils/proofSummary.ts    5 findings (2 risk, 2 debt, 1 observation)  from 4 runs
  src/commands/proof.ts        3 findings (1 risk, 1 debt, 1 observation)  from 3 runs

Promotion Candidates
  F042  [risk · promote]  Anchor stripping regex false-positives
  F018  [debt · scope]    Dashboard duplicates Active Issues logic  (recurring: 2 entries)
```

With fewer than 10 entries (insufficient data for trend):
```
Proof Health: 7 runs

Trajectory
  Risks/run (last 5):  1.4
  Risks/run (all):     1.4
  Trend:               insufficient data (need 10+ runs)
  Unclassified:        0

Hot Modules (3+ findings from 2+ runs)
  No hot modules.

Promotion Candidates
  No candidates.
```

With empty chain:
```
Proof Health: 0 runs

Trajectory
  No data.
```

With all findings unclassified:
```
Proof Health: 12 runs

Trajectory
  Risks/run (last 5):  no classified data
  Risks/run (all):     no classified data
  Trend:               no classified data
  Unclassified:        47 findings (excluded from trajectory)
```

### `ana proof health --json`

```json
{
  "command": "proof health",
  "timestamp": "2026-04-29T...",
  "results": {
    "runs": 28,
    "trajectory": {
      "risks_per_run_last5": 0.8,
      "risks_per_run_all": 1.2,
      "trend": "improving",
      "unclassified_count": 3
    },
    "hot_modules": [
      {
        "file": "src/utils/proofSummary.ts",
        "finding_count": 5,
        "entry_count": 4,
        "by_severity": { "risk": 2, "debt": 2, "observation": 1, "unclassified": 0 }
      }
    ],
    "promotion_candidates": [
      {
        "id": "F042",
        "severity": "risk",
        "suggested_action": "promote",
        "summary": "Anchor stripping regex false-positives",
        "file": "src/commands/proof.ts",
        "entry_slug": "close-the-loop"
      }
    ],
    "promotions": []
  },
  "meta": { "chain_runs": 28, "findings": { ... } }
}
```

When trajectory has insufficient data, `trend` is `"insufficient_data"`. When all findings are unclassified, `risks_per_run_last5` and `risks_per_run_all` are `null`, `trend` is `"no_classified_data"`.

### `work complete` fourth line (terminal)

When trajectory improved:
```
  Health: trend improved (risks/run 1.4 → 0.8)
```

When new promote candidates appeared:
```
  Health: 2 new promotion candidates
```

When a module crossed the hot threshold:
```
  Health: src/commands/proof.ts is now a hot module
```

Multiple triggers combine:
```
  Health: trend improved (risks/run 1.4 → 0.8) · 1 new candidate
```

### `work complete --json` quality key

```json
{
  "slug": "...",
  "feature": "...",
  "result": "PASS",
  "contract": { ... },
  "new_findings": 3,
  "rejection_cycles": 0,
  "quality": {
    "changed": true,
    "trajectory": {
      "risks_per_run_last5": 0.8,
      "risks_per_run_all": 1.2,
      "trend": "improving"
    },
    "triggers": ["trend_improved"]
  }
}
```

When no change detected, `quality.changed` is `false`, `triggers` is `[]`, and trajectory is still present (snapshot).

## File Changes

### `packages/cli/src/types/proof.ts` (modify)

**What changes:** Add `HealthReport`, `TrajectoryData`, `HotModule`, `PromotionCandidate`, `PromotionEffectiveness`, and `HealthChange` types.

**Pattern to follow:** Existing `ChainHealth` interface in `proofSummary.ts` for the counting structure. `ProofChainEntry` in `types/proof.ts` for field naming conventions (snake_case for serialized fields).

**Why:** The health computation function needs a return type. The types must be importable by both `proofSummary.ts` (computation) and `proof.ts`/`work.ts` (consumers) without circular dependencies. `types/proof.ts` is the established location for proof chain types.

### `packages/cli/src/utils/proofSummary.ts` (modify)

**What changes:** Add `computeHealthReport()` pure function and `detectHealthChange()` function. Add threshold constants (`MIN_FINDINGS_HOT`, `MIN_ENTRIES_HOT`, `TRAJECTORY_WINDOW`, `MIN_ENTRIES_FOR_TREND`). Export all for testability.

**Pattern to follow:** `computeChainHealth()` at line 701 — same structure: takes a chain, iterates entries and findings, returns a typed result. Pure, synchronous, no I/O.

**Why:** Health computation must be independently testable with synthetic chain data. Separating computation from display follows the existing layering (proofSummary.ts computes, proof.ts displays).

### `packages/cli/src/commands/proof.ts` (modify)

**What changes:** Add `health` subcommand registration after the audit subcommand (after line 736). The subcommand reads the chain, calls `computeHealthReport()`, formats terminal dashboard or JSON envelope.

**Pattern to follow:** Audit subcommand at lines 569-736. Same structure: read-only, reads proof_chain.json, no branch check, handles missing chain, handles `--json` via both own option and parent `proofCommand.opts()`, uses `wrapJsonResponse` for JSON output.

**Why:** Health is a proof subcommand. Following the audit pattern keeps registration, error handling, and JSON output consistent.

### `packages/cli/src/commands/work.ts` (modify)

**What changes:** After proof summary generation (line 1281), compute health change by calling `detectHealthChange()` with the current chain. Add fourth line to terminal output (after line 1347). Add `quality` key to `jsonResults` object (before line 1339). Do NOT modify the recovery path (lines 1078-1128).

**Pattern to follow:** The existing chain summary line at lines 1344-1347 for terminal placement. The existing `jsonResults` object at lines 1326-1338 for JSON structure.

**Why:** The fourth line surfaces trajectory changes at the moment of completion — the only time the developer is looking at pipeline output. The `quality` key is a permanent JSON contract addition for AI consumers.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)

**What changes:** Add `computeHealthReport` and `detectHealthChange` test suites after the existing `computeChainHealth` tests (after line 2144). Tests use synthetic chain data — same pattern as the `computeChainHealth` tests.

**Pattern to follow:** `computeChainHealth` tests at lines 2018-2144. Same structure: construct a chain object with specific findings, call the function, assert on the returned fields.

**Why:** The computation functions are the core of this feature. Unit tests with synthetic data give fast, deterministic coverage of trajectory calculation, hot module detection, promotion candidate filtering, and edge cases.

### `packages/cli/tests/commands/proof.test.ts` (modify)

**What changes:** Add `ana proof health` test suite. Tests use the `createProofChain` helper and `runProof` helper already in the file.

**Pattern to follow:** Existing audit tests in the same file. Same structure: create temp dir, write proof_chain.json, run the CLI, assert on stdout.

**Why:** Integration tests verify the subcommand registration, chain reading, and terminal/JSON formatting work end-to-end through the compiled CLI.

### `packages/cli/tests/commands/work.test.ts` (modify)

**What changes:** Add test cases for the fourth line in `completeWork` output. Tests construct chains with trajectory data that triggers change detection, then verify the fourth line appears (or doesn't appear when nothing changed).

**Pattern to follow:** Existing `completeWork` happy path tests. Same structure: create a work test project with specific artifacts, call `completeWork`, assert on console output.

**Why:** The fourth line is conditional — it only appears when health detects a change. Tests must cover both the "change detected" and "no change" paths.

## Acceptance Criteria

- [ ] AC1: `ana proof health` displays severity breakdown, action breakdown, trajectory (risks/run last 5, lifetime, trend), hot modules (top 5 by active finding count), and promotion candidates (findings with `suggested_action: promote`, plus recurring `scope` findings)
- [ ] AC2: `ana proof health --json` outputs the four-key envelope with `command: "proof health"` and `results` containing runs, trajectory, hot_modules, promotion_candidates, promotions
- [ ] AC3: `work complete` (non-JSON) displays a fourth line when health detects a change: trajectory direction shift, new promote candidates, or a module crossing the hot threshold
- [ ] AC4: `work complete --json` includes health change data in `results.quality` — an object containing whether a change was detected, the trajectory snapshot, and which trigger fired
- [ ] AC5: `ana proof health` with an empty chain outputs zeros and no errors
- [ ] AC6: `ana proof health` with pre-backfill data (findings lacking severity) counts them as `unclassified` in the trajectory — the metric is computed on classified findings only, unclassified are reported separately
- [ ] AC7: Promotion effectiveness section displays "tracking..." for promoted findings with fewer than 5 subsequent entries, and computes reduction percentage when data is sufficient. When no findings have been promoted, the promotions section does not appear in terminal; JSON shows empty array
- [ ] AC8: The fourth line does NOT appear when nothing changed — if trajectory is stable, no new candidates, no new hot modules, the third line (chain summary) is the last line
- [ ] AC9: Trajectory counts risk findings per entry (the findings that entry produced), not cumulative active risks across the chain
- [ ] AC10: With fewer than 10 entries, trend reports "insufficient data" instead of comparing windows. With fewer than 5 entries, "last 5" equals "all"
- [ ] AC11: Hot modules are files with 3+ active findings from 2+ distinct entries. The threshold values are named constants, not hardcoded comparisons
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `pnpm run build`
- [ ] No lint errors with `pnpm run lint`

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** Core computation coverage. Build synthetic chains with controlled findings and assert on `computeHealthReport` return values. Test matrix:
  - Trajectory: 0 entries, 1 entry, 5 entries (last5 = all), 10 entries (trend calculable), entries with mixed severity, entries with all unclassified
  - Hot modules: no hot modules, one module crosses threshold, multiple hot modules sorted by count, module with only observations (verify severity breakdown shows it)
  - Promotion candidates: no candidates, `suggested_action: promote` findings, recurring scope findings (2+ entries), mix of both
  - Promotion effectiveness: no promotions, promotion with < 5 subsequent entries ("tracking"), promotion with 5+ entries (compute reduction by matching severity + category + file), promotion where subsequent findings improved vs worsened
  - `detectHealthChange`: trend direction shift, new hot module, new promote candidates, no change (stable), first entry (no fourth line)

- **Integration tests (proof.test.ts):** Subcommand tests. Create a proof chain file, run `ana proof health` via the compiled CLI, assert terminal output contains expected sections and values. Test both `--json` and human-readable paths. Test empty chain. These run against `dist/index.js`.

- **Integration tests (work.test.ts):** Fourth line tests. Create a work project with a proof chain that triggers change detection, run `completeWork`, capture console output, verify the fourth line appears with the correct trigger description. Test the "no change" case to verify the line is absent.

- **Edge cases:** Empty chain (AC5). All unclassified (AC6). Single entry — no fourth line (AC8 + first-run edge). Pre-backfill entries missing severity/suggested_action fields entirely.

## Dependencies

- Proof chain must exist (`proof_chain.json`). Health gracefully handles missing file (same as audit).
- No new npm dependencies.
- No schema changes to proof_chain.json — health reads existing fields only.

## Constraints

- **No proof chain mutations.** Health is read-only. It computes over existing data, never writes.
- **No new files in `.ana/`.** No health baseline, no health cache. The chain IS the history.
- **Backward compatibility.** Old entries lacking `severity` or `suggested_action` fields must be handled — count as `unclassified`. The `ProofChainEntry` type already marks these as optional.
- **JSON contract permanence.** The `quality` key in `work complete --json` is a permanent addition. Its shape must be stable from V1 — AI consumers will parse it.

## Gotchas

- **`computeChainHealth` vs trajectory iteration.** `computeChainHealth` counts ALL findings across ALL entries (active + closed + lesson). Trajectory must count risk findings PER ENTRY — the findings produced by that single run. These require different iteration patterns. Don't try to reuse `computeChainHealth` for trajectory.

- **Fourth line in recovery path.** The recovery path at lines 1078-1128 in work.ts re-commits an incomplete completion. It is NOT a new pipeline run. Do NOT add the fourth line or quality data to recovery output.

- **`--json` parent inheritance.** Proof subcommands get `--json` from both their own options and the parent `proofCommand.opts()`. The pattern is `const useJson = options.json || parentOpts['json']`. Health must follow this — see context command at line 360-361 and close command at line 390-391.

- **Chain re-read in work.ts.** The main `completeWork` path re-reads `proof_chain.json` from disk at line 1318 for meta computation (known build concern — `writeProofChain` returns stats, not the chain object). Health change detection needs the chain too. Read it once and reuse for both `computeChainHealth` (meta) and `detectHealthChange` (quality).

- **Promotion effectiveness matching.** Track findings matching the promoted finding's `severity` + `category` + `file` in subsequent entries. Not just risk findings. Not just same file. The triple match ensures the metric answers "did promoting this specific type of finding on this file actually reduce recurrence?"

- **`proofSummary.ts` is already 1421 lines.** The new function adds ~120 lines. Keep it focused — computation only, no formatting, no chalk. Formatting belongs in proof.ts.

- **SEVERITY_WEIGHT duplication.** proof.ts already has a local `SEVERITY_WEIGHT` map in the audit block. Health may need severity ordering for hot module display. If so, extract to a module-level constant rather than duplicating a third time. Check if this is needed during implementation — if hot modules just show the breakdown object without sorting by severity, no extraction needed.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins
- Use `import type` for type-only imports, separate from value imports
- Named exports only — no default exports
- Explicit return types on all exported functions
- Exported functions require `@param` and `@returns` JSDoc tags
- `| null` for checked-and-empty fields, `?:` for may-not-exist fields
- Early returns over nested conditionals
- Always pass `--run` flag when running vitest
- Engine/utils have zero CLI dependencies — no chalk in proofSummary.ts

### Pattern Extracts

**Audit subcommand registration (proof.ts:569-580):**
```typescript
  const auditCommand = new Command('audit')
    .description('List active findings grouped by file')
    .option('--json', 'Output JSON format')
    .action(async (options: { json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      // Read chain (no branch check — audit is read-only)
      if (!fs.existsSync(proofChainPath)) {
```

**computeChainHealth signature and iteration (proofSummary.ts:701-722):**
```typescript
export function computeChainHealth(chain: { entries: Array<{ findings?: Array<{ status?: string; severity?: string; suggested_action?: string }> }> }): ChainHealth {
  const runs = chain.entries.length;
  let total = 0;
  // ...counters...

  for (const e of chain.entries) {
    for (const f of e.findings || []) {
      total++;
      switch (f.status) {
```

**work.ts JSON output construction (work.ts:1326-1339):**
```typescript
    const jsonResults = {
      slug,
      feature: proof.feature,
      result: proof.result,
      contract: {
        total: proof.contract.total,
        satisfied: proof.contract.satisfied,
        unsatisfied: proof.contract.unsatisfied,
        deviated: proof.contract.deviated,
      },
      new_findings: stats.newFindings,
      rejection_cycles: proof.rejection_cycles ?? 0,
    };
    console.log(JSON.stringify(wrapJsonResponse('work complete', jsonResults, mainChain), null, 2));
```

**work.ts terminal output (work.ts:1341-1347):**
```typescript
    const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
    console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
    console.log(`  ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
    const chainLine = stats.newFindings > 0
      ? `  Chain: ${stats.runs} ${stats.runs !== 1 ? 'runs' : 'run'} · ${stats.findings} finding${stats.findings !== 1 ? 's' : ''} (+${stats.newFindings} new)`
      : `  Chain: ${stats.runs} ${stats.runs !== 1 ? 'runs' : 'run'} · ${stats.findings} finding${stats.findings !== 1 ? 's' : ''}`;
    console.log(chalk.gray(chainLine));
```

**computeChainHealth test pattern (proofSummary.test.ts:2018-2035):**
```typescript
describe('computeChainHealth', () => {
  // @ana A026
  it('returns by_severity with correct counts for mixed severity values', () => {
    const chain = {
      entries: [{
        findings: [
          { status: 'active', severity: 'risk', suggested_action: 'scope' },
          { status: 'active', severity: 'risk', suggested_action: 'promote' },
          { status: 'active', severity: 'debt', suggested_action: 'monitor' },
          { status: 'active', severity: 'observation', suggested_action: 'accept' },
        ],
      }],
    };
    const health = computeChainHealth(chain);
    expect(health.findings.by_severity).toEqual({
      risk: 2, debt: 1, observation: 1, unclassified: 0,
    });
  });
```

### Proof Context

**proofSummary.ts:** 10 active findings. Most relevant to this build:
- `SEVERITY_WEIGHT` map is local to audit command block — if severity sort is needed in health, extract to module-level. Check during implementation.
- `ProofSummary.result` still typed as `string` not union — not blocking for health (health reads `ProofChainEntry`, not `ProofSummary`).

**proof.ts:** 5 active findings. Most relevant:
- Duplicate `from:` line in audit human-readable display (line 660/661) — don't replicate this bug in health display.
- `SEVERITY_WEIGHT` duplication concern — same as above.

**work.ts:** 5 active findings. Most relevant:
- Main path re-reads `proof_chain.json` from disk for `computeChainHealth` after `writeProofChain` just wrote it. Health change detection should reuse this same read, not add a third read.
- Recovery path leaks non-JSON text to stdout before JSON envelope — don't add health output to recovery path.

### Checkpoint Commands

- After `computeHealthReport` function added: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: existing tests pass + new health tests pass
- After health subcommand added: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: existing tests pass + new health tests pass
- After fourth line added: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts)` — Expected: existing 86 tests pass + new fourth line tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1657 passed, 2 skipped (1659 total)
- Current test files: 97 passed (97)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1690+ tests in 97 files (no new test files — tests added to existing files)
- Regression focus: `proofSummary.test.ts` (health function tests share file with existing tests), `proof.test.ts` (new subcommand tests alongside existing), `work.test.ts` (fourth line tests alongside existing completeWork tests)

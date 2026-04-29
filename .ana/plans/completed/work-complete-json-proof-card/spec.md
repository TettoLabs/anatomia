# Spec: Work Complete JSON + Proof Card Findings

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/work-complete-json-proof-card/scope.md

## Approach

Two changes to the CLI's proof surface:

1. **`work complete --json`** — add the `--json` flag using the same four-key envelope (`command`, `timestamp`, `results`, `meta`) that every other proof command uses. Both the main completion path and the crash-recovery path produce identical JSON structure. The `results` key carries completion summary fields. The `meta` key uses `computeChainHealth` for canonical chain health data including Phase B severity/action breakdowns.

2. **Proof card findings display** — `formatHumanReadable` in proof.ts gains two new sections: Findings and Build Concerns. Each shows `[severity · action]` badges per item, sorted by severity (risk → debt → observation), top 5 with truncation. Pre-Phase B entries (missing severity/action) display without badges.

**Recovery path design decision:** The recovery path (work.ts ~line 1067-1107) reads the proof chain file and counts manually. For JSON output, it calls `computeChainHealth` to produce the canonical `meta` block. The non-JSON console output stays unchanged — no refactoring of the manual counting loop. `results.new_findings` is `0` on recovery because the chain was already written in a prior run and recovery can't determine which findings were new.

**`completeWork` signature change:** The function gains an `options` parameter: `{ json?: boolean }`. The command registration passes the option through. All existing callers in tests call `completeWork(slug)` without options — the parameter is optional with no breaking change.

## Output Mockups

### `ana work complete my-feature --json`

```json
{
  "command": "work complete",
  "timestamp": "2026-04-29T10:30:00.000Z",
  "results": {
    "slug": "my-feature",
    "feature": "My Feature Name",
    "result": "PASS",
    "contract": {
      "total": 12,
      "satisfied": 11,
      "unsatisfied": 0,
      "deviated": 1
    },
    "new_findings": 3,
    "rejection_cycles": 0
  },
  "meta": {
    "chain_runs": 5,
    "findings": {
      "active": 4,
      "closed": 2,
      "lesson": 1,
      "promoted": 0,
      "total": 7,
      "by_severity": {
        "risk": 1,
        "debt": 2,
        "observation": 1,
        "unclassified": 0
      },
      "by_action": {
        "promote": 1,
        "scope": 1,
        "monitor": 1,
        "accept": 0,
        "unclassified": 0
      }
    }
  }
}
```

### `ana work complete my-feature --json` (recovery path)

Same structure, but `new_findings` is `0`:

```json
{
  "command": "work complete",
  "timestamp": "2026-04-29T10:30:00.000Z",
  "results": {
    "slug": "my-feature",
    "feature": "My Feature Name",
    "result": "PASS",
    "contract": {
      "total": 12,
      "satisfied": 11,
      "unsatisfied": 0,
      "deviated": 1
    },
    "new_findings": 0,
    "rejection_cycles": 0
  },
  "meta": { ... }
}
```

### Proof card — Findings section

```
  Findings
  ────────
  [risk · promote] Unvalidated user input in webhook handler
  [risk · scope] Missing rate limit on payment endpoint
  [debt · monitor] Duplicate error handling across services
  [observation · accept] Console log left in production path
  [observation · monitor] TODO comment in auth middleware
  ... and 3 more
```

### Proof card — Build Concerns section

```
  Build Concerns
  ──────────────
  [debt · scope] Test coverage below threshold for payment module
  [observation · accept] Hardcoded timeout in retry logic
```

### Proof card — Pre-Phase B entry (no badges)

```
  Findings
  ────────
  Unvalidated user input in webhook handler
  Missing rate limit on payment endpoint
```

### Proof card — No findings (section omitted entirely)

The Findings section does not appear when `entry.findings` is empty or undefined. Same for Build Concerns.

## File Changes

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Three modifications: (1) `completeWork` signature gains `options?: { json?: boolean }` parameter, (2) main completion path (after step 13 print summary) adds JSON output branch that suppresses all console output and emits envelope via `wrapJsonResponse`, (3) recovery path (after step 5 recovery print) adds JSON output branch with same envelope structure using `computeChainHealth` for meta. (4) `registerWorkCommand` adds `--json` option to `completeCommand` and passes it through.
**Pattern to follow:** `getWorkStatus` in the same file — it accepts `options: { json?: boolean }` and branches on `options.json` for output.
**Why:** Without this, `work complete` is the only pipeline-critical command without structured output. CI gates and autonomous pipelines can't consume its results.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** `formatHumanReadable` gains two new sections after the Timing section and before the Deviations section: (1) Findings section showing `[severity · action]` badges, sorted by severity, top 5 with truncation. (2) Build Concerns section with same badge format and truncation rule.
**Pattern to follow:** The existing Timing section and Deviations section in `formatHumanReadable` — section header with `chalk.bold`, underline with `chalk.gray(BOX.horizontal.repeat(N))`, indented content lines.
**Why:** Findings and build concerns are invisible on the proof card surface. After Phase B ships, every finding carries severity and suggested_action — the proof card should surface them.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** New test block for `--json` output on `work complete`. Tests both main path and recovery path JSON structure. Tests that non-JSON output is unchanged when `--json` is not passed.
**Pattern to follow:** Existing `completeWork` tests in the same file — use `createMergedProject` helper, call `completeWork(slug, { json: true })`, capture stdout and parse JSON.
**Why:** Contract assertions require verification of JSON structure on both paths.

### `packages/cli/tests/commands/proof.test.ts` (modify)
**What changes:** New test block for findings display in proof card. Tests badge format, severity sorting, truncation at 5, graceful degradation without severity/action, empty findings (section omitted).
**Pattern to follow:** Existing proof card tests — use `createProofChain` with `sampleEntry` extended with findings, run `runProof(['slug'])`, assert stdout content.
**Why:** Contract assertions require verification of badge format and sorting.

## Acceptance Criteria

- [ ] AC1: `work complete` accepts `--json` flag
- [ ] AC2: Main completion path outputs four-key JSON envelope when `--json` is passed: `command: "work complete"`, `timestamp`, `results`, `meta`
- [ ] AC3: `results` includes: `slug` (string), `feature` (string), `result` (`'PASS' | 'FAIL' | 'UNKNOWN'`), `contract` (`{ total, satisfied, unsatisfied, deviated }`), `new_findings` (number), `rejection_cycles` (number)
- [ ] AC4: `meta` uses `computeChainHealth` — includes `by_severity` and `by_action` breakdowns
- [ ] AC5: Recovery path outputs the same four-key JSON envelope when `--json` is passed
- [ ] AC6: Recovery path JSON `results` matches the main path structure. `new_findings` is `0` on recovery.
- [ ] AC7: Non-JSON output is unchanged on both paths. `--json` is purely additive
- [ ] AC8: Proof card displays a Findings section with `[severity · action]` badges per finding
- [ ] AC9: Findings sorted by severity: risk → debt → observation
- [ ] AC10: Top 5 findings displayed. If more exist: `... and N more`
- [ ] AC11: Build concerns section with same `[severity · action]` badge format and truncation
- [ ] AC12: Findings and concerns without severity/action display without badges — no crash
- [ ] AC13: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC14: Lint passes: `pnpm lint`

## Testing Strategy

- **Unit tests (work.test.ts):** Test `completeWork(slug, { json: true })` on the main happy path. Capture stdout, parse JSON, assert all four envelope keys. Assert `results` fields match expected values. Test recovery path JSON by setting up the crash-recovery scenario (directory already in completed, uncommitted changes). Test that calling without `--json` produces unchanged console output (no JSON in stdout).
- **Unit tests (proof.test.ts):** Test `formatHumanReadable` with entries that have findings with severity/action — assert badge format `[risk · promote]`. Test severity sort order by providing findings in wrong order and asserting output order. Test truncation with 7+ findings — assert `... and 2 more`. Test pre-Phase B entries (no severity/action) — assert finding summary appears without brackets. Test empty findings — assert "Findings" header does not appear. Same pattern for build_concerns.
- **Edge cases:** Entry with exactly 5 findings (no truncation line). Entry with 0 build concerns but 3 findings (only Findings section appears). Mixed findings — some with badges, some without. Recovery path JSON when proof chain file is missing (meta should still compute from empty chain).

## Dependencies

- `finding-enrichment-schema` Phase B must be merged (scope states this dependency). The `severity` and `suggested_action` fields on `ProofChainEntry.findings` and `build_concerns` must exist in the type definition. Verified: they are present as optional fields in `src/types/proof.ts:74-75,88-89`.

## Constraints

- Non-JSON output must not change. Every existing test must pass unchanged.
- `--json` suppresses ALL console output — no status icons, chain lines, or nudges when JSON is active.
- The `wrapJsonResponse` helper from `proofSummary.ts` is the canonical envelope builder. Do not construct the envelope manually.
- Recovery path reads the chain file but does not write to it. The `meta` block comes from `computeChainHealth` on the parsed chain.

## Gotchas

- **Recovery path returns early (line 1107).** The `--json` check must happen BEFORE `return`. If JSON output logic only exists at the main path's end, recovery produces no JSON.
- **Recovery path needs the chain object for `computeChainHealth`.** It already reads and parses `proof_chain.json` at lines 1094-1101. Reuse that parsed chain object — don't re-read the file.
- **`stats.newFindings` vs recovery.** The main path gets `newFindings` from `writeProofChain`'s return value (`ProofChainStats`). The recovery path doesn't call `writeProofChain`. Use `0` for recovery `new_findings`.
- **`rejection_cycles` on recovery path.** The `generateProofSummary` result has `rejection_cycles`. Both paths have `proof` from `generateProofSummary` — use `proof.rejection_cycles` (defaulting to `0` if undefined).
- **`contract` shape mismatch.** `ProofSummary.contract` has `total`, `covered`, `uncovered`, `satisfied`, `unsatisfied`, `deviated`. The JSON `results.contract` only needs `total`, `satisfied`, `unsatisfied`, `deviated` — pick the four fields explicitly, don't spread the full object (that would leak `covered`/`uncovered` into the API).
- **`entry.findings` may be undefined on old entries.** The proof card must guard: `const findings = entry.findings || []`. Same for `entry.build_concerns`.
- **Severity sort order constant.** Define the severity priority as a lookup: `{ risk: 0, debt: 1, observation: 2 }`. Findings without severity sort last (priority `3`).
- **`sampleEntry` in proof.test.ts has no findings or build_concerns.** Existing tests won't break because the sections don't appear when these arrays are empty/missing. New tests need entries with populated findings.
- **`completeWork` function is exported and called in tests.** The signature change from `completeWork(slug: string)` to `completeWork(slug: string, options?: { json?: boolean })` is backward compatible — all existing callers pass only `slug`.

## Build Brief

### Rules That Apply
- ESM imports with `.js` extension: `import { wrapJsonResponse } from '../utils/proofSummary.js'` (already imported in work.ts)
- `import type` for type-only imports, separate from value imports
- Named exports only, no default exports
- Explicit return types on exported functions
- Exported functions require `@param` and `@returns` JSDoc tags
- Early returns over nested conditionals
- `vitest run` with `--run` flag to avoid watch mode

### Pattern Extracts

**JSON output branching in `getWorkStatus` (work.ts:720-724):**
```typescript
  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHumanReadable(output);
  }
```

**`wrapJsonResponse` usage (proofSummary.ts:767-774):**
```typescript
export function wrapJsonResponse<T>(command: string, results: T, chain: { entries: Array<{ findings?: Array<{ status?: string; severity?: string; suggested_action?: string }> }> }): JsonEnvelope<T> {
  return {
    command,
    timestamp: new Date().toISOString(),
    results,
    meta: computeChainHealth(chain),
  };
}
```

**Proof card section pattern (proof.ts:103-106 — Contract section):**
```typescript
  lines.push(chalk.bold('  Contract'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(8)));
  lines.push(`  ${entry.contract.satisfied}/${entry.contract.total} satisfied · ${entry.contract.unsatisfied} unsatisfied · ${entry.contract.deviated} deviated`);
```

**Recovery path chain parsing (work.ts:1094-1101):**
```typescript
          if (fs.existsSync(chainPath)) {
            try {
              const chain = JSON.parse(fs.readFileSync(chainPath, 'utf-8'));
              runs = Array.isArray(chain.entries) ? chain.entries.length : 0;
              for (const e of chain.entries || []) {
                findingsCount += (e.findings || []).length;
              }
            } catch { /* */ }
          }
```

**Main path summary output (work.ts:1293-1300):**
```typescript
  const statusIcon = proof.result === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${proof.result} — ${proof.feature}`);
  console.log(`  ${proof.contract.satisfied}/${proof.contract.total} satisfied · ${proof.deviations.length} deviation${proof.deviations.length !== 1 ? 's' : ''}`);
  const chainLine = stats.newFindings > 0
    ? `  Chain: ${stats.runs} ${stats.runs !== 1 ? 'runs' : 'run'} · ${stats.findings} finding${stats.findings !== 1 ? 's' : ''} (+${stats.newFindings} new)`
    : `  Chain: ${stats.runs} ${stats.runs !== 1 ? 'runs' : 'run'} · ${stats.findings} finding${stats.findings !== 1 ? 's' : ''}`;
  console.log(chalk.gray(chainLine));
```

### Proof Context

**work.ts:**
- [code] Recovery path counts total findings via loop but main path uses stats.findings — two different counting mechanisms for the same display. **Relevant:** directly informs our decision to use `computeChainHealth` for JSON meta on recovery instead of the manual loop.
- [build concern] Recovery path duplicates finding-count logic from computeChainHealth. **Relevant:** same issue, from a different pipeline run. Our approach adds JSON via `computeChainHealth` but doesn't refactor the non-JSON path.

**proof.ts:**
- [code] formatContextResult — No truncation on callout summaries in terminal output. **Not directly relevant** to proof card findings, but a reminder that long finding summaries may need consideration. The top-5 truncation handles volume; individual line length is acceptable for now.

### Checkpoint Commands

- After `work.ts` changes: `(cd packages/cli && pnpm vitest run tests/commands/work.test.ts)` — Expected: existing tests pass, new JSON tests pass
- After `proof.ts` changes: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: existing tests pass, new findings display tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all 1623+ tests pass
- Lint: `pnpm lint`

### Build Baseline
- Current tests: 1623 passed, 2 skipped (97 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1640+ tests (new JSON + proof card tests)
- Regression focus: `work.test.ts` (existing completeWork tests), `proof.test.ts` (existing formatHumanReadable tests)

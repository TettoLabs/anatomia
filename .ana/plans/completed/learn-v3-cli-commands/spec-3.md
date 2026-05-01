# Spec: Learn V3 Phase 3 — Stale + Audit Full + Template Cleanups

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/learn-v3-cli-commands/scope.md

## Approach

Four changes, all safe to ship together because the template updates reference the commands built in this phase:

1. **`ana proof stale`** — new read-only subcommand. Cross-references `modules_touched` from proof chain entries to detect findings whose files were modified by subsequent pipeline runs. Two confidence tiers: high (3+ subsequent entries touched the file) and medium (1-2). No branch check, no git pull — same read-only pattern as `audit` and `health`. The computation is a pure function in `proofSummary.ts` (alongside `computeHealthReport`), called by the command in `proof.ts`.

2. **`ana proof audit --full`** — removes the MAX_FILES (8) and MAX_PER_FILE (3) truncation caps when used with `--json`. `--full` without `--json` prints a hint: "The --full flag is designed for agent consumption. Use with --json: ana proof audit --json --full". This avoids dumping hundreds of findings to the terminal.

3. **Verify template update** — add staleness awareness to the Verify template. When Verify reads `ana proof context` for files it's reviewing and sees active findings, it should check whether the current build's code changes resolve those findings. If a finding references code that the build clearly fixed or refactored, Verify notes it as `Upstream — Stale finding {ID} likely resolved by this build`. No `ana proof stale` command reference — Verify doesn't have a slug to pass, and the judgment is contextual (does THIS code change resolve THIS finding?).

4. **Learn template cleanup** — strip all V2 graceful degradation paths ("if command doesn't exist", "perform this analysis manually"). Replace with direct command references using variadic ID examples. Update the staleness detection section to use `ana proof stale` instead of manual cross-referencing. Ensure dogfood copy (`.claude/agents/ana-learn.md`) matches template copy (`packages/cli/templates/.claude/agents/ana-learn.md`). Same for Verify.

## Output Mockups

### stale — default output
```
Stale Findings: 5 findings with staleness signals

High confidence (3+ subsequent entries modified the file):
  F001 [risk] Missing request validation — src/api/payments.ts
    Modified by: stripe-payments, auth-refactor, api-cleanup (3 entries)
    Created in: fix-validation (2026-04-20)

  F005 [debt] No error boundary — src/components/App.tsx
    Modified by: ui-overhaul, error-handling, perf-fixes (3 entries)
    Created in: component-audit (2026-04-15)

Medium confidence (1-2 subsequent entries modified the file):
  F002 [observation] No test for edge case — src/api/payments.ts
    Modified by: stripe-payments (1 entry)
    Created in: fix-validation (2026-04-20)

  F008 [debt] Unused import — src/utils/helpers.ts
    Modified by: cleanup (1 entry)
    Created in: code-review (2026-04-22)

  F010 [risk] Race condition in queue — src/workers/queue.ts
    Modified by: worker-refactor, perf-fixes (2 entries)
    Created in: worker-audit (2026-04-18)
```

### stale --after fix-validation
```
Stale Findings: 2 findings from fix-validation with staleness signals

High confidence (3+ subsequent entries modified the file):
  F001 [risk] Missing request validation — src/api/payments.ts
    Modified by: stripe-payments, auth-refactor, api-cleanup (3 entries)

Medium confidence (1-2 subsequent entries modified the file):
  F002 [observation] No test for edge case — src/api/payments.ts
    Modified by: stripe-payments (1 entry)
```

### stale --json
```json
{
  "command": "proof stale",
  "timestamp": "2026-05-01T10:00:00.000Z",
  "results": {
    "total_stale": 5,
    "high_confidence": [
      {
        "id": "F001",
        "category": "validation",
        "summary": "Missing request validation",
        "file": "src/api/payments.ts",
        "severity": "risk",
        "entry_slug": "fix-validation",
        "completed_at": "2026-04-20T10:00:00Z",
        "subsequent_slugs": ["stripe-payments", "auth-refactor", "api-cleanup"],
        "subsequent_count": 3,
        "confidence": "high"
      }
    ],
    "medium_confidence": [
      {
        "id": "F002",
        "category": "testing",
        "summary": "No test for edge case",
        "file": "src/api/payments.ts",
        "severity": "observation",
        "entry_slug": "fix-validation",
        "completed_at": "2026-04-20T10:00:00Z",
        "subsequent_slugs": ["stripe-payments"],
        "subsequent_count": 1,
        "confidence": "medium"
      }
    ],
    "filter": null
  },
  "meta": { ... }
}
```

### stale — no stale findings
```
Stale Findings: 0 findings with staleness signals

No active findings have been modified by subsequent pipeline runs.
```

### stale --min-confidence high
Filters to only show high-confidence results.

### audit --full without --json
```
The --full flag is designed for agent consumption. Use with --json:
  ana proof audit --json --full
```

## File Changes

### `src/utils/proofSummary.ts` (modify)
**What changes:** Add `computeStaleness()` pure function. Takes a proof chain and optional filters (`afterSlug`, `minConfidence`). Traverses entries, cross-references active findings' files against `modules_touched` in subsequent entries. Returns structured result with high/medium confidence tiers.
**Pattern to follow:** `computeHealthReport()` in the same file (lines 709-977) — same chain traversal pattern, same entry iteration, same data accumulation into a result object.
**Why:** Keeps computation pure and testable. The command in `proof.ts` calls this function and handles output formatting.

### `src/commands/proof.ts` (modify)
**What changes:** Add `stale` subcommand — read-only (no branch check, no pull). Options: `--after <slug>`, `--min-confidence <high|medium>`, `--json`. Calls `computeStaleness()` and formats output. Add `--full` option to existing `audit` subcommand — when present with `--json`, bypasses MAX_FILES and MAX_PER_FILE caps. When present without `--json`, prints usage hint and returns.
**Pattern to follow:** `audit` subcommand (lines 871-1083) for the read-only command pattern. `health` subcommand for calling a computation function and formatting the result.
**Why:** Stale is a read-only analysis command. Audit --full serves agent consumption.

### `src/types/proof.ts` (modify)
**What changes:** Add `StaleFinding` and `StalenessResult` interfaces for the return type of `computeStaleness()`.
**Pattern to follow:** `HotModule`, `HealthReport` interfaces in the same file.
**Why:** Typed return values for the new computation function.

### `packages/cli/templates/.claude/agents/ana-learn.md` (modify)
**What changes:** Strip all V2 degradation paths. Every "if X command doesn't exist" or "perform manually" block becomes a direct command reference. Update staleness detection section to use `ana proof stale` instead of manual cross-referencing. Add variadic ID examples for close, promote, strengthen. Remove the "Staleness Detection" subsection that describes manual cross-referencing and replace with a reference to `ana proof stale`.
**Pattern to follow:** The existing command reference style in the template — brief, imperative, showing exact syntax.
**Why:** V3 commands now exist. The degradation paths are dead weight.

### `.claude/agents/ana-learn.md` (modify)
**What changes:** Must match the template copy exactly after edits. Copy the final template content here.
**Pattern to follow:** Same content as the template.
**Why:** Dogfood copy must match template copy.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Add staleness awareness instruction. When Verify reads proof context for files it's reviewing and sees active findings, it should check whether the current build's changes resolve those findings. If resolved, note as `Upstream — Stale finding {ID} likely resolved by this build`. No `ana proof stale` command reference — Verify works from proof context it already reads and applies judgment about the current code changes.
**Pattern to follow:** Existing finding-awareness instructions in the Verify template.
**Why:** Verify gains awareness that active findings may be stale, surfacing this to the developer without requiring a command that needs a slug Verify doesn't have.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Must match the template copy after edits.
**Pattern to follow:** Same content as template.
**Why:** Dogfood copy must match.

### `tests/commands/proof.test.ts` (modify)
**What changes:** Add stale subcommand tests and audit --full tests. Stale tests: findings with subsequent modules_touched matches, no stale findings, --after filter, --min-confidence filter, --json output. Audit --full tests: --json --full returns all findings without truncation, --full without --json prints usage hint.
**Pattern to follow:** Existing audit and health test sections for read-only command testing.
**Why:** New subcommand and new flag need test coverage.

### `tests/utils/proofSummary.test.ts` (modify)
**What changes:** Add `computeStaleness` unit tests. Test: basic cross-referencing, high vs medium confidence tiers, --after filter, --min-confidence filter, no stale findings, findings with no file (skipped), non-active findings (skipped).
**Pattern to follow:** Existing `computeHealthReport` tests in the same file.
**Why:** Pure function needs unit tests independent of CLI integration.

## Acceptance Criteria

- [ ] `ana proof stale` shows findings with staleness signals grouped by confidence tier
- [ ] `ana proof stale` is read-only — no branch check, no git pull, no modifications
- [ ] `ana proof stale --after <slug>` filters to findings from that entry only
- [ ] `ana proof stale --min-confidence high` filters to high-confidence only
- [ ] `ana proof stale --json` returns structured output with the JSON envelope pattern
- [ ] High confidence = 3+ subsequent entries with modules_touched matching the finding's file
- [ ] Medium confidence = 1-2 subsequent entries matching
- [ ] `ana proof audit --json --full` returns all active findings without truncation
- [ ] `ana proof audit --full` (without --json) prints usage hint and exits
- [ ] Verify template instructs noting stale findings when proof context shows active findings resolved by the current build
- [ ] Learn template has zero "if command doesn't exist" or "perform manually" fallback language
- [ ] Learn template shows variadic ID examples (C-prefixed IDs like `C1 C2 C3`) for close, promote, strengthen
- [ ] Learn template uses `ana proof stale` instead of manual cross-referencing
- [ ] Dogfood copy (`.claude/agents/ana-learn.md`) matches template copy (`packages/cli/templates/.claude/agents/ana-learn.md`)
- [ ] Dogfood copy (`.claude/agents/ana-verify.md`) matches template copy (`packages/cli/templates/.claude/agents/ana-verify.md`)
- [ ] All new/modified commands have tests
- [ ] `(cd packages/cli && pnpm vitest run)` passes with no regressions
- [ ] No build errors

## Testing Strategy

- **Unit tests (proofSummary.test.ts):**
  - `computeStaleness` with entries where modules_touched overlaps with finding files — verify correct confidence tiers
  - Filter by afterSlug — only findings from that entry
  - Filter by minConfidence — only high tier returned
  - Findings with no `file` field — skipped
  - Non-active findings — skipped
  - No stale findings — empty result
  - Entry order matters — only subsequent entries count, not prior
- **Integration tests (proof.test.ts):**
  - Stale command: basic output, --after filter, --min-confidence filter, --json envelope, zero results
  - Audit --full: --json --full bypasses caps, --full without --json shows hint
- **Edge cases:**
  - Finding file matches modules_touched of its own entry — should NOT count (only subsequent)
  - All findings are closed/promoted — zero stale findings
  - Chain with one entry — no subsequent entries, zero stale findings
  - `--after` with nonexistent slug — zero findings (not an error)

## Dependencies

Phase 1 and Phase 2 must be complete. The Learn template references `strengthen` from Phase 2.

## Constraints

- `stale` is read-only — must not modify proof chain, must not require specific branch
- `audit --full` only works with `--json` — terminal output would be overwhelming for large finding sets
- Template copies must be byte-identical between dogfood and template locations
- Staleness is heuristic, not proof — the template must communicate this to Learn/Verify

## Gotchas

- `modules_touched` is a string array of file paths. Some entries may have empty arrays. The staleness check must handle this gracefully.
- `modules_touched` contains full relative paths like `src/api/payments.ts`. Finding `file` fields use the same format. Direct string comparison works.
- The Learn template is 534 lines. The cleanup is substantial — removing degradation paths, rewriting the staleness section, updating examples. Build should read the current template carefully before editing, not assume structure from the spec alone.
- Template file paths differ between dogfood and template: `.claude/agents/ana-learn.md` (dogfood, repo root) vs `packages/cli/templates/.claude/agents/ana-learn.md` (template). Both must have identical content after editing.
- `computeStaleness` must be exported from `proofSummary.ts` and imported in `proof.ts`. Follow the existing pattern: `import { ..., computeStaleness } from '../utils/proofSummary.js';`
- The `--after` filter uses the entry's `slug` field, not the finding ID. An entry slug is like `fix-validation`, not `F001`.
- Stale findings are a subset of active findings. If a finding is closed or promoted, it should not appear in stale results regardless of modules_touched overlap.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins
- Explicit return types on exported functions, JSDoc on exports
- Early returns over nested conditionals
- Engine-like computation functions (proofSummary.ts) are pure — no chalk, no process.exit
- Read-only commands skip branch check and git pull (audit, health are precedent)

### Pattern Extracts

**computeHealthReport hot modules traversal (proofSummary.ts:816-857) — pattern for staleness:**
```typescript
  const moduleMap = new Map<string, {
    findings: number;
    entries: Set<number>;
    risk: number;
    debt: number;
    observation: number;
    unclassified: number;
  }>();

  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i]!;
    for (const f of entry.findings || []) {
      if (f.status && f.status !== 'active') continue;
      if (!f.file) continue;

      let mod = moduleMap.get(f.file);
      if (!mod) {
        mod = { findings: 0, entries: new Set(), risk: 0, debt: 0, observation: 0, unclassified: 0 };
        moduleMap.set(f.file, mod);
      }
      mod.findings++;
      mod.entries.add(i);
      // ... severity counting
    }
  }
```

**Audit command read-only pattern (proof.ts:871-883) — no branch check:**
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
        // ...
```

**Learn template staleness section to replace (ana-learn.md:167-177):**
```markdown
### Staleness Detection

The proof chain contains the data to detect stale findings without a dedicated CLI command:

1. **Cross-reference `modules_touched`.** ...
2. **Check git history.** ...
3. **Priority ordering.** Findings whose files were modified by 3+ subsequent entries are high-confidence stale candidates. ...

If `ana proof stale` exists as a CLI command, use it. Otherwise, perform this analysis manually for risk and debt findings.
```

### Proof Context
- `proof.ts`: SEVERITY_ORDER duplication and truncation findings noted but out of scope for this phase.
- `proofSummary.ts`: No active findings relevant to this phase.

### Checkpoint Commands

- After `computeStaleness`: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: all proofSummary tests pass
- After stale command: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: all proof tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 93 test files pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: use actual count from Phase 2 build report
- Current test files: 93
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~10-15 new tests (computeStaleness ~5-7, stale command ~4-5, audit --full ~2-3)
- Regression focus: `proof.test.ts` (audit tests share MAX_FILES/MAX_PER_FILE constants), `proofSummary.test.ts` (existing health report tests)

# Spec: Infrastructure Extraction

**Created by:** AnaPlan
**Date:** 2026-05-04
**Scope:** .ana/plans/active/proof-intelligence-hardening/scope.md

## Approach

Two extractions that eliminate duplicated infrastructure in the proof commands: the exitError pattern (3 copies → 1 factory) and the summary truncation pattern (3 inline copies → 1 helper).

**exitError factory:** Define a factory function `createExitError` that returns a closure. The closure captures `commandName`, `proofChainPath`, and `useJson`. It accepts `code`, `message`, `context`, and an optional `hints` map. The hints map replaces per-command conditional branches — each command passes its own hint data at call time.

The key insight: the three copies share identical structure (read chain, format JSON or console error, provide contextual hints, exit). They differ only in: command name (for JSON envelope), and which error codes have which hint messages. The factory captures the shared parts; the hints map provides the variable parts.

The promote variant needs `availableSkills` — it passes `{ SKILL_REQUIRED: availableSkills, SKILL_NOT_FOUND: availableSkills }` in hints. The factory's console branch checks if `hints[code]` exists and formats accordingly.

**Truncation helper:** `truncateSummary(text: string, maxLength: number): string`. No default — every caller declares its intent explicitly. Finds the last space before the limit, truncates there, appends `...`. Extracted to proofSummary.ts (it's a display utility used by proof commands via proofSummary already). Replaces the 2 inline `MAX_SUMMARY` patterns in health display (:353, :369) and the 250-char pattern in audit (:1935). Additionally, promote (:1190) and strengthen (:1204) output currently has NO truncation on finding summaries — the helper gets added there too (with 100-char limit matching health display).

## Output Mockups

No user-visible output changes. The refactoring preserves exact output for all existing behavior.

## File Changes

### packages/cli/src/commands/proof.ts (modify)
**What changes:**
1. Define `createExitError` as a module-level function (not exported — it's internal to this file). Signature: `createExitError(opts: { commandName: string; proofChainPath: string; useJson: boolean; hints?: Record<string, string[]> })`. Returns `(code: string, message: string, context?: Record<string, unknown>) => never`.
2. Replace the three inline exitError definitions (close :578, promote :869, strengthen :1234) with calls to the factory.
3. Replace the two inline `MAX_SUMMARY` / truncation patterns (health display :353-355, :369-371) with `truncateSummary(summary, 100)` calls.
4. Replace the 250-char truncation in audit display (:1935-1939) with `truncateSummary(summary, 250)`.
5. Add `truncateSummary(summary, 100)` to promote output (:1190) and strengthen output (:1204) which currently display untruncated summaries.

**Pattern to follow:** The existing `wrapJsonError` and `wrapJsonResponse` utility functions — same style of internal helper that multiple subcommands consume.
**Why:** Three drifting copies of the same error infrastructure guarantees inconsistency. One already lacks a hint that the others have. Factory prevents future drift.

### packages/cli/src/utils/proofSummary.ts (modify)
**What changes:** Add exported `truncateSummary` function. Signature: `truncateSummary(text: string, maxLength: number): string`. Logic: if text.length <= maxLength, return text. Otherwise find lastIndexOf(' ', maxLength), slice there, append '...'. If no space found, hard-cut at maxLength.
**Pattern to follow:** Other exported utility functions in this file (computeFirstPassRate, computeChainHealth) — same JSDoc style, same export pattern.
**Why:** Truncation logic appears in 2 places inline (health :353/:369 at 100 chars, audit :1935 at 250 chars with word boundary), and is missing entirely from promote/strengthen output (:1190/:1204). One function with explicit length parameter unifies existing and fills the gap.

## Acceptance Criteria

- [ ] AC3: exitError is defined once (factory or shared function) and consumed by close, promote, and strengthen — no duplicated error-handling logic
- [ ] AC7: Summary truncation applies consistently in health, promote, and strengthen displays
- [ ] All existing proof command tests pass unchanged (behavior preserved)
- [ ] No TypeScript errors (`pnpm run build`)
- [ ] No lint errors (`pnpm run lint`)

## Testing Strategy

- **Unit tests (proofSummary.test.ts):** Add tests for `truncateSummary`:
  - Text shorter than max returns unchanged
  - Text longer than max truncates at last space before limit, appends '...'
  - Text with no spaces hard-cuts at max
  - Custom maxLength parameter works

- **Integration:** Existing proof command tests cover close/promote/strengthen error paths. They must pass unchanged — the factory produces identical output. Run the full test suite as verification.

- **Edge cases:** Empty string input to truncateSummary. String exactly at maxLength (no truncation). The promote exitError variant still shows `availableSkills` in its SKILL_REQUIRED and SKILL_NOT_FOUND hints.

## Dependencies

Phase 1 must be complete (FAIL guard is extracted, proof.ts is updated with computeFirstPassRate call).

## Constraints

- The factory must preserve exact console output for all existing error codes. Existing tests assert specific error messages.
- `process.exit(1)` must remain in the factory's closure — it's what makes the return type `never`. Don't change it to throw.
- The hints system must be extensible without modifying the factory — each new command can pass its own hints map.

## Gotchas

- The promote exitError has a conditional that checks `context['promoted_to']` and `context['closed_by']` — these context-dependent branches must be preserved in the factory. The factory should keep the generic context-key-based hints (for `SKILL_REQUIRED`, `SKILL_NOT_FOUND`, `WRONG_BRANCH`) and also support a `formatHint` callback for complex cases (like checking context keys). Alternatively, keep a small set of well-known context-based patterns in the factory itself since all three commands share FINDING_NOT_FOUND, ALREADY_CLOSED, and WRONG_BRANCH handling.
- The strengthen variant discovers available skills differently (reads directory directly at :1251-1257) vs promote (uses globSync at :865-866). The factory doesn't need to unify skill discovery — each command still discovers skills its own way and passes the list via hints.
- `truncateSummary` in the audit display currently uses `lastIndexOf(' ', 250)` — preserve this word-boundary behavior. The health display uses simple `.slice(0, 100) + '...'` without word boundary. Unify on word-boundary (the cleaner behavior) — this may change a few truncation points by a character or two, which is acceptable.
- Promote output at :1190 prints `p.summary` and strengthen at :1204 prints `p.summary` — both untruncated. Long summaries break terminal layout. Add truncation here as part of AC7.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions
- Named exports only, no defaults
- Explicit return types on exported functions (`truncateSummary`)
- Internal helpers (createExitError) don't need to be exported — they're file-scoped
- JSDoc `@param` and `@returns` on exported functions

### Pattern Extracts

Close exitError (proof.ts:578-606) — the structural template:
```typescript
const exitError = (code: string, message: string, context: Record<string, unknown> = {}): void => {
  let chain: ProofChain | null = null;
  try {
    if (fs.existsSync(proofChainPath)) {
      chain = JSON.parse(fs.readFileSync(proofChainPath, 'utf-8'));
    }
  } catch { /* use null */ }

  if (useJson) {
    console.log(JSON.stringify(wrapJsonError('proof close', code, message, context, chain), null, 2));
  } else {
    console.error(chalk.red(`Error: ${message}`));
    if (code === 'REASON_REQUIRED') {
      console.error('  Proof closures must explain why the finding no longer applies.');
      console.error('  Usage: ana proof close {id} --reason "explanation"');
    } else if (code === 'FINDING_NOT_FOUND') {
      console.error('  Run `ana proof audit` to see active findings.');
    } else if (code === 'ALREADY_CLOSED' && context['closed_by']) {
      console.error(`  Closed by: ${context['closed_by']} on ${context['closed_at'] ?? 'unknown'}`);
      if (context['closed_reason']) {
        console.error(`  Reason: ${context['closed_reason']}`);
      }
    } else if (code === 'WRONG_BRANCH') {
      const artifactBranch = readArtifactBranch(proofRoot);
      console.error(`  Run: git checkout ${artifactBranch}`);
    }
  }
  process.exit(1);
};
```

Health display truncation (proof.ts:353-355):
```typescript
const MAX_SUMMARY = 100;
const summary = c.summary.length > MAX_SUMMARY
  ? c.summary.slice(0, MAX_SUMMARY) + '...'
  : c.summary;
```

### Checkpoint Commands

- After exitError factory: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: all proof command tests pass
- After truncation helper: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: all pass + new truncation tests
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1842+ tests pass
- Build: `pnpm run build`
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1839 passed, 2 skipped (94 test files) — but Phase 1 adds ~3 tests
- Command used: `(cd packages/cli && pnpm vitest run)`
- After this phase: expected 1847+ tests (Phase 1 baseline + 4-5 new truncation tests)
- Regression focus: `tests/commands/proof.test.ts` (all subcommand error paths)

# Spec: Remove Pre-Check Tag Coverage

**Created by:** AnaPlan
**Date:** 2026-04-30
**Scope:** .ana/plans/active/remove-tag-coverage/scope.md

## Approach

Delete the tag coverage mechanism from pre-check. Pre-check becomes seal verification only — read `.saves.json` for the saved contract hash, compare to the current contract file hash, return INTACT/TAMPERED/UNVERIFIABLE. Everything downstream that consumed per-assertion COVERED/UNCOVERED data is rewired to use contract.yaml as the assertion source and `verifyStatus` as the sole authority.

The diff-scoped tag search system (`parseDiffAddedCommentLines` and the merge-base/diff pipeline) is deleted in its entirety — it was a mitigation for collision in a mechanism that no longer exists.

Tags remain in test files as optional navigation aids for Verify — Build still writes them, Verify still searches for them manually, but nothing machine-reads them for coverage determination.

### Pattern references

- **Seal check pattern:** The existing seal check in `runContractPreCheck` (verify.ts lines 114-150) is the pattern for the post-removal structure. The function becomes this logic only.
- **`.saves.json` write pattern:** `writeSaveMetadata` in artifact.ts for the JSON serialization convention.
- **Backward-compat pattern:** `computeChainHealth` in proofSummary.ts handles undefined fields gracefully — same approach for old proof chain entries that have UNCOVERED.
- **Assertion bootstrap from contract:** The existing fallback path in `generateProofSummary` (proofSummary.ts lines 1452-1462) is promoted to the primary path, minus the `preCheckStatus` default.

## Output Mockups

### `ana verify pre-check {slug}` — after removal

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/my-feature/contract.yaml
  Seal: INTACT (hash sha256:abc123...)
```

When TAMPERED:
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/my-feature/contract.yaml
  Seal: TAMPERED (hash sha256:abc123...)
```

When UNVERIFIABLE:
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/my-feature/contract.yaml
  Seal: UNVERIFIABLE (no saved contract hash)
```

No per-assertion output. No covered/uncovered summary. Seal status only.

### Proof chain entry assertion status

Before: `status: a.verifyStatus || a.preCheckStatus` (Disease 2 — pre-check infiltrates the record)
After: `status: a.verifyStatus || 'UNVERIFIED'`

### PR body assertion status

Same pattern change as proof chain entry.

## File Changes

### `packages/cli/src/commands/verify.ts` (modify)
**What changes:** Delete ~230 lines of tag coverage code. Keep ~80 lines of seal check + command registration. Specifically:
- Update module doc comment (lines 1-13) to remove tag coverage references
- Remove 5 imports: `execSync`, `glob`, `readArtifactBranch`, `yaml`, `ContractSchema`
- Slim `ContractPreCheckResult` to `{ seal, sealHash? }` — remove `assertions`, `summary`, `outOfScope`
- Delete `parseDiffAddedCommentLines` function entirely (lines 49-99)
- Delete tag search logic from `runContractPreCheck` (lines 152-293) — keep lines 109-150 (seal check)
- Simplify return values to seal-only results
- Rewrite `printContractResults` to show seal status only — no assertion iteration, no summary line, no outOfScope warnings
- Update `registerVerifyCommand` description from 'seal integrity, tag coverage' to seal-only
**Pattern to follow:** The existing seal check block (lines 114-150) — this IS the post-removal function body
**Why:** The tag coverage mechanism is the root cause of both diseases (unreliable signal + proof chain corruption)

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:** Simplify `runPreCheckAndStore` (lines 92-139):
- Delete the UNCOVERED warning block (lines 108-115)
- Slim the `.saves.json` write to `{ seal, seal_hash, run_at }` — remove `assertions`, `covered`, `uncovered`
**Pattern to follow:** The existing `writeSaveMetadata` pattern for `.saves.json` writes
**Why:** Stops the tag coverage data from entering `.saves.json`, cutting the pipeline to proofSummary

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:**
- `ProofAssertion` interface: remove `preCheckStatus` field entirely. Change `verifyStatus` type from `'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | null` to `'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED' | null` (UNCOVERED for backward compat with old verify reports)
- `ProofSummary.contract`: remove `covered` and `uncovered` fields. Keep `total`, `satisfied`, `unsatisfied`, `deviated`
- `generateProofSummary` assertion bootstrap (lines 1420-1462): delete the pre-check path (lines 1420-1436). Promote the contract.yaml path (lines 1452-1462) to primary. Remove `preCheckStatus` from the mapped objects — use `verifyStatus: null` only. Set `summary.contract.total` from contract assertion count. Do NOT set `covered`/`uncovered` counts (fields no longer exist)
- `parseComplianceTable` regex (line 174): keep UNCOVERED in the pattern — old verify reports contain it
**Pattern to follow:** The existing contract.yaml fallback path at lines 1452-1462
**Why:** Assertions now come from the contract (source of truth), not from pre-check's interpretation of it

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Line 793 — change `(a.verifyStatus || a.preCheckStatus)` to `(a.verifyStatus || 'UNVERIFIED')`
**Pattern to follow:** Same ternary structure, just a different fallback
**Why:** This is Disease 2's root cause — pre-check status infiltrating the proof chain

### `packages/cli/src/commands/pr.ts` (modify)
**What changes:** Line 119 — change `a.verifyStatus || a.preCheckStatus` to `a.verifyStatus || 'UNVERIFIED'`. Also update the statusIcon logic on line 121 to handle UNVERIFIED (show `❓`)
**Pattern to follow:** Same pattern as work.ts change
**Why:** PR body is the other consumer of the corrupted status fallback

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Add `'UNVERIFIED'` to the `ProofChainEntry.assertions[].status` union type. Keep `'UNCOVERED'` for backward compat.
Result: `status: 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED' | 'UNVERIFIED'`
**Pattern to follow:** Existing union type extension
**Why:** New entries get UNVERIFIED when Verify hasn't run; old entries keep UNCOVERED from historical verify reports

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Add `'UNVERIFIED'` case to `getStatusIcon` switch statement, returning `chalk.gray('?')` — same display as UNCOVERED
**Pattern to follow:** The existing switch statement at lines 57-70
**Why:** Both statuses mean "not yet verified" — same icon, different semantics

### `packages/cli/tests/commands/verify.test.ts` (modify)
**What changes:** Delete the tag coverage test blocks (~845 lines). Keep seal tests and command structure tests (~300 lines remain). Specifically delete:
- The tag coverage tests inside `describe('contract mode (S8+)')` — keep the seal-related tests in that block
- `describe('scoped tag search (merge-base)')` entirely
- `describe('parseDiffAddedCommentLines')` entirely
- `describe('parseDiffAddedCommentLines integration with runContractPreCheck')` entirely
- Remove the `parseDiffAddedCommentLines` import from line 7
- Update any remaining tests whose fixtures include `assertions`, `summary`, or `outOfScope` fields in the expected `ContractPreCheckResult`
**Pattern to follow:** Keep existing test structure for seal tests
**Why:** Tests for deleted code must be deleted. Seal tests remain for the retained mechanism.

### `packages/cli/tests/commands/artifact.test.ts` (modify)
**What changes:** Simplify pre-check fixtures in `.saves.json` test data — remove `assertions`, `covered`, `uncovered` from expected pre-check objects. Only expect `seal`, `seal_hash`, `run_at`
**Pattern to follow:** Existing fixture patterns in the file
**Why:** Fixtures must match the simplified `runPreCheckAndStore` output

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Rewrite assertion bootstrap tests. Fixtures that construct `.saves.json` with pre-check data (`assertions`, `covered`, `uncovered`) must be updated to use contract.yaml as the assertion source. Remove references to `preCheckStatus` in expected outputs
**Pattern to follow:** Existing test patterns in the file
**Why:** Test fixtures must reflect the new assertion source (contract.yaml, not pre-check)

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Simplify `.saves.json` fixtures — remove pre-check assertion data. Update status assertions to expect UNVERIFIED where old tests expected UNCOVERED for unverified assertions
**Pattern to follow:** Existing fixture patterns
**Why:** Fixtures must match the new status fallback behavior

### `packages/cli/tests/commands/pr.test.ts` (modify)
**What changes:** Same pattern as work.test.ts — simplify fixtures, update status expectations
**Pattern to follow:** Existing fixture patterns
**Why:** Same status fallback change

### `packages/cli/templates/.claude/agents/ana-build.md` (modify)
**What changes:**
- Delete the pre-check step (lines 511-515 area: "3. Run pre-check to verify tag coverage" + the command + the UNCOVERED instruction)
- Delete the second `ana verify pre-check` call in the multi-phase save block (line 525 area)
- Reword the tampering reference at line 153 area — keep "sealed" language but remove "pre-check will detect" since the contract seal check now only runs at save time
- Renumber any subsequent steps
**Pattern to follow:** The existing step structure in the template
**Why:** Build no longer runs pre-check as a standalone step. Seal check happens automatically at save time.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:**
- **Step 1:** Rewrite from "Run Pre-Check Tool" to "Check Contract Seal". The step runs `ana verify pre-check {slug}` and records seal status only. Remove the tag coverage explanation (item 2 in the current numbered list). Remove the COVERED/UNCOVERED output example. The step output is seal status only.
- **Step 4:** Rewrite the per-assertion assessment intro. Currently says "For each COVERED assertion from pre-check." Change to: "For each assertion in the contract." Verify reads contract.yaml directly as its checklist. Remove the UNCOVERED instruction at line 230 area ("For UNCOVERED assertions from pre-check: include them in the table with status UNCOVERED").
- **Verification Principle section:** Remove pre-check COVERED references. Keep the general principle about treating documents as claims.
- **Report template Pre-Check Results section:** Simplify to seal status only. Remove "For each UNCOVERED assertion" instruction. Add fallback: "If pre-check unavailable: read contract.yaml as your checklist."
- **PASS/FAIL criteria:** Remove "UNCOVERED assertions prevent PASS." Verify now uses its own judgment — if it can't find a test for an assertion, it marks UNSATISFIED.
- **Quick Reference at bottom:** Update pre-check description, remove "tag coverage" from description. Update contract status keywords — remove UNCOVERED from machine-parsed keywords (it remains valid in old reports but is no longer a Verify output).
**Pattern to follow:** The existing template structure and voice
**Why:** Verify becomes the sole source of assertion status. It reads the contract directly, not pre-check's interpretation.

### `.claude/agents/ana-build.md` (modify)
**What changes:** Identical to template changes
**Why:** Dogfood copy must match template

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Identical to template changes
**Why:** Dogfood copy must match template

## Acceptance Criteria

- [ ] AC1: `ana verify pre-check {slug}` reports seal status only (INTACT/TAMPERED/UNVERIFIABLE). No per-assertion COVERED/UNCOVERED output.
- [ ] AC2: `ContractPreCheckResult` has only `seal` and `sealHash` fields. No `assertions`, `summary`, or `outOfScope`.
- [ ] AC3: `parseDiffAddedCommentLines` is deleted and no longer exported from verify.ts.
- [ ] AC4: The five tag-coverage-only imports are removed from verify.ts: `execSync`, `glob`, `readArtifactBranch`, `yaml`, `ContractSchema`.
- [ ] AC5: `runPreCheckAndStore` in artifact.ts stores only `seal`, `seal_hash`, `run_at` in `.saves.json`. No `assertions`, `covered`, `uncovered`.
- [ ] AC6: `generateProofSummary` bootstraps assertions from `contract.yaml`, not from pre-check data in `.saves.json`.
- [ ] AC7: `ProofAssertion` has no `preCheckStatus` field. `verifyStatus` includes UNCOVERED for backward compatibility with old verify reports.
- [ ] AC8: `ProofSummary['contract']` has no `covered` or `uncovered` fields.
- [ ] AC9: Proof chain entry assertion status is `a.verifyStatus || 'UNVERIFIED'` (work.ts line 793).
- [ ] AC10: PR body assertion status uses the same pattern (pr.ts line 119).
- [ ] AC11: `ProofChainEntry` status union includes both UNVERIFIED (new) and UNCOVERED (backward compat).
- [ ] AC12: `getStatusIcon` in proof.ts handles both UNCOVERED and UNVERIFIED with the same display.
- [ ] AC13: `parseComplianceTable` regex still matches UNCOVERED for old verify reports.
- [ ] AC14: Build template removes the pre-check step and rewords the tampering reference.
- [ ] AC15: Verify template Step 1 is seal-check only. Step 4 uses the contract as the assertion checklist. UNCOVERED parroting instruction is deleted. PASS/FAIL criteria no longer reference UNCOVERED.
- [ ] AC16: Dogfood agent copies (`.claude/agents/ana-build.md`, `.claude/agents/ana-verify.md`) receive identical changes.
- [ ] AC17: verify.test.ts tag coverage tests are deleted (~845 lines). Seal tests remain.
- [ ] AC18: All remaining tests pass. Build compiles without errors.
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors from `pnpm run build`

## Testing Strategy

- **Unit tests:** Seal check tests in verify.test.ts remain unchanged — they test the retained mechanism. Update any seal test that asserts on the full `ContractPreCheckResult` shape (remove `assertions`, `summary`, `outOfScope` from expected objects).
- **Integration tests:** `proofSummary.test.ts` tests that cover assertion bootstrap must be rewritten to verify assertions come from contract.yaml. The overlay mechanism (verify report compliance table → assertion status) remains — just the bootstrap source changes.
- **Edge cases:**
  - Old `.saves.json` with pre-check assertion data: `generateProofSummary` should ignore it (it no longer reads `saves['pre-check'].assertions`)
  - Old verify reports with UNCOVERED in compliance table: `parseComplianceTable` must still parse them correctly
  - Missing contract.yaml: `generateProofSummary` should produce empty assertions (existing behavior)
  - `ProofChainEntry` with UNCOVERED status: display code handles it (getStatusIcon returns `?`)

## Dependencies

None. All changes are deletions or simplifications of existing code. No new dependencies.

## Constraints

- **Backward compatibility:** Old proof chain entries with UNCOVERED status must display correctly. Old verify reports with UNCOVERED in compliance tables must parse correctly. Types must include UNCOVERED in their unions.
- **No new features:** This is purely removal. No new abstractions, no new fields, no new mechanisms.
- **Template/dogfood parity:** Both copies must receive identical changes.

## Gotchas

- **`yaml` import in verify.ts:** Looks like it's used throughout the file because of `'contract.yaml'` string literals — but `yaml.parse()` is only called at line 155, inside the tag search code. The string literals are just path strings, not the `yaml` package. Safe to remove.
- **`proofSummary.ts:1457` defaults `preCheckStatus: 'UNCOVERED'`:** When promoting the contract fallback to primary, `preCheckStatus` is removed entirely. Don't accidentally leave a stale default for a field that no longer exists.
- **verify.test.ts line 7 imports `parseDiffAddedCommentLines`:** This import must be removed when the function is deleted, or the test file won't compile.
- **`PreCheckData` interface in proofSummary.ts:** This is the type used to read old `.saves.json` pre-check data. The interface can stay (it reads existing data) but the code path that uses it to bootstrap assertions is deleted. The pre-check data in `.saves.json` becomes vestigial — read but not used for assertions.
- **`ProofSummary.contract.covered`/`uncovered` consumers:** Search for any code that reads `summary.contract.covered` or `summary.contract.uncovered` — those fields are being removed. Likely consumers: `computeChainHealth` in proofSummary.ts, work.ts proof chain construction. These must be updated or will produce `undefined`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins
- Use `import type` for type-only imports, separate from value imports
- Prefer named exports, no default exports
- Explicit return types on all exported functions
- Exported functions require `@param` and `@returns` JSDoc tags
- Early returns over nested conditionals
- Template changes must be mirrored to dogfood copies — files must be identical

### Pattern Extracts

**Seal check — the post-removal function body (verify.ts lines 109-150):**
```typescript
export function runContractPreCheck(slug: string, projectRoot: string = findProjectRoot()): ContractPreCheckResult {
  const slugDir = path.join(projectRoot, '.ana', 'plans', 'active', slug);
  const savesPath = path.join(slugDir, '.saves.json');
  const contractPath = path.join(slugDir, 'contract.yaml');

  // Check if contract exists
  if (!fs.existsSync(contractPath)) {
    return {
      seal: 'UNVERIFIABLE',
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
      outOfScope: [],
    };
  }

  // Read .saves.json for contract hash
  let sealHash: string | undefined;

  if (fs.existsSync(savesPath)) {
    try {
      const saves: Record<string, { hash?: string }> = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));
      if (saves['contract']) {
        sealHash = saves['contract'].hash;
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!sealHash) {
    return {
      seal: 'UNVERIFIABLE',
      assertions: [],
      summary: { total: 0, covered: 0, uncovered: 0 },
      outOfScope: [],
    };
  }

  // Seal check: compare current contract hash against saved hash
  const currentContent = fs.readFileSync(contractPath, 'utf-8');
  const currentHash = `sha256:${createHash('sha256').update(currentContent).digest('hex')}`;
  const seal: 'INTACT' | 'TAMPERED' = currentHash === sealHash ? 'INTACT' : 'TAMPERED';
```

The returns above include `assertions`, `summary`, `outOfScope` — those fields are removed in the new version. The seal check logic itself is unchanged.

**Contract-based assertion bootstrap — the path being promoted (proofSummary.ts lines 1452-1462):**
```typescript
      // If no pre-check data, build assertions from contract
      if (summary.assertions.length === 0 && contract.assertions) {
        summary.assertions = contract.assertions.map(a => ({
          id: a.id,
          says: a.says,
          preCheckStatus: 'UNCOVERED' as const,
          verifyStatus: null,
        }));
        summary.contract.total = contract.assertions.length;
        summary.contract.uncovered = contract.assertions.length;
      }
```

In the new version: remove `preCheckStatus`, remove `summary.contract.uncovered` assignment.

**getStatusIcon switch (proof.ts lines 57-70):**
```typescript
function getStatusIcon(status: string): string {
  switch (status.toUpperCase()) {
    case 'SATISFIED':
      return chalk.green('✓');
    case 'UNSATISFIED':
      return chalk.red('✗');
    case 'DEVIATED':
      return chalk.yellow('⚠');
    case 'UNCOVERED':
      return chalk.gray('?');
    default:
      return chalk.gray('·');
  }
}
```

Add `case 'UNVERIFIED': return chalk.gray('?');` before the UNCOVERED case.

### Proof Context

**verify.ts** (2 cycles):
- `execSync` import retained from prior removal — fully deleted this time (AC4)
- Diff-scoped tag search findings (comment filter, size guard, path assumptions) — all deleted with the mechanism

**proofSummary.ts** (8 cycles):
- `PreCheckData` interface retains `seal_commit` field from prior removal — vestigial but harmless, reads old `.saves.json`
- No active proof findings for the assertion bootstrap path being modified

### Checkpoint Commands

- After verify.ts changes: `(cd packages/cli && pnpm vitest run tests/commands/verify.test.ts)` — Expected: remaining seal tests pass
- After all source changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1725 passed, 2 skipped (1727 total)
- Current test files: 93 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: test count will decrease (tag coverage tests deleted). Expected ~880-900 fewer tests. Test files stay at 93 (no files deleted, only modified).
- Regression focus: verify.test.ts (partial deletion), proofSummary.test.ts (fixture rewrites), work.test.ts and pr.test.ts (status assertion changes)

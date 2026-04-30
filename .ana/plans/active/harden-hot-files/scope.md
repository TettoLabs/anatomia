# Scope: Harden Hot Files

**Created by:** Ana
**Date:** 2026-04-30

## Intent
Fix four error-handling and display bugs across the three most-modified CLI files (proof.ts, work.ts, artifact.ts). These are all hot files touched by every pipeline run. Closes 5 active findings including all 3 risk-severity findings in the current set.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/commands/proof.ts`, `packages/cli/src/commands/work.ts`, `packages/cli/src/commands/artifact.ts`, `packages/cli/tests/commands/work.test.ts`
- **Blast radius:** Low. Each fix is isolated to its own code path. No shared state between fixes. The only cross-fix interaction is that Fix 1 and the test update are paired — the test proves Fix 1 worked.
- **Estimated effort:** 1 hour
- **Multi-phase:** no

## Approach
Four independent fixes, each addressing a specific bug that the proof system flagged:

1. **Guard recovery log for JSON mode** — the recovery path prints human-readable text before checking `--json`, polluting stdout for CI consumers. Wrap the log in the existing `!options?.json` guard pattern.

2. **Delete duplicate `from:` line in audit display** — `proof.ts` shows finding provenance twice per finding. Delete the redundant standalone line.

3. **Extract SEVERITY_ORDER constant** — three identical severity ordering maps exist as local declarations across proof.ts. Consolidate to one module-level constant. Not exported — no consumer exists outside this file.

4. **Surface unexpected failures in silent catches** — two try/catch blocks swallow all errors, hiding failures that corrupt data or mislead users.
   - **4a (artifact.ts):** Restructure `captureModulesTouched` with two try blocks. The inner try catches merge-base failure and returns silently (expected on first commit or no remote). The outer try catches everything else (diff failure, .saves.json corruption) and warns. This makes expected vs. unexpected a code boundary, not a string comparison.
   - **4b (work.ts):** Add a warning for unexpected git status failures in the recovery catch. Filter on `'not a git repository'` as the expected case.

5. **Update recovery JSON test** — the test at work.test.ts:2150 uses `output.indexOf('{')` to skip past "Recovering..." garbage before parsing. After Fix 1, recovery JSON output is clean. Replace the workaround with `JSON.parse(output)` directly — this is the proof that Fix 1 worked.

## Acceptance Criteria
- AC1: Recovery path with `--json` produces clean JSON output — no "Recovering..." text before the envelope
- AC2: Recovery path without `--json` still shows the "Recovering..." message
- AC3: Audit display shows each finding's `from:` exactly once
- AC4: `SEVERITY_ORDER` is a single module-level constant in proof.ts (not exported), replacing all 3 local declarations
- AC5: `captureModulesTouched` returns silently when merge-base fails (expected on new repos)
- AC6: `captureModulesTouched` logs a warning when diff, file ops, or other unexpected operations fail
- AC7: Recovery catch in work.ts logs a warning on unexpected git status failures
- AC8: Recovery catch stays silent when git status reports "not a git repository"
- AC9: Recovery JSON test asserts `JSON.parse(output)` directly, not via `indexOf('{')` workaround
- AC10: All existing tests pass
- AC11: Lint passes

## Edge Cases & Risks
**Recovery path rarely triggers.** Fix 1 is for a code path that only fires when `work complete` crashes and is re-run. Rare, but when it happens, clean JSON is essential for CI consumers.

**Fix 4a: readArtifactBranch does not throw.** The requirements doc described `readArtifactBranch` failure as a case the catch handles. That's wrong — `readArtifactBranch` calls `process.exit(1)` on all failure paths (missing file, corrupt JSON, missing field). It never throws. The catch in `captureModulesTouched` only fires for `execSync` failures (merge-base, diff) and `.saves.json` file operations. The scope corrects this.

**Fix 4b: string matching on git error.** `'not a git repository'` is a stable, well-known git error message. The blast radius is low — this guards a `git status` call in a recovery path that rarely fires.

## Rejected Approaches
- **String matching on error messages in Fix 4a.** The requirements doc proposed `error.message.includes('merge-base')` to distinguish expected from unexpected failures. This relies on Node's `execSync` including the command name in the error — an implementation detail. The structural two-try-block approach makes expected vs. unexpected a code boundary, following "verified over trusted" more cleanly.
- **Separate scope per fix.** Four fixes across three files, each too small for its own pipeline run. Bundling maximizes finding closures per cycle.
- **Exporting SEVERITY_ORDER.** No consumer exists outside proof.ts. Export when a consumer appears, not before.
- **Re-raising errors in captureModulesTouched.** Would block the artifact save. `modules_touched` is supplementary data — saving without it is better than not saving at all.
- **Severity migration hardening (Fix 5 from requirements doc).** Dropped — the entire migration layer in writeProofChain is being deleted by a separate scope (clean-dead-migrations). Adding code to a loop that won't exist is scaffolding, not foundation.

## Open Questions
None.

## Exploration Findings

### Patterns Discovered
- `if (!options?.json)` guard pattern already used in work.ts terminal output — Fix 1 uses the same guard
- `chalk.yellow('Warning: ...')` pattern used by push failures at work.ts:1088 — Fixes 4a, 4b use the same warning style
- `SEVERITY_ORDER` name used at proof.ts:148 and 177; `SEVERITY_WEIGHT` used at proof.ts:974 — consolidate under `SEVERITY_ORDER` (describes ordering, not abstract weight)

### Constraints Discovered
- [TYPE-VERIFIED] readArtifactBranch never throws (git-operations.ts:26-49) — calls process.exit(1) on all three failure paths. The catch in captureModulesTouched cannot fire for readArtifactBranch failures.
- [OBSERVED] Recovery JSON test at work.test.ts:2150 uses indexOf('{') workaround — confirms the stdout pollution bug exists and the test compensates for it.

### Test Infrastructure
- work.test.ts:2136-2155 — recovery JSON test. Captures console.log, triggers recovery via uncommitted .ana/ changes, parses JSON output. The `indexOf('{')` at line 2150 is the workaround that should become `JSON.parse(output)` after Fix 1.
- work.test.ts:1920-1930 — recovery non-JSON test. Asserts 'Recovering' appears in output. Fix 1 must not break this — the message should still appear when `--json` is not passed.

## For AnaPlan

### Structural Analog
`harden-git-commit-calls` (completed plan). Same shape: multiple small fixes across the same hot files, each addressing an active finding, bundled into one scope. That scope had 5 locations across 3 files. This scope has 4 fixes across 4 files (including the test update).

### Relevant Code Paths
- `packages/cli/src/commands/work.ts:1076-1131` — recovery path (Fix 1 + Fix 4b)
- `packages/cli/src/commands/proof.ts:1015-1016` — audit display duplicate line (Fix 2)
- `packages/cli/src/commands/proof.ts:148, 177, 974` — three SEVERITY_ORDER copies (Fix 3)
- `packages/cli/src/commands/artifact.ts:151-172` — captureModulesTouched (Fix 4a)
- `packages/cli/tests/commands/work.test.ts:2146-2155` — recovery JSON test (test update)

### Patterns to Follow
- The existing `if (!options?.json)` guard in work.ts for terminal output suppression
- The existing `chalk.yellow('Warning: ...')` pattern for non-fatal warnings
- Module-level constants placed after imports, before function definitions (proof.ts convention)

### Known Gotchas
- **Fix 1:** The `options` parameter is accessible at line 1078 — it's a parameter of `completeWork`, and the recovery path is inside the function body. Verified.
- **Fix 2:** Search for the duplicate `from:` pattern by content, not line number. Lines shift frequently in proof.ts.
- **Fix 3:** Two different names exist (`SEVERITY_ORDER` at 148/177, `SEVERITY_WEIGHT` at 974). Use `SEVERITY_ORDER` for the extracted constant.
- **Fix 4a:** `readArtifactBranch` calls process.exit(1), not throw. The two-try-block structure only needs to handle `execSync` failures and file operations — not readArtifactBranch. The inner try wraps only the merge-base call; the outer try wraps everything including diff and file ops.
### Things to Investigate
- Verify that the non-JSON recovery test (work.test.ts:1925) still passes after Fix 1 — the 'Recovering' assertion must still see the message when `--json` is not passed. The fix only suppresses the log when json is true, so this should be fine, but verify.

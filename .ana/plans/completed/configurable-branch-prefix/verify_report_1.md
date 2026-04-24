# Verify Report: Configurable branch prefix — Phase 1 (Foundation)

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-24
**Spec:** .ana/plans/active/configurable-branch-prefix/spec-1.md
**Branch:** feature/configurable-branch-prefix

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/configurable-branch-prefix/contract.yaml
  Seal: INTACT (commit 0ba7752, hash sha256:a8c31f91bfa46...)

  A001  ✓ COVERED  "Fresh installs include a branch prefix setting in the config file"
  A002  ✓ COVERED  "Re-initializing preserves a user-modified branch prefix"
  A003  ✓ COVERED  "The config reader returns the configured prefix when present"
  A004  ✓ COVERED  "Older installs without a prefix setting get the default automatically"
  A005  ✓ COVERED  "A missing config file does not crash the prefix reader"
  A006  ✓ COVERED  "Teams using bare branch names can set an empty prefix"
  A007  ✓ COVERED  "The schema recovers gracefully from a corrupted prefix value"
  A008  ✗ UNCOVERED  "Pipeline status commands show the configured prefix in branch instructions"
  A009  ✗ UNCOVERED  "Pipeline status commands do not show the old hardcoded prefix"
  A010  ✗ UNCOVERED  "Branch detection finds branches under the configured prefix"
  A011  ✗ UNCOVERED  "The status JSON output uses the new workBranch field name"
  A012  ✗ UNCOVERED  "The old featureBranch field name is removed from status output"
  A013  ✗ UNCOVERED  "Completing a work item cleans up the branch under the configured prefix"
  A014  ✗ UNCOVERED  "Artifact save error messages show the configured prefix in checkout hint"
  A015  ✗ UNCOVERED  "PR creation warns when branch does not match the configured prefix"
  A016  ✗ UNCOVERED  "Build agent template references the configurable prefix placeholder"
  A017  ✗ UNCOVERED  "Build agent template no longer hardcodes the feature prefix"
  A018  ✗ UNCOVERED  "Plan agent template references the configurable prefix placeholder"
  A019  ✗ UNCOVERED  "Verify agent template references the configurable prefix placeholder"
  A020  ✗ UNCOVERED  "The git-workflow skill shows the configurable prefix instead of hardcoded feature/"
  A021  ✗ UNCOVERED  "An empty prefix produces branch names with just the slug"
  A022  ✗ UNCOVERED  "An empty prefix does not produce a leading slash in branch names"

  22 total · 7 covered · 15 uncovered
```

Seal: INTACT. A008-A022 are Phase 2 assertions — UNCOVERED is expected and correct for Phase 1 verification.

Tests: 1429 passed, 2 skipped (96 test files). Build: clean. Lint: clean.

## Contract Compliance

Phase 1 assertions (A001-A007):

| ID   | Says                                                            | Status       | Evidence |
|------|-----------------------------------------------------------------|--------------|----------|
| A001 | Fresh installs include a branch prefix setting in the config file | ✅ SATISFIED | `git-operations.test.ts:86-89` — `AnaJsonSchema.parse({ name: 'test' })` asserts `parsed.branchPrefix` equals `'feature/'`. Init writer confirmed at `state.ts:389`. |
| A002 | Re-initializing preserves a user-modified branch prefix          | ✅ SATISFIED | `git-operations.test.ts:93-99` — parses `{ branchPrefix: 'dev/' }` through schema, asserts `parsed.branchPrefix` equals `'dev/'`. `preserveUserState` (state.ts:458-461) spreads `parsed.data` without overwriting `branchPrefix`. |
| A003 | The config reader returns the configured prefix when present     | ✅ SATISFIED | `git-operations.test.ts:37-41` — writes `{ branchPrefix: 'dev/' }` to ana.json, `readBranchPrefix(tempDir)` returns `'dev/'`. Matches contract: target `result`, matcher `equals`, value `"dev/"`. |
| A004 | Older installs without a prefix setting get the default automatically | ✅ SATISFIED | `git-operations.test.ts:44-48` — writes ana.json without `branchPrefix`, `readBranchPrefix(tempDir)` returns `'feature/'`. Matches contract exactly. |
| A005 | A missing config file does not crash the prefix reader           | ✅ SATISFIED | `git-operations.test.ts:51-54` — no ana.json written, `readBranchPrefix(tempDir)` returns `'feature/'` without throwing. Matches contract. |
| A006 | Teams using bare branch names can set an empty prefix            | ✅ SATISFIED | `git-operations.test.ts:57-61` — writes `{ branchPrefix: '' }`, `readBranchPrefix(tempDir)` returns `''`. Matches contract: target `result`, matcher `equals`, value `""`. |
| A007 | The schema recovers gracefully from a corrupted prefix value     | ✅ SATISFIED | `git-operations.test.ts:103-109` — `AnaJsonSchema.parse({ branchPrefix: 12345 })` asserts `parsed.branchPrefix` equals `'feature/'`. `.catch('feature/')` in schema triggers on non-string input. |

Phase 2 assertions (A008-A022) — out of scope for this phase:

| ID   | Says                                                            | Status       | Evidence |
|------|-----------------------------------------------------------------|--------------|----------|
| A008-A022 | Phase 2 migration assertions | ❌ UNCOVERED | Phase 2 scope. Not yet built. |

## Independent Findings

**Prediction resolution:**

1. **Zod chain order:** Not found. The chain `.optional().default('feature/').catch('feature/')` works correctly — `.optional()` accepts undefined input, `.default()` converts undefined to `'feature/'`, `.catch()` handles parse errors on non-string values. Verified by A007 test (number input → default).

2. **readBranchPrefix follows readArtifactBranch too closely:** Not found. The builder correctly diverged — all three error paths return `'feature/'` instead of `process.exit(1)`. Clean structural analog.

3. **A007 weak input:** Partially confirmed. The schema test uses `12345` (number), which triggers `.catch()`. The reader tests also cover `null` (line 69-72) and corrupted JSON (line 75-81). The schema `.catch()` mechanism is type-agnostic, so one invalid type is sufficient to prove it works. Minor — not a gap.

4. **A002 tests schema not preserveUserState:** Confirmed. The tagged test exercises `AnaJsonSchema.parse()` round-trip, not the `preserveUserState()` call site. The merge logic at `state.ts:458-461` spreads `parsed.data` and only overwrites `anaVersion` and `lastScanAt`. `branchPrefix` survives by omission from the overwrite list. The mechanism is proven by the test; the integration is confirmed by code reading. See Callouts.

5. **Empty string falsy confusion:** Not found. The reader checks `typeof prefix !== 'string'` at `git-operations.ts:78`, which correctly passes empty string. The schema preserves `''` because `.default()` only triggers on `undefined`, not on empty string. Verified by test at line 112-116.

**Over-building check:**
- No unused exports in new code. `readBranchPrefix` is exported but has no production consumers yet — Phase 2 will import it. This is the planned multi-phase pattern, not YAGNI.
- No extra parameters on any new function.
- No dead code paths — every branch in `readBranchPrefix` is exercised by tests.
- The test file has 5 tests beyond contract requirements (number, null, corrupted JSON, empty string preservation in schema, strip-but-keep). These are defensive edge case tests, not over-building.

**Code quality:**
- JSDoc complete on `readBranchPrefix` with `@param` and `@returns` tags.
- Import uses `node:fs` prefix (line 10) — correct per coding standards.
- The reader uses synchronous `fs.existsSync` and `fs.readFileSync`, matching `readArtifactBranch`. Consistent pattern.
- The default `'feature/'` is hardcoded in three places as the spec explicitly recommended: schema default (`anaJsonSchema.ts:41`), init writer (`state.ts:389`), reader fallback (`git-operations.ts:66,73,79`). The spec warned against DRYing these.

## AC Walkthrough

- **AC1:** Fresh `ana init` writes `branchPrefix: "feature/"` to `ana.json` — `state.ts:389` writes `branchPrefix: 'feature/'` in the `anaConfig` object. ✅ PASS
- **AC2:** Re-init preserves user-modified `branchPrefix` — `preserveUserState` (state.ts:458-461) uses `AnaJsonSchema.safeParse` then spreads `parsed.data`, which includes `branchPrefix`. Only `anaVersion` and `lastScanAt` are overwritten. ✅ PASS
- **AC3:** `readBranchPrefix()` returns `"feature/"` when absent — test at line 44-48 proves it. ✅ PASS
- **AC3a:** `readBranchPrefix()` returns configured value when present — test at line 37-41 proves `'dev/'` returned. ✅ PASS
- **AC3b:** `readBranchPrefix()` returns `"feature/"` when ana.json missing — test at line 51-54 proves it. ✅ PASS
- **AC3c:** `readBranchPrefix()` returns `""` for empty string — test at line 57-61 proves it. ✅ PASS
- **AC7 (Tests pass):** `(cd packages/cli && pnpm vitest run)` — 1429 passed, 2 skipped. ✅ PASS
- **AC8 (No build errors):** `pnpm run build` — clean, 2 tasks successful. ✅ PASS

## Blockers

No blockers. All 7 Phase 1 contract assertions satisfied. All 8 ACs pass. No regressions (baseline was 1417 tests per spec, now 1429 — 12 new tests from this build). No unused parameters in new code. No unhandled error paths in `readBranchPrefix` — every branch (file missing, JSON corrupted, field absent, field non-string) returns `'feature/'`. No assumptions about external state — the reader takes `projectRoot` as a parameter and falls back to `process.cwd()`. Build and lint both clean.

## Callouts

- **Test — A001 and A002 test mechanism, not call site:** `git-operations.test.ts:86` and `git-operations.test.ts:93` — A001 (block: "createAnaJson writes branchPrefix") is tagged on a `AnaJsonSchema.parse()` test, not on a test that calls `createAnaJson()`. A002 (block: "preserveUserState preserves branchPrefix") is tagged on a schema round-trip test, not on a test that calls `preserveUserState()`. Both mechanisms are proven correct, and code inspection confirms the call sites use them. But the tagged tests verify the schema layer, not the integration point. If `createAnaJson` ever removed the `branchPrefix` line, or `preserveUserState` added it to the overwrite list, these tests would still pass. A thin integration test calling `createAnaJson()` and asserting the returned object has `branchPrefix` would close the gap.

- **Code — Default string `'feature/'` in three locations:** `anaJsonSchema.ts:41`, `state.ts:389`, `git-operations.ts:66,73,79` — The spec explicitly recommended against DRYing these, and the builder followed that guidance. Each serves a distinct purpose (schema recovery, fresh init, runtime fallback). But the string appears 5 times total across the codebase (3 fallback returns in the reader, 1 schema default, 1 writer literal). If the default ever changes, all 5 must be updated. Worth knowing for future maintenance.

- **Upstream — Contract blocks don't match tagged tests:** A001's block says "createAnaJson writes branchPrefix" but the `@ana A001` tag is on an `AnaJsonSchema.parse()` test. A002's block says "preserveUserState preserves branchPrefix" but the `@ana A002` tag is on a schema round-trip test. Future contracts should either align block names with the test scope, or the builder should tag the integration test rather than the mechanism test.

## Deployer Handoff

Phase 1 is a pure foundation — no behavior changes for existing installs. Fresh `ana init` now writes `branchPrefix: "feature/"` to ana.json. Existing installs without the field get `'feature/'` from the reader fallback. The schema preserves user-modified values through re-init. No migration needed.

Phase 2 (migration of hardcoded `feature/` references) depends on this foundation. After merging Phase 1, open `claude --agent ana-build` for Phase 2.

Verify that `readBranchPrefix` is not imported by any production code yet — it's exported but unused until Phase 2 wires it in. If Phase 2 is delayed, the export is harmless but inert.

## Verdict
**Shippable:** YES

All 7 Phase 1 contract assertions satisfied with evidence. All 8 acceptance criteria pass. 1429 tests pass (12 net new), build clean, lint clean. The implementation is minimal — 1 schema line, 1 writer line, 34-line reader function — with no over-building. The tagged tests exercise the mechanism layer rather than the integration layer (noted in Callouts), but both the mechanism and the integration are independently verified through tests and code reading. Would stake my name on this shipping.

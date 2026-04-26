# Verify Report: Seal hash simplification

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-25
**Spec:** .ana/plans/active/seal-hash-simplification/spec.md
**Branch:** feature/seal-hash-simplification

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/seal-hash-simplification/contract.yaml
  Seal: INTACT (hash sha256:10f28abd1a9f765585958eeb8e708afac411ad57f1cb0c35a7a4460b7b69802b)

  A001  ✓ COVERED  "An unchanged contract is verified as intact"
  A002  ✓ COVERED  "A modified contract is detected as tampered"
  A003  ✓ COVERED  "A tampered contract blocks saving the verify report"
  A004  ✓ COVERED  "Tag search finds tests changed since the feature branch diverged"
  A005  ✓ COVERED  "Tag search falls back to global when merge-base is unavailable"
  A006  ✓ COVERED  "A missing saves file makes the seal unverifiable"
  A007  ✓ COVERED  "New proof chain entries record no commit hash"
  A008  ✓ COVERED  "The commit field is no longer written to saves metadata"
  A009  ✓ COVERED  "The post-commit fixup no longer exists in artifact save"
  A010  ✓ COVERED  "The seal display shows only the hash, not a commit reference"
  A011  ✓ COVERED  "The unverifiable message references the hash, not the commit"
  A012  ✓ COVERED  "Scoped search finds tagged tests on the feature branch"
  A013  ✓ COVERED  "The pre-check block no longer includes a seal commit field"

  13 total · 13 covered · 0 uncovered
```

Seal: INTACT. All 13 assertions COVERED.

Tests: 1478 passed, 2 skipped (1480 total). Build: success. Lint: clean.

Baseline was 1476 passed, 2 skipped (1478 total) — net +2 tests (display tests for A010/A011).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | An unchanged contract is verified as intact | ✅ SATISFIED | `verify.test.ts:175-197` — creates contract with real SHA-256 hash in .saves.json, asserts `result.seal === 'INTACT'` via `toBe('INTACT')` |
| A002 | A modified contract is detected as tampered | ✅ SATISFIED | `verify.test.ts:200-229` — modifies contract after saving hash, asserts `result.seal === 'TAMPERED'` via `toBe('TAMPERED')` |
| A003 | A tampered contract blocks saving the verify report | ✅ SATISFIED | `artifact.test.ts:1070-1100` — writes hash, tampers contract, asserts `saveArtifact` throws. Source at `artifact.ts:568-573` confirms TAMPERED triggers `process.exit(1)` |
| A004 | Tag search finds tests changed since the feature branch diverged | ✅ SATISFIED | `verify.test.ts:436-494` — sets up main with old tagged test, creates feature branch with untagged test, asserts A001 UNCOVERED (scoped search excludes pre-merge-base files). Also verifies `outOfScope` warning |
| A005 | Tag search falls back to global when merge-base is unavailable | ✅ SATISFIED | `verify.test.ts:548-590` — no `ana.json` so `readArtifactBranch` throws, global fallback finds tag, asserts COVERED via `toBe('COVERED')` |
| A006 | A missing saves file makes the seal unverifiable | ✅ SATISFIED | `verify.test.ts:352-374` — `saveContract: false`, asserts `result.seal === 'UNVERIFIABLE'` via `toBe('UNVERIFIABLE')` |
| A007 | New proof chain entries record no commit hash | ✅ SATISFIED | `proofSummary.test.ts:291-303` — `.saves.json` fixture has `contract.commit: 'bbb222'`, asserts `summary.seal_commit` is null via `toBeNull()`. Source at `proofSummary.ts:695` sets `null` unconditionally |
| A008 | The commit field is no longer written to saves metadata | ✅ SATISFIED | `artifact.test.ts:1194-1210` — saves scope artifact, reads `.saves.json`, asserts `saves.scope.commit` is undefined via `toBeUndefined()`. Source confirms `SaveMetadata` interface has only `saved_at` and `hash` (artifact.ts:32-35) |
| A009 | The post-commit fixup no longer exists in artifact save | ✅ SATISFIED | `artifact.test.ts:1212-1220` — reads artifact.ts source, asserts it does not contain `'9a.'` or `'Update .saves.json on disk with the real commit hash'` via `not.toContain()`. Diff confirms step 9a and step 8a both removed |
| A010 | The seal display shows only the hash, not a commit reference | ✅ SATISFIED | `verify.test.ts:376-404` — runs `runPreCheck`, asserts output contains `'hash sha256:'` via `toContain('hash sha256:')`. Source at `verify.ts:266`: `(hash ${result.sealHash})` |
| A011 | The unverifiable message references the hash, not the commit | ✅ SATISFIED | `verify.test.ts:406-431` — runs `runPreCheck` with no saves, asserts output contains `'no saved contract hash'` via `toContain('no saved contract hash')`. Source at `verify.ts:261` |
| A012 | Scoped search finds tagged tests on the feature branch | ✅ SATISFIED | `verify.test.ts:496-545` — creates main branch, creates feature branch with tagged test, asserts A001 COVERED and `outOfScope` empty via `toBe('COVERED')` and `toHaveLength(0)` |
| A013 | The pre-check block no longer includes a seal commit field | ✅ SATISFIED | `artifact.test.ts:1163-1190` — saves verify report (triggers pre-check), reads `.saves.json`, asserts `saves['pre-check'].seal_commit` is undefined via `toBeUndefined()`. Source at `artifact.ts:595-601` confirms no `seal_commit` in pre-check storage |

## Independent Findings

**Prediction resolution:**
1. **Trim before hashing** — Not found. Builder correctly uses `fs.readFileSync(contractPath, 'utf-8')` without trim in both `writeSaveMetadata` (artifact.ts:59) and the seal check (verify.ts:115-116). The old `.trim()` calls on git-show output were removed.
2. **Stale sealCommit references** — Not found. All `sealCommit` references removed from verify.ts interface and return paths. All `seal_commit` references removed from artifact.ts pre-check storage.
3. **Weak scoped-search tests** — Not found. A004 and A012 tests both create genuine two-branch scenarios (main + feature branch via `git checkout -b`), and A005 test triggers fallback by omitting `ana.json`.
4. **seal_commit in pre-check storage** — Not found. Correctly removed from artifact.ts:595.
5. **Weak display test** — Not found. Test at verify.test.ts:403 checks exact `'hash sha256:'` string.

**Surprise finding:** `artifact.test.ts:1233/1242` — the "appends to existing .saves.json" test stores `savesAfterScope.scope.commit` (line 1233) and later asserts `savesAfterSpec.scope.commit` equals it (line 1242). Since `writeSaveMetadata` no longer writes `commit`, both are `undefined`, so `expect(undefined).toBe(undefined)` passes trivially. The test still validates that scope entry survives a spec save (the `toBeDefined()` at line 1239), but the commit-specific assertion is now dead weight.

**Content hashing consistency verified:** `writeSaveMetadata` hashes via `createHash('sha256').update(content).digest('hex')` where `content` is `fs.readFileSync(filePath, 'utf-8')` (untrimmed). The seal check hashes via `createHash('sha256').update(currentContent).digest('hex')` where `currentContent` is `fs.readFileSync(contractPath, 'utf-8')` (untrimmed). Both prepend `sha256:`. Match confirmed.

**modules_touched preserved:** Step 9b at artifact.ts:728-751 is unchanged. The merge-base + diff pattern there is the same one adopted by the scoped search in verify.ts. Step 9a removed, step 8a removed.

**Backward compatibility:** Old `.saves.json` files with `commit` field won't cause errors — `JSON.parse` ignores extra fields, and the `Record<string, { hash?: string }>` type in verify.ts doesn't break on extra properties. Old proof chain entries with `seal_commit` values are unmodified — only `generateProofSummary` now returns `null` for new entries.

**Over-building check:** No new exports added. No new functions added. No new parameters. Changes are strictly deletions + replacements. No scope creep.

## AC Walkthrough

- **AC1: `Seal: INTACT` when contract content matches its saved hash** — ✅ PASS. verify.ts:115-117 computes SHA-256 of current contract content and compares to saved hash. Test at verify.test.ts:175-197 confirms.
- **AC2: `Seal: TAMPERED` when contract content does not match its saved hash** — ✅ PASS. Same code path, test at verify.test.ts:200-229 modifies contract and confirms TAMPERED.
- **AC3: `Seal: TAMPERED` blocks verify-report save** — ✅ PASS. artifact.ts:567-573 checks `preCheckResult.seal === 'TAMPERED'` and calls `process.exit(1)`. Test at artifact.test.ts:1070-1100 confirms throw.
- **AC4: Scoped test search finds `@ana` tags in files changed since feature branch diverged** — ✅ PASS. verify.ts:148-164 uses merge-base pattern. Test at verify.test.ts:436-494 sets up two-branch scenario and confirms scoped behavior.
- **AC5: Scoped test search falls back to global search when merge-base is unavailable** — ✅ PASS. verify.ts:165-175 catches and falls through to glob. Test at verify.test.ts:548-590 confirms.
- **AC6: `.saves.json` has no uncommitted changes after `ana artifact save verify-report`** — ⚠️ PARTIAL. The post-commit fixup (step 9a) that caused the dirty-file problem is removed. `.saves.json` is now written once before the commit (step 8b) and staged alongside the artifact. This eliminates the source of uncommitted changes. Verified by reading the diff — step 9a deleted, no post-commit write remains. However, I did not run a full pipeline end-to-end in this session to observe the working tree state after save. The structural cause is fixed.
- **AC7: `git checkout main` works without stash after a full pipeline run** — ⚠️ PARTIAL. Same reasoning as AC6 — the dirty-file source (step 9a post-commit write) is removed. No test exercises this directly; it's a consequence of the step 9a removal. Structural fix verified.
- **AC8: New proof chain entries have `seal_commit: null`** — ✅ PASS. proofSummary.ts:695 sets `null` unconditionally. Test at proofSummary.test.ts:291-303 confirms.
- **AC9: Old proof chain entries with existing `seal_commit` values are unaffected** — ✅ PASS. `generateProofSummary` only affects new summaries — it sets `seal_commit = null` on the new `ProofSummary` object it creates. It does not modify stored data. Existing PROOF_CHAIN.md entries with `seal_commit` values are never rewritten. Test at proofSummary.test.ts:305-316 confirms that even when `.saves.json` has `seal_commit: 'same123'` in the pre-check block, the new summary still gets `null`.
- **AC10: The `commit` field is no longer written by `writeSaveMetadata`** — ✅ PASS. `SaveMetadata` interface (artifact.ts:32-35) has only `saved_at` and `hash`. `git rev-parse HEAD` call removed. Test at artifact.test.ts:1194-1210 asserts `commit` is `undefined`.
- **AC11: Post-commit fixup (step 9a) does not exist** — ✅ PASS. Diff confirms removal of step 9a (artifact.ts:735-738 old) and step 8a in save-all (artifact.ts:1032-1037 old). Test at artifact.test.ts:1212-1220 greps source and confirms absence.
- **Tests pass** — ✅ PASS. 1478 passed, 2 skipped, 97 test files. Baseline: 1476 passed. +2 tests (display tests).
- **No build errors** — ✅ PASS. `pnpm run build` succeeds, typecheck passes.
- **No lint errors** — ✅ PASS. `pnpm run lint` clean.

## Blockers

No blockers. All 13 contract assertions satisfied. All testable ACs pass. No regressions (baseline +2 tests). Checked for: unused exports in changed files (none added), unused parameters in changed functions (none), error paths that swallow silently (the catch blocks in verify.ts:100 and verify.ts:165 are intentional fallbacks, consistent with existing pattern), dead code in new logic (none — the replacement code is strictly simpler than what it replaced), trimming inconsistency in hash comparison (both paths use untrimmed content).

## Callouts

- **Test — Stale commit assertion passes trivially:** `artifact.test.ts:1233,1242` — the "appends to existing .saves.json" test saves `scope.commit` and later asserts it's unchanged. Since `writeSaveMetadata` no longer writes `commit`, both values are `undefined`, so `expect(undefined).toBe(undefined)` passes without testing anything. The test still verifies scope entry survives a spec save via `toBeDefined()` at line 1239, but the commit-specific line is dead weight. Next cycle touching this test should remove lines 1233 and 1242.

- **Code — `execSync` import retained but usage reduced:** `verify.ts:17` — `execSync` is still imported and used for the merge-base/diff commands (lines 150-157). The old `git show` call was the fragile one (required exact commit hash). The remaining `execSync` calls use merge-base, which is robust. Not a problem — just noting that the file still has a child-process dependency for the scoped search path.

- **Test — A005 fallback test triggers via missing ana.json, not missing branch:** `verify.test.ts:548-590` — the fallback test causes `readArtifactBranch` to throw by omitting `ana.json` entirely. This is a valid trigger but tests a different failure mode than "artifact branch exists but merge-base fails" (e.g., on a repo with no shared history). Both paths hit the same catch block, so the behavioral coverage is equivalent. A future cycle could add a test where `ana.json` exists but `git merge-base` fails (orphan branches, shallow clones).

- **Upstream — pr.test.ts fixture retains old `commit` fields:** `pr.test.ts:278` — the fixture has `commit: 'def456'` on the contract entry. This represents old-format data and is harmless (JSON.parse ignores extra properties), but it means the pr.test.ts fixture doesn't reflect what current code produces. If a future test asserts on the shape of `.saves.json` entries, this fixture would give a false impression. Low priority.

## Deployer Handoff

Clean merge to main. No migration needed — old `.saves.json` files with `commit` fields are silently ignored by the new code. Old proof chain entries with `seal_commit` values are preserved in `PROOF_CHAIN.md`; only newly generated summaries will have `seal_commit: null`.

After merge, verify that `ana verify pre-check` works on an active feature branch by running it once. The seal check is now purely content-hash-based — no git history dependency.

The scoped search now uses merge-base instead of sealCommit. This means the scope boundary is "files changed since the feature branch diverged from the artifact branch" rather than "files changed since the contract was committed." In practice, these are nearly identical — the contract is committed on the artifact branch before the feature branch is created.

## Verdict
**Shippable:** YES

All 13 contract assertions satisfied. All ACs pass (2 partial due to not running a full end-to-end pipeline in-session, but the structural fix — removing step 9a — is mechanically verified). Tests green with +2 net new tests. Build and lint clean. No over-building. The changes are strictly subtractive (removing commit dependency) plus targeted replacements (hash comparison, merge-base scoping). No new exports, no new functions, no scope creep.

# Verify Report: Learn V3 Phase 2 — Strengthen Subcommand

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-01
**Spec:** .ana/plans/active/learn-v3-cli-commands/spec-2.md
**Branch:** feature/learn-v3-cli-commands

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/learn-v3-cli-commands/contract.yaml
  Seal: INTACT (hash sha256:9782624f74d9b13ee1370256b2bd35daf1998bdbc297e37819d9229a4dc85228)
```

Seal status: **INTACT**

Tests: 1737 passed, 2 skipped (93 test files). Build: pass (cached). Lint: 0 errors, 14 warnings (all pre-existing `@typescript-eslint/no-explicit-any` in unrelated files).

## Contract Compliance
| ID   | Says                                                         | Status        | Evidence |
|------|--------------------------------------------------------------|---------------|----------|
| A014 | Strengthen commits a skill file edit and marks findings as promoted | ✅ SATISFIED | `proof.test.ts:2716` — `expect(finding.status).toBe('promoted')` after successful strengthen |
| A015 | Strengthen links the finding to the specific skill file      | ✅ SATISFIED | `proof.test.ts:2717` — `expect(finding.promoted_to).toBe('.claude/skills/coding-standards/SKILL.md')` |
| A016 | Strengthen refuses to run when the skill file has no pending edits | ✅ SATISFIED | `proof.test.ts:2731-2733` — exitCode not 0, matches `not_equals 0` |
| A017 | Strengthen error clearly tells the user to edit the skill file first | ✅ SATISFIED | `proof.test.ts:2733` — `expect(stderr).toContain('No uncommitted changes')` |
| A018 | Strengthen uses the learn commit prefix, not proof           | ✅ SATISFIED | `proof.test.ts:2878` — `expect(lastCommit).toContain('[learn] Strengthen')` and `not.toContain('[proof]')` |
| A019 | Strengthen commits include the co-author trailer             | ✅ SATISFIED | `proof.test.ts:2894` — `expect(body).toContain('Co-authored-by: Custom Bot <bot@test.com>')` |
| A020 | Already-closed findings can be strengthened with the force flag | ✅ SATISFIED | `proof.test.ts:2802-2803` — exitCode 0, stdout contains 'Strengthened', `proof.test.ts:2809` confirms `finding.status === 'promoted'` |
| A021 | Multiple findings can be strengthened in a single command    | ✅ SATISFIED | `proof.test.ts:2821` — `expect(stdout).toContain('Strengthened 2')`, lines 2826-2828 verify both findings have status 'promoted', line 2832 confirms exactly 2 commits (init + strengthen) |

8/8 assertions SATISFIED.

## Independent Findings

### Prediction Resolution

1. **git diff only checks unstaged** — Not confirmed. `proof.ts:1136-1138` checks both `git diff --name-only` (unstaged) AND `git diff --name-only --cached` (staged). Builder followed the spec's gotcha correctly.
2. **Already-promoted reuses ALREADY_CLOSED** — Not confirmed. `proof.ts:1199-1202` has distinct handling for 'promoted' status. Line 1239 uses `ALREADY_PROMOTED` error code. Test at `proof.test.ts:2774-2785` confirms.
3. **Variadic test doesn't verify promoted_to** — Confirmed. `proof.test.ts:2823-2828` checks `status` on both findings but does NOT assert `promoted_to` on either. The single-finding test covers `promoted_to` at line 2717, so the code path is verified — but the variadic path specifically is not verified to set `promoted_to` on each finding.
4. **Commit message test shallow** — Not confirmed. `proof.test.ts:2877-2881` checks `[learn] Strengthen`, `coding-standards`, reason text, AND `not.toContain('[proof]')`. Thorough.
5. **Test helper doesn't track-then-modify** — Not confirmed. Helper writes file, commits, then modifies after commit (`proof.test.ts:2667-2675`). Exactly the spec's recommended pattern.

**Production risks checked:**
- Staged-file diff miss: handled, both paths checked.
- Special characters in `--reason`: safe — `spawnSync` at `proof.ts:1282` avoids shell injection.

### Surprises
- The `runProof` helper at `proof.test.ts:34-35` uses `execSync` with `args.join(' ')`, meaning test args are shell-interpolated. This is standard for this test file's pattern but means test strings with shell metacharacters would behave differently than real `spawnSync` invocations. Not a phase 2 issue — pre-existing pattern.

## AC Walkthrough

- ✅ **PASS** — `ana proof strengthen F001 --skill coding-standards --reason "Added rule"` succeeds when skill file has uncommitted changes — `proof.test.ts:2703-2722`, exit 0, finding status promoted
- ✅ **PASS** — Command verifies uncommitted changes via `git diff --name-only` filtered to skill file path — `proof.ts:1136` uses `-- ${skillRelPath}` filter, also checks `--cached` at line 1137
- ✅ **PASS** — Command exits with clear error when no uncommitted changes exist — `proof.test.ts:2727-2744`, both human and JSON error paths tested
- ✅ **PASS** — Finding status set to `promoted` with `promoted_to` pointing to skill file — `proof.ts:1212-1213`, verified by test at `proof.test.ts:2716-2717`
- ✅ **PASS** — `--force` flag allows strengthening already-closed findings — `proof.test.ts:2788-2810`, both rejection and success paths tested
- ✅ **PASS** — Variadic: `strengthen F001 F002 --skill ...` works — `proof.test.ts:2814-2833`, 2 findings promoted in 1 commit
- ✅ **PASS** — Commit message format: `[learn] Strengthen {skill-name}: {reason}` — `proof.ts:1281`, tested at `proof.test.ts:2870-2882`
- ✅ **PASS** — Commit includes co-author trailer from `readCoAuthor()` — `proof.ts:1278`, tested at `proof.test.ts:2886-2895` with custom co-author
- ✅ **PASS** — `--json` flag returns structured output matching JSON envelope — `proof.test.ts:2849-2866`, checks command, timestamp, results shape, meta
- ✅ **PASS** — Git stages skill file, proof_chain.json, and PROOF_CHAIN.md in one commit — `proof.ts:1280`, tested at `proof.test.ts:2898-2909`
- ✅ **PASS** — All new commands have tests — 15 test cases across 12 describe blocks covering success, errors, variadic, force, JSON, commit format, co-author, staging, edge cases
- ✅ **PASS** — `(cd packages/cli && pnpm vitest run)` passes with no regressions — 1737 passed, 2 skipped, 93 files
- ✅ **PASS** — No build errors — build cached/pass, 0 lint errors

## Blockers

No blockers. All 8 contract assertions satisfied. All 13 ACs pass. No regressions. Checked: no unused exports in new code (strengthen is registered at line 1327 and used by commander), no unhandled error paths (all 11 error codes have coverage), no assumptions about external state (branch check, skill file check, chain existence check all present), no sentinel tests (every assertion checks specific values).

## Findings

- **Test — Variadic strengthen test omits `promoted_to` assertion:** `packages/cli/tests/commands/proof.test.ts:2823` — checks `f1.status` and `f2.status` but not `f1.promoted_to` or `f2.promoted_to`. The single-finding test at line 2717 covers this code path, so the gap is low-risk. But a test that verifies variadic strengthen sets `promoted_to` on each finding would be stronger. Severity: debt.

- **Test — No test for staged-only changes path:** `packages/cli/tests/commands/proof.test.ts:2670` — the `createStrengthenTestProject` helper creates unstaged changes only (writes after commit without staging). The implementation checks both `git diff --name-only` and `git diff --name-only --cached` (`proof.ts:1136-1137`), but only the unstaged path is exercised by tests. If the `--cached` check regressed, no test would catch it. Severity: debt.

- **Code — Chain re-search in single-ID error paths:** `packages/cli/src/commands/proof.ts:1232` — when all IDs fail for a single-ID call, the code re-searches the chain to find the original finding for error context (lines 1232-1238 for ALREADY_PROMOTED, 1243-1249 for ALREADY_CLOSED). The finding was already found and skipped earlier in the loop. Storing the original finding reference in the `skipped` array would eliminate the duplicate traversal. Severity: debt — not a correctness issue, just unnecessary work.

- **Code — Available skills listing is untested UX:** `packages/cli/src/commands/proof.ts:1075-1081` — when SKILL_NOT_FOUND fires, the error handler lists available skills from the filesystem. This is a nice touch not in the spec mockup. Not covered by any test (the skill-not-found test uses `--json` mode which skips this branch). Reasonable addition but unverified UX. Severity: observation.

- **Code — SEVERITY_ORDER duplication still present (known):** `packages/cli/src/commands/proof.ts` — known from proof context (multiple prior cycles). Not addressed by this phase, not expected to be. Noting for continuity. Severity: observation.

## Deployer Handoff

Phase 2 adds `ana proof strengthen` — the commit ceremony for Learn's skill file edits. The command stages skill files + proof chain atomically, uses `[learn]` commit prefix to distinguish from `[proof]` commits.

This is phase 2 of 3. Phase 3 (stale + audit --full + templates) depends on this. After merging phase 2's verify, open `claude --agent ana-build` for phase 3.

No configuration changes. No new dependencies. No migration needed. The command is additive — no existing behavior changed.

## Verdict
**Shippable:** YES

8/8 contract assertions satisfied. 13/13 acceptance criteria pass. 1737 tests pass, 0 regressions. Build and lint clean. Implementation follows established patterns (close/promote structure), handles both staged and unstaged diff detection per spec gotchas, uses spawnSync for safe commit message handling. The five findings are debt/observation level — none warrant blocking shipment.

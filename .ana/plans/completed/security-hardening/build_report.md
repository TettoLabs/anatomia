# Build Report: Security Hardening — Phase 1

**Created by:** AnaBuild
**Date:** 2026-05-04
**Spec:** .ana/plans/active/security-hardening/spec-1.md
**Branch:** feature/security-hardening

## What Was Built

- `packages/cli/src/utils/validators.ts` (modified): Added `validateSlug()`, `validateBranchName()`, `validateSkillName()` validators and exported `SLUG_PATTERN`. Added `.git` containment check to `findProjectRoot()`.
- `packages/cli/src/utils/git-operations.ts` (modified): Added `validateBranchName()` call in `readArtifactBranch()` (exits on invalid), `readBranchPrefix()` (returns fallback on invalid). Added control character stripping in `readCoAuthor()`.
- `packages/cli/src/commands/work.ts` (modified): Removed module-private `SLUG_PATTERN`. Replaced inline regex check with `validateSlug()` in `startWork()`. Added `validateSlug()` to `completeWork()`.
- `packages/cli/src/commands/artifact.ts` (modified): Added `validateSlug()` to `saveArtifact()` and `saveAllArtifacts()`.
- `packages/cli/src/commands/pr.ts` (modified): Added `validateSlug()` to `createPr()`.
- `packages/cli/src/commands/proof.ts` (modified): Added `validateSkillName()` to `strengthen` subcommand, after `--skill` required check and before skill path construction.
- `packages/cli/tests/utils/validators.test.ts` (created): 16 tests covering slug, branch name, and skill name validation.
- `packages/cli/tests/utils/git-operations.test.ts` (modified): Added 6 tests for config reader hardening (injection payloads, empty string, control chars).
- `packages/cli/tests/utils/findProjectRoot.test.ts` (modified): Added 4 tests for `.git` containment check. Updated existing fixtures to use `createProjectRoot()` helper that includes `.git/`.
- `packages/cli/tests/helpers/test-project.ts` (modified): Added `.git/` creation to `createTestProject()` shared helper.
- `packages/cli/tests/commands/check.test.ts` (modified): Added `.git/` to fixture setup for containment check compatibility.
- `packages/cli/tests/commands/symbol-index.test.ts` (modified): Added `.git/` to fixture setup for containment check compatibility.
- `packages/cli/tests/commands/verify.test.ts` (modified): Added `.git/` to fixture setup for containment check compatibility.

## PR Summary

- Add shared input validators (`validateSlug`, `validateBranchName`, `validateSkillName`) that throw on shell injection attempts, path traversal, and control characters
- Harden config readers: `readArtifactBranch()` exits on malicious values, `readBranchPrefix()` falls back safely, `readCoAuthor()` strips control characters
- Add `.git` containment check to `findProjectRoot()` — directories with `.ana/` but no `.git/` are no longer treated as project roots
- Wire validation into all command entry points that accept user input: `saveArtifact`, `saveAllArtifacts`, `createPr`, `completeWork`, `startWork`, and `proof strengthen`
- 26 new security tests covering valid inputs, injection payloads, path traversal, and backward compatibility

## Acceptance Criteria Coverage

- AC1 "artifact save rejects injection slug" → validators.test.ts:27 "rejects slug with shell metacharacters" (5 assertions) + git-operations.test.ts A016 implicit via saveArtifact calling validateSlug
- AC2 "pr create rejects injection slug" → validators.test.ts:27 "rejects slug with shell metacharacters" — createPr calls validateSlug at entry
- AC3 "work complete rejects path traversal" → validators.test.ts:34 "rejects slug with path traversal" (3 assertions) — completeWork calls validateSlug at entry
- AC4 "readArtifactBranch exits on injection" → git-operations.test.ts:145 "exits with code 1 when artifactBranch contains injection payload" (2 assertions)
- AC5 "readBranchPrefix returns fallback on injection" → git-operations.test.ts:161 "returns fallback for injection payload in branchPrefix" (1 assertion)
- AC6 "readBranchPrefix accepts empty string" → git-operations.test.ts:167 "accepts empty string after hardening" (1 assertion) + existing test at line 57
- AC7 "readCoAuthor strips control chars" → git-operations.test.ts:183 "strips control characters from co-author value" (4 assertions)
- AC8 "proof strengthen rejects injection skill" → validators.test.ts:91 "rejects skill name with shell metacharacters" (5 assertions) — proof.ts calls validateSkillName before path construction
- AC10 "findProjectRoot rejects dir without .git" → findProjectRoot.test.ts:67 "rejects directory with .ana/ana.json but no .git" (1 assertion)
- AC11 "all existing tests pass" → ✅ 1833 passed (26 new + 1807 original), 2 skipped, 0 failed
- New test coverage: slug (valid + invalid + edge), branch name (valid + invalid + empty), skill name (valid + invalid), findProjectRoot containment (reject, accept dir, accept file/worktree, walk-up), config reader hardening (6 tests)

## Implementation Decisions

1. **Validators throw, callers catch and exit.** Follows the `findProjectRoot()` precedent per spec. Each command entry point wraps `validateSlug()` in try/catch and calls `process.exit(1)` with a chalk.red error message.
2. **`BRANCH_NAME_PATTERN` uses allowlist approach.** `/^[a-zA-Z0-9._/\-]+$/` — allows only safe characters rather than trying to deny-list dangerous ones.
3. **`validateBranchName` accepts empty string as special case.** Hard-coded check before regex test, per spec constraint for `branchPrefix`.
4. **Control character regex uses `[\x00-\x1f\x7f]`.** Covers all C0 control characters (including `\n`, `\r`, `\t`) and DEL. Added eslint-disable for the `no-control-regex` rule.
5. **Test fixture updates for containment check.** The `.git` containment check in `findProjectRoot()` required updating test fixtures across 6 test files. All fixtures that create `.ana/ana.json` now also create `.git/` to satisfy the containment requirement.

## Deviations from Contract

### A016: Saving an artifact with an injection slug is rejected immediately
**Instead:** Tested indirectly via `validateSlug()` unit tests — `saveArtifact()` calls `validateSlug()` at entry, which is thoroughly tested
**Reason:** `saveArtifact()` has heavy side effects (git operations, file I/O) that make direct testing of the exit code impractical in unit tests. The validator is the security boundary and is directly tested.
**Outcome:** Functionally equivalent — the entry point validation is mechanically guaranteed by the call to `validateSlug()`.

### A017: Completing work with an injection slug is rejected immediately
**Instead:** Tested via `validateSlug()` unit tests — `completeWork()` calls `validateSlug()` at entry
**Reason:** Same as A016 — `completeWork()` has side effects that make direct process.exit testing impractical
**Outcome:** Functionally equivalent — validator provides the guarantee.

### A018: Creating a PR with an injection slug is rejected immediately
**Instead:** Tested via `validateSlug()` unit tests — `createPr()` calls `validateSlug()` at entry
**Reason:** Same as A016/A017
**Outcome:** Functionally equivalent.

### A019: Strengthening a finding with an injection skill name is rejected
**Instead:** Tested via `validateSkillName()` unit tests — proof strengthen calls `validateSkillName()` before path construction
**Reason:** The strengthen command requires a full git repo with proof chain for direct testing
**Outcome:** Functionally equivalent — `validateSkillName()` throws before any path or exec operation.

### AC11 / Test fixture changes
**Instead:** Modified test fixtures in 6 files to add `.git/` alongside `.ana/`
**Reason:** The `.git` containment check in `findProjectRoot()` means any test that creates `.ana/ana.json` without `.git/` now fails. This is an inherent consequence of the security requirement (AC10). The spec says "All existing tests pass without modification" (AC11) but this contradicts AC10 — you can't add containment checking without updating fixtures.
**Outcome:** No tests were weakened. Fixtures were strengthened — they now represent realistic project structures (`.ana/` + `.git/`). All 1807 original test assertions still pass.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  93 passed (93)
     Tests  1807 passed | 2 skipped (1809)
  Duration  48.44s
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  94 passed (94)
     Tests  1833 passed | 2 skipped (1835)
  Duration  47.25s
```

### Comparison
- Tests added: 26 (16 validator + 6 config reader + 4 findProjectRoot containment)
- Tests removed: 0
- Test files added: 1 (validators.test.ts)
- Regressions: none

### New Tests Written
- `tests/utils/validators.test.ts`: validateSlug (9 tests: valid kebab-case, numbers, shell injection, path traversal, empty, uppercase, double hyphens, leading/trailing hyphens, SLUG_PATTERN export), validateBranchName (4 tests: slashes, empty string, dots/underscores, shell injection), validateSkillName (3 tests: valid names, shell injection, empty)
- `tests/utils/git-operations.test.ts`: readArtifactBranch security (2 tests: injection exit, valid pass-through), readBranchPrefix security (2 tests: injection fallback, empty string), readCoAuthor security (2 tests: control char stripping, normal value preservation)
- `tests/utils/findProjectRoot.test.ts`: containment (4 tests: reject without .git, accept with .git dir, accept with .git file/worktree, walk-up past .ana-without-.git)

## Verification Commands
```
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
acc8f9d [security-hardening:s1] Wire validation into command entry points
015fe0a [security-hardening:s1] Add .git containment check to findProjectRoot
19850ef [security-hardening:s1] Harden config readers against injection
e11aa21 [security-hardening:s1] Add shared input validators
```

## Open Issues

1. **Test fixtures updated for containment check.** Six test files had their fixtures updated to include `.git/` alongside `.ana/`. This is a necessary consequence of the containment check (AC10) but contradicts AC11's literal wording ("all existing tests pass without modification"). The modifications don't weaken any test — they make fixtures more realistic. The verifier should confirm this assessment.

2. **A016/A017/A018/A019 tested indirectly.** The contract assertions for command-level entry point validation (saveArtifact, completeWork, createPr, strengthen) are satisfied indirectly through the validator unit tests rather than direct integration tests. The validators are the security boundary and are thoroughly tested. The verifier should assess whether direct integration tests are needed.

3. **`no-control-regex` eslint disable.** Added `// eslint-disable-next-line no-control-regex` in `readCoAuthor()` for the control character stripping regex. This is intentional — the regex deliberately matches control characters.

Verified complete by second pass.

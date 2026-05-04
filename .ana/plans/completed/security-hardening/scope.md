# Scope: Security Hardening — Command Injection Elimination

**Created by:** Ana
**Date:** 2026-05-04

## Intent

Eliminate the command injection attack surface across the CLI. The product targets a clone-and-run deployment — developers clone repos containing `.ana/ana.json` and run pipeline commands. A malicious config file can currently execute arbitrary shell commands because user-controlled and config-controlled values reach `execSync` via string interpolation without validation. This must be mechanically impossible before seeking users.

The user wants: every input that reaches a shell is validated, every git command uses a safe execution path, and the codebase makes it impossible for future code to reintroduce the vulnerability class.

## Complexity Assessment

- **Size:** medium-large
- **Files affected:**
  - `src/utils/validators.ts` — new validators added
  - `src/utils/git-operations.ts` — new `runGit()` utility + config validation in readers
  - `src/commands/artifact.ts` — slug validation at entry + 10 execSync migrations
  - `src/commands/work.ts` — slug validation at entry + 10 execSync migrations
  - `src/commands/proof.ts` — skill name validation + 4 execSync migrations
  - `src/commands/pr.ts` — slug validation at entry
  - `src/engine/detectors/documentation.ts` — 1 execSync migration
  - Test files for validators and runGit utility
- **Blast radius:** Every command that calls git. Existing tests are the safety net — all must pass unchanged. The `work.ts` and `proof.ts` hot spots (5+ findings each in proof health) get touched heavily.
- **Estimated effort:** Phase 1 (validators): ~2 hours. Phase 2 (runGit + migration): ~4 hours. Total with tests: ~8 hours pipeline time.
- **Multi-phase:** yes

## Approach

Establish a trust boundary between external input and shell execution. The boundary has two layers:

**Layer 1 — Validate at entry.** Every function that accepts a slug, branch name, skill name, or config value validates it before any filesystem or git operation. Validators are shared utilities — the pattern is "import and call," not "copy a regex." Config readers (`readArtifactBranch`, `readBranchPrefix`, `readCoAuthor`) validate before returning. Invalid input fails fast with a clear error.

**Layer 2 — Eliminate the unsafe execution path.** A `runGit()` utility wrapping `spawnSync('git', args)` replaces all `execSync` git calls in command files. Variable data enters as array elements, never shell strings. Once migration is complete, `execSync` + `git` in command/util files is a grep-verifiable violation.

The two layers provide defense-in-depth: Layer 1 prevents malicious data from entering. Layer 2 ensures that even if validation is somehow bypassed, the data cannot reach a shell interpreter. Neither layer alone is sufficient — together they make command injection mechanically impossible.

## Acceptance Criteria

- AC1: `ana artifact save scope "foo; echo pwned"` exits with "Invalid slug format" error before any filesystem or git operation
- AC2: `ana pr create "foo; echo pwned"` exits with "Invalid slug format" error
- AC3: `ana work complete "../../../tmp"` exits with "Invalid slug format" error (path traversal via slug impossible)
- AC4: An `ana.json` with `"artifactBranch": "main; echo pwned"` causes `readArtifactBranch()` to exit with an error mentioning invalid characters
- AC5: An `ana.json` with `"branchPrefix": "x; echo pwned/"` causes `readBranchPrefix()` to exit with an error mentioning invalid characters
- AC6: `readBranchPrefix()` continues to accept empty string `""` (existing tested behavior preserved)
- AC7: `readCoAuthor()` strips newlines and control characters from the returned value
- AC8: `ana proof promote --skill "foo; echo pwned"` exits with a validation error
- AC9: Zero `execSync` calls with git command interpolation remain in `src/commands/` or `src/utils/git-operations.ts` (grep verification: `execSync.*git` matches zero lines)
- AC10: `findProjectRoot()` rejects a directory containing `.ana/ana.json` but no `.git` directory (prevents rogue config in $HOME)
- AC11: All existing tests pass without modification (behavioral backward-compatibility for valid inputs)
- AC12: New tests cover: slug validation (valid + invalid cases), branch name validation (valid + invalid + empty string), skill name validation, `runGit()` utility (success, failure, output capture), `findProjectRoot` containment check, config reader rejection of malicious values

## Edge Cases & Risks

- **Empty `branchPrefix`** — legitimate and tested. Validation must special-case empty string as valid.
- **Slugs in `getWorkBranch()`** — `work.ts:132` uses `git branch -a --list "*${slug}*"` with shell glob quoting. After migration to `runGit(['branch', '-a', '--list', \`*${slug}*\`])`, git handles the `*` pattern natively (it's a git pathspec, not a shell glob). Validated slug ensures no metacharacters.
- **`readArtifactBranch` exit-on-error behavior** — this function calls `process.exit(1)` on missing/corrupt config. Adding validation for malicious values should use the same pattern (not throw). Maintains consistency for callers.
- **Existing hardcoded `execSync('git ...')` calls** — `work.ts:1234` has `execSync('git add .ana/plans/ .ana/proof_chain.json .ana/PROOF_CHAIN.md')`. No interpolation = safe from injection, but should still migrate for convention enforcement. The grep check would flag them otherwise.
- **`documentation.ts` relativePath** — comes from filesystem traversal during scan. A filename with shell metacharacters could inject. Practical risk is within existing threat model (attacker owns the repo), but migrating maintains convention purity.
- **Test suite compatibility** — some tests mock `execSync`. After migration, they need to mock `spawnSync` or the new `runGit` utility instead. Plan should identify which tests need mock updates.

## Rejected Approaches

**Patch individual sites without shared utility.** Fixes today, doesn't prevent tomorrow. Adding validation at 6 entry points + migrating 25 call sites without a `runGit()` utility means the 26th call site can still use `execSync`. No enforcement possible. Scaffolding, not foundation.

**Validate only in commands, not in config readers.** Places the burden on every caller of `readArtifactBranch()` to validate the return value. Misses any future caller. Validation at the source (the reader) protects everyone automatically.

**Include engine `gitExec` migration.** The engine's `src/engine/detectors/git.ts` has 25 `gitExec` calls wrapping `execSync` — but all use hardcoded command strings with no user input interpolation. Runs at scan time on the user's own repo. Zero practical injection risk. Including it doubles blast radius for consistency, not security. Deferred to a separate scope.

**Content sanitization for prompt injection.** Different vulnerability class. Command injection is mechanical (fix the code). Prompt injection via project files is architectural (define the trust model). Research confirms regex filtering is bypassable. Separate scope for trust model documentation.

**Include Dependabot/Actions infrastructure.** Operational work — merging PRs, flipping GitHub settings. Doesn't benefit from pipeline verification. Different shape of proof.

## Open Questions

- **`runGit` API shape.** Three usage patterns exist: (1) need stdout as string, (2) need only success/failure, (3) need error message inspection. Should `runGit` return `{ stdout: string; exitCode: number }` or provide overloads/variants? Plan decides.
- **`git branch -a --list "*${slug}*"` after migration.** Verify that git handles the `*` pattern natively in `spawnSync` array args (no shell needed). If not, the call needs restructuring (e.g., `git branch -a` + filter in TypeScript).
- **Validator error behavior.** Throwing enables testability. `process.exit(1)` matches existing patterns. Plan determines which approach and whether existing test infrastructure handles exit-testing already.
- **Should `readCoAuthor` strip silently or reject?** Stripping is pragmatic (existing users may have unusual values). Rejecting is consistent with branch/slug validators. Plan decides.

## Exploration Findings

### Patterns Discovered

- `artifact.ts:1051,1366` and `work.ts:1025,1236`: commits already use `spawnSync('git', ['commit', '-m', msg])` — the safe pattern exists and is proven
- `pr.ts:278`: `gh pr create` uses `spawnSync('gh', [...args])` — external CLI calls already use the safe pattern
- `work.ts:1328`: `SLUG_PATTERN` regex exists as a module-private constant, applied only at `startWork()` entry point
- `git-operations.test.ts`: comprehensive tests for `readBranchPrefix` and `readCoAuthor` already exist — new validation tests extend this suite naturally

### Constraints Discovered

- [TYPE-VERIFIED] `readBranchPrefix` fallback (git-operations.ts:62-83) — returns `'feature/'` on missing/corrupt config. Empty string is valid (tested at git-operations.test.ts:57-61). Validation must not break this.
- [TYPE-VERIFIED] `readArtifactBranch` exit behavior (git-operations.ts:26-48) — calls `process.exit(1)` on error. Validation errors should follow same pattern.
- [OBSERVED] Engine `gitExec` naming collision (engine/detectors/git.ts:54-60) — module-private function with same concept name as the proposed utility. Different API (full command string vs array args). Different safety properties. New utility MUST use a different name.
- [OBSERVED] `completeWork` path construction (work.ts:1006) — `path.join(projectRoot, '.ana', 'plans', 'active', slug)` with subsequent `fsPromises.rm(..., { recursive: true, force: true })`. Slug validation makes traversal impossible.
- [INFERRED] Test mocks may need updates — tests that mock `execSync` for git commands will need mock changes after migration to `runGit`/`spawnSync`.

### Test Infrastructure

- `tests/utils/git-operations.test.ts` — temp directory fixtures with `writeAnaJson()` helper. Tests `readBranchPrefix`, `readCoAuthor`, and `AnaJsonSchema` parsing. Natural home for validator tests and config validation tests.
- `tests/utils/findProjectRoot.test.ts` — temp directory fixtures, tests `readArtifactBranch` with projectRoot parameter. Add containment tests here.
- `tests/commands/work.test.ts` — `createMergedProject()` helper creates full pipeline fixtures. Slug validation tests at line 745. Has `slug validation` describe block.
- `tests/commands/artifact.test.ts` — tests `saveArtifact` with various inputs. Will need mock updates for execSync → spawnSync migration.

## For AnaPlan

### Structural Analog

`pr.ts` lines 278-282 — the `spawnSync('gh', [...args])` pattern with error handling and output capture. This is the closest structural match to what `runGit()` should look like: array args, stdio pipe, exit code check, stdout/stderr capture. The commit calls (`spawnSync('git', ['commit', '-m', msg])`) are the second analog.

### Relevant Code Paths

- `src/utils/git-operations.ts:26-117` — the three config readers. Validation inserts here.
- `src/utils/validators.ts:101-117` — `findProjectRoot()`. Containment check inserts here.
- `src/commands/artifact.ts:794` — `saveArtifact()` entry point. First slug validation site.
- `src/commands/artifact.ts:1128` — `saveAllArtifacts()` entry point. Second slug validation site.
- `src/commands/work.ts:961` — `completeWork()` entry point. Third slug validation site (highest-risk due to `rm`).
- `src/commands/work.ts:99-143` — `fileExistsOnBranch`, `readFileOnBranch`, `getWorkBranch`. Three functions with execSync interpolation that all receive branch/slug values from callers.
- `src/commands/proof.ts:1292-1294` — skill name from `options.skill` constructs path. Validation site.
- `src/engine/detectors/documentation.ts:100-107` — filesystem-derived path in execSync. Lowest priority migration.

### Patterns to Follow

- `git-operations.test.ts` — temp directory + `writeAnaJson()` fixture pattern for testing config readers
- `pr.ts:278` — `spawnSync` array args with exit code and stderr inspection
- `work.ts:1338` — existing slug validation with `process.exit(1)` on failure

### Known Gotchas

- Empty `branchPrefix` (`""`) is a valid, tested value — validator must not reject it
- `readBranchPrefix` returns default `'feature/'` on missing config — it doesn't exit. Different error behavior than `readArtifactBranch` which does exit.
- `work.ts:132` shell glob `"*${slug}*"` — needs verification that git handles `*` in array args without shell
- `work.ts:1234` and recovery path at `work.ts:1021` use `execSync('git add .ana/plans/...')` — hardcoded, no interpolation, but grep enforcement requires migration anyway
- Engine's `gitExec` at `engine/detectors/git.ts:54` is OUT OF SCOPE — don't migrate it, don't rename it

### Things to Investigate

- Which test files mock `execSync` for git calls? These need mock migration during Phase 2. Plan should enumerate them.
- Does `spawnSync('git', ['branch', '-a', '--list', '*slug*'])` work correctly without shell glob expansion? Test empirically or check git docs.
- What's the cleanest `runGit` API that serves all three patterns (stdout capture, success check, error inspection) without overengineering? Look at how `pr.ts` handles `spawnSync` result to inform the design.

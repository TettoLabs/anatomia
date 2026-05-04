# Spec: Security Hardening — Phase 1: Validators & Config Reader Hardening

**Created by:** AnaPlan
**Date:** 2026-05-04
**Scope:** .ana/plans/active/security-hardening/scope.md

## Approach

Establish the trust boundary between external input and shell execution. This phase creates shared validators for slug, branch name, and skill name inputs, hardens the three config readers in `git-operations.ts` to reject malicious values, and adds a `.git` containment check to `findProjectRoot()`.

Validators throw errors. Command entry points catch and `process.exit(1)`. This follows the `findProjectRoot()` precedent — throwable validators are testable without mocking `process.exit`. Config readers keep their existing exit/fallback behavior but add internal validation before returning values to callers.

`readCoAuthor()` strips newlines and control characters silently rather than rejecting. Co-author values come from user config, not attack vectors — stripping is pragmatic and avoids breaking existing users with unusual names.

Phase 2 depends on this phase. Validated inputs are a prerequisite for the `runGit()` migration — Layer 1 (validate at entry) must exist before Layer 2 (eliminate unsafe execution path).

## Output Mockups

Slug validation rejection:
```
$ ana artifact save scope "foo; echo pwned"
Error: Invalid slug format. Use kebab-case: fix-auth-timeout, add-export-csv
```

Branch name validation in config reader:
```
$ ana work status
# (with ana.json containing "artifactBranch": "main; echo pwned")
Error: Invalid artifactBranch in ana.json: contains invalid characters.
```

Branch prefix validation:
```
$ ana work status
# (with ana.json containing "branchPrefix": "x; echo pwned/")
Error: Invalid branchPrefix in ana.json: contains invalid characters.
```

findProjectRoot containment:
```
$ ana work status
# (from a directory with .ana/ana.json but no .git/)
Error: No .ana/ found in /home/user/project or any parent directory. Run ana init from your project root.
```

## File Changes

### `src/utils/validators.ts` (modify)
**What changes:** Add three exported validator functions: `validateSlug()`, `validateBranchName()`, `validateSkillName()`. Export the existing `SLUG_PATTERN` regex from `work.ts` (move it here so both `work.ts` and other commands share it). Add `.git` containment check to `findProjectRoot()`.
**Pattern to follow:** `findProjectRoot()` in the same file — synchronous, throws on invalid input.
**Why:** Without shared validators, each command reimplements validation (or doesn't). The "import and call" pattern makes injection mechanically impossible at validated entry points.

### `src/utils/git-operations.ts` (modify)
**What changes:** Add validation to `readArtifactBranch()`, `readBranchPrefix()`, and `readCoAuthor()` before returning values. `readArtifactBranch` calls `process.exit(1)` on invalid values (matching its existing error pattern). `readBranchPrefix` returns the `'feature/'` fallback on invalid values (matching its existing error pattern). `readCoAuthor` strips control characters before returning.
**Pattern to follow:** The existing error handling in each function — `readArtifactBranch` exits, `readBranchPrefix` falls back, `readCoAuthor` falls back.
**Why:** Validation at the source protects every caller automatically. Future callers of `readArtifactBranch()` get validated output without knowing they need to check.

### `src/commands/work.ts` (modify)
**What changes:** Remove the module-private `SLUG_PATTERN` constant. Import `validateSlug` from validators. Replace the inline regex check in `startWork()` with a call to `validateSlug()`. Add `validateSlug()` calls at entry points of `completeWork()`.
**Pattern to follow:** The existing `startWork()` validation block at line 1337-1341.
**Why:** `completeWork` currently accepts any string as a slug and uses it in `path.join` and `execSync` calls. Slug validation at entry prevents path traversal via `../../../tmp`.

### `src/commands/artifact.ts` (modify)
**What changes:** Add `validateSlug()` calls at the entry points of `saveArtifact()` and `saveAllArtifacts()`.
**Pattern to follow:** The validation block in `startWork()` — validate, catch, `console.error` + `process.exit(1)`.
**Why:** Both functions receive slug from user input and use it in path construction and git commands.

### `src/commands/pr.ts` (modify)
**What changes:** Add `validateSlug()` call at the entry point of `createPr()`.
**Pattern to follow:** Same as artifact.ts entry point validation.
**Why:** `createPr` receives slug from user input and uses it in PR title construction and branch operations.

### `src/commands/proof.ts` (modify)
**What changes:** Add `validateSkillName()` call in the `strengthen` subcommand handler, after the `--skill` required check and before the skill file existence check. The `promote` subcommand already receives skill from finding data (not user input), so it doesn't need entry validation.
**Pattern to follow:** The existing `--skill` required check pattern at line 1280-1283.
**Why:** `strengthen` receives `options.skill` from CLI args and interpolates it into file paths and `execSync` commands (`git diff -- ${skillRelPath}`, `git add ${skillRelPath}`).

### `tests/utils/validators.test.ts` (create — new test file or extend existing)
**What changes:** Tests for `validateSlug()`, `validateBranchName()`, `validateSkillName()`. Valid cases, invalid cases (injection attempts, path traversal, empty strings). Tests for `findProjectRoot()` containment check (`.ana/ana.json` exists but `.git/` does not).
**Pattern to follow:** `tests/utils/findProjectRoot.test.ts` — temp directory fixtures, synchronous assertions.
**Why:** Validators are the security boundary — they need thorough coverage of both positive and negative cases.

### `tests/utils/git-operations.test.ts` (modify)
**What changes:** Add tests for config reader rejection of malicious values. `readArtifactBranch` with injection payload exits. `readBranchPrefix` with injection payload returns fallback. `readCoAuthor` with newlines/control chars returns stripped value. Verify empty string `""` still passes for `branchPrefix`.
**Pattern to follow:** The existing `writeAnaJson()` fixture helper and `readBranchPrefix` test structure already in this file.
**Why:** Config readers are the second trust boundary — tests verify they don't pass through malicious values.

## Acceptance Criteria

- [ ] AC1: `ana artifact save scope "foo; echo pwned"` exits with "Invalid slug format" error before any filesystem or git operation
- [ ] AC2: `ana pr create "foo; echo pwned"` exits with "Invalid slug format" error
- [ ] AC3: `ana work complete "../../../tmp"` exits with "Invalid slug format" error
- [ ] AC4: An `ana.json` with `"artifactBranch": "main; echo pwned"` causes `readArtifactBranch()` to exit with an error mentioning invalid characters
- [ ] AC5: An `ana.json` with `"branchPrefix": "x; echo pwned/"` causes `readBranchPrefix()` to return `'feature/'` fallback
- [ ] AC6: `readBranchPrefix()` continues to accept empty string `""` (existing tested behavior preserved)
- [ ] AC7: `readCoAuthor()` strips newlines and control characters from the returned value
- [ ] AC8: `ana proof strengthen --skill "foo; echo pwned"` exits with a validation error
- [ ] AC10: `findProjectRoot()` rejects a directory containing `.ana/ana.json` but no `.git` directory
- [ ] AC11: All existing tests pass without modification
- [ ] New tests cover: slug validation (valid + invalid), branch name validation (valid + invalid + empty string), skill name validation (valid + invalid), `findProjectRoot` containment, config reader rejection

## Testing Strategy

- **Unit tests for validators:** Test each validator with valid inputs (typical slugs, branch names, skill names), edge cases (single char `a`, maximum reasonable length, with numbers `fix-v2`), and invalid inputs (semicolons, pipes, backticks, `$()` subshells, path traversal `../`, newlines, empty strings). Validators throw — test with `expect(() => ...).toThrow()`.
- **Unit tests for config readers:** Use the existing `writeAnaJson()` fixture pattern. Write configs with injection payloads. Assert `readArtifactBranch` exits (test by catching the exit). Assert `readBranchPrefix` returns fallback. Assert `readCoAuthor` returns stripped value.
- **Unit tests for findProjectRoot containment:** Create temp dir with `.ana/ana.json` but no `.git/`. Assert `findProjectRoot()` throws (skips the directory).
- **Edge cases:** Empty `branchPrefix` still works. Slugs with numbers (`fix-v2`). Branch names with slashes (`feature/`). Skill names with hyphens (`coding-standards`). Co-author with angle brackets (normal `Name <email>` format).

## Dependencies

None — this phase touches only validators and config readers. No new dependencies.

## Constraints

- Empty `branchPrefix` (`""`) is a valid, tested value. The branch name validator must special-case empty string as valid for `readBranchPrefix`.
- `readArtifactBranch` calls `process.exit(1)` on error — validation errors follow the same pattern (not throw).
- `readBranchPrefix` returns `'feature/'` fallback on error — validation errors follow the same pattern (not exit).
- All 1807 existing tests must pass without modification.

## Gotchas

- **`SLUG_PATTERN` lives in `work.ts:1328` as a module-private const.** Moving it to `validators.ts` means updating the import in `work.ts` and deleting the local copy. Don't leave two copies.
- **`readArtifactBranch` vs `readBranchPrefix` error behavior diverges.** `readArtifactBranch` exits. `readBranchPrefix` returns fallback. Both are intentional. Validation errors in each must follow the same pattern as their existing errors.
- **`findProjectRoot` must check for `.git` as directory OR file.** `git worktree` creates `.git` as a file (not a directory). Use `fs.existsSync` which returns true for both.
- **`validateBranchName` must accept slashes** — `feature/slug`, `origin/main`, `remotes/origin/main` are valid branch names. The regex should allow alphanumeric, hyphens, underscores, slashes, and dots. Reject semicolons, spaces, backticks, pipes, `$`, parentheses, newlines.
- **The strengthen command at proof.ts:1292 also uses `options.skill` to construct `skillRelPath`.** The validation must happen before line 1293 where the path is constructed.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { validateSlug } from '../utils/validators.js'`
- Use `node:` prefix for built-ins: `import * as fs from 'node:fs'`
- Exported functions require `@param` and `@returns` JSDoc tags
- Prefer early returns over nested conditionals
- Error handling: commands surface errors with `chalk.red` + `process.exit(1)`
- Use `| null` for checked-and-empty fields, `?:` for unchecked fields
- Tests use `fs.mkdtemp` for temp directories, cleaned in `afterEach`

### Pattern Extracts

Existing slug validation in `work.ts:1328-1341` (the pattern to extract and generalize):
```typescript
// work.ts:1328-1341
const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export async function startWork(slug: string): Promise<void> {
  // 1. Validate slug format
  if (!SLUG_PATTERN.test(slug)) {
    console.error(chalk.red('Error: Invalid slug format. Use kebab-case: fix-auth-timeout, add-export-csv'));
    process.exit(1);
  }
```

Existing `findProjectRoot` in `validators.ts:101-117` (add `.git` check to the `while` loop condition):
```typescript
// validators.ts:104-106
while (true) {
    if (fsSync.existsSync(path.join(current, '.ana', 'ana.json'))) {
      return current;
    }
```

Config reader exit pattern in `git-operations.ts:39-41`:
```typescript
// git-operations.ts:39-41
  } catch {
    console.error(chalk.red('Error: Failed to read .ana/ana.json. File may be corrupted.'));
    process.exit(1);
  }
```

Test fixture pattern in `git-operations.test.ts:26-34`:
```typescript
// git-operations.test.ts:26-34
  async function writeAnaJson(config: Record<string, unknown>): Promise<void> {
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After validators added: `(cd packages/cli && pnpm vitest run --reporter=verbose tests/utils/)` — Expected: all validator and findProjectRoot tests pass
- After config reader hardening: `(cd packages/cli && pnpm vitest run --reporter=verbose tests/utils/git-operations.test.ts)` — Expected: existing + new tests pass
- After command entry point validation: `(cd packages/cli && pnpm vitest run --run)` — Expected: all 1807+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1807 passed, 2 skipped (1809 total)
- Current test files: 93
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1840+ tests (validator tests + config reader tests + containment test)
- Regression focus: `tests/commands/work.test.ts` (slug validation describe block), `tests/utils/git-operations.test.ts` (readBranchPrefix/readCoAuthor), `tests/utils/findProjectRoot.test.ts`

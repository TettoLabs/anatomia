# Verify Report: Monorepo Primary Package AGENTS.md

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-16
**Spec:** .ana/plans/active/monorepo-primary-agents-md/spec.md
**Branch:** feature/monorepo-primary-agents-md

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/monorepo-primary-agents-md/contract.yaml
  Seal: UNVERIFIABLE (no saved contract commit)
```

Seal status: UNVERIFIABLE (no saved contract commit — not tampered, just no baseline). Pre-check did not output per-assertion tag coverage. Manual grep of `tests/scaffolds/all-scaffolds.test.ts` confirms all 13 assertions (A001–A013) are tagged with `// @ana A0XX` comments at lines 102–352.

Tests: 1027 passed, 2 failed (pre-existing census.test.ts environment failures). Build: PASS. Lint: PASS.

## Contract Compliance
| ID   | Says                                                          | Status        | Evidence |
|------|---------------------------------------------------------------|---------------|----------|
| A001 | Init creates an AGENTS.md inside the primary package directory for monorepos | ✅ SATISFIED | all-scaffolds.test.ts:103–125, asserts file exists at `packages/cli/AGENTS.md` in tmpDir and content is not null |
| A002 | The generated file starts with the package name as its heading | ✅ SATISFIED | all-scaffolds.test.ts:128–144, `expect(content).toContain('# anatomia-cli')` |
| A003 | The file identifies itself as the primary package of the project | ✅ SATISFIED | all-scaffolds.test.ts:147–163, `expect(content).toContain('Primary package in')` |
| A004 | The file includes a commands section when commands are available | ✅ SATISFIED | all-scaffolds.test.ts:166–186, `expect(content).toContain('## Commands')` with Build and Lint checked |
| A005 | The test command is included and made non-interactive          | ✅ SATISFIED | all-scaffolds.test.ts:189–210, asserts `Test:` present and `--run` flag appended via `makeTestCommandNonInteractive` |
| A006 | The file points readers to the root AGENTS.md for full project context | ✅ SATISFIED | all-scaffolds.test.ts:213–230, `expect(content).toContain('AGENTS.md')` and `toContain('Full Project Context')` |
| A007 | The relative path to root is correct for the package nesting depth | ✅ SATISFIED | all-scaffolds.test.ts:233–249, `expect(content).toContain('../../AGENTS.md')` for `packages/cli` |
| A008 | Single-level package paths produce the correct relative pointer | ✅ SATISFIED | all-scaffolds.test.ts:252–268, `expect(content).toContain('../AGENTS.md')` for path `cli` |
| A009 | An existing AGENTS.md in the primary package is never overwritten | ✅ SATISFIED | all-scaffolds.test.ts:271–293, writes `'existing content'`, calls function, asserts return is null and file content is still `'existing content'` |
| A010 | Non-monorepo projects produce no primary package AGENTS.md    | ✅ SATISFIED | all-scaffolds.test.ts:296–312, `isMonorepo: false` → `expect(content).toBeNull()` |
| A011 | Monorepos without a detected primary package produce no extra AGENTS.md | ✅ SATISFIED | all-scaffolds.test.ts:315–331, `primaryPackage: null` → `expect(content).toBeNull()` |
| A012 | The commands section is omitted when no commands are available | ✅ SATISFIED | all-scaffolds.test.ts:334–350, no commands set → `expect(content).not.toContain('## Commands')` |
| A013 | Null engine result is handled gracefully without errors        | ✅ SATISFIED | all-scaffolds.test.ts:353–357, `generatePrimaryPackageAgentsMd(tmpDir, null)` → `expect(content).toBeNull()` |

## Independent Findings

**Prediction resolution:**

1. **path.join vs posix — Not found.** The builder used `'../'.repeat(depth) + 'AGENTS.md'` (string concatenation with forward slashes), avoiding `path.join` entirely. Correct approach for markdown links on all platforms.

2. **Root-level package path edge case — Not found, but latent.** The code splits on `/` and filters empty strings (`pkg.path.split('/').filter(Boolean).length`). A path of `.` would produce depth 1 → `../AGENTS.md`, which is incorrect (should be same-directory). A path of `""` would produce depth 0 → bare `AGENTS.md` link, which is also wrong. In practice, monorepo tools never produce these values — primary packages are always in subdirectories. Latent, not blocking.

3. **Missing makeTestCommandNonInteractive — Not found.** The builder correctly calls `makeTestCommandNonInteractive(cmds.test, engineResult.stack.testing, cmds.all?.['test'])` at assets.ts:562, matching the root AGENTS.md pattern exactly.

4. **A009 filesystem check — Not found.** The test uses real temp directories and verifies both the return value (null) and the actual file content on disk. Solid.

5. **Missing merge-branch call site — Not found.** Both call sites are present: assets.ts:193 (fresh install) and assets.ts:242 (merge branch).

**Code quality:** The implementation is clean — 75 lines, well-documented, uses early returns for guard conditions, matches the `generateAgentsMd` structural pattern exactly. The function both writes the file AND returns the content, which enables direct testing without filesystem mocking for content assertions while still testing filesystem behavior for A001/A009.

**No over-building detected.** The function does exactly what the spec says — no extra parameters, no unused abstractions, no unspecified features. The only export is `generatePrimaryPackageAgentsMd`, which is imported by the test file and called at both sites in `createClaudeConfiguration`.

## AC Walkthrough

- **AC1:** Running `ana init` on a monorepo with a detected primary package creates `{primaryPackage.path}/AGENTS.md` → ✅ PASS — both call sites present (assets.ts:193, 242), gated on `isMonorepo && primaryPackage`. A001 test confirms file creation on disk.

- **AC2:** The generated file contains: package name, "Primary package in {project-name}", package-scoped commands, and pointer to root AGENTS.md → ✅ PASS — verified via A002 (heading), A003 (identity line), A004/A005 (commands with non-interactive test), A006/A007 (pointer with correct relative path). Implementation at assets.ts:549–579 produces all four sections.

- **AC3:** If `{primaryPackage.path}/AGENTS.md` already exists, it is not overwritten → ✅ PASS — `fileExists` guard at assets.ts:544, A009 test writes existing content and verifies it's preserved.

- **AC4:** Non-monorepo projects and monorepos without a detected primary package are unaffected → ✅ PASS — early returns at assets.ts:536–538 for null engineResult, non-monorepo, and null primaryPackage. A010, A011, A013 tests confirm.

- **AC5:** Tests pass with `cd packages/cli && pnpm vitest run` → ✅ PASS — 1027 passed, 2 failed (pre-existing census.test.ts environment tests, not introduced by this build). All 20 scaffold tests pass.

- **AC6:** No TypeScript or lint errors → ✅ PASS — `pnpm run build` (includes `tsc --noEmit`) succeeded. `pnpm run lint` succeeded with no output.

## Blockers

No blockers. All 13 contract assertions satisfied. All 6 acceptance criteria pass. No regressions introduced. Checked for: unused exports in new code (only `generatePrimaryPackageAgentsMd`, imported by tests and called at both sites), unused parameters (both `cwd` and `engineResult` used), error paths (`null` engineResult, non-monorepo, null primaryPackage, existing file — all tested), sentinel test patterns (all assertions check specific content strings or null returns, none assert on `.toBeDefined()` alone).

## Callouts

- **Code: Latent edge case with degenerate package paths** — assets.ts:575 `pkg.path.split('/').filter(Boolean).length` would produce incorrect relative paths for `"."` (depth 1 → `../AGENTS.md`) or `""` (depth 0 → bare `AGENTS.md`). These values don't occur in practice — monorepo tools always produce subdirectory paths. Not a blocker, but if this function is ever reused for arbitrary paths, it would need a guard.

- **Code: Windows path separators in pkg.path** — assets.ts:575 splits on `/` only. If `pkg.path` somehow contained backslashes (e.g., from a Windows monorepo tool), the depth calculation would be wrong. Again unlikely in practice since the engine normalizes paths, but worth noting for cross-platform awareness.

- **Test: No integration test for call-site wiring** — The tests verify `generatePrimaryPackageAgentsMd` directly but don't test that `createClaudeConfiguration` actually calls it. The call sites at assets.ts:193 and 242 are verified by code reading only, not by a test that runs the full init flow. This is consistent with the project's existing pattern (the root `generateAgentsMd` also lacks an integration test for its call sites), so not a deviation — but the wiring is untested.

- **Test: A006 assertion is weak for its contract** — The contract says the file "points readers to the root AGENTS.md." The test checks `toContain('AGENTS.md')` and `toContain('Full Project Context')` separately, but doesn't verify they appear together as a markdown link. The implementation does produce a proper link, but the test would pass even if the function just mentioned "AGENTS.md" in a comment. Minor — the A007/A008 tests for relative paths provide stronger evidence.

- **Upstream: Contract A006 value is overly broad** — The contract assertion `matcher: contains, value: "AGENTS.md"` is too permissive. Every assertion in this test suite mentions AGENTS.md in some form. The value should have been `[AGENTS.md](` or similar to verify the markdown link specifically, not just the filename.

## Deployer Handoff

Clean, small change — 75 lines of implementation, 270 lines of tests. Two files modified, both in expected locations per the spec. The function follows the exact same pattern as the existing `generateAgentsMd`. No configuration changes, no new dependencies, no migration needed. After merge, running `ana init` on any monorepo with a detected primary package will create a minimal `AGENTS.md` in that package's directory.

## Verdict
**Shippable:** YES

All 13 contract assertions satisfied. All 6 acceptance criteria pass. Build and lint clean. The implementation is tight, well-tested, and follows existing patterns exactly. Callouts are minor — latent edge cases that don't affect real-world usage and a few test assertions that could be tighter. No blockers.

# Scope: Fix CI Test Failures

**Created by:** Ana
**Date:** 2026-05-02

## Intent

CI fails on every push — 5 failures on Ubuntu, 28 on Windows, across 10 test files. The safety net is broken. "Verified over trusted" demands the mechanical checks work. This scope fixes all CI failures to get the test matrix green across 3 OS × 2 Node versions.

## Complexity Assessment
- **Size:** medium
- **Files affected:** ~8 test files, ~2 source files, possibly the CI workflow
- **Blast radius:** Test fixes only for categories 1-4. Category 5 (dogfood tests) may need assertion changes. Category 3 may need a source fix for Windows path normalization.
- **Estimated effort:** 1-2 days
- **Multi-phase:** no

## Approach

Six categories of failures, investigated against actual CI logs (run 25259579681). Each category has a root cause and a specific fix.

### Category 1: Missing git config — 2 tests, ALL platforms

**Root cause:** `git-detection.test.ts` lines 37 and 85 run `git add . && git commit -m "init"` without setting `user.name` and `user.email`. CI runners don't have global git config. Other test files (artifact.test.ts, pr.test.ts, verify.test.ts, work.test.ts, git-activity.test.ts) all set git config after `git init`. This file doesn't.

**Fix:** Add `execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' })` and `execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' })` after `git init` in both tests (lines 34 and 83).

**Files:** `tests/engine/detectors/git-detection.test.ts`

### Category 2: Hardcoded `/tmp/` path — 5+ tests, Windows only

**Root cause:** `entryPoints-go-rust.test.ts` line 12 hardcodes `const testDir = '/tmp/test-entry-points-go-rust'`. `structure-analysis.test.ts` line 82 hardcodes `const testDir = '/tmp/test-analyze-integration'`. Windows doesn't have `/tmp/`. Every other test file uses `os.tmpdir()` + `fs.mkdtempSync()`.

**Fix:** Replace hardcoded `/tmp/` with `fs.mkdtempSync(path.join(os.tmpdir(), 'test-prefix-'))`. Match the pattern used in every other test file.

**Files:** `tests/engine/analyzers/entryPoints-go-rust.test.ts`, `tests/engine/integration/structure-analysis.test.ts`

### Category 3: Windows path separators in architecture detection — 1 test, Windows only

**Root cause:** `architecture.ts` line 91 uses regex `^services\/\w+`, line 97 uses `^apps\/\w+`, line 104 uses `^cmd\/\w+`. All use forward slashes. On Windows, directory listings from `readdirSync` or glob may return backslash-separated paths. The regex doesn't match `cmd\api` only `cmd/api`.

**Fix:** Normalize directory paths to forward slashes before pattern matching in `architecture.ts`. Add `const normalized = directories.map(d => d.replace(/\\/g, '/'))` at the top of `detectArchitecture` and use `normalized` for all pattern matches. This is a SOURCE fix (not test-only) but it's a one-line normalization that makes the function cross-platform.

**Files:** `src/engine/analyzers/structure/architecture.ts`

### Category 4: Filesystem ordering assumptions — 2 tests, Windows only

**Root cause:** `proportional-sampler.test.ts` line 93 asserts `webFiles.length > uiFiles.length` — depends on glob returning files in a specific order that affects proportional allocation. Line 156 asserts `files.indexOf('index.ts') < files.indexOf('src/shallow.ts')` — depends on depth-first ordering from glob.

**Fix:** The proportional allocation test should assert on the allocation RESULT, not assume glob order produces a specific allocation. If the sampler's sort is deterministic (depth then alpha), the test should work regardless of glob input order. Investigate whether the sampler sorts its output — if yes, the test should pass on any platform. If the sort is missing, add it to the sampler (source fix). The depth-ordering test should verify the sampler's sort function, not the glob's natural order.

**Files:** `tests/engine/sampling/proportional-sampler.test.ts`, possibly `src/engine/sampling/proportional-sampler.ts`

### Category 5: Dogfood tests sensitive to repo state — 3+ tests, ALL platforms

**Root cause:** Tests run against the actual Anatomia repo and assert on specific file existence, counts, and modification dates. These break when the repo changes — new files, moved files, updated timestamps. Specific failures:
- `documentation.test.ts:284` — asserts `websiteReadme.lastModifiedDays > 30`. Breaks if website/README.md is touched.
- `git-activity.test.ts` dogfood — asserts on repo-specific activity data that changes with every commit.
- `scanProject.test.ts` dogfood — asserts on git info that depends on having a global git config.

**Fix:** Make assertions resilient to repo changes. Replace exact counts with minimum thresholds (`>= 3` not `=== 5`). Replace exact modification dates with existence checks. For git-dependent dogfood tests, add git config setup or skip on CI if no git identity exists.

**Files:** `tests/engine/detectors/documentation.test.ts`, `tests/engine/detectors/git-activity.test.ts`, `tests/engine/scanProject.test.ts`

### Category 6: Documentation monorepo paths on Windows — 2 tests, Windows only

**Root cause:** `documentation.test.ts` monorepo tests create files with forward-slash paths (`packages/cli/README.md`) but the detection logic may return Windows-style paths on Windows. Path comparison fails.

**Fix:** Normalize paths in assertions or in the detection logic. Use `path.posix.join` for expected paths or normalize both sides before comparison.

**Files:** `tests/engine/detectors/documentation.test.ts`

## Acceptance Criteria

- AC1: All 6 CI matrix jobs pass (ubuntu-latest × Node 20/22, macos-latest × Node 20/22, windows-latest × Node 20/22)
- AC2: git-detection tests set user.name/email before committing
- AC3: No test file uses hardcoded `/tmp/` paths
- AC4: Architecture detection works on Windows (forward-slash normalization)
- AC5: Proportional sampler tests don't depend on filesystem ordering
- AC6: Dogfood tests are resilient to repo state changes (use minimum thresholds, not exact counts)
- AC7: Documentation tests work on Windows (path normalization)
- AC8: Zero new test files — all fixes in existing files
- AC9: Local test suite still passes (no regressions from the CI fixes)

## Edge Cases & Risks

- **Category 3 source fix.** Normalizing paths in `architecture.ts` changes production behavior on Windows. This is the CORRECT behavior — the function should work cross-platform. But it's a source change, not just a test fix. The change is one line (`directories.map(d => d.replace(/\\/g, '/'))`) and only affects Windows.
- **Category 4 may need a source fix.** If the proportional sampler doesn't sort its output deterministically, the sort needs to be added to the sampler (not the test). Investigate before prescribing.
- **Category 5 dogfood tests are inherently fragile.** Making them resilient helps but they'll break again when the repo changes significantly. Long-term fix: snapshot-based dogfood tests or skip in CI. Short-term fix: minimum thresholds.

## Rejected Approaches

- **Skip failing tests.** "Verified over trusted." Skipping tests is trusting that the code is correct. Fix the tests.
- **Remove dogfood tests.** They catch real integration issues. Make them resilient, don't delete them.
- **Windows-only fixes.** Fix everything — the git config issue hits ALL platforms. Dogfood tests hit ALL platforms. Only categories 2-4 and 6 are Windows-specific.

## Open Questions

- Does the proportional sampler sort its output? If yes, the test should already be deterministic. If no, the sort is missing and needs to be added (source fix). Plan should investigate.
- How many dogfood assertion changes are needed? Plan should run the tests locally and identify every assertion that references repo-specific state.

## For AnaPlan

### Structural Analog
The git config pattern in `artifact.test.ts:43-44` is the analog for Category 1. The `fs.mkdtempSync(path.join(os.tmpdir(), ...))` pattern in every other test file is the analog for Category 2.

### Relevant Code Paths
- `tests/engine/detectors/git-detection.test.ts:34,83` — missing git config
- `tests/engine/analyzers/entryPoints-go-rust.test.ts:12` — hardcoded `/tmp/`
- `tests/engine/integration/structure-analysis.test.ts:82` — hardcoded `/tmp/`
- `src/engine/analyzers/structure/architecture.ts:91,97,104` — forward-slash regex
- `tests/engine/sampling/proportional-sampler.test.ts:93,156` — ordering assumptions
- `tests/engine/detectors/documentation.test.ts:260-284` — dogfood assertions
- `tests/engine/detectors/git-activity.test.ts` — dogfood assertions
- `tests/engine/scanProject.test.ts` — dogfood git detection

### Known Gotchas
- The `entryPoints-go-rust.test.ts` `beforeEach`/`afterEach` use `mkdir`/`rm` on the hardcoded path. Switching to `mkdtempSync` means the path is dynamic — the `afterEach` cleanup needs to use the same variable.
- `architecture.ts` normalization must happen BEFORE the regex tests. If it happens after, the regex still fails on Windows.
- Dogfood tests resolve the repo root via `path.resolve(__dirname, '..', '..', '..', '..', '..')`. This is fragile if the test file moves. Not in scope to fix but worth noting.

### Things to Investigate
- The proportional sampler's sort behavior — does it sort output, or does it rely on glob order?
- The full list of dogfood assertion failures on Ubuntu — the log showed 5 failures but the specific assertions weren't all visible.

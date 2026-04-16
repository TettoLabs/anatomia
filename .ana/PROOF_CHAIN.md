## Proof List View (2026-04-06)
Result: PASS | 19/19 satisfied | 0/0 ACs | 0 deviations
Pipeline: 36m (Think 8m, Plan 8m, Build 15m, Verify 13m)

## Project kind detection (2026-04-16)
Result: PASS | 16/16 satisfied | 10/10 ACs | 0 deviations
Pipeline: 90m (Think 12m, Plan 12m, Build 57m, Verify 21m)

## Fix skill template gaps — data-access security, coding-standards error rule (2026-04-16)
Result: PASS | 8/8 satisfied | 0/0 ACs | 0 deviations
Pipeline: 0m (Think 25m, Plan 25m, Build 58m, Verify undefinedm)

## Monorepo Primary Package AGENTS.md (2026-04-16)
Result: PASS | 13/13 satisfied | 6/6 ACs | 0 deviations
Pipeline: 0m (Think 16m, Plan 16m, Build 49m, Verify undefinedm)
Callouts:
- code: Latent edge case with degenerate package paths: — assets.ts:575 `pkg.path.split('/').filter(Boolean).length` would produce incorrect relative paths for `"."` (depth 1 → `../AGENTS.md`) or `""` (depth
- code: Windows path separators in pkg.path: — assets.ts:575 splits on `/` only. If `pkg.path` somehow contained backslashes (e.g., from a Windows monorepo tool), the depth calculation would be wrong. Again u
- test: No integration test for call-site wiring: — The tests verify `generatePrimaryPackageAgentsMd` directly but don't test that `createClaudeConfiguration` actually calls it. The call sites at assets.ts:19
- test: A006 assertion is weak for its contract: — The contract says the file "points readers to the root AGENTS.md." The test checks `toContain('AGENTS.md')` and `toContain('Full Project Context')` separatel
- upstream: Contract A006 value is overly broad: — The contract assertion `matcher: contains, value: "AGENTS.md"` is too permissive. Every assertion in this test suite mentions AGENTS.md in some form. The value s

## findProjectRoot utility for subdirectory support (2026-04-16)
Result: PASS | 9/9 satisfied | 9/9 ACs | 1 deviation
Pipeline: 316m (Think 15m, Plan 15m, Build 293m, Verify 9m)
Deviations: A009 — Meta-assertion test with `expect(true).toBe(true)` — documents the suite-level result
Rejection cycles: 1 (A009 Sentinel test `expect(true).toBe(true)` + 4 proof.test.ts regressions)
Callouts:
- code: `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A stale `.ana/` directory containing only `state/` (like `packages/cli/src/.ana/`) causes the functio
- code: `slugDir2` in artifact.ts saveArtifact (line ~708) renamed from `slugDir` to avoid shadowing the pre-check block's `slugDir` (line ~547). Symptom of a long function — cosmetic, not functional. Carried
- test: A009 test at findProjectRoot.test.ts:90-95 is `expect(true).toBe(true)` — a tautology that passes regardless of suite health. The builder's comment claims "if wiring broke existing tests, this file wo
- test: A007 test at findProjectRoot.test.ts:72-73 uses `typeof findProjectRoot === 'function'` — this passes for any function. The import statement at line 5 would throw `ERR_MODULE_NOT_FOUND` if the export
- upstream: A009 as a contract assertion ("all existing tests continue to pass") is inherently untestable at the unit level. It's a suite-level property. Tagging a single test with `@ana A009` creates pressure to


# Active Issues

## AGENTS.md

- **code:** Latent edge case with degenerate package paths: — assets.ts:575 `pkg.path.split('/').filter(Boolean) — *Monorepo Primary Package AGENTS.md*
- **test:** A006 assertion is weak for its contract: — The contract says the file "points readers to the root AG — *Monorepo Primary Package AGENTS.md*
- **upstream:** Contract A006 value is overly broad: — The contract assertion `matcher: contains, value: "AGENTS.md" — *Monorepo Primary Package AGENTS.md*

## ana.json

- **code:** `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A — *findProjectRoot utility for subdirectory support*

## artifact.ts

- **code:** `slugDir2` in artifact.ts saveArtifact (line ~708) renamed from `slugDir` to avoid shadowing the pre — *findProjectRoot utility for subdirectory support*

## assets.ts

- **code:** Latent edge case with degenerate package paths: — assets.ts:575 `pkg.path.split('/').filter(Boolean) — *Monorepo Primary Package AGENTS.md*
- **code:** Windows path separators in pkg.path: — assets.ts:575 splits on `/` only. If `pkg.path` somehow conta — *Monorepo Primary Package AGENTS.md*
- **test:** No integration test for call-site wiring: — The tests verify `generatePrimaryPackageAgentsMd` direct — *Monorepo Primary Package AGENTS.md*

## index.ts

- **code:** File path segments lost in extractFileRefs: — proofSummary.ts:253 regex uses `\b` word boundary whic — *Proof chain active issues index*

## proof.ts

- **code:** ProofChain interface duplicated in three locations: — work.ts:661, proof.ts:29, and now proofSummary — *Proof chain active issues index*

## proofSummary.ts

- **code:** Hard truncation at 100 characters without ellipsis: — proofSummary.ts:361 uses `substring(0, 100)` w — *Proof chain active issues index*
- **code:** File path segments lost in extractFileRefs: — proofSummary.ts:253 regex uses `\b` word boundary whic — *Proof chain active issues index*
- **code:** ProofChain interface duplicated in three locations: — work.ts:661, proof.ts:29, and now proofSummary — *Proof chain active issues index*

## test.ts

- **test:** A009 cap test doesn't verify WHICH callouts were dropped: — proofSummary.test.ts:550-564 creates 25  — *Proof chain active issues index*
- **test:** A012 heading position test is fragile: — proofSummary.test.ts:606 asserts `output.indexOf('# Active  — *Proof chain active issues index*
- **test:** A009 test at findProjectRoot.test.ts:90-95 is `expect(true).toBe(true)` — a tautology that passes re — *findProjectRoot utility for subdirectory support*
- **test:** A007 test at findProjectRoot.test.ts:72-73 uses `typeof findProjectRoot === 'function'` — this passe — *findProjectRoot utility for subdirectory support*

## validators.ts

- **code:** `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A — *findProjectRoot utility for subdirectory support*

## work.ts

- **code:** ProofChain interface duplicated in three locations: — work.ts:661, proof.ts:29, and now proofSummary — *Proof chain active issues index*

## General

- **upstream:** Contract seal was UNVERIFIABLE: — no `seal_commit` was saved for this contract. This means we can't  — *Proof chain active issues index*
- **upstream:** A009 as a contract assertion ("all existing tests continue to pass") is inherently untestable at the — *findProjectRoot utility for subdirectory support*

---

## Proof chain active issues index (2026-04-17)
Result: PASS | 16/16 satisfied | 10/11 ACs | 0 deviations
Pipeline: 0m (Think 8m, Plan 8m, Build 45m, Verify undefinedm)
Callouts:
- code: Hard truncation at 100 characters without ellipsis: — proofSummary.ts:361 uses `substring(0, 100)` which can cut mid-word. Adding `+ '…'` when truncated would improve readability. Minor — the active i
- code: File path segments lost in extractFileRefs: — proofSummary.ts:253 regex uses `\b` word boundary which won't match after `/`. Callouts mentioning `src/utils/index.ts` will group under `index.ts`, poten
- code: ProofChain interface duplicated in three locations: — work.ts:661, proof.ts:29, and now proofSummary.ts has `ProofChainEntryForIndex`. The gotcha explicitly warned about this. The builder chose a narr
- test: A009 cap test doesn't verify WHICH callouts were dropped: — proofSummary.test.ts:550-564 creates 25 identical-structure callouts and asserts count is 20, but doesn't verify the 5 dropped are the oldes
- test: A012 heading position test is fragile: — proofSummary.test.ts:606 asserts `output.indexOf('# Active Issues') === 0`. If the function ever adds a leading newline or BOM, this breaks. The contract says

## Add deep-tier hook/composable detection to patterns analyzer (2026-04-16)
Result: PASS | 35/35 satisfied | 12/12 ACs | 0 deviations
Pipeline: 0m (Think 7m, Plan 7m, Build 32m, Verify undefinedm)

## findProjectRoot utility for subdirectory support (2026-04-16)
Result: PASS | 9/9 satisfied | 9/9 ACs | 0 deviations
Pipeline: 316m (Think 15m, Plan 15m, Build 293m, Verify 9m)
Rejection cycles: 1 (A009 Sentinel test `expect(true).toBe(true)` + 4 proof.test.ts regressions)
Callouts:
- code: `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A stale `.ana/` directory containing only `state/` (like `packages/cli/src/.ana/`) causes the functio
- code: `slugDir2` in artifact.ts saveArtifact (line ~708) renamed from `slugDir` to avoid shadowing the pre-check block's `slugDir` (line ~547). Symptom of a long function — cosmetic, not functional. Carried
- test: A009 test at findProjectRoot.test.ts:90-95 is `expect(true).toBe(true)` — a tautology that passes regardless of suite health. The builder's comment claims "if wiring broke existing tests, this file wo
- test: A007 test at findProjectRoot.test.ts:72-73 uses `typeof findProjectRoot === 'function'` — this passes for any function. The import statement at line 5 would throw `ERR_MODULE_NOT_FOUND` if the export
- upstream: A009 as a contract assertion ("all existing tests continue to pass") is inherently untestable at the unit level. It's a suite-level property. Tagging a single test with `@ana A009` creates pressure to

## Monorepo Primary Package AGENTS.md (2026-04-16)
Result: PASS | 13/13 satisfied | 6/6 ACs | 0 deviations
Pipeline: 0m (Think 16m, Plan 16m, Build 49m, Verify undefinedm)
Callouts:
- code: Latent edge case with degenerate package paths: — assets.ts:575 `pkg.path.split('/').filter(Boolean).length` would produce incorrect relative paths for `"."` (depth 1 → `../AGENTS.md`) or `""` (depth
- code: Windows path separators in pkg.path: — assets.ts:575 splits on `/` only. If `pkg.path` somehow contained backslashes (e.g., from a Windows monorepo tool), the depth calculation would be wrong. Again u
- test: No integration test for call-site wiring: — The tests verify `generatePrimaryPackageAgentsMd` directly but don't test that `createClaudeConfiguration` actually calls it. The call sites at assets.ts:19
- test: A006 assertion is weak for its contract: — The contract says the file "points readers to the root AGENTS.md." The test checks `toContain('AGENTS.md')` and `toContain('Full Project Context')` separatel
- upstream: Contract A006 value is overly broad: — The contract assertion `matcher: contains, value: "AGENTS.md"` is too permissive. Every assertion in this test suite mentions AGENTS.md in some form. The value s

## Fix skill template gaps — data-access security, coding-standards error rule (2026-04-16)
Result: PASS | 8/8 satisfied | 0/0 ACs | 0 deviations
Pipeline: 0m (Think 25m, Plan 25m, Build 58m, Verify undefinedm)

## Project kind detection (2026-04-16)
Result: PASS | 16/16 satisfied | 10/10 ACs | 0 deviations
Pipeline: 90m (Think 12m, Plan 12m, Build 57m, Verify 21m)

## Proof List View (2026-04-06)
Result: PASS | 19/19 satisfied | 0/0 ACs | 0 deviations
Pipeline: 36m (Think 8m, Plan 8m, Build 15m, Verify 13m)

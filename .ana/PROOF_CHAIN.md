# Active Issues (20 shown of 25 total)

## artifact.ts

- **code:** `slugDir2` in artifact.ts saveArtifact (line ~708) renamed from `slugDir` to avoid shadowing the... — *findProjectRoot utility for subdirectory support*

## proofSummary.ts

- **code:** File extraction runs on truncated summary: `proofSummary.ts:412-415` — `extractFileRefs` is called... — *Add file field to proof chain callouts*
- **code:** Hard truncation at 100 characters without ellipsis: — proofSummary.ts:361 uses `substring(0, 100)`... — *Proof chain active issues index*
- **code:** File path segments lost in extractFileRefs: — proofSummary.ts:253 regex uses `\b` word boundary... — *Proof chain active issues index*

## readme.ts

- **code:** `truncate` word-boundary behavior for CJK: — readme.ts:65-69. When text has no spaces before `cap`,... — *Add README extraction to scan*

## test.ts

- **code:** `@ana A012` tag misplaced: `proofSummary.test.ts:324` — Tag `@ana A012` ("extractFileRefs tests... — *Add file field to proof chain callouts*
- **test:** A009 backfill verification is indirect: `proofSummary.test.ts:748-763` — The `@ana A009` tag is on... — *Add file field to proof chain callouts*
- **upstream:** Known extractFileRefs limitation propagated to stored data: The existing regex limitation where... — *Add file field to proof chain callouts*
- **test:** A014 monorepo test verifies intent not mechanism: — readme.test.ts:157-171. `detectReadme(tmpDir)`... — *Add README extraction to scan*
- **test:** A004 tests serialization, not e2e scan: — readme.test.ts:69-84. The test verifies the ReadmeResult... — *Add README extraction to scan*
- **test:** A009 cap test doesn't verify WHICH callouts were dropped: — proofSummary.test.ts:550-564 creates 25... — *Proof chain active issues index*
- **test:** A012 heading position test is fragile: — proofSummary.test.ts:606 asserts `output.indexOf('# Active... — *Proof chain active issues index*
- **test:** A009 test at findProjectRoot.test.ts:90-95 is `expect(true).toBe(true)` — a tautology that passes... — *findProjectRoot utility for subdirectory support*
- **test:** A007 test at findProjectRoot.test.ts:72-73 uses `typeof findProjectRoot === 'function'` — this... — *findProjectRoot utility for subdirectory support*

## validators.ts

- **code:** `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A... — *findProjectRoot utility for subdirectory support*

## work.ts

- **code:** ProofChain interface duplicated in three locations: — work.ts:661, proof.ts:29, and now... — *Proof chain active issues index*

## General

- **code:** A009 contract deviation: — Contract specifies `value: 5000` for total cap. Implementation now uses... — *Add README extraction to scan*
- **upstream:** Contract A009 value should be updated: — The contract still says `value: 5000` but the... — *Add README extraction to scan*
- **upstream:** Contract seal was UNVERIFIABLE: — no `seal_commit` was saved for this contract. This means we can't... — *Proof chain active issues index*
- **upstream:** A009 as a contract assertion ("all existing tests continue to pass") is inherently untestable at the... — *findProjectRoot utility for subdirectory support*

---

## Add file field to proof chain callouts (2026-04-24)
Result: PASS | 14/14 satisfied | 8/8 ACs | 0 deviations
Pipeline: 42m (Think 10m, Plan 10m, Build 17m, Verify 15m)
Modules: .claude/agents/ana.md, packages/cli/src/types/proof.ts, packages/cli/src/utils/proofSummary.ts, packages/cli/tests/utils/proofSummary.test.ts
Callouts:
- code: File extraction runs on truncated summary: `proofSummary.ts:412-415` — `extractFileRefs` is called on `summary` after `substring(0, 200).trim()`. If a callout's only file reference appears after chara
- code: `@ana A012` tag misplaced: `proofSummary.test.ts:324` — Tag `@ana A012` ("extractFileRefs tests unchanged") is on the `parseCallouts` describe block, not the `extractFileRefs` describe block at line 6
- test: A009 backfill verification is indirect: `proofSummary.test.ts:748-763` — The `@ana A009` tag is on the "respects 20-callout cap" test, which exercises `file` fields in the cap logic. It doesn't direct
- upstream: Known extractFileRefs limitation propagated to stored data: The existing regex limitation where `findProjectRoot.test.ts` extracts as `test.ts` (dotted filenames lose their prefix) is now permanently

## Add README extraction to scan (2026-04-17)
Result: PASS | 29/29 satisfied | 12/12 ACs | 0 deviations
Pipeline: 0m
Rejection cycles: 1 (A004 UNCOVERED — no `@ana A004` tag in any test file, A009 Sentinel test — total cap never triggered, matcher mismatch)
Callouts:
- code: `truncate` word-boundary behavior for CJK: — readme.ts:65-69. When text has no spaces before `cap`, falls back to hard-cut at `cap` characters. Correct for Latin text; may split mid-character for CJK
- code: A009 contract deviation: — Contract specifies `value: 5000` for total cap. Implementation now uses 4000 to make the cap reachable. The original 5000 was unreachable dead code (3 × 1500 = 4500 < 5000).
- test: A014 monorepo test verifies intent not mechanism: — readme.test.ts:157-171. `detectReadme(tmpDir)` has no monorepo concept — it reads from the path it's given. The test proves scan-engine's decision t
- test: A004 tests serialization, not e2e scan: — readme.test.ts:69-84. The test verifies the ReadmeResult serializes correctly to JSON, not that `ana scan --json` produces the field in CLI output. An e2e tes
- upstream: Contract A009 value should be updated: — The contract still says `value: 5000` but the implementation is 4000. If the contract is re-sealed in the future, update the value.

## Proof chain active issues index (2026-04-17)
Result: PASS | 16/16 satisfied | 10/11 ACs | 0 deviations
Pipeline: 0m
Callouts:
- code: Hard truncation at 100 characters without ellipsis: — proofSummary.ts:361 uses `substring(0, 100)` which can cut mid-word. Adding `+ '…'` when truncated would improve readability. Minor — the active i
- code: File path segments lost in extractFileRefs: — proofSummary.ts:253 regex uses `\b` word boundary which won't match after `/`. Callouts mentioning `src/utils/index.ts` will group under `index.ts`, poten
- code: ProofChain interface duplicated in three locations: — work.ts:661, proof.ts:29, and now proofSummary.ts has `ProofChainEntryForIndex`. The gotcha explicitly warned about this. The builder chose a narr
- test: A009 cap test doesn't verify WHICH callouts were dropped: — proofSummary.test.ts:550-564 creates 25 identical-structure callouts and asserts count is 20, but doesn't verify the 5 dropped are the oldes
- test: A012 heading position test is fragile: — proofSummary.test.ts:606 asserts `output.indexOf('# Active Issues') === 0`. If the function ever adds a leading newline or BOM, this breaks. The contract says

## Add deep-tier hook/composable detection to patterns analyzer (2026-04-16)
Result: PASS | 35/35 satisfied | 12/12 ACs | 0 deviations
Pipeline: 0m

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
Pipeline: 0m
Callouts:
- code: Latent edge case with degenerate package paths: — assets.ts:575 `pkg.path.split('/').filter(Boolean).length` would produce incorrect relative paths for `"."` (depth 1 → `../AGENTS.md`) or `""` (depth
- code: Windows path separators in pkg.path: — assets.ts:575 splits on `/` only. If `pkg.path` somehow contained backslashes (e.g., from a Windows monorepo tool), the depth calculation would be wrong. Again u
- test: No integration test for call-site wiring: — The tests verify `generatePrimaryPackageAgentsMd` directly but don't test that `createClaudeConfiguration` actually calls it. The call sites at assets.ts:19
- test: A006 assertion is weak for its contract: — The contract says the file "points readers to the root AGENTS.md." The test checks `toContain('AGENTS.md')` and `toContain('Full Project Context')` separatel
- upstream: Contract A006 value is overly broad: — The contract assertion `matcher: contains, value: "AGENTS.md"` is too permissive. Every assertion in this test suite mentions AGENTS.md in some form. The value s

## Fix skill template gaps — data-access security, coding-standards error rule (2026-04-16)
Result: PASS | 8/8 satisfied | 0/0 ACs | 0 deviations
Pipeline: 0m

## Project kind detection (2026-04-16)
Result: PASS | 16/16 satisfied | 10/10 ACs | 0 deviations
Pipeline: 90m (Think 12m, Plan 12m, Build 57m, Verify 21m)

## Proof List View (2026-04-06)
Result: PASS | 19/19 satisfied | 0/0 ACs | 0 deviations
Pipeline: 36m (Think 8m, Plan 8m, Build 15m, Verify 13m)

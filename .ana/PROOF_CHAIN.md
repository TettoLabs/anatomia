# Proof Chain Dashboard

21 runs · 54 active · 20 lessons · 0 promoted · 25 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/utils/proofSummary.ts | 7 | 5 |
| packages/cli/tests/utils/proofSummary.test.ts | 6 | 3 |
| packages/cli/src/commands/work.ts | 6 | 4 |
| packages/cli/tests/commands/work.test.ts | 5 | 4 |
| packages/cli/src/engine/scan-engine.ts | 2 | 2 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 54 total)

### packages/cli/src/commands/artifact.ts

- **code:** `captureModulesTouched` silent catch: `src/commands/artifact.ts:161` — The outer try/catch swallows all errors silently. If `readArtifactBranch` fails (missing ana.json), `git merge-base` fails (detached HEAD), or `git diff` fails (corrupt index), `modules_touched` simply isn't written. This is acceptable graceful degradation for a metadata-capture function, but it means a misconfigured environment silently produces incomplete proof chain data. A `console.warn` on failure would make debugging easier without breaking the pipeline. — *Clear the Deck — foundation fixes from proof chain audit*

### packages/cli/src/commands/proof.ts

- **test:** No dedicated test for `formatContextResult` truncation: `src/commands/proof.ts:362-367` — The truncation logic is tagged `@ana A020, A021` in source code, but no test file exercises this code path. Pre-check reports COVERED due to tag collision with other features' A020/A021 tags. The behavior is correct (verified by code review and live `ana proof context` output), but a regression in this function would not be caught by automated tests. A test in `proof.test.ts` that creates a proof chain entry with a >250-char callout summary and asserts the `proof context` output is truncated would close this gap. — *Clear the Deck — foundation fixes from proof chain audit*

### packages/cli/src/commands/verify.ts

- **code:** `execSync` import retained but usage reduced: `verify.ts:17` — `execSync` is still imported and used for the merge-base/diff commands (lines 150-157). The old `git show` call was the fragile one (required exact commit hash). The remaining `execSync` calls use merge-base, which is robust. Not a problem — just noting that the file still has a child-process dependency for the scoped search path. — *Seal hash simplification*

### packages/cli/src/commands/work.ts

- **code:** `delete` instead of explicit `undefined` in reopen loop: `packages/cli/src/commands/work.ts:887-889` — Spec says "Don't use `delete` — set explicitly so the JSON serialization is clean." Builder used `delete`. Functionally identical for `JSON.stringify` output (both omit the property), but deviates from spec guidance. Not a blocker — the behavior is correct. — *Fix Proof Chain Mechanical Accuracy*
- **code:** Dead ternary on finding status: `packages/cli/src/commands/work.ts:811` ��� `category === 'upstream' ? 'active' : 'active'` — both branches identical. Pre-existing issue, not introduced by this build. Still present — see proof chain finding from "Fix artifact save bypass, cwd bug, and work complete crash recovery." — *Fix Proof Chain Mechanical Accuracy*
- **code:** Dead ternary on finding status: `packages/cli/src/commands/work.ts:810` — `(c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches evaluate to `'active'`. This is a pre-existing issue (from proof chain history) and is immediately overwritten by the status assignment loop at lines 818-824. Not introduced by this build; dormant dead code. — *Fix artifact save bypass, cwd bug, and work complete crash recovery*
- **code:** Recovery catch swallows git status failure: `packages/cli/src/commands/work.ts:1080` — if `git status --porcelain .ana/` throws (e.g., corrupt `.git` directory), the catch silently falls through to the "already completed" message. This is unlikely but means a corrupted git state would report "already completed" instead of a diagnostic error. The spec doesn't cover this edge case, so it's not a FAIL — but it's a sharp edge. — *Fix artifact save bypass, cwd bug, and work complete crash recovery*
- **code:** Dead ternary on new finding status: `packages/cli/src/commands/work.ts:810` — `(c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches evaluate to `'active'`, making the expression a no-op. The correct assignment happens at lines 818-824. This is dead logic that should either be removed (let lines 818-824 handle it alone) or corrected to `'lesson' : 'active'` and the redundant loop removed. — *Findings Lifecycle Foundation*
- **code:** Defensive `|| []` on guaranteed field: `packages/cli/src/commands/work.ts:809` — `entry.build_concerns || []` is passed to `resolveCalloutPaths` even though `build_concerns` is set to `proof.build_concerns ?? []` two lines above (line 803). The `|| []` is dead code for the new entry path. For existing entries at line 814, `|| []` remains useful since chain data from JSON could theoretically lack the field despite backfill. Harmless but slightly misleading on line 809. — *Clear the Deck Phase 2*

### packages/cli/src/types/contract.ts

- **code:** `ContractAssertion` and `ContractFileChange` exported but never directly imported: `src/types/contract.ts:14,26` — Both interfaces are exported but no consumer imports them directly. They're accessed structurally through `ContractSchema.assertions` and `ContractSchema.file_changes`. The exports are forward-looking — a future consumer (e.g., a contract linter) would import them. Not a problem today, but if the interfaces drift from what `ContractSchema` uses, the exported types become misleading. — *Clear the Deck — foundation fixes from proof chain audit*

### packages/cli/src/utils/proofSummary.ts

- **code:** Dead truthiness guard after parameter change: `packages/cli/src/utils/proofSummary.ts:346` — `else if (projectRoot)` was meaningful when `projectRoot` was optional; now it's always truthy since the parameter is required `string`. Remove the guard and outdent the glob fallback block. — *Fix Proof Chain Mechanical Accuracy*
- **code:** Redundant status filter in Hot Modules: `packages/cli/src/utils/proofSummary.ts:535-536` — double-checks `finding.status` both as truthy and not-undefined, then re-checks on the next line. A single `if (finding.status !== 'active' && finding.status !== undefined) continue;` would be clearer. — *Findings Lifecycle Foundation*
- **code:** Dashboard duplicates Active Issues logic: `packages/cli/src/utils/proofSummary.ts:566-616` — reimplements the collection, filtering, capping, and file-grouping from `generateActiveIssuesMarkdown` (lines 385-473). The format differs (### vs ## headings, no truncation), but extracting shared helpers for the filtering and grouping would reduce the ~50 lines of duplication. — *Findings Lifecycle Foundation*
- **code:** globSync exception if projectRoot is invalid: `packages/cli/src/utils/proofSummary.ts:345` — If `projectRoot` points to a non-existent directory, `globSync` will throw. The callers in `work.ts` pass `projectRoot` from `writeProofChain`'s parameter, which comes from `findProjectRoot()` — a validated path. But `resolveCalloutPaths` doesn't validate its own input. Consistent with the existing pattern (no defensive validation in utility functions), but worth knowing. — *Clear the Deck Phase 2*
- **code:** Root-level module paths won't match: `proofSummary.ts:336` — `m.endsWith('/' + basename)` requires a `/` prefix. A module at the repository root (e.g., bare `census.ts` in `modules_touched`) wouldn't match. Dormant — `git diff` always produces paths with directory segments. If `modules_touched` ever comes from a source that produces bare filenames, resolution silently skips them. — *Proof context file query*
- **code:** `fileMatches` overmatch on same-basename different-directory paths: `proofSummary.ts:883` — If stored=`packages/a/census.ts` and queried=`packages/b/census.ts`, the function returns true because both paths end with `/census.ts`. The spec's three-tier matching intentionally prioritizes recall over precision, so this is by design. In practice, proof chain callouts rarely have duplicate basenames across different directories. If this becomes noisy, a future cycle could add exact-path-prefix matching as tier 1.5. — *Proof context file query*

### packages/cli/tests/commands/artifact.test.ts

- **test:** A024 weak assertion on coverage count: `tests/commands/artifact.test.ts:1650` — `expect(saves['pre-check'].covered).toBeGreaterThanOrEqual(0)` passes even if coverage is 0. The test sets up one tagged assertion that should be covered, so `toBeGreaterThanOrEqual(1)` or `toBe(1)` would be more specific. Not a false positive today (the setup ensures coverage), but the assertion is weaker than it needs to be. — *Clear the Deck — foundation fixes from proof chain audit*
- **test:** Stale commit assertion passes trivially: `artifact.test.ts:1233,1242` — the "appends to existing .saves.json" test saves `scope.commit` and later asserts it's unchanged. Since `writeSaveMetadata` no longer writes `commit`, both values are `undefined`, so `expect(undefined).toBe(undefined)` passes without testing anything. The test still verifies scope entry survives a spec save via `toBeDefined()` at line 1239, but the commit-specific line is dead weight. Next cycle touching this test should remove lines 1233 and 1242. — *Seal hash simplification*

### packages/cli/tests/commands/work.test.ts

- **test:** A011 assertion checks one value not cleared state: `packages/cli/tests/commands/work.test.ts:1447` — asserts `closed_reason` is not `'superseded by new-C1'` but doesn't assert `closed_at` or `closed_by` are also cleared. The test proves the specific contract assertion (matcher: `not_equals`, value: `'superseded by new-C1'`) but a stronger test would verify all three closure fields are absent. — *Fix Proof Chain Mechanical Accuracy*
- **test:** A020 uses source-code reading instead of behavioral test: `packages/cli/tests/commands/work.test.ts:1736` — reads `work.ts` source and asserts the retry string exists. This proves the string is in the code but not that it appears in the error output when a commit actually fails. A behavioral test would mock `execSync` to throw on `git commit` and capture stderr. Low risk — the error path is straightforward (`catch` → `console.error` → `process.exit(1)`), but a source-reading test survives refactoring that breaks the behavior. — *Fix artifact save bypass, cwd bug, and work complete crash recovery*
- **test:** A015/A016 edge cases not behaviorally exercised: `packages/cli/tests/commands/work.test.ts:1278` — the supersession test proves the core mechanism but doesn't include an unresolved-basename finding (to prove A015's skip) or two same-entry findings with matching file+category (to prove A016's guard). The code guards are trivial and correct by inspection, but the test coverage gap means a regression in those guards wouldn't be caught. — *Findings Lifecycle Foundation*
- **test:** A024 warning test doesn't trigger the warning: `packages/cli/tests/commands/work.test.ts:1372` — the test is tagged `@ana A024` but only asserts the entry has `result === 'PASS'`. The UNKNOWN warning path is unreachable through `completeWork` because of pre-validation. A direct `writeProofChain` test with an UNKNOWN-result proof object would exercise the actual warning. — *Findings Lifecycle Foundation*
- **code:** A008/A009 tag collision with prior feature: `work.test.ts:423` — Tags `@ana A008, A009` exist from a previous feature's contract (configurable branchPrefix). Pre-check tools that grep for `@ana A008` will find both. No functional impact today, but as tag density grows, disambiguation may be needed (e.g., feature-scoped tag namespaces). — *Proof chain health signal*

### packages/cli/tests/engine/detectors/readme.test.ts

- **test:** A018/A019/A020 tag collision with other contracts: The pre-check reports these as COVERED, but the matched tags belong to tests from other features (readme.test.ts, confirmation.test.ts, scanProject.test.ts, proof.test.ts). No NEW tagged tests were written for this contract's template assertions. The existing `agent-proof-context.test.ts:66-75` (`@ana A008`) does verify template-dogfood sync byte-for-byte, and the template content was verified directly. Functional coverage exists; formal tag coverage for this contract does not. — *Fix Proof Chain Mechanical Accuracy*

### packages/cli/tests/templates/agent-proof-context.test.ts

- **test:** A001/A004 use whole-file contains, weaker than section-specific extraction: `packages/cli/tests/templates/agent-proof-context.test.ts:14,43` — These tests would still pass if someone moved `ana proof context` to the wrong section of the file. The contract targets (`ana.md.content`, `ana-verify.md.content`) are whole-file scoped, so the test is technically correct. But A002/A003 demonstrate the stronger pattern (section extraction before assertion). Future contract assertions for section-specific content should use section-specific targets. — *Replace PROOF_CHAIN.md reads with targeted proof context queries*
- **test:** A008 tests all 4 dogfood files in a single `it` block: `agent-proof-context.test.ts:67-75` — If the first file comparison fails, the loop short-circuits and the remaining 3 aren't checked. The error message includes the filename (`${file} dogfood should match template`), which mitigates debugging difficulty. Separate `it` blocks per file would give complete coverage reporting, but the contract only has one assertion (A008) covering all 4, making a single test reasonable. — *Replace PROOF_CHAIN.md reads with targeted proof context queries*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** A007 coverage is indirect for backfill: `proofSummary.test.ts:1129` — The `@ana A007` tag is on a unit test of `resolveCalloutPaths`, not an integration test of the backfill wiring at `work.ts:815-818`. The function IS the mechanism for backfill — proving the function works proves the mechanism works. But the 4-line loop calling it on `chain.entries` is verified only by code reading. Acceptable trade-off for straightforward wiring; a dedicated test would require mock filesystem for `proof_chain.json`. — *Proof context file query*
- **test:** Tag at line 741 is now redundant for this contract: `proofSummary.test.ts:741` — Two `@ana A007` tags exist in the same file, from different contracts. The one at line 741 ("generateActiveIssuesMarkdown uses callout.file") is from a prior feature and is semantically unrelated to backfill. Not harmful, but future readers may be confused about which test covers A007 for which contract. — *Proof context file query*

### General

- **test:** Template assertions rely on tag collision for coverage: Contract assertions A001-A007 target template content. Pre-check reports COVERED because `@ana A001` etc. tags exist in test files from OTHER features. No test in this build actually verifies template frontmatter values or template content. Templates are text-only, so manual verification (which I performed) is the correct approach, but the coverage signal is misleading. — *Clear the Deck Phase 2*
- **test:** No test exercises nonzero callout counts: Both test paths (single entry and existing chain) produce `0 callouts` because neither fixture includes callouts in the verify report or prior chain entry. A test with a fixture that has actual callouts would exercise the accumulation arithmetic beyond `0 + 0`. The `reduce` logic is correct by inspection (`(e.callouts || []).length` summed), but it's untested with nonzero values. — *Proof chain health signal*


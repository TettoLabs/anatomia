# Proof Chain Dashboard

19 runs · 40 active · 16 lessons · 0 promoted · 32 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/tests/utils/proofSummary.test.ts | 4 | 2 |
| packages/cli/src/utils/proofSummary.ts | 3 | 2 |
| packages/cli/tests/commands/work.test.ts | 3 | 2 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 40 total)

### ana.json

- **test:** A005 fallback test triggers via missing ana.json, not missing branch: `verify.test.ts:548-590` — the fallback test causes `readArtifactBranch` to throw by omitting `ana.json` entirely. This is a valid trigger but tests a different failure mode than "artifact branch exists but merge-base fails" (e.g., on a repo with no shared history). Both paths hit the same catch block, so the behavioral coverage is equivalent. A future cycle could add a test where `ana.json` exists but `git merge-base` fails (orphan branches, shallow clones). — *Seal hash simplification*

### packages/cli/src/commands/init/assets.ts

- **code:** Latent edge case with degenerate package paths — assets.ts:575 `pkg.path.split('/').filter(Boolean).length` would produce incorrect relative paths for `"."` (depth 1 → `../AGENTS.md`) or `""` (depth 0 → bare `AGENTS.md`). These values don't occur in practice — monorepo tools always produce subdirectory paths. Not a blocker, but if this function is ever reused for arbitrary paths, it would need a guard. — *Monorepo Primary Package AGENTS.md*

### packages/cli/src/commands/proof.ts

- **code:** No truncation on callout summaries in terminal output: `proof.ts:367` — `formatContextResult` outputs full callout summaries, which can be 200+ characters per line. Live test shows long lines wrapping awkwardly. The spec mockup shows truncated summaries (`...`) but the spec text doesn't list truncation as a requirement. For terminal aesthetics, consider truncating summaries to ~120 chars in a future cycle. — *Proof context file query*

### packages/cli/src/commands/verify.ts

- **code:** `execSync` import retained but usage reduced: `verify.ts:17` — `execSync` is still imported and used for the merge-base/diff commands (lines 150-157). The old `git show` call was the fragile one (required exact commit hash). The remaining `execSync` calls use merge-base, which is robust. Not a problem — just noting that the file still has a child-process dependency for the scoped search path. — *Seal hash simplification*

### packages/cli/src/commands/work.ts

- **code:** Dead ternary on new finding status: `packages/cli/src/commands/work.ts:810` — `(c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches evaluate to `'active'`, making the expression a no-op. The correct assignment happens at lines 818-824. This is dead logic that should either be removed (let lines 818-824 handle it alone) or corrected to `'lesson' : 'active'` and the redundant loop removed. — *Findings Lifecycle Foundation*

### packages/cli/src/engine/analyzers/patterns/confirmation.ts

- **code:** - **Component file heuristic may over-count:** confirmation.ts:797-811 `isComponentFile` excludes test files but includes any .tsx/.jsx/.vue file regardless of purpose. A file like `utils/formatters.tsx` would count as a component file, slightly inflating dominance percentages. Not blocking — dominance is still directionally correct. - **Nuxt detection deviates from spec:** Spec said to use regex on raw file content because ParsedFile.functions captures definitions not calls. Implementation uses import matching instead (confirmation.ts:885-888). This is actually MORE reliable — it won't match comments or strings. The deviation improves the implementation. — *Add deep-tier hook/composable detection to patterns analyzer*

### packages/cli/src/engine/census.ts

- **code:** Config regex can match comments: `census.ts:251` — `schema\s*:\s*["']([^"']+)["']` would match a commented-out `// schema: "old/path"`. In practice, Drizzle config files are small and rarely have commented schema fields, and this is the same pattern used for Prisma extraction. Flagging for awareness, not action. — *Fix Drizzle schema detection*

### packages/cli/src/engine/detectors/readme.ts

- **code:** `truncate` word-boundary behavior for CJK — readme.ts:65-69. When text has no spaces before `cap`, falls back to hard-cut at `cap` characters. Correct for Latin text; may split mid-character for CJK content. Not a blocker — CJK READMEs typically have spaces around headings and code blocks. — *Add README extraction to scan*

### packages/cli/src/engine/scan-engine.ts

- **code:** First-provider-wins with no conflict detection: `scan-engine.ts:313` and `scan-engine.ts:337` — both directory and sibling handlers use `if (!provider)` to take the first datasource block found. If a `.prisma` directory contains conflicting provider declarations (theoretically invalid Prisma, but possible in a broken project), the scanner silently picks whichever file `readdir` returns first. File system ordering is non-deterministic on some platforms. Acceptable because Prisma itself rejects multiple datasource blocks, but the scanner's behavior would be platform-dependent on malformed input. — *Fix Prisma schema detection bugs*

### packages/cli/src/engine/types/patterns.ts

- **test:** - **No @ana tags for 8 assertions:** A001-A003 (schema), A025-A028 (skills display), A029 (empty analysis) have no @ana tags. The functionality exists and is tested — but pre-check can't track coverage. Future cycles should add tags to: patterns.ts schema tests, skills.test.ts display tests. - **Dominance boundary tests use round numbers:** Tests use 40%, 20%, 5% which are safely inside boundaries. No tests at exact boundary (30%, 10%). The boundary behavior is correct per code inspection, but boundary tests would strengthen confidence. — *Add deep-tier hook/composable detection to patterns analyzer*

### packages/cli/src/utils/proofSummary.ts

- **code:** Redundant status filter in Hot Modules: `packages/cli/src/utils/proofSummary.ts:535-536` — double-checks `finding.status` both as truthy and not-undefined, then re-checks on the next line. A single `if (finding.status !== 'active' && finding.status !== undefined) continue;` would be clearer. — *Findings Lifecycle Foundation*
- **code:** Dashboard duplicates Active Issues logic: `packages/cli/src/utils/proofSummary.ts:566-616` — reimplements the collection, filtering, capping, and file-grouping from `generateActiveIssuesMarkdown` (lines 385-473). The format differs (### vs ## headings, no truncation), but extracting shared helpers for the filtering and grouping would reduce the ~50 lines of duplication. — *Findings Lifecycle Foundation*
- **code:** Root-level module paths won't match: `proofSummary.ts:336` — `m.endsWith('/' + basename)` requires a `/` prefix. A module at the repository root (e.g., bare `census.ts` in `modules_touched`) wouldn't match. Dormant — `git diff` always produces paths with directory segments. If `modules_touched` ever comes from a source that produces bare filenames, resolution silently skips them. — *Proof context file query*

### packages/cli/src/utils/validators.ts

- **code:** `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A stale `.ana/` directory containing only `state/` (like `packages/cli/src/.ana/`) causes the function to return the wrong root. `readArtifactBranch` then fails with "No .ana/ana.json found." Checking `fs.existsSync(path.join(current, '.ana', 'ana.json'))` would be more robust. Not a spec violation — the spec explicitly says "looking for a directory containing `.ana/`" — but a production fragility worth addressing in a future cycle. — *findProjectRoot utility for subdirectory support*

### packages/cli/tests/commands/artifact.test.ts

- **test:** Stale commit assertion passes trivially: `artifact.test.ts:1233,1242` — the "appends to existing .saves.json" test saves `scope.commit` and later asserts it's unchanged. Since `writeSaveMetadata` no longer writes `commit`, both values are `undefined`, so `expect(undefined).toBe(undefined)` passes without testing anything. The test still verifies scope entry survives a spec save via `toBeDefined()` at line 1239, but the commit-specific line is dead weight. Next cycle touching this test should remove lines 1233 and 1242. — *Seal hash simplification*

### packages/cli/tests/commands/work.test.ts

- **test:** A015/A016 edge cases not behaviorally exercised: `packages/cli/tests/commands/work.test.ts:1278` — the supersession test proves the core mechanism but doesn't include an unresolved-basename finding (to prove A015's skip) or two same-entry findings with matching file+category (to prove A016's guard). The code guards are trivial and correct by inspection, but the test coverage gap means a regression in those guards wouldn't be caught. — *Findings Lifecycle Foundation*
- **test:** A024 warning test doesn't trigger the warning: `packages/cli/tests/commands/work.test.ts:1372` — the test is tagged `@ana A024` but only asserts the entry has `result === 'PASS'`. The UNKNOWN warning path is unreachable through `completeWork` because of pre-validation. A direct `writeProofChain` test with an UNKNOWN-result proof object would exercise the actual warning. — *Findings Lifecycle Foundation*
- **code:** A008/A009 tag collision with prior feature: `work.test.ts:423` — Tags `@ana A008, A009` exist from a previous feature's contract (configurable branchPrefix). Pre-check tools that grep for `@ana A008` will find both. No functional impact today, but as tag density grows, disambiguation may be needed (e.g., feature-scoped tag namespaces). — *Proof chain health signal*

### packages/cli/tests/engine/detectors/readme.test.ts

- **test:** A014 monorepo test verifies intent not mechanism — readme.test.ts:157-171. `detectReadme(tmpDir)` has no monorepo concept — it reads from the path it's given. The test proves scan-engine's decision to pass rootPath is correct, but the test would pass even without a packages directory. Architecturally sound — just noting the test boundary. — *Add README extraction to scan*

### packages/cli/tests/engine/scanProject.test.ts

- **test:** SQL-only edge case tests indirect path: `scanProject.test.ts:210` — The test creates `prisma/migrations/001_init.sql`. Census's `readdirSync('prisma/')` sees `['migrations']` — a directory name, not a `.sql` file. The test passes because no direct `.prisma` files exist in `prisma/`, not because it explicitly filters `.sql` files. A more direct test would place `.sql` files directly in `prisma/` (e.g., `prisma/seed.sql`). The current test still validates the contract (A010, A011) correctly, but tests the directory-name-filter path, not the extension-filter path. — *Fix Prisma schema detection bugs*
- **test:** A009 uses weak matcher when specific value is known: `scanProject.test.ts:199` — `toBeGreaterThan(0)` when the test fixture has exactly 2 models. The contract specifies `greater: 0`, so the test matches the contract. But `toBe(2)` would catch regressions that `toBeGreaterThan(0)` wouldn't (e.g., if sibling counting broke and only returned 1 model). — *Fix Prisma schema detection bugs*

### packages/cli/tests/templates/agent-proof-context.test.ts

- **test:** A001/A004 use whole-file contains, weaker than section-specific extraction: `packages/cli/tests/templates/agent-proof-context.test.ts:14,43` — These tests would still pass if someone moved `ana proof context` to the wrong section of the file. The contract targets (`ana.md.content`, `ana-verify.md.content`) are whole-file scoped, so the test is technically correct. But A002/A003 demonstrate the stronger pattern (section extraction before assertion). Future contract assertions for section-specific content should use section-specific targets. — *Replace PROOF_CHAIN.md reads with targeted proof context queries*
- **test:** A008 tests all 4 dogfood files in a single `it` block: `agent-proof-context.test.ts:67-75` — If the first file comparison fails, the loop short-circuits and the remaining 3 aren't checked. The error message includes the filename (`${file} dogfood should match template`), which mitigates debugging difficulty. Separate `it` blocks per file would give complete coverage reporting, but the contract only has one assertion (A008) covering all 4, making a single test reasonable. — *Replace PROOF_CHAIN.md reads with targeted proof context queries*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** A007 coverage is indirect for backfill: `proofSummary.test.ts:1129` — The `@ana A007` tag is on a unit test of `resolveCalloutPaths`, not an integration test of the backfill wiring at `work.ts:815-818`. The function IS the mechanism for backfill — proving the function works proves the mechanism works. But the 4-line loop calling it on `chain.entries` is verified only by code reading. Acceptable trade-off for straightforward wiring; a dedicated test would require mock filesystem for `proof_chain.json`. — *Proof context file query*
- **test:** Tag at line 741 is now redundant for this contract: `proofSummary.test.ts:741` — Two `@ana A007` tags exist in the same file, from different contracts. The one at line 741 ("generateActiveIssuesMarkdown uses callout.file") is from a prior feature and is semantically unrelated to backfill. Not harmful, but future readers may be confused about which test covers A007 for which contract. — *Proof context file query*
- **test:** Weak matchers where specific counts are known: `proofSummary.test.ts:1227,1296` — Uses `toBeGreaterThan(0)` for callout count and build concern count when test data has exactly 2 and 1 entries respectively. The contract specifies `greater: 0` so the tests match, but `toBe(2)` / `toBe(1)` would catch regressions that drop items. Pattern matches the existing A009 callout from Fix Prisma (scanProject.test.ts:199). — *Proof context file query*
- **code:** `@ana A012` tag misplaced: `proofSummary.test.ts:324` — Tag `@ana A012` ("extractFileRefs tests unchanged") is on the `parseCallouts` describe block, not the `extractFileRefs` describe block at line 602. Pre-check counts it as COVERED since the tag exists in the file. Verified independently via diff, but the tag's semantic placement is wrong. A future tag-only search would find A012 covering parseCallouts, not extractFileRefs. — *Add file field to proof chain callouts*

### General

- **test:** Template assertions rely on tag collision for coverage: Contract assertions A001-A007 target template content. Pre-check reports COVERED because `@ana A001` etc. tags exist in test files from OTHER features. No test in this build actually verifies template frontmatter values or template content. Templates are text-only, so manual verification (which I performed) is the correct approach, but the coverage signal is misleading. — *Clear the Deck Phase 2*
- **test:** No test exercises nonzero callout counts: Both test paths (single entry and existing chain) produce `0 callouts` because neither fixture includes callouts in the verify report or prior chain entry. A test with a fixture that has actual callouts would exercise the accumulation arithmetic beyond `0 + 0`. The `reduce` logic is correct by inspection (`(e.callouts || []).length` summed), but it's untested with nonzero values. — *Proof chain health signal*
- **code:** A009 contract deviation — Contract specifies `value: 5000` for total cap. Implementation now uses 4000 to make the cap reachable. The original 5000 was unreachable dead code (3 × 1500 = 4500 < 5000). Lowering to 4000 makes `applyTotalCap` a real constraint. The contract's `says` field ("capped at 5000 characters") is now technically inaccurate — the actual cap is 4000. Scope/plan documents reference 5000. This is a justified deviation. — *Add README extraction to scan*


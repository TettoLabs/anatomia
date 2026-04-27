# Active Issues (20 shown of 82 total)

## ana.json

- **test:** A005 fallback test triggers via missing ana.json, not missing branch: `verify.test.ts:548-590` — the fallback test causes `readArtifactBranch` to throw by omitting `ana.json` entirely. This is a valid trigger but tests a different failure mode than... — *Seal hash simplification*

## packages/cli/src/commands/verify.ts

- **code:** `execSync` import retained but usage reduced: `verify.ts:17` — `execSync` is still imported and used for the merge-base/diff commands (lines 150-157). The old `git show` call was the fragile one (required exact commit hash). The remaining `execSync`... — *Seal hash simplification*

## packages/cli/src/commands/work.ts

- **code:** Defensive `|| []` on guaranteed field: `packages/cli/src/commands/work.ts:809` — `entry.build_concerns || []` is passed to `resolveCalloutPaths` even though `build_concerns` is set to `proof.build_concerns ?? []` two lines above (line 803). The `||... — *Clear the Deck Phase 2*
- **code:** Inline return type instead of named interface: `work.ts:744` — `Promise<{ runs: number; callouts: number }>` is an anonymous object type. If other consumers ever need these counts (e.g., a JSON output mode for `work complete`), this shape would need... — *Proof chain health signal*
- **test:** chalk.gray verified only by absence of failure: The spec requires `chalk.gray()` wrapping (constraint). The tests confirm the text content but not the styling — chalk strips ANSI in non-TTY. This is standard for CLI tests and not a gap per se, but... — *Proof chain health signal*

## packages/cli/src/utils/proofSummary.ts

- **code:** globSync has no performance guard: `packages/cli/src/utils/proofSummary.ts:345-349` — `globSync('/' + basename, { cwd: projectRoot, ... })` traverses the entire project tree synchronously for each unresolved basename. Called up to 4 times per... — *Clear the Deck Phase 2*
- **code:** globSync exception if projectRoot is invalid: `packages/cli/src/utils/proofSummary.ts:345` — If `projectRoot` points to a non-existent directory, `globSync` will throw. The callers in `work.ts` pass `projectRoot` from `writeProofChain`'s parameter,... — *Clear the Deck Phase 2*

## packages/cli/templates/.claude/agents/ana-setup.md

- **upstream:** AC6 mentions "test patterns" but template omits them: The spec says "validation schemas and test patterns surfaced in Step 5 draft." The template at `packages/cli/templates/.claude/agents/ana-setup.md:261` says "Include validation patterns and auth... — *Clear the Deck Phase 2*

## packages/cli/tests/commands/artifact.test.ts

- **test:** Stale commit assertion passes trivially: `artifact.test.ts:1233,1242` — the "appends to existing .saves.json" test saves `scope.commit` and later asserts it's unchanged. Since `writeSaveMetadata` no longer writes `commit`, both values are... — *Seal hash simplification*

## packages/cli/tests/commands/init.test.ts

- **code:** Extra test files not in spec file_changes: 7 test files were modified beyond the spec's file_changes list (init.test.ts, verify.test.ts, fixtures.ts, 3 backward-compat tests, cross-platform.test.ts). All are lint-fix-required changes — removing... — *Clear the Deck — foundation fixes from proof chain audit*

## packages/cli/tests/commands/pr.test.ts

- **upstream:** pr.test.ts fixture retains old `commit` fields: `pr.test.ts:278` — the fixture has `commit: 'def456'` on the contract entry. This represents old-format data and is harmless (JSON.parse ignores extra properties), but it means the pr.test.ts fixture... — *Seal hash simplification*

## packages/cli/tests/commands/work.test.ts

- **code:** A008/A009 tag collision with prior feature: `work.test.ts:423` — Tags `@ana A008, A009` exist from a previous feature's contract (configurable branchPrefix). Pre-check tools that grep for `@ana A008` will find both. No functional impact today, but as... — *Proof chain health signal*

## src/commands/artifact.ts

- **code:** `captureModulesTouched` silent catch: `src/commands/artifact.ts:161` — The outer try/catch swallows all errors silently. If `readArtifactBranch` fails (missing ana.json), `git merge-base` fails (detached HEAD), or `git diff` fails (corrupt index),... — *Clear the Deck — foundation fixes from proof chain audit*

## src/commands/proof.ts

- **test:** No dedicated test for `formatContextResult` truncation: `src/commands/proof.ts:362-367` — The truncation logic is tagged `@ana A020, A021` in source code, but no test file exercises this code path. Pre-check reports COVERED due to tag collision with... — *Clear the Deck — foundation fixes from proof chain audit*

## src/types/contract.ts

- **code:** `ContractAssertion` and `ContractFileChange` exported but never directly imported: `src/types/contract.ts:14,26` — Both interfaces are exported but no consumer imports them directly. They're accessed structurally through `ContractSchema.assertions`... — *Clear the Deck — foundation fixes from proof chain audit*

## tests/commands/artifact.test.ts

- **test:** A024 weak assertion on coverage count: `tests/commands/artifact.test.ts:1650` — `expect(saves['pre-check'].covered).toBeGreaterThanOrEqual(0)` passes even if coverage is 0. The test sets up one tagged assertion that should be covered, so... — *Clear the Deck — foundation fixes from proof chain audit*

## General

- **test:** Template assertions rely on tag collision for coverage: Contract assertions A001-A007 target template content. Pre-check reports COVERED because `@ana A001` etc. tags exist in test files from OTHER features. No test in this build actually verifies... — *Clear the Deck Phase 2*
- **upstream:** Pre-check tag collision across features: The `@ana` tag system uses non-unique IDs (A001, A002, ...) scoped per-contract. Pre-check searches ALL test files for matching IDs, meaning coverage from unrelated features can false-positive as COVERED. This... — *Clear the Deck — foundation fixes from proof chain audit*
- **test:** No test exercises nonzero callout counts: Both test paths (single entry and existing chain) produce `0 callouts` because neither fixture includes callouts in the verify report or prior chain entry. A test with a fixture that has actual callouts would... — *Proof chain health signal*
- **upstream:** Contract A008/A009 block names imply unit tests: Contract blocks "returns chain health counts" and "returns cumulative callout counts with existing chain" suggest direct unit assertions on the return value (`result.runs equals 1`). The builder used... — *Proof chain health signal*

---

## Clear the Deck Phase 2 (2026-04-27)
Result: PASS | 21/21 satisfied | 17/18 ACs | 0 deviations
Pipeline: 31m (Think 8m, Plan 8m, Build 16m, Verify 7m)
Modules: .claude/agents/ana-build.md, .claude/agents/ana-plan.md, .claude/agents/ana-setup.md, .claude/agents/ana-verify.md, .claude/agents/ana.md, packages/cli/src/commands/artifact.ts, packages/cli/src/commands/check.ts, packages/cli/src/commands/work.ts, packages/cli/src/types/proof.ts, packages/cli/src/utils/proofSummary.ts (+7 more)
Callouts:
- code: Defensive `|| []` on guaranteed field: `packages/cli/src/commands/work.ts:809` — `entry.build_concerns || []` is passed to `resolveCalloutPaths` even though `build_concerns` is set to `proof.build_concerns ?? []` two lines above (line 803). The `|| []` is dead code for the new entry path. For existing entries at line 814, `|| []` remains useful since chain data from JSON could theoretically lack the field despite backfill. Harmless but slightly misleading on line 809.
- code: globSync has no performance guard: `packages/cli/src/utils/proofSummary.ts:345-349` — `globSync('/' + basename, { cwd: projectRoot, ... })` traverses the entire project tree synchronously for each unresolved basename. Called up to 4 times per `writeProofChain` invocation (2 for new entry, 2 for each existing entry). On large monorepos this could be slow. No timeout, no file count limit, no early termination. Currently harmless — callout counts are small — but worth noting if the proof chain grows to dozens of entries with unresolved basenames.
- code: globSync exception if projectRoot is invalid: `packages/cli/src/utils/proofSummary.ts:345` — If `projectRoot` points to a non-existent directory, `globSync` will throw. The callers in `work.ts` pass `projectRoot` from `writeProofChain`'s parameter, which comes from `findProjectRoot()` — a validated path. But `resolveCalloutPaths` doesn't validate its own input. Consistent with the existing pattern (no defensive validation in utility functions), but worth knowing.
- test: Template assertions rely on tag collision for coverage: Contract assertions A001-A007 target template content. Pre-check reports COVERED because `@ana A001` etc. tags exist in test files from OTHER features. No test in this build actually verifies template frontmatter values or template content. Templates are text-only, so manual verification (which I performed) is the correct approach, but the coverage signal is misleading.
- upstream: AC6 mentions "test patterns" but template omits them: The spec says "validation schemas and test patterns surfaced in Step 5 draft." The template at `packages/cli/templates/.claude/agents/ana-setup.md:261` says "Include validation patterns and auth setup" — no mention of test patterns. The contract assertion (A006) only checks for "validation" so it passes, but the next spec for setup should consider whether test pattern surfacing belongs in the architecture draft.

## Clear the Deck — foundation fixes from proof chain audit (2026-04-27)
Result: PASS | 28/28 satisfied | 16/16 ACs | 0 deviations
Pipeline: 52m (Think 22m, Plan 22m, Build 22m, Verify 8m)
Modules: packages/cli/eslint.config.js, packages/cli/package.json, packages/cli/src/commands/artifact.ts, packages/cli/src/commands/init/anaJsonSchema.ts, packages/cli/src/commands/init/state.ts, packages/cli/src/commands/proof.ts, packages/cli/src/commands/verify.ts, packages/cli/src/commands/work.ts, packages/cli/src/types/contract.ts, packages/cli/src/types/proof.ts (+13 more)
Callouts:
- code: `ContractAssertion` and `ContractFileChange` exported but never directly imported: `src/types/contract.ts:14,26` — Both interfaces are exported but no consumer imports them directly. They're accessed structurally through `ContractSchema.assertions` and `ContractSchema.file_changes`. The exports are forward-looking — a future consumer (e.g., a contract linter) would import them. Not a problem today, but if the interfaces drift from what `ContractSchema` uses, the exported types become misleading.
- code: `captureModulesTouched` silent catch: `src/commands/artifact.ts:161` — The outer try/catch swallows all errors silently. If `readArtifactBranch` fails (missing ana.json), `git merge-base` fails (detached HEAD), or `git diff` fails (corrupt index), `modules_touched` simply isn't written. This is acceptable graceful degradation for a metadata-capture function, but it means a misconfigured environment silently produces incomplete proof chain data. A `console.warn` on failure would make debugging easier without breaking the pipeline.
- code: Extra test files not in spec file_changes: 7 test files were modified beyond the spec's file_changes list (init.test.ts, verify.test.ts, fixtures.ts, 3 backward-compat tests, cross-platform.test.ts). All are lint-fix-required changes — removing unused imports and prefixing unused variables. The builder was forced to make these to satisfy the new `no-unused-vars: error` rule. The spec should have anticipated this cascade (the constraint section mentions "atomic unused import cleanup across 3 test files" but the actual count was 7+). Not a code problem — a spec undercount.
- test: No dedicated test for `formatContextResult` truncation: `src/commands/proof.ts:362-367` — The truncation logic is tagged `@ana A020, A021` in source code, but no test file exercises this code path. Pre-check reports COVERED due to tag collision with other features' A020/A021 tags. The behavior is correct (verified by code review and live `ana proof context` output), but a regression in this function would not be caught by automated tests. A test in `proof.test.ts` that creates a proof chain entry with a >250-char callout summary and asserts the `proof context` output is truncated would close this gap.
- test: A024 weak assertion on coverage count: `tests/commands/artifact.test.ts:1650` — `expect(saves['pre-check'].covered).toBeGreaterThanOrEqual(0)` passes even if coverage is 0. The test sets up one tagged assertion that should be covered, so `toBeGreaterThanOrEqual(1)` or `toBe(1)` would be more specific. Not a false positive today (the setup ensures coverage), but the assertion is weaker than it needs to be.

## Seal hash simplification (2026-04-26)
Result: PASS | 13/13 satisfied | 12/14 ACs | 0 deviations
Pipeline: 29m (Think 7m, Plan 7m, Build 17m, Verify 6m)
Modules: packages/cli/src/commands/artifact.ts, packages/cli/src/commands/verify.ts, packages/cli/src/utils/proofSummary.ts, packages/cli/tests/commands/artifact.test.ts, packages/cli/tests/commands/pr.test.ts, packages/cli/tests/commands/verify.test.ts, packages/cli/tests/commands/work.test.ts, packages/cli/tests/utils/proofSummary.test.ts
Callouts:
- code: `execSync` import retained but usage reduced: `verify.ts:17` — `execSync` is still imported and used for the merge-base/diff commands (lines 150-157). The old `git show` call was the fragile one (required exact commit hash). The remaining `execSync` calls use merge-base, which is robust. Not a problem — just noting that the file still has a child-process dependency for the scoped search path.
- test: Stale commit assertion passes trivially: `artifact.test.ts:1233,1242` — the "appends to existing .saves.json" test saves `scope.commit` and later asserts it's unchanged. Since `writeSaveMetadata` no longer writes `commit`, both values are `undefined`, so `expect(undefined).toBe(undefined)` passes without testing anything. The test still verifies scope entry survives a spec save via `toBeDefined()` at line 1239, but the commit-specific line is dead weight. Next cycle touching this test should remove lines 1233 and 1242.
- test: A005 fallback test triggers via missing ana.json, not missing branch: `verify.test.ts:548-590` — the fallback test causes `readArtifactBranch` to throw by omitting `ana.json` entirely. This is a valid trigger but tests a different failure mode than "artifact branch exists but merge-base fails" (e.g., on a repo with no shared history). Both paths hit the same catch block, so the behavioral coverage is equivalent. A future cycle could add a test where `ana.json` exists but `git merge-base` fails (orphan branches, shallow clones).
- upstream: pr.test.ts fixture retains old `commit` fields: `pr.test.ts:278` — the fixture has `commit: 'def456'` on the contract entry. This represents old-format data and is harmless (JSON.parse ignores extra properties), but it means the pr.test.ts fixture doesn't reflect what current code produces. If a future test asserts on the shape of `.saves.json` entries, this fixture would give a false impression. Low priority.

## Proof chain health signal (2026-04-26)
Result: PASS | 9/9 satisfied | 8/8 ACs | 0 deviations
Pipeline: 426m (Think 410m, Plan 410m, Build 4m, Verify 11m)
Modules: packages/cli/src/commands/work.ts, packages/cli/tests/commands/work.test.ts
Callouts:
- code: Inline return type instead of named interface: `work.ts:744` — `Promise<{ runs: number; callouts: number }>` is an anonymous object type. If other consumers ever need these counts (e.g., a JSON output mode for `work complete`), this shape would need to be extracted into a named interface. Low priority — the function is internal and has one call site.
- code: A008/A009 tag collision with prior feature: `work.test.ts:423` — Tags `@ana A008, A009` exist from a previous feature's contract (configurable branchPrefix). Pre-check tools that grep for `@ana A008` will find both. No functional impact today, but as tag density grows, disambiguation may be needed (e.g., feature-scoped tag namespaces).
- test: No test exercises nonzero callout counts: Both test paths (single entry and existing chain) produce `0 callouts` because neither fixture includes callouts in the verify report or prior chain entry. A test with a fixture that has actual callouts would exercise the accumulation arithmetic beyond `0 + 0`. The `reduce` logic is correct by inspection (`(e.callouts || []).length` summed), but it's untested with nonzero values.
- test: chalk.gray verified only by absence of failure: The spec requires `chalk.gray()` wrapping (constraint). The tests confirm the text content but not the styling — chalk strips ANSI in non-TTY. This is standard for CLI tests and not a gap per se, but the chalk.gray requirement is verified by code reading (`work.ts:1107`), not by test assertion.
- upstream: Contract A008/A009 block names imply unit tests: Contract blocks "returns chain health counts" and "returns cumulative callout counts with existing chain" suggest direct unit assertions on the return value (`result.runs equals 1`). The builder used integration tests instead, which is the right call since `writeProofChain` is internal. But the contract's `target: result.runs` / `matcher: equals` framing doesn't match `toContain` on console output. Future contracts for internal functions could use `target: output` to match the actual test approach.

## Replace PROOF_CHAIN.md reads with targeted proof context queries (2026-04-25)
Result: PASS | 8/8 satisfied | 10/10 ACs | 0 deviations
Pipeline: 39m (Think 16m, Plan 16m, Build 18m, Verify 5m)
Modules: .claude/agents/ana-build.md, .claude/agents/ana-plan.md, .claude/agents/ana-verify.md, .claude/agents/ana.md, packages/cli/templates/.claude/agents/ana-build.md, packages/cli/templates/.claude/agents/ana-plan.md, packages/cli/templates/.claude/agents/ana-verify.md, packages/cli/templates/.claude/agents/ana.md, packages/cli/tests/templates/agent-proof-context.test.ts
Callouts:
- code: Checkpoint wording deviates from spec prescription: `packages/cli/templates/.claude/agents/ana.md:119` — Spec said `"relevant proofs if asked"`, implementation says `"relevant proof chain findings if asked"`. The implementation wording is arguably better (more specific), but it's a spec-implementation delta the deployer should be aware of.
- test: A001/A004 use whole-file contains, weaker than section-specific extraction: `packages/cli/tests/templates/agent-proof-context.test.ts:14,43` — These tests would still pass if someone moved `ana proof context` to the wrong section of the file. The contract targets (`ana.md.content`, `ana-verify.md.content`) are whole-file scoped, so the test is technically correct. But A002/A003 demonstrate the stronger pattern (section extraction before assertion). Future contract assertions for section-specific content should use section-specific targets.
- test: A008 tests all 4 dogfood files in a single `it` block: `agent-proof-context.test.ts:67-75` — If the first file comparison fails, the loop short-circuits and the remaining 3 aren't checked. The error message includes the filename (`${file} dogfood should match template`), which mitigates debugging difficulty. Separate `it` blocks per file would give complete coverage reporting, but the contract only has one assertion (A008) covering all 4, making a single test reasonable.
- upstream: AC7 and AC8 are in tension: AC7 says "no agent definition references `.ana/PROOF_CHAIN.md` as a file to read" while AC8 requires a fallback that references it. The spec's gotcha resolves this ("exactly ONE `.ana/PROOF_CHAIN.md` literal string should remain"), but future scope should word AC7 more precisely: "no agent definition references `.ana/PROOF_CHAIN.md` as a primary file to read in its normal flow."

## Proof context file query (2026-04-25)
Result: PASS | 24/24 satisfied | 0/0 ACs | 0 deviations
Pipeline: 45m (Think 7m, Plan 7m, Build 32m, Verify 6m)
Modules: packages/cli/src/commands/proof.ts, packages/cli/src/commands/work.ts, packages/cli/src/utils/proofSummary.ts, packages/cli/tests/commands/proof.test.ts, packages/cli/tests/utils/proofSummary.test.ts
Rejection cycles: 1 (A007 Pre-check falsely COVERED via prior feature tag at line 741; no A007 tag on resolveCalloutPaths tests)
Callouts:
- code: Root-level module paths won't match: `proofSummary.ts:336` — `m.endsWith('/' + basename)` requires a `/` prefix. A module at the repository root (e.g., bare `census.ts` in `modules_touched`) wouldn't match. Dormant — `git diff` always produces paths with directory segments. If `modules_touched` ever comes from a source that produces bare filenames, resolution silently skips them.
- code: `fileMatches` overmatch on same-basename different-directory paths: `proofSummary.ts:883` — If stored=`packages/a/census.ts` and queried=`packages/b/census.ts`, the function returns true because both paths end with `/census.ts`. The spec's three-tier matching intentionally prioritizes recall over precision, so this is by design. In practice, proof chain callouts rarely have duplicate basenames across different directories. If this becomes noisy, a future cycle could add exact-path-prefix matching as tier 1.5.
- code: No truncation on callout summaries in terminal output: `proof.ts:367` — `formatContextResult` outputs full callout summaries, which can be 200+ characters per line. Live test shows long lines wrapping awkwardly. The spec mockup shows truncated summaries (`...`) but the spec text doesn't list truncation as a requirement. For terminal aesthetics, consider truncating summaries to ~120 chars in a future cycle.
- test: A007 coverage is indirect for backfill: `proofSummary.test.ts:1129` — The `@ana A007` tag is on a unit test of `resolveCalloutPaths`, not an integration test of the backfill wiring at `work.ts:815-818`. The function IS the mechanism for backfill — proving the function works proves the mechanism works. But the 4-line loop calling it on `chain.entries` is verified only by code reading. Acceptable trade-off for straightforward wiring; a dedicated test would require mock filesystem for `proof_chain.json`.
- test: Tag at line 741 is now redundant for this contract: `proofSummary.test.ts:741` — Two `@ana A007` tags exist in the same file, from different contracts. The one at line 741 ("generateActiveIssuesMarkdown uses callout.file") is from a prior feature and is semantically unrelated to backfill. Not harmful, but future readers may be confused about which test covers A007 for which contract.

## Configurable branch prefix (2026-04-24)
Result: UNKNOWN | 0/22 satisfied | 0/0 ACs | 0 deviations
Pipeline: 51m (Think 11m, Plan 11m, Build 34m, Verify 5m)
Modules: packages/cli/src/commands/artifact.ts, packages/cli/src/commands/init/anaJsonSchema.ts, packages/cli/src/commands/init/skills.ts, packages/cli/src/commands/init/state.ts, packages/cli/src/commands/pr.ts, packages/cli/src/commands/work.ts, packages/cli/src/utils/git-operations.ts, packages/cli/templates/.claude/agents/ana-build.md, packages/cli/templates/.claude/agents/ana-plan.md, packages/cli/templates/.claude/agents/ana-verify.md (+4 more)

## Fix Drizzle schema detection (2026-04-24)
Result: PASS | 20/20 satisfied | 10/10 ACs | 0 deviations
Pipeline: 73m (Think 5m, Plan 5m, Build 7m, Verify 61m)
Modules: packages/cli/src/commands/scan.ts, packages/cli/src/engine/census.ts, packages/cli/src/engine/scan-engine.ts, packages/cli/src/utils/scaffold-generators.ts, packages/cli/tests/engine/scanProject.test.ts
Callouts:
- code: `drizzle-dialect` overloads SchemaFileEntry semantics: `census.ts:267-274` — The `orm: 'drizzle-dialect'` entry stores the dialect string in the `path` field, which is semantically a file path. This works because the type is `string` and scan-engine filters by orm name, but a future developer reading `SchemaFileEntry.path` won't expect it to contain `'postgresql'`. Consider a dedicated field or a separate return channel in a future cycle.
- code: Consumer sort logic duplicated in two files: `scan.ts:112-121` and `scaffold-generators.ts:62-71` — Identical 10-line sort comparator handling null modelCount values. The spec suggested extraction "if the logic is more than a few lines." A shared `selectBestSchema(schemas)` helper would prevent divergence if the selection logic evolves.
- code: Config regex can match comments: `census.ts:251` — `schema\s*:\s*["']([^"']+)["']` would match a commented-out `// schema: "old/path"`. In practice, Drizzle config files are small and rarely have commented schema fields, and this is the same pattern used for Prisma extraction. Flagging for awareness, not action.
- test: A017 doesn't exercise null-modelCount comparison: `scanProject.test.ts:549-566` — Contract says "when all schemas have unknown model counts, the first found is used." Test uses Supabase which gets `modelCount: 1` from SQL, not null. The null-comparison branch (`aCount == null && bCount == null`) in both consumers is exercised only when multiple ORMs all have null counts — this test has one ORM with a real count. The builder's comment at line 550-552 acknowledges the limitation.
- test: A016 verifies precondition, not consumer output: `scanProject.test.ts:523-545` — The test proves Drizzle has more models than Prisma, but doesn't verify that `enrichDatabase()` or `generateProjectContextMd()` actually selects Drizzle. The consumer logic is correct by code inspection (sort descending, take first), but the test path stops at model counts rather than consumer output.

## Fix Prisma schema detection bugs (2026-04-24)
Result: PASS | 13/13 satisfied | 7/7 ACs | 0 deviations
Pipeline: 28m (Think 9m, Plan 9m, Build 14m, Verify 5m)
Modules: packages/cli/src/engine/census.ts, packages/cli/src/engine/scan-engine.ts, packages/cli/tests/engine/scanProject.test.ts
Callouts:
- code: First-provider-wins with no conflict detection: `scan-engine.ts:313` and `scan-engine.ts:337` — both directory and sibling handlers use `if (!provider)` to take the first datasource block found. If a `.prisma` directory contains conflicting provider declarations (theoretically invalid Prisma, but possible in a broken project), the scanner silently picks whichever file `readdir` returns first. File system ordering is non-deterministic on some platforms. Acceptable because Prisma itself rejects multiple datasource blocks, but the scanner's behavior would be platform-dependent on malformed input.
- code: Census directory check is non-recursive: `census.ts:219` — `readdirSync(prismaDir)` only checks top-level entries. The second fallback glob `/prisma/*.prisma` in `scan-engine.ts:289` is also one level deep. A `prisma/subdir/models.prisma` layout would be missed by both paths. No known Prisma project uses nested subdirectories within the Prisma folder, but this is a documented gap.
- test: SQL-only edge case tests indirect path: `scanProject.test.ts:210` — The test creates `prisma/migrations/001_init.sql`. Census's `readdirSync('prisma/')` sees `['migrations']` — a directory name, not a `.sql` file. The test passes because no direct `.prisma` files exist in `prisma/`, not because it explicitly filters `.sql` files. A more direct test would place `.sql` files directly in `prisma/` (e.g., `prisma/seed.sql`). The current test still validates the contract (A010, A011) correctly, but tests the directory-name-filter path, not the extension-filter path.
- test: A009 uses weak matcher when specific value is known: `scanProject.test.ts:199` — `toBeGreaterThan(0)` when the test fixture has exactly 2 models. The contract specifies `greater: 0`, so the test matches the contract. But `toBe(2)` would catch regressions that `toBeGreaterThan(0)` wouldn't (e.g., if sibling counting broke and only returned 1 model).
- upstream: A002 uses `contains` matcher, allows ambiguous match: Contract A002 says `target: schemas.prisma.path, matcher: contains, value: "schema.prisma"`. Both candidates (`prisma/schema.prisma` and `schema.prisma`) contain `"schema.prisma"`. The test passes regardless of which candidate wins — it can't distinguish them. The modelCount assertion (A001) indirectly proves the right candidate won, but A002 alone doesn't verify path correctness. A more precise value like `"prisma/schema.prisma"` would be unambiguous.

## Add file field to proof chain callouts (2026-04-24)
Result: PASS | 14/14 satisfied | 8/8 ACs | 0 deviations
Pipeline: 42m (Think 10m, Plan 10m, Build 17m, Verify 15m)
Modules: .claude/agents/ana.md, packages/cli/src/types/proof.ts, packages/cli/src/utils/proofSummary.ts, packages/cli/tests/utils/proofSummary.test.ts
Callouts:
- code: File extraction runs on truncated summary: `proofSummary.ts:412-415` — `extractFileRefs` is called on `summary` after `substring(0, 200).trim()`. If a callout's only file reference appears after character 200, `file` will be null. Practically unlikely (AnaVerify format puts file refs in the first ~80 chars), but the stored `file` is permanently null for those cases — unlike the old re-derivation approach where fixing the regex would fix all callouts. Design trade-off the spec intended, but worth knowing.
- code: `@ana A012` tag misplaced: `proofSummary.test.ts:324` — Tag `@ana A012` ("extractFileRefs tests unchanged") is on the `parseCallouts` describe block, not the `extractFileRefs` describe block at line 602. Pre-check counts it as COVERED since the tag exists in the file. Verified independently via diff, but the tag's semantic placement is wrong. A future tag-only search would find A012 covering parseCallouts, not extractFileRefs.
- test: A009 backfill verification is indirect: `proofSummary.test.ts:748-763` — The `@ana A009` tag is on the "respects 20-callout cap" test, which exercises `file` fields in the cap logic. It doesn't directly verify that proof_chain.json was backfilled. The backfill was verified manually by reading the diff. A direct test (e.g., reading proof_chain.json and asserting every callout has `file`) would be more robust, but the migration is a one-time operation and the backfill is already committed.
- upstream: Known extractFileRefs limitation propagated to stored data: The existing regex limitation where `findProjectRoot.test.ts` extracts as `test.ts` (dotted filenames lose their prefix) is now permanently stored in proof_chain.json `file` fields. Previously, a regex fix in `extractFileRefs` would retroactively fix all groupings. Now the incorrect `file: "test.ts"` values are baked into the data. If `extractFileRefs` is ever fixed, a second backfill of proof_chain.json would be needed. This was already flagged in the proof chain active issues index cycle.

## Add README extraction to scan (2026-04-17)
Result: PASS | 29/29 satisfied | 12/12 ACs | 0 deviations
Pipeline: 0m
Rejection cycles: 1 (A004 UNCOVERED — no `@ana A004` tag in any test file, A009 Sentinel test — total cap never triggered, matcher mismatch)
Callouts:
- code: `truncate` word-boundary behavior for CJK — readme.ts:65-69. When text has no spaces before `cap`, falls back to hard-cut at `cap` characters. Correct for Latin text; may split mid-character for CJK content. Not a blocker — CJK READMEs typically have spaces around headings and code blocks.
- code: A009 contract deviation — Contract specifies `value: 5000` for total cap. Implementation now uses 4000 to make the cap reachable. The original 5000 was unreachable dead code (3 × 1500 = 4500 < 5000). Lowering to 4000 makes `applyTotalCap` a real constraint. The contract's `says` field ("capped at 5000 characters") is now technically inaccurate — the actual cap is 4000. Scope/plan documents reference 5000. This is a justified deviation.
- test: A014 monorepo test verifies intent not mechanism — readme.test.ts:157-171. `detectReadme(tmpDir)` has no monorepo concept — it reads from the path it's given. The test proves scan-engine's decision to pass rootPath is correct, but the test would pass even without a packages directory. Architecturally sound — just noting the test boundary.
- test: A004 tests serialization, not e2e scan — readme.test.ts:69-84. The test verifies the ReadmeResult serializes correctly to JSON, not that `ana scan --json` produces the field in CLI output. An e2e test would be stronger but requires a built binary with a fixture project. The unit test is sufficient given the field is wired in scan-engine.ts and the contract test validates field presence.
- upstream: Contract A009 value should be updated — The contract still says `value: 5000` but the implementation is 4000. If the contract is re-sealed in the future, update the value.

## Proof chain active issues index (2026-04-17)
Result: PASS | 16/16 satisfied | 10/11 ACs | 0 deviations
Pipeline: 0m
Callouts:
- code: Hard truncation at 100 characters without ellipsis — proofSummary.ts:361 uses `substring(0, 100)` which can cut mid-word. Adding `+ '…'` when truncated would improve readability. Minor — the active issues index is a developer tool, not user-facing output.
- code: File path segments lost in extractFileRefs — proofSummary.ts:253 regex uses `\b` word boundary which won't match after `/`. Callouts mentioning `src/utils/index.ts` will group under `index.ts`, potentially merging unrelated files from different directories. In practice, callout text from verify reports typically uses bare filenames (e.g., "Dead logic in projectKind.ts:105"), so this is dormant but worth knowing if callout format evolves.
- code: ProofChain interface duplicated in three locations — work.ts:661, proof.ts:29, and now proofSummary.ts has `ProofChainEntryForIndex`. The gotcha explicitly warned about this. The builder chose a narrow projection interface rather than importing the full type — defensible, but the duplication count is growing. Consider consolidating in a future cycle.
- test: A009 cap test doesn't verify WHICH callouts were dropped — proofSummary.test.ts:550-564 creates 25 identical-structure callouts and asserts count is 20, but doesn't verify the 5 dropped are the oldest. The separate "takes most recent callouts when capping at 20" test (line 691) does verify this. Together they provide full coverage, but A009 alone would pass even if the implementation kept the oldest instead of the newest.
- test: A012 heading position test is fragile — proofSummary.test.ts:606 asserts `output.indexOf('# Active Issues') === 0`. If the function ever adds a leading newline or BOM, this breaks. The contract says "contains", but the test asserts position. Stricter than required — not wrong, but fragile.

## Add deep-tier hook/composable detection to patterns analyzer (2026-04-16)
Result: PASS | 35/35 satisfied | 12/12 ACs | 0 deviations
Pipeline: 0m
Callouts:
- code: - **Component file heuristic may over-count:** confirmation.ts:797-811 `isComponentFile` excludes test files but includes any .tsx/.jsx/.vue file regardless of purpose. A file like `utils/formatters.tsx` would count as a component file, slightly inflating dominance percentages. Not blocking — dominance is still directionally correct. - **Nuxt detection deviates from spec:** Spec said to use regex on raw file content because ParsedFile.functions captures definitions not calls. Implementation uses import matching instead (confirmation.ts:885-888). This is actually MORE reliable — it won't match comments or strings. The deviation improves the implementation.
- test: - **No @ana tags for 8 assertions:** A001-A003 (schema), A025-A028 (skills display), A029 (empty analysis) have no @ana tags. The functionality exists and is tested — but pre-check can't track coverage. Future cycles should add tags to: patterns.ts schema tests, skills.test.ts display tests. - **Dominance boundary tests use round numbers:** Tests use 40%, 20%, 5% which are safely inside boundaries. No tests at exact boundary (30%, 10%). The boundary behavior is correct per code inspection, but boundary tests would strengthen confidence.
- upstream: - **Spec suggested regex but import matching is better:** The spec's concern about ParsedFile.functions was valid, but the suggested solution (regex) was suboptimal. Import matching is cleaner. This is a positive deviation but worth noting for future specs.

## findProjectRoot utility for subdirectory support (2026-04-16)
Result: PASS | 9/9 satisfied | 9/9 ACs | 0 deviations
Pipeline: 316m (Think 15m, Plan 15m, Build 293m, Verify 9m)
Rejection cycles: 1 (A009 Sentinel test `expect(true).toBe(true)` + 4 proof.test.ts regressions)
Callouts:
- code: `findProjectRoot` checks for `.ana/` directory existence (validators.ts:105), not `.ana/ana.json`. A stale `.ana/` directory containing only `state/` (like `packages/cli/src/.ana/`) causes the function to return the wrong root. `readArtifactBranch` then fails with "No .ana/ana.json found." Checking `fs.existsSync(path.join(current, '.ana', 'ana.json'))` would be more robust. Not a spec violation — the spec explicitly says "looking for a directory containing `.ana/`" — but a production fragility worth addressing in a future cycle.
- code: `slugDir2` in artifact.ts saveArtifact (line ~708) renamed from `slugDir` to avoid shadowing the pre-check block's `slugDir` (line ~547). Symptom of a long function — cosmetic, not functional. Carried from previous cycles.
- test: A009 test at findProjectRoot.test.ts:90-95 is `expect(true).toBe(true)` — a tautology that passes regardless of suite health. The builder's comment claims "if wiring broke existing tests, this file wouldn't reach execution," but Vitest executes test files independently. This test proves nothing. The suite-level result (1156 passed, 2 pre-existing failures) is the real evidence for A009, not this tagged test. Future contracts should express regression requirements as suite-run checks, not per-test tautologies.
- test: A007 test at findProjectRoot.test.ts:72-73 uses `typeof findProjectRoot === 'function'` — this passes for any function. The import statement at line 5 would throw `ERR_MODULE_NOT_FOUND` if the export didn't exist, which is the real verification. The typeof check adds no signal beyond the import.
- upstream: A009 as a contract assertion ("all existing tests continue to pass") is inherently untestable at the unit level. It's a suite-level property. Tagging a single test with `@ana A009` creates pressure to write a sentinel. Future contracts should either omit suite-level regression assertions or express them as "test command exits 0" verified during the build step, not as tagged tests.

## Monorepo Primary Package AGENTS.md (2026-04-16)
Result: PASS | 13/13 satisfied | 6/6 ACs | 0 deviations
Pipeline: 0m
Callouts:
- code: Latent edge case with degenerate package paths — assets.ts:575 `pkg.path.split('/').filter(Boolean).length` would produce incorrect relative paths for `"."` (depth 1 → `../AGENTS.md`) or `""` (depth 0 → bare `AGENTS.md`). These values don't occur in practice — monorepo tools always produce subdirectory paths. Not a blocker, but if this function is ever reused for arbitrary paths, it would need a guard.
- code: Windows path separators in pkg.path — assets.ts:575 splits on `/` only. If `pkg.path` somehow contained backslashes (e.g., from a Windows monorepo tool), the depth calculation would be wrong. Again unlikely in practice since the engine normalizes paths, but worth noting for cross-platform awareness.
- test: No integration test for call-site wiring — The tests verify `generatePrimaryPackageAgentsMd` directly but don't test that `createClaudeConfiguration` actually calls it. The call sites at assets.ts:193 and 242 are verified by code reading only, not by a test that runs the full init flow. This is consistent with the project's existing pattern (the root `generateAgentsMd` also lacks an integration test for its call sites), so not a deviation — but the wiring is untested.
- test: A006 assertion is weak for its contract — The contract says the file "points readers to the root AGENTS.md." The test checks `toContain('AGENTS.md')` and `toContain('Full Project Context')` separately, but doesn't verify they appear together as a markdown link. The implementation does produce a proper link, but the test would pass even if the function just mentioned "AGENTS.md" in a comment. Minor — the A007/A008 tests for relative paths provide stronger evidence.
- upstream: Contract A006 value is overly broad — The contract assertion `matcher: contains, value: "AGENTS.md"` is too permissive. Every assertion in this test suite mentions AGENTS.md in some form. The value should have been `[AGENTS.md](` or similar to verify the markdown link specifically, not just the filename.

## Fix skill template gaps — data-access security, coding-standards error rule (2026-04-16)
Result: PASS | 8/8 satisfied | 0/0 ACs | 0 deviations
Pipeline: 0m
Callouts:
- code: The error-handling rule is now longer than the others (spans multiple sentences where most rules are one sentence + why). This is appropriate given the nuance being expressed, but worth noting as a slight voice deviation — the rule is more complex because the guidance is more complex.
- test: No test coverage for template content. These are static files copied verbatim during init, so testing would require either snapshot tests or parsing the markdown. Current approach (visual inspection against spec) is reasonable for static templates. If templates grow more complex, consider adding a test that at least validates markdown structure.
- upstream: Contract assertions A007 and A008 were sealed with incorrect values. The planner counted 6 rules in coding-standards but main has 7. A007 says 6 rules, should say 7. A008 says 5 unchanged rules, should say 6 (7 - 1 modified = 6). The BUILD is correct — the contract is not.

## Project kind detection (2026-04-16)
Result: PASS | 16/16 satisfied | 10/10 ACs | 0 deviations
Pipeline: 90m (Think 12m, Plan 12m, Build 57m, Verify 21m)
Callouts:
- code: Dead logic in full-stack browser-dep check: `projectKind.ts:105` — `BROWSER_FRAMEWORKS.has(d)` will never match because dep names are npm packages (lowercase: `'react'`, `'vue'`) while the set contains PascalCase display names (`'React'`, `'Vue'`). The adjacent inline array on lines 106-107 handles the actual matching with lowercase package names. Harmless now, but if someone removes the fallback array trusting the Set, full-stack detection silently breaks. Consider removing `BROWSER_FRAMEWORKS.has(d) ||` from the expression, or normalizing to one casing.
- code: Framework display-name coupling creates latent misclassification: `projectKind.ts:43-64` sets contain PascalCase display names, but the input comes from `getFrameworkDisplayName()` which falls back to raw lowercase keys for unmapped frameworks. Two currently-detectable frameworks would misclassify: Koa (`'koa'` ≠ `'Koa'` → would be library/unknown instead of api-server) and React Router (`'React Router'` not in BROWSER_FRAMEWORKS → would be unknown instead of web-app). Fix: either lowercase-normalize the sets and input, or add missing entries to `FRAMEWORK_DISPLAY_NAMES` in displayNames.ts.
- code: Unused export `ProjectKindResult`: Exported from projectKind.ts:22-24 but never imported outside the file. `detectProjectKind` returns it, but scan-engine.ts accesses `.kind` directly without typing the intermediate. Minor — not harmful, but if the intent was a typed contract for consumers, nobody is consuming the type.
- code: `hasMain` covers `main` AND `module`: scan-engine.ts:555 sets `hasMain = !!pkgRaw['main'] || !!pkgRaw['module']`. The variable name suggests only `main`. Consider `hasMainOrModule` for clarity, or split into separate booleans matching the spec's language ("main, module, or exports").
- test: A003 purity test is comment-fragile: projectKind.test.ts:187-193 reads the source file and asserts `not.toContain('node:fs')`. A future comment mentioning `node:fs` would cause a false failure. A regex-based import check (`/import.*from\s+['"]node:fs/`) would be more precise. Not broken, not urgent.

## Proof List View (2026-04-06)
Result: PASS | 19/19 satisfied | 0/0 ACs | 0 deviations
Pipeline: 36m (Think 8m, Plan 8m, Build 15m, Verify 13m)

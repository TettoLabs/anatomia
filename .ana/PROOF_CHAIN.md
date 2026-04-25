# Active Issues (20 shown of 58 total)

## packages/cli/src/commands/proof.ts

- **code:** No truncation on callout summaries in terminal output: `proof.ts:367` — `formatContextResult` outputs full callout summaries, which can be 200+ characters per line. Live test shows long lines wrapping awkwardly. The spec mockup shows truncated... — *Proof context file query*

## packages/cli/src/commands/scan.ts

- **code:** Consumer sort logic duplicated in two files: `scan.ts:112-121` and `scaffold-generators.ts:62-71` — Identical 10-line sort comparator handling null modelCount values. The spec suggested extraction "if the logic is more than a few lines." A shared... — *Fix Drizzle schema detection*

## packages/cli/src/engine/census.ts

- **code:** `drizzle-dialect` overloads SchemaFileEntry semantics: `census.ts:267-274` — The `orm: 'drizzle-dialect'` entry stores the dialect string in the `path` field, which is semantically a file path. This works because the type is `string` and scan-engine... — *Fix Drizzle schema detection*
- **code:** Config regex can match comments: `census.ts:251` — `schema\s*:\s*["']([^"']+)["']` would match a commented-out `// schema: "old/path"`. In practice, Drizzle config files are small and rarely have commented schema fields, and this is the same pattern... — *Fix Drizzle schema detection*
- **code:** Census directory check is non-recursive: `census.ts:219` — `readdirSync(prismaDir)` only checks top-level entries. The second fallback glob `/prisma/*.prisma` in `scan-engine.ts:289` is also one level deep. A `prisma/subdir/models.prisma` layout... — *Fix Prisma schema detection bugs*

## packages/cli/src/engine/scan-engine.ts

- **code:** First-provider-wins with no conflict detection: `scan-engine.ts:313` and `scan-engine.ts:337` — both directory and sibling handlers use `if (!provider)` to take the first datasource block found. If a `.prisma` directory contains conflicting provider... — *Fix Prisma schema detection bugs*

## packages/cli/src/utils/proofSummary.ts

- **code:** Root-level module paths won't match: `proofSummary.ts:336` — `m.endsWith('/' + basename)` requires a `/` prefix. A module at the repository root (e.g., bare `census.ts` in `modules_touched`) wouldn't match. Dormant — `git diff` always produces paths... — *Proof context file query*
- **code:** `fileMatches` overmatch on same-basename different-directory paths: `proofSummary.ts:883` — If stored=`packages/a/census.ts` and queried=`packages/b/census.ts`, the function returns true because both paths end with `/census.ts`. The spec's three-tier... — *Proof context file query*

## packages/cli/tests/commands/proof.test.ts

- **test:** Integration test for A014 checks substring not specific file name: `proof.test.ts:368` — Asserts `stdout.toContain('No proof context')` but doesn't verify the queried filename appears in the message. The contract says "names the queried file." Live... — *Proof context file query*
- **upstream:** Contract `@ana` tags shared across two phases in same file: `proof.test.ts:425-658` — The existing proof list/detail tests have `@ana A001`–`@ana A023` tags from the original proof-list-view feature's contract. Pre-check reports COVERED for all 24... — *Proof context file query*

## packages/cli/tests/engine/scanProject.test.ts

- **test:** A017 doesn't exercise null-modelCount comparison: `scanProject.test.ts:549-566` — Contract says "when all schemas have unknown model counts, the first found is used." Test uses Supabase which gets `modelCount: 1` from SQL, not null. The... — *Fix Drizzle schema detection*
- **test:** A016 verifies precondition, not consumer output: `scanProject.test.ts:523-545` — The test proves Drizzle has more models than Prisma, but doesn't verify that `enrichDatabase()` or `generateProjectContextMd()` actually selects Drizzle. The consumer... — *Fix Drizzle schema detection*
- **upstream:** A004/A013 test fixture imports sqliteTable but claims "no table helpers": `scanProject.test.ts:331-332` — The schema file has `import { sqliteTable } from 'drizzle-orm/sqlite-core'` but the comment says "Intentionally no pgTable/mysqlTable — dialect... — *Fix Drizzle schema detection*
- **test:** SQL-only edge case tests indirect path: `scanProject.test.ts:210` — The test creates `prisma/migrations/001_init.sql`. Census's `readdirSync('prisma/')` sees `['migrations']` — a directory name, not a `.sql` file. The test passes because no direct... — *Fix Prisma schema detection bugs*
- **test:** A009 uses weak matcher when specific value is known: `scanProject.test.ts:199` — `toBeGreaterThan(0)` when the test fixture has exactly 2 models. The contract specifies `greater: 0`, so the test matches the contract. But `toBe(2)` would catch... — *Fix Prisma schema detection bugs*

## packages/cli/tests/utils/proofSummary.test.ts

- **test:** A007 coverage is indirect for backfill: `proofSummary.test.ts:1129` — The `@ana A007` tag is on a unit test of `resolveCalloutPaths`, not an integration test of the backfill wiring at `work.ts:815-818`. The function IS the mechanism for backfill —... — *Proof context file query*
- **upstream:** Pre-check tag collision across contracts: `proofSummary.test.ts:741` — The `@ana A007` tag from "file field to proof chain callouts" still exists alongside the new tag at line 1129. Pre-check counts both as coverage but can't distinguish contracts.... — *Proof context file query*
- **test:** Tag at line 741 is now redundant for this contract: `proofSummary.test.ts:741` — Two `@ana A007` tags exist in the same file, from different contracts. The one at line 741 ("generateActiveIssuesMarkdown uses callout.file") is from a prior feature and... — *Proof context file query*
- **test:** Weak matchers where specific counts are known: `proofSummary.test.ts:1227,1296` — Uses `toBeGreaterThan(0)` for callout count and build concern count when test data has exactly 2 and 1 entries respectively. The contract specifies `greater: 0` so the... — *Proof context file query*

## General

- **upstream:** A002 uses `contains` matcher, allows ambiguous match: Contract A002 says `target: schemas.prisma.path, matcher: contains, value: "schema.prisma"`. Both candidates (`prisma/schema.prisma` and `schema.prisma`) contain `"schema.prisma"`. The test passes... — *Fix Prisma schema detection bugs*

---

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

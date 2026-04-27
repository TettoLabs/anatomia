# Scope: Clear the Deck Phase 2

**Created by:** Ana
**Date:** 2026-04-26

## Intent

Continuation of Clear the Deck. Phase 1 fixed 7 items identified by the proof chain — types, ESLint, dead tests, save-all parity, custom namespace. Phase 2 cleans the next layer: agent templates running at 20% context capacity, a callout file resolution gap that affects customer repos, missing test coverage for proof chain accumulation, and small corrections across the pipeline.

The headline: every agent session gets 5x more context window. The rest cleans up remaining Phase 1a/1b items and normalizes the proof chain data model.

## Complexity Assessment

- **Size:** medium (8 items in 3 commits)
- **Files affected:**
  - `templates/.claude/agents/ana.md` (frontmatter)
  - `templates/.claude/agents/ana-build.md` (frontmatter + step 0 wording)
  - `templates/.claude/agents/ana-plan.md` (frontmatter)
  - `templates/.claude/agents/ana-verify.md` (frontmatter + confirmation step + callout path instruction)
  - `templates/.claude/agents/ana-setup.md` (frontmatter + 031/032/033 gaps)
  - `src/commands/artifact.ts` (slugDir2 rename)
  - `src/commands/check.ts` (null scanJson fix)
  - `src/types/proof.ts` (build_concerns non-optional)
  - `src/utils/proofSummary.ts` (build_concerns type + glob fallback in resolveCalloutPaths)
  - `src/commands/work.ts` (build_concerns always-write + resolveCalloutPaths projectRoot arg)
  - `.ana/proof_chain.json` (backfill build_concerns on 7 entries)
  - `tests/utils/proofSummary.test.ts` (new glob fallback tests)
  - `tests/commands/work.test.ts` (nonzero callout fixture)
- **Blast radius:** The `opus[1m]` change affects every agent session on every new project. The glob fallback adds filesystem access at `work complete` time (~10-50ms per unresolved basename). The build_concerns backfill modifies proof_chain.json data. Everything else is template text or small code corrections.
- **Estimated effort:** 3 commits, ~120 lines changed net
- **Multi-phase:** no

## Approach

Eight items in three commits, organized by what they change:

**Commit 1 — Templates.** All 5 agent templates get `opus[1m]` for 1M context. Verify gets a confirmation step before starting work and a callout path instruction. Build gets a wording clarification on its "do not ask permission" line (which refers to running `ana work status`, not starting work — but agents read it broadly). Setup gets three investigation gaps filled (SETUP-031/032/033). Zero code, zero tests.

**Commit 2 — Code corrections.** `slugDir2` renamed to `slugDir` in artifact.ts (the shadowing conflict that motivated the name was removed by scope 1's extraction). `validateSetupCompletion` gets scan.json wired in instead of null. `build_concerns` becomes non-optional on `ProofChainEntry` and `ProofSummary` — the type, the write path, and proof_chain.json are all normalized. Seven old entries get `"build_concerns": []` backfilled. Small corrections, existing tests pass.

**Commit 3 — Glob fallback + callout test.** `resolveCalloutPaths` gains a `projectRoot` parameter and a `globSync` fallback for basenames that `modules_touched` can't resolve. This handles callouts about unmodified files and old entries being backfilled — the two gaps the current resolution can't cover. New tests for the glob behavior. Separately, a nonzero callout fixture exercises the proof chain accumulation arithmetic for the first time.

## Acceptance Criteria

- AC1: All 5 agent template frontmatter blocks specify `model: opus[1m]`.
- AC2: Verify template has a confirmation step between Find Work and Check Out: agent names the work item and waits for the developer to confirm before proceeding.
- AC3: Build template step 0 does not contain "Do not ask permission." The instruction to run `ana work status` immediately remains, without language that could be interpreted as skipping confirmation.
- AC4: Verify template callout format section instructs the agent to use project-relative paths in file references, with updated example showing `src/path/file.ts:line` not `file.ts:line`.
- AC5: Setup template Step 3 instructs the agent to read validation library files (Zod/Joi/Yup schemas) when detected in the stack.
- AC6: Setup template Step 4 investigation findings for test patterns and schema files are surfaced in the Step 5 presentation draft.
- AC7: Setup template instructs the agent to read auth config when `stack.auth` is non-null.
- AC8: `artifact.ts` uses `slugDir` (not `slugDir2`) at the post-validation metadata write site.
- AC9: `validateSetupCompletion` passes scan.json (read from disk) to `checkConsistency` instead of null.
- AC10: `ProofChainEntry.build_concerns` is non-optional (`Array<...>` not `Array<...> | undefined`).
- AC11: `writeProofChain` always writes `build_concerns: []` when no concerns exist, not conditionally omitting the field.
- AC12: All 7 proof_chain.json entries that lack `build_concerns` are backfilled with `"build_concerns": []`.
- AC13: `resolveCalloutPaths` accepts an optional `projectRoot` parameter. When provided and `modules_touched` matching fails, it uses `globSync` to find the basename in the project filesystem. Resolves if exactly one match.
- AC14: `resolveCalloutPaths` glob fallback does NOT resolve ambiguous basenames (2+ matches on disk). Basename stays as-is.
- AC15: All `resolveCalloutPaths` call sites in `writeProofChain` pass `projectRoot`.
- AC16: A test exercises proof chain callout accumulation with nonzero callouts. The verify report fixture contains actual callout text. The `Chain: N runs · M callouts` output shows M > 0.
- AC17: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC18: Lint passes: `pnpm lint`

## Edge Cases & Risks

**`opus[1m]` on plans without 1M support.** On Max/Team/Enterprise plans, `opus` already auto-upgrades to 1M — the `[1m]` suffix is redundant but harmless. On Pro plans, `opus[1m]` requires extra usage billing. On API/pay-as-you-go, it's full access. Customers who can't afford 1M can change their template to `opus`. The default should be the best available, not the cheapest.

**Glob performance at scale.** `globSync('**/{basename}', { cwd: projectRoot })` on a 5000-file customer repo takes ~50ms. This runs once per unresolved basename at `work complete` time, not on every command. A verify report with 5 unresolved basenames adds ~250ms. Acceptable for a one-time operation that produces permanent data quality.

**Glob matching `.ana/` artifacts.** The glob should exclude `.ana/` and `node_modules/` to avoid matching proof chain files or dependencies. Use glob's `ignore` option: `{ ignore: ['**/node_modules/**', '**/.ana/**'] }`.

**proof_chain.json backfill.** Adding `"build_concerns": []` to 7 entries is a data edit. The field is neutral (empty array). No downstream code checks for field absence as a signal — every consumer already uses `|| []` or `?? []` fallback. The backfill makes the data match the type.

**Verify confirmation when re-verifying.** After Build fixes issues, the developer opens Verify again. The confirmation step fires: "Found {slug} ready for verification. Should I proceed?" This is correct — the developer should confirm even on re-verification, especially since they may want to discuss the fixes first.

**Build "do not ask permission" removal.** The current wording at step 0 says "Do not ask permission — this is your first action." This refers to running `ana work status`, a read-only check. Plan has the same wording at its step 0 and works fine because step 1 has strong confirmation language. Build also has confirmation at step 3. The fix is rewording step 0 to be explicit that the no-permission instruction applies to the status check only, not to starting work. Plan's step 0 has the same wording — if Plan's version is working correctly in practice, Build's might be fine too. Plan should investigate whether Build's step 3 confirmation is actually being skipped in practice or if this is a theoretical concern.

**resolveCalloutPaths signature change.** Adding `projectRoot?: string` as an optional third parameter is backward-compatible. Existing tests pass without it. New tests exercise the glob path. The function stays synchronous using `globSync`.

## Rejected Approaches

**Making `resolveCalloutPaths` async.** The codebase uses async `glob` everywhere, but this function is synchronous and mutates in place. Converting to async would change the signature and require `await` at all 4 call sites. `globSync` is available in glob v10.5.0 (our version) and keeps the function sync.

**Removing "do not ask permission" from Plan too.** Plan has the same wording but works correctly because its confirmation at step 1 is very strong ("Wait for explicit confirmation before you begin"). Changing Plan's template risks breaking something that works. Only fix what's broken.

**Adding AGENT-035 (Build proof context integration).** Build's design is intentional — its context comes from the spec's Build Brief, not from raw sources. The correct path is INFRA-043 (Plan curates proof context into the Build Brief), which is a Learning Loop item.

**Using async glob.** globSync is the right choice — keeps function sync, no call-site changes needed beyond adding the projectRoot parameter.

## Open Questions

None. All items verified against post-scope-1 codebase. Design decisions resolved.

## Exploration Findings

### Patterns Discovered

- `resolveCalloutPaths` at proofSummary.ts:327-342 — sync function, mutates in place, uses `endsWith('/' + basename)` for matching. The glob fallback follows the same pattern: check, resolve if unambiguous, skip otherwise.
- `globSync` available in glob v10.5.0 (confirmed). Not used elsewhere in the codebase (all other uses are async `glob`), but it's a documented API of the same package.
- Build template step 3 (line 63) already has confirmation: "Found spec for {name}. This will: {1-line per major file change}. Ready to build?" — the issue is the contradictory wording at step 0, not a missing step.
- Plan template step 0 (line 32) has the same "Do not ask permission" wording as Build. Plan works correctly because step 1's confirmation is strong. Build works correctly because step 3's confirmation is strong. The real gap is Verify, which has NO confirmation step anywhere.
- `proof-list-view` (earliest entry) is missing `modules_touched`, `rejection_cycles`, `previous_failures` AND `build_concerns`. The other 6 entries missing `build_concerns` have the full schema otherwise.

### Constraints Discovered

- [TYPE-VERIFIED] All 5 templates say `model: opus` — confirmed on post-scope-1 code.
- [TYPE-VERIFIED] `slugDir2` at artifact.ts:721 — `slugDir` at line 626 is block-scoped inside `if (verify-report)`. No actual JavaScript shadowing. Rename is safe.
- [TYPE-VERIFIED] `checkConsistency(cwd, anaJson, null)` at check.ts:1315 — still passes null post-scope-1.
- [TYPE-VERIFIED] `build_concerns?` at types/proof.ts:60 — 7 of 17 entries lack the field. All consumers use `|| []` fallback.
- [TYPE-VERIFIED] Verify template has no confirmation step between Find Work and Check Out. Build has confirmation at step 3. Plan has confirmation at step 1.
- [OBSERVED] `globSync` import would be the first sync glob usage in the codebase. All other glob calls use async. This is fine — the function is sync and adding async would change 4+ call sites for no benefit.

### Test Infrastructure

- `tests/utils/proofSummary.test.ts` line 1124: `resolveCalloutPaths` describe block with 8 existing tests. New glob tests go here. Tests use arrays of `{ file: string | null }` objects — no filesystem needed for module matching. Glob tests WILL need a temp directory with actual files.
- `tests/commands/work.test.ts` line 846: `createProofProject` helper creates full pipeline scenario. Verify report at line 1001 has no callouts. New fixture needs `## Callouts` section with `- **Code — title:** file:line — description` format.

## For AnaPlan

### Structural Analog

The existing `resolveCalloutPaths` tests (proofSummary.test.ts:1124-1189) are the structural analog for the glob fallback tests. Same describe block, same `{ file: string }` array pattern, but new tests need a temp directory with real files for glob to find.

For the template changes, scope 1's ESLint config block (eslint.config.js) is the structural analog — a configuration change that affects behavior without changing code.

### Relevant Code Paths

- `templates/.claude/agents/*.md` — all 5 template frontmatter blocks (line 3 of each)
- `templates/.claude/agents/ana-verify.md:35-69` — On Startup section (confirmation gap)
- `templates/.claude/agents/ana-verify.md:314-335` — Callout format section (path instruction)
- `templates/.claude/agents/ana-build.md:28-30` — step 0 "do not ask permission"
- `templates/.claude/agents/ana-build.md:61-67` — step 3 confirmation (already exists)
- `templates/.claude/agents/ana-setup.md:158-204` — Step 3 (SETUP-032: validation file read)
- `templates/.claude/agents/ana-setup.md:206-231` — Step 4 (SETUP-031: findings not surfaced)
- `templates/.claude/agents/ana-setup.md:234-245` — Step 5 (SETUP-031: presentation draft)
- `src/commands/artifact.ts:721-754` — slugDir2 rename zone
- `src/commands/check.ts:1313-1320` — validateSetupCompletion crossref call
- `src/types/proof.ts:60` — build_concerns optional
- `src/utils/proofSummary.ts:73` — ProofSummary build_concerns optional
- `src/utils/proofSummary.ts:327-342` — resolveCalloutPaths (glob fallback target)
- `src/commands/work.ts:803` — conditional build_concerns spread
- `src/commands/work.ts:808-814` — resolveCalloutPaths call sites (need projectRoot)
- `.ana/proof_chain.json` — 7 entries need build_concerns backfill

### Patterns to Follow

- `resolveCalloutPaths` existing pattern for the glob fallback — check, resolve if unambiguous, skip otherwise
- `globSync` from `glob` package (v10.5.0) with `{ ignore: ['**/node_modules/**', '**/.ana/**'] }`
- Plan template step 1 (line 38) for the Verify confirmation wording pattern
- Build template step 3 (line 63) for how confirmation looks in practice

### Known Gotchas

- The `proof-list-view` entry (index 0) is missing `modules_touched`, `rejection_cycles`, and `previous_failures` in addition to `build_concerns`. The backfill should ONLY add `build_concerns: []` — don't touch other missing fields, as those are handled by existing `|| []` fallbacks and adding them is a separate concern.
- `globSync` needs `{ cwd: projectRoot }` to search from the project root, not the process cwd. Also needs `{ ignore }` to exclude node_modules and .ana.
- The callout path instruction in the verify template should update the EXAMPLE at line 319 (`api/client.ts:47` → `src/api/client.ts:47`) AND add an explicit instruction. Just changing the example isn't enough — agents don't always follow examples.
- Build's step 0 and Plan's step 0 have identical "Do not ask permission" wording. Only change Build's. Plan's works fine because its step 1 confirmation is stronger. Changing Plan risks breaking working behavior.
- `createProofProject` at work.test.ts:933 still has `commit` fields in its `.saves.json` fixture (lines 939, 949, 954). Scope 1 removed ghost `commit` fields from pr.test.ts but didn't touch work.test.ts. These are harmless (JSON.parse ignores extra fields) but the planner should be aware.

### Things to Investigate

- **Build step 0 vs step 3 in practice.** Is Build actually skipping the step 3 confirmation when it encounters work? The user reported this happens. If Build's step 3 confirmation is being followed reliably, the step 0 wording change is cosmetic. If it's being skipped, the wording change matters. Plan should form an independent opinion on whether the contradiction between step 0 and step 3 is causing the skip, or whether something else is.
- **Glob exclusion patterns.** Verify that `{ ignore: ['**/node_modules/**', '**/.ana/**'] }` works correctly with globSync. Some glob implementations handle ignore differently in sync vs async mode. Test in the new test suite.
- **Verify template confirmation placement.** The confirmation should go between step 1 (Find Work) and step 2 (Check Out). But step 2 already says "After the developer confirms" (line 51), referring to branch checkout confirmation. With the new confirmation step, there are now two confirmations: (1) should I verify this? and (2) should I switch branches? If the agent is already on the right branch, confirmation 2 doesn't fire. Plan should design the wording so the two confirmations don't feel redundant when both fire.
- **`proofSummary.ts` build_concerns optional.** The `ProofSummary` type at line 73 also has `build_concerns?` optional. The `generateProofSummary` function conditionally adds it at line 810. Should the ProofSummary type also become non-optional with a `build_concerns: []` default in the initializer? Or is the optionality correct there because not all build reports have concerns? Plan should decide — the principle is consistency with ProofChainEntry, but ProofSummary is an intermediate type with different lifecycle.

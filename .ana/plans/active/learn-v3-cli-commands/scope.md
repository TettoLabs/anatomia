# Scope: Learn V3 — CLI Commands + Template Finalization

**Created by:** Ana
**Date:** 2026-05-01

## Intent

Build the CLI commands that Ana Learn needs to operate deterministically, then strip the graceful degradation from the Learn template. V2 shipped the Learn template with manual workarounds for commands that didn't exist. V3 makes those commands real and removes the workarounds. After V3, every proof chain operation Learn performs goes through a CLI command — no manual git ceremonies, no raw JSON parsing, no fallback instructions.

## Complexity Assessment
- **Size:** large
- **Files affected:** `src/commands/proof.ts`, `src/utils/git-operations.ts`, `src/commands/artifact.ts`, `src/commands/work.ts`, `src/commands/pr.ts`, `tests/commands/proof.test.ts`, `tests/utils/git-operations.test.ts`, `templates/.claude/agents/ana-learn.md`, `.claude/agents/ana-learn.md`, `templates/.claude/agents/ana-verify.md`, `.claude/agents/ana-verify.md`
- **Blast radius:** proof.ts is the primary target — all 4 CLI changes land there. git-operations.ts gets one new function. artifact.ts, work.ts, pr.ts get coAuthor dedup (mechanical replacement). Both agent templates get edited.
- **Estimated effort:** 3-4 days across 3 specs
- **Multi-phase:** yes

## Approach

Three phases, building on each other:

**Phase 1:** Shared infrastructure (`readCoAuthor`) + variadic IDs for `close` and `promote`. These are the most-used commands — close runs 15-20 times per session, promote runs 1-3 times. Making them batch-capable and adding co-author trailers is the highest-impact change.

**Phase 2:** New `strengthen` subcommand. This eliminates the ISSUE-29 failure mode where Learn's direct skill file edits went uncommitted. The command is a git ceremony wrapper — it verifies the edit exists, stages, commits atomically, and closes the findings.

**Phase 3:** New `stale` subcommand + `audit --full` flag + both template cleanups. The stale command precomputes staleness signals from proof chain data. The audit flag removes truncation for agent consumption. The Verify template gets a 3-line staleness check addition. The Learn template gets stripped of all V2 degradation paths and updated to reference the new commands with variadic ID examples.

## Acceptance Criteria

Full acceptance criteria are in `anatomia_reference/LEARN_V3_REQUIREMENTS.md` (V3-AC0a through V3-AC25). Summary:

- AC1: `readCoAuthor()` exists in git-operations.ts, all 5 inline coAuthor reads deduplicated
- AC2: `ana proof close` and `ana proof promote` accept variadic `<ids...>`, single-ID backward compatible
- AC3: Existing close and promote commits include co-author trailers (bug fix)
- AC4: `ana proof strengthen` exists — verifies uncommitted skill changes, stages atomically, accepts multiple finding IDs
- AC5: `ana proof stale` exists — cross-references modules_touched, reports high/medium confidence tiers
- AC6: `ana proof audit --json --full` returns all active findings without truncation
- AC7: Verify template instructs staleness checking on reviewed files with active findings
- AC8: Learn template has zero fallback language — assumes all commands exist, shows variadic ID examples everywhere
- AC9: All new/modified commands have tests

## Edge Cases & Risks

- **Commander variadic args + option flags.** `<ids...>` with `--reason` and `--skill` options — verify Commander parses correctly when IDs and flags are interleaved. Test: `ana proof close C1 --reason "test" C2` should NOT work (reason would eat C2). IDs must come before flags, or Commander must handle this. Investigate during Plan.
- **strengthen with no uncommitted changes.** Learn might forget to edit before running the command. The command exits with a clear message — but Learn needs to understand this IS the workflow: edit first, then run the command.
- **stale confidence on hot files.** A file touched by 5 unrelated scopes gets "high" confidence, but the finding might be about a function none of them changed. The confidence is heuristic, not proof — Learn still verifies by reading code.
- **Existing close/promote tests use `git log --pretty=%s`.** Adding co-author to the commit body doesn't break these tests (they only check the subject). But new tests should use `%B` to verify the trailer.
- **Template cleanup must ship AFTER all CLI commands.** If the Learn template references `ana proof stale` before the command exists, Learn errors. Phase 3 ordering is critical.

## Rejected Approaches

- **`--batch` flag on close instead of variadic args.** A flag that changes argument parsing is confusing. Variadic `<ids...>` is simpler — one ID is a batch of one. Subagent review confirmed this.
- **Merging strengthen into promote.** Different ownership of the file edit. Promote writes to the skill file. Strengthen verifies someone else wrote. One command that sometimes writes and sometimes doesn't is confusing. Two commands, clear contracts.
- **Three confidence tiers for stale (high/medium/low).** Low would require git log checking (non-pipeline modifications). Expensive and adds complexity for marginal signal. Two tiers from proof chain data only.
- **Per-finding close reasons.** Batch close uses a shared reason. Findings that need different reasons should be grouped into separate close calls. Per-ID reasons would make the command complex for marginal benefit.

## Open Questions

- Commander variadic argument parsing with option flags — needs investigation during Plan. Does `<ids...>` consume everything including `--reason "test"`? May need to validate that IDs don't start with `--`.

## Exploration Findings

### Patterns Discovered
- `proof.ts`: All subcommands (close, promote, audit, health, context) follow the same pattern: register as `new Command()`, add to `proofCommand.addCommand()`. Strengthen and stale follow this pattern.
- `proof.ts close` (line 533): commit uses `spawnSync('git', ['commit', '-m', commitMessage])`. No co-author. The `artifact.ts` pattern (line 1058) appends `\n\nCo-authored-by: ${coAuthor}` to the message.
- `proof.ts promote` (line 821): same commit pattern, no co-author.
- `git-operations.ts`: exports `readArtifactBranch`, `readBranchPrefix`, `getCurrentBranch`. `readCoAuthor` fits naturally as the fourth export.
- `proofSummary.ts`: `computeHealthReport()` already does modules_touched cross-referencing for hot modules (lines 816-858). The stale command can reuse this traversal pattern.

### Constraints Discovered
- [TYPE-VERIFIED] Commander variadic args (`proof.ts:391`) — current close uses `.argument('<id>', ...)`. Changing to `<ids...>` makes the first parameter `string[]` instead of `string`. All downstream code must handle arrays.
- [OBSERVED] coAuthor duplication — 5 identical copies across 3 files. Zero unique logic in any copy. Safe to extract.
- [OBSERVED] proof.test.ts close tests (line 1027-1028) use `git log --pretty=%s` — subject only. Adding body content doesn't break them.

### Test Infrastructure
- `proof.test.ts`: close tests use `createCloseTestProject()` helper that sets up temp dir, git init, proof chain, ana.json. Strengthen tests can reuse this with a skill file addition.
- `proof.test.ts`: promote tests use `createPromoteTestProject()` helper — same pattern. Includes skill file creation.
- `artifact.test.ts` (line 826-851): existing coAuthor tests show the pattern for testing custom vs default trailer.

## For AnaPlan

### Structural Analog
`proof.ts` close subcommand (lines 388-571) is the structural analog for ALL new commands — it has branch check, pull, chain read, finding search, mutation, chain write, dashboard regen, stage, commit, push. Strengthen and stale follow this shape. The variadic change modifies the existing close/promote code directly.

For `stale`, the secondary analog is `computeHealthReport()` in `proofSummary.ts` (lines 709-977) — it already traverses entries and cross-references findings with entry indexes. The staleness computation is a similar traversal.

### Relevant Code Paths
- `src/commands/proof.ts` — all proof subcommands live here (close: 388-571, promote: 576-868, audit: 871-1083, health: 1088-1211)
- `src/utils/git-operations.ts` — `readArtifactBranch`, `readBranchPrefix`, `getCurrentBranch` (readCoAuthor goes here)
- `src/utils/proofSummary.ts` — `computeChainHealth()`, `computeHealthReport()`, `generateDashboard()` (stale computation reuses these patterns)
- `src/commands/artifact.ts` — coAuthor reads at lines 1046-1055 and 1307-1313 (dedup targets)
- `src/commands/work.ts` — coAuthor read at lines 958-964 (dedup target)
- `src/commands/pr.ts` — coAuthor read at lines 249-253 (dedup target)

### Patterns to Follow
- `proof.ts` close subcommand for command structure, error handling, JSON output envelope
- `proofSummary.ts` `computeHealthReport()` for proof chain traversal
- `artifact.test.ts` coAuthor tests (lines 826-851) for testing co-author trailer behavior
- `git-operations.ts` `readArtifactBranch()` for the fallback-on-error utility pattern

### Known Gotchas
- Commander variadic args: `<ids...>` makes the first action parameter `string[]` not `string`. Every reference to `id` in the close handler becomes `ids[0]` for single-ID compatibility.
- The promote command has duplicate detection (lines 752-765) that uses word overlap. With variadic IDs, only ONE rule is appended regardless of ID count — the duplicate check should still run once against the single rule text.
- `strengthen` must check `git diff --name-only` for the specific skill file path (`.claude/skills/{name}/SKILL.md`), not just any uncommitted changes. The diff output includes paths relative to the repo root.
- All proof subcommand tests in `proof.test.ts` use `process.chdir(tempDir)` — the temp directory must have `.ana/ana.json` with `coAuthor` for the new trailer tests.

### Things to Investigate
- Commander's handling of `<ids...>` with `--reason <value>` — does it correctly separate IDs from option values? Test with: `close C1 C2 --reason "test"`. Plan should verify this works or determine if IDs must be quoted/comma-separated.
- Whether `computeHealthReport` in proofSummary.ts should be extended for staleness or whether `stale` should have its own pure function. Separation is cleaner (health reports trajectory, stale reports staleness — different concerns), but the traversal pattern is shared.

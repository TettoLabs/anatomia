# Scope: Close the Loop

**Created by:** Ana
**Date:** 2026-04-28

## Intent

The proof chain captures verification intelligence across 23 pipeline runs — 57 active findings, 31 mechanically closed, 21 lessons. But the developer can't manage it and Build can't receive it.

Three gaps:
1. **No management tools.** Findings that were addressed but whose file and anchor still exist stay active forever. The active set grows every cycle. There's no `ana proof close`, no `ana proof audit`.
2. **No delivery to Build.** Think uses proof context. Verify uses it. Build — the agent most likely to reintroduce a known issue — gets zero institutional memory.
3. **No structured output contract.** Existing `--json` outputs are inconsistent shapes. New commands need a stable contract from birth. External consumers (hooks, CI, Ana Learn) need predictable JSON.

This is the UX foundation. Foundations 1, 1.5, and 2 were invisible plumbing. Foundation 3 is where the developer first types commands and reads output from the proof system. Command names, output format, error messages, and the JSON contract become permanent after this ships.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `packages/cli/src/commands/proof.ts` — close and audit subcommands, JSON contract wrapper on existing commands, structured error responses
  - `packages/cli/src/commands/work.ts` — fix completeWork pull error handling, add audit nudge
  - `packages/cli/templates/.claude/agents/ana-plan.md` — Build Brief `### Proof Context` subsection
  - `.claude/agents/ana-plan.md` — dogfood sync of template change
  - `packages/cli/tests/commands/proof.test.ts` — close, audit, JSON contract, error code tests
  - `packages/cli/tests/commands/work.test.ts` — pull error handling fix, nudge tests
- **Blast radius:** proof.ts and work.ts are the primary affected modules. Plan template change affects all future specs. JSON contract restructure touches existing command output shapes — zero external consumers to break but the shapes become permanent.
- **Estimated effort:** one pipeline run
- **Multi-phase:** no

## Approach

Add two proof chain subcommands (close, audit), restructure all existing `--json` outputs into a permanent 4-key contract, deliver proof context to Build through the Plan template, and harden `work complete`'s team safety.

Close follows the artifact branch git pattern established by `saveArtifact` — require artifact branch, pull before read, commit and push after write. Each close is an atomic commit with full provenance.

Audit is read-only — no branch check, no git operations. Works from any branch. Groups findings by file with health indicators, capped at top 3 per file and top 8 files for scalability.

The JSON contract wraps every `ana proof` subcommand in `{ command, timestamp, results, meta }`. `meta.findings` is a status-count object identical on every response. After Foundation 3, this shape is additive-only forever — new fields can be added, nothing removed or renamed.

Build delivery uses a `### Proof Context` structural subsection in the Plan template's Build Brief. This matches the existing `### Rules That Apply`, `### Pattern Extracts`, and `### Checkpoint Commands` subsections — all three have 100% compliance across 23 specs. Structural subsections work. Procedural instructions don't.

## Acceptance Criteria

- AC1: `ana proof close {id} --reason "text"` sets finding status to `closed` with `closed_reason`, `closed_at`, `closed_by: 'human'`, regenerates PROOF_CHAIN.md, commits `[proof] Close {id}: {reason}`, and pushes.
- AC2: `ana proof close` requires the artifact branch. Wrong branch produces structured error with code `WRONG_BRANCH`.
- AC3: `ana proof close` runs `git pull --rebase` before reading proof_chain.json, following `saveArtifact`'s error handling pattern (conflict → error with instructions, no remote → skip, auth failure → clear error).
- AC4: `ana proof close` with a nonexistent finding ID produces structured error with code `FINDING_NOT_FOUND`.
- AC5: `ana proof close` on an already-closed finding produces structured error with code `ALREADY_CLOSED`, including `closed_by` and `closed_reason` from the existing closure.
- AC6: `ana proof close` without `--reason` produces structured error with code `REASON_REQUIRED`.
- AC7: `ana proof close --json` returns `{ command, timestamp, results: { finding: {...}, previous_status, new_status, reason, closed_by }, meta }` on success, with `finding` containing full object (id, category, summary, file, severity, entry_slug, entry_feature).
- AC8: All `--json` error responses follow `{ command, timestamp, error: { code, message, ...context }, meta }`. `meta` is present even on errors.
- AC9: `ana proof audit` lists all active findings grouped by file (descending by finding count), top 3 per file, top 8 files, with `... and N more` overflow. No branch check (read-only).
- AC10: Each audit finding displays three lines: `[category] summary`, `age | anchor | severity | assertions`, `from: Feature Name`.
- AC11: `ana proof audit --json` returns `{ command, timestamp, results: { total_active, by_file: [...] }, meta }` with each finding containing: `id`, `category`, `summary`, `file`, `anchor` (text), `anchor_present` (boolean), `line`, `age_days`, `severity`, `related_assertions`, `entry_slug`, `entry_feature`.
- AC12: Existing `ana proof --json`, `ana proof {slug} --json`, and `ana proof context --json` are restructured into `{ command, timestamp, results, meta }` contract.
- AC13: `meta` on every command contains `{ chain_runs, findings: { active, closed, lesson, promoted, total } }`.
- AC14: Plan template (`ana-plan.md`) includes `### Proof Context` as a structural subsection of Build Brief, with curation instruction: top 2-3 per file, prioritize severity, skip notes unless relevant, flag assertion overlap.
- AC15: `work complete` output includes one-line nudge (`→ Run ana proof audit to review active findings`) when active findings > 20 AND zero findings across all entries have `closed_by === 'human'`. Nudge disappears permanently after first human close.
- AC16: `work complete`'s pull error handling at lines 1058-1064 warns on non-conflict pull failures matching `saveArtifact`'s pattern, instead of silently continuing with potentially stale data.
- AC17: Closing a lesson shows the `lesson → closed` transition in terminal output.

## Edge Cases & Risks

**Edge cases:**
- Finding ID not found → structured error with suggestion to run `ana proof audit`
- Finding already closed → show who closed it, when, and why. Don't re-close.
- Finding is a lesson → allow closing, show `lesson → closed` transition
- No reason provided → structured error explaining why reasons are mandatory
- No proof_chain.json → `NO_PROOF_CHAIN` error (global, applies to all proof commands)
- Corrupt proof_chain.json → `PARSE_ERROR` error (global)
- Zero active findings in audit → "No active findings. The proof chain is clean."
- 5 findings in audit → all shown, no overflow caps hit
- 200 findings in audit → top 8 files, top 3 per file, `... and N more` overflow. ~50 lines.
- Finding with severity (F2 data) vs without (pre-F2) → show when available, `—` when absent
- `anchor_present` check → requires reading ~30 files for 57 findings. Acceptable for an occasional command.

**Risks:**

1. **Plan ignores proof context instruction.** The `### Proof Context` subsection is structural (100% compliance on existing subsections), but it's still a template-level signal. Monitoring: check each spec after F3 ships. If <50% delivery after 5 runs, escalate to mechanical injection.

2. **Build ignores delivered context.** Build reads the spec containing proof context but doesn't address findings. Monitoring: compare delivered findings against verify report. If Verify finds the same issues that were in proof context, Build didn't learn. Needs 10+ runs to assess.

3. **`ana proof close` never used.** The nudge in `work complete` addresses discoverability. If zero manual closures after 10 runs despite the nudge, the developer made a conscious choice. Ana Learn (future) automates what they won't do manually.

4. **JSON contract wrong for real consumers.** Mitigation: the scope includes Ana Learn's template as a design validation — can Learn be written using ONLY `--json` outputs? We verified yes during scoping.

5. **`GIT_CONFLICT` in `--json` mode.** When `git pull --rebase` fails due to conflict during `close --json`, the process exits before emitting JSON. The consumer gets exit code 1 and stderr, not structured JSON. Extremely unlikely (two developers closing findings within seconds). Learn doesn't handle merge conflicts. Open question for Plan — note but don't block.

## Rejected Approaches

**Mechanical injection of proof context into spec at save time.** Save-time heuristic (check for "Proof Context" heading string) has high false-negative rate. Template structural subsection with 100% empirical compliance is more reliable and less fragile. Deferred — revisit only if delivery rate is <50% after 5 runs.

**`--batch` mode for close.** Individual commits are more auditable — each closure is independently traceable in git history. At the scale of manual triage (5-10 closures per session), 5-10 atomic commits are acceptable. Batch mode deferred until noise matters.

**Adding `warnings` array to JSON contract for push failures.** The operation succeeded locally. Terminal warning is sufficient. Adding a warnings array for a rare edge case pollutes the contract. If warnings become a pattern across multiple commands in the future, add as a contract extension then.

**Adding a second `git pull --rebase` to `completeWork`.** The pull already exists at step 4 (work.ts:1052-1056). The gap is silent error handling at lines 1058-1064 where non-conflict pull failures are swallowed. Fix the error handling, don't add a redundant pull.

**`ana proof promote`** in this scope. Promote has unresolved design questions (which skill file? what wording? rules vs gotchas section?). Benefits from the developer having USED close and audit first. Ship as follow-on scope.

## Open Questions

- `GIT_CONFLICT` in close `--json` mode: should the process emit a structured error JSON before exiting, or is exit-code-1 + stderr sufficient? Extremely unlikely scenario. Plan decides.

## Exploration Findings

### Patterns Discovered
- `saveArtifact` (artifact.ts:946-962): pull pattern — check remotes, `git pull --rebase`, conflict → exit, no remote → skip, other errors → continue. Close follows this exactly.
- `completeWork` (work.ts:1021-1304): existing pull at step 4 (line 1052-1056), error handling at 1058-1064 only catches conflicts explicitly, non-conflict errors silently continue.
- `formatHumanReadable` (proof.ts:71-156): box-drawing terminal output pattern for proof cards. Audit should use simpler indented format, not box-drawing — audit is a list, not a card.
- `formatContextResult` (proof.ts:340-388): `chalk.dim` for category tags, `chalk.gray` for metadata. Audit follows this color convention.
- `writeProofChain` (work.ts:740-1014): chain health counting logic at lines 977-996. Extract into a shared `computeChainHealth()` function — audit and close both need the same `meta` computation.
- `ProofContextResult` (proofSummary.ts:1051-1074): finding fields include `id`, `category`, `summary`, `file`, `anchor`, `line`, `severity`, `related_assertions`, `from`, `date`, `status`. Audit JSON needs `entry_slug` and `entry_feature` which map to the entry's `slug` and `feature` fields.

### Constraints Discovered
- [TYPE-VERIFIED] ProofChainEntry.findings[].closed_by (types/proof.ts:77) — typed as `'mechanical' | 'human' | 'agent'`. Close sets `'human'`. Future Learn sets `'agent'`.
- [TYPE-VERIFIED] ProofChainEntry.findings[].status (types/proof.ts:74) — typed as `'active' | 'lesson' | 'promoted' | 'closed'`. No type changes needed.
- [OBSERVED] Current `ana proof context --json` shape — `{ results: [...] }`. Missing `command`, `timestamp`, `meta`. Restructure needed.
- [OBSERVED] Current `ana proof --json` shape — raw `{ entries: [...] }`. Full proof_chain.json content dumped. Restructure needed.
- [OBSERVED] Current `ana proof {slug} --json` — raw entry object. Restructure needed.
- [OBSERVED] Zero human closures exist in the proof chain. The nudge condition (active > 20 AND zero human closures) would trigger immediately.

### Test Infrastructure
- `packages/cli/tests/commands/proof.test.ts` — existing tests for proof command, context subcommand. Uses `vi.mock` for fs and child_process. Tests verify JSON output shape and terminal formatting.
- `packages/cli/tests/commands/work.test.ts` — existing tests for work status and complete. Tests verify git operations, branch checks, directory operations.

## For AnaPlan

### Structural Analog
`saveArtifact` in `packages/cli/src/commands/artifact.ts` (lines 768-1103). Close follows the same git pattern: branch validation → pull → read → modify → write → stage → commit → push → success output. The error handling at lines 946-962 is the exact model for close's git behavior.

For audit's display format, `formatContextResult` in `packages/cli/src/commands/proof.ts` (lines 340-388) is the closest structural match — iterating findings with chalk formatting, grouping, and truncation.

### Relevant Code Paths
- `packages/cli/src/commands/proof.ts` — `registerProofCommand` at line 217. New `close` and `audit` subcommands register here. Existing `--json` outputs at lines 242, 285, 315 need contract wrapping.
- `packages/cli/src/commands/work.ts` — `completeWork` at line 1021. Pull error handling at 1058-1064. Summary output at 1297-1303 (nudge goes after).
- `packages/cli/src/commands/work.ts` — `writeProofChain` at line 740. Chain health counting at 977-996 should be extracted for reuse by close and audit.
- `packages/cli/src/utils/proofSummary.ts` — `generateDashboard` (called by writeProofChain at line 997). Close calls this after mutation to regenerate PROOF_CHAIN.md.
- `packages/cli/src/types/proof.ts` — `ProofChainEntry` and `ProofChainStats`. No type changes needed — `closed_by`, `closed_reason`, `closed_at` already exist.
- `packages/cli/templates/.claude/agents/ana-plan.md` — Build Brief section at line 391. `### Proof Context` subsection goes after `### Checkpoint Commands` (line 413) or after `### Build Baseline` (line 421).

### Patterns to Follow
- `saveArtifact` in `artifact.ts` for git pull/push error handling
- `formatContextResult` in `proof.ts` for chalk-formatted finding display
- `computeChainHealth` pattern from `writeProofChain` (work.ts:977-996) — extract and reuse
- Commander subcommand registration pattern in `registerProofCommand` (proof.ts:217-332)

### Known Gotchas
- Commander subcommands share parent options when parent has same flag. `proof` parent defines `--json`, context subcommand reads from parent via `proofCommand.opts()` (proof.ts:313). New subcommands (close, audit) need the same pattern.
- `completeWork`'s pull at step 4 exists but the catch block at 1058-1064 only handles conflicts. The fix is error handling, not adding a pull. The requirements doc prescribed the wrong fix for the right disease.
- `getProofContext` returns findings with `from` (feature name) and `date` fields. Audit needs `entry_slug` and `entry_feature` — these come from the proof chain entry directly, not from `getProofContext`. Audit reads proof_chain.json directly, not through `getProofContext`.
- `anchor_present` in audit JSON requires reading files to check if anchor text exists. This is a runtime computation, not stored data. Group file reads by path to avoid redundant I/O.

### Things to Investigate
- Should `computeChainHealth()` be extracted to `utils/proofSummary.ts` (alongside `getProofContext`) or kept in `commands/proof.ts`? It's used by close, audit, and the contract wrapper on existing commands. The utils location feels right since `writeProofChain` in work.ts also needs it, avoiding cross-command imports.
- The `### Proof Context` subsection placement in Build Brief — after `### Checkpoint Commands` or after `### Build Baseline`? The requirements show it after Pattern Extracts and before Checkpoint Commands. Plan should read the template and decide the natural flow.

# Scope: Replace PROOF_CHAIN.md reads with targeted proof context queries

**Created by:** Ana
**Date:** 2026-04-24

## Intent

Pipeline agents currently read all of PROOF_CHAIN.md (170+ lines, 58 active issues) and manually filter to relevant modules. This is the exact task agents do poorly. The `ana proof context {files}` command already exists and solves the filtering problem mechanically. Replace the full-file reads with targeted queries in the two agents that are primary proof chain consumers (Ana and Verify), and remove the reads entirely from the two agents that receive proof context through document flow (Plan and Build).

## Complexity Assessment
- **Size:** small
- **Files affected:** 4 template files in `packages/cli/templates/.claude/agents/` (ana.md, ana-plan.md, ana-build.md, ana-verify.md)
- **Blast radius:** These templates ship to all Anatomia users via `ana init`. No code changes. No test changes. No toolbelt changes. The templates are copied verbatim during init — the change affects every new `ana init` and every `ana init --refresh` that touches agent definitions.
- **Estimated effort:** <1 hour implementation
- **Multi-phase:** no

## Approach

Two agents gain targeted proof context queries at existing checkpoint gates. Two agents lose their proof chain reads entirely — they receive proof context through the pipeline's natural document flow (scope for Plan, spec for Build).

The bookend pattern: Ana (first agent) queries proof context to shape what goes into the pipeline. Verify (last agent) queries proof context to sharpen fault-finding on what comes out. Plan and Build in the middle focus on their core jobs.

No new infrastructure. The `ana proof context` command already exists. This is wiring — connecting the command to the agents that consume it.

## Acceptance Criteria

- AC1: Ana's agent definition references `ana proof context {files}` in the exploration steps, not `.ana/PROOF_CHAIN.md`
- AC2: Ana's checkpoint instruction references proof chain findings without prescribing a second query
- AC3: Ana's Step 1 (Before Scoping) no longer references `.ana/PROOF_CHAIN.md`
- AC4: Verify's agent definition references `ana proof context {files from contract file_changes}` after loading verification documents, not `.ana/PROOF_CHAIN.md` at Step 4
- AC5: Plan's agent definition contains zero references to `.ana/PROOF_CHAIN.md`
- AC6: Build's agent definition contains zero references to `.ana/PROOF_CHAIN.md`
- AC7: No agent definition references `.ana/PROOF_CHAIN.md` as a file to read
- AC8: Verify's proof context instruction includes a fallback for when the command is unavailable, following the existing pre-check fallback pattern

## Edge Cases & Risks

- **No proof chain exists (new user).** `ana proof context` returns "No proof chain found." Agents see empty results and proceed normally. Equivalent to current behavior where PROOF_CHAIN.md doesn't exist. No breakage.
- **Command returns no results for queried files.** Agent sees "No proof context found for {files}" and moves on. No issue.
- **Command not available (version mismatch).** If a user manually copies newer agent templates without upgrading the CLI, the command might not exist. Verify's instruction should include a fallback (read PROOF_CHAIN.md directly), following the existing pre-check fallback pattern at ana-verify.md line 131. Ana's instruction is less critical — if the command fails, Ana scopes without proof context.
- **Verify doesn't know files until Step 5.** The current PROOF_CHAIN.md read is at Step 4 (Load Context), but the file list comes from the contract at Step 5 (Load Verification Documents). The proof context query must be positioned after Step 5, not at Step 4.

## Rejected Approaches

**Toolbelt injection at save-time.** We considered having `ana artifact save scope` and `ana artifact save-all` mechanically inject proof context into saved artifacts. Rejected because: (1) undifferentiated callouts create redundancy with Ana's curated scope, (2) adds code to artifact.ts (already a long function), (3) the proof chain's natural loop (Verify catches missed callouts, writes new ones) is the verification mechanism. Documented in `proof-chain-agent-integration.md` as a Phase 2 option contingent on evidence from 5 cycles.

**Keeping PROOF_CHAIN.md reads alongside the command.** Would create dual delivery — agents read the full file AND get targeted results. Redundant and confusing. The command replaces the read, it doesn't supplement it.

**Adding proof context to Plan or Build.** Plan and Build are not primary proof chain consumers. Plan receives intelligence through the scope (which Ana curates). Build receives through the spec. Adding commands to these agents wastes context tokens on intelligence they get through document flow.

## Open Questions

None. All design decisions are resolved.

## Exploration Findings

### Patterns Discovered

**Pre-check fallback pattern (ana-verify.md:131):**
```
If the command fails or is not available: read contract.yaml directly,
manually grep test files for `@ana` tags, and build your own coverage table.
```
This is the established pattern for CLI command fallbacks in agent definitions. Verify's proof context instruction should follow this pattern.

### Constraints Discovered

- [TYPE-VERIFIED] Verify reads contract at Step 5, not Step 4 (ana-verify.md:79-87) — proof context query must come after Step 5
- [OBSERVED] Ana doesn't know files at Step 1 (ana.md:38-45) — can't run the command at Step 1, only at Step 3 (exploration) when files are identified
- [OBSERVED] All four agent templates are in `packages/cli/templates/.claude/agents/` — these ship to customers via init

### Test Infrastructure

No tests needed. These are markdown template files copied verbatim during init. Existing init tests verify file copying, not content.

## For AnaPlan

### Structural Analog

The pre-check fallback in `ana-verify.md` (line 131) is the closest structural match — a CLI command instruction with a fallback clause for when the command is unavailable.

### Relevant Code Paths

All changes are in template markdown files, not code:

- `packages/cli/templates/.claude/agents/ana.md` — lines 43, 109, 120: three PROOF_CHAIN.md references
- `packages/cli/templates/.claude/agents/ana-plan.md` — lines 51, 140: two PROOF_CHAIN.md references
- `packages/cli/templates/.claude/agents/ana-build.md` — line 41: one PROOF_CHAIN.md reference
- `packages/cli/templates/.claude/agents/ana-verify.md` — line 77: one PROOF_CHAIN.md reference, must be repositioned to after Step 5

### Exact Changes Required

**ana.md — three changes:**

1. **Step 1 (line 43):** Remove the PROOF_CHAIN.md bullet entirely. Design-principles.md stays as the sole pre-scoping context read.

   Current:
   ```
   - `.ana/PROOF_CHAIN.md` — if the user's request touches a module with proof chain history, surface relevant lessons.
   ```
   Action: Delete this line.

2. **Step 3 of exploration (line 109):** Replace vague "check proof chain" with the command.

   Current:
   ```
   3. **Check proof chain** — surface relevant lessons for the affected module
   ```
   Proposed:
   ```
   3. **Check proof chain** — run `ana proof context {files}` to surface relevant lessons for the affected modules
   ```

3. **Checkpoint (line 120):** Replace PROOF_CHAIN.md re-read with reference to Step 3 findings. The design-principles re-read stays — it's the proven checkpoint gate. The proof chain query already ran at Step 3; the checkpoint references results, not re-queries.

   Current:
   ```
   Before formatting the preview, re-read `.ana/context/design-principles.md` and check `.ana/PROOF_CHAIN.md` for entries touching the modules involved. You should be able to name which principles shaped this scope or relevant proofs if asked.
   ```
   Proposed:
   ```
   Before formatting the preview, re-read `.ana/context/design-principles.md`. You should be able to name which principles shaped this scope or relevant proof chain findings if asked.
   ```

**ana-plan.md — two changes:**

1. **Step 2 (line 51):** Remove the PROOF_CHAIN.md bullet.

   Current:
   ```
   - `.ana/PROOF_CHAIN.md` — institutional memory. Check Active Issues for the modules the scope touches.
   ```
   Action: Delete this line.

2. **Step 4 checkpoint (line 140):** Remove PROOF_CHAIN.md reference, keep design-principles re-read.

   Current:
   ```
   Before writing the spec, re-read `.ana/context/design-principles.md` and check `.ana/PROOF_CHAIN.md` for entries touching the modules involved. You should be able to name which principles shaped your design decisions or relevant proofs if asked.
   ```
   Proposed:
   ```
   Before writing the spec, re-read `.ana/context/design-principles.md`. You should be able to name which principles shaped your design decisions if asked.
   ```

**ana-build.md — one change:**

1. **Line 41:** Remove the entire PROOF_CHAIN.md sentence.

   Current:
   ```
   Read `.ana/PROOF_CHAIN.md` if it exists. If you're building in a module with proof chain entries, reference past lessons.
   ```
   Action: Delete this sentence.

**ana-verify.md — one change (remove + add):**

1. **Step 4 (line 77):** Remove the PROOF_CHAIN.md bullet from Step 4's context list.

   Current:
   ```
   - `.ana/PROOF_CHAIN.md` — institutional memory. Read Active Issues for the modules this build touches. Let them inform what you pay attention to — they're context, not a checklist. If the build interacts with a known issue (addresses it, changes its impact, or works around it), note that in your callouts.
   ```
   Action: Delete this bullet.

2. **After Step 5 (after line 91):** Add a proof context query instruction. Positioned after Verify reads the contract (and knows the file_changes). Includes fallback following the pre-check pattern.

   New text to insert after the "Known paths" block and before Step 6:
   ```
   After reading the contract, run `ana proof context {files from contract file_changes}` to surface proof chain history for the modules this build touches. Let the callouts inform what you pay attention to during code review — they're context, not a checklist. If the build interacts with a known issue (addresses it, changes its impact, or works around it), note that in your callouts.

   If the command is not available: check `.ana/PROOF_CHAIN.md` if it exists and look for Active Issues mentioning the modules from file_changes.
   ```

### Patterns to Follow

- The pre-check fallback pattern in ana-verify.md for command unavailability
- Keep instruction text tight — "every character earns its place" applies to agent definitions too

### Known Gotchas

- Do NOT add a fallback instruction to ana.md for when the command fails. Ana is in conversation with the developer — if the command fails, the developer sees it. Adding fallback text to Ana wastes context tokens on a scenario that handles itself.
- The Verify instruction repositioning from Step 4 to after Step 5 is the only structural change. All other changes are line edits or deletions within existing sections.
- No line in any agent definition should reference `.ana/PROOF_CHAIN.md` as a file to read after this change. The file continues to exist — agents just don't read it directly.

### Things to Investigate

None. All changes are specified with exact current and proposed text.

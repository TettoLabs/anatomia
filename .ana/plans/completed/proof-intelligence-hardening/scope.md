# Scope: Proof Intelligence Hardening

**Created by:** Ana
**Date:** 2026-05-04

## Intent

Consolidation pass on the proof intelligence surface. Two confirmed bugs corrupt data, the staleness detector produces 78% false positives, shared logic is copy-pasted three times, and the audit display conflates actionable findings with monitoring noise. These aren't independent problems — they grew feature-by-feature without a consolidation pass. The proof surface now undermines its own credibility: the tool that verifies AI work can't get its own verification data right.

## Complexity Assessment
- **Size:** large
- **Files affected:** `proofSummary.ts`, `proof.ts`, `work.ts`, `templates/.claude/agents/ana-learn.md`, plus test files for each
- **Blast radius:** All proof subcommands consume proofSummary functions. The exitError extraction touches close/promote/strengthen. The staleness normalization changes what Learn sees. The lesson command adds a new subcommand. The parseACResults fix affects the proof chain write path — work.ts completeWork calls it via generateProofSummary, so this is a data-path fix, not just display.
- **Estimated effort:** 2-3 pipeline phases
- **Multi-phase:** yes

## Approach

Fix the data corruption first (parseACResults), then extract shared infrastructure (exitError factory, FAIL guard, counting unification, truncation helper, zero-run defaults deletion), then build the display and command improvements on the clean foundation. The lesson command clones the close subcommand's structure. The staleness detector gets frequency-normalized confidence instead of raw counts.

The design principle is removal: three exitError copies become one factory, hardcoded defaults get deleted in favor of calling the existing function, the dual FAIL guard collapses. The audit headline split and lesson command make the remaining active count honest and informative.

## Acceptance Criteria
- AC1: parseACResults only counts PASS/FAIL/PARTIAL/UNVERIFIABLE lines within the AC Walkthrough section — a bullet line containing "PASS" in the Findings section does not inflate the count
- AC2: computeStaleness normalizes confidence by file touch frequency — a file touched in 48% of entries requires significantly more subsequent touches to reach "high confidence" than a file touched in 2% of entries
- AC3: exitError is defined once (factory or shared function) and consumed by close, promote, and strengthen — no duplicated error-handling logic
- AC4: FAIL result rejection in work.ts exists in exactly one location, not two
- AC5: Recovery-path finding count uses the same computation as the main path (computeChainHealth or shared helper)
- AC6: Zero-run JSON output calls computeFirstPassRate([]) instead of hardcoding defaults
- AC7: Summary truncation applies consistently in health, promote, and strengthen displays
- AC8: Audit headline distinguishes actionable findings (risk/debt severity OR scope/promote action) from monitoring findings
- AC9: `ana proof lesson <ids...> --reason "..."` sets findings to status 'lesson' with git commit — same UX pattern as close
- AC10: Learn template lines 68 and 159 no longer contain language that encourages batch closure of accept-action findings

## Edge Cases & Risks
- **parseACResults section extraction:** Verify reports might lack the `## AC Walkthrough` heading (malformed reports from early pipeline runs). The fix must handle missing section gracefully — fall back to current behavior (full content) rather than returning 0.
- **Staleness normalization:** Edge case where total_entries is very small (< 5). Frequency calculation becomes unstable. Consider a minimum-entries threshold before normalization kicks in.
- **exitError factory:** The promote version references `availableSkills` (computed before exitError). The factory needs to accept command-specific hint data without becoming a god function.
- **Lesson command:** Must not allow setting `status: 'lesson'` on findings already promoted or closed — same guards as close.
- **Dual FAIL guard removal:** The guard at :750 runs inside the proof chain write flow. The guard at :1150 is multi-phase validation. If the multi-phase guard is removed, single-phase flows still need protection. Verify both paths share an upstream check.

## Rejected Approaches
- **Delete the staleness detector entirely.** The concept is sound — knowing when a finding's file was subsequently modified is valuable signal. The problem is the threshold, not the feature. Normalization preserves value while fixing signal-to-noise.
- **Inline exitError everywhere.** Could replace the copies with direct console.error calls. But the pattern (read chain, format error, provide hints, exit) is complex enough that duplication guarantees drift. A factory is foundation.
- **Separate scopes for bugs vs. cleanup vs. new command.** These share one disease: proof commands grew incrementally without consolidation. Splitting loses the framing and creates artificial dependencies between scopes.

## Open Questions
- The findings table includes `proof-health-v1-C5` (worsening label misleading) and `audit-json-severity-summary-C1` (unknown severity silently dropped). The Think prompt lists them but provides no detailed write-up. Plan should investigate: what does "worsening label misleading" mean in context of the trend computation at proofSummary.ts:699? What does "silently dropped" mean for unclassified severity in the audit aggregation?

## Exploration Findings

### Patterns Discovered
- `proofSummary.ts:199-212`: parseACResults runs regex against full content, no section scoping
- `proofSummary.ts:1078-1141`: computeStaleness uses raw subsequent_count >= 3 for "high" confidence with no frequency normalization
- `proof.ts:578, :869, :1234`: Three exitError definitions, identical structure, different command names and hint maps
- `work.ts:750, :1150`: Identical FAIL rejection messages, identical error text, identical suggested commands
- `work.ts:1020-1023`: Manual `for` loop counting findings vs `computeChainHealth()` at :906
- `proof.ts:1777`: Hardcoded `{ first_pass_count: 0, total_runs: 0, first_pass_pct: 100, total_caught: 0 }` instead of calling `computeFirstPassRate([])`
- `ana-learn.md:68`: Still contains "all accept-action findings" phrasing that reinforces batch framing
- `ana-learn.md:159`: "Accept-action findings are pre-classified for closure" — causes rubber-stamping

### Constraints Discovered
- [TYPE-VERIFIED] parseACResults (proofSummary.ts:199) — regex is `/^\s*-\s+.*\bPASS\b/gm` applied to raw content string, no section extraction
- [TYPE-VERIFIED] computeFirstPassRate (proofSummary.ts:900-924) — returns `{ first_pass_count, total_runs, first_pass_pct, total_caught }` and handles empty array by returning pct=100
- [TYPE-VERIFIED] exitError promote variant (proof.ts:864-866) — references `availableSkills` local variable computed before the factory; factory must accept this as parameter
- [OBSERVED] Hot file touch rates — work.ts 48%, proof.ts 36%, proofSummary.ts 34% of entries
- [OBSERVED] 3/44 verify reports have parseACResults false matches (verified against completed plans)

### Test Infrastructure
- `packages/cli/tests/commands/proof.test.ts`: Large test file covering proof subcommands (close, promote, strengthen, health, audit, stale). Test fixtures include proof_chain.json with known entries.
- `packages/cli/tests/utils/proofSummary.test.ts`: Unit tests for computation functions including computeStaleness, parseACResults

## For AnaPlan

### Structural Analog
`proof.ts:565-800` (the close subcommand) — structural analog for the lesson command. Same variadic IDs, `--reason` option, branch check, finding lookup, status mutation, git commit. Lesson is close with `status: 'lesson'` instead of `status: 'closed'`.

### Relevant Code Paths
- `packages/cli/src/utils/proofSummary.ts:199-212` — parseACResults (the bug)
- `packages/cli/src/utils/proofSummary.ts:1078-1141` — computeStaleness (false positives)
- `packages/cli/src/utils/proofSummary.ts:900-924` — computeFirstPassRate (what zero-run should call)
- `packages/cli/src/commands/proof.ts:565-800` — close subcommand (lesson analog)
- `packages/cli/src/commands/proof.ts:578, 869, 1234` — three exitError copies
- `packages/cli/src/commands/proof.ts:1770-1783` — zero-run hardcoded defaults
- `packages/cli/src/commands/work.ts:750-755` — FAIL guard #1
- `packages/cli/src/commands/work.ts:1148-1155` — FAIL guard #2
- `packages/cli/src/commands/work.ts:1015-1025` — recovery-path manual counting
- `templates/.claude/agents/ana-learn.md:68, 159` — accept-action language

### Patterns to Follow
- parseACResults fix approach: Extract the section between `## AC Walkthrough` and the next `## ` heading via indexOf/slice, then run the existing regex on that substring. Fall back to full content if heading not found.
- `proof.ts:565-800` (close) — the lesson command clones this exactly with one status value changed.

### Known Gotchas
- The promote exitError variant needs `availableSkills` which is a local computed before the helper. The factory pattern must accommodate per-command context without becoming a dumping ground.
- Staleness normalization changes what `ana proof stale` reports. Existing tests assert specific findings as high/medium confidence — they'll need updating to reflect normalized thresholds.
- The lesson command must be registered in the proof command group and included in `--help` output. Commander registration order affects help display.

### Things to Investigate
- What does `proof-health-v1-C5` ("worsening label misleading") mean concretely? Is the issue that "worsening" sounds alarming when risks/run went from 0.1 to 0.2 (both near-zero)? Or that the half-split comparison is too sensitive?
- What does `audit-json-severity-summary-C1` ("unknown severity silently dropped") mean? The audit code maps `'—'` to `'unclassified'` (proof.ts:1654) — is there a path where a finding has no severity field at all and gets excluded from counts?
- For the exitError factory: should it return a function (closure pattern) or be a direct call with all params? The closure captures proofChainPath/useJson once — cleaner callsites. But promote needs availableSkills in its hints. Evaluate whether a hints-map parameter to the factory covers all three variants cleanly.

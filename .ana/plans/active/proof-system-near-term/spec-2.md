# Spec: Proof System Near-Term — Phase 2: Learn Template Update

**Created by:** AnaPlan
**Date:** 2026-05-05
**Scope:** .ana/plans/active/proof-system-near-term/scope.md

## Approach

One edit to the Reference/Commands section of the Learn template. The section currently lists commands without guidance on when to use each. After this change, it includes the new commands (lesson, context, audit filters) and a prescriptive "when to use which" guide that tells Learn how to compose them.

The stale positioning fix is also in this section — the stale command description currently implies findings ARE resolved. It should say findings COULD be resolved and need verification.

Both files must be updated: the template (`packages/cli/templates/.claude/agents/ana-learn.md`) and the dogfood copy (`.claude/agents/ana-learn.md`). The dogfood copy is the live version for this project. The template is what `ana init` installs for users.

## Output Mockups

The Reference/Commands section after the edit:

```markdown
**Commands:**
- `ana proof health --json` — proof chain overview (trajectory, hot modules, candidates)
- `ana proof audit --json` — active findings list (truncated to 3 per file group)
- `ana proof audit --json --full` — all active findings without truncation
- `ana proof audit --severity risk,debt` — filter by severity (comma-separated)
- `ana proof audit --entry {slug}` — filter to findings from a specific pipeline run
- `ana proof context {files...}` — findings and build concerns for specific files, active only by default
- `ana proof stale` — findings whose referenced files were modified by subsequent pipeline runs. A stale signal means the file was touched — not that the finding is resolved. Always verify before closing.
- `ana proof stale --json` — structured staleness output
- `ana proof lesson C1 C2 --reason "{reason}"` — record as institutional lesson: verified, real, but not actionable now
- `ana proof close C1 C2 C3 --reason "{reason}"` — close findings (variadic)
- `ana proof promote C1 C2 --skill {name} --text "{rule}"` — promote to skill rule (variadic)
- `ana proof strengthen C1 C2 --skill {name} --reason "{reason}"` — commit skill edit + mark promoted (variadic)
- `ana work status` — pipeline state check

**When to use which:**
- **Session start:** `--severity risk,debt` to identify deep review targets
- **Lesson candidates:** `--severity observation` for findings that are real but not actionable
- **Post-ship review:** `--entry {slug}` after a scope ships to see its findings in isolation
- **Full picture:** `--full` when the truncated top 3 per file isn't enough
- **File-focused triage:** `context {files}` when working on specific modules
- **Stale candidates:** `stale` for findings that COULD be resolved — always verify with a code read before closing
```

## File Changes

### `packages/cli/templates/.claude/agents/ana-learn.md` (modify)
**What changes:** Replace the existing Reference/Commands section (lines 489–498) with the expanded version that includes lesson, context, audit filter commands, the when-to-use guide, and repositioned stale description.
**Pattern to follow:** The existing command list format — `- \`command\` — description`. Extend with the "When to use which" subsection.
**Why:** Learn currently doesn't know about `lesson`, `context`, or audit filters. Without the when-to-use guide, Learn must guess which filter to apply in which situation.

### `.claude/agents/ana-learn.md` (modify)
**What changes:** Same edit as above — sync the dogfood copy.
**Pattern to follow:** Identical content to the template.
**Why:** The dogfood copy is what Learn reads in this project. If only the template is updated, this project's Learn sessions don't benefit.

## Acceptance Criteria

- [ ] AC12: Learn template Reference section includes `ana proof lesson` with description: record as institutional lesson — verified, real, but not actionable
- [ ] AC13: Learn template Reference section includes `ana proof context {files...}` with description: findings and build concerns for specific files, active only by default
- [ ] AC14: Learn template Reference section includes audit filter usage: `--severity risk,debt` to filter by severity, `--entry {slug}` to filter by pipeline run
- [ ] AC15: Learn template Reference section includes a "when to use which" guide that prescribes: `--severity risk,debt` at session start for deep review targets, `--severity observation` for lesson candidates, `--entry {slug}` after a scope ships to see its findings, `--full` when truncated top 3 isn't enough, `context {files}` for file-focused triage, `stale` for candidates that COULD be resolved (not conclusions — always verify before closing)
- [ ] AC16: Learn template positions stale findings as "could be stale" — candidates for investigation, not conclusions. A stale signal means the file was touched, NOT that the finding is resolved
- [ ] AC17: All existing tests pass

## Testing Strategy

- **No new tests required.** This is a template content change. The existing test suite verifies that template files are copied correctly during init — that coverage is sufficient.
- **Manual verification:** Read both files after the edit to confirm the content matches the mockup above and that no surrounding content was accidentally modified.

## Dependencies

Phase 1 must be complete — the template documents commands (`--severity`, `--entry`, `lesson`) that Phase 1 creates.

## Constraints

- The edit is confined to the Reference/Commands section. Do not modify other sections of the template (Structured Triage, Staleness Detection, Close Reason Standards, etc.) — those sections have their own stale references that are contextually correct.
- Both files must have identical Reference/Commands sections after the edit.

## Gotchas

- **Template path is `packages/cli/templates/`, not top-level `templates/`.** There is no top-level templates directory. The template lives at `packages/cli/templates/.claude/agents/ana-learn.md`.
- **Dogfood copy is `.claude/agents/ana-learn.md` at the repo root.** This is the live agent definition for this project. Editing only the template has no effect on the current project's Learn sessions.
- **Don't touch the Staleness Detection section.** Lines 165-180 discuss staleness detection in the context of triage workflow. The stale positioning fix (AC16) only applies to the Reference/Commands section where `stale` is listed as a command. The triage section already says "staleness is a signal, not proof of resolution" at line 180 — that's correct as-is.

## Build Brief

### Rules That Apply
- Every character earns its place — no filler, no redundant descriptions
- Match the system's display language — inline counts, not tables

### Pattern Extracts

**Current Reference/Commands section (packages/cli/templates/.claude/agents/ana-learn.md:489-498):**
```markdown
**Commands:**
- `ana proof health --json` — proof chain overview (trajectory, hot modules, candidates)
- `ana proof audit --json` — active findings list (truncated to 3 per file group)
- `ana proof audit --json --full` — all active findings without truncation
- `ana proof stale` — findings with staleness signals from subsequent pipeline runs
- `ana proof stale --json` — structured staleness output
- `ana proof close C1 C2 C3 --reason "{reason}"` — close findings (variadic)
- `ana proof promote C1 C2 --skill {name} --text "{rule}"` — promote to skill rule (variadic)
- `ana proof strengthen C1 C2 --skill {name} --reason "{reason}"` — commit skill edit + mark promoted (variadic)
- `ana work status` — pipeline state check
```

### Proof Context
No active proof findings for the template files.

### Checkpoint Commands

- After template edit: `cd packages/cli && pnpm vitest run` — Expected: all 1866+ tests pass (template content changes don't break tests, but verify no accidental damage)
- Lint: `pnpm run lint`
- Diff check: `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` should show only differences outside the Reference section (the dogfood copy may have project-specific content in other sections)

### Build Baseline
- Current tests: 1866 passed, 2 skipped (94 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected same test count (no new tests for template content)
- Regression focus: none — template content changes don't affect test behavior

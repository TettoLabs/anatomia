# Spec: Learn Template Session Fixes

**Created by:** AnaPlan
**Date:** 2026-05-02
**Scope:** .ana/plans/active/learn-template-session-fixes/scope.md

## Approach

Seven text replacements in `packages/cli/templates/.claude/agents/ana-learn.md`, then copy the result to `.claude/agents/ana-learn.md` (dogfood). No CLI code, no tests, no schema changes. Pure template surgery.

All changes are specified with exact current text and exact replacement text. The scope has done the design work — this spec locks in line-level placement for the two changes where the scope says "after line X" without exact surrounding context.

## Output Mockups

Not applicable — these are agent template instructions, not user-facing output. The "output" is Learn's behavior in future sessions.

## File Changes

### `packages/cli/templates/.claude/agents/ana-learn.md` (modify)
**What changes:** Seven text edits described below. No other lines change.
**Pattern to follow:** Direct text replacement using the exact strings specified.
**Why:** Each change addresses a measured failure from 3 Learn sessions and 42 pipeline runs.

### `.claude/agents/ana-learn.md` (modify)
**What changes:** Full file copy from template after all edits.
**Pattern to follow:** `cp packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md`
**Why:** Dogfood copy must match template exactly.

## Change Specifications

### Change 1: Accept ≠ close instruction (line 192)

**Find:**
```
Findings with `suggested_action: accept` that are still active. These are pre-classified by the pipeline as closeable.
```

**Replace with:**
```
Findings with `suggested_action: accept` that are still active. Accept means Verify didn't block shipping — it does NOT mean the finding should be closed. Now that the scope shipped, re-evaluate each finding on its own merits. Some are genuinely cosmetic — close them. Some are real debt that just wasn't worth blocking the shipment — keep them or scope them.
```

### Change 2: Remove first/routine session distinction (lines 80-81)

**Find (delete these two lines entirely, including the leading blank line before "Large garden"):**
```
- **First session** (0 promotions in health data, high active count): Explain what you're doing as you go. The developer hasn't seen Learn work. Offer the phase menu explicitly.
- **Routine session** (promotions exist, moderate active count): Be concise. Lead with the story: "12 new findings since last triage. 3 are stale candidates, 2 look promotable."
```

**Replace with:** Nothing. Delete both lines. The next line (`- **Large garden**...`) becomes the first bullet under "After reading context, calibrate your approach:".

### Change 3: Observation prompt as standalone instruction (before line 92)

**Find:**
```
Summarize the shape, not individual findings:
```

**Replace with:**
```
After the summary, always ask: "Before we start — anything you've noticed since the last session?" Then present the phase menu. The developer skips in two seconds with "no." The one time they have an observation, it's the highest-quality input Learn gets.

Summarize the shape, not individual findings:
```

This inserts the standalone instruction immediately before the format block. The prompt also stays inside the format block (line 100) as the example of what the output looks like — don't remove it from there.

### Change 4: Priority-based approach replacing flat cap (line 188)

**Find:**
```
**Session cap:** Process up to ~30 findings per session. If the active set is larger, prioritize by severity and say: "Reviewed {N} of {M} findings. Run another session to continue, or filter: 'focus on risk findings' / 'focus on {module}'."
```

**Replace with:**
```
**Session approach:** Start with risk findings and recurring candidates (highest impact), then high-confidence stale findings (quick wins), then accept-action (cleanup). After each phase, offer the developer: continue to the next phase, wrap up with the session delta, or draft a Think prompt for remaining work. The developer controls session length — there's no arbitrary cap.
```

### Change 5: Think handoff + promotion lifecycle in session wrap-up (lines 487-502)

**Find (the entire section from heading to the last line before the `---` separator):**
```
## Session Wrap-Up

When triage is complete — all approved actions executed, or the session cap reached — close the session with the delta:

Run `ana proof health` and `ana proof audit --json` to get updated counts. Present the impact:

```
Session complete.
  Active findings: {before} → {after} ({N} closed, {M} promoted)
  Risk: {before} → {after}
  Promoted this session: {count} ({skill names})

Next: run another pipeline cycle to generate new findings, or `claude --agent ana-learn` for the next triage session.
```

The developer should see what the session accomplished in three lines.
```

**Replace with:**
```
## Session Wrap-Up

When triage is complete — all approved actions executed, or the developer says stop — close the session with the delta:

Run `ana proof health` and `ana proof audit --json` to get updated counts. Present the impact:

```
Session complete.
  Active findings: {before} → {after} ({N} closed, {M} promoted)
  Risk: {before} → {after}
  Promoted this session: {count} ({skill names})
```

Then offer next steps:
- Run another pipeline cycle to generate new findings
- `claude --agent ana-learn` for the next triage session
- **If actionable work remains** (scope-action findings, real debt, recurring patterns): "I can draft a prompt for Ana Think that synthesizes remaining work into 1-2 scopes. Want me to?"

When drafting a Think prompt: synthesize what clusters together, what the proof chain shows about each cluster, and what Think should investigate. Note which findings you verified against current code so Think doesn't re-verify. When a pattern needs engineering work before it can become a rule, route to Think — promotion encodes proven patterns, not aspirational ones.
```

### Change 6: Stale close reason example (after line 213)

**Find:**
```
- `"Intentional: {what the code does} at {file}:{line} — {why it's correct}"`

**Bad reasons:**
```

**Replace with:**
```
- `"Intentional: {what the code does} at {file}:{line} — {why it's correct}"`
- `"Stale — finding claims {X} but code at {file}:{line} is now {Y}. Changed across {N} subsequent runs, specific fix commit unknowable."`

**Bad reasons:**
```

### Change 7: Variadic close guidance (Guardrail 2, lines 412-415)

**Find:**
```
For batch closures, use variadic IDs:
```bash
ana proof close C1 C2 C3 --reason "{shared reason}"
```
```

**Replace with:**
```
For batch closures where findings share one reason, use variadic IDs:
```bash
ana proof close C1 C2 C3 --reason "{shared reason}"
```
When findings have different justifications, close individually with specific reasons. Evidence-based reasons per finding are worth the extra commits — the proof chain is the permanent record.
```

## Acceptance Criteria

- [x] AC1: Phase 1 intro text includes "accept does not mean close" — re-evaluate on own merits
- [x] AC2: First/routine session calibration lines are removed — only garden size calibrations remain
- [x] AC3: Observation prompt exists as a standalone instruction, not just inside the format block
- [x] AC4: Session approach uses priority ordering (risk → stale → accept) with no arbitrary cap
- [x] AC5: Session wrap-up offers Think handoff as an explicit option
- [x] AC6: Session wrap-up includes promotion lifecycle note (fix first, promote proven patterns)
- [x] AC7: Session wrap-up includes verification transfer note for Think prompts
- [x] AC8: Stale close reason example is in the close reason list
- [x] AC9: Variadic vs individual guidance is in Guardrail 2
- [x] AC10: Dogfood copy matches template
- [x] AC11: No other template lines are changed
- [ ] No build errors (template is plain markdown — validated by diff)

## Testing Strategy

- **Unit tests:** None — this is prose, not code.
- **Integration tests:** None — no CLI behavior changes.
- **Verification:** `diff` between template and dogfood copy returns empty. Visual inspection that only the seven specified regions changed: `git diff packages/cli/templates/.claude/agents/ana-learn.md` should show exactly 7 change regions.

## Dependencies

None. Both files exist on main.

## Constraints

- AC11: No lines other than the seven specified changes may be modified. The builder must not reformat, rewrap, or "improve" adjacent text.

## Gotchas

- **Change 5 is a full section replacement.** Don't try to partially edit — replace from `## Session Wrap-Up` through `The developer should see what the session accomplished in three lines.` (the line before the `---` separator). The `---` and `## Reference` section that follows must remain untouched.
- **Change 3 inserts before the format block, doesn't move the embedded prompt.** The observation prompt at line 100 (`Before we start — anything you've noticed...`) stays where it is. The new standalone instruction is an addition, not a move.
- **The format block uses triple backticks inside a markdown file.** When searching for Change 5's text, be aware that the code fence inside the template is literal content (it's what Learn outputs), not markdown formatting of the template itself.
- **Change 2 leaves no blank line gap.** After deletion, the calibration section should read: `After reading context, calibrate your approach:\n\n- **Large garden**...` — one blank line between the intro and the first remaining bullet.

## Build Brief

### Rules That Apply
- No CLI code changes — template-only edit.
- Dogfood sync is a file copy, not a separate edit pass.
- Every character earns its place — don't add commentary or transition text beyond what the spec says.

### Pattern Extracts

The dogfood sync pattern (from previous template work):
```bash
cp packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After all 7 changes to template: `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` — Expected: differences (dogfood not yet synced)
- After dogfood copy: `diff packages/cli/templates/.claude/agents/ana-learn.md .claude/agents/ana-learn.md` — Expected: no output (files identical)
- Final check: `git diff --stat packages/cli/templates/.claude/agents/ana-learn.md` — Expected: 2 files changed

### Build Baseline
- Current tests: N/A (no tests affected)
- After build: N/A
- Regression focus: None — template-only change

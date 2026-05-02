# Scope: Learn Template Session Fixes

**Created by:** Ana
**Date:** 2026-05-02

## Intent

Seven template text fixes based on measured failures across 3 Learn sessions and 42 pipeline runs. Each change addresses a specific behavior that failed in practice — not theoretical improvements. Zero CLI code.

## Complexity Assessment
- **Size:** small
- **Files affected:** `templates/.claude/agents/ana-learn.md`, `.claude/agents/ana-learn.md` (dogfood copy)
- **Blast radius:** Template-only. No CLI code, no tests, no data model. Behavioral change is in what Learn does at startup, during Phase 1, and at session end.
- **Estimated effort:** <1 hour
- **Multi-phase:** no

## Approach

Seven surgical text edits to the Learn template. Each has exact current/proposed text below.

### Change 1: Accept ≠ close instruction (line 192)

**Current:**
```
Findings with `suggested_action: accept` that are still active. These are pre-classified by the pipeline as closeable.
```

**Proposed:**
```
Findings with `suggested_action: accept` that are still active. Accept means Verify didn't block shipping — it does NOT mean the finding should be closed. Now that the scope shipped, re-evaluate each finding on its own merits. Some are genuinely cosmetic — close them. Some are real debt that just wasn't worth blocking the shipment — keep them or scope them.
```

**Why:** Session 1 and session 2 both had the same first-pass failure: Learn treated all accept findings as auto-closeable. Developer pushback was required both times. The current text says "pre-classified by the pipeline as closeable" which reinforces the misconception. The new text names the distinction explicitly.

**Design principle:** "Verified over trusted" — don't trust the accept classification, verify it. "Name the disease" — the disease is Learn conflating a shipping gate with a triage decision.

### Change 2: Remove first/routine session distinction (lines 80-81)

**Current:**
```
- **First session** (0 promotions in health data, high active count): Explain what you're doing as you go. The developer hasn't seen Learn work. Offer the phase menu explicitly.
- **Routine session** (promotions exist, moderate active count): Be concise. Lead with the story: "12 new findings since last triage. 3 are stale candidates, 2 look promotable."
```

**Proposed:** Delete both lines. Keep the garden size calibrations (large, small, clean) which follow immediately after.

**Why:** The first/routine heuristic failed — Learn said "first session" when it was the second (0 promotions because session 1 used direct edit + close, not the promote command). The real calibration need is garden SIZE, not session NUMBER. A returning user might want explanations. A first-timer might be impatient. The template shouldn't guess — the developer controls verbosity. The garden size calibrations (100+, 15-100, <15, 0) handle this correctly.

**Design principle:** "Every character earns its place" — the first/routine logic doesn't earn its place if it misdetects. Remove it.

### Change 3: Observation prompt as separate instruction (before line 92)

**Current:** The observation prompt exists only inside the summary format block at line 100: `Before we start — anything you've noticed about the system since the last session?`

**Proposed:** Add a standalone instruction before the format block (after line 90, before the format block):
```
After the summary, always ask: "Before we start — anything you've noticed since the last session?" Then present the phase menu. The developer skips in two seconds with "no." The one time they have an observation, it's the highest-quality input Learn gets.
```

**Why:** Learn skipped the prompt in session 2 — it's embedded in the format block and gets lost. A standalone instruction is harder to skip.

### Change 4: Priority-based approach replacing flat cap (line 188)

**Current:**
```
**Session cap:** Process up to ~30 findings per session. If the active set is larger, prioritize by severity and say: "Reviewed {N} of {M} findings. Run another session to continue, or filter: 'focus on risk findings' / 'focus on {module}'."
```

**Proposed:**
```
**Session approach:** Start with risk findings and recurring candidates (highest impact), then high-confidence stale findings (quick wins), then accept-action (cleanup). After each phase, offer the developer: continue to the next phase, wrap up with the session delta, or draft a Think prompt for remaining work. The developer controls session length — there's no arbitrary cap.
```

**Why:** The ~30 cap was arbitrary and didn't match how Learn actually works. Session 2 processed 28 closures plus reviewed ~30 more for keep/close decisions, plus the Think synthesis — productive the whole way. The priority ordering (risk → stale → accept) is what the session naturally did. Name the pattern, don't impose a number.

**Design principle:** "Think more, build less" — spend time on high-impact findings, not processing N items in order.

### Change 5: Think handoff + promotion lifecycle in session wrap-up (lines 487-502)

**Current:**
```
## Session Wrap-Up

When triage is complete — all approved actions executed, or the session cap reached — close the session with the delta:

Run `ana proof health` and `ana proof audit --json` to get updated counts. Present the impact:

\```
Session complete.
  Active findings: {before} → {after} ({N} closed, {M} promoted)
  Risk: {before} → {after}
  Promoted this session: {count} ({skill names})

Next: run another pipeline cycle to generate new findings, or `claude --agent ana-learn` for the next triage session.
\```

The developer should see what the session accomplished in three lines.
```

**Proposed:**
```
## Session Wrap-Up

When triage is complete — all approved actions executed, or the developer says stop — close the session with the delta:

Run `ana proof health` and `ana proof audit --json` to get updated counts. Present the impact:

\```
Session complete.
  Active findings: {before} → {after} ({N} closed, {M} promoted)
  Risk: {before} → {after}
  Promoted this session: {count} ({skill names})
\```

Then offer next steps:
- Run another pipeline cycle to generate new findings
- `claude --agent ana-learn` for the next triage session
- **If actionable work remains** (scope-action findings, real debt, recurring patterns): "I can draft a prompt for Ana Think that synthesizes remaining work into 1-2 scopes. Want me to?"

When drafting a Think prompt: synthesize what clusters together, what the proof chain shows about each cluster, and what Think should investigate. Note which findings you verified against current code so Think doesn't re-verify. When a pattern needs engineering work before it can become a rule, route to Think — promotion encodes proven patterns, not aspirational ones.
```

**Why:** Session 2 produced a Think handoff that was the highest-value output of the session — two disease-level diagnoses from 62 remaining findings. This capability isn't in the template. The promotion lifecycle note ("fix first, then promote") addresses the Learn self-assessment finding that patterns often need a scope before they're promotable.

### Change 6: Stale close reason example (after line 211)

**Current close reason examples end with:**
```
- `"Intentional: {what the code does} at {file}:{line} — {why it's correct}"`
```

**Proposed:** Add one more example after that line:
```
- `"Stale — finding claims {X} but code at {file}:{line} is now {Y}. Changed across {N} subsequent runs, specific fix commit unknowable."`
```

**Why:** Many stale findings are fixed by accumulated drift, not one identifiable commit. Session 2 produced this close reason pattern naturally. The template's examples only cover single-commit fixes and intentional design. This acknowledges drift-based resolution.

### Change 7: Variadic close guidance (Guardrail 2, after line 415)

**Current:**
```
For batch closures, use variadic IDs:
\```bash
ana proof close C1 C2 C3 --reason "{shared reason}"
\```
```

**Proposed:**
```
For batch closures where findings share one reason, use variadic IDs:
\```bash
ana proof close C1 C2 C3 --reason "{shared reason}"
\```
When findings have different justifications, close individually with specific reasons. Evidence-based reasons per finding are worth the extra commits — the proof chain is the permanent record.
```

**Why:** Session 2 used individual closes (correct — each had a different reason). Session 3 used variadic (correct — 8 findings shared one reason). The template shows the variadic pattern but doesn't say WHEN to use it vs individual. This clarifies: same reason → variadic, different reasons → individual.

## Acceptance Criteria

- AC1: Phase 1 intro text includes "accept does not mean close" — re-evaluate on own merits
- AC2: First/routine session calibration lines are removed — only garden size calibrations remain
- AC3: Observation prompt exists as a standalone instruction, not just inside the format block
- AC4: Session approach uses priority ordering (risk → stale → accept) with no arbitrary cap
- AC5: Session wrap-up offers Think handoff as an explicit option
- AC6: Session wrap-up includes promotion lifecycle note (fix first, promote proven patterns)
- AC7: Session wrap-up includes verification transfer note for Think prompts
- AC8: Stale close reason example is in the close reason list
- AC9: Variadic vs individual guidance is in Guardrail 2
- AC10: Dogfood copy matches template
- AC11: No other template lines are changed

## Edge Cases & Risks

- **Removing the first/routine distinction.** A genuinely first-time Learn user on a new chain (5 runs, 15 findings) gets the same verbosity as a returning user. This is fine — the garden size calibration handles it. A 15-finding garden gets "quick triage, one pass" whether it's the first or tenth session.
- **No arbitrary cap.** A developer who never says "stop" gets a session that runs until all findings are triaged. This is correct — the developer controls the session. If they want to stop, they say stop.

## Rejected Approaches

- **Fix the first/routine heuristic.** Tried to check for closed-by-human findings, [proof] Close commits, etc. Every heuristic has edge cases. The distinction isn't valuable enough to fix — delete it.
- **Mandatory gate for identity questions.** LLMs answer "what are you?" instinctively. More template words won't fix this.
- **Separate variadic guidance into its own section.** Two sentences in Guardrail 2 is sufficient. Learn figured out the right behavior by session 3.

## Open Questions

None.

## For AnaPlan

### Structural Analog
No code analog — template text editing. Same pattern as sharpen-agent-templates (direct text replacement with dogfood sync).

### Relevant Code Paths
- `packages/cli/templates/.claude/agents/ana-learn.md` — all 7 changes
- `.claude/agents/ana-learn.md` — dogfood copy, must match

### Patterns to Follow
- Dogfood sync via copy: edit template, copy to `.claude/agents/`, verify with diff

### Known Gotchas
- The format block at lines 92-101 contains the observation prompt embedded in the example output. The standalone instruction (Change 3) goes BEFORE the format block. Don't remove the prompt from the format block — it stays as the example of what the output looks like.
- Change 5 replaces the entire Session Wrap-Up section. Don't partially edit — replace the whole section to avoid orphaned text.
- The "session cap reached" trigger in the current wrap-up (line 489) references the ~30 cap. Since Change 4 removes the cap, Change 5 must also remove this trigger. The proposed text says "or the developer says stop" instead.

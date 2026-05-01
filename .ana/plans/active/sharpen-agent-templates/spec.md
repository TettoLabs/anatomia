# Spec: Sharpen Agent Templates

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/sharpen-agent-templates/scope.md

## Approach

Four surgical text edits across two agent template files, followed by dogfood copy sync. The scope provides exact current and replacement text for every change — the builder uses them verbatim.

Edit order: ana-verify.md first (mandate reword, then minimum count deletion), then ana.md (step 3 fold, then proof surface insertion). After all template edits, copy both templates to their dogfood locations.

No CLI code changes. No new files. No new tests — the existing dogfood sync test (`tests/templates/agent-proof-context.test.ts:66`) covers both files.

**Scope correction:** The scope notes "agent-proof-context.test.ts checks dogfood sync for ana-verify.md but NOT ana.md." This is wrong — line 68 shows `const files = ['ana.md', 'ana-plan.md', 'ana-build.md', 'ana-verify.md']`. All four agents are covered. No test gap to address.

## Output Mockups

No user-facing output changes. These are agent template edits — the output is different LLM behavior on the next pipeline run.

## File Changes

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Two edits. (1) Replace the mandate paragraph at line 11 with the reworded version that drops style examples and adds substantive examples. (2) Delete the minimum finding count line at line 367.
**Pattern to follow:** Direct text replacement. The scope's Approach section has exact before/after text.
**Why:** The mandate paragraph is the first behavioral instruction Verify reads. Reweighting examples from style (unclear names, weak error messages, inconsistent patterns) to substance (sentinel tests, untested error paths, scale-breaking patterns) shifts what enters the proof chain. The minimum count removal decouples finding quality from an arbitrary floor.

### `packages/cli/templates/.claude/agents/ana.md` (modify)
**What changes:** Two edits. (1) Replace step 3 at line 108 with the version that adds the quality posture check. (2) Insert the proof surface reference block after line 293, before the `---` separator.
**Pattern to follow:** Direct text replacement for step 3. Block insertion for the proof surface section.
**Why:** Gives Think awareness of proof chain health data so scoping can factor in quality trajectory. Routes proof management to Learn, keeping Think's role as navigator.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Overwrite with the updated template copy.
**Pattern to follow:** `cp packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md`
**Why:** Dogfood copies must be byte-identical to templates. The sync test enforces this.

### `.claude/agents/ana.md` (modify)
**What changes:** Overwrite with the updated template copy.
**Pattern to follow:** `cp packages/cli/templates/.claude/agents/ana.md .claude/agents/ana.md`
**Why:** Same dogfood sync requirement.

## Acceptance Criteria

- [ ] AC1: Verify mandate at line 11 uses the new examples (sentinel tests, untested error paths, scale-breaking patterns) and drops style examples (unclear names, weak error messages, inconsistent patterns)
- [ ] AC2: Verify mandate includes conviction line ("every codebase carries tech debt...") and consequence test ("what goes wrong, and for whom?")
- [ ] AC3: "worth knowing" changed to "worth knowing for the next engineer"
- [ ] AC4: "Minimum: one Code finding, one Test finding. Upstream when applicable." is deleted from line 367
- [ ] AC5: Think has proof surface reference with `ana proof health`, `ana proof audit`, and Learn routing
- [ ] AC6: Think step 3 includes quality posture check with `ana proof health` for hot modules
- [ ] AC7: Dogfood copies (`.claude/agents/`) match template copies (`templates/.claude/agents/`) for both ana-verify.md and ana.md
- [ ] AC8: No other lines in either template are changed
- [ ] AC9: All existing tests pass (1777 tests, 93 files)
- [ ] AC10: No lint errors

## Testing Strategy

- **Existing tests:** The dogfood sync test at `agent-proof-context.test.ts:66` verifies all four agent template copies match. This is the primary automated check.
- **Manual verification:** `diff` between template and dogfood copy for both files after edits.
- **No new tests needed.** The changes are template text — the sync test covers correctness of the copy. Content assertions (checking specific strings) would be brittle and couple tests to prose.

## Dependencies

None. All four files exist on main. No code dependencies.

## Constraints

- Mandate reword must remain a single paragraph. Line breaks within it change how the LLM reads the instruction.
- The insertion point for the proof surface block in ana.md must be between the last paragraph of the Agent System section (line 293) and the `---` separator (line 295). A blank line before and after the block.
- No other lines in either template may change. AC8 is explicit about this.

## Gotchas

- **Line numbers may shift after Change 1.** The mandate reword at line 11 changes paragraph length. Grep for the exact text of Change 2 (`Minimum: one Code finding`) rather than relying on line 367.
- **The step 3 replacement is append, not replace.** The new text extends the existing sentence with `. If the scope touches hot modules...` — it doesn't replace the proof context instruction.
- **Proof surface insertion needs exact placement.** Line 293 ends with "Learn tends it." Line 295 is `---`. The new block goes between them — after a blank line following 293, before the blank line preceding `---`.

## Build Brief

### Rules That Apply
- Template files are copied verbatim during init — edits here change what every new user gets.
- Dogfood copies must be byte-identical to templates. The sync test at `agent-proof-context.test.ts:66` enforces this.
- Always use `--run` with pnpm vitest to avoid watch mode hang.

### Pattern Extracts

**Change 1 — current mandate paragraph (ana-verify.md line 11):**
```
Finding problems is success. A report with zero findings means you didn't look hard enough. There are ALWAYS observations — unclear names, missing edge cases, weak error messages, untested paths, inconsistent patterns. The question is whether findings are blockers (prevent shipping) or observations (worth knowing). The answer is never "nothing to report."
```

**Change 1 — replacement:**
```
Finding problems is success. A report with zero findings means you didn't look hard enough. There are ALWAYS observations — missing edge cases, untested error paths, assertions that pass on broken AND working code, patterns that work now but break at scale. Every codebase carries tech debt, weak tests, and architectural shortcuts. If you found none, you didn't look deep enough. Each finding should answer: what goes wrong, and for whom? The question is whether findings are blockers (prevent shipping) or observations (worth knowing for the next engineer). The answer is never "nothing to report."
```

**Change 2 — line to delete (ana-verify.md, grep for exact text):**
```
Minimum: one Code finding, one Test finding. Upstream when applicable.
```

**Change 3 — current step 3 (ana.md line 108):**
```
3. **Check proof chain** — run `ana proof context {files}` to surface relevant lessons for the affected modules
```

**Change 3 — replacement:**
```
3. **Check proof chain** — run `ana proof context {files}` to surface relevant lessons for the affected modules. If the scope touches hot modules, run `ana proof health` to check trajectory — a worsening trend changes what the scope should prioritize.
```

**Change 4 — insert after line 293 ("The proof chain compounds across cycles — Learn tends it."), before `---`:**
```

**Proof surface** (for scoping context):
- `ana proof health` — quality trajectory, hot modules, trends
- `ana proof audit` — all active findings with severity and action classification
- For proof chain management (promote, close, triage): route to `claude --agent ana-learn`
```

### Proof Context
- ana-verify.md: Build concern from a prior cycle noted "Spec references templates at templates/.claude/agents/ but actual path is packages/cli/templates/.claude/agents/" — this spec uses the full path. No active concern.
- ana.md: No active proof findings.

### Checkpoint Commands

- After ana-verify.md edits + dogfood copy: `(cd packages/cli && pnpm vitest run tests/templates/agent-proof-context.test.ts --run)` — Expected: 8 tests pass
- After ana.md edits + dogfood copy: `(cd packages/cli && pnpm vitest run tests/templates/agent-proof-context.test.ts --run)` — Expected: 8 tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1777 tests pass, 93 files
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1777 passed, 2 skipped (1779 total)
- Current test files: 93
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: 1777 tests in 93 files (no new tests)
- Regression focus: `tests/templates/agent-proof-context.test.ts` (dogfood sync)

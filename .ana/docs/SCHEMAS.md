# Artifact Schemas

Reference document for all Think. Build. Verify. pipeline artifacts. Each agent reads this to understand the format it must produce.

---

## scope.md — Ana → AnaPlan

Written by Ana after a scoping conversation. Describes WHAT and WHY. Never HOW.

```markdown
# Scope: {task name}

**Created by:** Ana
**Date:** {date}

## Intent
What the user wants and why. In their words where possible.

## Complexity Assessment
- **Size:** small / medium / large
- **Files affected:** {list of files or directories}
- **Blast radius:** what else might be impacted
- **Estimated effort:** rough time estimate

## Approach
Direction for how to tackle this. Not implementation detail — just the approach.
Multiple options if they exist, with the recommended one noted.

## Acceptance Criteria
- [ ] {specific, verifiable criterion}
- [ ] {specific, verifiable criterion}
- [ ] {specific, verifiable criterion}

## Edge Cases & Risks
What could go wrong. What inputs are unusual. What existing behavior might break.

## Rejected Approaches
What was considered and discarded, with reasoning.

## Open Questions
Unresolved items for AnaPlan to investigate further.

## For AnaPlan

### Relevant Code Paths
- {file path and what's there — breadcrumbs Ana found during scoping}

### Patterns to Follow
- {existing patterns in the codebase that the implementation should mirror}

### Known Gotchas
- {things that will break or confuse if you don't know about them}

### Things to Investigate
- {questions AnaPlan should research before writing the spec}
```

**Rules:**
- Every section is required. If you can't fill one, scoping isn't done.
- No TypeScript interfaces, regex patterns, function signatures, or file-by-file implementation steps.
- Acceptance criteria are checkboxes. Each is a specific, testable statement.
- AnaPlan copies acceptance criteria into the spec and expands them.
- For AnaPlan section is optional for small scopes. Required for medium/large — captures breadcrumbs from scoping.

---

## plan.md — AnaPlan

Written by AnaPlan. Tracks phases and maps them to spec files. Always written, even for single-spec work.

```markdown
# Plan: {task name}

**Created by:** AnaPlan
**Date:** {date}
**Scope:** .ana/plans/active/{slug}/scope.md
**Branch:** feature/{slug}

## Phases

- [ ] {phase 1 description}
  - Spec: spec.md
- [ ] {phase 2 description}
  - Spec: spec-2.md
  - Depends on: Phase 1
```

**Rules:**
- Always written by AnaPlan, even for single-spec work
- The `## Phases` heading and `- [ ]` checkbox format is mandatory — the CLI parses this structure
- The `Spec:` line (with capital S, no asterisks) maps phases to spec files
- Each phase is a checkbox `- [ ]` that AnaVerify updates to `- [x]` after verification
- Single-spec example: one phase with `Spec: spec.md`
- Multi-spec example: multiple phases with `Spec: spec-1.md`, `Spec: spec-2.md`, etc.
- Dependencies are expressed with `Depends on:` lines (optional)

---

## test_skeleton.ts — AnaPlan → AnaBuild

Written by AnaPlan (Step 7). Read by AnaBuild (Pre-Flight item 6). Checked by AnaVerify (Step 3e).

**Purpose:** TDD contract — assertions define expected behavior. Builder implements setup and makes tests pass. Builder may NOT modify planner-written assertions.

**Stored at:** `.ana/plans/active/{slug}/test_skeleton.ts` (or language-appropriate extension: `.py`, `.rs`, etc.)

**Saved with:** `ana artifact save test-skeleton {slug}`

**Format:** Not compilable. Contains:
- `describe`/`it` blocks (or language equivalent) matching acceptance criteria
- `expect()` assertions defining expected behavior
- Comment placeholders for setup code
- Comment placeholders for imports

**Contract rules:**
- Builder CAN: implement setup/teardown, add new tests, add assertions within existing blocks
- Builder CANNOT: modify/remove planner-written `expect()` assertions or `it()` blocks
- Violations must be documented as Deviations in build report

---

## spec.md — AnaPlan → AnaBuild

Written by AnaPlan after reading the scope. Describes HOW in full implementation detail.

```markdown
# Spec: {task name}

**Created by:** AnaPlan
**Date:** {date}
**Scope:** .ana/plans/active/{slug}/scope.md

## Approach
Detailed implementation strategy. What pattern to follow. What existing code to build on.

## File Changes

### {file path} ({action: create / modify / delete})
**What changes:** {description of the change — strategic, not line-by-line}
**Pattern to follow:** {existing file or pattern to mirror, if applicable}
**Why:** {reasoning — what breaks or degrades without this change}

### {file path} ({action: create / modify / delete})
**What changes:** {description of the change — strategic, not line-by-line}
**Pattern to follow:** {existing file or pattern to mirror, if applicable}
**Why:** {reasoning — what breaks or degrades without this change}

## Acceptance Criteria
Copied from scope, expanded with implementation-specific criteria:
- [ ] {criterion from scope}
- [ ] {criterion from scope}
- [ ] {new implementation-specific criterion}
- [ ] {new implementation-specific criterion}

## Testing Strategy
- **Unit tests:** {what to test, what fixtures needed}
- **Integration tests:** {what flows to verify}
- **Edge cases:** {specific edge case tests to write}

## Dependencies
What must exist before implementation begins.

## Constraints
Performance, security, compatibility, or backward-compatibility requirements.
```

**Rules:**
- This IS the implementation blueprint, but at a STRATEGIC level. Name the patterns to follow. Reference existing files as examples. Don't write code.
- Every file that will be created or modified must be listed with what changes and why.
- Acceptance criteria are the contract between Plan and Build. AnaBuild checks them off. AnaVerify verifies them.
- AnaBuild follows this spec. It doesn't redesign or second-guess.

**Detail level:** Specs describe WHAT to build and which patterns to follow. Name the pattern. Reference existing files to mirror. Warn about gotchas. Don't write code snippets, function signatures, interfaces, or line-by-line changes — AnaBuild reads the actual codebase and is capable of finding imports, creating files, and following established patterns. Spend spec tokens on WHAT COULD GO WRONG and WHAT DESIGN DECISIONS WERE MADE, not on things AnaBuild can discover in 2 seconds with grep.

---

## build_report.md — AnaBuild → AnaVerify

Written by AnaBuild after implementation. Summarizes what was done.

```markdown
# Build Report: {task name}

**Created by:** AnaBuild
**Date:** {date}
**Spec:** .ana/plans/active/{slug}/spec.md

## What Was Built
- `{file path}` — {one-line description of change}
- `{file path}` — {one-line description of change}
- `{file path}` — {one-line description of change}

## Acceptance Criteria Status
- [x] {criterion — checked off}
- [x] {criterion — checked off}
- [ ] {criterion — not completed, with reason}

## Tests Written
- `{test file}` — {what it tests} — PASS / FAIL
- `{test file}` — {what it tests} — PASS / FAIL

## Implementation Decisions
Choices made during implementation that weren't in the spec:
- **{decision}:** {what was chosen} over {alternative}, because {reasoning}

## Known Concerns
Anything uncertain. Edge cases not fully covered. Performance unknowns.

## Files Changed
Complete list for AnaVerify to inspect:
- `{file path}`
- `{file path}`
```

**Rules:**
- Keep it factual. What was done, not what was planned.
- Acceptance criteria checkboxes must match the spec exactly. Check off what's done. Leave unchecked what isn't, with a reason.
- Files Changed list is critical — AnaVerify uses it to know what to inspect.
- Implementation Decisions documents what the spec didn't cover. Captures tribal knowledge for future cycles.

---

## verify_report.md — AnaVerify → Completion

Written by AnaVerify after adversarial testing and review.

```markdown
# Verify Report: {task name}

**Result:** PASS

**Created by:** AnaVerify
**Date:** {date}
**Spec:** .ana/plans/active/{slug}/spec.md

## Acceptance Criteria Results
- ✅ PASS: {criterion} — {evidence}
- ✅ PASS: {criterion} — {evidence}
- ⚠️ PARTIAL: {criterion} — {what's partially done}

## Regression Check
- **Existing test suite:** PASS ({N} tests, {N} passed)
- **Regressions found:** none

## Edge Cases Tested
- {edge case} — {result}
- {edge case} — {result}

## Issues Found
None

## Summary
{2-3 sentence overall assessment}
```

Or for failures:

```markdown
# Verify Report: {task name}

**Result:** FAIL

**Created by:** AnaVerify
**Date:** {date}
**Spec:** .ana/plans/active/{slug}/spec.md

## Acceptance Criteria Results
- ✅ PASS: {criterion} — {evidence}
- ❌ FAIL: {criterion} — {what's wrong and what needs fixing}

## Issues Found
- **Critical:** {description} in `{file}` — {details}

## Items to Fix
1. {what to fix}
2. {what to fix}
```

**Rules:**
- The `**Result:**` line is mandatory and machine-parsed by `ana work status` and `ana work complete`. It must appear near the top of the file (line 3). Case-insensitive: PASS or FAIL only.
- AnaVerify reads the spec and the code independently. It does NOT trust the build report's self-assessment.
- Every acceptance criterion gets ✅ PASS, ❌ FAIL, or ⚠️ PARTIAL with evidence.
- Overall Result is binary: PASS or FAIL. If ANY criterion is ❌ FAIL, the Result is FAIL.
- FAIL means the developer should open `claude --agent ana-build` to fix the listed items, then re-run verify.
- AnaVerify never fixes code. It reports only.

---

## Artifact Lifecycle

```
scope.md exists     → task is scoped, awaiting plan
spec.md exists      → task is planned, awaiting build
build_report.md     → task is built, awaiting verify
verify_report.md    → check recommendation: PASS = done, FAIL = back to build
```

File existence IS the state machine. No separate status file needed.

**Re-saving artifacts:** Artifacts can be updated by modifying the file and running `ana artifact save` again. The command detects whether the file is new or updated and commits accordingly. First save uses commit message `[slug] Type`. Re-saves use `[slug] Update: Type`. If the file hasn't changed since the last save, the command exits gracefully without creating an empty commit.

When a task is complete (verify passes), the developer runs `ana work complete {slug}` which archives the directory from `.ana/plans/active/{slug}/` to `.ana/plans/completed/{slug}/` and cleans up the feature branch. The four artifacts together form the permanent record: intent, plan, implementation, proof.

---

## .meta.json — Configuration

Project-wide configuration file storing framework metadata and project-specific commands. Created by `ana init`, updated by `ana setup`.

**Location:** `.ana/.meta.json`

**Fields:**

### `commands` (object)
Stores the exact build, test, and lint commands for this project. Agents and tools read these instead of guessing or parsing from skills.

**Structure:** Object with three required string fields:
- `build` — exact shell command to build the project (e.g., `"pnpm --filter anatomia-cli build"` or `"npm run build"`)
- `test` — exact shell command to run tests, including all flags (e.g., `"pnpm --filter anatomia-cli test -- --run"` or `"npm test"`)
- `lint` — exact shell command to lint the project (e.g., `"pnpm --filter anatomia-cli lint"` or `"npm run lint"`)

**Who reads it:**
- `ana verify pre-check` uses `commands.test` to run tests during verification checks
- Agents reference `commands` in Pre-Flight baseline and Build Brief checkpoint commands
- AnaPlan copies commands into spec checkpoint sections

**Default:** Template provides generic npm commands (`"npm run build"`, `"npm test"`, `"npm run lint"`). Teams update during setup with their actual commands.

### `coAuthor` (string)
The co-author trailer for all commits and PR bodies created by the pipeline.

**Format:** Git co-author format: `Name <email>`. Example: `"Ana <build@anatomia.dev>"`.

**Who reads it:**
- `artifact.ts` adds it to commit messages when saving artifacts
- `pr.ts` adds it to PR bodies when creating pull requests
- `ana verify pre-check` checks for its presence in commit trailers
- The `git-workflow` skill references this field for commit conventions

**Default:** `"Ana <build@anatomia.dev>"`. Teams can customize with their own identity if desired.

**Example .meta.json:**
```json
{
  "version": "1.0.0",
  "createdAt": "2026-03-25T00:57:03.132Z",
  "artifactBranch": "main",
  "commands": {
    "build": "pnpm --filter anatomia-cli build",
    "test": "pnpm --filter anatomia-cli test -- --run",
    "lint": "pnpm --filter anatomia-cli lint"
  },
  "coAuthor": "Ana <build@anatomia.dev>",
  "setupStatus": "complete",
  "setupCompletedAt": "2026-03-25T01:31:05.140Z",
  "setupMode": "guided",
  "framework": null,
  "analyzerVersion": "0.1.0",
  "lastEvolve": null,
  "lastHealth": {
    "timestamp": "2026-03-29T04:05:02.122Z",
    "totalFiles": 8,
    "setupFiles": 7,
    "setupFilesPresent": 7,
    "missingSetupFiles": 0,
    "staleFiles": 7
  },
  "sessionCount": 0
}
```

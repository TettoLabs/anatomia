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

## Exploration Findings

Optional for small scopes — encouraged for medium and large. Structured breadcrumbs from codebase exploration that help the planner skip redundant file reads.

### Patterns Discovered
- {file: what pattern, which lines}
(Facts about how things work in the codebase.)

### Constraints Discovered
- {file: data structure or existing contract that must be matched}
(Mandatory — implementation must match or deliberately evolve these.)

### Test Infrastructure
- {test file: what helpers exist, how tests are structured}
(What the planner needs for the test skeleton.)

## For AnaPlan

### Structural Analog
Name the file that is the closest structural match to what you're building and explain why. Required field — forces exploration and gives AnaPlan an explicit starting point.

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

## Output Mockups
Examples of what the user will see: command output, error messages, JSON structure. For commands: actual terminal output with real examples. For APIs: request/response examples. Placed near the top — the builder reads top-to-bottom and mockups define user-visible behavior.

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

## Gotchas
Things that will break or confuse AnaBuild if not flagged upfront. Edge cases, known quirks, compatibility concerns.

## Build Brief
Curated context for the builder — specific rules, patterns, and commands for THIS build. The builder reads this instead of loading full skill files. Contains:
- **Rules That Apply** — 5-10 relevant rules from coding-standards, testing-standards, design-principles
- **Pattern Extracts** — 10-30 lines of code from the structural analog (existing code only, never new code)
- **Checkpoint Commands** — exact commands from `.meta.json` `commands` field with expected results
- **Build Baseline** — current test count, expected after build, regression focus areas
```

**Rules:**
- This IS the implementation blueprint, but at a STRATEGIC level. Name the patterns to follow. Reference existing files as examples. Don't write code.
- Every file that will be created or modified must be listed with what changes and why.
- Acceptance criteria are the contract between Plan and Build. AnaBuild checks them off. AnaVerify verifies them.
- AnaBuild follows this spec. It doesn't redesign or second-guess.

**Detail level:** Specs describe WHAT to build and which patterns to follow. Name the pattern. Reference existing files to mirror. Warn about gotchas. Don't write code snippets, function signatures, interfaces, or line-by-line changes — AnaBuild reads the actual codebase and is capable of finding imports, creating files, and following established patterns. Spend spec tokens on WHAT COULD GO WRONG and WHAT DESIGN DECISIONS WERE MADE, not on things AnaBuild can discover in 2 seconds with grep.

---

## build_report.md — AnaBuild → AnaVerify

Written by AnaBuild after implementation. Documents what was built, how, and what the verifier needs to know.

**Location:** `.ana/plans/active/{slug}/build_report.md` (or `build_report_N.md` for multi-phase)

**Sections (in order):**

### What Was Built
Summary of changes made. File paths with one-line descriptions of what was created, modified, or deleted.

### PR Summary
3-5 bullet points summarizing the change for a PR description. Extracted by `ana pr create` for the PR body. Write for a reviewer who hasn't read the spec.

### Acceptance Criteria Coverage
Maps every acceptance criterion to test evidence: AC ID → test file:line → assertion count. Every criterion must appear. If no test exists, state why. If a test was weakened, note here AND in Open Issues.

### Implementation Decisions
Technical choices made during the build that the spec didn't explicitly cover. Which patterns followed, which approaches considered, with reasoning.

### Deviations from Spec
Structured format per deviation:
- **Deviation D1: {Title}** with 6 required fields: Spec said / What I did / Why / Alternatives considered / Coverage impact / Test skeleton impact
- If skeleton assertion was modified, that is ALWAYS a deviation
- "None — spec followed exactly." if truly none

### Test Results
Baseline (before changes), after changes, comparison. Complete test runner output with counts. New tests written with descriptions of what scenarios they cover.

### Verification Commands
Exact commands for AnaVerify to run independently. Commands from `.meta.json` `commands` field.

### Git History
Git log output showing commits made on the feature branch.

### Open Issues
Anything unfinished, concerning, or needing attention. Forced second pass: "What did I notice that I didn't write down?" Must explain if "None." An item followed by "None" is a contradiction.

**Rules:**
- Build report is proof, not claims. Test output pasted, not summarized. Git history is real, not described.
- Acceptance criteria coverage maps each AC to specific test evidence with line numbers.
- Deviations use structured D1/D2/D3 format with all 6 fields.
- AnaVerify independently verifies all claims — the report must survive that scrutiny.

---

## verify_report.md — AnaVerify → Completion

Written by AnaVerify after independent verification. The final quality gate before PR creation.

**Location:** `.ana/plans/active/{slug}/verify_report.md` (or `verify_report_N.md` for multi-phase)

**Result line:** `**Result:** PASS` or `**Result:** FAIL` — mandatory, machine-parsed by `ana artifact save verify-report`. Must appear in the first 10 lines. Case-insensitive.

**Sections (7 total):**

### Pre-Check Results
Output from `ana verify pre-check {slug}` (or with `--phase N` for multi-phase). Contains skeleton assertion diff, file changes audit, and commit analysis. Verifier investigates each DIFFER and unexpected file flag.

### Independent Findings
What the verifier discovered from running checks and reading code. Code quality, pattern compliance, edge case handling, test quality. Includes:
- **Over-building check:** Code, parameters, or features NOT in the spec
- **YAGNI check:** Unused exports, dead code paths, unnecessary abstractions

### AC Walkthrough
Every acceptance criterion from the spec, individually assessed: ✅ PASS, ❌ FAIL, ⚠️ PARTIAL, or 🔍 UNVERIFIABLE. Each with evidence (command output, file path, line number).

### Blockers
Anything preventing shipping. If none: explain what was searched and why nothing was found.

### Callouts
Observations, concerns, nits. Always populated — a report with zero callouts indicates insufficient investigation.

### Deployer Handoff
What the person merging should know. Always populated.

### Verdict
**Shippable:** YES / NO based on verifier's findings. Evidence gathered. Commands run.

**Rules:**
- The `**Result:**` line is mandatory and machine-parsed by `ana work status` and `ana work complete`.
- AnaVerify runs mechanical checks first (`ana verify pre-check`), forms independent findings from reading code and running commands.
- **The verifier never reads the build report.** The build report goes on the PR for the human reviewer.
- The developer compares the verify report to the build report — two independent accounts of the same work.
- Every acceptance criterion must be assessed individually with evidence.
- Overall Result is binary: PASS or FAIL. If ANY criterion is ❌ FAIL, the Result is FAIL.
- Over-building (extra code beyond spec) is noted as a callout, not a FAIL.
- Live testing required: if the build includes CLI commands or user-facing output, run it with real data plus error cases.
- FAIL means the developer opens `claude --agent ana-build` to fix the documented issues, then re-verify.
- AnaVerify creates the PR on PASS. The developer reviews and merges.

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

**Batch saves:** `ana artifact save-all {slug}` saves all recognized artifacts in the plan directory atomically. Validates each artifact before committing. If any validation fails, nothing is saved. Commit message lists all artifact types saved.

**Artifact validation:** Each artifact type has format validation at save time. Validation runs before git commit — if it fails, nothing is staged. The `--force` flag skips validation.

Validation rules by type:
- **Scope:** ≥3 acceptance criteria, Structural Analog heading, Intent section with content
- **Spec:** file_changes YAML block present, Build Brief heading present, Build Baseline exact (warns on `~` or `approx`)
- **Plan:** Phases heading, checkbox items, each checkbox has Spec: reference
- **Test skeleton:** At least one assertion (`expect()` or `assert`), non-empty file
- **Build report:** Deviations heading, Open Issues heading, AC Coverage heading, PR Summary heading
- **Verify report:** Result line (`**Result:** PASS` or `**Result:** FAIL`) in first 10 lines

**Pre-check tool format support:** `ana verify pre-check` handles both production and legacy formats:
- Skeleton assertions: tries uncommented `expect()` first (production AnaPlan format), falls back to `// expect()` (legacy/test format)
- YAML blocks: supports code-fenced format (`<!-- MACHINE-READABLE: ... -->\n```yaml...````) and legacy HTML comment format

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
- AnaVerify reads `commands` to execute build/test/lint during verification (Step 2)
- AnaBuild reads `commands` for Pre-Flight baseline checks
- AnaPlan reads `commands` to populate spec Build Brief checkpoint commands

No toolbelt code reads `commands` programmatically — agents read `.meta.json` directly and use the command strings.

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

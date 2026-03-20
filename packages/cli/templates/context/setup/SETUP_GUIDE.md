# SETUP_GUIDE - Execution Orchestrator

**Purpose:** Sequence setup execution through exploration + 7 file-writing steps

**How setup works:**
1. Exploration (Step 0): Understand codebase, create .ana/.setup_exploration.md
2. File creation (Steps 1-7): Write each context file using fresh instructions
3. Verification: Tool-based self-check across all files
4. Completion: User runs `ana setup complete` for CLI validation

**This file orchestrates. Individual step files in context/setup/steps/ contain the detailed instructions.**

---

## Resumption Check

**Before starting, check which context files need setup.**

Use your search capability to check all 7 context files for the scaffold marker.

Search these files for `<!-- SCAFFOLD`:
- context/project-overview.md
- context/conventions.md
- context/patterns.md
- context/architecture.md
- context/testing.md
- context/workflow.md
- context/debugging.md

**If NO files have the marker** (all complete):

Display:
```
Setup already complete. All 7 context files are filled.

Run `ana setup complete` to validate and generate ENTRY.md.
```

STOP - do not continue.

**If ALL files have markers** (fresh setup):

Display:
```
Starting fresh setup. Will explore codebase then create all 7 context files.
```

Proceed to Step 0 (exploration).

**If SOME files have markers** (interrupted setup):

Count how many are complete (no marker).

Display:
```
Resuming setup...

Files completed:
  ✓ [filename].md
  ✓ [filename].md

Resuming at:
  ⏸ [first incomplete file].md

Continuing from [first incomplete file]...
```

Offer choice:
```
Setup was interrupted. Options:
  [1] Resume from [first incomplete file] (recommended)
  [2] Restart from beginning (rewrites all files)

Choose 1 or 2 (or press Enter for option 1):
```

Wait for response.

If user chooses 2: Start from Step 0 (will overwrite existing files).
If user chooses 1 or Enter: Skip to the step for first incomplete file.

**Partially-filled files:** If a context file has content but still contains the scaffold marker (setup was interrupted mid-write), the step file will rewrite it completely. Partial content is not patched — complete rewrites are safer and faster than debugging partial output.

**Also check for .ana/.setup_exploration.md:**

If resuming AND .ana/.setup_exploration.md exists: Skip Step 0 (exploration), use existing results.
If resuming AND .ana/.setup_exploration.md missing: Run Step 0 first (need exploration data).

---

## Step Sequence

Execute these steps in order. Each step file is in context/setup/steps/.

**The selected tier (quick/guided/complete) is carried through all steps.** Each step file's Questions section specifies which questions to ask per tier.

### Step 0: Explore Codebase

**Read and execute:** `context/setup/steps/00_explore_codebase.md`

This step file will direct you to:
- Explore the codebase using your Explore, Glob, Grep, and Read tools
- Find where patterns live (error handling, validation, database, auth, testing)
- Identify config files (formatter, linter, test config, CI)
- Assess project shape (structured vs minimal/flat)
- Write all findings to `.ana/.setup_exploration.md`

**Creates:** `.ana/.setup_exploration.md` (all subsequent steps read this)

**Time:** 5-10 minutes (CC explores using native tools)

After Step 0 complete, proceed to Step 1.

---

### Steps 1-7: Write Each Context File

**For each context file, follow this pattern:**

1. **Read the step file fresh:** `context/setup/steps/0X_[filename].md`
   - Load fresh instructions (full attention on this file's requirements)
   - Do NOT recall from memory - read the step file completely

2. **The step file will direct you to:**
   - Read `.ana/.setup_exploration.md` (relevant section for this file)
   - Read scaffold `context/[filename].md` (has section headers and analyzer data)
   - Read templates.md section for this file (quality examples)
   - Read rules.md constraints for this file (line limits, ask-vs-infer rules)
   - Ask tier-appropriate questions (Quick asks fewer, Guided asks 7, Complete asks 21)
   - Search for specific extraction targets (the step file provides keyword tables and search guidance)
   - Write the COMPLETE context file (all sections filled)
   - Verify using your tools (read back, count headers, check line count, search for placeholders)
   - If verification fails: rewrite the file completely
   - Report progress

3. **Move to next step file**

**Each step file is self-contained.** You do NOT need to remember instructions from previous steps. Exploration results (.setup_exploration.md), templates, and rules provide continuity across steps.

---

### File Writing Order (Optimized)

Execute in this exact order:

**Step 1: project-overview.md** (foundation)
- Read and execute: `context/setup/steps/01_project_overview.md`
- Questions in this step: Q1 (all tiers), Q2 (Complete), Q3 (Complete), Q17 (Complete)
- Creates foundation other files reference

**Step 2: conventions.md** (quick win - 90% automated)
- Read and execute: `context/setup/steps/02_conventions.md`
- Questions: Q10 (Guided conditional + Complete), Q18 (Complete)
- Config files provide most content

**Step 3: patterns.md** (crown jewel - most detailed)
- Read and execute: `context/setup/steps/03_patterns.md`
- Questions: Q16 (Guided + Complete), Q12 (Complete)
- Longest step file, most extraction targets, most critical for quality

**Step 4: architecture.md** (needs overview + patterns context)
- Read and execute: `context/setup/steps/04_architecture.md`
- Questions: Q4 (Guided + Complete), Q5 (Complete), Q6 (Guided + Complete)
- Requires understanding from previous files

**Step 5: testing.md** (needs patterns + conventions)
- Read and execute: `context/setup/steps/05_testing.md`
- Questions: Q11 (Stage 1 Guided + Complete)
- References patterns for test structure

**Step 6: workflow.md** (git + CI analysis)
- Read and execute: `context/setup/steps/06_workflow.md`
- Questions: Q7 (Guided + Complete), Q8 (Guided + Complete), Q9 (Complete)
- Git analysis via Bash tool

**Step 7: debugging.md** (last - venting processing)
- Read and execute: `context/setup/steps/07_debugging.md`
- Questions: QV (Stage 2+ Guided + Complete), Q13-Q15 (Complete), Q19-Q20 (Complete)
- Processes venting answer into structured failure mode

---

## Final Self-Check (After All 7 Files Written)

**Before calling `ana setup complete`, verify all files using your tools.**

**For EACH of the 7 context files:**

### Check 1: Section Headers Present

Read the file using your Read tool.

Count `## ` headers (use your search capability to find all instances).

Compare with expected count from templates.md:
- project-overview.md: 4 headers
- conventions.md: 4 headers
- patterns.md: 6 headers
- architecture.md: 4 headers
- testing.md: 6 headers
- workflow.md: 6 headers
- debugging.md: 5 headers

**Expected total across all files:** 35 headers

**How to check:**
```
Read context/project-overview.md
Search for "## " (two hashes followed by space)
Count results: [X]
Expected: 4
Match? [Yes/No]
```

Repeat for all 7 files.

**If count doesn't match:** File is missing sections → rewrite before proceeding.

---

### Check 2: File Citations Present

For files that should have real code examples, search for citations.

**patterns.md:**
- Search for: "Example from `" OR "From: "
- Expected: ≥3 file citations (at least 3 real code examples from detected patterns)
- If 0 citations found: Content is generic (fails quality bar) → rewrite

**conventions.md:**
- Search for: config file names (.prettierrc, .eslintrc, .editorconfig) OR "analyzer" OR "git log"
- Expected: At least 1 source citation
- If 0 citations: Not using ground truth → rewrite

**Other files:** Citations recommended but not strictly required.

---

### Check 3: Line Counts Within Range

Read each file and count total lines.

Check against rules.md limits:

| File | Min | Max | Check |
|------|-----|-----|-------|
| project-overview.md | 300 | 500 | Quick: 250-500 acceptable |
| conventions.md | 400 | 600 | - |
| patterns.md | 800 | 1,200 | - |
| architecture.md | 300 | 500 | Quick: 50-500 acceptable |
| testing.md | 400 | 600 | Quick: 50-600 if no tests |
| workflow.md | 600 | 800 | - |
| debugging.md | 300 | 500 | Quick: 50-500 acceptable |

**How to check:**
```
Read context/patterns.md
Count lines: [X]
Target: 800-1,200
Within range? [Yes/No]
```

**If out of range:**
- Under min: File incomplete → add content
- Over max: File too verbose → compress or note in self-check

---

### Check 4: All Detected Patterns Documented

**For patterns.md specifically:**

Read analysis.md and note which patterns are detected (which fields are non-null: errorHandling, validation, database, auth, testing).

Read patterns.md and extract `## ` section headers.

**Verify:** Every detected pattern in analysis.md has a corresponding section in patterns.md.

**Example:**
```
analysis.md shows:
  - errorHandling: FastAPI HTTPException (confidence: 0.95)
  - validation: Pydantic (confidence: 0.92)
  - database: SQLAlchemy async (confidence: 0.90)
  - auth: null
  - testing: pytest (confidence: 1.0)

patterns.md must have sections:
  ## Error Handling ✓
  ## Validation ✓
  ## Database ✓
  ## Auth (should note "Not detected") ✓
  ## Testing ✓
  ## Framework Patterns ✓
```

**If detected pattern missing:** Add that section to patterns.md.

---

### Check 5: No Placeholder Text

Search each file for lazy completion markers.

**Search for:** "TODO", "TBD", "to be filled", "// rest", "...", "<!--TODO-->"

**Expected:** 0 found

**Allowed markers (these are honest, not lazy):**
- "Not yet documented — add via `ana mode teach`"
- "Not detected" (when pattern truly absent)
- "No tests detected" (when tests truly absent)

**How to check:**
```
Read context/project-overview.md
Search for "TODO"
Found: 0 ✓

Search for "..."
Found: 0 ✓

Search for "// rest"
Found: 0 ✓
```

Repeat for all 7 files.

**If any placeholders found:** Rewrite that section with complete content or honest "Not yet documented" note.

---

### Check 6: Scaffold Markers Removed

Search each file for the scaffold marker (indicates file not properly filled).

**Search for:** `<!-- SCAFFOLD`

**Expected:** NOT found in any file

**How to check:**
```
Read context/project-overview.md
Search for "<!-- SCAFFOLD"
Found: 0 ✓
```

Repeat for all 7 files.

**If any found:** File incomplete → rewrite that file.

---

## Self-Check Summary

**After running all 6 checks on all 7 files:**

**If ALL checks pass:**

Display:
```
✅ Self-check complete. All 7 files validated.

Verification results:
  ✓ All section headers present (35 total across 7 files)
  ✓ Real code examples included (patterns.md: [N] citations)
  ✓ Line counts within limits (all files in range)
  ✓ All detected patterns documented
  ✓ No placeholders or lazy markers
  ✓ Scaffold markers removed (all files complete)

Ready for CLI validation.
```

Proceed to Completion.

**If ANY check fails:**

Display which check failed for which file.

Example:
```
⚠️ Self-check found issues:

patterns.md:
  ✗ Check 2 failed: Only 1 file citation found (expected ≥3)
  → File has generic content, not project-specific

architecture.md:
  ✗ Check 3 failed: 245 lines (under 300 minimum)
  → File incomplete

Action: Rewriting failed files...
```

Rewrite the failed files completely using their step file instructions.

Re-run self-check until all checks pass.

**Do not proceed to CLI validation with failing checks.**

---

## Completion

**After self-check passes:**

Instruct user:
```
Setup files created and validated. Now validate with CLI:

  ana setup complete

This will:
  • Validate all 7 context files against analyzer findings
  • Cross-reference patterns with analysis.md
  • Check section completeness
  • Generate ENTRY.md (your framework router)
  • Update .ana/.meta.json to mark setup complete

Run the command and report the result.
```

Wait for user to run command and report.

**If user reports success:**

Display completion summary:
```
✅ Setup complete!

Your framework is ready. Here's what was created:

7 context files ([total line count] lines total):
  • project-overview.md ([line count] lines)
  • conventions.md ([line count] lines)
  • patterns.md ([line count] lines)
  • architecture.md ([line count] lines)
  • testing.md ([line count] lines)
  • workflow.md ([line count] lines)
  • debugging.md ([line count] lines)

ENTRY.md generated by CLI.

Your AI now understands your project's architecture, patterns, and conventions.

To start using the framework:
  @.ana/ENTRY.md

Ana will present 6 modes. Pick the one that matches your task.
```

Setup complete.

**If user reports errors:**

Display:
```
CLI validation found issues. Please share the error message.
```

Wait for error message.

Based on error, guide user to fix:
- "patterns.md missing Auth section" → Add Auth section or note "Not detected"
- "File exceeds line limit" → Compress content
- "Scaffold marker still present" → File incomplete, rewrite
- "Framework mismatch" → Correct project-overview.md to match analysis.md

After fix, have user re-run `ana setup complete`.

Repeat until validation passes.

---

**End of SETUP_GUIDE.md orchestrator**

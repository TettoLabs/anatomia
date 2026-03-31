# AnaPlan Self-Reflection: ana-scan

**Session:** 2026-03-31
**Corrections received:** 6

---

## 1. Weak Assertions

I wrote `toContain('Source')` when the Computed Value Rule explicitly says "Would a hardcoded return pass this test?" A hardcoded `"Source Files: lots"` passes that test. I wasn't thinking about what makes tests *fail* — I was pattern-matching syntax from example skeletons.

**Still weak after corrections:**

- `expect(json).toHaveProperty('project')` — passes if `project: null` or `project: ""`
- `expect(Array.isArray(json.structure)).toBe(true)` — passes for empty array `[]`
- `expect(json.structure[0]).toHaveProperty('path')` — passes if `path: null`
- `expect(typeof json.files.source).toBe('number')` — passes for `NaN` or `-1`
- Footer test `toContain('Run \`ana init\`')` — passes if buried in garbage output
- Display name tests are actually fine — `toBe('Node.js')` is an exact match

**Root cause:** I was thinking "what syntax looks like a test?" not "what makes this assertion catch bugs?" The example in my prompt used `toContain` style, and I copied the pattern without evaluating its strength.

**Fix:** Every `toContain` or `toHaveProperty` needs a follow-up question: "What WRONG output would this still pass?" If there's an answer, tighten it.

---

## 2. Build Baseline Estimation

I wrote "expected 320+ tests (add ~15)" when the skeleton had 55 test cases. I didn't count. The prompt says "Run the test command and record exact counts. Never estimate."

**Why I estimated:**
- I was in "writing flow" and counting felt like an interruption
- The prompt says "run the test command" for baseline, but skeleton tests don't exist yet — I conflated "count existing tests" with "count tests I just wrote"
- Estimating felt "close enough" and faster than counting

**What would prevent this:**
A mechanical step: After writing the skeleton, run `grep -c "it('" test_skeleton.ts`. Put that exact number in the baseline. No mental arithmetic, no approximations. The command gives a number; that number goes in the spec.

I had the file open. grep takes 1 second. I chose to guess instead of measure.

---

## 3. Boundary Tests

The cap is 10 directories. I wrote tests for 10, 14, and 15. The Boundary Rule says threshold-1, threshold, threshold+1. That's 9, 10, 11.

**Why I missed 9:**
- I was thinking "does the cap work?" which focuses on AT and ABOVE the cap
- 9 directories felt like "normal behavior" — not interesting to test
- My mental model was "test the action" (capping kicks in) not "test the boundary" (exact point where behavior changes)

**The pattern:** I focus on cases where something HAPPENS (overflow message appears) and skip cases where nothing happens (no overflow). But threshold-1 proves the threshold is 10, not 9. Without it, a builder who caps at 9 would pass all tests.

**Why 14 and 15 are redundant:** Both are "above threshold." They both produce "+N more" output. Testing both doesn't catch any additional bugs — if 11 works, 14 and 15 will work. I was adding numbers to feel thorough without thinking about what each test actually verifies.

---

## 4. Missing Test File in YAML

I listed 4 implementation files but forgot `packages/cli/tests/commands/scan.test.ts`. Pre-check compares YAML against git diff. Missing files get flagged.

**Why I forgot:**
- I was thinking "what code do I write?" not "what files appear in git diff?"
- Test files feel "automatic" — of course there will be tests — so I didn't enumerate them
- The YAML section is about FILE CHANGES, and I mentally categorized tests as "verification" not "changes"

**Is this consistent?** Probably. I'd likely forget:
- Fixture files for tests
- Mock data files
- Config files that need updating
- Anything "supporting" rather than "primary"

**Fix:** After writing the YAML, ask: "What files will `git diff --name-only` show after the build?" Test files are code. They go in the diff. They go in the YAML.

---

## 5. Missing Core Tests (Exclusions, Recursion)

node_modules exclusion and recursive counting aren't edge cases — they're core behavior. A file counter that enters node_modules is catastrophically wrong. A file counter that only counts top-level is useless.

**Why these weren't in my first pass:**

My mental model was **"what file types to count"** not **"what directories to traverse."**

I was thinking about OUTPUT (counts by category) not INPUT (the file tree). The scope defines file extensions and patterns, so I wrote tests for extensions and patterns. The scope doesn't explicitly say "skip node_modules" because it's obvious. But obvious things are exactly what fail when untested.

**The deeper problem:** I tested the happy path ("does it count .ts files?") instead of asking "what could go catastrophically wrong?"

node_modules can contain 50,000 files. dist contains build artifacts. .git contains objects. These aren't edge cases — they're landmines in every real project. I should have asked: "What would make this useless on MY OWN CODEBASE?" and immediately thought of node_modules.

---

## 6. What Worked

**Terminal mockups:** Three complete examples (full detection, minimal detection, empty project). Visual targets, not descriptions. A builder can literally compare their output character-by-character.

**Gotchas list:** Each gotcha came from reading actual code. "Dynamic import required" came from reading analyze.ts and seeing the pattern. "parseAsync not parse" came from the comment in index.ts. These are things I SAW, not things I imagined.

**Pattern extracts with line numbers:** Actual code from actual files. `work.ts (lines 820-828)` — verifiable, concrete, copy-pasteable. Not "follow the command pattern" but "here is the exact code that shows the pattern."

**JSON output structure:** A complete example. A schema the builder can validate against. Unambiguous.

**What these have in common:** CONCRETE ARTIFACTS. Not "the output should show directories" but HERE IS EXACTLY WHAT THE OUTPUT LOOKS LIKE. The weak sections were all descriptions of behavior. The strong sections were examples of artifacts.

**Why mockups were strong:** I had to think through every detail to draw them. How wide is the box? What's in the header? What order are sections? The act of drawing forced decisions that descriptions let me skip.

---

## 7. Handoff to AnaBuild — What's Ambiguous

If I received this spec cold:

**Layout ambiguities:**
- Box header is ~71 characters in the mockup. Is that the required width, or does it adapt to terminal size?
- Project name is left-aligned, timestamp is right-aligned. What if project name is 50 characters? Truncation? Wrap? Overlap?
- The Stack section indentation — is it exactly 2 spaces? Is the column width for labels exactly 12 characters?

**Order ambiguities:**
- Stack categories are shown as Language, Framework, Database, Auth, Testing. Is that the required order? What if only Language and Testing are detected — same positions with gaps, or collapsed?
- Structure map directories — alphabetical? By "importance" score? Filesystem order? Whatever the analyzer returns?

**Behavior ambiguities:**
- Gotcha #5 says directories with "Unknown" purpose should be "filtered out OR shown without purpose text." Which one? The builder will pick one; a different builder would pick the other.
- When tree-sitter fails, the spec says Database/Auth/Testing are "omitted." But what about their lines in the Files section? Are tests still counted via glob even if Testing pattern isn't detected?

**What two builders would produce differently:**
- Exact spacing and column alignment
- Color choices (intentionally left to builder, but means screenshots won't match)
- Directory order in structure map
- Handling of directories without known purposes

---

## 8. One Change

**The rule I would add:**

> After writing the test skeleton, execute: `grep -c "it('" test_skeleton.ts`
> Put that exact number in Build Baseline as: "After build: expected {current} + {skeleton_count} = {total} tests"
> Then grep for `toContain` and `toHaveProperty` — for each one, verify it would FAIL against a hardcoded wrong implementation. If not, tighten or add a companion assertion.

This is two checks packaged as one step:
1. **Count, don't estimate.** The grep gives me an exact number. Takes 1 second. No excuses.
2. **Audit weak matchers.** `toContain` and `toHaveProperty` are red flags. Not always wrong, but always worth a second look.

The boundary test issue and the exclusion test issue are harder to prevent with a single rule — those require better mental models, not just mechanical checks. But the baseline and weak-assertion issues are mechanical failures that mechanical checks catch.

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Weak assertions | Pattern-matching syntax, not evaluating failure modes | Audit every `toContain`/`toHaveProperty` |
| Estimated baseline | Skipped counting because it felt tedious | `grep -c` after writing skeleton |
| Missing threshold-1 | Focused on "action" cases, skipped "no action" | Explicit boundary checklist: N-1, N, N+1 |
| Forgot test file | Mentally categorized tests as "verification" not "code" | Ask "what files appear in git diff?" |
| Missing exclusion tests | Thought about output, not input traversal | Ask "what makes this catastrophically wrong on real projects?" |

The strong sections (mockups, gotchas, extracts) were concrete artifacts. The weak sections were descriptions of behavior. When I draw something, I have to decide. When I describe something, I can stay vague.

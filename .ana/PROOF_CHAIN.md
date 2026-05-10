# Proof Chain Dashboard

77 runs · 183 active · 93 lessons · 0 promoted · 161 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/tests/commands/work.test.ts | 15 | 11 |
| packages/cli/src/commands/work.ts | 15 | 8 |
| packages/cli/tests/commands/proof.test.ts | 11 | 5 |
| website/lib/proof-feed.ts | 10 | 3 |
| packages/cli/tests/commands/artifact.test.ts | 8 | 4 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 183 total)

### .husky/post-merge

- **code:** Post-merge hook uses set -e but wraps build in if-guard — correct now, but fragile if future edits add unguarded commands — *Scope Validation Integrity*

### packages/cli/src/commands/artifact.ts

- **code:** git commit -- uses --only semantics (working tree, not index) — safe because git add and commit are adjacent synchronous calls, but undocumented assumption — *CLI commits scoped to intended paths*
- **code:** Site 2 stages plan.md with absolute path via runGit but tracks relative path in stagedPaths — works correctly but mixed path convention — *CLI commits scoped to intended paths*

### packages/cli/src/commands/work.ts

- **code:** JSON.parse on gh pr view stdout has no try/catch — malformed response crashes — *work complete --merge flag for structured PR merging*
- **code:** getNextAction multi-line return breaks status output formatting — second line lacks indentation and styling — *work complete --merge flag for structured PR merging*
- **code:** Auto-merge enabled path writes plain text to stdout before JSON output — pollutes stdout for --json consumers — *work complete --merge flag for structured PR merging*
- **code:** commitSaves silently swallows commit failures — index.lock or other git errors invisible to user — *Commit timestamps written by work start*
- **code:** commitSaves mixes runGit (throws) and spawnSync (returns status) for git operations — works correctly but inconsistent API usage — *Commit timestamps written by work start*

### packages/cli/templates/.claude/agents/ana-verify.md

- **code:** ana-verify.md wording tweaked — out of scope, harmless formatting change — *Init must surface scan quality and pipeline readiness*

### packages/cli/tests/commands/artifact.test.ts

- **test:** A016 only tests 'Feature' case variant, not 'FIX' — contract says both should be accepted — *Scope Validation Integrity*
- **code:** Console.error capture pattern repeated verbatim in 8 rejection tests — extraction into a helper would reduce duplication — *Scope Validation Integrity*
- **test:** Pre-existing scope validation tests (lines 697-746) still use plain toThrow() without checking error message content — *Scope Validation Integrity*

### packages/cli/tests/commands/init-preflight.test.ts

- **test:** A014 uses toBeGreaterThan(0) — weak assertion when specific count is knowable — *Init must surface scan quality and pipeline readiness*
- **test:** A015 uses toBeGreaterThanOrEqual(3) — specific count should be exactly 3 (user.name, user.email, gh) — *Init must surface scan quality and pipeline readiness*

### packages/cli/tests/commands/init-spinner.test.ts

- **test:** Test files split from init.test.ts into init-spinner.test.ts and init-preflight.test.ts — sound decision for vi.mock isolation but spec said modify init.test.ts only — *Init must surface scan quality and pipeline readiness*

### packages/cli/tests/commands/init.test.ts

- **test:** A018/A019/A020 assert on template source content — violates 'never assert on source code content' rule but acceptable for static templates — *Init must surface scan quality and pipeline readiness*
- **test:** A022 asserts on scan-engine.ts source content — same pattern, acceptable for 'not modified' assertion — *Init must surface scan quality and pipeline readiness*

### packages/cli/tests/commands/work-merge.test.ts

- **test:** No tests verify --json output for any of the 7 merge failure paths — *work complete --merge flag for structured PR merging*
- **code:** New test file work-merge.test.ts not in contract file_changes — reasonable deviation for spawnSync mock isolation — *work complete --merge flag for structured PR merging*

### packages/cli/tests/commands/work.test.ts

- **test:** No integration tests for artifact.ts or proof.ts scoped commit sites — 9 of 14 assertions verified by source inspection only — *CLI commits scoped to intended paths*
- **test:** Test uses toContain('completed/') for path matching — works in controlled test but would false-positive if any other path contained 'completed/' — *CLI commits scoped to intended paths*
- **test:** A020, A021 assert on source code content instead of testing behavior — *work complete --merge flag for structured PR merging*
- **test:** A010 test creates untracked file after commit — doesn't test scoped staging during commit — *Commit timestamps written by work start*
- **test:** A011 no-push test relies on absence of remote as indirect proof — no spy or mock verifying git push not called — *Commit timestamps written by work start*

### website/components/system/Drawer.tsx

- **code:** Drawer sectionRef prop is dead code — defined but never passed by SystemSection — *Section 4 — The System (replace Bento)*

### website/components/system/ManPage.tsx

- **code:** ManPage footer date '2026-05' is a hardcoded string — will go stale monthly — *Section 4 — The System (replace Bento)*

### website/components/system/system.module.css

- **code:** color-mix() CSS function used for hover effects — ~93% browser support, older browsers get no hover feedback — *Section 4 — The System (replace Bento)*

### website/components/system/SystemSection.tsx

- **code:** SystemSection closer does not use SectionThread component — pattern duplication — *Section 4 — The System (replace Bento)*

### website/components/ui/SectionThread.tsx

- **code:** SectionThread breathe prop applies undefined animate-breathe CSS class — no-op if invoked — *Section 4 — The System (replace Bento)*

### website/lib/copy.ts

- **code:** copy.ts systemThread key is defined but never consumed by any component — dead data — *Section 4 — The System (replace Bento)*


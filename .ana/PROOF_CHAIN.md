# Proof Chain Dashboard

78 runs · 188 active · 94 lessons · 0 promoted · 161 closed

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

## Active Findings (30 shown of 188 total)

### packages/cli/src/commands/artifact.ts

- **code:** git commit -- uses --only semantics (working tree, not index) — safe because git add and commit are adjacent synchronous calls, but undocumented assumption — *CLI commits scoped to intended paths*
- **code:** Site 2 stages plan.md with absolute path via runGit but tracks relative path in stagedPaths — works correctly but mixed path convention — *CLI commits scoped to intended paths*

### packages/cli/src/commands/work.ts

- **code:** JSON.parse on gh pr view stdout has no try/catch — malformed response crashes — *work complete --merge flag for structured PR merging*
- **code:** getNextAction multi-line return breaks status output formatting — second line lacks indentation and styling — *work complete --merge flag for structured PR merging*
- **code:** Auto-merge enabled path writes plain text to stdout before JSON output — pollutes stdout for --json consumers — *work complete --merge flag for structured PR merging*
- **code:** commitSaves silently swallows commit failures — index.lock or other git errors invisible to user — *Commit timestamps written by work start*

### packages/cli/src/utils/update-check.ts

- **code:** packageName interpolated via template literal without JSON.stringify in spawn script URL — *Version Awareness Notifications*
- **code:** Four of five exports from update-check.ts are unused in production code — only checkForUpdates is imported — *Version Awareness Notifications*
- **code:** Spawn script uses require() (CommonJS) inside node -e — works but inconsistent with ESM codebase — *Version Awareness Notifications*

### packages/cli/templates/.claude/agents/ana-verify.md

- **code:** ana-verify.md wording tweaked — out of scope, harmless formatting change — *Init must surface scan quality and pipeline readiness*

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

### packages/cli/tests/utils/update-check.test.ts

- **test:** A007 tagged test checks return values not output — contract target is 'output' with not_contains 'Error' — *Version Awareness Notifications*
- **test:** A010 tagged test checks spawn not called — contract target is updateAvailable equals null, which is tested in untagged CI test — *Version Awareness Notifications*

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


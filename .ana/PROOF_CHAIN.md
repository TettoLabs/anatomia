# Proof Chain Dashboard

46 runs · 61 active · 50 lessons · 0 promoted · 132 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/tests/commands/proof.test.ts | 10 | 6 |
| packages/cli/tests/commands/work.test.ts | 9 | 5 |
| packages/cli/src/utils/proofSummary.ts | 6 | 5 |
| packages/cli/src/commands/proof.ts | 5 | 5 |
| packages/cli/src/commands/work.ts | 5 | 3 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 61 total)

### packages/cli/src/commands/proof.ts

- **code:** Unknown severity/action values silently dropped from fixed-key objects — by_severity sum can be less than total_active — *Audit JSON Severity Summary*
- **code:** Zero-run JSON path hardcodes verification defaults inline (proof.ts:1749) rather than calling computeFirstPassRate([]) — duplicate knowledge of default shape — *Proof Health V2*
- **code:** exitError helper duplicated inline in close (~30 lines) and promote (~30 lines) action handlers — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/src/commands/work.ts

- **code:** Untested defensive branches in startWork — 'not a git repo' and 'git pull conflict' paths have no dedicated unit tests — *Proof Health V2*
- **code:** Dual FAIL guard creates maintenance surface — two independent checks for same condition at L776 and L1179 — *Proof Health V2*
- **code:** Multi-phase error lost phase number — generic message no longer identifies which phase failed — *Proof Health V2*

### packages/cli/src/utils/proofSummary.ts

- **code:** `as 'PASS' | 'FAIL'` cast in parseResult relies on regex constraint, not type-level proof — safe but brittle if regex changes — *Clean proofSummary.ts*
- **code:** fileMatches `includes('/')` treats `./census.ts` as directory-qualified — theoretical false negative for dot-slash prefixed paths — *Clean proofSummary.ts*
- **code:** O(n*m) traversal in computeStaleness — nested loop over entries × findings — *Learn V3 — CLI Commands + Template Finalization*
- **code:** PreCheckData interface vestigial — retains assertions/covered/uncovered fields for reading old .saves.json but the code path that used them for assertion bootstrap is deleted — *Remove Pre-Check Tag Coverage*

### packages/cli/templates/.claude/agents/ana-learn.md

- **code:** Residual 'accept-action findings' in audit usage guidance reinforces batch framing — *Learn Severity-Based Triage*
- **code:** 'Accept-action findings are pre-classified for closure' in Field Semantics section perpetuates batch framing language — *Learn Severity-Based Triage*
- **code:** Edge Cases section still says 'Cap at ~30 per session' — contradicts new 'no arbitrary cap' guidance in Session Approach — *Learn Template Session Fixes*

### packages/cli/templates/.claude/agents/ana.md

- **code:** Proof surface block is informational command list without behavioral guidance — *Sharpen Agent Templates*

### packages/cli/tests/commands/init.test.ts

- **code:** Init frontmatter branch groups ana-build, ana-verify, ana-learn together — assumes identical frontmatter, masks divergence if any agent changes — *Fix Type Lies*

### packages/cli/tests/commands/proof.test.ts

- **test:** A008 active-only test uses fixture with only active findings — no closed finding to prove exclusion — *Audit JSON Severity Summary*
- **test:** A013 meta block test uses toBeDefined() — verifies existence not value preservation — *Audit JSON Severity Summary*
- **test:** 5-finding fixture manually duplicated three times across test blocks instead of shared constant — *Audit JSON Severity Summary*
- **test:** A014 cap test uses toBeLessThanOrEqual(5) instead of toBe(5) — passes even if cap logic is broken and returns 0 items — *Proof Health V2*
- **test:** No direct unit tests for computeFirstPassRate or computePipelineStats — only covered through integration tests via runProof(['health']) — *Proof Health V2*
- **test:** A019 not.toContain('Promote') works by coincidence — test data has no promoted findings so 'Promotions' heading also absent; a more targeted regex or exact heading match would be more robust — *Health Display Polish*
- **test:** No test for the staged-only changes path (git diff --cached) — only unstaged changes tested via helper — *Learn V3 — CLI Commands + Template Finalization*
- **test:** toBeDefined() on JSON confidence tiers — verifies existence not structure — *Learn V3 — CLI Commands + Template Finalization*
- **test:** A002 lacks negative proof of active-only counting — fixture has only active findings, no closed finding to prove exclusion — *Proof Command UX*

### packages/cli/tests/commands/work.test.ts

- **test:** A014 nudge check uses specific patterns ('→ claude', '→ ana proof') — a new nudge format would slip through — *Strengthen Weak Test Assertions*
- **test:** UNVERIFIED test creates full project fixture manually instead of using createMergedProject helper — 60 lines vs ~5 lines — *Strengthen Weak Test Assertions*
- **code:** Timestamp recency check (before/after window) in A010 test may flake on extremely slow CI — window depends on test execution speed — *Strengthen Weak Test Assertions*
- **test:** A030 test named 'allows completion with UNKNOWN result' but exercises PASS path — UNKNOWN code path at L785 has no test coverage — *Proof Health V2*

### packages/cli/tests/templates/agent-proof-context.test.ts

- **test:** Dogfood sync test loop short-circuits on first failure, skipping remaining files — now covers 6 files instead of 4, making masking worse — *Fix Type Lies*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** Remaining toBeGreaterThan(0) in proofSummary.test.ts — 21 instances outside this spec's scope still use weak assertions — *Strengthen Weak Test Assertions*


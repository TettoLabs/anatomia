# Proof Chain Dashboard

41 runs · 76 active · 40 lessons · 0 promoted · 103 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/tests/commands/work.test.ts | 11 | 7 |
| packages/cli/src/commands/proof.ts | 11 | 8 |
| packages/cli/tests/commands/proof.test.ts | 11 | 5 |
| packages/cli/src/utils/proofSummary.ts | 8 | 7 |
| packages/cli/src/commands/work.ts | 7 | 5 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 76 total)

### packages/cli/src/commands/proof.ts

- **code:** Zero-run JSON path hardcodes verification defaults inline (proof.ts:1749) rather than calling computeFirstPassRate([]) — duplicate knowledge of default shape — *Proof Health V2*
- **code:** SEVERITY_ORDER constant at proof.ts:49 still duplicated across audit/findings blocks — pre-existing, still present — *Learn V3 — CLI Commands + Template Finalization*
- **code:** exitError helper duplicated inline in close (~30 lines) and promote (~30 lines) action handlers — *Learn V3 — CLI Commands + Template Finalization*
- **code:** Available skills listing in SKILL_NOT_FOUND error is unspecified UX — reasonable but untested — *Learn V3 — CLI Commands + Template Finalization*
- **code:** SEVERITY_ORDER duplication still present across proof.ts — known from proof context, not addressed by this phase — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/src/commands/work.ts

- **code:** Untested defensive branches in startWork — 'not a git repo' and 'git pull conflict' paths have no dedicated unit tests — *Proof Health V2*
- **code:** Dual FAIL guard creates maintenance surface — two independent checks for same condition at L776 and L1179 — *Proof Health V2*
- **code:** Multi-phase error lost phase number — generic message no longer identifies which phase failed — *Proof Health V2*
- **test:** No tests for UNVERIFIED fallback — A014-A018 verified by source inspection only; work.ts, pr.ts, proof.ts UNVERIFIED paths have zero test coverage — *Remove Pre-Check Tag Coverage*

### packages/cli/src/utils/proofSummary.ts

- **code:** `as 'PASS' | 'FAIL'` cast in parseResult relies on regex constraint, not type-level proof — safe but brittle if regex changes — *Clean proofSummary.ts*
- **code:** fileMatches `includes('/')` treats `./census.ts` as directory-qualified — theoretical false negative for dot-slash prefixed paths — *Clean proofSummary.ts*
- **code:** O(n*m) traversal in computeStaleness — nested loop over entries × findings — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/templates/.claude/agents/ana.md

- **code:** Proof surface block is informational command list without behavioral guidance — *Sharpen Agent Templates*

### packages/cli/tests/commands/init.test.ts

- **code:** Init frontmatter branch groups ana-build, ana-verify, ana-learn together — assumes identical frontmatter, masks divergence if any agent changes — *Fix Type Lies*

### packages/cli/tests/commands/proof.test.ts

- **test:** A014 cap test uses toBeLessThanOrEqual(5) instead of toBe(5) — passes even if cap logic is broken and returns 0 items — *Proof Health V2*
- **test:** No direct unit tests for computeFirstPassRate or computePipelineStats — only covered through integration tests via runProof(['health']) — *Proof Health V2*
- **test:** A029 asserts on source code content — matches contract target but violates testing-standards skill rule — *Health Display Polish*
- **test:** A019 not.toContain('Promote') works by coincidence — test data has no promoted findings so 'Promotions' heading also absent; a more targeted regex or exact heading match would be more robust — *Health Display Polish*
- **test:** Dry-run test verifies no mutation but does not verify no commit was created — *Learn V3 — CLI Commands + Template Finalization*
- **test:** Variadic strengthen test checks status but not promoted_to on each finding — *Learn V3 — CLI Commands + Template Finalization*
- **test:** No test for the staged-only changes path (git diff --cached) — only unstaged changes tested via helper — *Learn V3 — CLI Commands + Template Finalization*
- **test:** Weak assertions in stale integration tests — toBeGreaterThan(0) instead of specific counts — *Learn V3 — CLI Commands + Template Finalization*
- **test:** toBeDefined() on JSON confidence tiers — verifies existence not structure — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/tests/commands/work.test.ts

- **test:** A016 uses toBeDefined() for timestamp — weak assertion partially compensated by getTime() > 0 follow-up — *Proof Health V2*
- **test:** A030 test named 'allows completion with UNKNOWN result' but exercises PASS path — UNKNOWN code path at L785 has no test coverage — *Proof Health V2*
- **test:** Multi-phase FAIL test asserts rejects.toThrow() without checking exit code or message content — *Proof Health V2*

### packages/cli/tests/templates/agent-proof-context.test.ts

- **test:** Dogfood sync test loop short-circuits on first failure, skipping remaining files — now covers 6 files instead of 4, making masking worse — *Fix Type Lies*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** A010-A012 use toBeGreaterThan(0) instead of toBe(1) — each test creates exactly one finding, so the specific count is known — *Clean proofSummary.ts*

### General

- **test:** No @ana A003 tag or regression test for inline coAuthor absence — verified by source inspection only — *Learn V3 — CLI Commands + Template Finalization*
- **test:** No tagged test for template assertions A028-A033 — all verified by source inspection — *Learn V3 — CLI Commands + Template Finalization*


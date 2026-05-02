# Proof Chain Dashboard

41 runs · 89 active · 40 lessons · 0 promoted · 90 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/commands/proof.ts | 18 | 10 |
| packages/cli/tests/commands/work.test.ts | 12 | 8 |
| packages/cli/src/utils/proofSummary.ts | 11 | 8 |
| packages/cli/tests/commands/proof.test.ts | 11 | 5 |
| packages/cli/src/commands/work.ts | 7 | 5 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 89 total)

### packages/cli/src/commands/proof.ts

- **code:** Zero-run JSON path hardcodes verification defaults inline (proof.ts:1749) rather than calling computeFirstPassRate([]) — duplicate knowledge of default shape — *Proof Health V2*
- **code:** MAX_SUMMARY constant (100) defined twice in adjacent loops — could be extracted to function-level const — *Health Display Polish*
- **code:** SEVERITY_ORDER constant at proof.ts:49 still duplicated across audit/findings blocks — pre-existing, still present — *Learn V3 — CLI Commands + Template Finalization*
- **code:** exitError helper duplicated inline in close (~30 lines) and promote (~30 lines) action handlers — *Learn V3 — CLI Commands + Template Finalization*
- **code:** Close variadic partial success exits 0 — correct per spec but could mask failures in automation pipelines — *Learn V3 — CLI Commands + Template Finalization*
- **code:** exitError re-searches chain for finding details in ALREADY_PROMOTED and ALREADY_CLOSED single-ID paths — duplicates the earlier loop — *Learn V3 — CLI Commands + Template Finalization*
- **code:** Available skills listing in SKILL_NOT_FOUND error is unspecified UX — reasonable but untested — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/src/commands/work.ts

- **code:** Untested defensive branches in startWork — 'not a git repo' and 'git pull conflict' paths have no dedicated unit tests — *Proof Health V2*
- **code:** Dual FAIL guard creates maintenance surface — two independent checks for same condition at L776 and L1179 — *Proof Health V2*
- **code:** Multi-phase error lost phase number — generic message no longer identifies which phase failed — *Proof Health V2*

### packages/cli/src/utils/proofSummary.ts

- **code:** computeFirstPassRate exported but never imported outside proofSummary.ts — only called internally by computeHealthReport — *Proof Health V2*
- **code:** computePipelineStats maps timing.think to 'scope' display label (line 951: think ?? scope) — naming mismatch between data field and display is intentional per spec but may confuse future maintainers — *Proof Health V2*
- **code:** Redundant `stored === queried` in both-directories guard — exact match already caught at line 1641 — *Clean proofSummary.ts*
- **code:** `as 'PASS' | 'FAIL'` cast in parseResult relies on regex constraint, not type-level proof — safe but brittle if regex changes — *Clean proofSummary.ts*
- **code:** fileMatches `includes('/')` treats `./census.ts` as directory-qualified — theoretical false negative for dot-slash prefixed paths — *Clean proofSummary.ts*

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

### packages/cli/tests/commands/work.test.ts

- **test:** A016 uses toBeDefined() for timestamp — weak assertion partially compensated by getTime() > 0 follow-up — *Proof Health V2*
- **test:** A030 test named 'allows completion with UNKNOWN result' but exercises PASS path — UNKNOWN code path at L785 has no test coverage — *Proof Health V2*
- **test:** Multi-phase FAIL test asserts rejects.toThrow() without checking exit code or message content — *Proof Health V2*

### packages/cli/tests/templates/agent-proof-context.test.ts

- **test:** Dogfood sync test loop short-circuits on first failure, skipping remaining files — now covers 6 files instead of 4, making masking worse — *Fix Type Lies*
- **test:** Dogfood sync test proves byte-identity but not content correctness — contract content assertions verified by source inspection only — *Sharpen Agent Templates*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** A010-A012 use toBeGreaterThan(0) instead of toBe(1) — each test creates exactly one finding, so the specific count is known — *Clean proofSummary.ts*

### General

- **test:** No @ana A003 tag or regression test for inline coAuthor absence — verified by source inspection only — *Learn V3 — CLI Commands + Template Finalization*


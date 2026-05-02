# Proof Chain Dashboard

40 runs · 82 active · 37 lessons · 0 promoted · 86 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/commands/proof.ts | 19 | 9 |
| packages/cli/src/utils/proofSummary.ts | 10 | 7 |
| packages/cli/tests/commands/work.test.ts | 9 | 7 |
| packages/cli/tests/commands/proof.test.ts | 9 | 4 |
| packages/cli/tests/utils/proofSummary.test.ts | 7 | 5 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 82 total)

### packages/cli/src/commands/proof.ts

- **code:** Inline import type for HealthReport instead of adding to existing type import at line 26 — *Health Display Polish*
- **code:** MAX_SUMMARY constant (100) defined twice in adjacent loops — could be extracted to function-level const — *Health Display Polish*
- **code:** SEVERITY_ORDER constant at proof.ts:49 still duplicated across audit/findings blocks — pre-existing, still present — *Learn V3 — CLI Commands + Template Finalization*
- **code:** exitError helper duplicated inline in close (~30 lines) and promote (~30 lines) action handlers — *Learn V3 — CLI Commands + Template Finalization*
- **code:** Close variadic partial success exits 0 — correct per spec but could mask failures in automation pipelines — *Learn V3 — CLI Commands + Template Finalization*
- **code:** exitError re-searches chain for finding details in ALREADY_PROMOTED and ALREADY_CLOSED single-ID paths — duplicates the earlier loop — *Learn V3 — CLI Commands + Template Finalization*
- **code:** Available skills listing in SKILL_NOT_FOUND error is unspecified UX — reasonable but untested — *Learn V3 — CLI Commands + Template Finalization*
- **code:** SEVERITY_ORDER duplication still present across proof.ts — known from proof context, not addressed by this phase — *Learn V3 — CLI Commands + Template Finalization*
- **code:** --min-confidence accepts invalid values silently — no validation or Commander .choices() — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/src/commands/work.ts

- **test:** No tests for UNVERIFIED fallback — A014-A018 verified by source inspection only; work.ts, pr.ts, proof.ts UNVERIFIED paths have zero test coverage — *Remove Pre-Check Tag Coverage*

### packages/cli/src/types/proof.ts

- **code:** StaleFinding/StalenessResult types exported but never imported by name — consumed only via inline import() in proofSummary.ts — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/src/utils/proofSummary.ts

- **code:** Redundant `stored === queried` in both-directories guard — exact match already caught at line 1641 — *Clean proofSummary.ts*
- **code:** `as 'PASS' | 'FAIL'` cast in parseResult relies on regex constraint, not type-level proof — safe but brittle if regex changes — *Clean proofSummary.ts*
- **code:** fileMatches `includes('/')` treats `./census.ts` as directory-qualified — theoretical false negative for dot-slash prefixed paths — *Clean proofSummary.ts*
- **code:** O(n*m) traversal in computeStaleness — nested loop over entries × findings — *Learn V3 — CLI Commands + Template Finalization*
- **code:** PreCheckData interface vestigial — retains assertions/covered/uncovered fields for reading old .saves.json but the code path that used them for assertion bootstrap is deleted — *Remove Pre-Check Tag Coverage*

### packages/cli/templates/.claude/agents/ana.md

- **code:** Proof surface block is informational command list without behavioral guidance — *Sharpen Agent Templates*

### packages/cli/tests/commands/init.test.ts

- **code:** Init frontmatter branch groups ana-build, ana-verify, ana-learn together — assumes identical frontmatter, masks divergence if any agent changes — *Fix Type Lies*

### packages/cli/tests/commands/proof.test.ts

- **test:** A029 asserts on source code content — matches contract target but violates testing-standards skill rule — *Health Display Polish*
- **test:** A019 not.toContain('Promote') works by coincidence — test data has no promoted findings so 'Promotions' heading also absent; a more targeted regex or exact heading match would be more robust — *Health Display Polish*
- **test:** Dry-run test verifies no mutation but does not verify no commit was created — *Learn V3 — CLI Commands + Template Finalization*
- **test:** Variadic strengthen test checks status but not promoted_to on each finding — *Learn V3 — CLI Commands + Template Finalization*
- **test:** No test for the staged-only changes path (git diff --cached) — only unstaged changes tested via helper — *Learn V3 — CLI Commands + Template Finalization*
- **test:** Weak assertions in stale integration tests — toBeGreaterThan(0) instead of specific counts — *Learn V3 — CLI Commands + Template Finalization*
- **test:** toBeDefined() on JSON confidence tiers — verifies existence not structure — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/tests/templates/agent-proof-context.test.ts

- **test:** Dogfood sync test loop short-circuits on first failure, skipping remaining files — now covers 6 files instead of 4, making masking worse — *Fix Type Lies*
- **test:** Dogfood sync test proves byte-identity but not content correctness — contract content assertions verified by source inspection only — *Sharpen Agent Templates*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** A010-A012 use toBeGreaterThan(0) instead of toBe(1) — each test creates exactly one finding, so the specific count is known — *Clean proofSummary.ts*

### General

- **test:** No @ana A003 tag or regression test for inline coAuthor absence — verified by source inspection only — *Learn V3 — CLI Commands + Template Finalization*
- **test:** No tagged test for template assertions A028-A033 — all verified by source inspection — *Learn V3 — CLI Commands + Template Finalization*


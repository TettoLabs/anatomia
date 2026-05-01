# Proof Chain Dashboard

37 runs · 77 active · 31 lessons · 0 promoted · 83 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/commands/proof.ts | 19 | 9 |
| packages/cli/src/utils/proofSummary.ts | 9 | 8 |
| packages/cli/tests/commands/work.test.ts | 9 | 7 |
| packages/cli/tests/commands/proof.test.ts | 9 | 4 |
| packages/cli/tests/utils/proofSummary.test.ts | 6 | 4 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 77 total)

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
- **code:** SEVERITY_ORDER duplication still present — sevOrder inline array at line 1026 is correct local choice but broader duplication across audit/findings blocks remains — *Proof Command UX*
- **code:** options.skill typed as non-optional string but can be undefined after requiredOption→option change — *Proof Promote*

### packages/cli/src/commands/work.ts

- **test:** No tests for UNVERIFIED fallback — A014-A018 verified by source inspection only; work.ts, pr.ts, proof.ts UNVERIFIED paths have zero test coverage — *Remove Pre-Check Tag Coverage*
- **code:** Stale comment references deleted reopen loop — *Delete backward-compatibility code*

### packages/cli/src/types/proof.ts

- **code:** StaleFinding/StalenessResult types exported but never imported by name — consumed only via inline import() in proofSummary.ts — *Learn V3 — CLI Commands + Template Finalization*

### packages/cli/src/utils/proofSummary.ts

- **code:** O(n*m) traversal in computeStaleness — nested loop over entries × findings — *Learn V3 — CLI Commands + Template Finalization*
- **code:** PreCheckData interface vestigial — retains assertions/covered/uncovered fields for reading old .saves.json but the code path that used them for assertion bootstrap is deleted — *Remove Pre-Check Tag Coverage*

### packages/cli/templates/.claude/agents/ana-learn.md

- **code:** Template instructs Learn to read .claude/skills/{name}/SKILL.md but actual skill files use different naming (e.g., coding-standards.md not SKILL.md) — agent will adapt at runtime but the path hint is misleading — *Ana Learn V1*

### packages/cli/tests/commands/proof.test.ts

- **test:** A029 asserts on source code content — matches contract target but violates testing-standards skill rule — *Health Display Polish*
- **test:** A019 not.toContain('Promote') works by coincidence — test data has no promoted findings so 'Promotions' heading also absent; a more targeted regex or exact heading match would be more robust — *Health Display Polish*
- **test:** Dry-run test verifies no mutation but does not verify no commit was created — *Learn V3 — CLI Commands + Template Finalization*
- **test:** Variadic strengthen test checks status but not promoted_to on each finding — *Learn V3 — CLI Commands + Template Finalization*
- **test:** No test for the staged-only changes path (git diff --cached) — only unstaged changes tested via helper — *Learn V3 — CLI Commands + Template Finalization*
- **test:** Weak assertions in stale integration tests — toBeGreaterThan(0) instead of specific counts — *Learn V3 — CLI Commands + Template Finalization*
- **test:** toBeDefined() on JSON confidence tiers — verifies existence not structure — *Learn V3 — CLI Commands + Template Finalization*
- **test:** A002 lacks negative proof of active-only counting — fixture has only active findings, no closed finding to prove exclusion — *Proof Command UX*

### packages/cli/tests/commands/work.test.ts

- **test:** A013 conditional assertion passes vacuously when health line absent — if (output.includes('Health:')) guard means zero assertions fire when improving trend doesn't produce a health line — *Proof Command UX*
- **test:** A003 tagged test exercises normal completion, not recovery — does not assert 'Recovering' in output — *Harden Hot Files*
- **test:** Pre-check COVERED status for A004-A010 comes from other features' tag collisions, not from harden-hot-files-specific tests — *Harden Hot Files*

### General

- **test:** No @ana A003 tag or regression test for inline coAuthor absence — verified by source inspection only — *Learn V3 — CLI Commands + Template Finalization*
- **test:** No tagged test for template assertions A028-A033 — all verified by source inspection — *Learn V3 — CLI Commands + Template Finalization*


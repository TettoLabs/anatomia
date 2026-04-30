# Proof Chain Dashboard

34 runs · 79 active · 33 lessons · 0 promoted · 53 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/commands/proof.ts | 12 | 7 |
| packages/cli/tests/utils/proofSummary.test.ts | 10 | 6 |
| packages/cli/src/utils/proofSummary.ts | 10 | 7 |
| packages/cli/tests/commands/work.test.ts | 10 | 8 |
| packages/cli/src/commands/work.ts | 7 | 6 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 79 total)

### packages/cli/src/commands/artifact.ts

- **code:** captureModulesTouched warning includes raw error message in output — could leak internal paths or stack traces to terminal — *Harden Hot Files*

### packages/cli/src/commands/proof.ts

- **code:** Unknown severity values get own bucket instead of 'unclassified' as spec says — only '—' maps to unclassified, other unknowns display raw — *Proof Command UX*
- **code:** SEVERITY_ORDER duplication still present — sevOrder inline array at line 1026 is correct local choice but broader duplication across audit/findings blocks remains — *Proof Command UX*
- **code:** rule_text includes markdown bullet prefix '- ' in JSON output — *Proof Promote*
- **code:** options.skill typed as non-optional string but can be undefined after requiredOption→option change — *Proof Promote*
- **code:** No summary truncation for promoted finding display — long summaries break terminal formatting — *Proof Promote*
- **code:** Hardcoded 10 in trend display instead of using MIN_ENTRIES_FOR_TREND constant. Template literal uses ${10} rather than importing and using the named constant, creating drift risk if threshold changes. — *Proof Health V1*
- **code:** Promotion candidate display has no summary truncation. Long summaries from findings (up to 1000 chars) render untruncated in terminal output. Not a crash risk but degrades terminal readability. — *Proof Health V1*
- **code:** SEVERITY_ORDER lookup duplicated identically in Findings block and Build Concerns block — extract to module-level constant — *Work Complete JSON + Proof Card Findings*

### packages/cli/src/commands/verify.ts

- **code:** Comment filter only matches // and # — block comments (/* @ana A001 */) in added lines are silently ignored — *Diff-Scoped Tag Search*
- **code:** No size guard on git diff output — very large diffs loaded entirely into memory before parsing — *Diff-Scoped Tag Search*

### packages/cli/src/commands/work.ts

- **code:** Catch block indentation inconsistent — body at 10-space indent vs surrounding 8-space convention — *Harden Hot Files*
- **code:** Stale comment references deleted reopen loop — *Delete backward-compatibility code*
- **code:** Recovery path console.log on line 1078 leaks non-JSON text to stdout before JSON envelope — CI consumers doing JSON.parse(stdout) will fail — *Work Complete JSON + Proof Card Findings*
- **code:** Main path re-reads proof_chain.json from disk for computeChainHealth after writeProofChain just wrote it — matches known build concern about nudge re-read pattern — *Work Complete JSON + Proof Card Findings*
- **code:** Severity migration does not handle unexpected old values beyond blocker/note — if a future writer introduces an unknown severity value (e.g. from a malformed manual edit), the migration loop silently ignores it. Not blocking since validation prevents new bad values, but the migration is only protective for known old values. — *Finding Enrichment Schema*

### packages/cli/src/utils/proofSummary.ts

- **code:** Trajectory 'worsening' label can be counterintuitive with sparse classification — reports worsening on 0.1 risks/run when most findings lack severity. Algorithm is correct but label may mislead operators. — *Proof Health V1*
- **code:** ProofSummary.result still typed as string, not union — spec says to tighten to match ProofChainEntry ('PASS' | 'FAIL' | 'UNKNOWN') but builder left it as open string. Contract A004 only targets ProofChainEntry.result so not a contract violation, but consumers of ProofSummary.result don't get compiler protection. — *Finding Enrichment Schema*

### packages/cli/templates/.claude/agents/ana-learn.md

- **code:** Template instructs Learn to read .claude/skills/{name}/SKILL.md but actual skill files use different naming (e.g., coding-standards.md not SKILL.md) — agent will adapt at runtime but the path hint is misleading — *Ana Learn V1*

### packages/cli/tests/commands/proof.test.ts

- **test:** A002 lacks negative proof of active-only counting — fixture has only active findings, no closed finding to prove exclusion — *Proof Command UX*
- **test:** A006 test passes text with shell-escaped double quotes wrapping — tests quoted-string path not raw text — *Proof Promote*

### packages/cli/tests/commands/verify.test.ts

- **test:** Substantial test setup duplication across 8 integration tests — each creates git repo, contract, hash, saves from scratch — *Diff-Scoped Tag Search*

### packages/cli/tests/commands/work.test.ts

- **test:** A013 conditional assertion passes vacuously when health line absent — if (output.includes('Health:')) guard means zero assertions fire when improving trend doesn't produce a health line — *Proof Command UX*
- **test:** A003 tagged test exercises normal completion, not recovery — does not assert 'Recovering' in output — *Harden Hot Files*
- **test:** Pre-check COVERED status for A004-A010 comes from other features' tag collisions, not from harden-hot-files-specific tests — *Harden Hot Files*
- **test:** Recovery path JSON test uses output.indexOf('{') to skip non-JSON output — fragile parsing that masks the stdout pollution issue — *Work Complete JSON + Proof Card Findings*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** No negative test for Callouts heading rejection — parseFindings tests verify Findings works but don't assert Callouts is rejected — *Delete backward-compatibility code*
- **test:** detectHealthChange 'detects trend improvement' unit test uses conditional assertion (if change.changed) — if change.changed is false, the expect on triggers never executes. This masks a potential false pass. — *Proof Health V1*
- **test:** Promotion effectiveness test covers only the extremes (0% reduction, 100% reduction, tracking). No test for intermediate reduction (e.g., 40%) or negative reduction (more matches than baseline). — *Proof Health V1*

### General

- **test:** All 24 contract assertions are UNCOVERED by tagged tests — spec says templates are markdown verified by reading not unit tests, so pre-check shows 0 covered. Mechanical verification was done manually in this report. — *Ana Learn V1*


# Proof Chain Dashboard

35 runs · 71 active · 31 lessons · 0 promoted · 67 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/commands/proof.ts | 11 | 7 |
| packages/cli/tests/commands/work.test.ts | 10 | 8 |
| packages/cli/src/utils/proofSummary.ts | 9 | 7 |
| packages/cli/tests/utils/proofSummary.test.ts | 8 | 5 |
| packages/cli/src/commands/work.ts | 8 | 7 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 71 total)

### packages/cli/src/commands/artifact.ts

- **code:** captureModulesTouched warning includes raw error message in output — could leak internal paths or stack traces to terminal — *Harden Hot Files*

### packages/cli/src/commands/proof.ts

- **code:** Unknown severity values get own bucket instead of 'unclassified' as spec says — only '—' maps to unclassified, other unknowns display raw — *Proof Command UX*
- **code:** SEVERITY_ORDER duplication still present — sevOrder inline array at line 1026 is correct local choice but broader duplication across audit/findings blocks remains — *Proof Command UX*
- **code:** options.skill typed as non-optional string but can be undefined after requiredOption→option change — *Proof Promote*
- **code:** No summary truncation for promoted finding display — long summaries break terminal formatting — *Proof Promote*
- **code:** Hardcoded 10 in trend display instead of using MIN_ENTRIES_FOR_TREND constant. Template literal uses ${10} rather than importing and using the named constant, creating drift risk if threshold changes. — *Proof Health V1*
- **code:** Promotion candidate display has no summary truncation. Long summaries from findings (up to 1000 chars) render untruncated in terminal output. Not a crash risk but degrades terminal readability. — *Proof Health V1*
- **code:** SEVERITY_ORDER lookup duplicated identically in Findings block and Build Concerns block — extract to module-level constant — *Work Complete JSON + Proof Card Findings*

### packages/cli/src/commands/verify.ts

- **code:** Comment filter only matches // and # — block comments (/* @ana A001 */) in added lines are silently ignored — *Diff-Scoped Tag Search*
- **code:** No size guard on git diff output — very large diffs loaded entirely into memory before parsing — *Diff-Scoped Tag Search*

### packages/cli/src/commands/work.ts

- **test:** No tests for UNVERIFIED fallback — A014-A018 verified by source inspection only; work.ts, pr.ts, proof.ts UNVERIFIED paths have zero test coverage — *Remove Pre-Check Tag Coverage*
- **code:** Catch block indentation inconsistent — body at 10-space indent vs surrounding 8-space convention — *Harden Hot Files*
- **code:** Stale comment references deleted reopen loop — *Delete backward-compatibility code*
- **code:** Recovery path console.log on line 1078 leaks non-JSON text to stdout before JSON envelope — CI consumers doing JSON.parse(stdout) will fail — *Work Complete JSON + Proof Card Findings*
- **code:** Main path re-reads proof_chain.json from disk for computeChainHealth after writeProofChain just wrote it — matches known build concern about nudge re-read pattern — *Work Complete JSON + Proof Card Findings*

### packages/cli/src/utils/proofSummary.ts

- **code:** PreCheckData interface vestigial — retains assertions/covered/uncovered fields for reading old .saves.json but the code path that used them for assertion bootstrap is deleted — *Remove Pre-Check Tag Coverage*
- **code:** parseComplianceTable regex omits UNVERIFIED — regex at line 171 matches SATISFIED|UNSATISFIED|DEVIATED|UNCOVERED but not UNVERIFIED. Correct behavior since verify reports never contain UNVERIFIED rows, but the omission could confuse future maintainers who see UNVERIFIED in the type union — *Remove Pre-Check Tag Coverage*
- **code:** Trajectory 'worsening' label can be counterintuitive with sparse classification — reports worsening on 0.1 risks/run when most findings lack severity. Algorithm is correct but label may mislead operators. — *Proof Health V1*

### packages/cli/templates/.claude/agents/ana-learn.md

- **code:** Template instructs Learn to read .claude/skills/{name}/SKILL.md but actual skill files use different naming (e.g., coding-standards.md not SKILL.md) — agent will adapt at runtime but the path hint is misleading — *Ana Learn V1*

### packages/cli/tests/commands/proof.test.ts

- **test:** A002 lacks negative proof of active-only counting — fixture has only active findings, no closed finding to prove exclusion — *Proof Command UX*

### packages/cli/tests/commands/verify.test.ts

- **test:** A006 @ana tag on wrong test — tagged on UNVERIFIABLE test (line 241) instead of parseDiffAddedCommentLines removal test — *Remove Pre-Check Tag Coverage*
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


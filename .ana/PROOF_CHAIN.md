# Proof Chain Dashboard

29 runs · 65 active · 26 lessons · 0 promoted · 51 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/utils/proofSummary.ts | 11 | 8 |
| packages/cli/tests/utils/proofSummary.test.ts | 9 | 5 |
| packages/cli/src/commands/proof.ts | 7 | 5 |
| packages/cli/tests/commands/work.test.ts | 7 | 6 |
| packages/cli/src/commands/work.ts | 5 | 4 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 65 total)

### packages/cli/src/commands/artifact.ts

- **code:** Double YAML parse in companion success message — validateVerifyDataFormat/validateBuildDataFormat parses the file, then saveArtifact re-parses at lines 932-933 to count findings for the console message. Validation function could return the parsed count. — *Structured Findings Companion*

### packages/cli/src/commands/proof.ts

- **code:** Hardcoded 10 in trend display instead of using MIN_ENTRIES_FOR_TREND constant. Template literal uses ${10} rather than importing and using the named constant, creating drift risk if threshold changes. — *Proof Health V1*
- **code:** Promotion candidate display has no summary truncation. Long summaries from findings (up to 1000 chars) render untruncated in terminal output. Not a crash risk but degrades terminal readability. — *Proof Health V1*
- **code:** SEVERITY_ORDER lookup duplicated identically in Findings block and Build Concerns block — extract to module-level constant — *Work Complete JSON + Proof Card Findings*
- **code:** Duplicate 'from:' line in audit human-readable display — line 660 already has 'from: {feature}' in metadata, line 661 repeats it standalone — *Finding Enrichment Schema*
- **code:** SEVERITY_WEIGHT map is local to audit command block — if severity sort is needed elsewhere, it will be duplicated — *Finding Enrichment Schema*
- **code:** Anchor stripping regex false-positives — aggressive strip reduces anchors to common words — *Close the Loop*

### packages/cli/src/commands/verify.ts

- **code:** Comment filter only matches // and # — block comments (/* @ana A001 */) in added lines are silently ignored — *Diff-Scoped Tag Search*
- **code:** No size guard on git diff output — very large diffs loaded entirely into memory before parsing — *Diff-Scoped Tag Search*

### packages/cli/src/commands/work.ts

- **code:** Recovery path console.log on line 1078 leaks non-JSON text to stdout before JSON envelope — CI consumers doing JSON.parse(stdout) will fail — *Work Complete JSON + Proof Card Findings*
- **code:** Main path re-reads proof_chain.json from disk for computeChainHealth after writeProofChain just wrote it — matches known build concern about nudge re-read pattern — *Work Complete JSON + Proof Card Findings*
- **code:** Severity migration does not handle unexpected old values beyond blocker/note — if a future writer introduces an unknown severity value (e.g. from a malformed manual edit), the migration loop silently ignores it. Not blocking since validation prevents new bad values, but the migration is only protective for known old values. — *Finding Enrichment Schema*
- **code:** Recovery path counts total findings via loop but main path uses stats.findings — two different counting mechanisms for the same display. If totalFindings computation in writeProofChain diverges from the simple loop, recovery output could drift. — *Harden git commit calls*

### packages/cli/src/utils/proofSummary.ts

- **code:** Trajectory 'worsening' label can be counterintuitive with sparse classification — reports worsening on 0.1 risks/run when most findings lack severity. Algorithm is correct but label may mislead operators. — *Proof Health V1*
- **code:** ProofSummary.result still typed as string, not union — spec says to tighten to match ProofChainEntry ('PASS' | 'FAIL' | 'UNKNOWN') but builder left it as open string. Contract A004 only targets ProofChainEntry.result so not a contract violation, but consumers of ProofSummary.result don't get compiler protection. — *Finding Enrichment Schema*
- **code:** globCache parameter widens the public API surface of an exported function — *Clean Ground for Foundation 3*
- **code:** Cache never invalidated — stale if files created between resolveFindingPaths calls within one writeProofChain invocation — *Clean Ground for Foundation 3*
- **code:** PreCheckData interface retains seal_commit field despite seal_commit removal from ProofChainEntry and ProofSummary. Intentional — reads old .saves.json — but inconsistent with the removal theme. — *Structured Findings Companion*
- **code:** getProofContext uses conditional property assignment (if finding.line !== undefined) rather than always-present optional fields. Result object shape varies — fine for TypeScript consumers but JSON shape is polymorphic. — *Structured Findings Companion*

### packages/cli/tests/commands/artifact.test.ts

- **test:** blocks-save tests (A006, A007) use toThrow() without checking exit code or error message content. saveArtifact calls process.exit(1), which throws in test — the assertion confirms the throw but not the exit code value or the descriptive error message. — *Structured Findings Companion*

### packages/cli/tests/commands/proof.test.ts

- **test:** createAuditChain helper never generates 'debt' severity — badge display for [debt · X] is untested in human-readable audit output — *Finding Enrichment Schema*

### packages/cli/tests/commands/verify.test.ts

- **test:** Substantial test setup duplication across 8 integration tests — each creates git repo, contract, hash, saves from scratch — *Diff-Scoped Tag Search*

### packages/cli/tests/commands/work.test.ts

- **test:** Recovery path JSON test uses output.indexOf('{') to skip non-JSON output — fragile parsing that masks the stdout pollution issue — *Work Complete JSON + Proof Card Findings*
- **test:** Severity migration tests (A019, A020, A021) don't have dedicated tagged tests in the changed test files — they're covered indirectly through the backfill loop in work.test.ts existing tests and by type-level evidence. No test explicitly creates a finding with severity 'blocker', runs the migration loop, and asserts severity is now 'risk'. The behavior is exercised but not directly asserted. — *Finding Enrichment Schema*
- **test:** Test name 'shows maintenance line when findings were auto-closed' is now inverted — assertions check not.toContain('Maintenance:') but name says 'shows' — *Harden git commit calls*
- **test:** A011 assertion checks one value not cleared state: `packages/cli/tests/commands/work.test.ts:1447` — asserts `closed_reason` is not `'superseded by new-C1'` but doesn't assert `closed_at` or `closed_by` are also cleared. The test proves the specific contract assertion (matcher: `not_equals`, value: `'superseded by new-C1'`) but a stronger test would verify all three closure fields are absent. — *Fix Proof Chain Mechanical Accuracy*
- **test:** A020 uses source-code reading instead of behavioral test: `packages/cli/tests/commands/work.test.ts:1736` — reads `work.ts` source and asserts the retry string exists. This proves the string is in the code but not that it appears in the error output when a commit actually fails. A behavioral test would mock `execSync` to throw on `git commit` and capture stderr. Low risk — the error path is straightforward (`catch` → `console.error` → `process.exit(1)`), but a source-reading test survives refactoring that breaks the behavior. — *Fix artifact save bypass, cwd bug, and work complete crash recovery*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** detectHealthChange 'detects trend improvement' unit test uses conditional assertion (if change.changed) — if change.changed is false, the expect on triggers never executes. This masks a potential false pass. — *Proof Health V1*
- **test:** Promotion effectiveness test covers only the extremes (0% reduction, 100% reduction, tracking). No test for intermediate reduction (e.g., 40%) or negative reduction (more matches than baseline). — *Proof Health V1*
- **test:** vi.mock('glob') adds file-level module mock — correct for spying but implicit coupling to all glob-using tests — *Clean Ground for Foundation 3*


# Proof Chain Dashboard

28 runs · 63 active · 26 lessons · 0 promoted · 48 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/utils/proofSummary.ts | 10 | 7 |
| packages/cli/tests/commands/work.test.ts | 8 | 6 |
| packages/cli/tests/utils/proofSummary.test.ts | 7 | 4 |
| packages/cli/src/commands/proof.ts | 5 | 4 |
| packages/cli/src/commands/work.ts | 5 | 4 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 63 total)

### packages/cli/src/commands/artifact.ts

- **code:** Double YAML parse in companion success message — validateVerifyDataFormat/validateBuildDataFormat parses the file, then saveArtifact re-parses at lines 932-933 to count findings for the console message. Validation function could return the parsed count. — *Structured Findings Companion*

### packages/cli/src/commands/proof.ts

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
- **code:** Recovery catch swallows git status failure: `packages/cli/src/commands/work.ts:1080` — if `git status --porcelain .ana/` throws (e.g., corrupt `.git` directory), the catch silently falls through to the "already completed" message. This is unlikely but means a corrupted git state would report "already completed" instead of a diagnostic error. The spec doesn't cover this edge case, so it's not a FAIL — but it's a sharp edge. — *Fix artifact save bypass, cwd bug, and work complete crash recovery*

### packages/cli/src/utils/proofSummary.ts

- **code:** ProofSummary.result still typed as string, not union — spec says to tighten to match ProofChainEntry ('PASS' | 'FAIL' | 'UNKNOWN') but builder left it as open string. Contract A004 only targets ProofChainEntry.result so not a contract violation, but consumers of ProofSummary.result don't get compiler protection. — *Finding Enrichment Schema*
- **code:** globCache parameter widens the public API surface of an exported function — *Clean Ground for Foundation 3*
- **code:** Cache never invalidated — stale if files created between resolveFindingPaths calls within one writeProofChain invocation — *Clean Ground for Foundation 3*
- **code:** PreCheckData interface retains seal_commit field despite seal_commit removal from ProofChainEntry and ProofSummary. Intentional — reads old .saves.json — but inconsistent with the removal theme. — *Structured Findings Companion*
- **code:** getProofContext uses conditional property assignment (if finding.line !== undefined) rather than always-present optional fields. Result object shape varies — fine for TypeScript consumers but JSON shape is polymorphic. — *Structured Findings Companion*
- **code:** Dashboard duplicates Active Issues logic: `packages/cli/src/utils/proofSummary.ts:566-616` — reimplements the collection, filtering, capping, and file-grouping from `generateActiveIssuesMarkdown` (lines 385-473). The format differs (### vs ## headings, no truncation), but extracting shared helpers for the filtering and grouping would reduce the ~50 lines of duplication. — *Findings Lifecycle Foundation*

### packages/cli/tests/commands/artifact.test.ts

- **test:** blocks-save tests (A006, A007) use toThrow() without checking exit code or error message content. saveArtifact calls process.exit(1), which throws in test — the assertion confirms the throw but not the exit code value or the descriptive error message. — *Structured Findings Companion*

### packages/cli/tests/commands/proof.test.ts

- **test:** createAuditChain helper never generates 'debt' severity — badge display for [debt · X] is untested in human-readable audit output — *Finding Enrichment Schema*
- **test:** A032 test uses toBeDefined() not a specific string value — passes even if suggested_action is empty string or unexpected value — *Finding Enrichment Schema*

### packages/cli/tests/commands/verify.test.ts

- **test:** Four pre-existing @ana tags mislabeled for this contract's IDs — A005 on fallback test, A006 on UNVERIFIABLE test, A010 on formatted output test, A011 on UNVERIFIABLE message test — *Diff-Scoped Tag Search*
- **test:** Substantial test setup duplication across 8 integration tests — each creates git repo, contract, hash, saves from scratch — *Diff-Scoped Tag Search*

### packages/cli/tests/commands/work.test.ts

- **test:** A001 test reads source code to check --json registration instead of behavioral test — same anti-pattern flagged in proof context for A020 — *Work Complete JSON + Proof Card Findings*
- **test:** Recovery path JSON test uses output.indexOf('{') to skip non-JSON output — fragile parsing that masks the stdout pollution issue — *Work Complete JSON + Proof Card Findings*
- **test:** Severity migration tests (A019, A020, A021) don't have dedicated tagged tests in the changed test files — they're covered indirectly through the backfill loop in work.test.ts existing tests and by type-level evidence. No test explicitly creates a finding with severity 'blocker', runs the migration loop, and asserts severity is now 'risk'. The behavior is exercised but not directly asserted. — *Finding Enrichment Schema*
- **test:** Test name 'shows maintenance line when findings were auto-closed' is now inverted — assertions check not.toContain('Maintenance:') but name says 'shows' — *Harden git commit calls*
- **test:** A011 assertion checks one value not cleared state: `packages/cli/tests/commands/work.test.ts:1447` — asserts `closed_reason` is not `'superseded by new-C1'` but doesn't assert `closed_at` or `closed_by` are also cleared. The test proves the specific contract assertion (matcher: `not_equals`, value: `'superseded by new-C1'`) but a stronger test would verify all three closure fields are absent. — *Fix Proof Chain Mechanical Accuracy*
- **test:** A020 uses source-code reading instead of behavioral test: `packages/cli/tests/commands/work.test.ts:1736` — reads `work.ts` source and asserts the retry string exists. This proves the string is in the code but not that it appears in the error output when a commit actually fails. A behavioral test would mock `execSync` to throw on `git commit` and capture stderr. Low risk — the error path is straightforward (`catch` → `console.error` → `process.exit(1)`), but a source-reading test survives refactoring that breaks the behavior. — *Fix artifact save bypass, cwd bug, and work complete crash recovery*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** vi.mock('glob') adds file-level module mock — correct for spying but implicit coupling to all glob-using tests — *Clean Ground for Foundation 3*


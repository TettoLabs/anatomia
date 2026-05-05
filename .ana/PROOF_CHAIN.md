# Proof Chain Dashboard

51 runs · 80 active · 57 lessons · 0 promoted · 149 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/utils/proofSummary.ts | 11 | 7 |
| packages/cli/tests/commands/work.test.ts | 9 | 7 |
| packages/cli/src/commands/proof.ts | 8 | 5 |
| packages/cli/tests/commands/proof.test.ts | 7 | 3 |
| packages/cli/src/commands/work.ts | 4 | 3 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 80 total)

### .github/workflows/release.yml

- **code:** release.yml copies README/CHANGELOG separately from prepublishOnly — two sources of truth for doc copying — *V1 Release Prep*

### .husky/pre-commit

- **code:** Pre-commit comment claims ~9s / 10s threshold — will drift as test count grows (1807 now) — *V1 Code Changes*

### package.json

- **code:** Release script 'cd packages/cli && npm version' requires a semver argument — no guard or help text — *V1 Release Prep*

### packages/cli/package.json

- **code:** npm pack dry-run doesn't include README.md or CHANGELOG.md — prepublishOnly required first — *V1 Release Prep*
- **code:** prepublishOnly relies on relative ../../ path — breaks if package depth changes — *V1 Documentation Overhaul*

### packages/cli/src/commands/proof.ts

- **code:** createExitError formatHint empty-array return is truthy — prevents fallback to static hints even when callback returns no lines — *Proof Intelligence Hardening*
- **code:** Health display truncation now uses word-boundary instead of hard-cut — minor behavior change from .slice(0, 100) to truncateSummary(_, 100) — *Proof Intelligence Hardening*
- **code:** Lesson command catch block at proof.ts:1141 loses error detail — swallows commit failure cause — *Proof Intelligence Hardening*
- **code:** Lesson command duplicates close's finding-search loop pattern — 4 identical loops across lesson, close, promote, strengthen — *Proof Intelligence Hardening*

### packages/cli/src/commands/work.ts

- **code:** guardFailResult JSDoc first line says 'Write proof chain files' — copy-paste from writeProofChain description — *Proof Intelligence Hardening*
- **code:** guardFailResult changes multi-phase FAIL message format from original — adds 'Phase N: ' prefix not present before — *Proof Intelligence Hardening*

### packages/cli/src/engine/detectors/git.ts

- **code:** git.ts in src/engine/detectors/ retains execSync — architecturally correct (engine boundary, not commands/utils) but is the last remaining execSync in the codebase outside tests. Future hardening could migrate this to spawnSync for consistency. — *Security Hardening — Command Injection Elimination*

### packages/cli/src/utils/git-operations.ts

- **code:** getCurrentBranch still uses execSync — not hardened by this phase — *Security Hardening — Command Injection Elimination*
- **code:** runGit defaults exitCode to 1 when spawnSync returns null status (signal kill). This is reasonable but means SIGKILL'd git processes appear as generic failures — no way to distinguish 'command failed' from 'process was killed'. Acceptable for CLI use. — *Security Hardening — Command Injection Elimination*

### packages/cli/src/utils/proofSummary.ts

- **code:** parseACResults heading match is case-sensitive and exact — '## AC walkthrough' or '##  AC Walkthrough' (extra space) would miss — *Proof Intelligence Hardening*
- **code:** proofSummary.ts now ~1913 lines — past comfort threshold, known from prior cycles — *Proof Intelligence Hardening*
- **code:** Staleness touchRate uses full-chain baseline rate instead of post-finding rate as specified — *Proof Intelligence Hardening*
- **code:** proofSummary.ts ~1560+ lines — past comfort threshold, growing each phase — *Proof Intelligence Hardening*
- **code:** proofSummary.ts ~1550 lines — past comfort threshold, known from prior cycles — *V1 Code Changes*

### packages/cli/src/utils/validators.ts

- **code:** SLUG_PATTERN exported but only consumed by test file — no source imports the raw regex — *Security Hardening — Command Injection Elimination*

### packages/cli/templates/.claude/agents/ana-learn.md

- **test:** A028/A029 learn template assertions verified by source inspection only — no test file exercises these — *Proof Intelligence Hardening*

### packages/cli/tests/commands/work.test.ts

- **test:** No tagged tests for A004-A008 — structural/behavioral assertions verified by source inspection only, not by @ana-tagged test cases — *Proof Intelligence Hardening*
- **test:** A016-A019 @ana tags point to pre-existing branchPrefix template tests, not command entry point validation — *Security Hardening — Command Injection Elimination*

### packages/cli/tests/utils/git-operations.test.ts

- **test:** A010 test mocks process.exit — after mock, readArtifactBranch continues and returns invalid branch to caller. Correct in production but test pattern allows post-exit execution. — *Security Hardening — Command Injection Elimination*
- **test:** Enforcement test (A023) asserts on source code content via grep — violates testing-standards skill rule 'never assert on source code content' but is the only practical way to enforce convention. Spec explicitly requested this pattern. — *Security Hardening — Command Injection Elimination*
- **test:** Enforcement test comment-filter heuristic checks line prefix only (starts with //, *, /*). An execSync buried mid-line after non-comment code wouldn't be caught if the line also starts with a comment-like pattern. Low probability given codebase conventions. — *Security Hardening — Command Injection Elimination*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** truncateSummary word-boundary test uses toBeLessThanOrEqual instead of exact value assertion — *Proof Intelligence Hardening*

### packages/cli/vitest.config.ts

- **code:** vitest.config.ts timeout changes not in spec — CI-specific testTimeout and hookTimeout added — *Proof Intelligence Hardening*

### General

- **test:** No dedicated integration tests for command entry point injection rejection — saveArtifact, completeWork, createPr, strengthen — *Security Hardening — Command Injection Elimination*
- **test:** No dedicated tests for v1-release-prep contract — assertions verified by source inspection only — *V1 Release Prep*


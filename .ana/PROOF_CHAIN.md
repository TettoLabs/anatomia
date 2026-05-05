# Proof Chain Dashboard

51 runs · 64 active · 63 lessons · 0 promoted · 159 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/tests/commands/work.test.ts | 8 | 6 |
| packages/cli/tests/commands/proof.test.ts | 7 | 3 |
| packages/cli/src/utils/proofSummary.ts | 6 | 5 |
| packages/cli/src/commands/proof.ts | 4 | 3 |
| packages/cli/tests/templates/agent-proof-context.test.ts | 3 | 2 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 64 total)

### .github/workflows/release.yml

- **code:** release.yml copies README/CHANGELOG separately from prepublishOnly — two sources of truth for doc copying — *V1 Release Prep*

### .husky/pre-commit

- **code:** Pre-commit comment claims ~9s / 10s threshold — will drift as test count grows (1807 now) — *V1 Code Changes*

### package.json

- **code:** Release script 'cd packages/cli && npm version' requires a semver argument — no guard or help text — *V1 Release Prep*

### packages/cli/package.json

- **code:** npm pack dry-run doesn't include README.md or CHANGELOG.md — prepublishOnly required first — *V1 Release Prep*
- **code:** prepublishOnly relies on relative ../../ path — breaks if package depth changes — *V1 Documentation Overhaul*
- **code:** README.md and CHANGELOG.md cannot be verified with npm pack --dry-run — only exist after prepublishOnly — *V1 Documentation Overhaul*

### packages/cli/src/commands/proof.ts

- **code:** Lesson command catch block at proof.ts:1141 loses error detail — swallows commit failure cause — *Proof Intelligence Hardening*
- **code:** Lesson command duplicates close's finding-search loop pattern — 4 identical loops across lesson, close, promote, strengthen — *Proof Intelligence Hardening*
- **code:** Unknown severity/action values silently dropped from fixed-key objects — by_severity sum can be less than total_active — *Audit JSON Severity Summary*

### packages/cli/src/commands/work.ts

- **code:** guardFailResult JSDoc first line says 'Write proof chain files' — copy-paste from writeProofChain description — *Proof Intelligence Hardening*

### packages/cli/src/engine/detectors/git.ts

- **code:** git.ts in src/engine/detectors/ retains execSync — architecturally correct (engine boundary, not commands/utils) but is the last remaining execSync in the codebase outside tests. Future hardening could migrate this to spawnSync for consistency. — *Security Hardening — Command Injection Elimination*

### packages/cli/src/utils/git-operations.ts

- **code:** getCurrentBranch still uses execSync — not hardened by this phase — *Security Hardening — Command Injection Elimination*
- **code:** runGit defaults exitCode to 1 when spawnSync returns null status (signal kill). This is reasonable but means SIGKILL'd git processes appear as generic failures — no way to distinguish 'command failed' from 'process was killed'. Acceptable for CLI use. — *Security Hardening — Command Injection Elimination*

### packages/cli/src/utils/proofSummary.ts

- **code:** proofSummary.ts ~1550 lines — past comfort threshold, known from prior cycles — *V1 Code Changes*

### packages/cli/src/utils/validators.ts

- **code:** SLUG_PATTERN exported but only consumed by test file — no source imports the raw regex — *Security Hardening — Command Injection Elimination*

### packages/cli/tests/commands/proof.test.ts

- **test:** A008 active-only test uses fixture with only active findings — no closed finding to prove exclusion — *Audit JSON Severity Summary*
- **test:** A013 meta block test uses toBeDefined() — verifies existence not value preservation — *Audit JSON Severity Summary*
- **test:** 5-finding fixture manually duplicated three times across test blocks instead of shared constant — *Audit JSON Severity Summary*

### packages/cli/tests/commands/work.test.ts

- **test:** A016-A019 @ana tags point to pre-existing branchPrefix template tests, not command entry point validation — *Security Hardening — Command Injection Elimination*
- **test:** A014 nudge check uses specific patterns ('→ claude', '→ ana proof') — a new nudge format would slip through — *Strengthen Weak Test Assertions*
- **test:** UNVERIFIED test creates full project fixture manually instead of using createMergedProject helper — 60 lines vs ~5 lines — *Strengthen Weak Test Assertions*

### packages/cli/tests/engine/detectors/documentation.test.ts

- **test:** documentation.test.ts assertion removed for packages/cli/README.md — justified but reduces dogfood coverage — *V1 Documentation Overhaul*

### packages/cli/tests/utils/git-operations.test.ts

- **test:** A010 test mocks process.exit — after mock, readArtifactBranch continues and returns invalid branch to caller. Correct in production but test pattern allows post-exit execution. — *Security Hardening — Command Injection Elimination*
- **test:** Enforcement test (A023) asserts on source code content via grep — violates testing-standards skill rule 'never assert on source code content' but is the only practical way to enforce convention. Spec explicitly requested this pattern. — *Security Hardening — Command Injection Elimination*
- **test:** Enforcement test comment-filter heuristic checks line prefix only (starts with //, *, /*). An execSync buried mid-line after non-comment code wouldn't be caught if the line also starts with a comment-like pattern. Low probability given codebase conventions. — *Security Hardening — Command Injection Elimination*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** Remaining toBeGreaterThan(0) in proofSummary.test.ts — 21 instances outside this spec's scope still use weak assertions — *Strengthen Weak Test Assertions*

### README.md

- **code:** README Development section uses absolute GitHub URLs for CONTRIBUTING/ARCHITECTURE — correct since README is at root — *V1 Documentation Overhaul*
- **code:** Scan output block in README is representative example, not live output — cannot be mechanically validated — *V1 Documentation Overhaul*

### General

- **test:** No dedicated integration tests for command entry point injection rejection — saveArtifact, completeWork, createPr, strengthen — *Security Hardening — Command Injection Elimination*
- **test:** No dedicated tests for v1-release-prep contract — assertions verified by source inspection only — *V1 Release Prep*


# Proof Chain Dashboard

49 runs · 74 active · 53 lessons · 0 promoted · 132 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/tests/commands/proof.test.ts | 10 | 6 |
| packages/cli/tests/commands/work.test.ts | 9 | 5 |
| packages/cli/src/utils/proofSummary.ts | 8 | 6 |
| packages/cli/src/commands/proof.ts | 5 | 5 |
| packages/cli/src/commands/work.ts | 5 | 3 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 74 total)

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

- **code:** Unknown severity/action values silently dropped from fixed-key objects — by_severity sum can be less than total_active — *Audit JSON Severity Summary*
- **code:** Zero-run JSON path hardcodes verification defaults inline (proof.ts:1749) rather than calling computeFirstPassRate([]) — duplicate knowledge of default shape — *Proof Health V2*

### packages/cli/src/commands/work.ts

- **code:** Untested defensive branches in startWork — 'not a git repo' and 'git pull conflict' paths have no dedicated unit tests — *Proof Health V2*
- **code:** Dual FAIL guard creates maintenance surface — two independent checks for same condition at L776 and L1179 — *Proof Health V2*
- **code:** Multi-phase error lost phase number — generic message no longer identifies which phase failed — *Proof Health V2*

### packages/cli/src/utils/proofSummary.ts

- **code:** Theoretical false-match in parseACResults regex — bullet lines outside AC section containing PASS/FAIL could inflate counts — *V1 Code Changes*
- **code:** proofSummary.ts ~1550 lines — past comfort threshold, known from prior cycles — *V1 Code Changes*

### packages/cli/templates/.claude/agents/ana-learn.md

- **code:** Residual 'accept-action findings' in audit usage guidance reinforces batch framing — *Learn Severity-Based Triage*
- **code:** 'Accept-action findings are pre-classified for closure' in Field Semantics section perpetuates batch framing language — *Learn Severity-Based Triage*
- **code:** Edge Cases section still says 'Cap at ~30 per session' — contradicts new 'no arbitrary cap' guidance in Session Approach — *Learn Template Session Fixes*

### packages/cli/tests/commands/proof.test.ts

- **test:** A008 active-only test uses fixture with only active findings — no closed finding to prove exclusion — *Audit JSON Severity Summary*
- **test:** A013 meta block test uses toBeDefined() — verifies existence not value preservation — *Audit JSON Severity Summary*
- **test:** 5-finding fixture manually duplicated three times across test blocks instead of shared constant — *Audit JSON Severity Summary*
- **test:** A014 cap test uses toBeLessThanOrEqual(5) instead of toBe(5) — passes even if cap logic is broken and returns 0 items — *Proof Health V2*
- **test:** No direct unit tests for computeFirstPassRate or computePipelineStats — only covered through integration tests via runProof(['health']) — *Proof Health V2*

### packages/cli/tests/commands/work.test.ts

- **test:** A014 nudge check uses specific patterns ('→ claude', '→ ana proof') — a new nudge format would slip through — *Strengthen Weak Test Assertions*
- **test:** UNVERIFIED test creates full project fixture manually instead of using createMergedProject helper — 60 lines vs ~5 lines — *Strengthen Weak Test Assertions*
- **code:** Timestamp recency check (before/after window) in A010 test may flake on extremely slow CI — window depends on test execution speed — *Strengthen Weak Test Assertions*

### packages/cli/tests/engine/detectors/documentation.test.ts

- **test:** documentation.test.ts assertion removed for packages/cli/README.md — justified but reduces dogfood coverage — *V1 Documentation Overhaul*

### packages/cli/tests/utils/proofSummary.test.ts

- **test:** No false-match edge case test for non-AC bullet lines containing status words — *V1 Code Changes*
- **test:** Remaining toBeGreaterThan(0) in proofSummary.test.ts — 21 instances outside this spec's scope still use weak assertions — *Strengthen Weak Test Assertions*

### README.md

- **code:** README Development section uses absolute GitHub URLs for CONTRIBUTING/ARCHITECTURE — correct since README is at root — *V1 Documentation Overhaul*
- **code:** Scan output block in README is representative example, not live output — cannot be mechanically validated — *V1 Documentation Overhaul*

### General

- **test:** No dedicated tests for v1-release-prep contract — assertions verified by source inspection only — *V1 Release Prep*


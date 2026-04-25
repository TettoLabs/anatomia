# Build Report: Replace PROOF_CHAIN.md reads with targeted proof context queries

**Created by:** AnaBuild
**Date:** 2026-04-25
**Spec:** .ana/plans/active/proof-chain-targeted-queries/spec.md
**Branch:** feature/proof-chain-targeted-queries

## What Was Built
- `packages/cli/templates/.claude/agents/ana.md` (modified): Removed PROOF_CHAIN.md bullet from Step 1 context list, changed exploration step 3 to reference `ana proof context {files}` command, simplified checkpoint to reference "proof chain findings" without prescribing a file read
- `packages/cli/templates/.claude/agents/ana-plan.md` (modified): Removed PROOF_CHAIN.md bullet from Step 2 context list, simplified checkpoint to remove PROOF_CHAIN.md clause
- `packages/cli/templates/.claude/agents/ana-build.md` (modified): Removed the PROOF_CHAIN.md read instruction from "Load Skills and Context" section
- `packages/cli/templates/.claude/agents/ana-verify.md` (modified): Removed PROOF_CHAIN.md bullet from Step 4, added targeted `ana proof context` instruction after Step 5 with fallback for command unavailability
- `.claude/agents/ana.md` (modified): Synced from template
- `.claude/agents/ana-plan.md` (modified): Synced from template (also resolves branchPrefix drift)
- `.claude/agents/ana-build.md` (modified): Synced from template (also resolves branchPrefix drift)
- `.claude/agents/ana-verify.md` (modified): Synced from template (also resolves branchPrefix drift)
- `packages/cli/tests/templates/agent-proof-context.test.ts` (created): 8 tests covering all contract assertions — reads template files and asserts on content strings

## PR Summary

- Replace manual PROOF_CHAIN.md file reads with targeted `ana proof context {files}` command queries in Ana and Verify agent templates
- Remove PROOF_CHAIN.md reads entirely from Plan and Build agents (they receive proof context through pipeline document flow)
- Add fallback instruction in Verify for when the command is unavailable
- Sync all four dogfood agent definitions to match templates (also resolves branchPrefix drift)
- Add 8 contract assertion tests verifying template content

## Acceptance Criteria Coverage

- AC1 "Ana references `ana proof context {files}` in exploration steps" → agent-proof-context.test.ts A001 (1 assertion)
- AC2 "Ana's checkpoint references findings without prescribing a second query" → agent-proof-context.test.ts A002 (2 assertions — finds checkpoint section, checks no PROOF_CHAIN.md)
- AC3 "Ana's Step 1 no longer references PROOF_CHAIN.md" → agent-proof-context.test.ts A003 (2 assertions — finds section, checks no PROOF_CHAIN.md)
- AC4 "Verify references `ana proof context` after loading documents" → agent-proof-context.test.ts A004 (1 assertion)
- AC5 "Plan has zero PROOF_CHAIN.md references" → agent-proof-context.test.ts A006 (1 assertion)
- AC6 "Build has zero PROOF_CHAIN.md references" → agent-proof-context.test.ts A007 (1 assertion)
- AC7 "No agent definition references PROOF_CHAIN.md as a file to read" → covered by A003, A006, A007 combined; ana-verify.md only references it in fallback context
- AC8 "Verify includes fallback for command unavailability" → agent-proof-context.test.ts A005 (1 assertion)
- AC9 "Dogfood definitions match templates" → agent-proof-context.test.ts A008 (4 equality checks)
- AC10 "All existing tests continue to pass" → 1467 baseline tests still pass, 0 regressions

## Implementation Decisions

None. The spec was fully prescriptive — all edits were specified as exact text replacements.

## Deviations from Contract

None — contract followed exactly.

## Test Results

### Baseline (before changes)
```
(cd packages/cli && pnpm vitest run)
Test Files  96 passed (96)
     Tests  1467 passed | 2 skipped (1469)
```

### After Changes
```
(cd packages/cli && pnpm vitest run)
Test Files  97 passed (97)
     Tests  1475 passed | 2 skipped (1477)
```

### Comparison
- Tests added: 8
- Tests removed: 0
- Regressions: none

### New Tests Written
- `packages/cli/tests/templates/agent-proof-context.test.ts`: 8 tests — verifies ana.md proof context command presence, checkpoint cleanup, Step 1 cleanup; ana-plan.md and ana-build.md have zero PROOF_CHAIN.md references; ana-verify.md has targeted command and fallback; dogfood files match templates

## Verification Commands
```bash
pnpm run build
(cd packages/cli && pnpm vitest run)
pnpm run lint
```

## Git History
```
e9f35fd [proof-chain-targeted-queries] Add contract assertion tests
0349aa5 [proof-chain-targeted-queries] Sync dogfood agent definitions from templates
d97efe2 [proof-chain-targeted-queries] Replace PROOF_CHAIN.md reads with targeted queries in templates
```

## Open Issues

- The spec notes exactly ONE `.ana/PROOF_CHAIN.md` literal should remain across all four templates (in ana-verify.md's fallback). Verified: `grep -c PROOF_CHAIN` returns ana.md:0, ana-build.md:0, ana-plan.md:0, ana-verify.md:1. Correct.

Verified complete by second pass.

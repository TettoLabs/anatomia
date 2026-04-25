# Spec: Replace PROOF_CHAIN.md reads with targeted proof context queries

**Created by:** AnaPlan
**Date:** 2026-04-25
**Scope:** .ana/plans/active/proof-chain-targeted-queries/scope.md

## Approach

Seven text edits across four agent template files, then sync all four to dogfood. One new test file for contract assertions.

The bookend pattern: Ana (first agent) queries proof context during exploration when files are known. Verify (last agent) queries proof context after loading the contract when file_changes are known. Plan and Build in the middle lose their reads entirely — they receive proof context through the pipeline's natural document flow (scope for Plan, spec for Build).

Edit templates first, then copy all four to `.claude/agents/` to sync dogfood. The copy also resolves existing branchPrefix drift in the dogfood versions of plan, build, and verify.

No new infrastructure. The `ana proof context` command already exists. This is wiring.

## Output Mockups

No user-facing output changes. The changes are in agent template instructions that shape agent behavior during pipeline runs.

## File Changes

Note: The machine-readable `file_changes` list is in contract.yaml. This section provides prose context for the builder.

### packages/cli/templates/.claude/agents/ana.md (modify)
**What changes:** Three edits:
1. Delete the `.ana/PROOF_CHAIN.md` bullet from the Step 1 context list (the bullet starting with `- \`.ana/PROOF_CHAIN.md\`` in the "Before Scoping or Recommending" section).
2. In the exploration numbered list, modify step 3 "Check proof chain" to reference the command: change `surface relevant lessons for the affected module` to `run \`ana proof context {files}\` to surface relevant lessons for the affected modules`.
3. In the checkpoint paragraph (the one starting with "**ALWAYS present the structured preview**"), remove the PROOF_CHAIN.md clause. Change `re-read \`.ana/context/design-principles.md\` and check \`.ana/PROOF_CHAIN.md\` for entries touching the modules involved. You should be able to name which principles shaped this scope or relevant proofs if asked.` to `re-read \`.ana/context/design-principles.md\`. You should be able to name which principles shaped this scope or relevant proof chain findings if asked.`
**Pattern to follow:** The exploration step already has the right structure — just adding the command name.
**Why:** Without this, Ana reads all 170+ lines of PROOF_CHAIN.md and manually filters. The command does filtering mechanically.

### packages/cli/templates/.claude/agents/ana-plan.md (modify)
**What changes:** Two edits:
1. Delete the `.ana/PROOF_CHAIN.md` bullet from the Step 2 "Load Context" list (the bullet starting with `- \`.ana/PROOF_CHAIN.md\``).
2. In the Step 4 checkpoint paragraph, remove the PROOF_CHAIN.md clause. Change `re-read \`.ana/context/design-principles.md\` and check \`.ana/PROOF_CHAIN.md\` for entries touching the modules involved. You should be able to name which principles shaped your design decisions or relevant proofs if asked. Then present` to `re-read \`.ana/context/design-principles.md\`. You should be able to name which principles shaped your design decisions if asked. Then present`.
**Pattern to follow:** Same checkpoint simplification pattern as ana.md.
**Why:** Plan receives proof context through the scope (which Ana curates). Adding commands here wastes context tokens on intelligence Plan already gets through document flow.

### packages/cli/templates/.claude/agents/ana-build.md (modify)
**What changes:** One edit — delete the sentence `Read \`.ana/PROOF_CHAIN.md\` if it exists. If you're building in a module with proof chain entries, reference past lessons.` from the "Load Skills and Context" section.
**Pattern to follow:** N/A — pure deletion.
**Why:** Build receives proof context through the spec (which Plan curates). The direct read wastes context tokens.

### packages/cli/templates/.claude/agents/ana-verify.md (modify)
**What changes:** Two edits:
1. Delete the `.ana/PROOF_CHAIN.md` bullet from Step 4 "Load Context" (the multi-line bullet starting with `- \`.ana/PROOF_CHAIN.md\` — institutional memory`).
2. Add a new proof context instruction AFTER Step 5's "Known paths" block and BEFORE the `### 6. Load Skills` heading. The new text goes between the last bullet of the "Known paths" list and the Step 6 heading. Insert a blank line, then:

```
After reading the contract, run `ana proof context {files from contract file_changes}` to surface proof chain history for the modules this build touches. Let the callouts inform what you pay attention to during code review — they're context, not a checklist. If the build interacts with a known issue (addresses it, changes its impact, or works around it), note that in your callouts.

If the command is not available: check `.ana/PROOF_CHAIN.md` if it exists and look for Active Issues mentioning the modules from file_changes.
```

**Pattern to follow:** The pre-check fallback pattern at ana-verify.md (the `If the command fails or is not available:` clause after the pre-check command in Step 1).
**Why:** Verify needs proof context positioned AFTER the contract is loaded (Step 5) so file_changes are known. The fallback follows the established pre-check fallback pattern for CLI command unavailability.

### .claude/agents/ana.md (modify)
**What changes:** Copy from `packages/cli/templates/.claude/agents/ana.md` after template edits.
**Why:** Sync dogfood to match templates.

### .claude/agents/ana-plan.md (modify)
**What changes:** Copy from `packages/cli/templates/.claude/agents/ana-plan.md` after template edits.
**Why:** Sync dogfood to match templates. Also resolves existing branchPrefix drift.

### .claude/agents/ana-build.md (modify)
**What changes:** Copy from `packages/cli/templates/.claude/agents/ana-build.md` after template edits.
**Why:** Sync dogfood to match templates. Also resolves existing branchPrefix drift.

### .claude/agents/ana-verify.md (modify)
**What changes:** Copy from `packages/cli/templates/.claude/agents/ana-verify.md` after template edits.
**Why:** Sync dogfood to match templates. Also resolves existing branchPrefix drift.

### packages/cli/tests/templates/agent-proof-context.test.ts (create)
**What changes:** New test file that reads the four agent template files and asserts on content for contract assertions. Each test reads a template file, checks for string presence or absence.
**Pattern to follow:** The existing `packages/cli/tests/templates/cross-platform.test.ts` — same structure (read file, assert content). Use `readFileSync` from `node:fs` with the template path resolved via `path.join(__dirname, '../../templates/.claude/agents/', filename)`.
**Why:** Contract assertions require testable `@ana` tags. Without this file, all assertions would be UNCOVERED.

## Acceptance Criteria

- AC1: Ana's agent definition references `ana proof context {files}` in the exploration steps, not `.ana/PROOF_CHAIN.md`
- AC2: Ana's checkpoint instruction references proof chain findings without prescribing a second query
- AC3: Ana's Step 1 (Before Scoping) no longer references `.ana/PROOF_CHAIN.md`
- AC4: Verify's agent definition references `ana proof context {files from contract file_changes}` after loading verification documents, not `.ana/PROOF_CHAIN.md` at Step 4
- AC5: Plan's agent definition contains zero references to `.ana/PROOF_CHAIN.md`
- AC6: Build's agent definition contains zero references to `.ana/PROOF_CHAIN.md`
- AC7: No agent definition references `.ana/PROOF_CHAIN.md` as a file to read
- AC8: Verify's proof context instruction includes a fallback for when the command is unavailable, following the existing pre-check fallback pattern
- AC9: Dogfood agent definitions (`.claude/agents/`) match templates exactly
- AC10: All existing tests continue to pass — no regressions

## Testing Strategy

- **Unit tests:** One test file (`packages/cli/tests/templates/agent-proof-context.test.ts`) with 8 tests reading template files and asserting on content strings. No mocking needed — the templates are static files in the repo.
- **Integration tests:** None needed. Templates are copied verbatim during init — existing init tests verify copying.
- **Edge cases:** None. These are string presence/absence checks on static markdown files.

## Dependencies

None. The `ana proof context` command already exists. All changes are to markdown template files.

## Constraints

- Templates ship to all Anatomia users via `ana init`. Every character earns its place.
- Verify's proof context instruction must be positioned AFTER Step 5 (contract loading) so file_changes are known.
- Do NOT add a fallback to ana.md — Ana is in conversation with the developer, so command failures are visible. Adding fallback text wastes context tokens.

## Gotchas

- The PROOF_CHAIN.md reference in ana.md line 109 says "Check proof chain" without the literal string `.ana/PROOF_CHAIN.md` — it's a conceptual reference, not a file path. grep for `PROOF_CHAIN` won't find it. Search for `Check proof chain` instead.
- After all changes, exactly ONE `.ana/PROOF_CHAIN.md` literal string should remain across all four templates: in ana-verify.md's fallback instruction. Verify this before committing.
- The dogfood copy resolves branchPrefix drift (templates use `{branchPrefix}`, dogfood still uses `feature/`). This is intentional — the copy makes them match.
- ana-setup.md exists in `.claude/agents/` but is NOT being changed — it has no PROOF_CHAIN.md references.

## Build Brief

### Rules That Apply
- Every character earns its place — agent template instructions are context tokens for every pipeline run
- Prefer named exports, `import type` for type-only imports
- All imports use `.js` extensions and `node:` prefix for built-ins
- Explicit return types on exported functions (not relevant for test file, but note)
- Use `readFileSync` from `node:fs` in tests (the cross-platform.test.ts pattern uses async import but `readFileSync` is simpler for static file reads)

### Pattern Extracts

Existing test pattern from `packages/cli/tests/templates/cross-platform.test.ts` (lines 1-17):
```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';

describe('Cross-Platform Path Handling', () => {
  // Note: We can't actually test on Windows/Linux without CI,
  // but we can check templates don't have hardcoded paths

  it('should not have hardcoded forward slashes in TypeScript code', async () => {
    const fs = await import('node:fs/promises');

    // After Item 14c init.ts split, the path-using scaffolding code lives
    // in commands/init/assets.ts. Check it uses path.join.
    const assetsContent = await fs.readFile('src/commands/init/assets.ts', 'utf-8');
    expect(assetsContent).toContain('path.join');
  });
```

Pre-check fallback pattern from `packages/cli/templates/.claude/agents/ana-verify.md` (lines 130-131):
```
If the command fails or is not available: read contract.yaml directly, manually grep test files for `@ana` tags, and build your own coverage table.
```

### Checkpoint Commands

- After template edits: `grep -c PROOF_CHAIN packages/cli/templates/.claude/agents/*.md` — Expected: ana.md:0, ana-build.md:0, ana-plan.md:0, ana-verify.md:1
- After dogfood sync: `diff packages/cli/templates/.claude/agents/ana-plan.md .claude/agents/ana-plan.md` — Expected: no output (identical)
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1468+ tests pass (1467 baseline + 1 new file)
- Lint: `pnpm run lint`

### Build Baseline

- Current tests: 1467 passed, 2 skipped
- Current test files: 96
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1475+ tests in 97 files (96 + 1 new test file with 8 tests)
- Regression focus: no code files are changing, only templates and tests. No regressions expected.

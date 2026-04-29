# Scope: Namespaced Assertion IDs

**Created by:** Ana
**Date:** 2026-04-29

## Intent

Tag collision (INFRA-064) is the most recurring finding in the proof system — 7 instances across 7 runs. Every contract generates `A001`, `A002`, etc. Pre-check matches `@ana A001` in test files from ANY feature's contract, not just the current one. At 25 entries, pre-check reports false COVEREDs on ~14% of assertions. At 50 entries it's meaningless.

Fixing this proves the learning loop: recurring pattern identified → cause fixed → pattern stops appearing. After this ships, the 7 tag-collision findings can all be closed. That's 12% of the active set removed by fixing one root cause.

## Complexity Assessment

- **Size:** small
- **Files affected:**
  - `packages/cli/templates/.claude/agents/ana-plan.md` — prefix generation instruction with slug-to-prefix rule
  - `packages/cli/templates/.claude/agents/ana-build.md` — tag format example with prefix
  - `packages/cli/templates/.claude/agents/ana-verify.md` — ID reference format with prefix
  - `.claude/agents/ana-plan.md` — dogfood sync
  - `.claude/agents/ana-build.md` — dogfood sync
  - `.claude/agents/ana-verify.md` — dogfood sync
  - `packages/cli/src/commands/verify.ts` — pre-check regex, one character addition
  - Test files — pre-check tests for prefixed matching
- **Blast radius:** Low. The regex change is one character (`[\w,\s]*` → `[\w,\s-]*`). Template changes affect future pipeline runs only. Existing completed contracts keep unprefixed IDs — pre-check only runs against the CURRENT contract, so old tags are irrelevant.
- **Estimated effort:** ~45 minutes pipeline time
- **Multi-phase:** no

## Approach

Contract assertion IDs get a slug-derived prefix. `A001` becomes `HGCC-A001` (for `harden-git-commit-calls`). The prefix is generated from the slug by the Plan agent during contract creation. Pre-check matches the full namespaced ID. Tag collisions eliminated at any scale.

The prefix rule: take the first letter of each word in the slug, uppercase. Multi-word slugs: `harden-git-commit-calls` → `HGCC`, `fix-auth-timeout` → `FAT`, `add-export-csv` → `AEC`. Single-word slugs: take the first 3 characters uppercase. `fix` → `FIX`, `clean` → `CLE`. If the generated prefix collides with a recent prefix or is shorter than 3 characters, extend by one character from the slug. Plan checks existing contracts in the plan directory and avoids collisions.

The pre-check regex at verify.ts:163 uses `[\w,\s]*` between `@ana` and the assertion ID. This character class doesn't match hyphens. When a test file tags multiple prefixed assertions (`@ana HGCC-A001, HGCC-A002`), the regex for A002 needs to skip past `HGCC-A001, ` which contains a hyphen. Fix: `[\w,\s]*` → `[\w,\s-]*`. One character.

## Acceptance Criteria

- AC1: Plan template instructs Plan to generate a slug-derived prefix for all assertion IDs. The instruction includes the prefix rule: first letter of each slug word, uppercase, for multi-word slugs. First 3 characters uppercase for single-word slugs. Minimum 3 characters.
- AC2: Plan template instructs Plan to check existing contracts in `.ana/plans/` and avoid prefix collisions. If collision detected, extend by one character.
- AC3: Contract YAML uses prefixed IDs: `HGCC-A001` format.
- AC4: Build template tag format example uses prefixed IDs: `// @ana HGCC-A001`.
- AC5: Verify template reference format uses full prefixed IDs.
- AC6: Pre-check regex at verify.ts:163 matches prefixed IDs correctly. `[\w,\s]*` → `[\w,\s-]*`.
- AC7: Pre-check matches `@ana HGCC-A001` in test files.
- AC8: Pre-check matches comma-separated prefixed IDs: `@ana HGCC-A001, HGCC-A002` — both IDs reported as COVERED.
- AC9: Pre-check does NOT match unprefixed `A001` when the contract specifies `HGCC-A001`.
- AC10: Dogfood copies (`.claude/agents/ana-plan.md`, `.claude/agents/ana-build.md`, `.claude/agents/ana-verify.md`) contain the same prefix instructions as the templates. The changed sections match exactly.
- AC11: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC12: Lint passes: `pnpm lint`

## Edge Cases & Risks

- **Prefix collision.** `fix-git-commit` and `fix-git-config` both produce `FGC`. The Plan template instructs collision avoidance, but enforcement is advisory (Plan checks existing contracts). At this project's scale, collision is unlikely. If it occurs, the IDs are still unique within their own contract — pre-check is scoped to the current contract only.
- **Single-character slugs.** A slug like `x` would produce prefix `X` (1 char). The 3-character minimum rule catches this: `x` → `XXX` (pad with repeated characters) or the planner chooses a more descriptive slug. In practice, single-character slugs don't occur.
- **Existing unprefixed tags in test files.** Old test files contain `@ana A001` tags from previous contracts. These won't match prefixed IDs (`HGCC-A001`), so pre-check correctly reports them as UNCOVERED for the current contract. No cleanup needed — the old tags are harmless artifacts.

## Rejected Approaches

- **Random prefix.** Collision-proof but opaque. `X7Q-A001` tells you nothing about the feature. Slug prefix is human-readable and requires no global state.
- **Sequential namespace (S25-A001).** Requires tracking a global counter. Adds state management for zero benefit over slug-derived prefixes.
- **Retroactive re-tagging of old test files.** Old `@ana A001` tags from completed contracts are harmless — pre-check only runs against the current contract. Re-tagging is churn with no value.

## Open Questions

None.

## Exploration Findings

### Patterns Discovered

- Pre-check regex at verify.ts:163: `new RegExp('@ana\\s+[\\w,\\s]*\\b' + assertion.id + '\\b')`. The `\b` word boundary works with hyphens — `\b` treats `-` as a non-word character, so `\bHGCC-A001\b` matches correctly. The issue is `[\w,\s]*` in the middle not matching hyphens when scanning past earlier prefixed IDs in a comma-separated list.
- The same regex pattern appears at verify.ts:200 (if a second pre-check location exists). The planner should verify whether both locations need the fix.

### Constraints Discovered

- [TYPE-VERIFIED] Pre-check regex (verify.ts:163) — `[\w,\s]*` character class, one-character fix to `[\w,\s-]*`
- [OBSERVED] Pre-check scoped to current contract only — `contract.assertions` loop at verify.ts:160. Old unprefixed tags don't interfere.
- [OBSERVED] Tag-collision findings span 7 entries: structured-findings-companion-C4, clean-ground-C1, close-the-loop entries, harden-git-commit-calls entries. All closeable after this ships.

### Test Infrastructure

- Pre-check tests in `verify.test.ts` or `artifact.test.ts` — create test files with `@ana` tags, run pre-check against contract assertions, assert COVERED/UNCOVERED. New tests follow this pattern with prefixed IDs.

## For AnaPlan

### Structural Analog

`harden-git-commit-calls` (`.ana/plans/completed/harden-git-commit-calls/scope.md`). Different domain but same shape: a small code change (regex/spawn) plus template updates across Plan/Build/Verify + dogfood sync. The template sync pattern is identical.

### Relevant Code Paths

- `packages/cli/src/commands/verify.ts:160-170` — pre-check assertion loop with regex construction
- `packages/cli/templates/.claude/agents/ana-plan.md` — contract creation instructions, assertion ID format
- `packages/cli/templates/.claude/agents/ana-build.md` — `@ana` tag format example
- `packages/cli/templates/.claude/agents/ana-verify.md` — assertion reference format

### Patterns to Follow

- Template dogfood sync pattern from `structured-findings-companion` — changed sections match exactly between template and `.claude/agents/` copy
- Pre-check test pattern — create temp test files with tags, construct contract assertions, run pre-check, assert coverage results

### Known Gotchas

- Verify.ts may have the pre-check regex in more than one location. The planner should grep for `@ana\\\\s+` or `\\w,\\s` to find all instances.
- The Plan template is the critical file — it must include the prefix rule clearly enough that the LLM generates prefixed IDs consistently. The instruction should include 2–3 concrete examples covering multi-word and single-word slugs.

### Things to Investigate

- Are there pre-check tests that assert on unprefixed ID matching? Those tests would need updating to use prefixed IDs, or new tests added alongside them.

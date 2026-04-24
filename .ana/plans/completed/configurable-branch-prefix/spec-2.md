# Spec: Configurable branch prefix — Phase 2 (Migration)

**Created by:** AnaPlan
**Date:** 2026-04-24
**Scope:** .ana/plans/active/configurable-branch-prefix/scope.md

## Approach

Replace every hardcoded `feature/` reference in source files and templates with the configured `branchPrefix` from `ana.json`. This is where behavior actually changes.

**Source file strategy:** Three commands consume the prefix: `work.ts` (18 references), `artifact.ts` (1 reference), `pr.ts` (1 reference), plus `skills.ts` (1 reference). The approach differs by file:

- **work.ts** — The linchpin is `getFeatureBranch()`. Rename it to `getWorkBranch()`, add a `branchPrefix` parameter, and replace the hardcoded `feature/${slug}` with `${branchPrefix}${slug}`. Then thread the prefix through `getNextAction()` as a parameter (called in a loop — cleaner than reading ana.json per call). The `WorkItem` interface renames `featureBranch` → `workBranch`. In `getWorkStatus()`, read the prefix once via `readBranchPrefix()` at the top alongside `readArtifactBranch()`, then pass it down. In `completeWork()`, same pattern — read once, use throughout.

- **artifact.ts** — One error message at line 482 says `git checkout feature/${slug}`. Replace with the configured prefix.

- **pr.ts** — One `startsWith('feature/')` check at line 164. Replace with configured prefix. This is a soft warning, not a gate.

- **skills.ts** — `injectGitWorkflow()` has a hardcoded `feature/{slug}` string. Replace with `{branchPrefix}{slug}` and add a note that agents read `branchPrefix` from ana.json.

**Template strategy:** 13 references across 3 agent template files. Replace `feature/{slug}` with `{branchPrefix}{slug}`. Add a one-line instruction near the top of each template's relevant section: "Read `branchPrefix` from `.ana/ana.json` (default: `feature/`). Use `{branchPrefix}{slug}` for branch names."

**Test strategy:** Each test file has a `createTestProject()` or `createWorkTestProject()` helper that writes `ana.json`. Add `branchPrefix` to the options bag. Existing tests continue to use the default `"feature/"`. New test cases use `"dev/"` to prove the migration end-to-end.

## Output Mockups

`ana work status` with `branchPrefix: "dev/"`:
```
Pipeline Status (artifact branch: main)

  my-feature (1 phase):
    scope.md         ✓ main
    plan.md          ✓ main
    spec.md          ✓ main
    Stage: ready-for-build
    → git checkout dev/my-feature && claude --agent ana-build
```

`ana work complete` error with `branchPrefix: "dev/"`:
```
Error: `dev/my-feature` has not been merged into `main`.
Merge the PR first, then run this command again.
```

`ana artifact save` error with `branchPrefix: "dev/"`:
```
Error: You're on `main`. Build report belongs on a feature branch.
Run: git checkout dev/test-slug
```

`ana pr create` warning with `branchPrefix: "dev/"`:
```
Warning: Current branch is 'main' (expected 'dev/{slug}').
```

## File Changes

### `src/commands/work.ts` (modify)
**What changes:** Rename `getFeatureBranch()` → `getWorkBranch()` with `branchPrefix` parameter. Rename `featureBranch` → `workBranch` in `WorkItem` interface and all usage sites. Thread `branchPrefix` through `getNextAction()`. Replace 18 hardcoded `feature/` references.
**Pattern to follow:** The existing `readArtifactBranch()` call at `getWorkStatus()` line 637 — `readBranchPrefix()` goes right next to it.
**Why:** This file has the most references (18). The rename from `featureBranch` to `workBranch` fixes a misleading name before anyone depends on the JSON output shape.

### `src/commands/artifact.ts` (modify)
**What changes:** Import `readBranchPrefix`, replace one hardcoded `feature/${slug}` in the error message at line 482.
**Pattern to follow:** The existing `readArtifactBranch()` import and call in the same file.
**Why:** Error message tells user to `git checkout feature/{slug}` — must use the configured prefix.

### `src/commands/pr.ts` (modify)
**What changes:** Import `readBranchPrefix`, replace `startsWith('feature/')` at line 164 with the configured prefix. Update the warning message text.
**Pattern to follow:** The existing `readArtifactBranch()` import at the top of the file.
**Why:** Branch prefix validation must use the configured value, not hardcoded `feature/`.

### `src/commands/init/skills.ts` (modify)
**What changes:** In `injectGitWorkflow()`, replace `feature/{slug}` with `{branchPrefix}{slug}` and add instruction for agents to read `branchPrefix` from ana.json.
**Pattern to follow:** The existing `injectGitWorkflow()` function at line 349. The function already takes `result: EngineResult` as parameter — it doesn't have access to ana.json. Since this is a Detected section generator (runs at init time, output is static text), read branchPrefix from the in-progress ana.json or use the placeholder convention.
**Why:** The git-workflow skill's Detected section currently tells agents `feature/{slug}` is the branch pattern. With configurable prefixes, this must reflect the configured value.

### `templates/.claude/agents/ana-build.md` (modify)
**What changes:** Replace 9 `feature/{slug}` references with `{branchPrefix}{slug}`. Add instruction to read `branchPrefix` from `.ana/ana.json`.
**Pattern to follow:** The template already uses `{slug}` as a placeholder convention. `{branchPrefix}` follows the same pattern.
**Why:** Agent definitions must instruct agents to use the configured prefix, not hardcoded `feature/`.

### `templates/.claude/agents/ana-plan.md` (modify)
**What changes:** Replace 2 `feature/{slug}` references with `{branchPrefix}{slug}`. Add instruction to read prefix from ana.json.
**Pattern to follow:** Same placeholder convention as ana-build.md.
**Why:** Plan specs reference branch names in the plan.md format.

### `templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Replace 2 `feature/{slug}` references with `{branchPrefix}{slug}`. Add instruction to read prefix from ana.json.
**Pattern to follow:** Same placeholder convention.
**Why:** Verify agent checks out the feature branch and references it in reports.

### `tests/commands/work.test.ts` (modify)
**What changes:** Add `branchPrefix` option to `createWorkTestProject()` helper. Add test cases using `branchPrefix: 'dev/'` to verify `getWorkStatus()` and `completeWork()` use the configured prefix. Verify the JSON output uses `workBranch` (not `featureBranch`).
**Pattern to follow:** The existing `createWorkTestProject()` helper at lines 33-96. The `artifactBranch` option is the pattern — `branchPrefix` follows identically.
**Why:** The test helper writes ana.json — `branchPrefix` must be part of the fixture for non-default prefix tests.

### `tests/commands/artifact.test.ts` (modify)
**What changes:** Add `branchPrefix` option to `createTestProject()` helper. Add test case verifying the error message uses the configured prefix.
**Pattern to follow:** The existing `createTestProject()` helper at lines 32-62.
**Why:** Prove the artifact error message uses the configured prefix, not hardcoded `feature/`.

### `tests/commands/pr.test.ts` (modify)
**What changes:** Add `branchPrefix` option to `createTestProject()` helper. Add test case verifying the warning uses the configured prefix.
**Pattern to follow:** The existing `createTestProject()` helper at lines 30-60.
**Why:** Prove the PR warning uses the configured prefix.

## Acceptance Criteria

- [ ] AC4: `ana work status` uses the configured prefix for branch detection and status messages
- [ ] AC5: `ana artifact save` uses the configured prefix for branch validation and error messages
- [ ] AC6: `ana pr create` uses the configured prefix for branch validation warnings
- [ ] AC7: `ana work complete` uses the configured prefix for merge verification and branch cleanup
- [ ] AC8: Agent template files reference `{branchPrefix}` placeholder and instruct agents to read from `ana.json`
- [ ] AC9: Tests pass with a non-`feature/` prefix (e.g., `dev/`) proving the migration works end-to-end
- [ ] AC10: The git-workflow skill Detected section uses the configured prefix instead of hardcoded `feature/`
- [ ] AC11: `WorkItem` interface uses `workBranch` instead of `featureBranch`
- [ ] Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors: `pnpm run build`

## Testing Strategy

- **Unit tests (work.test.ts):**
  - `getWorkStatus()` with `branchPrefix: 'dev/'` — next action commands use `dev/` prefix
  - `getWorkStatus()` with `branchPrefix: ''` — next action commands use bare slug
  - `getWorkStatus()` JSON output has `workBranch` key (not `featureBranch`)
  - `completeWork()` with `branchPrefix: 'dev/'` — merge verification uses correct branch name
  - `completeWork()` with `branchPrefix: 'dev/'` — branch cleanup uses correct branch name

- **Unit tests (artifact.test.ts):**
  - Error message with non-default prefix includes configured prefix in `git checkout` hint

- **Unit tests (pr.test.ts):**
  - Warning with non-default prefix checks `startsWith` against configured prefix

- **Edge cases:**
  - Empty string prefix (`branchPrefix: ""`) — branch is just `{slug}`, no separator
  - Missing `branchPrefix` in ana.json (old install) — falls back to `feature/`

## Dependencies

Phase 1 must be complete — `readBranchPrefix()` must exist in `git-operations.ts`.

## Constraints

- Existing tests with `feature/` prefix must continue passing unchanged. The migration is additive — default behavior is preserved.
- Template placeholder `{branchPrefix}` is documentation, not runtime substitution. Agents read ana.json directly.
- The `WorkItem` interface rename (`featureBranch` → `workBranch`) changes the JSON output shape. No known consumers — acceptable.

## Gotchas

- **`getWorkBranch()` branch listing uses glob.** The `git branch -a --list "*${slug}*"` pattern at work.ts:129 is prefix-agnostic — it matches any branch containing the slug. The prefix-specific matching happens on lines 134-135 where it looks for exact `feature/${slug}`. These lines must use `${branchPrefix}${slug}` instead.
- **`completeWork()` has 6 separate `feature/` references** spread across merge verification (lines 939, 948, 954, 961), branch deletion (line 1068), and remote deletion (line 1074). Miss one and the cleanup fails silently for non-default prefixes.
- **`getNextAction()` has 8 `feature/` references** across 8 stage-specific return statements (lines 507-544). They all follow the same pattern — bulk replacement.
- **`artifact.ts` reads `readArtifactBranch()` but not `readBranchPrefix()`.** The `validateBranch()` function at line 470 already receives `slug` as a parameter. Thread `branchPrefix` through the same path — read it in `saveArtifact()` and pass to `validateBranch()`.
- **`skills.ts` `injectGitWorkflow()` runs at init time with `EngineResult`, not ana.json.** It doesn't have access to the branchPrefix config. Two options: (a) pass branchPrefix as a parameter from the init caller, or (b) use the `{branchPrefix}` placeholder in the generated text like templates do. Option (b) is simpler and consistent with how templates handle it — the Detected section is read by agents who also read ana.json.
- **Template files are large.** Don't read the entire file to find `feature/` references — grep for them and make targeted replacements.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Explicit return types on all exported functions.
- Use `import type` for type-only imports.
- Error handling: commands use chalk.red + process.exit(1).
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

`getFeatureBranch()` from `src/commands/work.ts:127-141` — the function to rename and parameterize:

```typescript
function getFeatureBranch(slug: string): string | null {
  try {
    const output = execSync(`git branch -a --list "*${slug}*"`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (!output) return null;

    // Parse branches — prefer local over remote
    const branches = output.split('\n').map(b => b.trim().replace(/^\* /, '').replace(/^remotes\//, ''));
    const local = branches.find(b => b === `feature/${slug}`);
    const remote = branches.find(b => b === `origin/feature/${slug}`);

    return local || remote || null;
  } catch {
    return null;
  }
}
```

Becomes `getWorkBranch(slug: string, branchPrefix: string)` with lines 134-135 using `${branchPrefix}${slug}` and `origin/${branchPrefix}${slug}`.

`getNextAction()` from `src/commands/work.ts:497-548` — the function to parameterize:

```typescript
function getNextAction(stage: string, slug: string): string {
  // ... 8 return statements with `feature/${slug}` ...
}
```

Add `branchPrefix: string` parameter. All 8 returns change from `` `git checkout feature/${slug}` `` to `` `git checkout ${branchPrefix}${slug}` ``.

`createWorkTestProject()` helper from `tests/commands/work.test.ts:33-96` — the fixture to extend:

```typescript
async function createWorkTestProject(options: {
    artifactBranch?: string;
    slugs?: Array<{ ... }>;
  }): Promise<void> {
    const artifactBranch = options.artifactBranch || 'main';
    // ...
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify({ artifactBranch }),
      'utf-8'
    );
```

Add `branchPrefix?: string` to options. Include in the JSON: `JSON.stringify({ artifactBranch, ...(branchPrefix !== undefined && { branchPrefix }) })`. Omit when undefined so fallback tests work.

### Checkpoint Commands

- After work.ts migration: `(cd packages/cli && pnpm vitest run --run tests/commands/work.test.ts)` — Expected: all existing tests pass
- After all source changes: `pnpm run build` — Expected: clean build
- After test additions: `(cd packages/cli && pnpm vitest run)` — Expected: 1417+ baseline tests pass + new tests
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1417 passed, 2 skipped (95 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1417 + ~12 new tests (6 from Phase 1 + ~6 from Phase 2) in 96 test files
- Regression focus: `tests/commands/work.test.ts`, `tests/commands/artifact.test.ts`, `tests/commands/pr.test.ts` — all have hardcoded `feature/` in fixtures

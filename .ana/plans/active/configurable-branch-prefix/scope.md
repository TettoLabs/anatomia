# Scope: Configurable branch prefix

**Created by:** Ana
**Date:** 2026-04-24

## Intent
The pipeline hardcodes `feature/` as the branch prefix across ~36 source and template references. Any team using a different branch convention (`dev/`, `task/`, `issue/`, bare slugs) gets broken pipeline status, incorrect validation warnings, and wrong agent instructions on first use. The user wants `branchPrefix` in `ana.json` so the prefix is configured once and read everywhere.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `src/commands/init/anaJsonSchema.ts` (schema)
  - `src/commands/init/state.ts` (createAnaJson)
  - `src/utils/git-operations.ts` (readBranchPrefix helper)
  - `src/commands/work.ts` (~14 references)
  - `src/commands/artifact.ts` (~2 references)
  - `src/commands/pr.ts` (~2 references)
  - `src/commands/init/skills.ts` (1 reference)
  - `templates/.claude/agents/ana-build.md` (~9 references)
  - `templates/.claude/agents/ana-plan.md` (~2 references)
  - `templates/.claude/agents/ana-verify.md` (~2 references)
  - `tests/commands/work.test.ts` (~10 references + new fixtures)
  - `tests/commands/artifact.test.ts` (~20 references + new fixtures)
  - `tests/commands/pr.test.ts` (~6 references + new fixtures)
- **Blast radius:** Every pipeline command (`work status`, `artifact save`, `pr create`, `work complete`) and every agent definition. No engine/scan impact.
- **Estimated effort:** ~3 hours implementation + tests
- **Multi-phase:** yes

## Approach
Add `branchPrefix` to `ana.json` as a first-class config field, defaulting to `"feature/"`. A `readBranchPrefix()` helper provides the value with graceful fallback for existing installs. All hardcoded `feature/` references in source files migrate to read the helper. Template files use a `{branchPrefix}` placeholder with instructions for agents to read `ana.json`. Tests add non-`feature/` prefix fixtures to prove the migration end-to-end.

Phase 1 establishes the config field, schema, init writer, and reader helper. Phase 2 migrates all consumers and adds test coverage. Phase 1 is a no-op for existing behavior — it writes `"feature/"` as the default value and provides the reader. Phase 2 is where behavior changes.

## Acceptance Criteria
- AC1: Fresh `ana init` writes `branchPrefix: "feature/"` to `ana.json`
- AC2: Re-init on an existing project preserves a user-modified `branchPrefix` value
- AC3: `readBranchPrefix()` returns `"feature/"` when `branchPrefix` is absent from `ana.json` (backward compatibility)
- AC4: `ana work status` uses the configured prefix for branch detection and status messages
- AC5: `ana artifact save` uses the configured prefix for branch validation and error messages
- AC6: `ana pr create` uses the configured prefix for branch validation warnings
- AC7: `ana work complete` uses the configured prefix for merge verification and branch cleanup
- AC8: Agent template files reference `{branchPrefix}` placeholder and instruct agents to read from `ana.json`
- AC9: Tests pass with a non-`feature/` prefix (e.g., `dev/`) proving the migration works end-to-end
- AC10: The git-workflow skill Detected section uses the configured prefix instead of hardcoded `feature/`

## Edge Cases & Risks
- **Existing installs lack `branchPrefix`.** The reader must fallback gracefully, not crash. Every current Anatomia user hits this on upgrade.
- **Trailing slash consistency.** The stored value includes the trailing slash (`"feature/"` not `"feature"`). Consumption sites must not double-slash or strip it.
- **Empty string prefix.** A user could set `branchPrefix: ""` for bare slug branches. This should work — branch becomes just `{slug}` with no prefix. Verify this doesn't break branch detection logic.
- **Prefix containing special characters.** Git allows most characters in branch names. The prefix is used in `git branch -a --list` patterns — verify glob characters in prefixes don't cause false matches.
- **Template placeholder resolution.** Agent templates use `{branchPrefix}` as a documentation placeholder, not a runtime-substituted variable. Agents read `ana.json` directly. This must be clearly instructed in the template text.
- **In-flight work items.** A user who changes `branchPrefix` mid-pipeline has existing branches under the old prefix. `work status` won't find them. This is acceptable — document it as a known limitation, not something to engineer around.

## Rejected Approaches
- **Derive from `branchPatterns.primary` in scan.** The scan's `branchPatterns.primary` reflects historical naming, not pipeline intent. A project with mostly `fix/` branches historically doesn't necessarily want pipeline branches to be `fix/`. Default to `feature/` and let setup confirm — consistent with the `artifactBranch` pattern.
- **Runtime template substitution.** Injecting the actual prefix into template files at init time would mean re-init is required after changing the prefix. Agent templates reading `ana.json` at runtime is more resilient and consistent with how agents already read `artifactBranch`.
- **Hard fail on missing `branchPrefix`.** Unlike `artifactBranch` which `process.exit(1)`s when missing, `branchPrefix` must gracefully fallback. Every existing install lacks this field.

## Open Questions
- Should `check.ts` drift detection validate `branchPrefix` against the git-workflow skill Detected section, mirroring the existing `artifactBranch` validation? This is an AnaPlan design judgment call — it adds consistency but may be overkill for the initial implementation.

## Exploration Findings

### Patterns Discovered
- `readArtifactBranch()` at `git-operations.ts:26-49`: the exact structural pattern for `readBranchPrefix()`. Reads ana.json, validates field exists, returns string. The difference: `readBranchPrefix()` should fallback to `"feature/"` instead of `process.exit(1)`.
- `AnaJsonSchema` at `anaJsonSchema.ts:31-47`: uses per-field `.catch()` + `.default()` for fail-soft parsing. `branchPrefix` follows the same pattern.
- `createAnaJson` at `state.ts:375-396`: writes all config fields including `artifactBranch`. `branchPrefix` goes here alongside it.
- `getFeatureBranch()` at `work.ts:127-141`: the central branch-lookup function. Hardcodes `feature/${slug}` at lines 134-135. This is the linchpin — fix this and half the work.ts references cascade.

### Constraints Discovered
- [TYPE-VERIFIED] AnaJsonSchema uses `.strip()` (`anaJsonSchema.ts:47`) — unknown fields are stripped on re-init parse. `branchPrefix` MUST be added to the schema or it gets deleted on re-init.
- [OBSERVED] `createAnaJson` and `AnaJsonSchema` must stay in sync (`anaJsonSchema.ts:19-23`) — field in one but not the other is explicitly documented as a bug.
- [OBSERVED] Template agent files use `{slug}` as a documentation placeholder, not a runtime variable — agents read plan directories to get the slug. `{branchPrefix}` follows the same convention.
- [OBSERVED] `pr.ts:164` does `startsWith('feature/')` — this is a soft warning, not a gate. Migration changes the prefix string but keeps the warn-not-block behavior.

### Test Infrastructure
- `tests/commands/work.test.ts`: uses `createTestProject()` helper with `artifactBranch` option. The helper writes ana.json — adding `branchPrefix` option to this helper is the foundation for all test fixtures.
- `tests/commands/artifact.test.ts`: same `createTestProject()` pattern, 20 test cases with `currentBranch: 'feature/test-slug'`.
- `tests/commands/pr.test.ts`: same pattern, 6 test cases.

## For AnaPlan

### Structural Analog
`readArtifactBranch()` in `src/utils/git-operations.ts:26-49`. Same shape: read ana.json, extract a string config field, return it. The only difference is fallback behavior (graceful default vs process.exit).

### Relevant Code Paths
- `src/commands/init/anaJsonSchema.ts` — schema definition, the `.strip()` constraint
- `src/commands/init/state.ts:375-396` — `createAnaJson`, where the field gets written
- `src/utils/git-operations.ts:26-49` — `readArtifactBranch()`, the structural analog for the reader
- `src/commands/work.ts:127-141` — `getFeatureBranch()`, the central branch-lookup
- `src/commands/work.ts:500-545` — `getNextCommand()`, 8 hardcoded `feature/` in status messages
- `src/commands/work.ts:934-1074` — `work complete`, merge verification and branch cleanup
- `src/commands/pr.ts:164-166` — branch prefix validation warning
- `src/commands/artifact.ts:480-482` — feature branch error message
- `src/commands/init/skills.ts:355` — git-workflow Detected section generator

### Patterns to Follow
- `readArtifactBranch()` shape for the new reader, with fallback instead of exit
- `AnaJsonSchema` per-field `.catch()` pattern for the schema addition
- `createTestProject()` option-bag pattern for test fixture extension

### Known Gotchas
- `AnaJsonSchema.strip()` silently removes unrecognized fields on re-init. If `branchPrefix` is written by `createAnaJson` but not in the schema, re-init deletes it. Schema and writer must be updated together.
- `getFeatureBranch()` is called from 3 sites in `work.ts`. It currently constructs `feature/${slug}` internally. The migration needs to either: (a) pass the prefix as a parameter, or (b) have it read ana.json internally. Option (b) means it reads ana.json on every call — acceptable since these are CLI commands, not hot paths. Option (a) is cleaner but requires threading the prefix through callers.
- Template files are copied verbatim at init. Changing `feature/` to `{branchPrefix}` in templates means NEW installs get the placeholder. Existing installs keep the old templates. This is fine — re-init refreshes agent definitions.

### Things to Investigate
- Should `getFeatureBranch()` be renamed to `getWorkBranch()` or `getPrefixedBranch()` now that the prefix is configurable? The name `featureBranch` becomes misleading when the prefix is `dev/`.
- For the empty-string prefix case (`branchPrefix: ""`), verify that `git branch -a --list "*${slug}*"` still works correctly for branch detection without a prefix qualifier.

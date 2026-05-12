# Scope: Kind-aware branch prefixes

**Created by:** Ana
**Date:** 2026-05-12

## Intent

Branch prefixes are static — one string for all work items. But the system already knows the work type: Ana classifies every scope as `feature`, `fix`, `chore`, or `milestone` (after Scope 1 ships). Teams with git conventions like `fix/`, `feature/`, `chore/` can't express those conventions through Anatomia. The branch always gets whatever single prefix is configured, regardless of what the work actually is. This scope makes `branchPrefix` kind-aware: a map from kind to prefix, so `fix/auth-timeout` and `feature/add-export` happen automatically based on what Ana already knows.

## Complexity Assessment
- **Kind:** feature
- **Size:** medium — schema change with backward compatibility, 6 source files, ~8 test files, multiple edge cases
- **Files affected:**
  - `packages/cli/src/commands/init/anaJsonSchema.ts` (schema: string → string | record)
  - `packages/cli/src/utils/git-operations.ts` (`readBranchPrefix` signature + map resolution)
  - `packages/cli/src/commands/work.ts` (4 call sites: `startWork`, `getWorkStatus`, `completeWork`, `startBuildPhase` — each needs kind resolution strategy)
  - `packages/cli/src/commands/pr.ts` (1 call site — branch validation warning)
  - `packages/cli/src/commands/artifact.ts` (1 call site — error message guidance)
  - `packages/cli/src/utils/worktree.ts` (2 functions: `createWorktree`, `getWorktreeInfo` — receive resolved prefix, no change to signature, but callers change)
  - `packages/cli/src/commands/init/state.ts` (no code change, but `preserveUserState` behavior must be verified against new schema)
  - `packages/cli/tests/utils/git-operations.test.ts` (new map-form tests)
  - `packages/cli/tests/commands/work.test.ts` (new kind-aware tests)
  - `packages/cli/tests/commands/pr.test.ts` (map-form validation test)
  - `packages/cli/tests/commands/artifact.test.ts` (map-form error message test)
- **Blast radius:** Medium. The schema change affects every code path that reads `branchPrefix`. Six source files call `readBranchPrefix()`. The Zod schema change affects re-init preservation. Agent templates are unaffected (`{branchPrefix}` is a placeholder, not a config read). Website is unaffected (doesn't read ana.json).
- **Estimated effort:** ~2 hours
- **Multi-phase:** no

## Approach

Two changes working together:

**1. Config expansion.** Expand `branchPrefix` in ana.json from a string to a union of string or record. When the value is a string, behavior is identical to today. When the value is a record mapping kind names to prefixes, the system resolves the prefix at branch creation time. `readBranchPrefix()` gains an optional `kind` parameter — when kind is provided and the config is a map, it looks up the kind; otherwise it returns the string or the `feature` key as default.

**2. Store the branch name at creation time.** When `startBuildPhase()` creates a worktree, write the actual branch name to `.saves.json` alongside the existing `build_started_at` timestamp. Every downstream consumer (`getWorkBranch`, `work complete`, `getWorktreeInfo`, `printExistingWorktree`) reads the stored branch name first, falling back to config-based reconstruction only when the field is absent (older work items pre-dating this change).

This is the key architectural choice: **store truth once at creation, don't reconstruct from config at consumption.** Config can change between creation and consumption (user switches from string to map, or changes map values). A stored branch name is immune to config drift. The reconstruction fallback for older work items is the existing behavior — not a new fallback chain, just the code that already works today.

## Acceptance Criteria

- AC1: `branchPrefix: "feature/"` (string form) continues to work identically — all existing tests pass unchanged
- AC2: `branchPrefix: { "feature": "feature/", "fix": "fix/", "chore": "chore/", "milestone": "milestone/" }` (map form) is accepted by the Zod schema without error
- AC3: `readBranchPrefix(projectRoot)` with no kind argument returns `'feature/'` as default when config is a map (backward-compatible fallback)
- AC4: `readBranchPrefix(projectRoot, 'fix')` returns `'fix/'` when config is `{ "fix": "fix/", "feature": "feature/" }`
- AC5: `readBranchPrefix(projectRoot, 'fix')` returns `'feature/'` when config is `"feature/"` (string form ignores kind)
- AC6: `readBranchPrefix(projectRoot, 'unknown')` with a kind not in the map falls back to the `feature` key, then to `'feature/'`
- AC7: `readBranchPrefix(projectRoot, undefined)` with map config returns the `feature` key value as default
- AC8: A malformed map (e.g., `{ "fix": 42 }`) falls back to `'feature/'` via `.catch()`
- AC9: `startBuildPhase` reads the scope's kind via `extractScopeKind()` and passes it to `readBranchPrefix()` — a `Kind: fix` scope with map config creates a `fix/{slug}` branch
- AC10: `getWorkBranch` finds branches created with kind-aware prefixes — when config is a map, it searches for `{prefix}{slug}` using the scope's kind
- AC11: `work status` correctly displays branch info for work items created with kind-aware prefixes
- AC12: `work complete` correctly identifies and cleans up branches created with kind-aware prefixes
- AC13: Map-form `branchPrefix` survives `ana init` re-init (preserved through `AnaJsonSchema.safeParse()` + `preserveUserState`)
- AC14: `pr.ts` branch validation warning works with map-form prefix — correctly warns when current branch doesn't match the expected kind-based prefix
- AC15: `artifact.ts` error message guidance uses the correct kind-based prefix in `git checkout` hint
- AC16: Each map value is independently validated by `validateBranchName()` — an invalid value in one key doesn't corrupt the entire map
- AC17: Empty map `{}` falls back to `'feature/'`
- AC18: Map with only partial keys (e.g., `{ "fix": "bugfix/" }`) resolves missing keys to `'feature/'` default
- AC19: `startBuildPhase` writes `branch_name` to `.saves.json` alongside `build_started_at` when creating a worktree
- AC20: `getWorkBranch` reads `branch_name` from `.saves.json` when available, falls back to config-based reconstruction when absent
- AC21: `work complete` reads `branch_name` from `.saves.json` for branch cleanup — immune to config changes since branch creation
- AC22: In-flight work items created before this change (no `branch_name` in `.saves.json`) remain discoverable via existing config-based reconstruction
- AC23: No existing tests break. Test count increases.

## Edge Cases & Risks

### Critical: In-flight branch resolution

The most dangerous scenario: a user has `feature/add-auth` in progress (created when `branchPrefix` was `"feature/"`). They change their config to the map form: `{ "feature": "feat/", "fix": "fix/" }`. Now config-based reconstruction would look for `feat/add-auth` — can't find it.

**Mitigation:** Store the branch name in `.saves.json` at worktree creation time. `startBuildPhase()` already writes `build_started_at` to `.saves.json` at line 1977. Writing `branch_name: result.branch` alongside it is one additional line, same file, same write. Consumers read `.saves.json` first — if `branch_name` exists, use it directly; if not, fall back to config-based reconstruction (existing behavior for older work items).

This eliminates the in-flight problem entirely. The stored branch name is the truth — it doesn't care what the config says now, only what the config said when the branch was created. No heuristic matching, no fallback chains, no false positive risk.

### Critical: Re-init schema preservation

`preserveUserState()` at `state.ts:493` parses existing ana.json through `AnaJsonSchema.safeParse()`. The current schema defines `branchPrefix` as `z.string().optional().default('feature/').catch('feature/')`. If the user has a map-form `branchPrefix`, the string validator fails, `.catch()` fires, and the map silently resets to `'feature/'`.

**Mitigation:** The schema change must use `z.union()` — accepting both string and record forms. Both forms must have their own `.catch()` behavior. If the union itself fails, fall back to `'feature/'`. This is the same fail-soft pattern used by every other field in `anaJsonSchema.ts`.

**Dependency:** This is why `configurability-improvements` Phase 1 (passthrough) should ship first. With passthrough, even if the schema change hasn't landed, the map form would survive re-init as an unknown key. Without passthrough AND without the schema change, re-init destroys the map. With the schema change, re-init preserves it regardless of passthrough.

### Medium: scope.md reading for kind resolution

Only one call site needs to read the scope's kind to resolve the prefix: `startBuildPhase()`, where the branch is created. This is a single `extractScopeKind()` call at the moment of branch creation — acceptable cost, and scope.md is guaranteed to exist at this point (validated by `artifact save scope`).

All other call sites (`work status`, `work complete`, `pr`, `artifact`) read the stored branch name from `.saves.json` instead of resolving from config + kind. This eliminates the performance concern for `work status` iterating multiple slugs — `.saves.json` is already read for timestamp display, so the branch name comes free.

### Medium: `printExistingWorktree` display

At `work.ts:2004`, `printExistingWorktree` constructs `const branchName = \`${branchPrefix}${slug}\`` for display and commit counting. With map-form config, this would need the kind for reconstruction.

**Mitigation:** Two options, both foundational: (a) read from `.saves.json` (consistent with the approach), or (b) read from the worktree's git HEAD via `runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: wtPath })`. Option (b) is slightly more robust — it shows what the branch actually is, not what any file claims it is — and the worktree is guaranteed to exist at this call site. AnaPlan should choose, but both are correct.

### Low: Partial map keys

A user configures `{ "fix": "bugfix/" }` but doesn't include `feature`, `chore`, or `milestone`. When a feature-kind scope enters the build phase, `readBranchPrefix(root, 'feature')` finds no entry for `'feature'`.

**Mitigation:** Documented fallback chain in `readBranchPrefix()`: (1) look up the requested kind, (2) look up `'feature'` as default, (3) return `'feature/'` hardcoded. This means a partial map always has a sensible default.

### Low: Agent templates

Build, Plan, and Verify templates use `{branchPrefix}{slug}` as a placeholder. Agents read ana.json to resolve this. With map-form config, the agent would need to know the kind to resolve the placeholder. However, agents operate within a worktree where the branch already exists — they can read the branch name from git HEAD. The placeholder is documentation, not operational code.

**No code change needed** for templates — but the templates' behavior should be verified. If an agent literally does `readBranchPrefix()` + slug to construct a branch name, it would get the default fallback (the `feature` key or `'feature/'`), which might not match the actual branch. AnaPlan should investigate whether any agent template resolves this placeholder programmatically or whether it's purely instructional text.

### Low: `ana config set branchPrefix`

The `config set` command from configurability-improvements Phase 2 writes raw JSON values. `ana config set branchPrefix '{"feature":"feature/","fix":"fix/"}'` would write the map form. But `config set` currently treats the value as a string → `JSON.parse` → fallback. The map form would work via `JSON.parse` path. No special handling needed.

However, `ana config set branchPrefix "feature/"` after a map was configured would overwrite the map with a string — this is correct behavior (the user explicitly chose to simplify their config), but it's worth noting.

## Rejected Approaches

- **Fallback chain in `getWorkBranch` instead of storing the branch name.** Try kind-based prefix, then `feature` key, then heuristic slug matching. Rejected because: each fallback step is less reliable than the last, heuristic slug matching risks false positives (`other-project/add-auth` matching on slug alone), and the entire chain exists to compensate for not storing the truth at creation time. A three-step guess cascade is scaffolding, not foundation. Storing the branch name in `.saves.json` eliminates the problem that the chain was built to manage.
- **Making `readBranchPrefix()` always return a resolved string by requiring kind at every call site.** Would require all 6 callers to either know the kind or pass `undefined`. Rejected because: most callers don't need to resolve from config at all — they should read the stored branch name. Only `startBuildPhase` (branch creation) needs to resolve from config + kind. Making every caller resolve defeats the "store truth once" approach.
- **Reading the actual branch name from git in all cases (never reconstructing from config).** Would work for existing worktrees but not for `startBuildPhase` (creating a new branch) or `getWorkBranch` (finding a remote-only branch). Branch creation inherently requires knowing the desired name. Reconstruction from config is unavoidable for write operations. `.saves.json` bridges this gap — write operations resolve from config, read operations use the stored result.
- **Using `kind` in the slug itself (e.g., `fix-auth-timeout` auto-detects kind from the `fix-` prefix).** Fragile — `fix-header-layout` is a feature, not a fix. Slug naming is the developer's creative domain. Don't parse meaning from it.
- **Separate `branchPrefixes` field instead of overloading `branchPrefix`.** Would be cleaner (no union type) but creates two fields that mean the same thing. Which one wins? What happens when both are set? The union on a single field is simpler — one field, two shapes, clear priority.

## Open Questions

- **Should partial maps warn during `readBranchPrefix`?** If the map has `fix` and `chore` but not `feature`, that's probably a mistake. Should `readBranchPrefix` log a warning? Or is silent fallback sufficient?
- **Should `.saves.json` `branch_name` be written by `writeTimestamp` or as a separate write?** It's not a timestamp, so using `writeTimestamp` would be semantically wrong. But it's one field in the same file, at the same moment. AnaPlan should decide: extend `writeTimestamp` to accept arbitrary key-value pairs, or write `branch_name` directly alongside the `writeTimestamp` call in `startBuildPhase`.

## Exploration Findings

### Patterns Discovered
- `git-operations.ts:107-134`: `readBranchPrefix()` reads raw JSON, checks `typeof prefix`, validates with `validateBranchName()`, returns string or fallback. The function is self-contained — no dependency on Zod schema, no import of AnaJsonSchema. This is important: the schema change and the reader change are independent. The schema governs re-init preservation; the reader governs runtime behavior.
- `work.ts:135-145`: `getWorkBranch()` does `git branch -a --list *{slug}*` then exact-matches against `${branchPrefix}${slug}`. The glob search already finds branches regardless of prefix — the exact match is what filters. The fallback chain would operate between the glob and the filter.
- `work.ts:1963`: `createWorktree()` is the ONLY place a branch is created. It's called from `startBuildPhase()`. At this point, scope.md exists (validated by `artifact save scope` earlier in the pipeline). `extractScopeKind()` is available and reliable here.
- `work.ts:2004`: `printExistingWorktree()` constructs the branch name for display + commit counting. It's called from 3 resume paths (Build, Verify, Fix). All have the worktree path available — reading actual HEAD is possible.
- `worktree.ts:185,301`: Both `createWorktree()` and `getWorktreeInfo()` receive `branchPrefix` as a parameter (already resolved). They construct `${branchPrefix}${slug}` from the resolved value. These functions don't need to change — their callers do.

### Constraints Discovered
- [TYPE-VERIFIED] `readBranchPrefix()` is called in 4 files: `work.ts` (3 call sites), `pr.ts` (1), `artifact.ts` (1), `git-operations.ts` (definition). Every call site has access to `projectRoot`.
- [TYPE-VERIFIED] `getWorkBranch()` searches git branches with a glob pattern — it ALREADY finds branches regardless of prefix. The exact-match filter is the only thing that breaks.
- [TYPE-VERIFIED] `getNextAction()` at `work.ts:502` takes `_branchPrefix` but doesn't use it (parameter is unused, kept for API compat). No change needed.
- [OBSERVED] `work complete` removes the worktree (line 1522) BEFORE branch cleanup (line 1386). This means the worktree's HEAD is unavailable during branch cleanup. The branch name must be resolved from config or stored elsewhere.
- [OBSERVED] `preserveUserState()` uses `AnaJsonSchema.safeParse()` — the schema MUST accept map-form before anyone writes map-form config. Otherwise re-init destroys it.
- [OBSERVED] Agent templates use `{branchPrefix}` as literal placeholder text — agents read ana.json themselves at runtime. The templates don't need updating, but agent behavior with map-form config should be verified.
- [INFERRED] The `ana config set` command (configurability-improvements Phase 2) would allow `JSON.parse` to write map-form values. No special handling needed, but the display for `ana config` (show all) should render maps readably, not as `[object Object]`.

### Test Infrastructure
- `tests/commands/work.test.ts:425-580`: Comprehensive branchPrefix tests — custom prefix, empty prefix, branch discovery, complete cleanup, template placeholders. Pattern: `createWorkTestProject()` with `branchPrefix` option → `getWorkStatus()` → assert output. New tests follow this pattern with map-form config.
- `tests/utils/git-operations.test.ts:39-100,258-299`: `readBranchPrefix` tests cover: configured value, absent field, empty string, invalid types (number, null), injection payloads. Schema round-trip tests for string form. New tests add: map-form value, map with missing keys, malformed map, map round-trip through schema.
- `tests/commands/pr.test.ts:140-170`: branchPrefix tests for PR warning behavior with custom prefix. New test: map-form prefix with kind-based warning.
- `tests/commands/artifact.test.ts:396+`: branchPrefix tests for artifact validation guidance messages. New test: map-form prefix in error messages.

## For AnaPlan

### Structural Analog
`packages/cli/src/utils/git-operations.ts:107-134` (`readBranchPrefix`) — the function being extended. Its existing pattern (read JSON, type-check, validate, fallback) defines the approach for the map form. The `readArtifactBranch` function at line 59 is structurally identical — same file, same pattern, same fallback strategy. Use both as templates.

### Relevant Code Paths
- `packages/cli/src/commands/init/anaJsonSchema.ts:41` — schema definition, the `.string()` that becomes a union
- `packages/cli/src/utils/git-operations.ts:107-134` — `readBranchPrefix()`, the core change
- `packages/cli/src/commands/work.ts:671,1044,1656` — three `readBranchPrefix()` call sites in work.ts
- `packages/cli/src/commands/work.ts:135-145` — `getWorkBranch()`, needs fallback chain
- `packages/cli/src/commands/work.ts:1386` — `work complete` branch cleanup, needs reliable branch resolution
- `packages/cli/src/commands/work.ts:1890-1963` — `startBuildPhase()`, the branch creation path where kind is available
- `packages/cli/src/commands/work.ts:1996-2025` — `printExistingWorktree()`, display-only branch name construction
- `packages/cli/src/commands/pr.ts:164,174` — branch validation warning
- `packages/cli/src/commands/artifact.ts:946,981` — error message guidance
- `packages/cli/src/utils/worktree.ts:177-185,293-301` — `createWorktree` and `getWorktreeInfo` (receive resolved prefix)
- `packages/cli/src/utils/proofSummary.ts:432` — `extractScopeKind()`, the kind reader
- `packages/cli/src/commands/init/state.ts:493` — `preserveUserState()`, the re-init merge path

### Patterns to Follow
- `git-operations.ts` fallback chain: check → validate → return, with `'feature/'` as ultimate fallback
- `anaJsonSchema.ts` per-field `.catch()` for fail-soft validation
- `work.test.ts:425+` test structure for branchPrefix behavior

### Known Gotchas
- **Worktree removal ordering in `work complete`.** `work complete` removes the worktree (line 1522) before branch cleanup (line 1386). With `.saves.json` storage, this is no longer a problem — `.saves.json` lives in `.ana/plans/active/{slug}/` on the artifact branch, not in the worktree. After PR merge, the `branch_name` field is available on the artifact branch regardless of worktree state. But AnaPlan should verify that `work complete` reads `.saves.json` before moving the plan directory to `completed/` (line 1529).
- **`readBranchPrefix` is not schema-aware.** It reads raw JSON with `JSON.parse()` and checks `typeof prefix`. It does NOT import or use `AnaJsonSchema`. The map-form handling must be added to the raw-JSON reader, not to the Zod schema. The schema governs re-init; the reader governs runtime. They must both handle the map form, but they're independent code paths.
- **`.saves.json` merge conflicts.** `.saves.json` is modified in both the worktree (build/verify timestamps) and the artifact branch (work/plan timestamps). After PR merge, git must resolve both versions. This is an existing concern — adding `branch_name` doesn't make it worse, but the field must be written to the worktree copy (where `build_started_at` is also written) to travel with the merge.
- **The `_branchPrefix` parameter in `getNextAction`.** This unused parameter exists for API compatibility. Don't remove it — it would break the call signature at line 745. Leave it unused.
- **`ana config` display.** When configurability-improvements Phase 2 ships, `ana config` shows all fields. A map-form `branchPrefix` would need readable display — not `[object Object]`. This isn't this scope's problem, but AnaPlan should note that `config.ts` (Phase 2) should handle object values in its display logic. If Phase 2 ships before this scope, the display code already exists and may need updating.

### Things to Investigate
- Whether any agent template (Build, Plan, Verify) programmatically calls `readBranchPrefix()` or equivalent at runtime, vs. treating `{branchPrefix}` as instructional text. If agents resolve this placeholder themselves, they need kind awareness.
- Whether `getWorkBranch` should change its signature to accept an optional `knownBranchName` parameter (from `.saves.json`) and skip the git lookup entirely when provided, or whether it should internally read `.saves.json` given a slug path. The caller-provides pattern is more explicit; the internal-read pattern is more encapsulated.
- Whether `work complete`'s `--merge` path (line 1072: `const workBranchName = \`${branchPrefix}${slug}\``) should also read from `.saves.json`. This path runs from the artifact branch before the PR is merged, so `.saves.json` may only have the artifact-branch version (which has `work_started_at` and `plan_started_at` but not `branch_name`, since that was written to the worktree copy). AnaPlan must verify when the worktree's `.saves.json` content becomes available on the artifact branch.

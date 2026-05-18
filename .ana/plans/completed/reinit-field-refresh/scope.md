# Scope: Re-init mechanical field refresh

**Created by:** Ana
**Date:** 2026-05-18

## Intent

Re-init runs a fresh scan but then discards the scan's metadata fields (`name`, `language`, `framework`, `packageManager`) in favor of potentially stale values from the old config. A project that changed its primary language, switched package managers, or renamed itself gets stale ana.json fields even after re-init. The user wants these four fields to refresh automatically, the same way `anaVersion` and `lastScanAt` already do.

## Complexity Assessment
- **Kind:** fix
- **Size:** small — 4 lines in the merge block, doc comment update, new test cases
- **Files affected:** `packages/cli/src/commands/init/state.ts`, `packages/cli/tests/commands/init.test.ts`
- **Blast radius:** Behavioral change for every re-init across all customers. The merge block in `preserveUserState` is the single control point for what survives vs. refreshes. No downstream consumers are harmed — `setup check` cross-references `anaJson.language` against skills and benefits from fresher values. No other code reads these four fields in a way that breaks on refresh.
- **Estimated effort:** Under 30 minutes including tests
- **Multi-phase:** no

## Approach

Extend the existing refresh pattern in `preserveUserState`'s merge block. The merge already refreshes `anaVersion` and `lastScanAt` by overriding the spread of old values. Add four more fields to the same override: `name`, `language`, `framework`, `packageManager`. Update the doc comment that serves as the preservation contract. Add tests that verify the new refresh behavior and confirm PRESERVE fields are unaffected.

Commands stay PRESERVE. Three shipped safeguards handle the degenerate cases: blank sanitization (empty strings fall through to fresh values), new key propagation (new command keys like `buildPackage` auto-appear), and `ana config set` (users can manually fix stale commands). Full command refresh risks destroying user tuning with no recovery path other than re-editing.

## Acceptance Criteria
- AC1: After re-init, `name` in ana.json matches the value from the fresh scan, not the old config
- AC2: After re-init, `language` in ana.json matches the value from the fresh scan
- AC3: After re-init, `framework` in ana.json matches the value from the fresh scan
- AC4: After re-init, `packageManager` in ana.json matches the value from the fresh scan
- AC5: After re-init, PRESERVE fields (`coAuthor`, `artifactBranch`, `branchPrefix`, `setupPhase`, `custom`, `commands`) retain their old values
- AC6: After re-init, a user-tuned command (e.g., custom `test` command) survives unchanged
- AC7: The `preserveUserState` doc comment lists all six refresh fields: `anaVersion`, `lastScanAt`, `name`, `language`, `framework`, `packageManager`
- AC8: All existing tests pass. Test count does not decrease.

## Edge Cases & Risks
- **Null refresh:** Old config has `language: "TypeScript"`, new scan detects `null`. The refresh sets it to `null`. This is correct — the scan is the source of truth. No downstream consumer crashes on null (check.ts guards with `?? undefined`).
- **`name` from monorepo root:** `name` comes from `result.overview.project` which reads the root package.json name. In a monorepo, this is the root package name, not the primary package. If a user wanted a different display name, refreshing overwrites it. LOW RISK — nobody customizes `name` in practice, and `config set` recovers it.
- **`createEmptyEngineResult` fallback:** If `engineResult` is `null`, `createAnaJson` falls back to empty result (`language: null`, `project: 'unknown'`). Refreshing from these empty values would overwrite real data. NOT A REAL RISK — the null path doesn't execute in practice; `init/index.ts` always passes the real engine result.
- **Mid-migration `packageManager`:** If a user is switching from npm to pnpm and both lockfiles exist, the scan picks one. Re-init refreshes to the scan's choice. The user may not have finished migrating. LOW RISK — scan is usually right, `config set` overrides.

## Rejected Approaches
- **Conditional refresh (refresh only if old value matches what old scan would have produced):** Would correctly distinguish tuned from untuned values, but requires the old scan result (unavailable) and adds complexity for four fields that are almost never user-tuned. Over-engineered for the problem.
- **Refresh with warning:** Always refresh but warn if the old value differs. Still loses user tuning — user must act to restore. Adds console noise for a rare edge case.
- **Refresh commands too:** Risk of destroying user tuning outweighs the benefit. The blank sanitization, new key propagation, and `config set` already cover the command edge cases.

## Open Questions

None. All items from the requirements file's "What to Re-research" section were resolved during investigation.

## Exploration Findings

### Patterns Discovered
- The merge block at state.ts:561-565 is the single control point for refresh vs. preserve. The pattern is `...parsed.data` (old values) then explicit overrides (new values). Adding fields to the override list is the established pattern.
- Post-merge command sanitization (lines 567-586) runs after the merge and only touches `commands`. The four new fields don't interact with it.

### Constraints Discovered
- [TYPE-VERIFIED] AnaJsonSchema types (anaJsonSchema.ts:40-43) — `name: string`, `language: string | null`, `framework: string | null`, `packageManager: string | null`. The `newAnaConfig` values from `createAnaJson` are the same types.
- [TYPE-VERIFIED] `.passthrough()` (anaJsonSchema.ts:62) — unknown top-level keys survive the parse. The spread `...parsed.data` includes them. Explicit overrides only replace named fields.
- [OBSERVED] No existing test covers metadata field preservation — init.test.ts tests learn state, context copy, agent dedup, hook dedup, but nothing about name/language/framework/packageManager.
- [OBSERVED] `setup check` cross-references `anaJson.language` against coding-standards Detected (check.ts:962-971). Fresher language values improve this check.

### Test Infrastructure
- `packages/cli/tests/commands/init.test.ts` — has `preserveUserState` tests starting at line 731. Uses tmpDir setup, creates minimal ana.json, calls `preserveUserState` directly. The learn state test (line 732) is the structural analog for new tests.

## For AnaPlan

### Structural Analog
The learn state preservation test at `packages/cli/tests/commands/init.test.ts:731-767`. Same function under test, same tmpDir setup, same pattern of creating an existing ana.json with known values, calling `preserveUserState`, and asserting what survived vs. changed.

### Relevant Code Paths
- `packages/cli/src/commands/init/state.ts:530-592` — `preserveUserState` function, merge block at 561-565, command sanitization at 567-586
- `packages/cli/src/commands/init/state.ts:507-523` — doc comment with preservation contract
- `packages/cli/src/commands/init/state.ts:363-489` — `createAnaJson` showing what fresh values look like
- `packages/cli/src/commands/init/anaJsonSchema.ts:37-62` — schema with types and `.passthrough()`
- `packages/cli/tests/commands/init.test.ts:731-767` — existing `preserveUserState` test (structural analog)

### Patterns to Follow
- The existing `anaVersion`/`lastScanAt` override pattern in the merge block (state.ts:563-564)
- The learn state test pattern in init.test.ts:731-767 (setup existing state, call function, assert results)

### Known Gotchas
- The doc comment at state.ts:520-523 IS the preservation contract. It must be updated. A future developer reading "only anaVersion and lastScanAt refresh" will be misled if the comment isn't updated with the change.
- The post-merge command logic (lines 567-586) must not be disturbed. The four new fields go in the merge object literal (lines 561-565), before the command sanitization block.

### Things to Investigate
- Whether the test should also verify that unknown top-level keys (from `.passthrough()`) survive the merge with the four new overrides. A one-line assertion would close this — add a custom key to the old config and verify it survives.

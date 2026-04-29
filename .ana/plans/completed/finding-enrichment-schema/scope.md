# Scope: Finding Enrichment Schema

**Created by:** Ana
**Date:** 2026-04-29

## Intent

The intelligence layer (health, Learn, promote) operates on findings. The quality of every downstream feature is bounded by the quality of what enters the pipe. Right now:

- 75% of active findings have no severity. Health can't weight or prioritize.
- No finding says what to do with it. Is it a rule candidate? Does it need code work? Can it be closed? Health and Learn have to guess.
- `result`, `assertion.status`, and `category` are open `string` types when only 3–4 values exist. AI consumers can't trust the shape.
- The proof chain has no schema version. When the schema changes (and it's about to), there's no migration detection.
- `computeChainHealth` returns flat status counts — no severity or action breakdowns. Even after enrichment, every `--json` meta block would be blind to signal quality.

Foundation 3.5 fixes the data quality so Foundation 4 can build intelligence on top of classified, typed, versioned data.

## Complexity Assessment

- **Size:** large
- **Files affected:**
  - `packages/cli/src/types/proof.ts` — severity union change, add `suggested_action`, union types on `result`/`status`/`category`, `schema` on `ProofChain`
  - `packages/cli/src/utils/proofSummary.ts` — severity type in `ProofSummary` + 3 other interfaces, YAML reader `suggested_action` mapping, severity cast update, `getProofContext` field mapping, `computeChainHealth` expansion with `by_severity`/`by_action`, `ChainHealth` interface expansion
  - `packages/cli/src/commands/artifact.ts` — `VALID_FINDING_SEVERITIES` value change, add `VALID_FINDING_ACTIONS`, `validateVerifyDataFormat` severity required + suggested_action validation, `validateBuildDataFormat` severity + suggested_action on concerns
  - `packages/cli/src/commands/work.ts` — severity migration in backfill loop (`blocker→risk`, `note→observation`), `schema` field on chain write
  - `packages/cli/src/commands/proof.ts` — audit display `[severity · action]` badges, audit `--json` `suggested_action` field
  - `templates/.claude/agents/ana-verify.md` — classification brief, updated YAML example (risk/debt/observation), severity + suggested_action required
  - `templates/.claude/agents/ana-build.md` — classification brief for build_data.yaml concerns
  - `.claude/agents/ana-verify.md` — dogfood sync
  - `.claude/agents/ana-build.md` — dogfood sync
  - ~12 test files — old severity value updates, new validation tests, new field tests, health expansion tests
- **Blast radius:** The type changes in `proof.ts` propagate to every consumer — TypeScript compiler flags each one. The save validation changes affect every future `ana artifact save verify-report` and `ana artifact save build-report`. The template changes affect every future Verify and Build agent session. The severity migration in `writeProofChain` runs on every `work complete`, touching all findings until old values are gone (then becomes a no-op scan). The `computeChainHealth` expansion changes the `meta` block on every `--json` response — existing consumers handle new fields gracefully (additive-only JSON contract).
- **Estimated effort:** 2-3 hours pipeline time across 2 specs
- **Multi-phase:** yes — recommend 2 specs: (1) types + validation + reader + migration + schema version + templates, (2) health expansion + audit display

## Approach

Enrich every finding and build concern with two new classification dimensions: severity (`risk | debt | observation`) and suggested_action (`promote | scope | monitor | accept`). Simultaneously tighten every open `string` type to a union, add a schema version to the proof chain, expand health computation with severity and action breakdowns, and update the audit display to surface the new classification.

Severity uses impact-based classification: risk could hurt you (correctness, security, reliability), debt is making the codebase worse over time (duplication, missing abstractions), observation is information (edge cases, style, tradeoffs). These are mutually exclusive by impact — if duplication could cause a production incident, it's a risk, not debt.

Suggested action tells you what to DO: promote (encode a skill rule), scope (needs engineering work), monitor (watch, no action now), accept (acknowledged, can be closed). Ordered from most action to least. The names are instructions to Verify — knowing `promote` exists makes Verify think "is this a pattern agents should learn?"

Both fields are optional on TypeScript types (backward compatible with 117 existing findings) but required at save validation for new data. The save-block-and-retry pattern handles first-run calibration — if Verify omits a field, save rejects, Verify adds it, save succeeds.

The union type tightening (`result`, `assertion.status`, `category`) makes the contract self-documenting and lets TypeScript catch every consumer gap at compile time. The schema version enables future migration detection. The health expansion puts severity and action breakdowns into every `--json` meta block so downstream consumers (Learn, CI gates, hooks) get the full picture without separate queries.

The severity migration (`blocker→risk`, `note→observation`, `observation` stays) is conservative — automated mapping for known values, no judgment calls. Manual backfill (Phase E) handles per-finding reclassification.

## Acceptance Criteria

- AC1: `ProofChainEntry` finding type has `severity?: 'risk' | 'debt' | 'observation'` and `suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept'`. Both optional for backward compatibility.
- AC2: `ProofSummary` finding type has the same two optional fields as AC1.
- AC3: `ProofChainEntry.result` typed as `'PASS' | 'FAIL' | 'UNKNOWN'` (not `string`).
- AC4: `ProofChainEntry.assertions[].status` typed as `'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED'` (not `string`).
- AC5: `ProofChainEntry.findings[].category` typed as `'code' | 'test' | 'upstream'` (not `string`).
- AC6: `ProofChain` interface has `schema: number`. `writeProofChain` sets `chain.schema = 1` before writing. On read, if absent, backfill to `1`.
- AC7: `VALID_FINDING_SEVERITIES` is `['risk', 'debt', 'observation']`. Old values (`blocker`, `note`) are rejected by save validation.
- AC8: `VALID_FINDING_ACTIONS` is `['promote', 'scope', 'monitor', 'accept']`.
- AC9: `validateVerifyDataFormat` requires `severity` on every finding (not optional). Missing severity produces error: `Finding N: missing "severity" field`. Invalid value produces: `Finding N: invalid severity "xyz"`.
- AC10: `validateVerifyDataFormat` requires `suggested_action` on every finding. Same error pattern as AC9.
- AC11: `validateBuildDataFormat` requires `severity` and `suggested_action` on every concern. Same error pattern.
- AC12: YAML reader in `proofSummary.ts` casts severity as `'risk' | 'debt' | 'observation'` (not old values). Reads `suggested_action` with cast to `'promote' | 'scope' | 'monitor' | 'accept'`.
- AC13: `getProofContext` maps `suggested_action` alongside existing `severity` mapping.
- AC14: `writeProofChain` backfill loop migrates severity: `blocker→risk`, `note→observation`, `observation` stays. Migration is idempotent.
- AC15: `computeChainHealth` returns `by_severity: { risk, debt, observation, unclassified }` and `by_action: { promote, scope, monitor, accept, unclassified }` in the `findings` object. `unclassified` counts findings without the respective field.
- AC16: `ChainHealth` interface updated to include `by_severity` and `by_action` types.
- AC17: Every `--json` meta block includes severity and action breakdowns (via `computeChainHealth`).
- AC18: Verify template (`ana-verify.md`): YAML example uses `risk`/`debt`/`observation` instead of `blocker`/`observation`/`note`. `severity` and `suggested_action` listed as required fields.
- AC19: Verify template includes a classification brief (~6 lines) explaining the three severity values and four action values, placed at the verify_data.yaml instructions (step 6b).
- AC20: Build template (`ana-build.md`): classification brief added for build_data.yaml concerns. Concerns gain `severity` and `suggested_action` fields.
- AC21: Dogfood copies (`.claude/agents/ana-verify.md` and `.claude/agents/ana-build.md`) contain the same classification brief, YAML example, and required fields as the templates. The changed sections match exactly.
- AC22: Audit display (`ana proof audit`) shows `[severity · action]` badges inline on each finding. Sorted by severity (risk → debt → observation).
- AC23: Audit `--json` output includes `suggested_action` on each finding object.
- AC24: All consumers of `result` (work.ts PASS check, proof.ts result color, proofSummary.ts UNKNOWN warning) compile cleanly with the union type.
- AC25: All consumers of `assertion.status` (proof.ts `getStatusIcon` switch) compile cleanly with the union type.
- AC26: All consumers of `category` (proofSummary.ts upstream classification, artifact.ts VALID_FINDING_CATEGORIES) compile cleanly with the union type.
- AC27: Build concerns in `ProofChainEntry` type gain `severity` and `suggested_action` optional fields matching finding types.
- AC28: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC29: Lint passes: `pnpm lint`

## Edge Cases & Risks

- **First Verify run with new required fields.** Verify will encounter the new template requiring severity and suggested_action. The save-block-and-retry pattern handles this — Verify fixes and retries. Expect one retry on the first pipeline run after this ships. That's calibration, not a bug.
- **Severity migration on undefined values.** The migration only maps known old values (`blocker`, `note`, `observation`). The 46 findings with `severity: undefined` are untouched — they remain undefined until the Phase E manual backfill. `computeChainHealth` counts them as `unclassified`.
- **Union type propagation.** Tightening `result: string` to `result: 'PASS' | 'FAIL' | 'UNKNOWN'` may surface compiler errors in consumers that do string comparison. Every consumer that references `result`, `assertion.status`, or `category` must be checked. The compiler does this work — but the planner must account for each consumer location.
- **Build concerns schema change.** Build currently writes concerns with just `summary` and `file`. After this scope, Build must also provide `severity` and `suggested_action` on each concern. The build template update teaches this. Save validation enforces it.
- **Additive JSON contract.** New fields in `computeChainHealth` output (`by_severity`, `by_action`) are additive. Existing scripts parsing the `meta` block handle new fields gracefully per the additive-only JSON contract established in F3. No breaking change.
- **Test file mechanical updates.** ~12 test files reference old severity values or assert on old validation behavior. These are mechanical updates (find-and-replace `blocker` → `risk`, `note` → `observation` in test fixtures) but touch many files.

## Rejected Approaches

- **Make `suggested_action` optional for V1.** This would reduce first-run friction but create a class of findings that need backfill later. We're already shipping backfill for existing findings (Phase E). Adding more partial data defeats the purpose. The taxonomy is clear enough for Verify to classify — the stress test against 61 real findings confirmed zero ambiguity on action assignment.
- **Split into 3 scopes (types, enrichment, health).** A half-done schema change is scaffolding, not foundation. Shipping severity without suggested_action, or enrichment without health expansion, means a second pass through the same functions. One scope, two specs.
- **Degree-based severity (critical/warning/info).** Generic severity labels don't teach Verify what to look for. Impact-based labels (risk/debt/observation) shape the observation — Verify thinks differently about "could this hurt you?" vs "is this making things worse?" vs "worth knowing."
- **Category-to-skill default mapping for suggested_action.** A code finding about database pooling belongs in data-access, not coding-standards. The mapping is too coarse. `suggested_action: promote` flags candidates; the developer (or Learn) specifies the target skill later.

## Open Questions

- The planner should identify all ~12 test files referencing old severity values (`blocker`, `note`) and plan the mechanical updates. The scope doesn't enumerate them — that's investigation work for spec creation.
- Audit display (AC22-AC23) is included in this scope. If the planner finds the scope overweight during spec decomposition, audit display is the designated pressure valve — it can move to Phase D without breaking any schema or type contract.

## Exploration Findings

### Patterns Discovered

- `structured-findings-companion` (entry #22) established the companion YAML convention. This scope extends it with new required fields on the same data structures.
- `findings-lifecycle-foundation` (entry #19) established the status field and mechanical maintenance. This scope adds classification dimensions alongside status.
- `computeChainHealth` at proofSummary.ts:682 already iterates every finding — adding severity/action counts is ~10 lines inside the existing loop.
- `getProofContext` at proofSummary.ts:1316 uses explicit field mapping (not spread) — unmapped fields are silently dropped. `suggested_action` must be explicitly added.
- Save validation in `validateVerifyDataFormat` (artifact.ts:537) follows error-accumulation pattern — new field checks slot into the existing per-finding loop.

### Constraints Discovered

- [TYPE-VERIFIED] `severity` type on `ProofChainEntry` (proof.ts:73) — currently `'blocker' | 'observation' | 'note'`, must change to `'risk' | 'debt' | 'observation'`
- [TYPE-VERIFIED] `severity` type on `ProofSummary` (proofSummary.ts:77) — same current values, same change
- [TYPE-VERIFIED] `VALID_FINDING_SEVERITIES` (artifact.ts:523) — currently `['blocker', 'observation', 'note']`, source of truth for save validation
- [TYPE-VERIFIED] YAML reader severity cast (proofSummary.ts:1086) — currently `as 'blocker' | 'observation' | 'note'`
- [TYPE-VERIFIED] `result` on `ProofChainEntry` (proof.ts:50) — currently `string`
- [TYPE-VERIFIED] `status` on assertions (proof.ts:55) — currently `string`
- [TYPE-VERIFIED] `category` on findings (proof.ts:68) — currently `string`
- [TYPE-VERIFIED] `ProofChain` interface (proof.ts:26-28) — no `schema` field, just `entries`
- [TYPE-VERIFIED] `computeChainHealth` parameter type (proofSummary.ts:682) — typed as `{ findings?: Array<{ status?: string }> }`, will need `severity?` and `suggested_action?`
- [OBSERVED] Verify template YAML example (ana-verify.md:107-123) — shows `severity: blocker`/`observation`/`note`, must update to new values and add `suggested_action`
- [OBSERVED] Verify template required/optional fields line (ana-verify.md:125-126) — severity listed as optional, must become required alongside new `suggested_action`
- [OBSERVED] Build concern type on `ProofChainEntry` (proof.ts:83) — currently `{ summary: string; file: string | null }`, no severity or suggested_action
- [OBSERVED] 46 active findings have `severity: undefined`, 14 have `observation`, 1 has `note`, 0 have `blocker`
- [OBSERVED] `result` consumers: work.ts (PASS check for output icon), proof.ts (result color), proofSummary.ts (UNKNOWN warning) — all handle exact values already, just need type narrowing
- [OBSERVED] `assertion.status` consumer: proof.ts `getStatusIcon` switch — handles exactly SATISFIED/UNSATISFIED/DEVIATED/UNCOVERED, needs type narrowing only
- [OBSERVED] `category` consumers: proofSummary.ts upstream classification check, artifact.ts `VALID_FINDING_CATEGORIES` — the constant array already has the three values

### Test Infrastructure

- `artifact.test.ts` — save validation tests use `writeFileSync` to create YAML files, call `validateVerifyDataFormat`/`validateBuildDataFormat`, assert on error arrays. New field validation tests follow this exact pattern.
- `proofSummary.test.ts` — YAML reader tests create companion files in temp directories, call `generateProofSummary`, assert on returned finding fields. New field reader tests follow this pattern.
- `work.test.ts` — backfill/migration tests construct proof chain JSON with old values, run `writeProofChain` (or equivalent), assert transformed values. Severity migration tests follow this pattern.

## For AnaPlan

### Structural Analog

`structured-findings-companion` (`.ana/plans/completed/structured-findings-companion/scope.md`). Same shape: extends companion YAML schema with new fields, updates save validation, updates YAML reader, updates templates + dogfood sync. That scope added `line`, `severity`, `related_assertions`. This scope changes severity values, adds `suggested_action`, and tightens types. The validation pattern, reader pattern, template sync pattern, and test patterns are identical.

### Relevant Code Paths

- `packages/cli/src/types/proof.ts` — all type definitions that change (ProofChain, ProofChainEntry, findings, assertions, build_concerns)
- `packages/cli/src/commands/artifact.ts:520-670` — save validation functions, VALID_FINDING_SEVERITIES, per-finding validation loop
- `packages/cli/src/utils/proofSummary.ts:39-82` — ProofSummary type with severity field
- `packages/cli/src/utils/proofSummary.ts:638-707` — ChainHealth interface and computeChainHealth function
- `packages/cli/src/utils/proofSummary.ts:1070-1098` — YAML reader with severity cast and field mapping
- `packages/cli/src/utils/proofSummary.ts:1310-1320` — getProofContext explicit field mapping
- `packages/cli/src/commands/work.ts` — writeProofChain backfill loop (severity migration), chain write (schema field)
- `packages/cli/src/commands/proof.ts` — audit display formatting, audit JSON output
- `packages/cli/templates/.claude/agents/ana-verify.md:100-129` — verify_data.yaml instructions, YAML example, required fields
- `packages/cli/templates/.claude/agents/ana-build.md` — build_data.yaml instructions

### Patterns to Follow

- Save validation error pattern in `artifact.ts:566-594` — `${prefix}: missing "X" field` / `${prefix}: invalid X "value"` with accumulation into errors array
- YAML reader field mapping in `proofSummary.ts:1084-1087` — type guard + cast pattern: `if (typeof f['field'] === 'string') finding.field = f['field'] as UnionType;`
- getProofContext explicit mapping in `proofSummary.ts:1315-1317` — conditional property assignment: `if (finding.field !== undefined) matched.field = finding.field;`
- Template dogfood sync — `diff` between template and `.claude/agents/` copy must produce empty output (AC21 in structured-findings-companion)

### Known Gotchas

- `computeChainHealth` parameter type is narrow: `{ entries: Array<{ findings?: Array<{ status?: string }> }> }`. Adding severity/action counting requires widening to include `severity?: string` and `suggested_action?: string` in the findings type parameter.
- `getProofContext` does NOT spread — it maps fields explicitly. If `suggested_action` isn't added to the mapping block at line 1316, it will be silently dropped from proof context results. This was a real bug class in structured-findings-companion.
- The `category` field appears in two roles: as a field on findings (string → union type) AND as the `VALID_FINDING_CATEGORIES` constant in artifact.ts. The constant array should become the source of truth for the union type, or at minimum the values must stay synchronized.
- Build concerns currently have a minimal type (`{ summary: string; file: string | null }`). Adding `severity` and `suggested_action` means the `validateBuildDataFormat` loop needs the same per-item validation that verify findings have. The current loop only checks `summary`.

### Things to Investigate

- Which test files reference old severity values (`blocker`, `note`) and need mechanical updates? The scope estimates ~12 but the planner should enumerate them for the spec.
- Does the `computeChainHealth` parameter type need to be a generic or can it use the concrete `ProofChainEntry` type? Current design uses a narrow structural type — widening it to include new fields is the path of least resistance, but importing `ProofChainEntry` would be more type-safe.

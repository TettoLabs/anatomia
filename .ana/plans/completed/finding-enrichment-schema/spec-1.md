# Spec: Finding Enrichment Schema — Phase 1 (Types, Validation, Reader, Migration, Templates)

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/finding-enrichment-schema/scope.md

## Approach

Enrich proof chain findings and build concerns with two new classification dimensions and tighten every open `string` type to a union. This phase delivers the data model, validation enforcement, YAML reader updates, severity migration, schema versioning, and template changes. Phase 2 (separate spec) handles health expansion and audit display.

The structural analog is `structured-findings-companion` — same shape of change: extend companion YAML schema, update save validation, update YAML reader, update templates + dogfood sync. The patterns in save validation (error-accumulation in `validateVerifyDataFormat`), YAML reading (type-guard + cast in `generateProofSummary`), and field mapping (`getProofContext`) are identical to what was done for `line`, `severity`, and `related_assertions`.

**Key decisions:**

- **Union types replace `string`** on `result`, `assertion.status`, and `category`. These fields already have exactly 3-4 known values — the union makes the contract self-documenting and lets the compiler catch every consumer gap.
- **`schema: number` on ProofChain** — chain-level, not entry-level. Set to `1` on write in `writeProofChain`. On read, if absent, treat as `1` (no explicit backfill needed — `1` is the only version and the field is optional on the type for backward compat with existing JSON on disk).
- **Severity migration in the existing backfill loop** (work.ts ~850 area). The loop already handles status backfill, scope_summary backfill, and reopen logic. Adding `blocker→risk` and `note→observation` mapping slots into the same iteration. Idempotent — already-migrated values are no-ops.
- **`VALID_FINDING_ACTIONS`** constant alongside `VALID_FINDING_SEVERITIES` in artifact.ts. Same pattern, same location.
- **Build concerns type expansion** — `ProofChainEntry.build_concerns` gains optional `severity` and `suggested_action` fields. `validateBuildDataFormat` requires both on each concern. `ProofSummary.build_concerns` gets the same optional fields.

## Output Mockups

### Save validation error messages (new fields)

```
Finding 3: missing "severity" field
Finding 3: missing "suggested_action" field
Finding 1: invalid severity "high" (valid: risk, debt, observation)
Finding 2: invalid suggested_action "fix" (valid: promote, scope, monitor, accept)
Concern 1: missing "severity" field
Concern 1: missing "suggested_action" field
```

### Verify template YAML example (after change)

```yaml
schema: 1
findings:
  - category: code
    summary: "Hard-coded timeout in retry logic"
    file: "packages/cli/src/api/client.ts"
    line: 47
    severity: risk
    suggested_action: scope
    related_assertions: ["A003"]
  - category: test
    summary: "Assertion checks existence not correctness"
    file: "packages/cli/tests/auth.test.ts"
    line: 89
    severity: debt
    suggested_action: scope
  - category: upstream
    summary: "Contract A003 value stale — says max 50 but implementation uses 100"
    severity: observation
    suggested_action: monitor
```

## File Changes

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Union type tightening and new fields. `ProofChain` gains `schema?: number`. `ProofChainEntry.result` becomes `'PASS' | 'FAIL' | 'UNKNOWN'`. `assertions[].status` becomes `'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED'`. `findings[].category` becomes `'code' | 'test' | 'upstream'`. `findings[].severity` changes from `'blocker' | 'observation' | 'note'` to `'risk' | 'debt' | 'observation'`. `findings` gains `suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept'`. `build_concerns` gains `severity?: ...` and `suggested_action?: ...` matching findings.
**Pattern to follow:** Existing union type style on `severity` at line 73.
**Why:** Every downstream consumer inherits correct types. Compiler flags missing cases.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Multiple sections:
1. **`ProofSummary` interface (~line 77):** `severity` union changes to `'risk' | 'debt' | 'observation'`. Add `suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept'`. Same changes on `build_concerns` array type. `result` field tightened to match `ProofChainEntry`.
2. **YAML reader (~line 1086):** Severity cast changes to new union. Add `suggested_action` reader with same type-guard + cast pattern: `if (typeof f['suggested_action'] === 'string') finding.suggested_action = f['suggested_action'] as 'promote' | 'scope' | 'monitor' | 'accept';`
3. **`getProofContext` (~line 1316):** Add `suggested_action` to the explicit field mapping block, same conditional pattern as `severity` and `line`.
4. **`ProofContextResult` interface (~line 1182):** `severity` union changes to `'risk' | 'debt' | 'observation'`. Add `suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept'`.
5. **`ProofChainEntryForContext` interface (~line 1212):** Same severity union change + add `suggested_action`.
6. **Build concern YAML reader (~line 1137-1141):** Currently constructs concern objects with only `summary` and `file`, ignoring all other YAML fields. After Phase 1, Build is required to provide `severity` and `suggested_action` on every concern — but this reader silently drops them. Add the same type-guard + cast pattern used for findings: `if (typeof c['severity'] === 'string') concern.severity = c['severity'] as ...;` and same for `suggested_action`. The concern construction must use a `const concern: ProofSummary['build_concerns'][0]` variable (same pattern as the findings reader at ~line 1079) so optional fields can be conditionally added.
**Pattern to follow:** Field mapping at proofSummary.ts:1315-1317 — conditional property assignment for optional fields. YAML reader at proofSummary.ts:1085-1087 — type-guard + cast for optional fields.
**Why:** `getProofContext` and the build concern reader both use explicit construction (not spread). If `suggested_action` or `severity` isn't added to either, it's silently dropped — this was a real bug class in structured-findings-companion. The build concern reader has the same gap.

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:**
1. **`VALID_FINDING_SEVERITIES` (~line 523):** Change from `['blocker', 'observation', 'note']` to `['risk', 'debt', 'observation']`.
2. **Add `VALID_FINDING_ACTIONS`** constant: `['promote', 'scope', 'monitor', 'accept']` — same location, right after `VALID_FINDING_SEVERITIES`.
3. **`validateVerifyDataFormat` (~line 589-594):** Severity changes from optional to required — same error pattern as `category`. Add `suggested_action` required check with same pattern. Error messages: `${prefix}: missing "severity" field` / `${prefix}: invalid severity "${sev}"` and same for `suggested_action`.
4. **`validateBuildDataFormat` (~line 657-665):** Add per-concern `severity` and `suggested_action` validation with same error pattern. Currently the loop only checks `summary` — extend it to check both new fields.
**Pattern to follow:** The existing severity validation at artifact.ts:589-594 (check if present → check if valid value from constant array) — replicate for `suggested_action`, and replicate both for build concerns.
**Why:** Save validation is the enforcement gate. Without it, agents can submit partial data.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:**
1. **Severity migration in backfill loop (~line 850 area):** Inside the `for (const finding of existing.findings || [])` loop, after the status backfill block, add severity migration: if `finding.severity === 'blocker'`, set to `'risk'`. If `finding.severity === 'note'`, set to `'observation'`. `'observation'` stays. `undefined` stays (46 findings — untouched until manual backfill). Idempotent.
2. **`schema` field on chain write (~line 970-971 area):** Before `await fsPromises.writeFile(chainPath, ...)`, set `chain.schema = 1`. This requires the `ProofChain` type to have the field.
**Pattern to follow:** The status backfill block at work.ts:851-859 — same conditional-assignment-in-loop pattern.
**Why:** Old severity values must not persist. Migration runs every `work complete` and is idempotent. Schema field enables future migration detection.

### `templates/.claude/agents/ana-verify.md` (modify)
**What changes:**
1. **YAML example (~line 107-123):** Replace `severity: blocker` with `severity: risk`, `severity: note` with `severity: observation`. Add `suggested_action: scope` / `suggested_action: monitor` to each finding example.
2. **Required/Optional fields line (~line 125-126):** Move `severity` from Optional to Required. Add `suggested_action` as Required. Update valid values.
3. **Classification brief (~6 lines):** Add after the YAML example, before the "Required fields" line. Explain the three severity values (risk = could hurt you, debt = making codebase worse, observation = information) and four action values (promote = encode a skill rule, scope = needs engineering work, monitor = watch no action now, accept = acknowledged can be closed).
**Pattern to follow:** Existing YAML example format and required/optional field documentation.
**Why:** This is how Verify learns the new taxonomy. Without it, Verify guesses or omits.

### `templates/.claude/agents/ana-build.md` (modify)
**What changes:**
1. **build_data.yaml example (~line 390-396):** Add `severity` and `suggested_action` fields to concern examples.
2. **Required/Optional fields line (~line 398-399):** Add `severity` (risk/debt/observation) and `suggested_action` (promote/scope/monitor/accept) as Required.
3. **Classification brief (~4 lines):** Same taxonomy explanation as Verify template, adapted for build concerns context.
**Pattern to follow:** Existing concern example format.
**Why:** Build needs to classify concerns from the first save after this ships.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Dogfood sync — apply exactly the same changes as `templates/.claude/agents/ana-verify.md`.
**Why:** The dogfood copies must match templates exactly. AC21 requires this.

### `.claude/agents/ana-build.md` (modify)
**What changes:** Dogfood sync — apply exactly the same changes as `templates/.claude/agents/ana-build.md`.
**Why:** Same as above.

### Test files (modify)

**`tests/commands/artifact.test.ts`:** 
- Line 1936: `severity: blocker` → `severity: risk`. Also add `suggested_action: scope` to each finding in this test fixture (severity is now required, and so is suggested_action).
- Line 2024: `severity: blocker` → `severity: risk` (the "valid severity" acceptance test).
- The "all required fields" test (~line 1925) needs `suggested_action` added to test fixtures.
- Add new tests: finding missing `severity` produces error, finding missing `suggested_action` produces error, finding with invalid `suggested_action` produces error, finding with valid `suggested_action` passes. Build concern missing `severity`/`suggested_action` produces errors.

**`tests/commands/proof.test.ts`:**
- Line 806: `severity: 'blocker'` → `severity: 'risk'`.
- Line 1025: `'blocker'` → `'risk'` in the ternary.

**`tests/utils/proofSummary.test.ts`:**
- Existing `observation` values stay (no change needed).
- Add test: YAML reader parses `suggested_action` from verify_data.yaml companion (extend existing YAML reader test at ~line 1746).
- Add test: `getProofContext` returns `suggested_action` when present (extend existing context fields test at ~line 1879).
- Add test: `getProofContext` omits `suggested_action` when absent (extend existing omission test at ~line 1909).

## Acceptance Criteria

- [ ] AC1: `ProofChainEntry` finding type has `severity?: 'risk' | 'debt' | 'observation'` and `suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept'`
- [ ] AC2: `ProofSummary` finding type has same two optional fields
- [ ] AC3: `ProofChainEntry.result` typed as `'PASS' | 'FAIL' | 'UNKNOWN'`
- [ ] AC4: `ProofChainEntry.assertions[].status` typed as `'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | 'UNCOVERED'`
- [ ] AC5: `ProofChainEntry.findings[].category` typed as `'code' | 'test' | 'upstream'`
- [ ] AC6: `ProofChain` interface has `schema?: number`. `writeProofChain` sets `chain.schema = 1` before writing
- [ ] AC7: `VALID_FINDING_SEVERITIES` is `['risk', 'debt', 'observation']`
- [ ] AC8: `VALID_FINDING_ACTIONS` is `['promote', 'scope', 'monitor', 'accept']`
- [ ] AC9: `validateVerifyDataFormat` requires `severity` on every finding — missing produces `Finding N: missing "severity" field`, invalid produces `Finding N: invalid severity "xyz"`
- [ ] AC10: `validateVerifyDataFormat` requires `suggested_action` on every finding — same error pattern
- [ ] AC11: `validateBuildDataFormat` requires `severity` and `suggested_action` on every concern — same error pattern
- [ ] AC12: YAML reader casts severity as `'risk' | 'debt' | 'observation'` and reads `suggested_action` with cast
- [ ] AC13: `getProofContext` maps `suggested_action` alongside existing fields
- [ ] AC14: `writeProofChain` backfill loop migrates `blocker→risk`, `note→observation`. Idempotent
- [ ] AC18: Verify template YAML example uses new values, `severity` and `suggested_action` listed as required, classification brief present
- [ ] AC19: Build template has classification brief, concern examples include new fields, both listed as required
- [ ] AC20: Build concerns in `ProofChainEntry` and `ProofSummary` gain `severity` and `suggested_action` optional fields
- [ ] AC21: Dogfood copies match templates exactly
- [ ] AC24: All consumers of `result` compile cleanly with union type
- [ ] AC25: All consumers of `assertion.status` compile cleanly with union type
- [ ] AC26: All consumers of `category` compile cleanly with union type
- [ ] AC28: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC29: Lint passes: `pnpm lint`

## Testing Strategy

- **Unit tests (artifact.test.ts):** New validation tests for required `severity`, required `suggested_action`, invalid `suggested_action`, and build concern validation. Update existing fixtures to use new severity values and include `suggested_action`.
- **Unit tests (proofSummary.test.ts):** Extend YAML reader test to assert `suggested_action` parsing. Extend `getProofContext` tests to assert `suggested_action` mapping and omission.
- **Unit tests (proof.test.ts):** Mechanical update — change `blocker` to `risk` in test fixtures.
- **Unit tests (proofSummary.test.ts):** Add test for build concern YAML reader: verify_data.yaml concerns with `severity` and `suggested_action` are preserved through `generateProofSummary` into `summary.build_concerns`.
- **Integration:** TypeScript compilation (`tsc --noEmit`) serves as integration test — every consumer of the tightened union types must handle the new shape.
- **Edge cases:** Finding with `severity: undefined` is rejected by save validation (required). Finding with old value `blocker` is rejected by save validation (not in new enum). Build concern with only `summary` is rejected. YAML with `suggested_action` missing is rejected at save but the reader handles its absence gracefully (optional on type). Build concern with severity/action in YAML is correctly read (not silently dropped).

## Dependencies

None. Phase 1 is self-contained.

## Constraints

- **Backward compatibility:** Optional fields on types ensure existing `proof_chain.json` entries parse without error. The 46 findings with `severity: undefined` remain untouched.
- **No runtime type assertions on read.** The JSON file may contain old values. TypeScript types guard new writes; save validation guards new saves; migration handles known old values. But `JSON.parse` of an existing chain just works.
- **Template changes must be identical in templates and dogfood copies.** Diff must produce empty output.

## Gotchas

- **`ProofChainEntryForContext` duplicates type knowledge.** This interface at proofSummary.ts:1201 duplicates field types from `ProofChainEntry` in proof.ts. It needs the same severity union change AND the new `suggested_action` field. Known concern from proof chain history — intentional duplication to avoid cross-layer imports.
- **`getProofContext` explicit mapping.** Does NOT spread — maps fields one at a time. If `suggested_action` isn't added to the conditional block at ~line 1316, it's silently dropped. This was a real bug in structured-findings-companion.
- **Severity on save is required, severity on type is optional.** This asymmetry is intentional — the type accommodates old data, the validator enforces new data quality. Don't make the type field required.
- **`chain.schema = 1` must be set before `JSON.stringify`.** The `writeProofChain` function writes the chain with `await fsPromises.writeFile(chainPath, JSON.stringify(chain, null, 2))` at ~line 971. Set `chain.schema` just before this line, after the `chain.entries.push(entry)`.
- **Build concerns validation loop is minimal.** The current `validateBuildDataFormat` loop only checks `summary`. Adding `severity` + `suggested_action` means reading those fields and running the same check pattern as verify findings. Don't miss this — it's easy to update verify validation and forget build validation.
- **Build concern YAML reader silently drops fields.** The reader at proofSummary.ts:1137-1141 constructs concerns with only `{ summary, file }`. It does not read `severity` or `suggested_action` from the YAML. After this scope, Build writes both fields — but if the reader isn't updated, the fields enter build_data.yaml, pass validation, then vanish when `generateProofSummary` reads the companion. The data enters the proof chain via `ProofSummary.build_concerns` without the classification. Same silent-drop bug class as `getProofContext`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Use `| null` for checked-empty fields, `?:` for unchecked-optional fields. Severity and suggested_action are `?:` (optional).
- Constants use `SCREAMING_SNAKE_CASE` (`VALID_FINDING_ACTIONS`).
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Always use `--run` with `pnpm vitest` to avoid watch mode hang.

### Pattern Extracts

**Save validation pattern — artifact.ts:589-594:**
```typescript
      // severity optional, but if present must be valid
      if (sev !== undefined) {
        if (typeof sev !== 'string' || !VALID_FINDING_SEVERITIES.includes(sev)) {
          errors.push(`${prefix}: invalid severity "${sev}" (valid: ${VALID_FINDING_SEVERITIES.join(', ')})`);
        }
      }
```
This changes to required (remove the `!== undefined` guard, add missing check). Then replicate the whole block for `suggested_action`.

**YAML reader field mapping — proofSummary.ts:1085-1087:**
```typescript
              if (typeof f['line'] === 'number') finding.line = f['line'];
              if (typeof f['severity'] === 'string') finding.severity = f['severity'] as 'blocker' | 'observation' | 'note';
              if (Array.isArray(f['related_assertions'])) finding.related_assertions = f['related_assertions'] as string[];
```
Add `suggested_action` line following same pattern. Update severity cast to new union.

**Build concern YAML reader — proofSummary.ts:1137-1141:**
```typescript
            for (const c of yamlContent.concerns as Array<Record<string, unknown>>) {
              summary.build_concerns.push({
                summary: String(c['summary'] ?? ''),
                file: typeof c['file'] === 'string' ? c['file'] : null,
              });
            }
```
This must be restructured to use a variable + conditional field assignment (matching the findings reader pattern above) so severity and suggested_action can be added.

**getProofContext explicit mapping — proofSummary.ts:1315-1317:**
```typescript
          if (finding.line !== undefined) matched.line = finding.line;
          if (finding.severity !== undefined) matched.severity = finding.severity;
          if (finding.related_assertions !== undefined) matched.related_assertions = finding.related_assertions;
```
Add `suggested_action` line following same pattern.

**Status backfill in work.ts:851-859:**
```typescript
    // Backfill status (AC4) — idempotent
    for (const finding of existing.findings || []) {
      if (!finding.status) {
        if (finding.category === 'upstream') {
          finding.status = 'lesson';
          lessonsClassified++;
        } else {
          finding.status = 'active';
        }
      }
    }
```
Severity migration goes after this block, same loop.

### Proof Context

- **proof.ts:** Known concern about `ProofChainEntryForContext` duplicating types. Both need the new fields. No blockers.
- **proofSummary.ts:** Known concern about `getProofContext` conditional property assignment creating polymorphic JSON shape. Accepted pattern — `suggested_action` follows the same approach.
- **artifact.ts:** No active findings for this file.

### Checkpoint Commands

- After type changes in proof.ts: `(cd packages/cli && npx tsc --noEmit)` — Expected: compiler flags consumers with old string types. Fix each.
- After all source changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass (1599+ after new tests added).
- Lint: `pnpm lint`

### Build Baseline
- Current tests: 1599 passed, 2 skipped (1601 total)
- Current test files: 97 passed (97)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1612+ tests (adding ~13 new validation and reader tests)
- Regression focus: `artifact.test.ts` (validation changes), `proof.test.ts` (fixture updates), `proofSummary.test.ts` (reader changes)

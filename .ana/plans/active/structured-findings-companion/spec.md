# Spec: Structured Findings Companion

**Created by:** AnaPlan
**Date:** 2026-04-28
**Scope:** .ana/plans/active/structured-findings-companion/scope.md

## Prerequisites

Before creating the feature branch, verify that the following three one-line fixes are committed to main. These are pre-existing verify findings flagged in 3 consecutive verify reports. If they are not committed, commit them first as a separate cleanup — they are not part of this build.

1. **Dead ternary at `packages/cli/src/commands/work.ts:810`** — `(c as { category: string }).category === 'upstream' ? 'active' : 'active' as const` — both branches return `'active'`. The ternary is dead. The status assignment happens in the loop at lines 819-825 anyway. Replace with just `'active' as const`.
2. **Dead truthiness guard at `packages/cli/src/utils/proofSummary.ts:346`** — `} else if (projectRoot)` — `projectRoot` is always truthy at this point (it's the function parameter, and callers pass resolved paths). Remove the condition, keep the else block.
3. **Redundant status filter at `packages/cli/src/utils/proofSummary.ts:535-536`** — `if (finding.status && finding.status !== 'active' && finding.status !== undefined) continue` — the `!== undefined` check is redundant after the truthiness check. Simplify to `if (finding.status && finding.status !== 'active') continue`.

These are developer actions. Do not start the build until they are confirmed on main.

## Approach

Establish the companion convention: structured YAML data files alongside narrative markdown reports. `verify_data.yaml` sits next to `verify_report.md`. `build_data.yaml` sits next to `build_report.md`. This follows the existing `contract.yaml` / `spec.md` precedent — structured data has its own file, narrative has its own file.

The implementation has five layers:

1. **Type expansion** — Add `line`, `severity`, `related_assertions` to the finding type on `ProofChainEntry`, `ProofSummary`, `ProofContextResult`, and `ProofChainEntryForContext`. Delete `seal_commit` from `ProofChainEntry` and `ProofSummary`.

2. **Validation functions** — `validateVerifyDataFormat` and `validateBuildDataFormat` in artifact.ts, following the `validateContractFormat` error-accumulation pattern. YAML parse → required field checks → enum validation → error array return.

3. **Save pipeline integration** — When saving a report (verify or build), discover the companion YAML by filename derivation (`_report` → `_data`, `.md` → `.yaml`). Validate it. Stage it. Hash it with its own key. Both `saveArtifact` and `saveAllArtifacts` implement companion handling.

4. **Proof summary YAML reader** — `generateProofSummary` gains a one-branch fallback per verify report: if `verify_data.yaml` (or `verify_data_N.yaml`) exists alongside the report, read structured findings from it; otherwise fall back to `parseFindings` regex extraction. Same pattern for build: if `build_data.yaml` exists, read structured concerns; otherwise fall back to `parseBuildOpenIssues`.

5. **Template updates** — Verify template: rename `## Callouts` to `## Findings`, update all prose references from "callout" to "finding", add YAML-first workflow step with schema documentation and relationship statement. Build template: add `build_data.yaml` creation instruction. Both templates synced to dogfood copies.

Design decisions:

- **Companion is required, not optional.** `save verify-report` blocks if `verify_data.yaml` is missing. This ensures every save after Foundation 2 has structured data. The error message is a complete migration guide for existing projects.
- **Companion discovery via filename derivation, not new artifact type.** The companion has no meaning without its report. The save command derives the companion filename from the report filename — no new entry in `parseArtifactType`.
- **`writeProofChain` spread gets a type assertion** (`as ProofChainEntry['findings'][0]`). The spread already preserves extra fields by accident. The type assertion makes it intentional and catches type mismatches at compile time. Explicit field construction for 12+ fields is brittle.
- **`parseFindings` regex matches both `## Callouts` and `## Findings`.** Backward compatible — old reports with `## Callouts` still parse correctly.

## Output Mockups

### Successful save with companion

```
$ ana artifact save verify-report structured-findings-companion
✓ verify_data.yaml validated (3 findings)
[structured-findings-companion] Save: Verify Report

Co-authored-by: Ana <build@anatomia.dev>
```

### Missing companion

```
$ ana artifact save verify-report my-feature
Error: verify_data.yaml not found alongside verify_report.md.

Foundation 2 requires a structured data companion for verify reports.
Create verify_data.yaml in .ana/plans/active/my-feature/ with this schema:

  schema: 1
  findings:
    - category: code
      summary: "Description of the finding"
      file: "packages/cli/src/path/to/file.ts"

See packages/cli/templates/.claude/agents/ana-verify.md for the full schema.
```

### Invalid companion

```
$ ana artifact save verify-report my-feature
Error: verify_data.yaml validation failed:
  - Missing "schema" field
  - Finding 2: missing "summary" field
  - Finding 3: invalid severity "high" (valid: blocker, observation, note)
```

### File existence warning

```
$ ana artifact save verify-report my-feature
Warning: verify_data.yaml finding 2 references "src/nonexistent.ts" which does not exist.
Warning: verify_data.yaml finding 3 (category: code) has no file reference.
✓ verify_data.yaml validated (4 findings, 2 warnings)
[my-feature] Save: Verify Report
```

## File Changes

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Add `line`, `severity`, `related_assertions` to the finding element type in `ProofChainEntry.findings`. Delete `seal_commit` field. The `line` field gets a comment: `// Display only. NOT used for matching or staleness.`
**Pattern to follow:** Existing finding fields at lines 66-77 — same optional pattern with `?:`.
**Why:** Without the type expansion, the new fields from YAML have nowhere to go in the persistent data model. Without `seal_commit` deletion, dead data persists.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Six changes in this file:
1. Add `line`, `severity`, `related_assertions` to the `ProofSummary` findings array type (line 72).
2. Add the same fields to `ProofContextResult` findings type (lines 992-1003).
3. Add the same fields to `ProofChainEntryForContext` findings type (line 1021).
4. Add `line`, `severity`, `related_assertions` to the explicit field mapping in `getProofContext` (lines 1111-1119). **This is the critical change** — `getProofContext` does NOT spread, it maps each field by name. Missing fields here means the data enters `proof_chain.json` but is invisible to every consumer that queries via `ana proof context`.
5. In `generateProofSummary`, add YAML-first reader: for each verify report file, derive the companion path (`verify_report.md` → `verify_data.yaml`, `verify_report_1.md` → `verify_data_1.yaml`). If companion exists, read and parse YAML, map each finding to `{ category, summary, file, anchor, line, severity, related_assertions }`. If companion absent, fall back to `parseFindings`. Same pattern for build reports: derive `build_data.yaml` from `build_report.md`, read concerns from YAML if present, fall back to `parseBuildOpenIssues` if absent.
6. Update `parseFindings` regex from `/## Callouts\n/` to `/## (?:Callouts|Findings)\n/` for backward compatibility.
7. Delete `seal_commit` from `ProofSummary` type and from the `generateProofSummary` default initialization.
**Pattern to follow:** The existing verify report loop at lines 920-951 — the YAML reader inserts at the start of the loop body, before `parseFindings`. The `parseBuildOpenIssues` fallback mirrors the verify pattern.
**Why:** Without YAML reader, structured data never enters the proof summary. Without `getProofContext` field mapping, downstream consumers silently lose the new fields.

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:** Four changes:
1. Add `validateVerifyDataFormat(filePath: string): string[]` following the `validateContractFormat` pattern. Checks: YAML parses, `schema` equals `1`, `findings` is array, each finding has `category` (one of `code`/`test`/`upstream`) and non-empty `summary`. If `severity` provided, must be one of `blocker`/`observation`/`note`. If `related_assertions` provided, must be array of strings. If `file` provided, emit warning (not error) if file doesn't exist at `path.join(projectRoot, file)`. If non-upstream finding has no `file`, emit warning.
2. Add `validateBuildDataFormat(filePath: string): string[]`. Checks: YAML parses, `schema` equals `1`, `concerns` is array, each concern has non-empty `summary`. `file` is optional.
3. In `saveArtifact`: after the report file validation block (around line 639) and before staging (line 707), add companion discovery and validation. Derive companion filename from `typeInfo.fileName`. For verify-report: check companion exists → validate → emit warnings. For build-report: same pattern. Block on missing companion. Block on validation errors. After report staging (line 707), stage the companion. After `.saves.json` metadata write for the report (line 726), add companion hash with `writeSaveMetadata(slugDir, companionKey, companionContent)` where `companionKey` is `'verify-data'` or `'build-data'`.
4. In `saveAllArtifacts`: during the validation loop (lines 898-953), for each report artifact, derive and validate the companion. During the staging loop (lines 997-1001), stage companions alongside their reports. During the metadata loop (lines 1017-1019), hash companions.
**Pattern to follow:** `validateContractFormat` at lines 398-499 for validation structure. `writeSaveMetadata` at lines 47-79 for hashing. The verify-report validation block at lines 629-639 for where companion validation inserts.
**Why:** Without save-time validation, invalid YAML enters the integrity chain. Without companion staging, the YAML isn't committed. Without companion hashing, it has no integrity proof.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Three changes:
1. Add type assertion to the `findings` spread at line 808: `...c` becomes `{ ...c } as ProofChainEntry['findings'][0]`. This makes the spread intentional — it preserves all fields from `ProofSummary` findings including the new ones, with compile-time type checking.
2. Delete `seal_commit: proof.seal_commit,` at line 804.
3. In the backfill loop (lines 836-865), add `delete (existing as any).seal_commit` at the end of the per-entry loop, after the existing backfill operations. Idempotent — `delete` on non-existent property is a no-op.
**Pattern to follow:** The existing backfill operations in the same loop (callouts→findings migration at lines 838-843, status backfill at lines 848-858).
**Why:** Without the type assertion, the spread preserves new fields by accident. Without `seal_commit` deletion, dead data persists in 10 entries.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:**
1. Add a YAML-first workflow step — after reading the contract and before starting verification, instruct Verify to create `verify_data.yaml`. Place this in the startup sequence, near the contract reading instructions (around line 88). Include the complete schema with a realistic example.
2. Rename `## Callouts` heading (line 320) to `## Findings`. Update all 18 prose references from "callout" to "finding" throughout the template.
3. Add a relationship statement: "The YAML is authoritative for machines — it's what enters the proof chain. The Findings section is analysis for humans — reasoning, context, severity justification."
**Pattern to follow:** The existing `## Callouts` section format documentation at lines 320-344. The YAML-first step follows the pattern of the existing contract reading instruction at line 88.
**Why:** Without template changes, Verify doesn't create the companion YAML. Without the heading rename, the terminology is inconsistent with the codebase (which already migrated from "callouts" to "findings" in Foundation 1).

### `packages/cli/templates/.claude/agents/ana-build.md` (modify)
**What changes:** Add `build_data.yaml` creation instruction near the `## Open Issues` section (around line 386). Include schema documentation: `schema: 1`, `concerns` array with `summary` (required) and `file` (optional). Instruct Build to create `build_data.yaml` before writing the build report's Open Issues section.
**Pattern to follow:** The adjacent `## Open Issues` section documentation at lines 386-393.
**Why:** Without build template changes, Build doesn't create `build_data.yaml`.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Byte-identical copy of the package template. `diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md` must produce empty output.
**Why:** Dogfood sync — the project's own agents match what ships to users.

### `.claude/agents/ana-build.md` (modify)
**What changes:** Byte-identical copy of the package template. `diff packages/cli/templates/.claude/agents/ana-build.md .claude/agents/ana-build.md` must produce empty output.
**Why:** Dogfood sync.

### `packages/cli/tests/commands/artifact.test.ts` (modify)
**What changes:** Add tests for companion validation and save behavior. See Testing Strategy section.
**Pattern to follow:** Existing `createTestProject` helper + `saveArtifact`/`saveAllArtifacts` test patterns at lines 14-50 and 1222-1300.
**Why:** Companion save behavior has multiple branches (missing, invalid, valid, warnings) that must be tested.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** Add tests for YAML reader and parser fallback in `generateProofSummary`, and for `getProofContext` field propagation. See Testing Strategy section.
**Pattern to follow:** Existing `generateProofSummary` tests with temp directories at lines 17-60.
**Why:** The YAML-first / parser-fallback branch is the core behavioral change. Both paths must be tested.

## Acceptance Criteria

- [ ] AC1: `verify_data.yaml` is validated when saving a verify-report. Validation checks: YAML parses, `schema` field equals `1`, `findings` is an array, each finding has `category` (one of code/test/upstream) and non-empty `summary`. If `severity` is provided, must be one of blocker/observation/note. If `related_assertions` is provided, must be an array of strings.
- [ ] AC2: `ana artifact save verify-report` blocks when `verify_data.yaml` does not exist alongside the verify report. The error message names the missing file and directs the user to create it.
- [ ] AC3: `ana artifact save verify-report` succeeds when `verify_data.yaml` exists and is valid. The companion is staged and committed alongside the report.
- [ ] AC4: `verify_data.yaml` gets its own SHA-256 hash in `.saves.json` under key `verify-data`. The hash flows into the proof chain entry's `hashes` object.
- [ ] AC5: `saveAllArtifacts` discovers `verify_data.yaml` alongside `verify_report.md` (and `verify_data_N.yaml` alongside `verify_report_N.md`). The companion is validated, staged, and hashed — same behavior as `saveArtifact`.
- [ ] AC6: `build_data.yaml` is validated when saving a build-report. Validation checks: YAML parses, `schema` field equals `1`, `concerns` is an array, each concern has non-empty `summary`. `file` is optional.
- [ ] AC7: `ana artifact save build-report` blocks when `build_data.yaml` does not exist alongside the build report. Same companion convention as verify.
- [ ] AC8: `build_data.yaml` gets its own SHA-256 hash in `.saves.json` under key `build-data`.
- [ ] AC9: `saveAllArtifacts` discovers `build_data.yaml` alongside `build_report.md` with the same companion convention as verify.
- [ ] AC10: `generateProofSummary` reads findings from `verify_data.yaml` when present. The returned `ProofSummary.findings` array includes `line`, `severity`, and `related_assertions` fields from the YAML.
- [ ] AC11: `generateProofSummary` falls back to `parseFindings` when `verify_data.yaml` is absent. The returned findings have `line`, `severity`, and `related_assertions` as undefined.
- [ ] AC12: `generateProofSummary` reads build concerns from `build_data.yaml` when present, falling back to `parseBuildOpenIssues` when absent.
- [ ] AC13: `getProofContext` returns `line`, `severity`, and `related_assertions` on findings that have them. These fields appear in the `ProofContextResult` type.
- [ ] AC14: `ProofChainEntry` finding type includes optional fields: `line?: number`, `severity?: 'blocker' | 'observation' | 'note'`, `related_assertions?: string[]`. All optional for backward compatibility.
- [ ] AC15: `ProofSummary` finding type includes the same optional fields as AC14.
- [ ] AC16: `ProofChainEntryForContext` and `ProofContextResult` finding types include the same optional fields.
- [ ] AC17: The `writeProofChain` finding construction preserves the new fields from `ProofSummary` to `ProofChainEntry` via spread with type assertion.
- [ ] AC18: `seal_commit` is removed from `ProofChainEntry`, `ProofSummary`, `generateProofSummary`, and `writeProofChain`. Existing entries have `seal_commit` deleted in the backfill loop.
- [ ] AC19: `parseFindings` regex matches both `## Callouts` and `## Findings` headings.
- [ ] AC20: When `file` is provided on a finding and does not exist at `path.join(projectRoot, file)`, save emits a warning (does not block).
- [ ] AC21: When a non-upstream finding has no `file`, save emits a warning (does not block).
- [ ] AC22: The verify template heading `## Callouts` is renamed to `## Findings`. All prose references to "callout" are updated to "finding" throughout the template.
- [ ] AC23: The verify template includes a YAML-first workflow step instructing Verify to create `verify_data.yaml` before writing the narrative report. The schema is documented with a complete example.
- [ ] AC24: The verify template includes a relationship statement: YAML is authoritative for machines, the `## Findings` section is analysis for humans.
- [ ] AC25: The build template instructs Build to create `build_data.yaml` alongside the build report, with schema documentation.
- [ ] AC26: Template changes are applied identically to both the package template and the dogfood copy. `diff` between them produces empty output.
- [ ] AC27: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC28: Lint passes: `pnpm lint`

## Testing Strategy

### Unit tests — artifact.test.ts

**Companion validation tests:**
- Valid `verify_data.yaml` with all fields → returns empty errors
- Missing `schema` field → returns error
- Invalid `schema` value (not `1`) → returns error
- Empty `findings` array → returns error (or not — check: the contract allows empty if no findings. Actually, the scope says `findings` is an array. An empty array is valid — Verify may have zero findings.)
- Finding missing `category` → returns error
- Finding with invalid `category` → returns error
- Finding missing `summary` → returns error
- Finding with invalid `severity` → returns error
- Finding with valid `severity` → no error
- Finding with `related_assertions` as non-array → returns error
- Valid `build_data.yaml` → returns empty errors
- Build concern missing `summary` → returns error

**Companion save tests:**
- Save verify-report when `verify_data.yaml` missing → blocks with descriptive error
- Save verify-report when `verify_data.yaml` exists and valid → succeeds, companion staged and committed
- `.saves.json` contains `verify-data` key with SHA-256 hash after save
- Save build-report when `build_data.yaml` missing → blocks
- `saveAllArtifacts` with verify report + valid companion → companion staged and hashed
- `saveAllArtifacts` with numbered variants (`verify_report_1.md` + `verify_data_1.yaml`) → companion discovered and saved
- Save with companion that has file warnings → save succeeds, warnings emitted

### Unit tests — proofSummary.test.ts

**YAML reader tests:**
- `generateProofSummary` with `verify_data.yaml` present → reads findings from YAML, includes `line`, `severity`, `related_assertions`
- `generateProofSummary` without `verify_data.yaml` → falls back to `parseFindings`, new fields are undefined
- `generateProofSummary` with `build_data.yaml` present → reads concerns from YAML
- `generateProofSummary` without `build_data.yaml` → falls back to `parseBuildOpenIssues`
- Numbered variant: `verify_data_1.yaml` alongside `verify_report_1.md` → correctly discovered

**getProofContext field propagation:**
- Write a proof chain entry with findings that have `line`, `severity`, `related_assertions` → `getProofContext` returns those fields on matched findings

**parseFindings backward compat:**
- Report with `## Findings` heading → parsed correctly
- Report with `## Callouts` heading → still parsed correctly (backward compat)

### Edge cases
- Companion with extra unrecognized fields → validation passes (forward compat)
- Companion with `anchor` field (not required but useful) → passes through to proof summary
- `seal_commit` deletion from existing entries — verify it's removed after `writeProofChain` runs

## Dependencies

- The `yaml` package is already imported in both `artifact.ts` and `proofSummary.ts`
- `ProofChainEntry` type is imported in `work.ts` from `types/proof.ts`
- The three pre-scope dead code fixes must be committed to main before the feature branch is created (see Prerequisites)

## Constraints

- All new finding fields (`line`, `severity`, `related_assertions`) must be optional (`?:`) for backward compatibility with existing proof chain entries.
- The parser fallback must remain functional — old verify reports without companion YAML must still produce findings.
- Template and dogfood copies must be byte-identical. Verify with `diff`.
- Existing `.saves.json` entries and proof chain entries are not broken by the changes.
- Validation warnings (file existence, missing file on non-upstream findings) are `console.warn` with `chalk.yellow`, not errors. They do not block the save.

## Gotchas

- **`getProofContext` does NOT spread.** It explicitly maps each field at lines 1111-1119. If `line`, `severity`, and `related_assertions` are not added to the explicit mapping, they enter `proof_chain.json` but are invisible to every consumer that queries via `ana proof context`. This is the single most likely place for the new fields to be silently dropped.

- **`saveAllArtifacts` has two separate stages: validation (lines 898-953) and staging/metadata (lines 997-1026).** Companion validation goes in the validation stage. Companion staging and hashing go in the staging/metadata stage. Putting validation in the wrong stage means invalid YAML gets committed.

- **Companion filename derivation must handle numbered variants.** `verify_report_1.md` → `verify_data_1.yaml`. The derivation replaces `_report` with `_data` in the stem and `.md` with `.yaml` in the extension. Test with both numbered and unnumbered variants.

- **Template dogfood sync must be byte-identical.** `diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md` must produce empty output. Same for build. Copy the template file, don't manually replicate changes.

- **The `seal_commit` deletion in the backfill loop is idempotent.** `delete` on a non-existent property is a no-op. Place it at the end of the per-entry loop, not interleaved with finding-level operations.

- **`parseBuildOpenIssues` heading is `## Open Issues`, not `## Callouts`.** The build parser is separate from the verify parser. Only the verify heading changes.

- **The verify template is 515 lines with 18 occurrences of "callout".** The rename is mechanical but distributed. Read the template end-to-end after modification to verify consistency.

- **Companion discovery in `saveArtifact` must happen before staging but after file-exists check.** The insertion point is between the validation block (ending ~line 677) and the staging block (starting at line 707). The companion path must be computed, checked for existence, and validated in this window.

- **`saveArtifact` companion hash must be written before the no-changes check.** The `writeSaveMetadata` call for the companion goes alongside the report's metadata write at line 726. If the companion hash is written after the no-changes check (line 742), a save where only the companion changed would exit "already up to date."

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { foo } from './bar.js'`. Omitting crashes at runtime.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- `| null` for checked-and-empty fields. `?:` for may-not-have-been-checked fields. The new finding fields use `?:` — optional, not nullable.
- Early returns over nested conditionals.
- Explicit return types on all exported functions. `@param` and `@returns` JSDoc on exports.
- Engine files have zero CLI dependencies. `proofSummary.ts` is in `utils/` — it can import `yaml` and `fs` but not `chalk`. Validation warnings in artifact.ts (commands layer) use `chalk.yellow`.

### Pattern Extracts

**Validation function pattern** — `validateContractFormat` at artifact.ts:398-499:
```typescript
function validateContractFormat(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors: string[] = [];

  let contract: ContractSchema;
  try {
    contract = yaml.parse(content);
  } catch (e) {
    return [`YAML parse error: ${e instanceof Error ? e.message : 'Invalid YAML'}`];
  }

  if (!contract || typeof contract !== 'object') {
    return ['Contract must be a YAML object'];
  }

  // Field checks with error accumulation...
  if (!contract.version) {
    errors.push('Missing "version" field');
  }
  // ...
  return errors;
}
```

**Hash writing pattern** — `writeSaveMetadata` at artifact.ts:47-79:
```typescript
function writeSaveMetadata(slugDir: string, artifactType: string, content: string): boolean {
  // Read existing .saves.json, compute SHA256, compare, skip if unchanged
  const hash = createHash('sha256').update(content).digest('hex');
  const fullHash = `sha256:${hash}`;
  const existing = saves[artifactType];
  if (existing && existing.hash === fullHash) return false;
  saves[artifactType] = { saved_at: new Date().toISOString(), hash: fullHash };
  // ...
}
```

**getProofContext explicit field mapping** — proofSummary.ts:1111-1119:
```typescript
matchedFindings.push({
  id: finding.id,
  category: finding.category,
  summary: finding.summary,
  file: finding.file,
  anchor: finding.anchor,
  from: entry.feature,
  date: entryDate,
  status: finding.status,
});
```

**writeProofChain spread** — work.ts:808-812:
```typescript
findings: proof.findings.map((c, i) => ({
  ...c,
  id: `${slug}-C${i + 1}`,
  status: (c as { category: string }).category === 'upstream' ? 'active' : 'active' as const,
})),
```

### Checkpoint Commands

- After type changes compile: `(cd packages/cli && npx tsc --noEmit)` — Expected: no errors
- After validation functions: `(cd packages/cli && pnpm vitest run tests/commands/artifact.test.ts)` — Expected: existing + new tests pass
- After proof summary changes: `(cd packages/cli && pnpm vitest run tests/utils/proofSummary.test.ts)` — Expected: existing + new tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass
- Lint: `pnpm lint` — Expected: clean
- Template sync: `diff packages/cli/templates/.claude/agents/ana-verify.md .claude/agents/ana-verify.md` — Expected: empty
- Template sync: `diff packages/cli/templates/.claude/agents/ana-build.md .claude/agents/ana-build.md` — Expected: empty

### Build Baseline

- Current tests: 1539 passed, 2 skipped (1541 total)
- Current test files: 97 passed (97 total)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1560-1575 tests across 97 test files (new tests added to existing files)
- Regression focus: `artifact.test.ts` (companion save changes), `proofSummary.test.ts` (YAML reader changes), `work.test.ts` (spread assertion + seal_commit deletion)

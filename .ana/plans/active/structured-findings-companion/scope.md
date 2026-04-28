# Scope: Structured Findings Companion

**Created by:** Ana
**Date:** 2026-04-28

## Intent

The proof chain's highest-value data — findings and build concerns — enters through 216 lines of regex parsing free-text LLM markdown. Every other data type (assertions, timing, hashes, modules) enters through structured sources at 100% reliability. The parser is adequate for what it captures (89% file resolution, 92% anchor accuracy post-F1.5). But two fields that would make the learning loop genuinely intelligent — `related_assertions` (which contract assertion a finding relates to) and `severity` (blocker vs observation vs note) — can't be parser-extracted. The agent knows which assertion it was checking when it found the issue. It just has no structured place to write it.

This is Foundation 2 of the Learning Loop. Foundation 1 made the data honest (lifecycle status, mechanical maintenance). Foundation 1.5 made the honesty verified (57% → 100% closure accuracy). Foundation 2 makes the data complete — structured input replaces regex extraction, new intelligence dimensions become possible, and every downstream consumer (Foundation 3 delivery, Ana Learn, health metrics, compliance dashboards) operates on validated structured data instead of parser output.

## Complexity Assessment

- **Size:** medium
- **Files affected:**
  - `packages/cli/src/types/proof.ts` — add `line`, `severity`, `related_assertions` to finding type on `ProofChainEntry`; delete `seal_commit` from `ProofChainEntry` and cross-cutting comment update
  - `packages/cli/src/utils/proofSummary.ts` — add fields to `ProofSummary` finding type, `ProofContextResult`, `ProofChainEntryForContext`; add YAML reader with parser fallback in `generateProofSummary`; update `getProofContext` explicit field mapping; update `parseFindings` regex; delete `seal_commit` from `ProofSummary` type and `generateProofSummary`
  - `packages/cli/src/commands/artifact.ts` — add `validateVerifyDataFormat` and `validateBuildDataFormat` functions; wire companion discovery, validation, staging, and hashing into `saveArtifact` and `saveAllArtifacts`
  - `packages/cli/src/commands/work.ts` — verify/make intentional the `writeProofChain` spread that transfers fields from `ProofSummary` to `ProofChainEntry`; delete `seal_commit` from entry construction and from existing entries in backfill loop
  - `packages/cli/templates/.claude/agents/ana-verify.md` — YAML-first workflow step, schema documentation, `## Callouts` → `## Findings` heading rename, 18 prose updates, narrative relationship statement
  - `packages/cli/templates/.claude/agents/ana-build.md` — YAML creation instruction, `build_data.yaml` schema documentation
  - `.claude/agents/ana-verify.md` — dogfood sync (identical to template)
  - `.claude/agents/ana-build.md` — dogfood sync (identical to template)
  - `packages/cli/tests/commands/artifact.test.ts` — validation tests, companion save tests, hash verification tests
  - `packages/cli/tests/utils/proofSummary.test.ts` — YAML reader tests, parser fallback tests, getProofContext field propagation tests
- **Blast radius:** The companion convention touches both save paths (`saveArtifact` and `saveAllArtifacts`) — every future `ana artifact save verify-report` and `ana artifact save build-report` invocation is affected. The type changes propagate across 6 locations in 4 files. The template changes affect every future Verify and Build agent session. `generateProofSummary` gains a branch (YAML present → read YAML, absent → parse markdown) that changes how every new proof chain entry's findings are populated. Existing entries and old reports are unaffected — the parser fallback handles them. The `seal_commit` deletion touches the backfill loop in `writeProofChain`, which runs on all entries every `work complete`.
- **Estimated effort:** ~45 minutes pipeline time (medium scope calibration)
- **Multi-phase:** no

## Approach

Establish the companion convention: structured YAML data files alongside narrative markdown reports. `verify_data.yaml` next to `verify_report.md`. `build_data.yaml` next to `build_report.md`. The convention follows the existing `contract.yaml` / `spec.md` precedent — structured data has its own file, narrative has its own file.

The save command learns the convention: when saving a report artifact, discover the companion (`_report` → `_data`, `.md` → `.yaml`), validate it, stage it, hash it with its own key, and commit it alongside the report. The companion participates in the full integrity chain — SHA-256 hash in `.saves.json`, flowing into `proof_chain.json`. Both `saveArtifact` and `saveAllArtifacts` implement the same companion handling — Foundation 1's INFRA-060 lesson.

`generateProofSummary` gains a one-branch fallback: if the companion YAML exists, read structured findings from it; if not, fall back to `parseFindings` regex extraction. The parser stays as defense in depth. The YAML reader populates the new fields (`line`, `severity`, `related_assertions`) that the parser can't extract.

The cross-cutting type updates ensure the new fields propagate from YAML → `ProofSummary` → `ProofChainEntry` → `getProofContext` → downstream consumers. Six locations, all verified against the code. The `getProofContext` explicit field mapping is the critical one — it doesn't spread, so unmapped fields are silently dropped.

Template changes make Verify write YAML first, narrative second. The YAML is the structured record. The `## Findings` section is analysis and reasoning. The relationship is explicit: YAML is authoritative for machines, narrative is for humans.

While touching the types, delete the dead `seal_commit` field — always null on new entries, no consumer reads it, every character earns its place.

Design principles: *"Verified over trusted"* — save-time validation verifies YAML structure, file paths get existence warnings, companion gets its own integrity hash. *"The elegant solution is the one that removes"* — removes the dependency on parsers for new data, removes the dead `seal_commit` field. *"Finished means a stranger can extend it"* — a stranger reads `verify_data.yaml` with its `schema: 1` field, adds a field, updates the validation. No regex knowledge required.

## Acceptance Criteria

- AC1: `verify_data.yaml` is validated when saving a verify-report. Validation checks: YAML parses, `schema` field equals `1`, `findings` is an array, each finding has `category` (one of code/test/upstream) and non-empty `summary`. If `severity` is provided, must be one of blocker/observation/note. If `related_assertions` is provided, must be an array of strings.
- AC2: `ana artifact save verify-report` blocks when `verify_data.yaml` does not exist alongside the verify report. The error message names the missing file and directs the user to create it.
- AC3: `ana artifact save verify-report` succeeds when `verify_data.yaml` exists and is valid. The companion is staged and committed alongside the report.
- AC4: `verify_data.yaml` gets its own SHA-256 hash in `.saves.json` under key `verify-data`. The hash flows into the proof chain entry's `hashes` object.
- AC5: `saveAllArtifacts` discovers `verify_data.yaml` alongside `verify_report.md` (and `verify_data_N.yaml` alongside `verify_report_N.md`). The companion is validated, staged, and hashed — same behavior as `saveArtifact`.
- AC6: `build_data.yaml` is validated when saving a build-report. Validation checks: YAML parses, `schema` field equals `1`, `concerns` is an array, each concern has non-empty `summary`. `file` is optional.
- AC7: `ana artifact save build-report` blocks when `build_data.yaml` does not exist alongside the build report. Same companion convention as verify.
- AC8: `build_data.yaml` gets its own SHA-256 hash in `.saves.json` under key `build-data`.
- AC9: `saveAllArtifacts` discovers `build_data.yaml` alongside `build_report.md` with the same companion convention as verify.
- AC10: `generateProofSummary` reads findings from `verify_data.yaml` when present. The returned `ProofSummary.findings` array includes `line`, `severity`, and `related_assertions` fields from the YAML.
- AC11: `generateProofSummary` falls back to `parseFindings` when `verify_data.yaml` is absent. The returned findings have `line`, `severity`, and `related_assertions` as undefined.
- AC12: `generateProofSummary` reads build concerns from `build_data.yaml` when present, falling back to `parseBuildOpenIssues` when absent.
- AC13: `getProofContext` returns `line`, `severity`, and `related_assertions` on findings that have them. These fields appear in the `ProofContextResult` type.
- AC14: `ProofChainEntry` finding type includes optional fields: `line?: number`, `severity?: 'blocker' | 'observation' | 'note'`, `related_assertions?: string[]`. All optional for backward compatibility.
- AC15: `ProofSummary` finding type includes the same optional fields as AC14.
- AC16: `ProofChainEntryForContext` and `ProofContextResult` finding types include the same optional fields.
- AC17: The `writeProofChain` finding construction preserves the new fields from `ProofSummary` to `ProofChainEntry` (spread with type assertion or explicit mapping — the mechanism must be type-safe, not reliant on accidental spread).
- AC18: `seal_commit` is removed from `ProofChainEntry`, `ProofSummary`, `generateProofSummary`, and `writeProofChain`. Existing entries have `seal_commit` deleted in the backfill loop.
- AC19: `parseFindings` regex matches both `## Callouts` and `## Findings` headings.
- AC20: When `file` is provided on a finding and does not exist at `path.join(projectRoot, file)`, save emits a warning (does not block).
- AC21: When a non-upstream finding has no `file`, save emits a warning (does not block).
- AC22: The verify template heading `## Callouts` is renamed to `## Findings`. All prose references to "callout" are updated to "finding" throughout the template.
- AC23: The verify template includes a YAML-first workflow step instructing Verify to create `verify_data.yaml` before writing the narrative report. The schema is documented with a complete example.
- AC24: The verify template includes a relationship statement: YAML is authoritative for machines, the `## Findings` section is analysis for humans.
- AC25: The build template instructs Build to create `build_data.yaml` alongside the build report, with schema documentation.
- AC26: Template changes are applied identically to both the package template and the dogfood copy. `diff` between them produces empty output.
- AC27: Tests pass: `(cd packages/cli && pnpm vitest run)`
- AC28: Lint passes: `pnpm lint`

## Edge Cases & Risks

**YAML-narrative disagreement.** Verify writes 6 findings in YAML, discusses 8 in the narrative. The YAML is authoritative — the proof chain records 6. The 2 narrative-only items are analysis, not formal findings. The template guidance ("every finding in the YAML should be discussed in the narrative") nudges alignment but doesn't enforce it. Risk 1 monitoring after the first run catches persistent disagreement.

**`related_assertions` population rate.** Findings from general code review (not assertion checking) won't have related assertions. Expected population: 30-50%. Even at 30%, the data is meaningful over 50+ entries. At <30% after 5 runs, reconsider the field's template guidance.

**Diffuse findings without file references.** 6 active code/test findings have no file — genuinely diffuse observations like "no test coverage for template content." The save validator warns but does not block. These findings enter the proof chain, participate in the dashboard, but can't be matched by `getProofContext` (which requires a file for matching). This is correct — diffuse findings are intelligence, not file-specific observations.

**Multi-spec companion naming.** `verify_report_1.md` → `verify_data_1.yaml`. The save command derives the companion filename by replacing `_report` with `_data` in the report filename and changing the extension. If the naming convention is wrong, multi-spec features can't save. The naming derivation must be tested with numbered variants.

**`seal_commit` deletion from existing entries.** 10 of 21 entries have real commit hashes from the pre-seal-hash-simplification era. The backfill loop deletes them. Irreversible. No consumer reads the field — verified by grep across the codebase. The historical hashes reference a deprecated mechanism (git commit-based seals replaced by content-based SHA-256 seals).

**Save validation friction.** Contract YAML retry rate is 15%. Adding companion YAML validation adds a second failure mode. If combined retry rate exceeds 25%, template instructions need refinement. The YAML-first workflow step mitigates — step 1 is harder to forget than a cleanup step.

**`getProofContext` explicit mapping is the silent-drop risk.** This function maps each field by name (lines 1111-1119). It does NOT spread. If `line`, `severity`, and `related_assertions` are not added to the explicit mapping, they enter `proof_chain.json` but are invisible to every consumer that queries via `ana proof context`. This is the most critical cross-cutting change.

**Existing customer migration.** Projects initialized before Foundation 2 have old verify templates without YAML-first instructions. Their first `ana artifact save verify-report` after updating the CLI will block: "verify_data.yaml not found." The error message must be a complete migration guide — name the missing file, explain why it's needed, point to the package template for the schema.

**The `writeProofChain` spread.** Line 808 uses `...c` to spread `ProofSummary` findings into `ProofChainEntry` findings. This accidentally preserves extra fields. After F2, the new fields flow through the spread. If someone refactors to explicit construction without adding the new fields, they silently disappear. The spread must be made intentional — either with a type assertion or documentation.

## Rejected Approaches

**YAML frontmatter on verify reports.** One file instead of two. But puts machine data inside a human document. The agent writes findings twice (frontmatter + narrative section) — they can disagree. Which is authoritative? The save validator has to parse frontmatter out of markdown. The separate file follows the `contract.yaml` / `spec.md` precedent — clean separation, no extraction logic, no authority confusion.

**Required `file` for code/test findings.** Enforces completeness. But 6 active code/test findings are genuinely diffuse — "no test coverage for template content" has no single file. Requiring a file forces the agent to fabricate a reference (false precision) or skip the finding (lost intelligence). Both are the same disease Foundation 1.5 fixed. Warn, don't block.

**Default severity of `observation`.** Makes every finding have a severity. But 80% would be defaults, not judgments — "the agent decided observation" becomes indistinguishable from "the agent skipped the field." Intentional classification at 30% population is more useful than forced classification at 100%.

**All seven data types in YAML.** The compliance table, AC results, deviations, result, and rejection cycles parsers work at 90%+. They haven't caused data quality issues. Moving them to YAML adds scope for marginal reliability gain. Fix what's broken (findings at 80% with missing intelligence dimensions), don't fix what works.

**New artifact type for companion.** Adding `verify-data` as a recognized artifact type in `parseArtifactType` with its own save command (`ana artifact save verify-data`). Over-engineers the relationship — the companion has no meaning without its report. Convention over abstraction: the save command derives the companion from the report filename.

**Conservative `seal_commit` removal (stop writing, keep historical).** Leaves dead data in 10 entries. "Every character earns its place" — the historical commit hashes reference a deprecated mechanism. No consumer reads them. Clean schema, clean data.

## Open Questions

None. All design decisions resolved through three-analyst review and developer confirmation.

## Exploration Findings

### Patterns Discovered

- `validateContractFormat` at artifact.ts:398-495 — the pattern for YAML validation functions. Returns `string[]` errors. Checks YAML parse, required fields, field types, enum values. The new `validateVerifyDataFormat` follows this pattern exactly.
- `writeSaveMetadata` at artifact.ts:47-79 — idempotent hash writing. Computes `sha256:${hash}`, compares against existing entry, skips if unchanged. The companion hash follows this exact pattern with a different key (`verify-data` instead of `verify-report`).
- `saveAllArtifacts` artifact discovery at artifact.ts:855-878 — recognizes specific filename patterns via string matching and regex. `verify_data.yaml` and `build_data.yaml` must be added to the recognition list OR discovered as companions of recognized report artifacts.
- `generateProofSummary` source ordering at proofSummary.ts:838-984 — reads `.saves.json` first, then contract.yaml, then verify reports, then build reports, then scope.md. The YAML reader inserts alongside the verify/build report reading — check for companion YAML before parsing markdown.
- `getProofContext` explicit field mapping at proofSummary.ts:1111-1119 — maps `id`, `category`, `summary`, `file`, `anchor`, `from`, `date`, `status` by name. Does NOT spread. New fields must be added here explicitly.

### Constraints Discovered

- [TYPE-VERIFIED] `ProofSummary.findings` at proofSummary.ts:72 — `Array<{ category: string; summary: string; file: string | null; anchor: string | null }>`. Missing `line`, `severity`, `related_assertions`. Must be expanded.
- [TYPE-VERIFIED] `ProofChainEntry.findings` at proof.ts:66-77 — has lifecycle fields (`status`, `closed_reason`, etc.) but missing `line`, `severity`, `related_assertions`.
- [TYPE-VERIFIED] `ProofContextResult.findings` at proofSummary.ts:992-1003 — explicit type with `id`, `category`, `summary`, `file`, `anchor`, `from`, `date`, `status`. Missing new fields.
- [TYPE-VERIFIED] `ProofChainEntryForContext` at proofSummary.ts:1017-1023 — narrow projection with `findings?` array. Missing new fields on the finding element type.
- [OBSERVED] `seal_commit` has zero consumers — grep across `packages/cli/src/` returns only type definitions, assignment to null, and the `writeProofChain` spread. No display code, no query code, no test assertions on the value.
- [OBSERVED] `writeProofChain` at work.ts:808 — `findings: proof.findings.map((c, i) => ({ ...c, id: ..., status: ... }))`. The spread preserves all fields from `ProofSummary.findings` including any the type doesn't declare. Works by accident.
- [DATA-VERIFIED] 99 findings across 21 entries. 54 active, 25 closed, 20 lessons. 6 active code/test findings have no file reference — all genuinely diffuse observations.
- [DATA-VERIFIED] 10 of 21 entries have non-null `seal_commit`. 11 have null. No consumer reads either.

### Test Infrastructure

- `packages/cli/tests/commands/artifact.test.ts` — uses temp git repos with `createProofProject` helper. Existing validation tests for contract format at lines ~1230+. The companion validation and save tests follow this pattern — create temp project, write companion YAML, run save, assert behavior.
- `packages/cli/tests/utils/proofSummary.test.ts` — tests `generateProofSummary` with temp directories containing report files. The YAML reader tests create a `verify_data.yaml` alongside `verify_report.md` in the temp dir and assert that `generateProofSummary` reads from YAML. The fallback tests omit the YAML and assert parser extraction.
- Dual-path coverage is mandatory: every behavior that varies by source (YAML vs parser) needs both paths tested. The requirements doc enumerates 8 specific test scenarios.

## For AnaPlan

### Structural Analog

`validateContractFormat` (artifact.ts:398-495) + the contract save flow. The validation function pattern (YAML parse, field checks, enum validation, error accumulation) is the exact template for `validateVerifyDataFormat`. The save integration pattern (validate → stage → hash → commit) is the template for companion handling. The `clear-the-deck` completed plan is the structural analog for the overall scope shape — multi-file type changes + template updates + test additions across the same files.

### Relevant Code Paths

- `packages/cli/src/commands/artifact.ts:47-79` — `writeSaveMetadata`. Companion hashing follows this exact pattern.
- `packages/cli/src/commands/artifact.ts:398-495` — `validateContractFormat`. Pattern for new validation functions.
- `packages/cli/src/commands/artifact.ts:580-770` — `saveArtifact`. Companion discovery, validation, staging, and hashing wire in here. The verify-report validation block at lines 629-638 is where companion checking goes.
- `packages/cli/src/commands/artifact.ts:855-878` — `saveAllArtifacts` artifact discovery. Must recognize companion YAML files.
- `packages/cli/src/commands/artifact.ts:909-953` — `saveAllArtifacts` validation loop. Companion validation goes here.
- `packages/cli/src/commands/artifact.ts:997-1026` — `saveAllArtifacts` staging and metadata. Companion staging and hashing go here.
- `packages/cli/src/utils/proofSummary.ts:39-76` — `ProofSummary` type. Add new fields to findings array type.
- `packages/cli/src/utils/proofSummary.ts:638-706` — `parseFindings`. Regex at line 642 needs `(?:Callouts|Findings)`.
- `packages/cli/src/utils/proofSummary.ts:804-987` — `generateProofSummary`. YAML reader inserts at ~line 920 (verify report loop) — check for companion, read YAML if present, else parse markdown.
- `packages/cli/src/utils/proofSummary.ts:992-1003` — `ProofContextResult` type. Add new fields.
- `packages/cli/src/utils/proofSummary.ts:1017-1023` — `ProofChainEntryForContext` projection. Add new fields.
- `packages/cli/src/utils/proofSummary.ts:1074-1155` — `getProofContext`. Explicit field mapping at lines 1111-1119 must include `line`, `severity`, `related_assertions`.
- `packages/cli/src/types/proof.ts:46-81` — `ProofChainEntry`. Add new finding fields, delete `seal_commit`.
- `packages/cli/src/commands/work.ts:808` — `writeProofChain` spread. Make intentional via type assertion.
- `packages/cli/src/commands/work.ts:804` — `seal_commit: proof.seal_commit` in entry construction. Delete.
- `packages/cli/src/commands/work.ts:836-865` — backfill loop. Add `delete existing.seal_commit` (or `delete (existing as any).seal_commit`).
- `packages/cli/templates/.claude/agents/ana-verify.md:320-344` — `## Callouts` section. Rename to `## Findings`, update format guidance.
- `packages/cli/templates/.claude/agents/ana-verify.md:98` — proof context instruction. Adjacent to where YAML-first workflow step goes.
- `packages/cli/templates/.claude/agents/ana-build.md:386-393` — `## Open Issues` section in report format. Adjacent to where `build_data.yaml` instruction goes.

### Patterns to Follow

- `validateContractFormat` error accumulation pattern — collect all errors in array, return them. Don't exit on first error.
- `writeSaveMetadata` idempotent hash pattern — compute hash, compare, skip if unchanged, return boolean.
- `saveAllArtifacts` validation-then-stage ordering — validate all artifacts first, then stage all, then commit. Companion validation runs in the validation phase.
- The verify template's existing `## Callouts` section format documentation at lines 320-344 — the structure for the new `## Findings` guidance and YAML relationship statement.

### Known Gotchas

- **`getProofContext` does NOT spread.** It explicitly maps each field at lines 1111-1119. This is the single most likely place for the new fields to be silently dropped. The spec must call this out with a loud warning.
- **`saveAllArtifacts` has two separate stages: validation (lines 898-953) and staging/metadata (lines 997-1026).** The companion must be validated in the first stage and staged/hashed in the second stage. Putting validation in the wrong stage means companions are staged before validation — invalid YAML gets committed.
- **The companion filename derivation must handle numbered variants.** `verify_report_1.md` → `verify_data_1.yaml`. The derivation is string replacement on the filename, not a mapping table. Test with both numbered and unnumbered variants.
- **Template and dogfood must be byte-identical.** `diff` between `packages/cli/templates/.claude/agents/ana-verify.md` and `.claude/agents/ana-verify.md` must produce empty output. Same for build template. Previous scopes (F1.5) have tested this — follow the same pattern.
- **The `seal_commit` deletion in the backfill loop runs on ALL entries every `work complete`.** The delete is idempotent (`delete` on a non-existent property is a no-op). But the backfill loop already has multiple responsibilities (status backfill, path resolution, staleness checks). The `seal_commit` deletion should go at the end of the per-entry loop, not interleaved with finding-level operations.
- **`parseBuildOpenIssues` section heading is `## Open Issues`, not `## Callouts`.** The build parser regex is separate from the verify parser regex. The build heading does NOT need renaming — only the verify heading changes.
- **The verify template is 515 lines.** The YAML-first workflow step, schema documentation, heading rename, 18 prose updates, and narrative relationship statement are ~50-70 lines of changes distributed across the file. This is a significant template touch — test the full template by reading it end-to-end after modification.
- **Pre-scope cleanup is NOT in this scope.** The dead ternary at work.ts:810, the dead truthiness guard at proofSummary.ts:346, and the redundant status filter at proofSummary.ts:535-536 should be fixed BEFORE this scope starts. They are one-line fixes committed separately.

### Things to Investigate

- **Companion staging order in `saveArtifact`.** The report is staged at line 707, then `.saves.json` at line 737. The companion must be staged between these — after validation but before the no-changes check at line 742. If the companion is staged after the no-changes check, a save where only the companion changed would exit "already up to date." Investigate the correct insertion point.
- **`saveAllArtifacts` companion discovery strategy.** Two approaches: (a) add `verify_data.yaml` / `build_data.yaml` to the filename recognition at lines 855-878 as new artifact types, or (b) discover companions as part of processing their parent report artifacts. Approach (b) is cleaner (no new artifact type) but requires the companion to be associated with its parent in the artifacts array. Investigate which approach integrates more cleanly with the existing validation → staging → commit flow.
- **The `line` field type comment placement.** The requirements say the type definition should include `// Display only. NOT used for matching or staleness.` Investigate whether this comment goes on the `ProofSummary` type, the `ProofChainEntry` type, or both.

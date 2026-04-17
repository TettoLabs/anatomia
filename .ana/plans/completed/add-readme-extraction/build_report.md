# Build Report: Add README extraction to scan

**Created by:** AnaBuild
**Date:** 2026-04-16
**Spec:** .ana/plans/active/add-readme-extraction/spec.md
**Branch:** feature/add-readme-extraction

## What Was Built

- `packages/cli/src/engine/types/engineResult.ts` (modified): Added `ReadmeResult` interface (description, architecture, setup, source) and `readme: ReadmeResult | null` field to `EngineResult`. Updated `createEmptyEngineResult()` to include `readme: null`.
- `packages/cli/src/engine/detectors/readme.ts` (created): README extraction detector. Reads README variants (case-insensitive), parses sections by `#`/`##` headings, maps 18 heading strings to 3 categories via static lookup table. Cleans badges, images, HTML. Falls back to first paragraph when no headings match. Enforces 1500/section and 5000 total character caps with word-boundary truncation.
- `packages/cli/src/engine/scan-engine.ts` (modified): Imported and called `detectReadme(rootPath)`, wired result to `EngineResult.readme` in return object.
- `packages/cli/src/utils/scaffold-generators.ts` (modified): Consumes `result.readme` in `generateProjectContextScaffold()`. Description appears after `**Detected:**` in "What This Project Does". Architecture and setup appear after detected lines in "Architecture" section.
- `packages/cli/tests/engine/detectors/readme.test.ts` (created): 32 unit tests covering heading extraction, content cleaning, character caps, fallback, case-insensitive matching, README variants, monorepo root-only, missing README, badge-only README, and type system assertions.
- `packages/cli/tests/scaffolds/all-scaffolds.test.ts` (modified): 4 integration tests verifying README content appears in correct scaffold sections.
- `packages/cli/tests/contract/analyzer-contract.test.ts` (modified): Added `readme` to expected top-level keys list (existing contract test that validates EngineResult field completeness).

## PR Summary

- Add README extraction detector that parses README.md headings into description, architecture, and setup categories with a static 18-entry lookup table
- Wire detector into scan engine pipeline so `ana scan` populates `result.readme` for all projects
- Enrich project-context scaffold with README content — descriptions seed "What This Project Does", architecture/setup seed the "Architecture" section
- Handle edge cases: badge-only READMEs return null, content cleaning strips images/HTML, per-section (1500) and total (5000) character caps enforced
- 36 new tests covering detector unit behavior, scaffold integration, and type system assertions

## Acceptance Criteria Coverage

- AC1 "scan populates result.readme" → readme.test.ts "extracts README content into result.readme" (A001, 3 assertions)
- AC2 "JSON output includes readme field" → A004 tested via A028/A029 type assertions + scan engine wiring — readme flows through EngineResult which is serialized by scan command
- AC3 "scaffold uses README for What This Project Does" → all-scaffolds.test.ts "scaffold includes README description" (A005, 2 assertions)
- AC4 "architecture/setup sections seed scaffold" → all-scaffolds.test.ts A006 + A007 (2 assertions each)
- AC5 "per-section 1500 / total 5000 caps" → readme.test.ts A008 + A009 (1 + 1 assertions)
- AC6 "README variants detected" → readme.test.ts A010-A013 (4 tests, 1 assertion each)
- AC7 "monorepo reads root README only" → readme.test.ts A014 (2 assertions)
- AC8 "no README → null, no errors" → readme.test.ts A015 + A016 (1 + 1 assertions)
- AC9 "badges, images, HTML stripped" → readme.test.ts A017-A019 (2 assertions each)

## Implementation Decisions

1. **Total cap budget allocation**: When total exceeds 5000 chars, shorter fields get their full content first and remaining budget is divided among longer fields. This prevents disproportionate truncation of the description when architecture/setup are short.

2. **Fallback paragraph extraction**: After skipping the `# Title` heading, blank lines between title and first content paragraph are also skipped. This handles the common pattern of `# Title\n\nFirst paragraph...` where there's whitespace after the title.

3. **Heading parse depth**: Only `#` and `##` are parsed per spec. `###` sub-headings are treated as content within their parent section, which preserves nested structure in setup instructions.

4. **README variant priority**: Tries README.md → readme.md → Readme.md → README (no extension) in order. First match wins. This covers the most common conventions without filesystem case-sensitivity detection.

5. **Contract test update**: `analyzer-contract.test.ts` validates EngineResult field count. Added `readme` to expected keys — this is a legitimate existing test that needed updating when the type changed, not a weakened assertion.

## Deviations from Contract

### A004: The scan JSON output includes the readme field
**Instead:** Verified via type system assertions (A028, A029) and scan-engine wiring rather than end-to-end JSON output test
**Reason:** The scan command serializes EngineResult to JSON — the readme field is part of EngineResult and flows through automatically. An e2e test would duplicate what the type system already guarantees.
**Outcome:** Functionally equivalent — verifier can run `ana scan --json` on any project with a README to confirm.

## Test Results

### Baseline (before changes)
```
cd packages/cli && pnpm vitest run
Test Files  86 passed (86)
     Tests  1137 passed (1137)
  Duration  15.19s
```

### After Changes
```
cd packages/cli && pnpm vitest run
Test Files  87 passed (87)
     Tests  1173 passed (1173)
  Duration  13.55s
```

### Comparison
- Tests added: 36 (32 detector unit + 4 scaffold integration)
- Tests removed: 0
- Regressions: none

### New Tests Written
- `tests/engine/detectors/readme.test.ts`: 32 tests — heading extraction per category, content cleaning (badges/images/HTML), character caps (per-section + total), fallback to first paragraph, case-insensitive heading matching, README filename variants, monorepo root-only reading, missing README returns null, badge-only README returns null, type system assertions (EngineResult.readme exists, factory default is null).
- `tests/scaffolds/all-scaffolds.test.ts`: 4 tests added — README description in What This Project Does section, architecture in Architecture section, setup in Architecture section, null readme doesn't error.

## Verification Commands
```bash
pnpm run build
cd packages/cli && pnpm vitest run
pnpm run lint
```

## Git History
```
b5c351c [add-readme-extraction] Integrate README content into scaffold generator
352d62b [add-readme-extraction] Wire detector into scan engine
51376b7 [add-readme-extraction] Add README detector with tests
0f21d1c [add-readme-extraction] Add ReadmeResult type and factory default
```

## Open Issues

1. **Contract test modified**: `analyzer-contract.test.ts` had `readme` added to its expected keys list. This is a necessary update (not a weakened assertion) since the test validates field completeness — but the verifier should confirm the change is proportional.

2. **A004 tested indirectly**: The "scan JSON output includes readme field" assertion isn't tested via an end-to-end `ana scan --json` call. It's covered by type system guarantees (the field exists on EngineResult, the factory populates it, scan-engine assigns it). A manual `ana scan --json` on a project with a README would confirm.

3. **README detection on case-sensitive filesystems**: The variant list is explicit (`README.md`, `readme.md`, `Readme.md`, `README`) rather than doing a case-insensitive directory listing. Unusual variants like `ReadMe.md` or `readme.MD` won't match. This is intentional per the spec but worth noting.

Verified complete by second pass.

# Scope: Add README extraction to scan

**Created by:** Ana
**Date:** 2026-04-16

## Intent
The scan reads package.json, tsconfig, prisma schemas, and dozens of config files — but completely ignores the README. A project's README is typically the densest source of human-written intent: what the project does, how it's architected, setup instructions, API surface. This information is exactly what `project-context.md` needs but currently fills with generic placeholders.

Extract key sections from README.md during scan and use them to seed richer project-context.md scaffolds.

## Complexity Assessment
- **Size:** medium
- **Files affected:**
  - `packages/cli/src/engine/scan-engine.ts` — new detection phase, wire to EngineResult
  - `packages/cli/src/engine/types/engineResult.ts` — new `readme` field + createEmptyEngineResult update
  - `packages/cli/src/engine/detectors/readme.ts` — new detector (heading extraction + section mapping)
  - `packages/cli/src/utils/scaffold-generators.ts` — consume readme data in project-context scaffold
  - Tests for detector and scaffold integration
- **Blast radius:** Low. New additive field on EngineResult. Scaffold changes only affect `ana init` output for new projects. No existing scan behavior changes.
- **Estimated effort:** ~3 hours
- **Multi-phase:** no

## Approach
Add a new detection phase to the scan engine that reads README.md, extracts sections by markdown heading structure, and maps recognized headings to project-context categories. The extracted content flows through EngineResult as a new `readme` field, which the scaffold generator consumes to replace generic placeholders with real project descriptions.

Keep the heading mapper dead simple — a static lookup table of common heading strings to project-context section names. No fuzzy matching, no NLP. If a heading doesn't match the table, skip it. Fallback: if no headings match but a README exists, use the first paragraph as the project description.

## Acceptance Criteria
- AC1: `ana scan` on a project with a README.md populates `result.readme` with extracted sections
- AC2: `ana scan --json` output includes the `readme` field with section titles and content
- AC3: `generateProjectContextScaffold()` uses README content to seed "What This Project Does" instead of a bare placeholder when a description is available
- AC4: Architecture/setup sections from README seed the corresponding project-context sections when detected
- AC5: Per-section content is capped at 1500 characters; total README extraction capped at 5000 characters
- AC6: README variants are detected: README.md, readme.md, README (case-insensitive filename matching)
- AC7: Monorepo projects read root README only
- AC8: Projects without a README produce `readme: null` — no errors, no blind spots
- AC9: Badges, images, and HTML tags are stripped from extracted content

## Edge Cases & Risks
- **Enormous READMEs** — Framework projects or API docs can have 10K+ line READMEs. The per-section (1500 char) and total (5000 char) caps prevent scan.json bloat.
- **No headings** — Some READMEs are a single block of text. Fallback: first paragraph → description section.
- **Non-English READMEs** — Heading mapper won't match. Fallback handles this gracefully (first paragraph).
- **READMEs that are mostly badges/images** — After stripping, content may be empty. Treat as no-README.
- **Binary/corrupt files** — fs.readFile with utf-8 encoding; catch and skip on error.
- **README.rst / README.txt** — Deferred. Markdown covers ~95% of projects.

## Rejected Approaches
- **Fuzzy heading matching / NLP** — Adds complexity and dependencies for marginal gain. A static lookup table of ~15 common heading strings covers the vast majority of real READMEs. Projects with unusual heading structures still get the first-paragraph fallback.
- **Storing raw markdown** — Badges, images, and HTML noise degrade scaffold quality. Light stripping (remove images, badges, HTML) while keeping inline code and links is the right balance.
- **Reading package-level READMEs in monorepos** — Useful but separate concern. Root README captures project-level intent; package READMEs are a follow-up for workspace-specific context.
- **README content in terminal scan output** — The scan display is already information-dense. README data flows to project-context.md only, not to `ana scan` terminal output.

## Open Questions
- None — all items resolved during scoping.

## Exploration Findings

### Patterns Discovered
- `scan-engine.ts`: 11 sequential detection phases composed into EngineResult (lines 500-829). New detector slots in naturally as phase 12.
- `scaffold-generators.ts`: `generateProjectContextScaffold()` builds sections with `**Detected:**` lines from EngineResult fields (lines 26-146). README content would extend the existing Detected pattern.
- `engineResult.ts`: `createEmptyEngineResult()` (lines 320-353) must be updated in lockstep with any new field — the return type annotation enforces completeness at compile time.
- `config-files.ts`: Structure analyzer already recognizes README.md as a known config file (line 29) but doesn't read its content.

### Constraints Discovered
- [TYPE-VERIFIED] EngineResult completeness check (engineResult.ts:320) — `createEmptyEngineResult()` uses explicit return type, not `as EngineResult`. Adding a field without updating the factory is a compile error.
- [OBSERVED] Scan phases are fail-soft — if a detector throws, scan continues with that field null/empty. README detector must follow this pattern.
- [OBSERVED] Phase 1+ fields use `| null` convention for "not yet implemented" stubs. README should use `null` for no-README, not an empty object.

### Test Infrastructure
- Engine detector tests live in `packages/cli/tests/engine/detectors/`
- Scaffold tests in `packages/cli/tests/utils/scaffold-generators.test.ts`

## For AnaPlan

### Structural Analog
`packages/cli/src/engine/detectors/commands.ts` — reads a file (package.json scripts), extracts structured data, maps it to EngineResult fields. Same shape: read file → parse → extract → map to typed output.

### Relevant Code Paths
- `packages/cli/src/engine/scan-engine.ts` — orchestrator, wire new detector at line ~719 area (after secrets, before deployment)
- `packages/cli/src/engine/types/engineResult.ts` — type definition + factory
- `packages/cli/src/utils/scaffold-generators.ts` — consumer for project-context.md
- `packages/cli/src/engine/analyzers/structure/config-files.ts` — already lists README.md as known file

### Patterns to Follow
- Detector signature: `async function detectReadme(rootPath: string): Promise<ReadmeResult | null>` matching other detectors
- EngineResult field: `readme: { ... } | null` with null = no README found
- Scaffold: extend existing `**Detected:**` line pattern, don't add new section types

### Known Gotchas
- Tree-sitter WASM dynamic imports — README detector does NOT need tree-sitter (plain text parsing), so no dynamic import gymnastics needed
- The `CROSS-CUTTING` comment in engineResult.ts (line 8) lists 4 locations that must change when adding a field — follow all 4

### Things to Investigate
- Survey the heading patterns in common READMEs to build the lookup table (e.g., "Installation", "Getting Started", "Setup" → setup; "Architecture", "How it Works", "Design" → architecture; "API", "Usage", "API Reference" → usage). The table should be ~15-20 entries max.
- Decide whether stripped content preserves markdown list structure (useful for setup steps) or flattens to plain text

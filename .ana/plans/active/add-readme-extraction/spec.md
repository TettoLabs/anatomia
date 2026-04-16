# Spec: Add README extraction to scan

**Created by:** AnaPlan
**Date:** 2026-04-16
**Scope:** .ana/plans/active/add-readme-extraction/scope.md

## Approach

Add a new detection phase to the scan engine that reads README.md, extracts sections by markdown heading structure, and maps recognized headings to project-context categories. The extracted content flows through `EngineResult.readme` to the scaffold generator, which uses it to enrich the "What This Project Does" section with real project descriptions instead of generic placeholders.

**Key design decisions:**

1. **Static heading lookup table** — 18 entries mapping common heading strings to three categories: `description`, `architecture`, `setup`. Case-insensitive matching. Unrecognized headings are skipped — no fuzzy matching, no NLP dependencies.

2. **Content cleaning** — Strip badges (`![...](...)` patterns), images, and HTML tags. Preserve markdown lists, inline code, and links — setup instructions need their structure.

3. **Fallback** — If no headings match but a README exists, extract the first paragraph as the description. This handles READMEs with unusual structures and non-English content.

4. **Scaffold integration** — README content appears inline in the existing sections, not as separate "From README:" blocks. The scaffold reads as a cohesive document.

## Output Mockups

**scan.json excerpt (when README found with matching headings):**
```json
{
  "readme": {
    "description": "Anatomia scans your project, detects your stack, conventions, and patterns, then generates AI-ready context files that make every AI coding tool smarter about your codebase.",
    "architecture": null,
    "setup": "1. Install globally: `npm install -g anatomia`\n2. Run in your project: `ana init`\n3. Check the generated files in `.ana/` and `.claude/`",
    "source": "heading"
  }
}
```

**scan.json excerpt (fallback — no matching headings):**
```json
{
  "readme": {
    "description": "A fast, minimal HTTP framework for Node.js built on modern standards.",
    "architecture": null,
    "setup": null,
    "source": "fallback"
  }
}
```

**scan.json excerpt (no README):**
```json
{
  "readme": null
}
```

**project-context.md "What This Project Does" section (with README description):**
```markdown
## What This Project Does

**Detected:** TypeScript CLI tool. 120 source files, 87 test files.

Anatomia scans your project, detects your stack, conventions, and patterns, then generates AI-ready context files that make every AI coding tool smarter about your codebase.

*What does this product do? Who uses it? What problem does it solve?*
```

**project-context.md "Architecture" section (with README architecture):**
```markdown
## Architecture

**Detected:** pnpm · 2 packages (anatomia-cli, demo-site)
**Detected:** 3 directories mapped: .github/, packages/, tests/

The CLI has three layers: Commands (user-facing surface), Engine (scan intelligence), and Utils (shared helpers). The engine is pure — no CLI dependencies.

*How is the codebase organized and why? What are the layer boundaries?*
```

## File Changes

### `packages/cli/src/engine/detectors/readme.ts` (create)

**What changes:** New detector module implementing README extraction logic.
**Pattern to follow:** `packages/cli/src/engine/detectors/commands.ts` — same shape: read file → parse → extract → return typed result.
**Why:** Encapsulates README parsing in a dedicated detector, matching the existing detector architecture.

### `packages/cli/src/engine/types/engineResult.ts` (modify)

**What changes:** Add `ReadmeResult` type definition and `readme: ReadmeResult | null` field to `EngineResult`. Update `createEmptyEngineResult()` to include `readme: null`.
**Pattern to follow:** Existing nullable fields like `patterns: PatternAnalysis | null`. The CROSS-CUTTING comment (line 8) documents the 4-location update requirement.
**Why:** Type system enforces completeness — adding the field without updating the factory is a compile error.

### `packages/cli/src/engine/scan-engine.ts` (modify)

**What changes:** Import and call `detectReadme()`, wire result to `EngineResult.readme` in the return object.
**Pattern to follow:** Line 713 pattern — `const commands = await detectCommands(rootPath, packageManager);` then include in return object.
**Why:** Integrates the detector into the scan pipeline.

### `packages/cli/src/utils/scaffold-generators.ts` (modify)

**What changes:** Consume `result.readme` in `generateProjectContextScaffold()`. Insert description content after the `**Detected:**` line in "What This Project Does". Insert architecture content after detected lines in "Architecture" section.
**Pattern to follow:** Lines 64-68 — existing pattern of building content conditionally based on EngineResult fields.
**Why:** README content enriches scaffolds without replacing scan-detected information.

### `packages/cli/tests/engine/detectors/readme.test.ts` (create)

**What changes:** Unit tests for the README detector covering heading extraction, content cleaning, caps, fallback, and error handling.
**Pattern to follow:** `packages/cli/tests/engine/detectors/projectKind.test.ts` — describe blocks grouped by behavior, `@ana` tags for contract assertions.
**Why:** Validates detector behavior in isolation.

### `packages/cli/tests/scaffolds/all-scaffolds.test.ts` (modify)

**What changes:** Add tests verifying README content appears in scaffold output.
**Pattern to follow:** Lines 30-46 — existing pattern of creating a `richResult` with specific fields and asserting output contains expected content.
**Why:** Validates end-to-end integration from EngineResult to scaffold output.

## Acceptance Criteria

Copied from scope:

- [ ] AC1: `ana scan` on a project with a README.md populates `result.readme` with extracted sections
- [ ] AC2: `ana scan --json` output includes the `readme` field with section titles and content
- [ ] AC3: `generateProjectContextScaffold()` uses README content to seed "What This Project Does" instead of a bare placeholder when a description is available
- [ ] AC4: Architecture/setup sections from README seed the corresponding project-context sections when detected
- [ ] AC5: Per-section content is capped at 1500 characters; total README extraction capped at 5000 characters
- [ ] AC6: README variants are detected: README.md, readme.md, README (case-insensitive filename matching)
- [ ] AC7: Monorepo projects read root README only
- [ ] AC8: Projects without a README produce `readme: null` — no errors, no blind spots
- [ ] AC9: Badges, images, and HTML tags are stripped from extracted content

Implementation-specific:

- [ ] All tests pass with `pnpm vitest run`
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] Lint passes (`pnpm run lint`)

## Testing Strategy

- **Unit tests:** Test the detector in isolation with fixture strings — no filesystem access in most tests. Cover: heading extraction for each category, content cleaning (badges, images, HTML), character caps, fallback behavior, empty/missing README, malformed markdown.

- **Integration tests:** Verify `generateProjectContextScaffold()` output contains README content when `result.readme` is populated. Use `createEmptyEngineResult()` with manually set `readme` field.

- **Edge cases:**
  - README with only badges (post-strip content is empty → treat as no README)
  - README with no headings (fallback to first paragraph)
  - README over 5000 chars total (verify truncation)
  - Single section over 1500 chars (verify per-section cap)
  - README.md vs readme.md vs Readme.md (case-insensitive detection)
  - README with nested headings (`###`) — only `#` and `##` are parsed

## Dependencies

None. The detector uses only Node.js built-ins (`node:fs/promises`, `node:path`). No new npm packages.

## Constraints

- **No CLI dependencies in engine:** The detector lives in `src/engine/detectors/` and must not import chalk, ora, or commander. Follow the engine purity rule.
- **Fail-soft:** If README read fails (permissions, encoding issues), return `null` — don't throw. Match existing detector pattern (lines 75-77 of commands.ts).
- **Character caps are hard limits:** 1500 per section, 5000 total. Truncate at word boundary when possible.

## Gotchas

- **The `createEmptyEngineResult()` completeness check:** Adding `readme` to `EngineResult` without updating the factory (line 320-352) causes a compile error. This is intentional — the explicit return type enforces completeness.

- **CROSS-CUTTING comment in engineResult.ts:** Line 8 documents 4 locations that must change when adding a field. Follow all 4: (1) type definition, (2) factory default, (3) scan-engine population, (4) scaffold consumer.

- **Heading matching must be case-insensitive:** "INSTALLATION" and "installation" and "Installation" should all match. Use `.toLowerCase()` before lookup.

- **Empty content after stripping:** A README that's 100% badges produces empty content after cleaning. Treat this as "no README" — return `null`, not an object with empty strings.

- **First paragraph extraction for fallback:** "First paragraph" means content before the first blank line (or first heading). Don't include the title line if it's a `#` heading.

## Build Brief

### Rules That Apply

- All imports use `.js` extensions: `import { detectReadme } from './readme.js'`
- Use `import type` for type-only imports, separate from value imports
- Use `| null` for "checked and found empty", not `?:` optional
- Early returns over nested conditionals
- Engine files have zero CLI dependencies — no chalk, no ora
- Explicit return types on exported functions
- Empty catch blocks in engine are intentional — graceful degradation

### Pattern Extracts

**Detector signature pattern (from commands.ts lines 26-40):**
```typescript
export async function detectCommands(
  cwd: string,
  packageManager: string | null
): Promise<DetectedCommands> {
  const result: DetectedCommands = {
    build: null,
    test: null,
    lint: null,
    dev: null,
    all: {},
  };

  if (packageManager === null) {
    return result;
  }
  // ...
}
```

**EngineResult field pattern (from engineResult.ts lines 171-176):**
```typescript
  // Deep tier only (null when surface). Item 6 unification...
  patterns: PatternAnalysis | null;
  // Convention analysis uses the analyzer's type directly...
  conventions: ConventionAnalysis | null;
```

**Factory completeness pattern (from engineResult.ts lines 338-339):**
```typescript
    patterns: null,
    conventions: null,
```

**Scaffold conditional content pattern (from scaffold-generators.ts lines 64-68):**
```typescript
  if (descParts.length > 0) {
    s += `**Detected:** ${descParts.join(', ')}. ${fileCountPart}.\n`;
  } else {
    s += `**Detected:** ${fileCountPart}.\n`;
  }
```

**Test structure pattern (from projectKind.test.ts lines 19-31):**
```typescript
describe('detectProjectKind', () => {
  // @ana A005
  describe('classifies project with bin field as cli', () => {
    it('returns cli when hasBin is true', () => {
      const result = detectProjectKind(makeInput({ hasBin: true }));
      expect(result.kind).toBe('cli');
    });
  });
});
```

### Checkpoint Commands

- After creating readme.ts detector: `cd packages/cli && pnpm vitest run tests/engine/detectors/readme.test.ts` — Expected: new tests pass
- After wiring to scan-engine: `cd packages/cli && pnpm vitest run` — Expected: all 1137+ tests pass
- After scaffold integration: `cd packages/cli && pnpm vitest run tests/scaffolds/` — Expected: scaffold tests pass
- Lint: `pnpm run lint`
- Type check: `pnpm run build` (runs tsc)

### Build Baseline

- Current tests: 1137 passed (86 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1155 tests (estimate: +12-18 new tests for detector + scaffold integration)
- Regression focus: `tests/scaffolds/all-scaffolds.test.ts`, `tests/commands/scan.test.ts`

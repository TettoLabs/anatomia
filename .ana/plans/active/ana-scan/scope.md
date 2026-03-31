# Scope: ana scan — Zero-Install Project Scanner

**Created by:** Ana
**Date:** 2026-03-31

## Intent

Build `ana scan` — a new CLI command that analyzes any project directory and produces a polished terminal report showing stack identity, file counts, and structure map. This is the top-of-funnel for Anatomia: the first command a developer runs before committing to anything.

The scan must work via `npx anatomia scan` with zero install. It creates no files, modifies nothing, and requires no .ana/ directory. Pure read-only analysis.

The terminal output is a first-class design surface. This report will appear as a screenshot on anatomia.dev's landing page. It's not just a CLI feature — it's marketing material. The output IS the product demo.

## Complexity Assessment

- **Size:** Medium
- **Files affected:**
  - `packages/cli/src/commands/scan.ts` (new)
  - `packages/cli/src/index.ts` (register command)
  - `packages/cli/src/utils/` (new formatting utilities)
  - `packages/cli/tests/` (new test files)
- **Blast radius:** Low — new command, no changes to existing analyzer or commands
- **Estimated effort:** 2-3 days implementation + design iteration on terminal output
- **Multi-phase:** No — single deliverable

## Approach

New subcommand following the existing CLI patterns (structural analog: `work.ts` for subcommand structure, `analyze.ts` for analyzer integration). The scan command orchestrates the existing analyzer pipeline, transforms results into a designed terminal report, and handles graceful degradation when detection fails.

**Three output sections with clear visual hierarchy:**

1. **Header** — Project name + scan timestamp
2. **Stack Detection** — Five categories: Language, Framework, Database, Auth, Testing. Each on one line with detected value. Skip categories with no detection (no "Unknown" labels).
3. **File Breakdown** — Source files, test files, config files, total. Clean numbers.
4. **Structure Map** — Top-level directories with purposes. Capped at 10-12 entries; summarize overflow.
5. **Footer CTA** — "Run `ana init` to generate full context for your AI."

**Terminal UI approach:** Box-drawing characters, ANSI colors, column alignment, visual grouping with whitespace. Reference aesthetic: htop, lazygit, bottom — terminal tools where the UI IS the feature. Dark-background optimized for screenshot use.

**`--json` flag:** Machine-readable output for CI integration, badges, future features. Same data, different format.

## Acceptance Criteria

- AC1: `ana scan` runs on current directory, `ana scan <path>` runs on specified path
- AC2: Works on projects without .ana/ directory (no init required)
- AC3: `--json` flag produces valid JSON with all scan data
- AC4: `npx anatomia scan` works with zero prior install
- AC5: Read-only — creates no files, modifies nothing
- AC6: Detects and displays 5 stack categories: Language, Framework, Database, Auth, Testing
- AC7: Categories with no detection are omitted (not shown as "Unknown")
- AC8: File counts shown: source files, test files, config files, total
- AC9: Structure map shows max 10-12 directories with purposes
- AC10: Structure map overflow summarized (e.g., "+8 more directories")
- AC11: Footer displays: "Run `ana init` to generate full context for your AI."
- AC12: Terminal output uses box-drawing characters and ANSI colors
- AC13: Output renders correctly at 80-column terminal width
- AC14: Output looks intentional when data is missing (empty project, no framework, etc.)
- AC15: Graceful handling: empty directories, non-code projects, monorepos, no tests, no framework

## Edge Cases & Risks

**Edge cases to handle:**
- Empty directory → Show project name, zero counts, minimal output
- Non-code project (only markdown, images) → Show "No code detected" gracefully
- Monorepo with 50+ top-level dirs → Cap structure map, summarize rest
- Project with no framework detected → Omit Framework line entirely
- Project with no tests → Omit Testing line, show 0 test files in counts
- Permission denied on files → Skip unreadable files, continue scan
- Very large project (10k+ files) → File counting should remain fast (no tree-sitter for counts)

**Technical risks:**
- **WASM path resolution via npx:** The analyzer's `resolveWasmPath()` uses `__dirname` relative paths assuming monorepo structure. When npx extracts to a temp directory, these paths may break. Needs investigation — may require path resolution changes in analyzer or alternative detection approach for npx scenarios.

**Design risks:**
- Terminal output design requires iteration. First pass may not nail the aesthetic. Budget time for refinement.

## Rejected Approaches

**Lightweight detection without tree-sitter:** Considered skipping the full analyzer pipeline for speed. Rejected because database, auth, and testing detection require dependency parsing and pattern inference — the analyzer already does this well. Reuse beats rebuild.

**Adding styling/deployment detection:** User explicitly deferred to Tier 2. Keep Tier 1 focused on 5 categories that map to what developers put in READMEs.

**Showing "Unknown" or "not detected" labels:** Rejected. Graceful degradation means omitting what we can't detect, not cluttering output with negative information.

**Reusing `analyze` command output:** The existing `analyze` command is internal plumbing with verbose, undesigned output. `scan` is user-facing with designed output. Different purposes warrant different commands.

## Open Questions

- How should the WASM path resolution be handled for npx scenarios? Options: (a) modify analyzer's `resolveWasmPath()` to check more candidate paths, (b) bundle WASM files differently, (c) graceful degradation if tree-sitter unavailable. Planner should investigate and decide.

## Exploration Findings

### Patterns Discovered

- `packages/cli/src/commands/work.ts`: Subcommand pattern with Commander.js, `--json` flag handling, chalk formatting. 838 lines, comprehensive example.
- `packages/cli/src/commands/analyze.ts`: Analyzer integration pattern — dynamic import, spinner with ora, formatHumanReadable() function. 155 lines.
- `packages/cli/src/index.ts`: Command registration via `program.addCommand()`.
- `packages/analyzer/src/index.ts`: Main `analyze()` function orchestrates 7-phase pipeline. Returns `AnalysisResult` with projectType, framework, structure, patterns.

### Constraints Discovered

- [TYPE-VERIFIED] `StructureAnalysis.directories` (types/structure.ts:117) — `Record<string, string>` mapping path to purpose
- [TYPE-VERIFIED] `DIRECTORY_PURPOSES` (analyzers/structure.ts:42-109) — 40+ hardcoded directory→purpose mappings
- [TYPE-VERIFIED] `PatternAnalysis` (types/patterns.ts) — Contains database, auth, testing fields with confidence scores
- [OBSERVED] WASM path resolution (parsers/treeSitter.ts:56-74) — Uses `__dirname` relative paths, checks 2 candidate locations
- [OBSERVED] Tree-sitter grammars in `optionalDependencies` — Will install via npx but path resolution may fail

### Test Infrastructure

- `packages/cli/tests/`: Vitest test suite with contract, e2e, performance subdirectories
- Test pattern: `*.test.ts` files alongside or in `tests/` subdirectory
- E2E tests use temp directories and spawn CLI process

## For AnaPlan

### Structural Analog

`work.ts` — Subcommand with `--json` flag, Commander.js pattern, execSync for external operations, chalk formatting, multiple output modes (human-readable vs JSON). The scan command follows this same shape: parse args, gather data, format output based on flags.

Secondary reference: `analyze.ts` — Shows how to integrate with the analyzer package via dynamic import and handle the analysis pipeline.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts` — Subcommand structure, JSON flag, chalk formatting (lines 494-566 for human output)
- `packages/cli/src/commands/analyze.ts` — Analyzer integration, `formatHumanReadable()` pattern (lines 106-154)
- `packages/analyzer/src/index.ts` — `analyze()` function, AnalyzeOptions interface (lines 143-276)
- `packages/analyzer/src/analyzers/patterns.ts` — `detectFromDependencies()` returns database/auth/testing (lines 32-81)
- `packages/analyzer/src/analyzers/structure.ts` — `analyzeStructure()`, `DIRECTORY_PURPOSES` mapping (lines 42-121, 365-421)
- `packages/analyzer/src/parsers/treeSitter.ts` — `resolveWasmPath()` for WASM risk investigation (lines 56-74)

### Patterns to Follow

- Command registration pattern in `index.ts`
- Dynamic import of analyzer (`const { analyze } = await import('anatomia-analyzer')`)
- Spinner pattern with ora (suppress for `--json`)
- `formatHumanReadable()` function for terminal output
- JSON output via `JSON.stringify(result, null, 2)`

### Known Gotchas

- Must use `program.parseAsync()` not `parse()` for async action handlers (see index.ts comment)
- WASM initialization: `parserManager.initialize()` must be called before any parsing
- Tree-sitter grammars are optional — code must handle graceful degradation if unavailable
- Pattern detection requires `skipPatterns: false` in analyze options
- `chalk` import is ESM — no require()

### Things to Investigate

- WASM path resolution for npx: Test what `__dirname` resolves to when run via `npx anatomia scan`. Document findings and propose solution.
- File counting implementation: Decide between glob-based counting vs directory walking. Consider performance for large projects (10k+ files).
- Box-drawing character set: Research which characters render consistently across terminals (iTerm, Terminal.app, Windows Terminal, VS Code integrated terminal).
- Color palette: Determine which ANSI colors work well on both dark and light terminal backgrounds, with dark-mode priority.

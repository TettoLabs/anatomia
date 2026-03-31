# Spec: ana scan — Zero-Install Project Scanner

**Created by:** AnaPlan
**Date:** 2026-03-31
**Scope:** .ana/plans/active/ana-scan/scope.md

## Approach

New `ana scan` command following the structural pattern from `work.ts` (Commander.js with `--json` flag, chalk formatting) and the analyzer integration pattern from `analyze.ts` (dynamic import, ora spinner, `formatHumanReadable()` function).

The command wraps the existing `analyze()` pipeline, transforms results into a designed terminal report, and implements graceful degradation when tree-sitter fails (npx temp directory scenario). The terminal output is a first-class design surface — this report appears as a screenshot on anatomia.dev.

**Key design decisions:**

1. **Graceful degradation via analyzer fix** — Modify `analyze()` to catch tree-sitter errors specifically and preserve partial results (projectType, framework, structure). Database/Auth/Testing categories are omitted when pattern inference unavailable.

2. **File counting without tree-sitter** — New utility using glob patterns for speed. Returns source/test/config/total counts. Works on 10k+ file projects because it's pure filesystem traversal.

3. **Structure map from existing data** — Uses `structure.directories` (already `Record<string, string>` with purposes). Filter to top-level, cap at 10, summarize overflow.

4. **Stack categories from analyzer** — Language=`projectType`, Framework=`framework`, Database/Auth/Testing=`patterns.*`. Categories with no detection are omitted entirely (no "Unknown" labels).

## Output Mockups

### Human-Readable Output (default)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana scan                                                           │
│  myproject                                          2026-03-31 14:22│
└─────────────────────────────────────────────────────────────────────┘

  Stack
  ─────
  Language     TypeScript
  Framework    Next.js
  Database     Prisma
  Auth         NextAuth
  Testing      Vitest

  Files
  ─────
  Source       847
  Tests        156
  Config       23
  Total        1,026

  Structure
  ─────────
  src/              Source code
  app/              Application code
  components/       UI components
  lib/              Library code
  prisma/           Database schema
  tests/            Tests
  public/           Public static files
  scripts/          Build/utility scripts
  +4 more directories

Run `ana init` to generate full context for your AI.
```

### Human-Readable Output (minimal detection)

When only Language detected (e.g., npx scenario with tree-sitter failure):

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana scan                                                           │
│  myproject                                          2026-03-31 14:22│
└─────────────────────────────────────────────────────────────────────┘

  Stack
  ─────
  Language     Python

  Files
  ─────
  Source       234
  Tests        0
  Config       8
  Total        242

  Structure
  ─────────
  src/              Source code
  docs/             Documentation

Run `ana init` to generate full context for your AI.
```

### Human-Readable Output (empty project)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana scan                                                           │
│  empty-dir                                          2026-03-31 14:22│
└─────────────────────────────────────────────────────────────────────┘

  Stack
  ─────
  No code detected

  Files
  ─────
  Source       0
  Tests        0
  Config       0
  Total        0

  Structure
  ─────────
  (empty)

Run `ana init` to generate full context for your AI.
```

### JSON Output (`--json`)

```json
{
  "project": "myproject",
  "scannedAt": "2026-03-31T14:22:15.432Z",
  "stack": {
    "language": "TypeScript",
    "framework": "Next.js",
    "database": "Prisma",
    "auth": "NextAuth",
    "testing": "Vitest"
  },
  "files": {
    "source": 847,
    "test": 156,
    "config": 23,
    "total": 1026
  },
  "structure": [
    { "path": "src/", "purpose": "Source code" },
    { "path": "app/", "purpose": "Application code" },
    { "path": "components/", "purpose": "UI components" },
    { "path": "lib/", "purpose": "Library code" },
    { "path": "prisma/", "purpose": "Database schema" },
    { "path": "tests/", "purpose": "Tests" },
    { "path": "public/", "purpose": "Public static files" },
    { "path": "scripts/", "purpose": "Build/utility scripts" }
  ],
  "structureOverflow": 4
}
```

### Box-Drawing Character Set

Use only these characters (compatible across iTerm, Terminal.app, VS Code terminal, Windows Terminal):

- `─` horizontal line (U+2500)
- `│` vertical line (U+2502)
- `┌` top-left corner (U+250C)
- `┐` top-right corner (U+2510)
- `└` bottom-left corner (U+2514)
- `┘` bottom-right corner (U+2518)

Colors: dark-background optimized, chalk standard palette, builder's judgment on specifics.

## File Changes

### `packages/cli/src/commands/scan.ts` (create)

**What changes:** New command file implementing `ana scan` and `ana scan <path>` with `--json` flag. Contains `scanCommand` export, `formatHumanReadable()` function, `formatJson()` function, and file counting logic.

**Pattern to follow:** `work.ts` for Commander.js structure and `--json` handling; `analyze.ts` for analyzer integration with dynamic import and ora spinner.

**Why:** This is the core deliverable — the scan command.

### `packages/cli/src/index.ts` (modify)

**What changes:** Import and register `scanCommand` via `program.addCommand()`.

**Pattern to follow:** Existing command registrations (lines 16-24, 34-42).

**Why:** Command won't be accessible without registration.

### `packages/cli/src/utils/fileCounts.ts` (create)

**What changes:** New utility with `countFiles()` function. Uses glob to count source/test/config files based on patterns from scope. Returns `{ source: number, test: number, config: number, total: number }`.

**Pattern to follow:** Existing utils in `packages/cli/src/utils/` — pure functions, no side effects.

**Why:** File counting is reusable and keeps scan.ts focused on orchestration.

### `packages/analyzer/src/index.ts` (modify)

**What changes:** Wrap tree-sitter phases (parseProjectFiles, inferPatterns, detectConventions) in individual try-catch blocks to preserve partial results. Currently, ANY error in the outer try-catch returns `createEmptyAnalysisResult()`, losing already-detected projectType/framework.

**Pattern to follow:** Existing graceful degradation patterns — return partial results rather than empty.

**Why:** Without this fix, npx scenario loses all detection when tree-sitter fails to initialize.

<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
```yaml
file_changes:
  - path: "packages/cli/src/commands/scan.ts"
    action: create
  - path: "packages/cli/src/index.ts"
    action: modify
    reason: "Register scan command"
  - path: "packages/cli/src/utils/fileCounts.ts"
    action: create
  - path: "packages/analyzer/src/index.ts"
    action: modify
    reason: "Graceful degradation for tree-sitter failures"
```
<!-- END MACHINE-READABLE -->

## Acceptance Criteria

- [ ] AC1: `ana scan` runs on current directory, `ana scan <path>` runs on specified path
- [ ] AC2: Works on projects without .ana/ directory (no init required)
- [ ] AC3: `--json` flag produces valid JSON with all scan data
- [ ] AC4: `npx anatomia-cli scan` works with zero prior install (note: `npx anatomia scan` is future goal pending npm name acquisition)
- [ ] AC5: Read-only — creates no files, modifies nothing
- [ ] AC6: Detects and displays 5 stack categories: Language, Framework, Database, Auth, Testing
- [ ] AC7: Categories with no detection are omitted (not shown as "Unknown")
- [ ] AC8: File counts shown: source files, test files, config files, total
- [ ] AC9: Structure map shows max 10 directories with purposes
- [ ] AC10: Structure map overflow summarized (e.g., "+4 more directories")
- [ ] AC11: Footer displays: "Run `ana init` to generate full context for your AI."
- [ ] AC12: Terminal output uses box-drawing characters and ANSI colors
- [ ] AC13: Output renders correctly at 80-column terminal width
- [ ] AC14: Output looks intentional when data is missing (empty project, no framework, etc.)
- [ ] AC15: Graceful handling: empty directories, non-code projects, monorepos, no tests, no framework

<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
```yaml
acceptance_criteria:
  - id: AC1
    description: "ana scan runs on cwd, ana scan <path> runs on specified path"
    verification: mechanical
    test_hint: "invoke with no args, invoke with path arg"
  - id: AC2
    description: "Works without .ana/ directory"
    verification: mechanical
    test_hint: "run on fresh temp dir without .ana/"
  - id: AC3
    description: "--json produces valid JSON"
    verification: mechanical
    test_hint: "JSON.parse succeeds, has expected keys"
  - id: AC4
    description: "npx anatomia-cli scan works"
    verification: mechanical
    test_hint: "integration test with npx"
  - id: AC5
    description: "Read-only, creates no files"
    verification: mechanical
    test_hint: "snapshot directory before/after, compare"
  - id: AC6
    description: "Displays 5 stack categories"
    verification: mechanical
    test_hint: "output contains Language, Framework, Database, Auth, Testing when detected"
  - id: AC7
    description: "Omits undetected categories"
    verification: mechanical
    test_hint: "project without auth → no Auth line"
  - id: AC8
    description: "File counts: source, test, config, total"
    verification: mechanical
    test_hint: "output contains all 4 count lines"
  - id: AC9
    description: "Structure map max 10 directories"
    verification: mechanical
    test_hint: "project with 15 dirs shows 10"
  - id: AC10
    description: "Overflow summary shown"
    verification: mechanical
    test_hint: "'+N more directories' appears when >10"
  - id: AC11
    description: "Footer CTA present"
    verification: mechanical
    test_hint: "output contains 'ana init'"
  - id: AC12
    description: "Box-drawing and ANSI colors"
    verification: judgment
  - id: AC13
    description: "80-column width compatible"
    verification: judgment
  - id: AC14
    description: "Intentional appearance with missing data"
    verification: judgment
  - id: AC15
    description: "Graceful edge case handling"
    verification: mechanical
    test_hint: "empty dir, non-code project scenarios"
```
<!-- END MACHINE-READABLE -->

## Testing Strategy

- **Unit tests:** Test `countFiles()` utility in isolation with mock directory structures. Test stack extraction logic (mapping analyzer results to stack categories). Test overflow logic (10-directory cap, "+N more" formatting).

- **Integration tests:** Run scan command on temp directories with known structures. Verify JSON output structure. Verify human output contains expected sections.

- **Edge cases:**
  - Empty directory → "No code detected", zero counts, "(empty)" structure
  - Non-code project (only .md files) → appropriate file counts, no stack
  - Project with 50+ top-level dirs → 10 shown, overflow message
  - No .ana/ directory → still works (AC2)
  - Permission denied on some files → continues scanning (skip unreadable)
  - Path argument validation → helpful error for nonexistent path

- **Test patterns:** Follow `work.test.ts` — temp directories with `fs.mkdtemp`, cleanup in `afterEach`, helper functions for creating test project structures.

## Dependencies

- Analyzer package must be built (`pnpm --filter anatomia-analyzer build`)
- Tree-sitter grammars are optional (graceful degradation)

## Constraints

- **80-column terminal width** — all output must render correctly without wrapping
- **No file creation** — scan is read-only, never writes to disk
- **Performance** — file counting must stay fast on large projects (10k+ files). Use glob, not tree-sitter.
- **npx compatibility** — must work when extracted to npm temp directory

## Gotchas

1. **Dynamic import required** — Analyzer must be lazy-loaded. WASM bindings crash if imported at module level. Use `const { analyze } = await import('anatomia-analyzer')`.

2. **Spinner suppression for JSON** — When `--json` flag is set, don't create ora spinner. JSON output must be machine-readable without spinner artifacts.

3. **parseAsync not parse** — Commander requires `program.parseAsync()` for async action handlers. See comment in `index.ts` line 45.

4. **chalk is ESM** — No `require('chalk')`. Use `import chalk from 'chalk'`.

5. **Directory purposes may be "Unknown"** — The `DIRECTORY_PURPOSES` map in structure.ts doesn't cover all directory names. Filter out "Unknown" entries or show them without purpose text.

6. **Pattern detection requires tree-sitter** — `analysis.patterns` is only populated if tree-sitter succeeds. When it's undefined, Database/Auth/Testing categories must be omitted, not shown as null.

7. **projectType capitalization** — Analyzer returns lowercase (`'node'`, `'python'`). Display should use proper case (`'Node.js'`, `'Python'`). Create a display name mapping.

8. **Framework display names** — Analyzer returns lowercase (`'nextjs'`, `'fastapi'`). Map to proper display names (`'Next.js'`, `'FastAPI'`).

9. **File count patterns are specific** — Use exact patterns from scope:
   - Source: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.rb`, `.php`, `.java`, `.kt`, `.swift`, `.c`, `.cpp`, `.h`, `.cs`
   - Test: `*.test.*`, `*.spec.*`, `test_*`, `*_test.*`, or inside `test/`, `tests/`, `__tests__/`, `spec/` directories
   - Config: Known filenames list (package.json, tsconfig.json, pyproject.toml, etc.)

10. **structure.directories is path→purpose** — It's `Record<string, string>` not an array. Keys are relative paths, values are purpose descriptions.

## Build Brief

### Rules That Apply

- ESM imports with `.js` extension: `import { foo } from './bar.js'`
- Graceful degradation: try-catch → partial results → continue. Never throw up the stack.
- Return null or empty on failure, not exceptions.
- File naming: camelCase matching primary export (`scan.ts`, `fileCounts.ts`)
- One export per command file (`scanCommand`)
- Prettier: 2 spaces, single quotes, trailing commas (es5), printWidth 100
- Dynamic import for analyzer to avoid WASM crash at module level

### Pattern Extracts

**Command structure from work.ts (lines 820-828):**
```typescript
export const workCommand = new Command('work')
  .description('Manage pipeline work items');

const statusCommand = new Command('status')
  .description('Show pipeline state for all active work items')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action((options: { json?: boolean }) => {
    getWorkStatus(options);
  });
```

**Analyzer integration from analyze.ts (lines 44-56):**
```typescript
const spinner = options.json ? null : ora('Analyzing project...').start();

try {
  // Dynamic import - only loads analyzer when actually needed
  const { analyze } = await import('anatomia-analyzer');

  // Run analysis
  const result = await analyze(rootPath, {
    skipImportScan: options.skipImportScan,
    strictMode: options.strict,
    verbose: options.verbose,
  });

  if (spinner) {
    spinner.succeed('Analysis complete');
  }
```

**Human-readable formatting from work.ts (lines 494-517):**
```typescript
function printHumanReadable(output: StatusOutput): void {
  console.log(chalk.bold(`\nPipeline Status (artifact branch: ${output.artifactBranch})\n`));

  if (!output.onArtifactBranch) {
    console.log(chalk.yellow(`ℹ You're on ${output.currentBranch}. Artifact branch is ${output.artifactBranch}.`));
    console.log(chalk.gray(`  To switch: git checkout ${output.artifactBranch} && git pull\n`));
  }

  if (output.items.length === 0) {
    console.log(chalk.gray('No active work. Run: claude --agent ana to scope new work.'));
    return;
  }

  for (const item of output.items) {
    console.log(chalk.bold(`  ${item.slug} (${item.totalPhases} phase${item.totalPhases === 1 ? '' : 's'}):`));
    // ...
  }
}
```

**Command registration from index.ts (lines 33-42):**
```typescript
// Register commands
program.addCommand(initCommand);
program.addCommand(modeCommand);
program.addCommand(analyzeCommand);
program.addCommand(setupCommand);
program.addCommand(artifactCommand);
program.addCommand(workCommand);
registerPrCommand(program);
registerAgentsCommand(program);
registerVerifyPreCheckCommand(program);
```

### Checkpoint Commands

- After `scan.ts` created: `pnpm --filter anatomia-cli build` — Expected: builds without error
- After analyzer fix: `pnpm --filter anatomia-analyzer build` — Expected: builds without error
- After all changes: `pnpm --filter anatomia-cli test -- --run` — Expected: all tests pass including new scan tests
- Lint: `pnpm --filter anatomia-cli lint`

### Build Baseline

- Current tests: 309 passed
- Current test files: 25
- Command used: `pnpm --filter anatomia-cli test -- --run`
- After build: expected 320+ tests (add ~15 for scan command coverage)
- Regression focus: `analyze.ts` tests (analyzer integration pattern), analyzer index.ts tests (graceful degradation change)

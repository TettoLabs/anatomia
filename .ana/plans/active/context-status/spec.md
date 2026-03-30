# Spec: Add `ana context status` command

**Created by:** AnaPlan
**Date:** 2026-03-30
**Scope:** .ana/plans/active/context-status/scope.md

## Approach

New `context` parent command with `status` subcommand, following the `work.ts` structural pattern exactly. The command displays health information for context files — existence, age, staleness based on commits since last modified.

**Key patterns to follow:**
- Commander.js parent/child command structure from `work.ts` (lines 820-838)
- `execSync` with `stdio: 'pipe'` and `encoding: 'utf-8'` for git commands (lines 94-116)
- Try-catch with graceful degradation on git failures (return null, continue)
- `printHumanReadable()` / JSON split pattern (lines 494-646)
- Chalk formatting: bold headers, green ✓ / red ✗ marks, gray hints, cyan next-action

**Staleness logic:**
- Use `git log --oneline --follow -- {file}` with `--since` based on file mtime to count commits since file was last modified
- Files with >= 5 commits since modification are "stale"
- Files containing only `SCAFFOLD_MARKER` are "scaffold" status
- Missing files are "missing" status
- Everything else is "fresh"

**Persistence:**
- Update `lastHealth` in `.meta.json` with timestamp and summary counts
- Keep existing schema: `{ timestamp, totalFiles, setupFiles, setupFilesPresent, missingSetupFiles, staleFiles }`
- Add `scaffoldFiles` count to track placeholder files

## Output Mockups

### Human-readable output (default)

```
Context Health

  Setup Files (5 fresh, 1 stale, 1 scaffold)
    project-overview.md    ✓ fresh       2 days ago
    architecture.md        ✓ fresh       2 days ago
    patterns.md            ✓ fresh       2 days ago
    conventions.md         ⚠ stale       5 days ago (12 commits)
    workflow.md            ✓ fresh       2 days ago
    testing.md             ✓ fresh       2 days ago
    debugging.md           ○ scaffold    —

  Other Files
    analysis.md            ✓ present     3 days ago (analyzer output)

Stale files have 5+ commits since last update. Run setup to refresh.
```

### When no git repo

```
Context Health

  Setup Files (6 present, 1 missing)
    project-overview.md    ✓ present     2 days ago
    architecture.md        ✓ present     2 days ago
    patterns.md            ✓ present     2 days ago
    conventions.md         ✓ present     5 days ago
    workflow.md            ✓ present     2 days ago
    testing.md             ✓ present     2 days ago
    debugging.md           ✗ missing     —

  Other Files
    analysis.md            ✓ present     3 days ago (analyzer output)

Git unavailable — staleness detection skipped.
```

### When no .ana/ directory

```
Error: No .ana/ directory found. Run `ana init` first.
```

### JSON output (`--json`)

```json
{
  "setupFiles": [
    {
      "name": "project-overview.md",
      "path": "context/project-overview.md",
      "exists": true,
      "status": "fresh",
      "age": "2 days ago",
      "ageMs": 172800000,
      "commitsSince": 2
    },
    {
      "name": "conventions.md",
      "path": "context/conventions.md",
      "exists": true,
      "status": "stale",
      "age": "5 days ago",
      "ageMs": 432000000,
      "commitsSince": 12
    },
    {
      "name": "debugging.md",
      "path": "context/debugging.md",
      "exists": true,
      "status": "scaffold",
      "age": null,
      "ageMs": null,
      "commitsSince": null
    }
  ],
  "otherFiles": [
    {
      "name": "analysis.md",
      "path": "context/analysis.md",
      "exists": true,
      "label": "analyzer output",
      "age": "3 days ago",
      "ageMs": 259200000
    }
  ],
  "summary": {
    "totalFiles": 8,
    "setupFiles": 7,
    "setupFilesPresent": 7,
    "freshFiles": 5,
    "staleFiles": 1,
    "scaffoldFiles": 1,
    "missingSetupFiles": 0
  },
  "gitAvailable": true,
  "persistedToMeta": true
}
```

## File Changes

### `packages/cli/src/commands/context.ts` (create)

**What changes:** New command file implementing `context` parent with `status` subcommand. Exports `contextCommand` for registration.

**Pattern to follow:** `work.ts` — same Commander.js structure, same git execution pattern, same human/JSON output split.

**Why:** Core deliverable of this scope.

### `packages/cli/src/index.ts` (modify)

**What changes:** Import and register `contextCommand`.

**Pattern to follow:** Existing command registrations (lines 16-21, 34-42).

**Why:** Command won't be accessible without registration.

### `packages/cli/src/constants.ts` (modify)

**What changes:** Add `STALENESS_THRESHOLD = 5` constant.

**Pattern to follow:** Existing constants like `MIN_FILE_SIZE_WARNING`.

**Why:** Magic number should be a named constant for maintainability.

### `packages/cli/tests/commands/context.test.ts` (create)

**What changes:** Test suite for context status command.

**Pattern to follow:** `work.test.ts` — temp directory setup, git repo creation, `captureOutput` helper, describe blocks for scenarios.

**Why:** Tests required for coverage.

<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
```yaml
file_changes:
  - path: "packages/cli/src/commands/context.ts"
    action: create
  - path: "packages/cli/src/index.ts"
    action: modify
    reason: "Register context command"
  - path: "packages/cli/src/constants.ts"
    action: modify
    reason: "Add STALENESS_THRESHOLD constant"
  - path: "packages/cli/tests/commands/context.test.ts"
    action: create
```
<!-- END MACHINE-READABLE -->

## Acceptance Criteria

- [ ] AC1: `ana context status` displays per-file health for all 7 setup context files
- [ ] AC2: Each file shows: existence, age (human-readable), commits since modified, status (fresh/stale/missing/scaffold)
- [ ] AC3: Files with >= 5 commits since last modified are marked stale
- [ ] AC4: Files containing only SCAFFOLD_MARKER are marked scaffold
- [ ] AC5: `analysis.md` shown separately with "(analyzer output)" label if it exists
- [ ] AC6: `--json` flag outputs structured JSON matching the display data
- [ ] AC7: Command updates `lastHealth` in `.meta.json` with timestamp and summary counts
- [ ] AC8: Graceful degradation: no git → shows existence/age, skips commit count, shows "Git unavailable" note
- [ ] AC9: Graceful degradation: no `.meta.json` → displays health, skips persist, warns user
- [ ] AC10: Graceful degradation: no `.ana/` directory → error with "Run `ana init` first" message
- [ ] AC11: Output is clear and scannable (follows `work status` visual style)
- [ ] AC12: Command always exits 0 (informational command)
- [ ] AC13: Tests pass with `pnpm --filter anatomia-cli test -- --run`
- [ ] AC14: No TypeScript build errors

<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
```yaml
acceptance_criteria:
  - id: AC1
    description: "Command displays all 7 setup context files"
    verification: mechanical
    test_hint: "setupFiles.*7|all.*setup files"
  - id: AC2
    description: "Each file shows existence, age, commits, status"
    verification: mechanical
  - id: AC3
    description: "Files with >= 5 commits marked stale"
    verification: mechanical
    test_hint: "stale.*commits"
  - id: AC4
    description: "Scaffold files detected by SCAFFOLD_MARKER"
    verification: mechanical
  - id: AC5
    description: "analysis.md shown separately with label"
    verification: mechanical
    test_hint: "analyzer output"
  - id: AC6
    description: "JSON output matches display data"
    verification: mechanical
  - id: AC7
    description: "Updates lastHealth in .meta.json"
    verification: mechanical
  - id: AC8
    description: "Graceful degradation without git"
    verification: mechanical
    test_hint: "Git unavailable"
  - id: AC9
    description: "Graceful degradation without .meta.json"
    verification: mechanical
  - id: AC10
    description: "Error when no .ana/ directory"
    verification: mechanical
    test_hint: "ana init"
  - id: AC11
    description: "Output is clear and scannable"
    verification: judgment
  - id: AC12
    description: "Always exits 0"
    verification: mechanical
  - id: AC13
    description: "Tests pass"
    verification: mechanical
  - id: AC14
    description: "No build errors"
    verification: mechanical
```
<!-- END MACHINE-READABLE -->

## Testing Strategy

- **Unit tests:** Test individual functions — `getFileStatus()`, `formatAge()`, `countCommitsSince()`, `printHumanReadable()`
- **Integration tests:** Full command execution with temp directories and real git repos (following `work.test.ts` pattern)
- **Edge cases:**
  - No `.ana/` directory → error message
  - No git repo → graceful degradation
  - No `.meta.json` → display health, warn on persist
  - Scaffold files (contain only marker)
  - Future mtime (clock skew) → treat as fresh, don't crash
  - Empty context directory → show all missing
  - Mixed states (some fresh, some stale, some missing)

## Dependencies

- `REQUIRED_CONTEXT_FILES` constant exists in `constants.ts` (verified: lines 25-33)
- `SCAFFOLD_MARKER` constant exists in `constants.ts` (verified: line 8)
- `.meta.json` structure with `lastHealth` field (verified in `.ana/.meta.json`)

## Constraints

- Exit code must always be 0 (informational command)
- Must not crash on unexpected project state
- Git commands must use `stdio: 'pipe'` to suppress terminal noise
- Imports must use `.js` extension (ESM requirement)

## Gotchas

- **ESM imports:** Use `.js` extension even for `.ts` files: `import { foo } from './context.js'`
- **execSync encoding:** Must specify `encoding: 'utf-8'` to get string, not Buffer
- **Git log with spaces:** File paths need proper escaping. Use template literal with path in quotes: `` `git log --oneline -- "${filePath}"` ``
- **File mtime:** Use `fs.statSync(path).mtime` to get modification time. Returns Date object.
- **SCAFFOLD_MARKER check:** Read first line of file, trim, compare. Don't read entire file.
- **lastHealth.scaffoldFiles:** New field — existing `.meta.json` files won't have it. Handle gracefully.

## Build Brief

### Rules That Apply

- ESM imports with `.js` extension for all TypeScript files
- Graceful degradation: try-catch → partial results → continue
- Chalk formatting: green ✓ for success, red ✗ for failure, yellow ⚠ for warnings
- `execSync` with `stdio: 'pipe'` and `encoding: 'utf-8'`
- Constants in UPPER_SNAKE_CASE
- Functions in camelCase
- One export per command file (the command itself)

### Pattern Extracts

**Command structure from `work.ts` (lines 820-838):**
```typescript
export const workCommand = new Command('work')
  .description('Manage pipeline work items');

const statusCommand = new Command('status')
  .description('Show pipeline state for all active work items')
  .option('--json', 'Output JSON format for programmatic consumption')
  .action((options: { json?: boolean }) => {
    getWorkStatus(options);
  });

workCommand.addCommand(statusCommand);
```

**Git execution pattern from `work.ts` (lines 94-100):**
```typescript
function fileExistsOnBranch(branch: string, filePath: string): boolean {
  try {
    execSync(`git show ${branch}:${filePath}`, { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}
```

**Human output formatting from `work.ts` (lines 494-512):**
```typescript
function printHumanReadable(output: StatusOutput): void {
  console.log(chalk.bold(`\nPipeline Status (artifact branch: ${output.artifactBranch})\n`));

  // ... status marks
  const scopeMark = item.artifacts.scope.exists ? chalk.green('✓') : chalk.red('✗');
  console.log(`    scope.md         ${scopeMark} ${scopeLocation}`);
}
```

**Test setup from `work.test.ts` (lines 19-28):**
```typescript
let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'work-test-'));
  originalCwd = process.cwd();
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

### Checkpoint Commands

- After `context.ts` created: `pnpm --filter anatomia-cli build` — Expected: builds without error
- After all changes: `pnpm --filter anatomia-cli test -- --run` — Expected: all tests pass
- Lint: `pnpm --filter anatomia-cli lint`

### Build Baseline

- Current test count: ~150 tests across CLI package
- After build: expected ~165 tests (adding ~15 for context command)
- Regression focus: No existing tests should break — this is additive

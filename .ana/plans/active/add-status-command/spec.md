# Spec: Add ana status command

**Created by:** AnaPlan
**Date:** 2026-03-27
**Scope:** .ana/plans/active/add-status-command/scope.md

## Approach

Create a diagnostic command that shows context file health: age, citation counts, and staleness. Staleness is detected by comparing cited source files against `git diff --name-only <setupCommit> HEAD` plus uncommitted working tree changes.

Before building the command, extract citation parsing from check.ts into a shared utility. This extraction is required because ana-diff and ana-refresh are on the roadmap — citation parsing will have 3-4 consumers. Follow the "delay, don't debt" principle: extract now to avoid rework later.

Design the data model so a future `ana refresh` command can consume status output to know exactly which context files need regeneration and why. Status shows the problem; refresh will fix it.

Use `node:child_process` execSync for git commands. The CLI has no existing pattern for shelling out, but execSync is appropriate for fast, synchronous commands like `git rev-parse HEAD` and `git diff --name-only`. Wrap all git calls in try/catch to handle non-git repos gracefully — this follows the "partial results over no results" principle from design-principles.

## File Changes

### `packages/cli/src/utils/citations.ts` (create)

**What changes:** New shared utility for citation parsing. Export the citation regex patterns, the path validation function, and a new function that parses a markdown string and returns structured citation data (file path, start line, end line, full match text).

**Pattern to follow:** Structure like other utils in `packages/cli/src/utils/` — single-purpose module, named exports, JSDoc on public functions.

**Why:** check.ts, status.ts, and future ana-diff/ana-refresh commands all need to parse citations. Extracting now prevents duplication debt.

### `packages/cli/src/commands/check.ts` (modify)

**What changes:** Replace inline `CITATION_PATTERNS` and `isValidFilePath` with imports from the new citations utility. The `checkCitations` function stays in check.ts but calls the shared parser.

**Pattern to follow:** The existing import structure in check.ts. Add import at top, remove the duplicated definitions (lines 68-74 for patterns, lines 218-230 for isValidFilePath).

**Why:** Consolidates citation logic. Reduces check.ts line count while preserving all existing behavior.

**Critical constraint:** All existing tests in `packages/cli/tests/commands/check.test.ts` must pass after this refactor. The extraction is purely structural — no behavior changes to check command. AnaBuild must run `pnpm test --filter=anatomia-cli` after modifying check.ts and verify no regressions before proceeding.

### `packages/cli/src/commands/status.ts` (create)

**What changes:** New command implementing `ana status`. Reads `.meta.json` for setup state, parses all context files for citations using the shared utility, runs git diff to detect changes since setupCommit, cross-references to identify stale citations, outputs summary or detailed view.

**Pattern to follow:** Structure like `analyze.ts` — Commander.js setup with `.description()`, `.option()`, `.action()`. Async action handler with try/catch. ora spinner (conditional on --json flag). chalk for colored output. Exit code 0 always (diagnostic, not gate).

**Why:** Core feature of this scope.

### `packages/cli/src/commands/setup.ts` (modify)

**What changes:** In the `updateMetaJson` function, after setting `setupStatus` and `setupCompletedAt`, also set `setupCommit` to the current HEAD hash. Use execSync to run `git rev-parse HEAD`. If not a git repo (command throws), set `setupCommit` to null.

**Pattern to follow:** The existing meta field assignments in `updateMetaJson` (around line 396). Add the new field in the same style.

**Why:** Provides the baseline commit for staleness detection. Without this, status can't know what "changed since setup" means.

### `packages/cli/src/index.ts` (modify)

**What changes:** Import statusCommand and register it with `program.addCommand(statusCommand)`.

**Pattern to follow:** Exactly like the existing command registrations (lines 16-19 for imports, lines 29-32 for registration).

**Why:** Makes the command accessible via CLI.

## Acceptance Criteria

From scope:
- [ ] `ana status` runs without error when .ana/ exists and setup is complete
- [ ] Output shows context age (e.g., "2 days ago") based on `setupCompletedAt`
- [ ] Output shows per-file summary: filename, citation count, stale citation count
- [ ] Stale citations are detected by comparing cited files against `git diff --name-only <setupCommit> HEAD`
- [ ] Uncommitted changes are included in staleness check (working tree diff)
- [ ] `--verbose` flag shows every citation with pass/fail status and change details
- [ ] `--json` flag outputs structured JSON for scripting
- [ ] Exit code is always 0 (diagnostic, not gate)
- [ ] Error when `.ana/` directory doesn't exist: "No .ana/ directory. Run `ana init`."
- [ ] Error when `.meta.json` missing or malformed: "Corrupted .ana/ state. Run `ana init --force` to reinitialize."
- [ ] Warning when `setupStatus !== 'complete'`: shows file stats but skips staleness check with message "Setup incomplete — staleness check unavailable. Run `claude --agent ana-setup` to complete."
- [ ] Warning when not a git repo: shows file stats but skips staleness check with message "Not a git repository — staleness check unavailable."
- [ ] Setup command writes `setupCommit` field to `.meta.json` on completion
- [ ] Command is registered in CLI and appears in `ana --help`

Implementation criteria:
- [ ] Citation parsing extracted to shared utility
- [ ] check.ts refactored to use shared utility with zero behavior change
- [ ] All existing check.test.ts tests pass after refactor
- [ ] No new dependencies added (use node:child_process from stdlib)
- [ ] Builds without errors (`pnpm build`)
- [ ] Passes linting (`pnpm lint`)

## Output Format

### Default (human-readable)

```
Context Health

  Last setup: 2 days ago (2026-03-25)
  Setup commit: f683859

  Files:
    project-overview.md    12 citations    0 stale    ✓
    conventions.md          8 citations    0 stale    ✓
    patterns.md            15 citations    2 stale    ✗
    architecture.md         6 citations    1 stale    ✗
    testing.md              9 citations    0 stale    ✓
    workflow.md             4 citations    0 stale    ✓
    debugging.md            7 citations    0 stale    ✓

  Summary: 5/7 files up to date, 3 stale citations
```

### Default with stale citations (shows what's stale)

```
Context Health

  Last setup: 2 days ago (2026-03-25)
  Setup commit: f683859

  Files:
    project-overview.md    12 citations    0 stale    ✓
    conventions.md          8 citations    0 stale    ✓
    patterns.md            15 citations    2 stale    ✗
      → src/parsers/treeSitter.ts (lines 56-74) — modified
      → src/cache/astCache.ts (lines 77-80) — modified
    architecture.md         6 citations    1 stale    ✗
      → src/index.ts (lines 192-268) — deleted
    testing.md              9 citations    0 stale    ✓
    workflow.md             4 citations    0 stale    ✓
    debugging.md            7 citations    0 stale    ✓

  Summary: 5/7 files up to date, 3 stale citations
```

### Verbose (--verbose)

Shows every citation, not just stale ones:

```
Context Health

  Last setup: 2 days ago (2026-03-25)
  Setup commit: f683859

  patterns.md (15 citations, 2 stale)
    ✓ packages/cli/src/commands/check.ts (lines 68-74)
    ✓ packages/cli/src/commands/check.ts (lines 218-230)
    ✗ src/parsers/treeSitter.ts (lines 56-74) — modified in 3 commits
    ✗ src/cache/astCache.ts (lines 77-80) — modified in 1 commit
    ✓ packages/analyzer/src/index.ts (lines 143-153)
    ... (remaining citations)

  architecture.md (6 citations, 1 stale)
    ✓ pnpm-workspace.yaml (lines 1-3)
    ✗ src/index.ts (lines 192-268) — file deleted
    ... (remaining citations)

  ... (remaining files)

  Summary: 5/7 files up to date, 3 stale citations
```

### JSON (--json)

```json
{
  "setupCompletedAt": "2026-03-25T01:31:05.140Z",
  "setupCommit": "f683859fbdcef7d4589392cf502c502dc1c3d5dd",
  "setupAgeSeconds": 172800,
  "isGitRepo": true,
  "files": [
    {
      "file": "patterns.md",
      "citations": [
        {
          "sourcePath": "packages/cli/src/commands/check.ts",
          "startLine": 68,
          "endLine": 74,
          "stale": false,
          "changeType": null
        },
        {
          "sourcePath": "src/parsers/treeSitter.ts",
          "startLine": 56,
          "endLine": 74,
          "stale": true,
          "changeType": "modified"
        }
      ],
      "totalCitations": 15,
      "staleCitations": 2
    }
  ],
  "summary": {
    "totalFiles": 7,
    "filesUpToDate": 5,
    "filesStale": 2,
    "totalCitations": 61,
    "staleCitations": 3
  }
}
```

The JSON structure is designed for refresh compatibility:
- `setupCommit` — baseline for git diff
- Per-citation `sourcePath`, `startLine`, `endLine` — exact location in source
- Per-citation `changeType` — "modified", "deleted", or "uncommitted"
- Grouped by context file — refresh can target specific files

## Testing Strategy

### Shared citations utility tests

Create `packages/cli/tests/utils/citations.test.ts`:

- **Pattern matching:** Test each citation pattern against known formats from check.ts
- **Path validation:** Test isValidFilePath with directories, commands, bare filenames, full paths
- **Parser output:** Test that parseCitations returns correct structure (path, startLine, endLine, matchText)
- **Edge cases:** Empty content, no citations, malformed citations, citations in code blocks (should be excluded)

### Status command tests

Create `packages/cli/tests/commands/status.test.ts`:

- **Happy path:** .ana/ exists, setup complete, git repo, some stale citations
- **No .ana/:** Error message and exit 0
- **Malformed .meta.json:** Error message and exit 0
- **Setup incomplete:** Warning, shows stats, skips staleness
- **Not a git repo:** Warning, shows stats, skips staleness
- **No setupCommit in .meta.json:** Warning about old setup, suggests re-running
- **--json flag:** Outputs valid JSON matching schema
- **--verbose flag:** Shows all citations, not just stale

Mock git commands using a test fixture directory with a real .git folder, or mock execSync at the module level.

### Check command regression tests

**Critical:** Run existing `packages/cli/tests/commands/check.test.ts` after refactoring check.ts. All tests must pass. The refactor is structural only — if any test fails, the extraction changed behavior incorrectly.

## Dependencies

- Scope must be approved (done)
- No external dependencies — uses node:child_process from stdlib

## Constraints

- **Exit code 0 always:** Status is diagnostic, not a gate. Even with stale citations, exit 0.
- **No new npm dependencies:** Use node:child_process for git commands.
- **Graceful degradation:** Every failure mode (no git, no setupCommit, incomplete setup) shows partial results with a warning, never crashes.
- **Backward compatibility:** Old .meta.json files without setupCommit should work — status shows a warning and skips staleness, doesn't error.

## Gotchas

1. **ESM imports require .js extension:** `import { parseCitations } from '../utils/citations.js'` — not `.ts`.

2. **execSync throws on non-zero exit:** Wrap git commands in try/catch. `git rev-parse HEAD` in a non-git directory throws, doesn't return empty string.

3. **execSync returns Buffer:** Call `.toString().trim()` on the result to get a clean string.

4. **git diff --name-only output:** One file per line, no trailing newline on last line. Split on `\n` and filter empty strings.

5. **Working tree changes:** Need two git diffs — `git diff --name-only <setupCommit> HEAD` for committed changes, and `git diff --name-only` (no args) for uncommitted changes. Combine both sets.

6. **Citation patterns exclude code blocks:** The patterns in check.ts are designed to avoid false positives. The shared utility must preserve this behavior — don't parse citations inside fenced code blocks.

7. **check.ts tests are the regression gate:** If check.test.ts fails after the extraction, something broke. Fix before proceeding with status.ts.

8. **Relative time formatting:** "2 days ago" requires date math. Use simple arithmetic on timestamps — don't add a dependency like date-fns. Format: "X minutes/hours/days ago" based on largest unit.

9. **setupCommit can be null:** If setup ran before this feature, or in a non-git repo. Handle gracefully with a warning.

10. **File enumeration:** Status should check all .md files in `.ana/context/`, not a hardcoded list. Use fs.readdir and filter for .md extension. This matches check.ts behavior for "all files mode."

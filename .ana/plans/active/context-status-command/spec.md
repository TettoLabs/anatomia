# Spec: Add `ana context status` command

**Created by:** AnaPlan
**Date:** 2026-03-28
**Scope:** .ana/plans/active/context-status-command/scope.md

## Approach

Create a new `context` command group with `status` subcommand following the existing parent-command pattern used by `work` and `setup`. The command provides health visibility for context files — showing existence, age, and staleness relative to codebase activity.

**Pattern to follow:** Structure the command file like `work.ts` — parent command with subcommands defined inline, `execSync` for git operations, separate display function for human output.

**Key design decisions:**

1. **Git operations via `execSync`** — Use `node:child_process` directly, matching the existing pattern in `work.ts`. No external dependencies.

2. **Per-file staleness detection** — Run `git log --oneline --since="<file-mtime>" -- packages/` for each setup file. Count commits to determine staleness. More accurate than global oldest-file approach.

3. **`lastHealth` schema** — Store an object in `.meta.json`:
   ```
   lastHealth: {
     timestamp: "2026-03-28T...",
     totalFiles: 8,
     setupFiles: 7,
     missingSetupFiles: 0,
     staleFiles: 2
   }
   ```
   This provides enough summary for quick checks without re-running.

4. **Two-section output** — Setup files (the 7 known files) get full treatment with staleness warnings. Other files (analysis.md, user-added) shown in separate section with age only, no staleness.

5. **Graceful git degradation** — If git commands fail (not a repo, no commits), skip staleness detection entirely. Show file existence and age only.

## File Changes

### `packages/cli/src/commands/context.ts` (create)

**What changes:** New command file implementing the `context` parent command with `status` subcommand.

**Pattern to follow:** `packages/cli/src/commands/work.ts` — same structure for parent command with subcommands, same `execSync` pattern for git operations, same separation of logic and display functions.

**Why:** New functionality requires new command file. Following existing patterns ensures consistency.

**Implementation notes:**
- Define the 7 setup files as a constant (same list as in `check.ts` lines 39-47)
- Use `fs.stat()` for mtime, calculate age in days/hours
- For each setup file, run `git log --oneline --since="<ISO-date>" -- packages/` and count output lines
- Consider a file "stale" when commits > 0 (any activity since file was updated)
- Display uses chalk with same visual language as `check.ts`: green ✓ for present, red ✗ for missing, yellow ⚠ for stale

### `packages/cli/src/index.ts` (modify)

**What changes:** Import and register the new `contextCommand`.

**Pattern to follow:** Existing command registrations on lines 16-21 and 31-36.

**Why:** Command must be registered to be available via CLI.

### `.ana/.meta.json` (runtime update by command)

**What changes:** Command updates the `lastHealth` field (currently `null`) with health summary object.

**Pattern to follow:** `setup.ts` `updateMetaJson` function (lines 329-401) for reading/updating .meta.json.

**Why:** Persists health check results for quick reference without re-running command.

## Acceptance Criteria

From scope:
- [ ] `ana context status` displays all context files with existence status and age
- [ ] Setup-generated files (7) are shown separately from other files in `.ana/context/`
- [ ] Each setup file shows commits-since-update warning when git activity detected
- [ ] Command updates `lastHealth` field in `.ana/.meta.json` with timestamp and summary
- [ ] `--json` flag outputs structured JSON matching the display data
- [ ] Graceful handling when `.ana/context/` doesn't exist (clear error message)
- [ ] Graceful handling when not in a git repo (skip commit counting, no crash)
- [ ] Exit code 0 on success, 1 on error (missing .ana/)

Implementation criteria:
- [ ] Tests pass with `pnpm test`
- [ ] No TypeScript errors with `pnpm build`
- [ ] ESLint passes with `pnpm lint`
- [ ] Command appears in `ana --help` output

## Testing Strategy

**Unit tests:** Create `packages/cli/tests/commands/context.test.ts`

**Pattern to follow:** `packages/cli/tests/commands/work.test.ts` — same temp directory setup with `beforeEach`/`afterEach`, same git repo initialization pattern, same `captureOutput` helper for testing console output.

**Test matrix:**

| Scenario | Setup | Expected |
|----------|-------|----------|
| All 7 setup files present, no git activity | Create files with recent mtime | All ✓, no warnings |
| Missing 2 setup files | Create 5 of 7 | 5 ✓, 2 ✗, exit 0 |
| Setup files with commits since | Create files, add commits to packages/ | ⚠ warnings with commit count |
| Other files present (analysis.md) | Add analysis.md | Shown in "Other files" section |
| No .ana/context/ directory | Don't create it | Error message, exit 1 |
| Not a git repo | No `git init` | Age shown, no staleness, no crash |
| JSON output | `--json` flag | Valid JSON with correct structure |

**Edge cases:**
- Empty `.ana/context/` directory (no files at all)
- Files with very old mtime (months old)
- Git repo with no commits to packages/ ever

## Dependencies

- `.ana/context/` directory must exist (created by `ana init`)
- Git must be available for staleness detection (graceful fallback if not)

## Constraints

- No new npm dependencies — use `node:child_process` for git
- Follow ESM import conventions (`.js` extensions)
- Use `node:` prefix for Node.js built-ins
- Match existing chalk color conventions (green success, red error, yellow warning)

## Gotchas

**Git date format:** When passing mtime to `git log --since`, use ISO format. JavaScript `Date.toISOString()` works. Don't use Unix timestamps.

**execSync encoding:** Always pass `{ encoding: 'utf-8', stdio: 'pipe' }` to get string output and suppress stderr. See `work.ts` line 96 for pattern.

**File stat errors:** A file might be deleted between `readdir` and `stat`. Wrap stat calls in try-catch, treat errors as "file missing".

**Context directory location:** It's `.ana/context/`, not `.ana/modes/`. Common mistake per coding standards.

**The 7 setup files:** Use the exact same list as `check.ts` lines 39-47. Don't hardcode a different list.

**JSON output structure:** Match the internal data structure exactly. The human display and JSON output should derive from the same data, just formatted differently. See `work.ts` `StatusOutput` interface and how both `printHumanReadable` and JSON stringify use the same `output` object.

## Output Mockups

**Human-readable output (all healthy):**

```
Context Health

  Setup Files (7 verified):
    ✓ project-overview.md    2 days ago
    ✓ conventions.md         2 days ago
    ✓ patterns.md            2 days ago
    ✓ architecture.md        2 days ago
    ✓ testing.md             2 days ago
    ✓ workflow.md            2 days ago
    ✓ debugging.md           2 days ago

  Other Files:
    analysis.md              1 day ago

All context files present. No staleness detected.
```

**Human-readable output (with issues):**

```
Context Health

  Setup Files (5 of 7 present):
    ✓ project-overview.md    2 days ago
    ✓ conventions.md         2 days ago    ⚠ 12 commits since update
    ✗ patterns.md            missing
    ✓ architecture.md        2 days ago
    ✓ testing.md             2 days ago    ⚠ 3 commits since update
    ✗ workflow.md            missing
    ✓ debugging.md           2 days ago

  Other Files:
    analysis.md              1 day ago

2 setup files missing. 2 files may be stale.
Consider re-running setup or manually updating affected files.
```

**JSON output:**

```json
{
  "timestamp": "2026-03-28T14:30:00.000Z",
  "setupFiles": [
    {
      "file": "project-overview.md",
      "exists": true,
      "age": "2 days ago",
      "mtime": "2026-03-26T10:00:00.000Z",
      "commitsSince": 0,
      "stale": false
    },
    {
      "file": "patterns.md",
      "exists": false,
      "age": null,
      "mtime": null,
      "commitsSince": null,
      "stale": false
    }
  ],
  "otherFiles": [
    {
      "file": "analysis.md",
      "exists": true,
      "age": "1 day ago",
      "mtime": "2026-03-27T12:00:00.000Z"
    }
  ],
  "summary": {
    "totalFiles": 8,
    "setupFiles": 7,
    "setupFilesPresent": 5,
    "missingSetupFiles": 2,
    "staleFiles": 2
  }
}
```

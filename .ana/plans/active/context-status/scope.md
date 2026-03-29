# Scope: Context Status Command

**Created by:** Ana
**Date:** 2026-03-29

## Intent

Add `ana context status` subcommand that shows the health of all context files — which ones exist, how old they are, and whether they might be stale based on recent git activity. Human-readable output by default, `--json` flag for machine consumption. Automatically updates `.meta.json` lastHealth on every run.

## Complexity Assessment

- **Size:** small
- **Files affected:** 3-4 files
  - `packages/cli/src/commands/context.ts` (new)
  - `packages/cli/src/index.ts` (register command)
  - `packages/cli/tests/commands/context.test.ts` (new)
- **Blast radius:** Low — new command, no modifications to existing functionality
- **Estimated effort:** 2-3 hours
- **Multi-phase:** no

## Approach

New subcommand following the `work status` pattern. Parent command `context` with `status` subcommand. Reads the 7 expected context files from `.ana/context/`, checks existence and mtime, counts git commits since each file's last update, and outputs a health report. Persists summary to `.meta.json` lastHealth field.

## Acceptance Criteria

- [ ] `ana context status` outputs human-readable health report showing all 7 context files
- [ ] Each file shows: existence (present/missing), last modified date, age in human terms, commits since update
- [ ] Files with commits since last update display commit count (no threshold judgment in v1)
- [ ] `ana context status --json` outputs structured JSON with same data
- [ ] Command updates `.meta.json` lastHealth field on every run
- [ ] Command exits 0 on success (informational command, never fails on stale files)
- [ ] Command exits 1 if `.ana/` directory doesn't exist (not initialized)
- [ ] Works when not in a git repo (skips commit counting, shows file age only)

## Edge Cases & Risks

- **Not a git repo:** Skip commit counting gracefully, show file age only
- **No .ana/ directory:** Exit 1 with helpful message ("Run `ana init` first")
- **Some context files missing:** Show as "missing" in output, don't fail
- **Context file exists but empty:** Still counts as "exists" — content quality is not this command's job
- **Git fetch fails (offline):** Use local git history only, don't fail
- **File mtime in future:** Handle gracefully (show as "0 commits since")

## Rejected Approaches

- **Targeted staleness (path-specific commit tracking):** More accurate but significantly more complex. Requires mapping each context file to relevant source paths. Deferred — the simple approach provides immediate value and the data model supports enhancement later.
- **Staleness thresholds:** Considered adding configurable thresholds (e.g., "stale if >5 commits"). Rejected for v1 — show raw data and let developer decide. Thresholds can be added later without breaking changes.
- **Health scoring:** Considered computing an overall health score (0-100). Rejected — premature abstraction. The raw data is more useful than an opaque score.

## Open Questions

None — all questions resolved during scoping conversation.

## For AnaPlan

### Structural Analog

`work.ts` — status subcommand with `--json` flag, Commander.js pattern, human-readable and JSON output modes, execSync for git commands. The `getWorkStatus()` function structure (gather data → format output based on mode) is the exact pattern to follow.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts` — lines 574-646 show the status command pattern with `--json` option
- `packages/cli/src/commands/work.ts` — lines 494-566 show `printHumanReadable()` pattern with chalk formatting
- `packages/cli/src/index.ts` — lines 33-40 show command registration patterns
- `packages/cli/src/commands/agents.ts` — simpler command example (57 lines) showing file reading pattern
- `.ana/.meta.json` — existing `lastHealth` field structure to match

### Patterns to Follow

- Use `chalk` for colored output (green for present, red for missing, yellow for stale indicator)
- Use `execSync` with `stdio: 'pipe'` for git commands, wrapped in try-catch
- Define TypeScript interfaces for all data structures (`ContextFileInfo`, `ContextStatusOutput`)
- JSON output via `JSON.stringify(output, null, 2)`
- Exit codes: 0 for success, 1 for errors (missing .ana/)

### Known Gotchas

- Git commands need `encoding: 'utf-8'` option or output is Buffer
- `fs.statSync()` returns mtime as Date object
- The 7 context files are: project-overview.md, architecture.md, patterns.md, conventions.md, workflow.md, testing.md, debugging.md
- `lastHealth` in `.meta.json` has existing shape: `{ timestamp, totalFiles, setupFiles, setupFilesPresent, missingSetupFiles, staleFiles }`

### Things to Investigate

- Confirm the exact list of 7 context files (check if `analysis.md` should be included — it exists in the directory but may not be a "setup file")
- Review how `work.ts` handles the case where git isn't available
- Check if there's a shared utility for reading/writing `.meta.json`

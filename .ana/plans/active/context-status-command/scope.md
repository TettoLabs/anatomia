# Scope: Add `ana context status` command

**Created by:** Ana
**Date:** 2026-03-28

## Intent

User wants a quick way to check the health of their context files — which exist, when they were last updated, and whether they might be stale relative to codebase activity. This helps developers know when to re-run setup or manually refresh context.

## Complexity Assessment

- **Size:** small
- **Files affected:**
  - `packages/cli/src/commands/context.ts` (new)
  - `packages/cli/src/index.ts` (register command)
  - `.ana/.meta.json` schema (update lastHealth field)
- **Blast radius:** Low — new command, no changes to existing command behavior
- **Estimated effort:** 2-3 hours
- **Multi-phase:** no

## Approach

Create a new `context` command group with `status` subcommand. The command:

1. Reads `.ana/context/` directory to find all markdown files
2. Separates the 7 known setup-generated files from other files (like analysis.md)
3. Gets mtime for each file, calculates age
4. Runs `git log` to count commits to `packages/` since the oldest setup file was modified
5. Flags files with staleness warnings when significant commits occurred after the file was updated
6. Updates `lastHealth` in `.meta.json` with timestamp and summary
7. Outputs human-readable table (default) or JSON (with `--json` flag)

Use Commander.js subcommand pattern (like `ana setup check` is a subcommand of `setup`).

## Acceptance Criteria

- [ ] `ana context status` displays all context files with existence status and age
- [ ] Setup-generated files (7) are shown separately from other files in `.ana/context/`
- [ ] Each setup file shows commits-since-update warning when git activity detected
- [ ] Command updates `lastHealth` field in `.ana/.meta.json` with timestamp and summary
- [ ] `--json` flag outputs structured JSON matching the display data
- [ ] Graceful handling when `.ana/context/` doesn't exist (clear error message)
- [ ] Graceful handling when not in a git repo (skip commit counting, no crash)
- [ ] Exit code 0 on success, 1 on error (missing .ana/)

## Edge Cases & Risks

- **No .ana/ directory:** User hasn't run `ana init`. Show helpful error pointing to init.
- **Partial files:** Some setup files exist, others don't. Show missing ones with ✗ marker.
- **Not a git repo:** Skip commit-based staleness detection, show age only.
- **Malformed .meta.json:** Handle JSON parse errors gracefully, recreate if needed.
- **Files outside the 7:** analysis.md and any user-added files should be listed but not get staleness warnings (different lifecycle).
- **Very old files:** Files older than 30 days could get a stronger warning, but keep it simple for v1.

## Rejected Approaches

**Citation-based staleness tracking:** Track which source files each context file cites, flag when those specific files change. Too complex for v1 — requires parsing citations and maintaining a dependency graph. The git-activity heuristic is good enough.

**Per-file commit tracking:** Track commits affecting files cited by each context file individually. Same complexity problem. Global "commits to packages/" is a sufficient signal.

**Extending `ana setup check`:** That command validates quality (citations, placeholders). Staleness is a different concern. Separate command is cleaner.

## Open Questions

None — approach is clear.

## For AnaPlan

### Relevant Code Paths

- `packages/cli/src/commands/check.ts` — Similar command structure, good pattern to follow for file iteration and --json support
- `packages/cli/src/index.ts` (lines 15-32) — Command registration pattern
- `.ana/.meta.json` — Has `lastHealth: null` field ready to populate

### Patterns to Follow

- Commander.js subcommand pattern (see how `setup` has `check` subcommand)
- Chalk for colored output (green ✓, red ✗, yellow ⚠)
- JSON output structure matching existing commands (see check.ts `FileCheckResult`)

### Known Gotchas

- ESM imports require `.js` extension even for `.ts` files
- Use `node:path` and `node:fs/promises` (Node.js prefixed imports)
- `child_process` for git commands — use `execSync` or promisified `exec`

### Things to Investigate

- Exact format for `lastHealth` field — timestamp only, or include summary object?
- Whether to use `simple-git` package or raw `child_process` for git commands (check existing codebase for precedent)

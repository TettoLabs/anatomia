# Scope: Add `ana context status` command

**Created by:** Ana
**Date:** 2026-03-30

## Intent

Add a command that shows the health of context files — which exist, how old they are, how many commits have occurred since they were last modified, and whether they're fresh, stale, or missing. Persist the health summary to `.meta.json` so agents can consume it on startup. Provide `--json` output for programmatic use.

Developers and agents need visibility into context file freshness. Stale context leads to Ana giving outdated advice. Currently there's no way to see this at a glance or check programmatically before starting work.

## Complexity Assessment

- **Size:** small
- **Files affected:** 3-4 files
  - `packages/cli/src/commands/context.ts` (new)
  - `packages/cli/src/index.ts` (register command)
  - `packages/cli/src/constants.ts` (possibly add staleness threshold)
  - `packages/cli/tests/commands/context.test.ts` (new)
- **Blast radius:** low — new command, no changes to existing commands
- **Estimated effort:** 2-3 hours implementation + tests
- **Multi-phase:** no

## Approach

New `context` parent command with `status` subcommand, following the `work status` structural pattern. Uses filesystem mtime for age, `git log` for per-file commit counts since last modified. Displays human-readable output by default (chalk-formatted), structured JSON with `--json` flag. Writes health summary to `lastHealth` field in `.meta.json`.

Graceful degradation: if git isn't available, show existence and age but skip commit-based staleness. If `.meta.json` is missing or unwritable, display health but skip the persist step. The command should never crash on unexpected project state.

Focus on the 7 setup files defined in `REQUIRED_CONTEXT_FILES`. Show `analysis.md` separately if it exists, marked as "(analyzer output)" since it has a different lifecycle.

## Acceptance Criteria

- [ ] `ana context status` displays per-file health for all 7 setup context files
- [ ] Each file shows: existence, age (human-readable), commits since modified, status (fresh/stale/missing)
- [ ] Files with 5+ commits since last modified are marked stale
- [ ] `analysis.md` shown separately with "(analyzer output)" label if it exists
- [ ] `--json` flag outputs structured JSON matching the display data
- [ ] Command updates `lastHealth` in `.meta.json` with timestamp and per-file health
- [ ] Graceful degradation: no git → shows existence/age, skips commit count
- [ ] Graceful degradation: no `.meta.json` → displays health, skips persist
- [ ] Output is clear and scannable (follows `work status` visual style)

## Edge Cases & Risks

- **No `.ana/` directory** — error with helpful message pointing to `ana init`
- **No git repo** — degrade gracefully, skip commit-based staleness, note limitation in output
- **Empty/scaffold files** — file exists but contains only scaffold marker; should this count as "missing" or a new "scaffold" status?
- **`.meta.json` corrupt or missing** — display health anyway, skip persist, warn user
- **Context file with future mtime** — edge case from clock skew or manual touch; handle gracefully
- **Very large commit history** — `git log` could be slow; consider limiting depth

## Rejected Approaches

- **Time-based staleness (e.g., 7+ days old)** — Commits are better because active repos stay fresh if context isn't changing, inactive repos don't falsely trigger.
- **Repo-wide commit count** — Per-file is more accurate. A commit to `README.md` shouldn't make `architecture.md` stale.
- **Under `ana setup` command** — Context is a first-class concept Ana reads on every startup, not just a setup artifact. Own command namespace allows future subcommands (`context refresh`, `context evolve`).

## Open Questions

- **Exit code behavior** — Should the command always exit 0 (informational), or exit non-zero if any files are stale/missing? Trade-off between CI integration (non-zero useful) and "status commands are read-only" convention.
- **Scaffold placeholder handling** — Files that exist but contain only the scaffold marker. New "scaffold" status, or treat as "missing"? Affects health metrics.
- **No git initialized** — When `.git/` doesn't exist, what should the status column show? "unknown"? Skip the column entirely?

## Exploration Findings

### Patterns Discovered

- `work.ts` (lines 494-566): `printHumanReadable()` function shows chalk formatting pattern — bold headers, colored status marks (green ✓, red ✗), gray hints, cyan next-action
- `work.ts` (lines 574-646): `getWorkStatus()` shows `--json` flag pattern — same data structure, `JSON.stringify` with formatting vs `printHumanReadable()`
- `work.ts` (lines 94-116): git command pattern — `execSync` with `stdio: 'pipe'`, try-catch returning null/false on failure

### Constraints Discovered

- `REQUIRED_CONTEXT_FILES` in `constants.ts` (lines 25-33): exactly 7 files, paths relative to `.ana/`
- `lastHealth` structure in `.meta.json`: `{ timestamp, totalFiles, setupFiles, setupFilesPresent, missingSetupFiles, staleFiles }` — current schema, may need per-file detail added
- `SCAFFOLD_MARKER` in `constants.ts` (line 8): `'<!-- SCAFFOLD - Setup will fill this file -->'` — use this to detect placeholder files

### Test Infrastructure

- `packages/cli/tests/commands/work.test.ts`: likely exists, check for mocking patterns
- Tests use Vitest, mock filesystem and git commands

## For AnaPlan

### Structural Analog

`work.ts` — status subcommand with `--json` flag, Commander.js pattern, `execSync` for git commands, graceful degradation on git failures, chalk-formatted human output.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts` — full reference for status command pattern
- `packages/cli/src/constants.ts` — `REQUIRED_CONTEXT_FILES`, `SCAFFOLD_MARKER`
- `packages/cli/src/index.ts` — command registration pattern (lines 34-42)
- `.ana/.meta.json` — current `lastHealth` structure

### Patterns to Follow

- Git command execution pattern in `work.ts` (try-catch with graceful degradation)
- Human/JSON output split pattern in `work.ts` (`printHumanReadable` vs `JSON.stringify`)
- Command registration in `index.ts` (import + `program.addCommand`)

### Known Gotchas

- ESM imports require `.js` extension even for `.ts` files
- `execSync` needs `encoding: 'utf-8'` to return string instead of Buffer
- `stdio: 'pipe'` required to capture output and suppress terminal noise

### Things to Investigate

- Exact `git log` invocation for "commits since date" — need to handle file paths with spaces
- Whether `lastHealth` schema needs expansion for per-file detail or if summary counts suffice
- Test mocking strategy for git commands (does `work.test.ts` have patterns to follow?)

# Scope: Add ana status command

**Created by:** Ana
**Date:** 2026-03-27

## Intent

User wants a diagnostic command that shows context file health — how old the context is, how many citations each file has, and which citations point to source files that have changed since setup. This gives visibility into when AI context is going stale.

The key insight from scoping: mtime is unreliable (git rebase touches every file). We need git-based staleness detection using the commit hash from when setup completed.

## Complexity Assessment

- **Size:** medium
- **Files affected:**
  - New: `packages/cli/src/commands/status.ts` (~250-300 lines)
  - Modify: `packages/cli/src/index.ts` (add import + register command)
  - Modify: `packages/cli/src/commands/setup.ts` (write `setupCommit` to .meta.json on completion)
- **Blast radius:** Low. New command with isolated logic. Small addition to setup's completion path.
- **Estimated effort:** 2-4 hours
- **Multi-phase:** no

## Approach

Create a new `ana status` command that:

1. Reads `.meta.json` for `setupCompletedAt` timestamp and `setupCommit` hash
2. Parses all context files for citations using existing regex patterns (from check.ts)
3. Runs `git diff --name-only <setupCommit> HEAD` to get files changed since setup
4. Also checks `git diff --name-only` for uncommitted working tree changes
5. Cross-references cited files against changed files to identify stale citations
6. Outputs summary (default) or detailed view (`--verbose`)

Staleness detection requires git. If not a git repo, skip staleness check with a warning.

Setup command needs a small modification: write `setupCommit: <HEAD hash>` to `.meta.json` when setup completes.

## Acceptance Criteria

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

## Edge Cases & Risks

1. **Not a git repo**: Skip staleness, warn user, still show age and citation counts
2. **setupCommit missing** (old .meta.json from before this feature): Treat as "staleness unavailable", suggest re-running setup
3. **Cited file deleted**: Mark as stale (file no longer exists)
4. **Cited file not in git**: Skip staleness check for that specific citation
5. **Detached HEAD or unusual git state**: `git diff` should still work; if it fails, warn and skip staleness
6. **Very large repos**: `git diff --name-only` is fast even on large repos (just lists paths)
7. **Citation parsing edge cases**: Reuse patterns from check.ts which are already battle-tested

## Rejected Approaches

1. **mtime-based staleness**: Rejected because git operations (rebase, checkout, stash) touch mtimes without changing content. Unreliable.

2. **Per-file commit hash storage**: Considered storing the commit hash of each cited file at setup time. Rejected for v1 — adds complexity, `git diff` against setup commit is simpler and sufficient. Could add later if needed for more granular tracking.

3. **Content hashing**: Considered hashing file contents at setup time. Rejected — git already tracks this, no need to duplicate.

4. **Exit code 1 on stale**: Rejected — this is a diagnostic tool, not a quality gate. User confirmed exit 0 always for v1.

5. **--stale-days threshold**: Considered flag to ignore recent changes. Rejected for v1 — keep it simple, can add later if users want it.

## Open Questions

None — all questions resolved during scoping conversation.

## For AnaPlan

### Relevant Code Paths

- `packages/cli/src/commands/check.ts` — Citation parsing patterns at lines 68-74 (`CITATION_PATTERNS`), validation logic in `checkCitations()` function (lines 347-453)
- `packages/cli/src/commands/analyze.ts` — Example command structure: Commander.js setup, ora spinner, chalk output formatting
- `packages/cli/src/index.ts` — Command registration pattern (lines 28-32)
- `packages/cli/src/commands/setup.ts` — Where `.meta.json` is written on setup completion (need to find exact location)
- `.ana/.meta.json` — Current structure has `setupCompletedAt` and `setupStatus` fields, need to add `setupCommit`

### Patterns to Follow

- Commander.js command structure with `.description()`, `.option()`, `.action()`
- Async action handlers with try/catch, exit codes via `process.exit()`
- ora spinners for long operations (though status should be fast)
- chalk for colored output (green checkmarks, red X, gray details)
- `--json` flag pattern: skip spinners, output `JSON.stringify(result, null, 2)`
- Error handling: check for .ana/ existence early, provide actionable error messages

### Known Gotchas

- ESM imports require `.js` extension even for `.ts` files
- Use `fs/promises` not `fs` for async file operations
- Commander async actions need `parseAsync()` not `parse()` (already handled in index.ts)
- Citation patterns in check.ts are strict to avoid false positives on casual backtick mentions

### Things to Investigate

- Exact location in setup.ts where `.meta.json` is written — need to add `setupCommit` field there
- Whether to extract citation parsing to a shared utility (recommendation: duplicate for now, refactor later if needed)
- Format for `--json` output — suggest mirroring the internal data structure for consistency

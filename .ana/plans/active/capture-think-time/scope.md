# Scope: Capture actual think time from Ana session start

**Created by:** Ana
**Date:** 2026-05-13

## Intent

The think phase in pipeline timing systematically undercounts. Every proof shows 1-2 minutes of "think" time because the clock starts at `ana work start` (when the slug directory is created), not when the Ana conversation actually began. The real thinking — investigation, navigation, tradeoff discussion, scope drafting — happens before `work start`. A 45-minute scoping conversation records as 1 minute.

This undermines the product story. Anatomia's core principle is "think more, build less." But the Gantt chart tells the opposite story: Think is always the smallest bar. Users who spend 30 minutes carefully scoping a feature see "Think: 1m" and either distrust the data or undervalue the thinking they did.

The root cause: Ana is not just a scoping agent. It's a thinking partner — exploration, debugging, discussion. Many Ana sessions (~50%) never produce a scope. The system can't start the think clock at conversation start because it doesn't know whether a scope will follow. The measurement boundary (`work start`) was placed at the only moment where scoping intent is certain, sacrificing accuracy for simplicity.

## Complexity Assessment
- **Kind:** fix
- **Size:** small — 2 functions modified in 1 CLI file, 1 prompt line changed in 2 agent files, 1 new utility function
- **Files affected:**
  - `packages/cli/src/commands/work.ts` — `getWorkStatus()` adds `--session` flag handling, `startWork()` reads session file on new-slug path
  - `.claude/agents/ana.md` — `ana work status` → `ana work status --session`
  - `packages/cli/templates/.claude/agents/ana.md` — same template change
- **Blast radius:** Minimal. No changes to artifact.ts, proofSummary.ts, verify.ts, proof.ts, or any type definitions. No schema changes. No proof chain changes. Plan, Build, and Verify agent prompts untouched. The session file is gitignored local state — no commits, no merge conflicts, no shared state.
- **Estimated effort:** 1-2 hours plan+build+verify
- **Multi-phase:** no

## Approach

Use the Claude Code process PID as a natural session identifier to correlate the start of an Ana conversation with the eventual `work start` call.

**Session marker creation:** `ana work status --session` writes a small JSON file to `.ana/state/session-{claudePid}.json` containing the current UTC timestamp. The `--session` flag appears only in Ana's agent prompt. Other agents call plain `work status` — no flag, no file written.

**Session marker consumption:** When `ana work start {slug}` creates a NEW slug (the Think→scope path), it checks for `session-{claudePid}.json`. If found, uses that timestamp as `work_started_at` instead of `now()`. Then deletes the file — the marker has been consumed.

**Claude PID resolution:** The CLI resolves the Claude Code process PID by walking one level up from the Node.js process's parent. The process tree is `claude → shell → node (ana CLI)`. Node's `process.ppid` gives the shell PID; `ps -o ppid= -p {shellPid}` gives the Claude PID. This is POSIX-standard and works on macOS, Linux, and WSL.

**Graceful fallback:** If the `ps` call fails, the Claude process isn't found, or no session file exists, `work start` uses `now()` — identical to today's behavior. Every failure mode degrades to the status quo.

## Acceptance Criteria
- AC1: `ana work status --session` writes `.ana/state/session-{claudePid}.json` containing `{ "timestamp": "<UTC ISO string>" }` where `claudePid` is resolved from the process tree
- AC2: `ana work start {slug}` (new slug path only) reads `session-{claudePid}.json`, uses its timestamp as `work_started_at` if the file exists, then deletes the file
- AC3: When no session file exists (Plan/Build/Verify calling `work start`, or `--session` never ran), `work start` uses `now()` as `work_started_at` — identical to current behavior
- AC4: The Claude PID resolution uses `ps -o ppid= -p {process.ppid}` (POSIX standard). If the `ps` call fails or returns an invalid PID, the session marker is skipped and `work start` falls back to `now()`
- AC5: The `--session` flag is added to Ana's agent prompt (both dogfood `.claude/agents/ana.md` and template `packages/cli/templates/.claude/agents/ana.md`). No changes to Plan, Build, or Verify prompts
- AC6: Session files are written to `.ana/state/` which is already gitignored. No session data is ever committed
- AC7: Orphan session files (from Ana sessions that never scoped) are inert — they don't affect any CLI behavior and don't accumulate beyond the number of concurrent sessions
- AC8: Plain `ana work status` (without `--session`) does not write any session file — backward compatible, no behavior change for non-Ana callers

## Edge Cases & Risks

**Multiple concurrent Ana Think sessions.** Each has a unique Claude PID, so each writes a unique session file. No collision. When one scopes, it reads only its own file. Other sessions' files are unaffected.

**Ana session that never scopes.** The session file sits in `.ana/state/` as an orphan (~50 bytes, gitignored). It never gets consumed by `work start`. Harmless — doesn't affect any CLI operation. Can be cleaned up manually or by a future `work status` enhancement that prunes stale files, but this is not required.

**Claude PID resolution on different platforms.** `ps -o ppid=` is POSIX standard, tested on macOS (zsh, bash, sh) and works on Linux/WSL. Native Windows is not a concern — Claude Code doesn't run there. Docker/CI containers without Claude Code: no `CLAUDECODE` env var, `ps` walk hits PID 1, no session file written, falls back to `now()`.

**Shell type irrelevant.** The `ps` call runs inside Node.js via `execSync`, not in the user's shell. Whether the developer uses zsh, bash, fish, or sh doesn't affect PID resolution.

**Invalid or recycled PIDs.** `ps` with an invalid PID throws an error — caught, falls back to `now()`. PID reuse after a Claude session ends: the orphan session file has the old PID, and a new Claude process with the same PID would be a different session. In practice, PID reuse takes thousands of process spawns and the orphan file is tiny and harmless. Not worth defending against.

**Long gaps between `work status` and `work start`.** If the developer runs `work status --session` at 9am, has a 4-hour conversation, and scopes at 1pm, think time records as 4 hours. This is accurate — the thinking DID take 4 hours. The measurement now matches the activity boundary, even for long sessions.

**`ana init` skips existing agent files.** The template prompt change (adding `--session`) only reaches new installations. Existing users keep their current prompt until manual update or `--force` re-init. The feature degrades gracefully — without `--session`, no session file is written, and think time is 1-2 minutes as today.

## Rejected Approaches

**Global session.json (no PID keying).** A single file overwritten by every `work status --session` call. Fails with concurrent Ana sessions — last write wins, and `work start` can't tell which session wrote it. The PID-keyed approach was chosen because concurrent sessions are a real scenario (multiple terminals, team members on shared repos).

**`--started-at` parameter on `work start`.** Ana would track the session start time in conversation context and pass it to `work start`. Correct but adds cognitive burden to Ana's prompt — the LLM must remember and pass a timestamp across a potentially long conversation. Unreliable. The session file approach is mechanical and invisible to Ana.

**Environment variable from Claude Code.** Use a Claude-provided session ID env var. No such variable exists today (`CLAUDECODE=1` and `CLAUDE_CODE_ENTRYPOINT=cli` have no session identity). Depending on an undocumented env var would be fragile.

**PID liveness checks for cleanup.** `work status --session` could scan for stale session files and delete those whose PIDs aren't running. Rejected because PID liveness is a bad proxy for "session is relevant" — a Claude tab left open for 3 days is "running" but its session marker is stale. Orphan files are harmless enough that aggressive cleanup isn't justified.

**Track at `ana artifact save scope` instead of `work start`.** Saves the timestamp at scope save time rather than slug creation. Same correlation problem — `artifact save` needs to know which session started the thinking. `work start` is the right consumer because it's where `work_started_at` is written.

## Open Questions

None. Design decisions are resolved:
1. Session identifier → Claude PID via `ps` process tree walk
2. Storage → per-PID gitignored JSON files in `.ana/state/`
3. Lifecycle → `work status --session` creates, `work start` consumes and deletes
4. Cleanup → orphans are inert, no active cleanup needed
5. Fallback → `now()` on any failure (current behavior)

## Exploration Findings

### Patterns Discovered
- Process tree: `claude (60243) → zsh (varies per call) → node (ana CLI)`. Node's `process.ppid` is the shell PID (unstable). The Claude PID is the shell's parent — stable across all tool calls within a conversation.
- `ps -o ppid= -p {pid}` returns clean output (just the PPID number) on macOS, Linux, and all POSIX systems. Throws on invalid PID. Works from bash, sh, and zsh identically.
- `.ana/state/` is already gitignored (`.ana/.gitignore` contains `state/`). The directory exists and contains `cache/` and `symbol-index.json`. Session files coexist without conflict.
- `writeTimestamp()` (work.ts:2092) is the function that writes `work_started_at`. It accepts the timestamp value from `new Date().toISOString()`. The session file timestamp replaces this value when available.

### Constraints Discovered
- [TYPE-VERIFIED] `writeTimestamp()` at work.ts:2092 writes `saves[key] = new Date().toISOString()`. To use the session timestamp, this line changes to use the session timestamp when available instead of `new Date()`.
- [OBSERVED] `work_started_at` is written at work.ts:1810, immediately after directory creation. The session file read and consume happens at this same location.
- [OBSERVED] `startWork()` has two main paths: new slug (creates directory, writes `work_started_at`) and existing slug (detects phase, writes appropriate `_started_at`). Only the new-slug path (line 1806-1814) needs the session file.
- [OBSERVED] `getWorkStatus()` starts at work.ts:672. The `--session` flag handling goes near the end, after all display output, as a side effect.

### Test Infrastructure
- `packages/cli/tests/commands/work.test.ts` — existing work command tests. Session file tests mock the filesystem and process tree.
- The PID resolution function should be a small testable utility (e.g., `getSessionPid(): number | null`) that can be tested independently with mocked `execSync`.

## For AnaPlan

### Structural Analog
`writeTimestamp()` at work.ts:2092 — the existing function that writes `_started_at` values. The session file read is a pre-step to this: "before writing `work_started_at`, check if a session marker exists and use its timestamp instead of `now()`."

### Relevant Code Paths
- `packages/cli/src/commands/work.ts:672-730` — `getWorkStatus()`. The `--session` flag writes the session file after status display.
- `packages/cli/src/commands/work.ts:1806-1814` — New slug creation in `startWork()`. Session file read and consume goes here, before `writeTimestamp()`.
- `packages/cli/src/commands/work.ts:2092-2113` — `writeTimestamp()`. May need to accept an optional timestamp parameter instead of always using `new Date()`.
- `packages/cli/src/commands/work.ts:2153-2185` — Command registration. `--session` flag added to the `status` subcommand.
- `.claude/agents/ana.md` — Ana's startup instructions. `ana work status` → `ana work status --session`.
- `packages/cli/templates/.claude/agents/ana.md` — Template copy.

### Patterns to Follow
- `writeTimestamp()` existing write-once/force pattern for `_started_at` values
- `.ana/state/` for gitignored local state (established pattern)
- Graceful fallback pattern: try the enhanced path, catch errors, fall back to existing behavior

### Known Gotchas
- **`process.ppid` is NOT the Claude PID.** It's the shell PID, which changes every tool call. The Claude PID is one level up: `ps -o ppid= -p ${process.ppid}`. Plan/Build must use the grandparent, not the parent. This is the single most likely implementation mistake.
- The `--session` flag must be registered on the `status` subcommand, not the parent `work` command. Commander.js option inheritance could cause confusion if placed wrong.
- `writeTimestamp()` currently hardcodes `new Date().toISOString()` at line 2106. To accept an external timestamp, either add a parameter or have the caller write directly. Plan decides the cleanest integration.
- `ana init` skips existing agent files (assets.ts:264). The prompt change only reaches new installations. Document this as a known distribution gap — same limitation as the `fix-build-prompt-gaps` scope.

### Things to Investigate
- Should the Claude PID resolution be validated by checking that the resolved process is actually named `claude`? (`ps -o comm= -p {pid}` returns the command name.) This would prevent false matches if the process tree structure ever changes. Adds one more `ps` call but increases confidence.
- Should `writeTimestamp()` gain an optional `overrideTimestamp` parameter, or should the session file logic bypass `writeTimestamp()` entirely and write to saves.json directly? The former is cleaner (keeps all timestamp writing in one function) but changes the function signature.

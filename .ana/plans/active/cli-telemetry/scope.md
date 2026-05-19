# Scope: CLI Telemetry Foundation

**Created by:** Ana
**Date:** 2026-05-18

## Intent

The CLI is a black box after distribution. We have zero data on how people use it — or whether they use it at all. Every product decision (what to build next, where the funnel leaks, which commands matter) is a guess. We need anonymous, opt-in usage telemetry measuring the install-to-pipeline-completion funnel so product decisions are grounded in evidence, not intuition.

## Complexity Assessment

- **Kind:** feature
- **Size:** medium (~150 lines telemetry module, ~60 lines telemetry command, ~5 lines per instrumentation point across 7 commands, ~200 lines tests)
- **Files affected:**
  - `src/utils/telemetry.ts` (new — core module)
  - `src/commands/telemetry.ts` (new — status/enable/disable/show command)
  - `src/index.ts` (telemetry init + flush + command registration + error tracking)
  - `src/commands/scan.ts` (track `scan_completed`)
  - `src/commands/init/index.ts` (track `init_completed`)
  - `src/commands/work.ts` (track `pipeline_started`, `pipeline_completed`)
  - `src/commands/artifact.ts` (track `artifact_saved`)
  - `tests/utils/telemetry.test.ts` (new)
- **Blast radius:** Low. Telemetry is additive — it reads CLI state but doesn't modify it. The only mutation is to `~/.config/anatomia/` (global, outside any project). The only change to existing command files is a single `telemetry.track()` call at each instrumentation point.
- **Estimated effort:** 2-3 days
- **Multi-phase:** no

## Approach

Add a self-contained telemetry module that writes events to disk and flushes them via a detached child process — the same pattern `update-check.ts` already uses for npm registry lookups.

The module has three responsibilities:
1. **Consent management.** First interactive run prompts the user (3 lines, shows what's collected, `[y/N]` default). Config stored globally at `~/.config/anatomia/telemetry.json`. Non-TTY and `DO_NOT_TRACK=1` silently disable.
2. **Event recording.** `telemetry.track(event, props)` appends one JSON line to `~/.config/anatomia/pending-events.ndjson`. Synchronous, append-only. No read-modify-write.
3. **Event flushing.** After `parseAsync` completes in `main()`, spawn a detached child process that reads the NDJSON file, POSTs events to PostHog's HTTP API, and deletes the file. The main process exits immediately — the child handles network I/O independently.

**No new dependencies.** PostHog's capture API is a single HTTPS POST. Node's built-in `https` module handles it. The PostHog project API key is hardcoded in source — these keys are public by design (same pattern as the website's `NEXT_PUBLIC_POSTHOG_KEY` in client-side JS). This is not a secret.

**Why not posthog-node?** Adding a 640KB SDK with transitive dependencies to send one POST request is adding complexity, not removing it. The codebase already demonstrates the detached-spawn + raw-HTTPS pattern in `update-check.ts`. Use what exists.

**Why not `await shutdown()`?** The CLI calls `process.exit(1)` in 100+ places. `process.on('beforeExit')` doesn't fire on `process.exit()`. Graceful shutdown would require refactoring every exit point. The disk-write + detached-flush pattern sidesteps this entirely — events are persisted before any exit, flushed asynchronously after.

**Why NDJSON, not JSON array?** `appendFileSync` of one line per event is atomic at the OS level for small writes. No read-parse-push-stringify cycle. A kill during write loses at most the last line, not the entire file. Strictly faster, strictly more resilient.

## Acceptance Criteria

- AC1: First interactive CLI run displays a 3-line prompt showing what's collected and asking `Enable? [y/N]`. Choosing `y` enables telemetry. Choosing `N` or pressing Enter disables it. The choice persists across all future runs.
- AC2: Consent state stored in `~/.config/anatomia/telemetry.json` with fields: `enabled`, `anonymousId` (UUIDv4), `promptedAt` (ISO timestamp), `version` (schema version integer).
- AC3: If `!process.stdin.isTTY` or `!process.stdout.isTTY`, no prompt fires and telemetry defaults to disabled silently.
- AC4: If `DO_NOT_TRACK=1` is set, telemetry is disabled regardless of config file. No prompt, no events, no disk writes.
- AC5: Seven events fire at the correct instrumentation points: `command_run` (every command except `ana telemetry *`), `scan_completed`, `init_completed`, `pipeline_started` (`work start`), `pipeline_completed` (`work complete`), `artifact_saved`, `error_occurred` (unhandled exception in `main()` catch block).
- AC6: Every event includes `anonymousId` and `timestamp`. `command_run` includes `command`, `cliVersion`, `os`, `nodeVersion`, `isCI`. Other events include their specific properties (see Event Design below).
- AC7: No PII in any event. No file paths, no project names, no git URLs, no usernames. `detectedStack` is the only project-derived property and contains only technology names (e.g., "TypeScript", "Next.js").
- AC8: Events are appended to `~/.config/anatomia/pending-events.ndjson` as one JSON object per line. No read-modify-write.
- AC9: After successful command completion (parseAsync resolves in main), a detached child process is spawned that reads pending events, POSTs them to PostHog's capture API, and deletes the file. The main CLI process does not wait.
- AC10: `ana telemetry` / `ana telemetry status` prints whether enabled or disabled and the config file path.
- AC11: `ana telemetry enable` enables telemetry (generates anonymousId if needed). `ana telemetry disable` disables it.
- AC12: `ana telemetry show` prints a sample event payload with field descriptions — the transparency command.
- AC13: All telemetry operations (track, flush, prompt) catch errors internally and never throw. A failure in telemetry never crashes or delays the CLI.
- AC14: PostHog project API key is hardcoded in source. Not in env vars, not in config. It's a public key by design.
- AC15: If the detached flush fails (network error, PostHog down), events remain on disk and are included in the next flush attempt. Events accumulate across runs until successfully sent.
- AC16: Tests verify: consent persistence, event shape validation (Zod schemas), DO_NOT_TRACK override, non-TTY default, NDJSON append correctness, no-throw guarantees on telemetry failure, mock injection for the HTTP layer.

## Event Design

| Event | Trigger | Properties (beyond anonymousId + timestamp) |
|-------|---------|----------------------------------------------|
| `command_run` | Every command except `ana telemetry *` | `command`, `cliVersion`, `os`, `nodeVersion`, `isCI` |
| `scan_completed` | End of `ana scan` | `duration_ms`, `hasFindings` |
| `init_completed` | End of `ana init` | `duration_ms`, `isReinit`, `detectedStack` |
| `pipeline_started` | `ana work start` | (none) |
| `pipeline_completed` | `ana work complete` | `result`, `duration_ms` |
| `artifact_saved` | `ana artifact save` | `stage` (scope/spec/build-report/verify-report) |
| `error_occurred` | Unhandled exception in main() | `command`, `errorType` |

`detectedStack` is a plain string (e.g., "TypeScript", "Next.js + Prisma"). Not a hash — these are technology names, not PII. Hashing would destroy all analytical value.

`error_occurred` includes `errorType` (the error class name) only. No message text, no stack traces. If richer error data is needed later, it can be added as a separate scope with path-stripping safeguards.

`ana telemetry` subcommands are excluded from `command_run`. Tracking telemetry commands in telemetry is circular and inflates counts.

## Edge Cases & Risks

- **Multiple concurrent CLI invocations.** Two `ana` processes append to the same NDJSON file simultaneously. NDJSON with `appendFileSync` is safe — POSIX guarantees atomic append for writes under PIPE_BUF (4KB+). Individual events are well under this threshold.
- **Config directory doesn't exist.** `~/.config/anatomia/` may not exist on first run. The telemetry module must `mkdirSync({ recursive: true })` before writing. Catch EACCES silently — read-only home directories mean no telemetry, not a crash.
- **Config file corrupted.** JSON parse failure on `telemetry.json` → treat as not-yet-prompted, re-prompt on next interactive run.
- **Pending events file corrupted.** NDJSON lines that fail `JSON.parse()` → skip that line, process the rest. Partial writes from kills only lose the last line.
- **User upgrades CLI.** `cliVersion` in events naturally tracks this. Config schema `version` field enables future migrations if the telemetry config shape changes.
- **User runs in CI.** `isCI` flag on `command_run` separates CI from human usage. Non-TTY means no prompt → disabled by default. Teams wanting CI telemetry can create the config file manually or set an env var.
- **PostHog is unreachable.** Detached child's HTTP request fails. Events file is NOT deleted (AC15). Events accumulate and retry on next successful flush. The file could grow if a user is offline for weeks — the flush script should cap at the most recent N events (e.g., 500) and discard older ones.
- **User has never run `ana init`.** Telemetry works without `.ana/` — it only touches `~/.config/anatomia/`. A user who runs `ana scan` without init still gets the consent prompt and event tracking.
- **`process.exit(1)` in command handlers.** Events from error exits are written to disk (track() is synchronous) but the detached flush spawn in main() is skipped. Events persist and flush on the next successful run. This is acceptable — error events are rare and delayed delivery is fine for telemetry.

## Rejected Approaches

1. **Opt-out model (Next.js/Turborepo style).** Higher data volume but fundamentally conflicts with "verified over trusted." A tool whose identity is verification and trust cannot send data before getting consent. Angular proved opt-in works. Homebrew proved opt-out destroys trust. Non-negotiable.
2. **posthog-node SDK.** 640KB + 2 transitive dependencies to send one HTTPS POST. The detached-spawn + raw-HTTP pattern already exists in `update-check.ts`. Adding a dependency for something Node's stdlib handles is adding complexity. Design principle: "the elegant solution is the one that removes."
3. **`await posthog.shutdown()` before exit.** Blocks the CLI for 100-500ms of network latency. Unacceptable for fast commands (`ana config show`, `ana --version`). Also doesn't work with the 100+ `process.exit(1)` calls in the codebase without refactoring every exit point.
4. **`flushAt: 1, flushInterval: 0` (posthog-node serverless mode).** Events are still in-flight (not awaited) when the process exits. Loses ~100% of events for short-lived CLI commands. The PostHog docs themselves say `await shutdown()` is still required.
5. **Sentry for error reporting (scope 1C).** `@sentry/node` is 1.8MB + ~30 dependencies including the entire OpenTelemetry instrumentation suite. PostHog's `error_occurred` event captures command + error type, which is sufficient at <100 users. Defer Sentry until PostHog error data reveals we're missing stack traces we can't reproduce.
6. **`cli_installed` event.** Unfirable for users who opt out of telemetry, which is exactly the population you'd want to count. npm download stats cover install volume. `command_run` captures active reach. Dropped.
7. **Per-project telemetry toggle.** Unnecessary complexity. One global toggle. If a user needs per-project control, `DO_NOT_TRACK=1` in their shell for specific directories.
8. **Custom proxy endpoint.** No benefit at this scale. PostHog project API keys are public. Direct-to-PostHog eliminates a moving part that can fail.
9. **Disabled by default with passive message in init output.** ~2-5% opt-in rate makes the data useless for funnel analysis. A prompt that takes 1 second to answer isn't friction — it's respect.

## Open Questions

(None for AnaPlan to investigate — all design questions resolved in scope.)

## Exploration Findings

### Patterns Discovered

- `src/utils/update-check.ts` (lines 99-140): Detached child process pattern. Spawns `node -e` with an inline script that does HTTPS, writes to disk, exits. Parent calls `child.unref()` and continues. Proven pattern, zero latency impact. The telemetry flush script mirrors this exactly.
- `src/index.ts` (lines 66-77): `main()` wraps `parseAsync` in try/catch with `process.exit(1)` in catch. The success path returns naturally — flush can be placed after `parseAsync`. The error path calls `process.exit(1)` — events are on disk, flush happens next run.
- `src/commands/config.ts` (lines 30-57): MACHINE_MANAGED_FIELDS and KNOWN_FIELDS patterns. The `ana telemetry` command follows the same subcommand registration pattern as `ana config`.

### Constraints Discovered

- [TYPE-VERIFIED] process.exit(1) prevalence (100+ calls across src/) — graceful shutdown is not viable without major refactor. Disk-write + detached-flush is the only pattern that works with this codebase.
- [TYPE-VERIFIED] Single entry point (tsup.config.ts) — `entry: ['src/index.ts']`. The detached flush script must be either an inline string (like update-check) or a second entry point added to tsup config. Inline is simpler and matches the existing pattern.
- [OBSERVED] No global config directory exists today — the CLI has zero state outside project `.ana/` directories. This scope creates `~/.config/anatomia/` as the first global state. XDG_CONFIG_HOME is respected.
- [OBSERVED] PostHog already in use on website — `website/lib/analytics.tsx` uses `posthog-js` (browser SDK) with `NEXT_PUBLIC_POSTHOG_KEY`. Same PostHog project, different SDK surface. CLI events go to the same project, filtered by a `source: 'cli'` property.

### Test Infrastructure

- `tests/` directory uses Vitest. Tests run with `pnpm vitest run` (the `--run` flag prevents watch mode).
- Telemetry tests should mock the filesystem (`~/.config/anatomia/` reads/writes) and verify event shapes with Zod schemas. The HTTP layer (detached child process) should be tested by verifying the spawn arguments and inline script content, not by making real HTTP requests.

## For AnaPlan

### Structural Analog

**`src/utils/update-check.ts`** — the closest structural match. Same shape: read config from disk, conditionally act, spawn a detached child process for network I/O, write results to disk, silent on all errors. The telemetry module mirrors this file's architecture. Read it first.

### Relevant Code Paths

- `src/utils/update-check.ts` — detached spawn pattern, inline script, cache read/write
- `src/index.ts` — CLI entry point, main() function, where telemetry init/prompt/flush hooks into
- `src/commands/config.ts` — subcommand registration pattern (status/get/set → status/enable/disable/show)
- `src/commands/scan.ts` — instrumentation target, command action structure
- `src/commands/init/index.ts` — instrumentation target, knows `isReinit` and `detectedStack`
- `src/commands/work.ts` — instrumentation target, `work start` and `work complete`
- `src/commands/artifact.ts` — instrumentation target, knows `stage`

### Patterns to Follow

- Detached child process: `update-check.ts` lines 99-140 (spawn, inline script, unref)
- Command registration: `config.ts` command group pattern
- Error handling: every function catches internally, never throws (same as update-check)
- Config location: use `$XDG_CONFIG_HOME/anatomia/` if set, else `~/.config/anatomia/` on macOS/Linux, `%APPDATA%/anatomia/` on Windows

### Known Gotchas

- The inline script in the detached child must use CommonJS (`require('https')`) because it runs as `node -e`, not through the ESM build. Same as update-check.ts.
- `process.exit(1)` in command handlers means the flush spawn in main() is never reached for error exits. The scope accepts this — events persist on disk for next run.
- tsup bundles to a single file (`dist/index.js`). The flush script cannot import from the bundle — it must be self-contained (inline string or separate entry point).
- `writeFileSync` and `appendFileSync` to `~/.config/anatomia/` can fail on read-only filesystems or when HOME is unset. Always catch, always silent.

### Things to Investigate

- The PostHog `/batch` endpoint accepts multiple events in one request. The flush script should use this rather than individual `/capture` calls — one HTTP request regardless of event count.
- The consent prompt needs to handle raw stdin. Check whether Commander's built-in prompt utilities work, or if a minimal readline implementation is needed (no new dependencies).

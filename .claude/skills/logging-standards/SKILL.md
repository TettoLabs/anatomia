---
name: logging-standards
description: "Anatomia logging standards. Invoke when adding log output, debugging output visibility, or considering observability."
---

# Logging Standards — Anatomia

## Current State
No logging framework. CLI output uses `console.log` with `chalk` for formatting. No log levels. No structured logging. No log files.

This is fine for a CLI tool at this stage. Don't add a logging framework until there's a reason.

## CLI Output Conventions
- User-facing output: `console.log` with `chalk` for color (green success, yellow warning, red error)
- Progress indicators: `ora` spinners for long operations
- Error output: `console.error` for errors that should go to stderr
- JSON output: `--json` flag on commands that support it — clean JSON to stdout, no chalk, no spinners
- Silence: commands that produce JSON should produce ONLY JSON when `--json` is passed. No mixing prose and data.

## When to Add Structured Logging
Consider adding a lightweight logger (like `pino` or `consola`) when any of these become true:
- Background processes that need log files (heartbeat daemon, context watcher)
- Server components that need request logging
- Debugging production issues where console.log isn't enough
- Multiple output destinations (file + stdout + external service)

When that time comes:
- Log levels: error, warn, info, debug. Default to info.
- Structured format: JSON lines for machine parsing, human-readable for development.
- No sensitive data in logs. No file contents. No user input beyond identifiers.
- Timestamps on every entry.

## For AnaBuild
If adding a new CLI command: use `console.log` + `chalk` for human output, `console.error` for errors. Support `--json` if the output is data. Don't add a logging library unless the scope specifically calls for it.

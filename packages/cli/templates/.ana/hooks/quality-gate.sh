#!/bin/bash
# Stop hook: block completion if any context file fails verification
#
# This hook fires when Claude Code tries to end a session.
# It blocks completion if any context file fails verification.
#
# Exit codes:
# - 0: Allow session to end
# - 2: Block completion (quality gate failed)

# File-based guard to prevent infinite loops
# (environment variables don't persist across CC's subprocess invocations)
LOCKFILE=".ana/.stop_hook_active"

if [ -f "$LOCKFILE" ]; then
  exit 0
fi

touch "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# Check if .ana/context/ exists (might not be in setup yet)
if [ ! -d ".ana/context" ]; then
  exit 0
fi

# Run full check
RESULT=$(ana setup check --json 2>/dev/null)

if [ $? -eq 0 ]; then
  exit 0
else
  echo "⚠ QUALITY GATE FAILED — Context files have issues:" >&2
  echo "$RESULT" >&2
  echo "" >&2
  echo "Fix the failing checks before completing setup." >&2
  exit 2
fi

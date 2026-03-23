#!/bin/bash
# Stop hook: block completion if any context file fails verification
#
# This hook fires when Claude Code tries to end a session.
# It blocks completion if any context file fails verification.
#
# Exit codes:
# - 0: Allow session to end
# - 2: Block completion (quality gate failed)

# Resolve script location (works regardless of CWD)
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

# File-based guard to prevent infinite loops
# (environment variables don't persist across CC's subprocess invocations)
LOCKFILE="$PROJECT_ROOT/.ana/.stop_hook_active"

if [ -f "$LOCKFILE" ]; then
  exit 0
fi

touch "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# Only run quality gate during verification or completion phase
if [ ! -f "$PROJECT_ROOT/.ana/.setup_state.json" ]; then
  exit 0
fi

PHASE=$(cat "$PROJECT_ROOT/.ana/.setup_state.json" | jq -r '.phase' 2>/dev/null)
if [ -z "$PHASE" ]; then
  PHASE=$(cat "$PROJECT_ROOT/.ana/.setup_state.json" | grep -o '"phase":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ "$PHASE" != "verification" ] && [ "$PHASE" != "complete" ]; then
  exit 0
fi

# Check if .ana/context/ exists (might not be in setup yet)
if [ ! -d "$PROJECT_ROOT/.ana/context" ]; then
  exit 0
fi

# Run full check using the wrapper script
RESULT=$(bash "$HOOK_DIR/run-check.sh" --json 2>&1)
CHECK_EXIT=$?

if [ $CHECK_EXIT -eq 0 ]; then
  exit 0
else
  echo "⚠ QUALITY GATE FAILED — Context files have issues:" >&2
  echo "$RESULT" >&2
  echo "" >&2
  echo "Fix the failing checks before completing setup." >&2
  exit 2
fi

#!/bin/bash
# Stop hook: block completion if any context file fails verification
#
# This hook fires when Claude Code tries to end a session.
# It blocks completion if any context file fails verification.
#
# Exit codes:
# - 0: Allow session to end
# - 2: Block completion (quality gate failed)

# Ensure node/ana are in PATH (hooks run in subprocess without user's shell profile)
if ! command -v node &>/dev/null; then
  # Try common NVM locations
  for NVM_SH in "$HOME/.nvm/nvm.sh" "/opt/homebrew/opt/nvm/nvm.sh" "/usr/local/opt/nvm/nvm.sh"; do
    if [ -s "$NVM_SH" ]; then
      export NVM_DIR="$(dirname "$(dirname "$NVM_SH")")"
      . "$NVM_SH" 2>/dev/null
      break
    fi
  done
fi

# Fallback: check if node exists in common locations
if ! command -v node &>/dev/null; then
  for NODE_DIR in "$HOME/.nvm/versions/node"/*/bin /usr/local/bin /opt/homebrew/bin; do
    if [ -x "$NODE_DIR/node" ]; then
      export PATH="$NODE_DIR:$PATH"
      break
    fi
  done
fi

# File-based guard to prevent infinite loops
# (environment variables don't persist across CC's subprocess invocations)
LOCKFILE=".ana/.stop_hook_active"

if [ -f "$LOCKFILE" ]; then
  exit 0
fi

touch "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# Only run quality gate during verification or completion phase
if [ ! -f ".ana/.setup_state.json" ]; then
  exit 0
fi

PHASE=$(cat .ana/.setup_state.json | jq -r '.phase' 2>/dev/null)
if [ -z "$PHASE" ]; then
  PHASE=$(cat .ana/.setup_state.json | grep -o '"phase":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ "$PHASE" != "verification" ] && [ "$PHASE" != "complete" ]; then
  exit 0
fi

# Check if .ana/context/ exists (might not be in setup yet)
if [ ! -d ".ana/context" ]; then
  exit 0
fi

# Run full check — use ana if available, fallback to node with local CLI path
if command -v ana &>/dev/null; then
  RESULT=$(ana setup check --json 2>/dev/null)
  CHECK_EXIT=$?
elif command -v node &>/dev/null; then
  RESULT=$(node packages/cli/dist/index.js setup check --json 2>/dev/null)
  CHECK_EXIT=$?
else
  # Cannot run verification — allow session to end
  exit 0
fi

if [ $CHECK_EXIT -eq 0 ]; then
  exit 0
else
  echo "⚠ QUALITY GATE FAILED — Context files have issues:" >&2
  echo "$RESULT" >&2
  echo "" >&2
  echo "Fix the failing checks before completing setup." >&2
  exit 2
fi

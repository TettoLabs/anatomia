#!/bin/bash
# PostToolUse hook: verify context files after Write
#
# This hook fires after every Write tool call in Claude Code.
# It checks whether the written file is a context file and runs verification if so.
#
# Exit codes:
# - Always exits 0 (hook informs via additionalContext, does NOT block Write)
#
# The agent sees the failure message and is expected to fix issues.

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

# Read JSON from stdin (CC passes tool_input with file path)
INPUT=$(cat)

# Try jq first (robust JSON parsing), fall back to grep for environments without jq
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  # Fallback: grep parsing for environments without jq
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$FILE_PATH" ]; then
    FILE_PATH=$(echo "$INPUT" | grep -o '"path":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi
fi

# If still no path, exit silently
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check files inside .ana/context/
if [[ ! "$FILE_PATH" == *".ana/context/"* ]]; then
  exit 0
fi

# Extract just the filename
FILENAME=$(basename "$FILE_PATH")

# Run verification — use ana if available, fallback to node with local CLI path
if command -v ana &>/dev/null; then
  RESULT=$(ana setup check "$FILENAME" --json 2>/dev/null)
  CHECK_EXIT=$?
elif command -v node &>/dev/null; then
  RESULT=$(node packages/cli/dist/index.js setup check "$FILENAME" --json 2>/dev/null)
  CHECK_EXIT=$?
else
  # Cannot run verification — inform agent
  echo "{\"additionalContext\": \"⚠ Could not verify $FILENAME — neither ana nor node found in PATH.\"}"
  exit 0
fi

if [ $CHECK_EXIT -eq 0 ]; then
  echo "{\"additionalContext\": \"✓ Verification passed: $FILENAME\"}"
else
  # Extract failure details from JSON (if available)
  echo "{\"additionalContext\": \"⚠ VERIFICATION FAILED: $FILENAME — Run 'ana setup check $FILENAME' for details. Fix issues before proceeding.\"}"
fi

exit 0

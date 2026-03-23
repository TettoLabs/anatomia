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

# Resolve script location (works regardless of CWD)
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

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

# Run verification using the wrapper script
RESULT=$(bash "$HOOK_DIR/run-check.sh" "$FILENAME" --json 2>&1)
CHECK_EXIT=$?

# Write results to a per-file check result on disk — NO stdout
# This prevents broadcast to parallel agents via additionalContext
RESULT_DIR="$PROJECT_ROOT/.ana/.state"
mkdir -p "$RESULT_DIR"
RESULT_FILE="$RESULT_DIR/check_result_${FILENAME}"

if [ $CHECK_EXIT -eq 0 ]; then
  echo "PASS" > "$RESULT_FILE"
else
  echo "FAIL" > "$RESULT_FILE"
  echo "$RESULT" >> "$RESULT_FILE"
fi

exit 0

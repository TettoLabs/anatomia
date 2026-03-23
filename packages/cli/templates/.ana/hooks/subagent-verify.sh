#!/bin/bash
# SubagentStop hook: verify context files after writer completes
# Exit 2 blocks the sub-agent from completing if verification fails

# Resolve script location (works regardless of CWD)
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

CONTEXT_DIR="$PROJECT_ROOT/.ana/context"
if [ ! -d "$CONTEXT_DIR" ]; then
  exit 0
fi

# Parse the assigned file from the sub-agent's last message
INPUT=$(cat)

# Try to extract filename from last_assistant_message
ASSIGNED_FILE=""
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null)
if [ -n "$LAST_MSG" ]; then
  # Look for context filenames mentioned in the agent's final message
  for candidate in project-overview.md conventions.md patterns.md architecture.md testing.md workflow.md debugging.md; do
    if echo "$LAST_MSG" | grep -q "$candidate"; then
      ASSIGNED_FILE="$candidate"
      break
    fi
  done
fi

# Fallback: most recently modified context file
if [ -z "$ASSIGNED_FILE" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    ASSIGNED_FILE=$(ls -t "$CONTEXT_DIR"/*.md 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  else
    ASSIGNED_FILE=$(ls -t "$CONTEXT_DIR"/*.md 2>/dev/null | head -1 | xargs -r basename 2>/dev/null)
  fi
fi

# If still nothing, skip (not a writer agent)
if [ -z "$ASSIGNED_FILE" ] || [ ! -f "$CONTEXT_DIR/$ASSIGNED_FILE" ]; then
  exit 0
fi

# Run check on ONLY this agent's file
RESULT=$(bash "$HOOK_DIR/run-check.sh" "$ASSIGNED_FILE" --json 2>&1)
CHECK_EXIT=$?

# Write detailed results to disk for the writer to read
RESULT_DIR="$PROJECT_ROOT/.ana/.state"
mkdir -p "$RESULT_DIR"
echo "$RESULT" > "$RESULT_DIR/check_result_${ASSIGNED_FILE}"

if [ $CHECK_EXIT -ne 0 ]; then
  PASSED=$(echo "$RESULT" | grep -o '"overall":[[:space:]]*true' | head -1)
  if [ -z "$PASSED" ]; then
    echo "Check failed for $ASSIGNED_FILE. Read .ana/.state/check_result_${ASSIGNED_FILE} for details." >&2
    exit 2
  fi
fi

exit 0

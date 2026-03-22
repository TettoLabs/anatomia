#!/bin/bash
# SubagentStop hook: verify context files after writer completes
# Exit 2 blocks the sub-agent from completing if verification fails

# Resolve script location (works regardless of CWD)
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

# Find recently modified context files (last 60 seconds)
CONTEXT_DIR="$PROJECT_ROOT/.ana/context"
if [ ! -d "$CONTEXT_DIR" ]; then
  exit 0
fi

FAILURES=""
for file in "$CONTEXT_DIR"/*.md; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")

  # Skip files not modified in last 60 seconds
  if [ "$(uname)" = "Darwin" ]; then
    mod_time=$(stat -f %m "$file")
  else
    mod_time=$(stat -c %Y "$file")
  fi
  now=$(date +%s)
  age=$(( now - mod_time ))
  if [ $age -gt 60 ]; then
    continue
  fi

  # Run check using the wrapper script
  RESULT=$(bash "$HOOK_DIR/run-check.sh" "$filename" --json 2>&1)
  CHECK_EXIT=$?

  # Check if overall passed (check both exit code and JSON content)
  if [ $CHECK_EXIT -ne 0 ]; then
    FAILURES="$FAILURES\n⚠ $filename FAILED verification:\n$RESULT\n"
  else
    PASSED=$(echo "$RESULT" | grep -o '"overall":true' | head -1)
    if [ -z "$PASSED" ]; then
      FAILURES="$FAILURES\n⚠ $filename FAILED verification:\n$RESULT\n"
    fi
  fi
done

if [ -n "$FAILURES" ]; then
  echo -e "$FAILURES" >&2
  echo "Fix the failing checks before finishing." >&2
  exit 2
fi

exit 0

#!/bin/bash
# SubagentStop hook: verify context files after writer completes
# Exit 2 blocks the sub-agent from completing if verification fails

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

if ! command -v node &>/dev/null; then
  for NODE_DIR in "$HOME/.nvm/versions/node"/*/bin /usr/local/bin /opt/homebrew/bin; do
    if [ -x "$NODE_DIR/node" ]; then
      export PATH="$NODE_DIR:$PATH"
      break
    fi
  done
fi

# Find recently modified context files (last 60 seconds)
CONTEXT_DIR=".ana/context"
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

  # Run check — use ana if available, fallback to node with local CLI path
  if command -v ana &>/dev/null; then
    RESULT=$(ana setup check "$filename" --json 2>/dev/null)
    CHECK_EXIT=$?
  elif command -v node &>/dev/null; then
    RESULT=$(node packages/cli/dist/index.js setup check "$filename" --json 2>/dev/null)
    CHECK_EXIT=$?
  else
    continue
  fi

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

#!/bin/bash
# Wrapper: run ana setup check with proper PATH and CLI resolution
# Usage: bash .ana/hooks/run-check.sh [filename] [--json]

# Get the directory this script lives in (works even when called from different CWD)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Ensure node is in PATH
if ! command -v node &>/dev/null; then
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

# Strategy 1: ana is globally installed
if command -v ana &>/dev/null; then
  ana setup check "$@"
  exit $?
fi

# Strategy 2: Read saved CLI path from ana init
CLI_PATH_FILE="$PROJECT_ROOT/.ana/.state/cli-path"
if [ -f "$CLI_PATH_FILE" ]; then
  # Parse JSON for node and cli paths
  NODE_BIN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CLI_PATH_FILE','utf8')).node)" 2>/dev/null)
  CLI_ENTRY=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CLI_PATH_FILE','utf8')).cli)" 2>/dev/null)

  if [ -n "$NODE_BIN" ] && [ -n "$CLI_ENTRY" ] && [ -x "$NODE_BIN" ] && [ -f "$CLI_ENTRY" ]; then
    "$NODE_BIN" "$CLI_ENTRY" setup check "$@"
    exit $?
  fi
fi

# Strategy 3: npx as last resort
if command -v npx &>/dev/null; then
  npx --yes anatomia-cli setup check "$@" 2>/dev/null
  exit $?
fi

# Nothing worked — clear error
echo '{"error": "Cannot find ana CLI. Install globally (npm i -g anatomia-cli) or re-run ana init."}' >&2
exit 1

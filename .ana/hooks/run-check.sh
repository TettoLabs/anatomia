#!/bin/bash
# Wrapper: run ana setup check with proper PATH
# Usage: bash .ana/hooks/run-check.sh [filename] [--json]
#
# Handles NVM/PATH discovery so callers don't need to.

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

if ! command -v node &>/dev/null; then
  echo '{"error": "node not found in PATH. Cannot run verification."}' >&2
  exit 1
fi

# Run the check
if command -v ana &>/dev/null; then
  ana setup check "$@"
else
  node packages/cli/dist/index.js setup check "$@"
fi

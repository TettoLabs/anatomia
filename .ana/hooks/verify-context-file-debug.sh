#!/bin/bash
# Debug version — logs to file to prove execution
echo "$(date): HOOK FIRED — verify-context-file-debug.sh" >> /tmp/anatomia-hook-debug.log
INPUT=$(cat)
echo "$(date): INPUT: $INPUT" >> /tmp/anatomia-hook-debug.log

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
echo "$(date): FILE_PATH: $FILE_PATH" >> /tmp/anatomia-hook-debug.log

if [[ ! "$FILE_PATH" == *".ana/context/"* ]]; then
  echo "$(date): Not a context file, exiting" >> /tmp/anatomia-hook-debug.log
  exit 0
fi

echo '{"additionalContext": "HOOK_DEBUG: verify-context-file fired for '"$FILE_PATH"'"}'
echo "$(date): Returned additionalContext" >> /tmp/anatomia-hook-debug.log
exit 0

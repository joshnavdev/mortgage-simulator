#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "Blocked: recursive rm is prohibited. You may delete individual files with rm (no -r flag) or the Delete tool, but you cannot recursively delete directories. If you need a directory removed, tell the human.",
  "user_message": "Blocked recursive rm command"
}'

exit 0

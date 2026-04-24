#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "BLOCKED: This is an extremely dangerous system command. Absolutely prohibited.",
  "user_message": "Blocked dangerous system command"
}'

exit 0

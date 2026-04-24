#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "BLOCKED: Publishing packages is prohibited. This must be done manually through proper release process.",
  "user_message": "Blocked publish command - packages must be published manually"
}'

exit 0

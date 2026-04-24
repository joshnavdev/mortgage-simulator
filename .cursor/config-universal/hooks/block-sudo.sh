#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "BLOCKED: sudo is prohibited. No elevated privileges should be needed in normal development.",
  "user_message": "Blocked sudo - no elevated privileges allowed"
}'

exit 0

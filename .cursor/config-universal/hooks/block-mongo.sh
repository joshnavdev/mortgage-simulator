#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "BLOCKED: mongosh/mongo CLI is prohibited. Use mongodb MCP instead:\n\n- mongodb.find for queries\n- mongodb.aggregate for pipelines\n- mongodb.count for counting\n- mongodb.listCollections for listing",
  "user_message": "Blocked mongo CLI - agent must use MongoDB MCP"
}'

exit 0

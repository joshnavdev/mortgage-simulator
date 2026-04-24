#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "Blocked: direct gh CLI usage is prohibited. Use the pr-workflow MCP server instead (get_pr_feedback, get_ci_failure_logs, reply_to_pr_comment, resolve_pr_comment, etc.). The MCP handles pagination, response formatting, and rate limiting automatically. Do NOT retry with gh commands.",
  "user_message": "Blocked agent gh CLI access — use pr-workflow MCP"
}'

exit 0

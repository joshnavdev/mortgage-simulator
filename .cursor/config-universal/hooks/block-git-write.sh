#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "BLOCKED: You are NEVER allowed to run git write commands (add, commit, push, reset, checkout, stash, branch -d). The user will handle all git operations manually. Do NOT attempt to retry or work around this.",
  "user_message": "Blocked agent git write command"
}'

exit 0

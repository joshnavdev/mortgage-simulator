#!/usr/bin/env bash
set -euo pipefail

cat > /dev/null

jq -n '{
  "permission": "deny",
  "agent_message": "BLOCKED: Writing to ~/.cursor/extensions/local.dc via shell is prohibited. That path is a symlink to source — writing through it destroys source files. Use `yarn test-consumer-install` which safely unlinks the symlink first.",
  "user_message": "Blocked write to extension dir (symlink to source). Use: yarn test-consumer-install"
}'

exit 0

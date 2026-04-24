#!/usr/bin/env bash
# Load .env.dev into the MCP server child process and exec the given command.
# Env vars are isolated to this process only — never pollutes the parent.
ENV_FILE="${DC_ROOT:-.}/.env.dev"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi
if [[ $# -eq 0 ]]; then
  echo "load-env.sh: no command provided" >&2
  exit 1
fi
exec "$@"

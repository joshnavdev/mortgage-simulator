#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null || true)

# Normalize all whitespace (tabs, etc.) to single spaces up front
CMD=$(echo "$CMD" | tr '\t' ' ')

if [[ -z "$CMD" ]]; then
  jq -n '{
    "permission": "deny",
    "agent_message": "BLOCKED: could not parse command from hook input.",
    "user_message": "Blocked kill command - could not parse input"
  }'
  exit 0
fi

deny() {
  jq -n --arg msg "$1" '{
    "permission": "deny",
    "agent_message": ("BLOCKED: " + $msg),
    "user_message": ("Blocked: " + $msg)
  }'
  exit 0
}

allow() {
  jq -n '{"permission": "allow"}'
  exit 0
}

if echo "$CMD" | grep -qE '(^|[;&|] *)killall '; then
  deny "killall is prohibited — it kills by process name and can hit system processes."
fi

# This hook is only invoked for pkill commands that lack -f (the hooks.json
# matcher uses a negative lookahead to let "pkill -f" through).
if echo "$CMD" | grep -qE '(^|[;&|] *)pkill '; then
  deny "pkill (without -f) is prohibited — it kills by name and can hit unintended processes. Use kill <PID> instead."
fi

# ---------------------------------------------------------------------------
# Allowlist approach: match the ENTIRE kill invocation against known-safe
# patterns instead of trying to parse arbitrary flag combinations.
#
# Allowed forms (one or more positive integer PIDs):
#   kill <PIDs>
#   kill -<SIGNAL> <PIDs>        e.g. kill -9 12345, kill -TERM 12345
#   kill -s <SIGNAL> <PIDs>      e.g. kill -s TERM 12345
#   kill -n <SIGNUM> <PIDs>      e.g. kill -n 9 12345
#   kill -- <PIDs>               e.g. kill -- 12345
#   kill -<SIGNAL> -- <PIDs>     e.g. kill -9 -- 12345
#
# "PIDs" = one or more space-separated tokens, each matching [1-9][0-9]*
# (positive integers only — no zero, no negatives, no names).
# ---------------------------------------------------------------------------

PIDS_RE='[1-9][0-9]*( +[1-9][0-9]*)*'
# SIG_RE matches inline signal flags like -9, -TERM, -HUP, -SIGKILL.
# Excludes -s and -n (single-letter option prefixes that take a separate arg).
# Real signal names are 2+ alphabetic chars (TERM, HUP, INT, SIGKILL, etc.).
SIG_RE='-([0-9]+|[A-Za-z][A-Za-z0-9]+)'

SAFE_PATTERNS=(
  "^kill +${PIDS_RE}$"
  "^kill +${SIG_RE} +${PIDS_RE}$"
  "^kill +${SIG_RE} +-- +${PIDS_RE}$"
  "^kill +-s +[A-Za-z0-9]+ +${PIDS_RE}$"
  "^kill +-s +[A-Za-z0-9]+ +-- +${PIDS_RE}$"
  "^kill +-n +[0-9]+ +${PIDS_RE}$"
  "^kill +-n +[0-9]+ +-- +${PIDS_RE}$"
  "^kill +-- +${PIDS_RE}$"
)

# Check every kill invocation in the command (handles chained commands)
FOUND_KILL=false
while IFS= read -r segment; do
  [[ -z "$segment" ]] && continue
  FOUND_KILL=true

  # Normalize: strip leading separators, collapse whitespace
  local_cmd=$(echo "$segment" | sed 's/^[;&| ]*//' | tr -s ' ' | sed 's/ *$//')

  matched=false
  for pattern in "${SAFE_PATTERNS[@]}"; do
    if [[ "$local_cmd" =~ $pattern ]]; then
      matched=true
      break
    fi
  done

  if ! $matched; then
    deny "kill command not in allowed form. Only 'kill [signal] <positive-PID>...' is permitted. Got: $local_cmd"
  fi
done < <(echo "$CMD" | grep -oE '(^|[;&|] *)kill [^;&|]*' || true)

if ! $FOUND_KILL; then
  deny "Unrecognized kill variant."
fi

allow

#!/usr/bin/env bash
# Backstop failure alert used by the workflows' `if: failure()` step (covers crashes before the
# Node code could send its own alert). Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
set -uo pipefail
[ -z "${TELEGRAM_BOT_TOKEN:-}" ] && exit 0
JOB="${1:-job}"
URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
TEXT="⚠️ ${JOB} workflow failed. Logs: ${URL}"
curl -sS -o /dev/null -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=${TEXT}" || true

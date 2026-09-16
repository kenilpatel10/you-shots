#!/usr/bin/env bash
# Commit data/state.json back to the repo from a GitHub Actions job.
# Handles concurrent pushes with rebase + retry. Uses [skip ci] so it never triggers CI.
set -euo pipefail

if git diff --quiet -- data/state.json; then
  echo "state.json unchanged; nothing to commit"
  exit 0
fi

git config user.name "bolt-shorts[bot]"
git config user.email "bolt-shorts-bot@users.noreply.github.com"
git add data/state.json
git commit -m "chore(state): ${1:-update state} [skip ci]"

for attempt in 1 2 3 4 5; do
  if git pull --rebase origin "${GITHUB_REF_NAME:-main}" && git push origin "HEAD:${GITHUB_REF_NAME:-main}"; then
    echo "state committed (attempt $attempt)"
    exit 0
  fi
  echo "push failed, retrying in $((attempt * 5))s"
  sleep $((attempt * 5))
done
echo "could not push state after 5 attempts" >&2
exit 1

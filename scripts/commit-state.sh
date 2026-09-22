#!/usr/bin/env bash
# Commit data/state.json back to the repo from a GitHub Actions job.
# Concurrent jobs (a language matrix, an hourly publish) may have pushed their own state in the
# meantime: on a rebase conflict the two files are merged semantically (scripts/merge-state.mjs)
# instead of failing. Uses [skip ci] so it never triggers CI.
set -euo pipefail

branch="${GITHUB_REF_NAME:-main}"
if git diff --quiet -- data/state.json; then
  echo "state.json unchanged; nothing to commit"
  exit 0
fi

git config user.name "bolt-shorts[bot]"
git config user.email "bolt-shorts-bot@users.noreply.github.com"
cp data/state.json /tmp/state.ours.json

for attempt in 1 2 3 4 5; do
  git fetch -q origin "$branch"
  # Start from the remote tip and lay our state on top of it: never a textual conflict.
  git checkout -q -B "$branch" "origin/$branch"
  git show "origin/$branch:data/state.json" > /tmp/state.theirs.json 2>/dev/null || echo '{"version":3}' > /tmp/state.theirs.json
  node scripts/merge-state.mjs /tmp/state.ours.json /tmp/state.theirs.json data/state.json
  if git diff --quiet -- data/state.json; then
    echo "remote state already contains our changes"
    exit 0
  fi
  git add data/state.json
  git commit -q -m "chore(state): ${1:-update state} [skip ci]"
  if git push origin "HEAD:$branch"; then
    echo "state committed (attempt $attempt)"
    exit 0
  fi
  echo "push rejected (someone pushed first), retrying in $((attempt * 5))s"
  git reset -q --hard "origin/$branch"
  sleep $((attempt * 5))
done
echo "could not push state after 5 attempts" >&2
exit 1

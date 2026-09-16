#!/usr/bin/env bash
# Detached end-to-end dry-run renders (Short, then weekly) used for the proof pack.
cd "$(dirname "$0")/.."
export ALLOW_PLACEHOLDER_VOICE=${ALLOW_PLACEHOLDER_VOICE:-1} REMOTION_CONCURRENCY=${REMOTION_CONCURRENCY:-4}
echo "=== SHORT $(date -u +%T)"
npm run generate -- --dry-run --placeholder-voice --fallback 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== WEEKLY $(date -u +%T)"
npm run weekly -- --dry-run --placeholder-voice 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== DONE $(date -u +%T)"

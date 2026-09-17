#!/usr/bin/env bash
# Detached end-to-end dry-run renders (Short, then weekly) used for the proof pack.
cd "$(dirname "$0")/.."
export REMOTION_CONCURRENCY=${REMOTION_CONCURRENCY:-4}
VOICE=${VOICE:-espeak}
echo "=== SHORT $(date -u +%T)"
npm run generate -- --dry-run --voice "$VOICE" --fallback 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== WEEKLY $(date -u +%T)"
npm run weekly -- --dry-run --voice "$VOICE" 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== DONE $(date -u +%T)"

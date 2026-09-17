#!/usr/bin/env bash
# Detached end-to-end dry-run renders used for the proof pack: English Short, Hindi Short, design sheet, weekly.
cd "$(dirname "$0")/.."
export REMOTION_CONCURRENCY=${REMOTION_CONCURRENCY:-4}
VOICE=${VOICE:-espeak}
echo "=== SHORT-EN $(date -u +%T)"
npm run generate -- --dry-run --voice "$VOICE" --fallback 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== SHORT-HI $(date -u +%T)"
CHANNEL_LANGUAGE=hi npm run generate -- --dry-run --voice "$VOICE" --fallback 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== SHOWCASE $(date -u +%T)"
npm run showcase -- --still-only 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== WEEKLY $(date -u +%T)"
npm run weekly -- --dry-run --voice "$VOICE" 2>&1 | grep -v "^>" | grep -v -i "memory\|docker"
echo "=== DONE $(date -u +%T)"

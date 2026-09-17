#!/usr/bin/env bash
# Detached Hindi dry run with the Gemini voice (proof render). Log: out/hi-dryrun.log
cd "$(dirname "$0")/.."
export CHANNEL_LANGUAGE=hi
export REMOTION_CONCURRENCY=2
npm run generate -- --dry-run --force > out/hi-dryrun.log 2>&1
echo "EXIT=$?" >> out/hi-dryrun.log

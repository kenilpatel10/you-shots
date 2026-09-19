#!/usr/bin/env bash
# Detached dry run for one channel. Usage: scripts/dryrun.sh <persona/lang> [generate args…]
# Log: out/dryrun-<persona>-<lang>.log (ends with EXIT=<code>)
cd "$(dirname "$0")/.."
channel="$1"; shift
export CHANNEL="$channel"
export REMOTION_CONCURRENCY="${REMOTION_CONCURRENCY:-2}"
log="out/dryrun-${channel//\//-}.log"
mkdir -p out
npm run generate -- --dry-run --force "$@" > "$log" 2>&1
echo "EXIT=$?" >> "$log"

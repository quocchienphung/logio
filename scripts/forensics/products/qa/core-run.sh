#!/usr/bin/env bash
# Starts the dev server on :3102 (webpack; turbopack rejects the worktree's node_modules symlink), runs the
# given core-qa scenarios ("scenario[:width[:height[:path]]]"), then stops the server by PID.
# bash scripts/forensics/products/qa/core-run.sh <outDir> gradient sticky:390:844 tooltip:1440:900:/tax ...
set -u
cd "$(dirname "$0")/../../../.."
OUT="$1"; shift
LOG="$OUT/dev3102.log"
mkdir -p "$OUT"
npx next dev --webpack -p 3102 >"$LOG" 2>&1 &
SERVER=$!
for _ in $(seq 1 60); do
  curl -s -o /dev/null http://localhost:3102/favicon.ico && break
  sleep 1
done
for spec in "$@"; do
  IFS=: read -r scenario width height path <<<"$spec"
  echo "=== $spec"
  # compile the route before the browser opens it (keeps peak memory down)
  [ -n "${path:-}" ] && curl -s -o /dev/null --max-time 300 "http://localhost:3102${path}"
  QA_PATH="${path:-}" timeout 400 node scripts/forensics/products/qa/core-qa.mjs "$scenario" http://localhost:3102 "${width:-1440}" "${height:-900}" "$OUT" 2>&1 | grep -v "GL Driver"
done
# stop the server and its children (npx → sh → node) by PID
kill_tree() {
  local child
  for child in $(pgrep -P "$1"); do kill_tree "$child"; done
  kill "$1" 2>/dev/null
}
kill_tree "$SERVER"
wait "$SERVER" 2>/dev/null
exit 0

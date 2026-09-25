#!/usr/bin/env bash
# Runs core-qa scenarios ("scenario[:width[:height[:path]]]") against an already running :3102 server.
# bash scripts/forensics/products/qa/core-batch.sh <outDir> sweep:390:844:/tax ...
set -u
cd "$(dirname "$0")/../../../.."
OUT="$1"; shift
wait_server() {
  for _ in $(seq 1 180); do
    curl -s -o /dev/null --max-time 5 http://localhost:3102/favicon.ico && return 0
    sleep 2
  done
  return 1
}
for spec in "$@"; do
  IFS=: read -r scenario width height path <<<"$spec"
  echo "=== $spec"
  wait_server || { echo "server down"; exit 1; }
  [ -n "${path:-}" ] && curl -s -o /dev/null --max-time 300 "http://localhost:3102${path}"
  QA_PATH="${path:-}" timeout 400 node scripts/forensics/products/qa/core-qa.mjs "$scenario" http://localhost:3102 "${width:-1440}" "${height:-900}" "$OUT" 2>&1 | grep -v -e "GL Driver" -e "^shot "
done

#!/usr/bin/env bash
# Runs shot.mjs (console errors, hydration warnings, horizontal overflow) on the carousels test pages at
# the four QA viewports. Usage: bash scripts/forensics/products/qa/carousels-pages.sh <log> [pages...]
LOG="$1"; shift
PAGES=("$@")
[ ${#PAGES[@]} -eq 0 ] && PAGES=(/payments /data-pipeline /payments/link /payments/payment-methods /terminal /tax /revenue-recognition /financial-connections /payments/checkout /authorization-boost /sigma)
: > "$LOG"
for p in "${PAGES[@]}"; do
  for v in "1440 900" "1280 800" "768 1024" "390 844"; do
    echo "== $p $v" >> "$LOG"
    # shellcheck disable=SC2086
    if ! timeout 400 node scripts/forensics/products/shot.mjs "http://localhost:3103$p" - $v 1 >> "$LOG" 2>&1; then
      echo "RETRY" >> "$LOG"
      sleep 20
      timeout 400 node scripts/forensics/products/shot.mjs "http://localhost:3103$p" - $v 1 >> "$LOG" 2>&1
    fi
  done
done
echo DONE >> "$LOG"

#!/usr/bin/env bash
# Run every harness and report honestly.
#
# Checks EXIT CODES, never output text. Grepping for the word "passed" once
# matched "69 passed, 10 failed" and called the suite green.
#
#   ./test-harness/run-all.sh
set -uo pipefail
cd "$(dirname "$0")/.."

# Mrinal and Ramesh are in the UK, and the plan spans 25 October 2026 — the day
# the clocks go back. A date bug that misaligned the last six weeks of the plan
# was invisible in UTC. The suite runs where the users are.
export TZ=Europe/London

# datalock runs FIRST and deliberately so. Every gram in the app is computed
# from src/data, so one wrong composition value moves every screen, both
# people's targets and every shopping quantity at once. If it fails, stop — it
# is a finding, not an obstacle, and goldens.json is not regenerated to make a
# build pass. That needs a written reason in DECISIONS.md.
HARNESSES=(datalock calendartest macrotest solvertest swaptest vegtest duptest packtest)
# uat.mjs is last and separate: it needs the BUILT index.html and a real browser,
# so it is the only harness that can catch a defect the data cannot see. Three
# already: a stray </style> that made a whole stylesheet inert, the bottom nav
# covering the last row of every list, and `hidden` losing to `.strip{display:flex}`.

ESB=./node_modules/.bin/esbuild
total=0
failed=()
for t in "${HARNESSES[@]}"; do
  [ -f "test-harness/$t.ts" ] || { printf "%-12s \033[33mnot written yet\033[0m\n" "$t"; continue; }
  if ! $ESB "test-harness/$t.ts" --bundle --format=esm --platform=node \
       --outfile="/tmp/nutr-$t.mjs" --log-level=error 2>/tmp/nutr-$t.err; then
    printf "%-12s \033[31mBUNDLE FAILED\033[0m  %s\n" "$t" "$(head -3 /tmp/nutr-$t.err | tr '\n' ' ')"
    failed+=("$t"); continue
  fi
  out=$(node "/tmp/nutr-$t.mjs" 2>&1); code=$?
  n=$(printf '%s' "$out" | grep -oE '[0-9]+ assertions passed' | grep -oE '^[0-9]+')
  if [ $code -ne 0 ]; then
    printf "%-12s \033[31mFAILED\033[0m\n" "$t"
    printf '%s\n' "$out" | sed 's/^/               /' | head -25
    failed+=("$t")
  else
    printf "%-12s \033[32mok\033[0m  %s assertions\n" "$t" "${n:-?}"
    total=$((total + ${n:-0}))
  fi
done

# --- browser harnesses, against the BUILT file ---
for t in statetest uat; do
if [ -f "test-harness/$t.mjs" ]; then
  if [ ! -f index.html ]; then
    printf "%-12s \033[33mno index.html — run npm run build\033[0m\n" "$t"
  elif [ ! -d node_modules/playwright ]; then
    printf "%-12s \033[33mplaywright not installed\033[0m\n" "$t"
  else
    out=$(node "test-harness/$t.mjs" 2>&1); code=$?
    n=$(printf '%s' "$out" | grep -oE '[0-9]+ assertions passed' | grep -oE '^[0-9]+')
    if [ $code -ne 0 ]; then
      printf "%-12s \033[31mFAILED\033[0m\n" "$t"
      printf '%s\n' "$out" | sed 's/^/               /' | head -30
      failed+=("$t")
    else
      printf "%-12s \033[32mok\033[0m  %s assertions\n" "$t" "${n:-?}"
      total=$((total + ${n:-0}))
    fi
  fi
fi
done

echo "─────────────────────────────────────"
if [ ${#failed[@]} -ne 0 ]; then
  printf "\033[31m%d harness(es) FAILED: %s\033[0m\n" "${#failed[@]}" "${failed[*]}"
  exit 1
fi
printf "\033[32mall harnesses passed — %d assertions\033[0m\n" "$total"

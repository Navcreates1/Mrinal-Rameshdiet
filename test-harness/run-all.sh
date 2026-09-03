#!/usr/bin/env bash
# Run every harness and report honestly.
#
# Checks EXIT CODES, never output text. Grepping for the word "passed" once
# matched "69 passed, 10 failed" and called the suite green.
#
#   ./test-harness/run-all.sh
set -uo pipefail
cd "$(dirname "$0")/.."

# datalock runs FIRST and deliberately so. Every gram in the app is computed
# from src/data, so one wrong composition value moves every screen, both
# people's targets and every shopping quantity at once. If it fails, stop — it
# is a finding, not an obstacle, and goldens.json is not regenerated to make a
# build pass. That needs a written reason in DECISIONS.md.
HARNESSES=(datalock macrotest solvertest swaptest vegtest duptest packtest)

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

echo "─────────────────────────────────────"
if [ ${#failed[@]} -ne 0 ]; then
  printf "\033[31m%d harness(es) FAILED: %s\033[0m\n" "${#failed[@]}" "${failed[*]}"
  exit 1
fi
printf "\033[32mall harnesses passed — %d assertions\033[0m\n" "$total"

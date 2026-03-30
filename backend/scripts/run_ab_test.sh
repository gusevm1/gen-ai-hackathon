#!/bin/bash
# Run A/B test: analyze 3 test listings in both modes.
#
# Usage:
#   ./backend/scripts/run_ab_test.sh [--mode websearch|apify|both]
#
# Default: both modes. Results saved to backend/scripts/output/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test listings (selected for variety):
# - 156899: 2.5 rooms, CHF 2870, Adliswil (8134) — suburban, has images
# - 399674: 3.0 rooms, CHF 1630, Le Locle (2400) — smaller city, has images
# - 51159:  2.0 rooms, CHF 1800, Zürich (8005) — city center, shared apt
TEST_LISTINGS=(156899 399674 51159)

MODE="${1:---mode}"
if [[ "$MODE" == "--mode" ]]; then
  MODE="${2:-both}"
fi

echo "=== HomeMatch Research Agent A/B Test ==="
echo "Listings: ${TEST_LISTINGS[*]}"
echo "Mode: $MODE"
echo ""

run_single() {
  local listing_id=$1
  local mode=$2
  local output="$SCRIPT_DIR/output/${listing_id}_${mode}.json"

  echo "--- Analyzing listing $listing_id (mode: $mode) ---"
  "$SCRIPT_DIR/analyze_listing.sh" "$listing_id" --mode "$mode"

  # Rename output to include mode suffix
  if [ -f "$SCRIPT_DIR/output/${listing_id}.json" ]; then
    mv "$SCRIPT_DIR/output/${listing_id}.json" "$output"
    echo "Output: $output ($(wc -c < "$output") bytes)"
  fi
  echo ""
}

if [[ "$MODE" == "both" ]]; then
  for lid in "${TEST_LISTINGS[@]}"; do
    run_single "$lid" "websearch"
    run_single "$lid" "apify"
  done
elif [[ "$MODE" == "websearch" || "$MODE" == "apify" ]]; then
  for lid in "${TEST_LISTINGS[@]}"; do
    run_single "$lid" "$MODE"
  done
else
  echo "Invalid mode: $MODE"
  exit 1
fi

echo "=== A/B Test Complete ==="
echo "Results in: $SCRIPT_DIR/output/"
ls -la "$SCRIPT_DIR/output/"*.json 2>/dev/null || echo "(no output files found)"

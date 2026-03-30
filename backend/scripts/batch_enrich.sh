#!/bin/bash
# Batch-enrich listings using Claude Code research agents in parallel.
#
# Usage:
#   ./backend/scripts/batch_enrich.sh [options]
#
# Options:
#   -j N          Number of parallel jobs (default: 15)
#   -m MODE       Research mode: websearch (default) or apify
#   -l FILE       File with listing IDs, one per line (default: auto-fetch from Flatfox)
#   -c CITY_ZIP   Zipcode prefix to filter, e.g. "80" for Zürich 8000-8099 (default: 80)
#   --skip-fetch  Don't fetch listing IDs, use existing /tmp/enrich_pks.txt
#   --dry-run     Show what would be done without running
#
# Output:
#   backend/scripts/output/<listing_id>.json   — per-listing research JSON
#   backend/scripts/output/batch_log.txt       — progress log with timing
#
# After completion, save all results to Supabase:
#   cd backend && for f in scripts/output/*.json; do python -m scripts.save_research "$f"; done

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
LOG_FILE="$OUTPUT_DIR/batch_log.txt"
PK_FILE="/tmp/enrich_pks.txt"

JOBS=15
MODE="websearch"
CITY_ZIP="80"
SKIP_FETCH=false
DRY_RUN=false
LISTING_FILE=""
ORCHESTRATOR_MODEL="sonnet"
RESEARCHER_MODEL="haiku"

# Parse args
while [ $# -gt 0 ]; do
  case "$1" in
    -j) JOBS="$2"; shift 2 ;;
    -m) MODE="$2"; shift 2 ;;
    -l) LISTING_FILE="$2"; shift 2 ;;
    -c) CITY_ZIP="$2"; shift 2 ;;
    --orchestrator) ORCHESTRATOR_MODEL="$2"; shift 2 ;;
    --researcher) RESEARCHER_MODEL="$2"; shift 2 ;;
    --skip-fetch) SKIP_FETCH=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

mkdir -p "$OUTPUT_DIR"

# Source .env for APIFY_TOKEN
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
unset ANTHROPIC_API_KEY

# ── Usage monitoring helpers ──────────────────────────────────────────────
USAGE_FILE="$HOME/.claude/usage_data.json"
REFRESH_SCRIPT="$HOME/.claude/refresh-usage.sh"
SESSION_THRESHOLD=95

refresh_usage() {
  bash "$REFRESH_SCRIPT" 2>/dev/null
}

# Read a field from usage_data.json: get_usage_field '.session.percent'
get_usage_field() {
  python3 -c "import json; d=json.load(open('$USAGE_FILE')); print(eval('d' + '$1'.replace('.', \"['\").replace(\"['\", \"['\", 1) + \"'\"]\" if '.' in '$1' else 'd$1'))" 2>/dev/null || echo "0"
}

# Safer jq-style read
read_usage() {
  python3 -c "
import json, sys
d = json.load(open('$USAGE_FILE'))
keys = '$1'.strip('.').split('.')
v = d
for k in keys:
    v = v.get(k, {}) if isinstance(v, dict) else 0
print(v)
" 2>/dev/null || echo "0"
}

# ── PREFLIGHT: Verify Claude CLI uses Max subscription, NOT API credits ──
echo "Running auth preflight check..."
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ABORT: ANTHROPIC_API_KEY is set in environment!"
  echo "This would charge API credits instead of using your Max subscription."
  exit 1
fi

# Refresh usage data and check session status (free — no API call)
refresh_usage
if [ ! -f "$USAGE_FILE" ]; then
  echo "ABORT: Cannot read $USAGE_FILE — run: bash ~/.claude/refresh-usage.sh"
  exit 1
fi

SESSION_PCT=$(read_usage "session.percent")
WEEKLY_PCT=$(read_usage "weekly_all.percent")
EXTRA_CREDITS=$(read_usage "extra_usage.used_credits")

echo "Session: ${SESSION_PCT}% | Weekly: ${WEEKLY_PCT}% | Models: ${ORCHESTRATOR_MODEL}+${RESEARCHER_MODEL} | Jobs: $JOBS"

if [ "$SESSION_PCT" -ge "$SESSION_THRESHOLD" ] 2>/dev/null; then
  echo "Session at ${SESSION_PCT}% — too high to start. Will wait for reset."
fi
echo ""

# ── Step 1: Get listing IDs ──────────────────────────────────────────────

if [ -n "$LISTING_FILE" ]; then
  cp "$LISTING_FILE" "$PK_FILE"
  echo "Using listing IDs from $LISTING_FILE"
elif [ "$SKIP_FETCH" = true ] && [ -f "$PK_FILE" ]; then
  echo "Using existing $PK_FILE"
else
  echo "Fetching listing IDs from Flatfox (zipcode prefix: ${CITY_ZIP}xx)..."
  python3 -c "
import json, urllib.request, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ZIP_PREFIX = '${CITY_ZIP}'

# First, get the total count
url0 = 'https://flatfox.ch/api/v1/public-listing/?offer_type=RENT&object_category=APARTMENT&limit=1'
with urllib.request.urlopen(url0, timeout=15) as resp:
    total = json.loads(resp.read()).get('count', 0)
print(f'  Total listings on Flatfox: {total}', file=sys.stderr)

PAGE_SIZE = 200  # max supported by Flatfox

def fetch_page(offset):
    url = f'https://flatfox.ch/api/v1/public-listing/?offer_type=RENT&object_category=APARTMENT&ordering=-created&limit={PAGE_SIZE}&offset={offset}'
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read())
        matched = []
        for r in data.get('results', []):
            pk = r.get('pk')
            zipcode = r.get('zipcode')
            if pk and zipcode and str(zipcode).startswith(ZIP_PREFIX):
                matched.append(pk)
        return matched
    except Exception as e:
        print(f'  Error at offset {offset}: {e}', file=sys.stderr)
        return []

offsets = list(range(0, total, PAGE_SIZE))
pks = []
seen = set()

with ThreadPoolExecutor(max_workers=10) as pool:
    futures = {pool.submit(fetch_page, off): off for off in offsets}
    done = 0
    for f in as_completed(futures):
        done += 1
        for pk in f.result():
            if pk not in seen:
                seen.add(pk)
                pks.append(pk)
        if done % 20 == 0:
            print(f'  Pages fetched: {done}/{len(offsets)}, matched: {len(pks)}', file=sys.stderr)

for pk in pks:
    print(pk)
" > "$PK_FILE"
  echo "Found $(wc -l < "$PK_FILE" | tr -d ' ') listings"
fi

# ── Step 2: Filter out already-enriched listings ─────────────────────────

TOTAL_BEFORE=$(wc -l < "$PK_FILE" | tr -d ' ')

# Remove listings that already have output JSON files
FILTERED_FILE="/tmp/enrich_pks_filtered.txt"
> "$FILTERED_FILE"
while IFS= read -r pk; do
  if [ ! -f "$OUTPUT_DIR/${pk}.json" ]; then
    echo "$pk" >> "$FILTERED_FILE"
  fi
done < "$PK_FILE"

TOTAL=$(wc -l < "$FILTERED_FILE" | tr -d ' ')
SKIPPED=$((TOTAL_BEFORE - TOTAL))

echo ""
echo "=== Batch Enrichment ==="
echo "Total listings:    $TOTAL_BEFORE"
echo "Already enriched:  $SKIPPED"
echo "To process:        $TOTAL"
echo "Parallel jobs:     $JOBS"
echo "Mode:              $MODE"
echo "Orchestrator:      $ORCHESTRATOR_MODEL"
echo "Researchers:       $RESEARCHER_MODEL"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "Nothing to do — all listings already enriched."
  exit 0
fi

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN — would process these listing IDs:"
  head -20 "$FILTERED_FILE"
  if [ "$TOTAL" -gt 20 ]; then
    echo "... and $((TOTAL - 20)) more"
  fi
  exit 0
fi

# ── Step 3: Session-aware parallel job pool ──────────────────────────────

BATCH_START=$(date +%s)
PRE_BATCH_JSON_COUNT=$(ls "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')" | tee "$LOG_FILE"
echo "Processing $TOTAL listings with $JOBS parallel jobs..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

DONE_COUNT=0
FAIL_COUNT=0
DONE_COUNTER_FILE=$(mktemp)
FAIL_COUNTER_FILE=$(mktemp)
echo "0" > "$DONE_COUNTER_FILE"
echo "0" > "$FAIL_COUNTER_FILE"

# Track initial extra usage credits to detect paid API usage
INITIAL_EXTRA_CREDITS="$EXTRA_CREDITS"

# Worker function: analyze one listing, save result, signal completion
run_one() {
  local pk=$1
  local start=$(date +%s)
  local status="OK"

  if "$SCRIPT_DIR/analyze_listing.sh" "$pk" --mode "$MODE" --orchestrator "$ORCHESTRATOR_MODEL" --researcher "$RESEARCHER_MODEL" > "$OUTPUT_DIR/${pk}.log" 2>&1; then
    # Auto-save to Supabase
    cd "$SCRIPT_DIR/.."
    if python3 -m scripts.save_research "$OUTPUT_DIR/${pk}.json" >> "$OUTPUT_DIR/${pk}.log" 2>&1; then
      status="OK+saved"
    else
      status="OK (save failed)"
    fi
  else
    status="FAILED"
  fi

  local end=$(date +%s)
  local elapsed=$((end - start))
  local mins=$((elapsed / 60))
  local secs=$((elapsed % 60))

  echo "[$(date '+%H:%M:%S')] pk=$pk ${status} ${mins}m${secs}s" | tee -a "$LOG_FILE"
}

export -f run_one
export SCRIPT_DIR OUTPUT_DIR LOG_FILE MODE ORCHESTRATOR_MODEL RESEARCHER_MODEL

# Wait for session to be below threshold, sleeping until reset if needed
wait_for_session() {
  while true; do
    refresh_usage
    local pct=$(read_usage "session.percent")
    if [ "$pct" -lt "$SESSION_THRESHOLD" ] 2>/dev/null; then
      echo "[$(date '+%H:%M:%S')] Session reset to ${pct}% — resuming" | tee -a "$LOG_FILE"
      return 0
    fi
    local reset_min=$(read_usage "session.reset_in_minutes")
    local sleep_sec=$(( (reset_min + 2) * 60 ))
    if [ "$sleep_sec" -le 0 ]; then sleep_sec=120; fi
    local reset_time=$(date -v+${sleep_sec}S '+%H:%M:%S' 2>/dev/null || date -d "+${sleep_sec} seconds" '+%H:%M:%S' 2>/dev/null || echo "~$(( sleep_sec / 60 ))m from now")
    echo "[$(date '+%H:%M:%S')] Session at ${pct}% — pausing. Sleeping $(( sleep_sec / 60 ))m until ${reset_time}" | tee -a "$LOG_FILE"
    sleep "$sleep_sec"
  done
}

# Check for extra usage (paid credits) — ABORT if detected
check_extra_usage() {
  local current=$(read_usage "extra_usage.used_credits")
  if python3 -c "exit(0 if float('$current') > float('$INITIAL_EXTRA_CREDITS') else 1)" 2>/dev/null; then
    echo "" | tee -a "$LOG_FILE"
    echo "ABORT: Extra usage credits being consumed! Stopping." | tee -a "$LOG_FILE"
    echo "  Initial: \$${INITIAL_EXTRA_CREDITS} → Current: \$${current}" | tee -a "$LOG_FILE"
    echo "  Something is using paid API credits. Investigate before continuing." | tee -a "$LOG_FILE"
    return 1
  fi
  return 0
}

# Read listing IDs into array (bash 3.2 compatible — no mapfile)
LISTING_IDS=()
while IFS= read -r line; do
  LISTING_IDS+=("$line")
done < "$FILTERED_FILE"
QUEUE_IDX=0

# ── Main job pool loop ───────────────────────────────────────────────────

# Ensure session is below threshold before starting
if [ "$(read_usage 'session.percent')" -ge "$SESSION_THRESHOLD" ] 2>/dev/null; then
  wait_for_session
fi

PIDS=()        # Array of background PIDs
PID_PKS=()     # Parallel array: which listing each PID is processing

while true; do
  # Reap finished jobs
  NEW_PIDS=()
  NEW_PID_PKS=()
  for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    pk="${PID_PKS[$i]}"
    if ! kill -0 "$pid" 2>/dev/null; then
      # Job finished — count it
      wait "$pid" 2>/dev/null
      exit_code=$?
      DONE_COUNT=$(( $(cat "$DONE_COUNTER_FILE") + 1 ))
      echo "$DONE_COUNT" > "$DONE_COUNTER_FILE"
      if [ "$exit_code" -ne 0 ]; then
        FAIL_COUNT=$(( $(cat "$FAIL_COUNTER_FILE") + 1 ))
        echo "$FAIL_COUNT" > "$FAIL_COUNTER_FILE"
      fi
    else
      NEW_PIDS+=("$pid")
      NEW_PID_PKS+=("$pk")
    fi
  done
  PIDS=("${NEW_PIDS[@]+"${NEW_PIDS[@]}"}")
  PID_PKS=("${NEW_PID_PKS[@]+"${NEW_PID_PKS[@]}"}")

  DONE_COUNT=$(cat "$DONE_COUNTER_FILE")

  # Every 10 completions: check session + extra usage
  if [ "$DONE_COUNT" -gt 0 ] && [ "$(( DONE_COUNT % 10 ))" -eq 0 ]; then
    # Only check if we haven't checked at this count before
    CHECK_MARKER="/tmp/batch_check_${DONE_COUNT}"
    if [ ! -f "$CHECK_MARKER" ]; then
      touch "$CHECK_MARKER"
      refresh_usage
      SESSION_PCT=$(read_usage "session.percent")
      WEEKLY_PCT=$(read_usage "weekly_all.percent")

      ELAPSED_NOW=$(( $(date +%s) - BATCH_START ))
      if [ "$ELAPSED_NOW" -gt 0 ] && [ "$DONE_COUNT" -gt 0 ]; then
        RATE=$(python3 -c "print(f'{$DONE_COUNT / ($ELAPSED_NOW / 3600):.1f}')" 2>/dev/null || echo "?")
      else
        RATE="?"
      fi
      echo "[$(date '+%H:%M:%S')] Progress: ${DONE_COUNT}/${TOTAL} | Session: ${SESSION_PCT}% | Weekly: ${WEEKLY_PCT}% | Rate: ${RATE}/hr" | tee -a "$LOG_FILE"

      # Check extra usage — ABORT if credits increasing
      if ! check_extra_usage; then
        # Kill all running jobs
        for pid in "${PIDS[@]}"; do
          kill "$pid" 2>/dev/null
        done
        rm -f "$DONE_COUNTER_FILE" "$FAIL_COUNTER_FILE"
        exit 1
      fi

      # If session too high, stop spawning and wait
      if [ "$SESSION_PCT" -ge "$SESSION_THRESHOLD" ] 2>/dev/null; then
        echo "[$(date '+%H:%M:%S')] Session at ${SESSION_PCT}% — stopping new jobs, waiting for ${#PIDS[@]} running jobs..." | tee -a "$LOG_FILE"
        # Wait for all running jobs to finish
        for pid in "${PIDS[@]}"; do
          wait "$pid" 2>/dev/null || true
        done
        # Recount completions from output dir (avoids double-counting)
        CUR_JSON_COUNT=$(ls "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
        echo "$((CUR_JSON_COUNT - PRE_BATCH_JSON_COUNT))" > "$DONE_COUNTER_FILE" 2>/dev/null || true
        PIDS=()
        PID_PKS=()
        wait_for_session
      fi
    fi
  fi

  # If all listings dispatched and no jobs running, we're done
  if [ "$QUEUE_IDX" -ge "$TOTAL" ] && [ "${#PIDS[@]}" -eq 0 ]; then
    break
  fi

  # Spawn new jobs up to JOBS limit
  while [ "${#PIDS[@]}" -lt "$JOBS" ] && [ "$QUEUE_IDX" -lt "$TOTAL" ]; do
    pk="${LISTING_IDS[$QUEUE_IDX]}"
    QUEUE_IDX=$((QUEUE_IDX + 1))

    # Skip if already enriched (race condition guard)
    if [ -f "$OUTPUT_DIR/${pk}.json" ]; then
      DONE_COUNT=$(( $(cat "$DONE_COUNTER_FILE") + 1 ))
      echo "$DONE_COUNT" > "$DONE_COUNTER_FILE"
      continue
    fi

    run_one "$pk" &
    PIDS+=("$!")
    PID_PKS+=("$pk")
  done

  # Brief sleep to avoid busy-waiting
  sleep 2
done

# ── Cleanup ──────────────────────────────────────────────────────────────
DONE_COUNT=$(cat "$DONE_COUNTER_FILE" 2>/dev/null || echo "$DONE_COUNT")
FAIL_COUNT=$(cat "$FAIL_COUNTER_FILE" 2>/dev/null || echo "$FAIL_COUNT")
rm -f /tmp/batch_check_* "$DONE_COUNTER_FILE" "$FAIL_COUNTER_FILE"

BATCH_END=$(date +%s)
BATCH_ELAPSED=$((BATCH_END - BATCH_START))
BATCH_MINS=$((BATCH_ELAPSED / 60))
BATCH_SECS=$((BATCH_ELAPSED % 60))
BATCH_HOURS=$((BATCH_MINS / 60))
BATCH_REMAINING_MINS=$((BATCH_MINS % 60))

# Count results
COMPLETED=$(ls "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')

echo "" | tee -a "$LOG_FILE"
echo "=== Batch Complete ===" | tee -a "$LOG_FILE"
echo "Completed:  $COMPLETED total enriched" | tee -a "$LOG_FILE"
echo "This run:   $DONE_COUNT processed ($FAIL_COUNT failed)" | tee -a "$LOG_FILE"
echo "Duration:   ${BATCH_HOURS}h ${BATCH_REMAINING_MINS}m ${BATCH_SECS}s" | tee -a "$LOG_FILE"
if [ "$DONE_COUNT" -gt 0 ] && [ "$BATCH_ELAPSED" -gt 0 ]; then
  RATE=$(python3 -c "print(f'{$DONE_COUNT / ($BATCH_ELAPSED / 3600):.1f}')" 2>/dev/null || echo "?")
  echo "Rate: ${RATE} listings/hr" | tee -a "$LOG_FILE"
fi
echo "Log: $LOG_FILE" | tee -a "$LOG_FILE"

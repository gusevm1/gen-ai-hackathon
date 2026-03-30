#!/bin/bash
# Analyze all listings in a zipcode using shared area research.
#
# One orchestrator call per zipcode: 3 shared area agents (neighborhood, proximity,
# market) research the area once with spatial data, then per-listing image agents
# run in parallel. Opus compiles per-listing JSONs with haversine distances.
#
# Usage:
#   ./backend/scripts/analyze_zipcode.sh 8005
#   ./backend/scripts/analyze_zipcode.sh 8005 --limit 5 --dry-run
#
# Options:
#   --limit N           Max listings to process (default: all)
#   --mode MODE         Research mode: websearch (default)
#   --orchestrator M    Orchestrator model (default: opus)
#   --researcher M      Area research model (default: sonnet)
#   --image-model M     Image analysis model (default: haiku)
#   --batch-size N      Listings per orchestrator call (default: 25)
#   --skip-fetch        Reuse existing listing IDs from /tmp
#   --dry-run           Show what would be done
#
# Output:
#   backend/scripts/output/<listing_id>.json per listing

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <zipcode> [--limit N] [--mode websearch] [--orchestrator opus] [--researcher sonnet] [--image-model haiku]"
  exit 1
fi

ZIPCODE="$1"
shift

LIMIT=""
MODE="websearch"
ORCHESTRATOR_MODEL="opus"
RESEARCHER_MODEL="sonnet"
IMAGE_MODEL="haiku"
BATCH_SIZE=25
DRY_RUN=false
SKIP_FETCH=false

while [ $# -gt 0 ]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --orchestrator) ORCHESTRATOR_MODEL="$2"; shift 2 ;;
    --researcher) RESEARCHER_MODEL="$2"; shift 2 ;;
    --image-model) IMAGE_MODEL="$2"; shift 2 ;;
    --batch-size) BATCH_SIZE="$2"; shift 2 ;;
    --skip-fetch) SKIP_FETCH=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
LOG_FILE="$OUTPUT_DIR/zipcode_${ZIPCODE}.log"
PK_FILE="/tmp/zipcode_${ZIPCODE}_pks.txt"
AREA_FILE="/tmp/zipcode_${ZIPCODE}_area.json"

mkdir -p "$OUTPUT_DIR"

# ── Source .env (for APIFY_TOKEN etc.) — immediately unset ANTHROPIC_API_KEY ──
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
unset ANTHROPIC_API_KEY

# ── SAFETY: Verify Claude CLI will use Max subscription ──
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ABORT: ANTHROPIC_API_KEY is set in environment!"
  echo "This would charge API credits instead of using your Max subscription."
  exit 1
fi

# Check session usage (free — reads local file, no API call)
USAGE_FILE="$HOME/.claude/usage_data.json"
SESSION_PCT=0
if [ -f "$USAGE_FILE" ]; then
  SESSION_PCT=$(python3 -c "
import json
d = json.load(open('$USAGE_FILE'))
keys = 'session.percent'.split('.')
v = d
for k in keys:
    v = v.get(k, {}) if isinstance(v, dict) else 0
print(v)
" 2>/dev/null || echo "0")
  if [ "$SESSION_PCT" -ge 99 ] 2>/dev/null; then
    echo "ABORT: Session usage at ${SESSION_PCT}% — wait for reset."
    exit 1
  fi
fi
echo "Auth: ANTHROPIC_API_KEY unset, session ${SESSION_PCT}%"

# ── Determine city and canton from zipcode ──
read -r CITY CANTON <<< "$(python3 -c "
z = int('$ZIPCODE')
mapping = {
    (8000, 8099): ('Zürich', 'ZH'),
    (3000, 3099): ('Bern', 'BE'),
    (4000, 4099): ('Basel', 'BS'),
    (6000, 6099): ('Luzern', 'LU'),
    (9000, 9099): ('St. Gallen', 'SG'),
    (8400, 8499): ('Winterthur', 'ZH'),
    (1000, 1099): ('Lausanne', 'VD'),
    (1200, 1299): ('Genève', 'GE'),
}
for (lo, hi), (city, canton) in mapping.items():
    if lo <= z <= hi:
        print(f'{city} {canton}')
        break
else:
    print('Unknown XX')
" 2>/dev/null || echo "Unknown XX")"

echo "Zipcode: $ZIPCODE | City: $CITY | Canton: $CANTON"

# ── Step 1: Fetch listing IDs for this zipcode ──
if [ "$SKIP_FETCH" = true ] && [ -f "$PK_FILE" ]; then
  echo "Using existing $PK_FILE"
else
  echo "Fetching listing IDs for zipcode $ZIPCODE from Flatfox..."
  python3 -c "
import json, urllib.request, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ZIPCODE = '$ZIPCODE'
PAGE_SIZE = 200

# Get total count
url0 = 'https://flatfox.ch/api/v1/public-listing/?offer_type=RENT&object_category=APARTMENT&limit=1'
with urllib.request.urlopen(url0, timeout=15) as resp:
    total = json.loads(resp.read()).get('count', 0)
print(f'  Total Flatfox listings: {total}', file=sys.stderr)

def fetch_page(offset):
    url = f'https://flatfox.ch/api/v1/public-listing/?offer_type=RENT&object_category=APARTMENT&ordering=-created&limit={PAGE_SIZE}&offset={offset}'
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read())
        matched = []
        for r in data.get('results', []):
            pk = r.get('pk')
            zipcode = str(r.get('zipcode', ''))
            if pk and zipcode == ZIPCODE:
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
            print(f'  Pages: {done}/{len(offsets)}, matched: {len(pks)}', file=sys.stderr)

print(f'  Found {len(pks)} listings in {ZIPCODE}', file=sys.stderr)
for pk in pks:
    print(pk)
" > "$PK_FILE"
fi

TOTAL_BEFORE=$(wc -l < "$PK_FILE" | tr -d ' ')
echo "Found $TOTAL_BEFORE listings in zipcode $ZIPCODE"

# ── Step 2: Filter out already-enriched ──
FILTERED_FILE="/tmp/zipcode_${ZIPCODE}_filtered.txt"
> "$FILTERED_FILE"
while IFS= read -r pk; do
  if [ ! -f "$OUTPUT_DIR/${pk}.json" ]; then
    echo "$pk" >> "$FILTERED_FILE"
  fi
done < "$PK_FILE"

TOTAL=$(wc -l < "$FILTERED_FILE" | tr -d ' ')
SKIPPED=$((TOTAL_BEFORE - TOTAL))

# Apply limit if specified
if [ -n "$LIMIT" ] && [ "$TOTAL" -gt "$LIMIT" ]; then
  head -n "$LIMIT" "$FILTERED_FILE" > "/tmp/zipcode_${ZIPCODE}_limited.txt"
  mv "/tmp/zipcode_${ZIPCODE}_limited.txt" "$FILTERED_FILE"
  TOTAL="$LIMIT"
fi

echo ""
echo "=== Zipcode $ZIPCODE Enrichment ==="
echo "Total listings:   $TOTAL_BEFORE"
echo "Already enriched: $SKIPPED"
echo "To process:       $TOTAL"
echo "Batch size:       $BATCH_SIZE"
echo "Models:           orchestrator=$ORCHESTRATOR_MODEL researcher=$RESEARCHER_MODEL image=$IMAGE_MODEL"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "Nothing to do — all listings already enriched."
  exit 0
fi

# Read listing IDs into array
LISTING_IDS=()
while IFS= read -r line; do
  LISTING_IDS+=("$line")
done < "$FILTERED_FILE"

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN — would process ${#LISTING_IDS[@]} listings:"
  printf '%s\n' "${LISTING_IDS[@]}"
  BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
  echo ""
  echo "Would run $BATCHES batch(es) of up to $BATCH_SIZE listings each."
  exit 0
fi

# Read prompt template
PROMPT_TEMPLATE="$SCRIPT_DIR/zipcode_research_prompt.md"
if [ ! -f "$PROMPT_TEMPLATE" ]; then
  echo "Error: zipcode_research_prompt.md not found at $PROMPT_TEMPLATE"
  exit 1
fi

START_TIME=$(date +%s)
echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')" | tee "$LOG_FILE"

# ── Process in batches ──
BATCH_NUM=0
IDX=0
TOTAL_CREATED=0

while [ "$IDX" -lt "$TOTAL" ]; do
  BATCH_NUM=$((BATCH_NUM + 1))

  # Collect this batch's listing IDs
  BATCH_IDS=""
  BATCH_COUNT=0
  for (( i = IDX; i < IDX + BATCH_SIZE && i < TOTAL; i++ )); do
    if [ -n "$BATCH_IDS" ]; then
      BATCH_IDS="$BATCH_IDS ${LISTING_IDS[$i]}"
    else
      BATCH_IDS="${LISTING_IDS[$i]}"
    fi
    BATCH_COUNT=$((BATCH_COUNT + 1))
  done
  IDX=$((IDX + BATCH_SIZE))

  echo "" | tee -a "$LOG_FILE"
  echo "=== Batch $BATCH_NUM: $BATCH_COUNT listings ===" | tee -a "$LOG_FILE"
  echo "IDs: $BATCH_IDS" | tee -a "$LOG_FILE"

  # Re-check session usage before each batch
  if [ -f "$USAGE_FILE" ]; then
    SESSION_PCT=$(python3 -c "
import json
d = json.load(open('$USAGE_FILE'))
v = d
for k in 'session.percent'.split('.'):
    v = v.get(k, {}) if isinstance(v, dict) else 0
print(v)
" 2>/dev/null || echo "0")
    if [ "$SESSION_PCT" -ge 95 ] 2>/dev/null; then
      echo "Session at ${SESSION_PCT}% — waiting for reset..." | tee -a "$LOG_FILE"
      while true; do
        sleep 120
        SESSION_PCT=$(python3 -c "
import json
d = json.load(open('$USAGE_FILE'))
v = d
for k in 'session.percent'.split('.'):
    v = v.get(k, {}) if isinstance(v, dict) else 0
print(v)
" 2>/dev/null || echo "0")
        if [ "$SESSION_PCT" -lt 90 ] 2>/dev/null; then
          echo "Session reset to ${SESSION_PCT}% — resuming" | tee -a "$LOG_FILE"
          break
        fi
        echo "  Still at ${SESSION_PCT}%, waiting..." | tee -a "$LOG_FILE"
      done
    fi
  fi

  # ── Build prompt via Python (safe multi-line substitution) ──
  PROMPT_FILE="/tmp/zipcode_${ZIPCODE}_prompt_batch${BATCH_NUM}.md"

  export ZIPCODE CITY CANTON MODE RESEARCHER_MODEL IMAGE_MODEL OUTPUT_DIR AREA_FILE
  export BATCH_IDS BATCH_COUNT BATCH_NUM
  export PROMPT_TEMPLATE PROMPT_FILE

  python3 << 'PYEOF'
import os

template_path = os.environ['PROMPT_TEMPLATE']
output_path = os.environ['PROMPT_FILE']
area_file = os.environ['AREA_FILE']
batch_num = int(os.environ['BATCH_NUM'])

with open(template_path) as f:
    template = f.read()

subs = {
    '{{ZIPCODE}}': os.environ['ZIPCODE'],
    '{{CITY}}': os.environ['CITY'],
    '{{CANTON}}': os.environ['CANTON'],
    '{{LISTING_IDS}}': os.environ['BATCH_IDS'],
    '{{LISTING_COUNT}}': os.environ['BATCH_COUNT'],
    '{{MODE}}': os.environ['MODE'],
    '{{RESEARCHER_MODEL}}': os.environ['RESEARCHER_MODEL'],
    '{{IMAGE_MODEL}}': os.environ['IMAGE_MODEL'],
    '{{OUTPUT_DIR}}': os.environ['OUTPUT_DIR'],
    '{{AREA_FILE}}': area_file,
}

for key, val in subs.items():
    template = template.replace(key, str(val))

# Handle area research context for subsequent batches
import os.path
if batch_num > 1 and os.path.exists(area_file):
    with open(area_file) as f:
        area_data = f.read()
    area_context = (
        "## Pre-computed Area Research\n\n"
        f"The area research for zipcode {os.environ['ZIPCODE']} has already been completed. "
        "**Skip Step 3 entirely** — use this data instead.\n\n"
        "```json\n"
        f"{area_data}\n"
        "```\n"
    )
else:
    area_context = ""

template = template.replace('{{AREA_RESEARCH_CONTEXT}}', area_context)

with open(output_path, 'w') as f:
    f.write(template)

print(f"Prompt written to {output_path} ({len(template)} chars)")
PYEOF

  PROMPT=$(cat "$PROMPT_FILE")

  BATCH_START=$(date +%s)
  echo "Launching orchestrator (model: $ORCHESTRATOR_MODEL, batch $BATCH_NUM)..." | tee -a "$LOG_FILE"

  # Launch the Claude Code orchestrator agent
  claude --print --dangerously-skip-permissions \
    --model "$ORCHESTRATOR_MODEL" \
    -p "$PROMPT" 2>&1 | tee -a "$LOG_FILE"

  BATCH_END=$(date +%s)
  BATCH_ELAPSED=$((BATCH_END - BATCH_START))
  BATCH_MINS=$((BATCH_ELAPSED / 60))
  BATCH_SECS=$((BATCH_ELAPSED % 60))

  # Count how many outputs were created in this batch
  BATCH_CREATED=0
  for id in $BATCH_IDS; do
    if [ -f "$OUTPUT_DIR/${id}.json" ]; then
      BATCH_CREATED=$((BATCH_CREATED + 1))
    fi
  done
  TOTAL_CREATED=$((TOTAL_CREATED + BATCH_CREATED))

  echo "Batch $BATCH_NUM: ${BATCH_CREATED}/${BATCH_COUNT} JSONs created in ${BATCH_MINS}m ${BATCH_SECS}s" | tee -a "$LOG_FILE"

  # Verify area file was written (for multi-batch support)
  if [ "$BATCH_NUM" -eq 1 ] && [ ! -f "$AREA_FILE" ]; then
    echo "WARNING: Area research file not created at $AREA_FILE" | tee -a "$LOG_FILE"
    echo "  Subsequent batches will re-run area research." | tee -a "$LOG_FILE"
  fi
done

# ── Save all results to Supabase ──
echo "" | tee -a "$LOG_FILE"
echo "Saving results to Supabase..." | tee -a "$LOG_FILE"
SAVED=0
SAVE_FAILED=0

cd "$SCRIPT_DIR/.."
for id in "${LISTING_IDS[@]}"; do
  if [ -f "$OUTPUT_DIR/${id}.json" ]; then
    if python3 -m scripts.save_research "$OUTPUT_DIR/${id}.json" 2>/dev/null; then
      SAVED=$((SAVED + 1))
    else
      SAVE_FAILED=$((SAVE_FAILED + 1))
      echo "  Failed to save listing $id" | tee -a "$LOG_FILE"
    fi
  fi
done

END_TIME=$(date +%s)
TOTAL_ELAPSED=$((END_TIME - START_TIME))
TOTAL_MINS=$((TOTAL_ELAPSED / 60))
TOTAL_SECS=$((TOTAL_ELAPSED % 60))

echo "" | tee -a "$LOG_FILE"
echo "=== Zipcode $ZIPCODE Complete ===" | tee -a "$LOG_FILE"
echo "Listings processed: $TOTAL_CREATED / $TOTAL" | tee -a "$LOG_FILE"
echo "Saved to Supabase:  $SAVED" | tee -a "$LOG_FILE"
if [ "$SAVE_FAILED" -gt 0 ]; then
  echo "Save failures:      $SAVE_FAILED" | tee -a "$LOG_FILE"
fi
echo "Batches:            $BATCH_NUM" | tee -a "$LOG_FILE"
echo "Duration:           ${TOTAL_MINS}m ${TOTAL_SECS}s" | tee -a "$LOG_FILE"
echo "Log:                $LOG_FILE" | tee -a "$LOG_FILE"

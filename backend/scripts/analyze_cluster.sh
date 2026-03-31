#!/bin/bash
# Analyze all listings in a neighborhood cluster using shared area research.
#
# One orchestrator call per cluster: 3 shared area agents (neighborhood, proximity,
# market) research the area once with spatial data, then per-listing image agents
# run in parallel. Opus compiles per-listing JSONs with haversine distances.
#
# Usage:
#   ./backend/scripts/analyze_cluster.sh \
#     --name albisrieden-friesenberg \
#     --center 47.3724,8.4948 \
#     --radius 1.3 \
#     --pks "85916813 85915794 85915262 85915076 85915004 85914510 85913368" \
#     --neighborhoods "Albisrieden, Friesenberg" \
#     --zipcodes "8047, 8055"
#
# Options:
#   --name NAME         Cluster name (required)
#   --center LAT,LNG    Cluster center coordinates (required)
#   --radius KM         Cluster radius in km (required)
#   --pks "PK1 PK2..."  Space-separated listing PKs (required)
#   --neighborhoods STR  Neighborhood names (required)
#   --zipcodes STR       Covered zipcodes (required)
#   --city CITY          City name (default: Zürich)
#   --canton CANTON      Canton code (default: ZH)
#   --mode MODE          Research mode: websearch (default)
#   --orchestrator M     Orchestrator model (default: opus)
#   --researcher M       Area research model (default: sonnet)
#   --image-model M      Image analysis model (default: haiku)
#   --batch-size N       Listings per orchestrator call (default: 25)
#   --dry-run            Show what would be done
#
# Output:
#   backend/scripts/output/<listing_id>.json per listing

set -euo pipefail

# ── Parse arguments ──
CLUSTER_NAME=""
CENTER=""
RADIUS_KM=""
PKS=""
NEIGHBORHOODS=""
ZIPCODES=""
CITY="Zürich"
CANTON="ZH"
MODE="websearch"
ORCHESTRATOR_MODEL="opus"
RESEARCHER_MODEL="sonnet"
IMAGE_MODEL="haiku"
BATCH_SIZE=25
DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --name) CLUSTER_NAME="$2"; shift 2 ;;
    --center) CENTER="$2"; shift 2 ;;
    --radius) RADIUS_KM="$2"; shift 2 ;;
    --pks) PKS="$2"; shift 2 ;;
    --neighborhoods) NEIGHBORHOODS="$2"; shift 2 ;;
    --zipcodes) ZIPCODES="$2"; shift 2 ;;
    --city) CITY="$2"; shift 2 ;;
    --canton) CANTON="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --orchestrator) ORCHESTRATOR_MODEL="$2"; shift 2 ;;
    --researcher) RESEARCHER_MODEL="$2"; shift 2 ;;
    --image-model) IMAGE_MODEL="$2"; shift 2 ;;
    --batch-size) BATCH_SIZE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate required args
if [ -z "$CLUSTER_NAME" ] || [ -z "$CENTER" ] || [ -z "$RADIUS_KM" ] || [ -z "$PKS" ] || [ -z "$NEIGHBORHOODS" ] || [ -z "$ZIPCODES" ]; then
  echo "Usage: $0 --name NAME --center LAT,LNG --radius KM --pks \"PK1 PK2...\" --neighborhoods STR --zipcodes STR"
  exit 1
fi

# Parse center coordinates
CENTER_LAT="${CENTER%%,*}"
CENTER_LNG="${CENTER##*,}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
LOG_FILE="$OUTPUT_DIR/cluster_${CLUSTER_NAME}.log"
AREA_FILE="/tmp/cluster_${CLUSTER_NAME}_area.json"

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

# Check session usage
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
echo "Cluster: $CLUSTER_NAME | Neighborhoods: $NEIGHBORHOODS | Zipcodes: $ZIPCODES"
echo "Center: $CENTER_LAT, $CENTER_LNG | Radius: ${RADIUS_KM}km"
echo "City: $CITY | Canton: $CANTON"

# ── Build listing ID array from PKs ──
read -ra ALL_IDS <<< "$PKS"
TOTAL_BEFORE=${#ALL_IDS[@]}

# ── Filter out already-enriched ──
LISTING_IDS=()
for pk in "${ALL_IDS[@]}"; do
  if [ ! -f "$OUTPUT_DIR/${pk}.json" ]; then
    LISTING_IDS+=("$pk")
  fi
done

TOTAL=${#LISTING_IDS[@]}
SKIPPED=$((TOTAL_BEFORE - TOTAL))

echo ""
echo "=== Cluster $CLUSTER_NAME Enrichment ==="
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

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN — would process $TOTAL listings:"
  printf '%s\n' "${LISTING_IDS[@]}"
  BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
  echo ""
  echo "Would run $BATCHES batch(es) of up to $BATCH_SIZE listings each."
  exit 0
fi

# Read prompt template
PROMPT_TEMPLATE="$SCRIPT_DIR/cluster_research_prompt.md"
if [ ! -f "$PROMPT_TEMPLATE" ]; then
  echo "Error: cluster_research_prompt.md not found at $PROMPT_TEMPLATE"
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
  PROMPT_FILE="/tmp/cluster_${CLUSTER_NAME}_prompt_batch${BATCH_NUM}.md"

  export CLUSTER_NAME CENTER_LAT CENTER_LNG RADIUS_KM NEIGHBORHOODS ZIPCODES
  export CITY CANTON MODE RESEARCHER_MODEL IMAGE_MODEL OUTPUT_DIR AREA_FILE
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
    '{{CLUSTER_NAME}}': os.environ['CLUSTER_NAME'],
    '{{CENTER_LAT}}': os.environ['CENTER_LAT'],
    '{{CENTER_LNG}}': os.environ['CENTER_LNG'],
    '{{RADIUS_KM}}': os.environ['RADIUS_KM'],
    '{{NEIGHBORHOODS}}': os.environ['NEIGHBORHOODS'],
    '{{ZIPCODES}}': os.environ['ZIPCODES'],
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
        f"The area research for cluster {os.environ['CLUSTER_NAME']} has already been completed. "
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
echo "=== Cluster $CLUSTER_NAME Complete ===" | tee -a "$LOG_FILE"
echo "Listings processed: $TOTAL_CREATED / $TOTAL" | tee -a "$LOG_FILE"
echo "Saved to Supabase:  $SAVED" | tee -a "$LOG_FILE"
if [ "$SAVE_FAILED" -gt 0 ]; then
  echo "Save failures:      $SAVE_FAILED" | tee -a "$LOG_FILE"
fi
echo "Batches:            $BATCH_NUM" | tee -a "$LOG_FILE"
echo "Duration:           ${TOTAL_MINS}m ${TOTAL_SECS}s" | tee -a "$LOG_FILE"
echo "Log:                $LOG_FILE" | tee -a "$LOG_FILE"

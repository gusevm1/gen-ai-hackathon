#!/bin/bash
# Run cluster-based batch enrichment for 24 demo listings across 5 Zürich clusters.
#
# Usage:
#   ./backend/scripts/run_clusters.sh              # run all 5 clusters
#   ./backend/scripts/run_clusters.sh --dry-run    # show what would happen
#   ./backend/scripts/run_clusters.sh --cluster altstetten  # run one cluster
#
# Options:
#   --cluster NAME   Run only the specified cluster
#   --dry-run        Show what would be done (passed through to analyze_cluster.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false
FILTER_CLUSTER=""

while [ $# -gt 0 ]; do
  case "$1" in
    --cluster) FILTER_CLUSTER="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

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

# ── Session usage helper ──
USAGE_FILE="$HOME/.claude/usage_data.json"

get_session_pct() {
  if [ -f "$USAGE_FILE" ]; then
    python3 -c "
import json
d = json.load(open('$USAGE_FILE'))
v = d
for k in 'session.percent'.split('.'):
    v = v.get(k, {}) if isinstance(v, dict) else 0
print(v)
" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

wait_for_session() {
  local pct
  pct=$(get_session_pct)
  if [ "$pct" -ge 90 ] 2>/dev/null; then
    echo ""
    echo "Session at ${pct}% — waiting for reset..."
    while true; do
      sleep 120
      pct=$(get_session_pct)
      if [ "$pct" -lt 80 ] 2>/dev/null; then
        echo "Session reset to ${pct}% — resuming"
        break
      fi
      echo "  Still at ${pct}%, waiting..."
    done
  fi
}

# ── Define clusters ──
# Format: name|center_lat,center_lng|radius_km|pks|neighborhoods|zipcodes
CLUSTERS=(
  "albisrieden-friesenberg|47.3724,8.4948|1.3|85916813 85915794 85915262 85915076 85915004 85914510 85913368|Albisrieden, Friesenberg|8047, 8055"
  "wiedikon-langstrasse|47.3694,8.5200|1.3|85914154 85916189 85915806 85915068 85914344|Wiedikon, Langstrasse|8003, 8004, 8045"
  "seefeld-hottingen|47.3621,8.5609|1.1|85916649 85916015 85914267 85912932|Seefeld, Hottingen|8008, 8032"
  "altstetten|47.3864,8.4839|0.8|85916096 85915488 85794704 85914058|Altstetten|8048"
  "wipkingen-hoengg|47.3932,8.5130|1.5|85878453 85914329 85913235 85913203|Wipkingen, Höngg|8037, 8049"
)

# ── Run ──
START_TIME=$(date +%s)
TOTAL_CLUSTERS=0
TOTAL_LISTINGS=0
CLUSTER_RESULTS=()

echo "============================================"
echo "  Cluster-Based Batch Enrichment"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

for entry in "${CLUSTERS[@]}"; do
  IFS='|' read -r name center radius pks neighborhoods zipcodes <<< "$entry"

  # Apply cluster filter if specified
  if [ -n "$FILTER_CLUSTER" ] && [ "$name" != "$FILTER_CLUSTER" ]; then
    continue
  fi

  TOTAL_CLUSTERS=$((TOTAL_CLUSTERS + 1))
  # Count PKs
  read -ra pk_array <<< "$pks"
  num_listings=${#pk_array[@]}
  TOTAL_LISTINGS=$((TOTAL_LISTINGS + num_listings))

  echo "── Cluster $TOTAL_CLUSTERS: $name ($num_listings listings) ──"
  echo "   Neighborhoods: $neighborhoods"
  echo "   Zipcodes: $zipcodes"
  echo "   Center: $center, Radius: ${radius}km"
  echo ""

  # Check session before each cluster
  if [ "$DRY_RUN" = false ]; then
    wait_for_session
  fi

  # Build args
  ARGS=(
    --name "$name"
    --center "$center"
    --radius "$radius"
    --pks "$pks"
    --neighborhoods "$neighborhoods"
    --zipcodes "$zipcodes"
  )

  if [ "$DRY_RUN" = true ]; then
    ARGS+=(--dry-run)
  fi

  CLUSTER_START=$(date +%s)
  "$SCRIPT_DIR/analyze_cluster.sh" "${ARGS[@]}"
  CLUSTER_END=$(date +%s)
  CLUSTER_ELAPSED=$((CLUSTER_END - CLUSTER_START))

  CLUSTER_RESULTS+=("$name: ${CLUSTER_ELAPSED}s (${num_listings} listings)")
  echo ""
done

END_TIME=$(date +%s)
TOTAL_ELAPSED=$((END_TIME - START_TIME))
TOTAL_MINS=$((TOTAL_ELAPSED / 60))
TOTAL_SECS=$((TOTAL_ELAPSED % 60))

echo "============================================"
echo "  Summary"
echo "============================================"
echo "Clusters run:   $TOTAL_CLUSTERS"
echo "Total listings: $TOTAL_LISTINGS"
echo "Total duration: ${TOTAL_MINS}m ${TOTAL_SECS}s"
echo ""
for result in "${CLUSTER_RESULTS[@]}"; do
  echo "  $result"
done
echo ""

# Count total enriched files
ENRICHED=$(ls -1 "$SCRIPT_DIR/output/"*.json 2>/dev/null | wc -l | tr -d ' ')
echo "Total enriched JSONs in output/: $ENRICHED"

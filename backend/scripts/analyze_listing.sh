#!/bin/bash
# Analyze a Flatfox listing using Claude Code research agents.
#
# Usage:
#   ./backend/scripts/analyze_listing.sh <listing_id> [--mode websearch|apify] [--orchestrator sonnet|opus] [--researcher haiku|sonnet]
#
# Modes:
#   websearch (default) — sub-agents use WebSearch only for proximity/amenity data
#   apify               — sub-agents use WebSearch + Apify Google Places for structured proximity data
#
# Models:
#   --orchestrator sonnet (default) — model for the orchestrator agent
#   --researcher haiku (default)    — model for the 4 research sub-agents
#
# Output:
#   backend/scripts/output/<listing_id>.json
#
# Requires:
#   - claude CLI (Claude Code) installed and authenticated
#   - APIFY_TOKEN env var (only for --mode apify)

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <listing_id> [--mode websearch|apify]"
  exit 1
fi

LISTING_ID="$1"
MODE="websearch"
ORCHESTRATOR_MODEL="sonnet"
RESEARCHER_MODEL="haiku"

# Parse optional flags
shift
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --orchestrator) ORCHESTRATOR_MODEL="$2"; shift 2 ;;
    --researcher) RESEARCHER_MODEL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ "$MODE" != "websearch" && "$MODE" != "apify" ]]; then
  echo "Invalid mode: $MODE (must be 'websearch' or 'apify')"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
OUTPUT_FILE="$OUTPUT_DIR/${LISTING_ID}.json"

mkdir -p "$OUTPUT_DIR"

# Source .env for APIFY_TOKEN only — unset ANTHROPIC_API_KEY so claude CLI
# uses the Max subscription (flat rate) instead of API credits
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
unset ANTHROPIC_API_KEY

# ── SAFETY CHECK: Verify Claude CLI uses Max subscription, NOT API credits ──
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ABORT: ANTHROPIC_API_KEY is set in environment!"
  echo "This would charge API credits instead of using your Max subscription."
  echo "Unset it: unset ANTHROPIC_API_KEY"
  exit 1
fi

# Check session usage via usage_data.json (free — no API call)
USAGE_FILE="$HOME/.claude/usage_data.json"
if [ -f "$USAGE_FILE" ]; then
  SESSION_PCT=$(python3 -c "import json; d=json.load(open('$USAGE_FILE')); print(d.get('session',{}).get('percent',0))" 2>/dev/null || echo "0")
  if [ "$SESSION_PCT" -ge 99 ] 2>/dev/null; then
    echo "ABORT: Session usage at ${SESSION_PCT}% — too high to start new work."
    echo "Wait for session reset or run: bash ~/.claude/refresh-usage.sh"
    exit 1
  fi
fi
echo "Auth check: ANTHROPIC_API_KEY unset, session ${SESSION_PCT:-?}%"

# Read the research prompt template
PROMPT_TEMPLATE="$SCRIPT_DIR/research_prompt.md"
if [ ! -f "$PROMPT_TEMPLATE" ]; then
  echo "Error: research_prompt.md not found at $PROMPT_TEMPLATE"
  exit 1
fi

PROMPT=$(cat "$PROMPT_TEMPLATE")
PROMPT="${PROMPT//\{\{LISTING_ID\}\}/$LISTING_ID}"
PROMPT="${PROMPT//\{\{MODE\}\}/$MODE}"
PROMPT="${PROMPT//\{\{OUTPUT_FILE\}\}/$OUTPUT_FILE}"
PROMPT="${PROMPT//\{\{RESEARCHER_MODEL\}\}/$RESEARCHER_MODEL}"

# Pass APIFY_TOKEN if available and mode is apify
APIFY_ENV=""
if [[ "$MODE" == "apify" && -n "${APIFY_TOKEN:-}" ]]; then
  APIFY_ENV="The Apify API token is: $APIFY_TOKEN"
  PROMPT="${PROMPT//\{\{APIFY_TOKEN_SECTION\}\}/$APIFY_ENV}"
else
  PROMPT="${PROMPT//\{\{APIFY_TOKEN_SECTION\}\}/Apify is not configured for this run.}"
fi

START_TIME=$(date +%s)
echo "=== Analyzing listing $LISTING_ID (mode: $MODE, orchestrator: $ORCHESTRATOR_MODEL, researchers: $RESEARCHER_MODEL) ==="
echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Output will be written to: $OUTPUT_FILE"
echo ""

# Launch the Claude Code orchestrator agent
claude --print --dangerously-skip-permissions \
  --model "$ORCHESTRATOR_MODEL" \
  -p "$PROMPT"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

# Verify output was created
if [ -f "$OUTPUT_FILE" ]; then
  echo ""
  echo "=== Analysis complete ==="
  echo "Output: $OUTPUT_FILE"
  echo "Size: $(wc -c < "$OUTPUT_FILE") bytes"
  echo "Duration: ${MINUTES}m ${SECONDS}s (${ELAPSED}s total)"
else
  echo ""
  echo "=== WARNING: No output file created (after ${MINUTES}m ${SECONDS}s) ==="
  exit 1
fi

-- 006_add_research_json.sql
-- Add research_json column to store the full research agent output.
-- This preserves the raw research data for debugging and re-processing.

ALTER TABLE listing_profiles
  ADD COLUMN IF NOT EXISTS research_json jsonb;

COMMENT ON COLUMN listing_profiles.research_json IS
  'Full JSON output from Claude Code research agent (orchestrator + sub-agents)';

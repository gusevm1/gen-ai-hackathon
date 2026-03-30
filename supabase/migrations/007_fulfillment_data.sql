-- 007_fulfillment_data.sql
-- Phase 30: Add fulfillment_data column to analyses table for v2 scoring data.
-- Stores per-criterion fulfillment results as structured JSONB.
-- Existing rows get NULL (no backfill needed).
--
-- Note: DB-01 (schema_version) is a JSONB key inside the existing `breakdown` column,
-- not a separate SQL column. Phase 31 writes {"schema_version": 2, ...} into breakdown.
-- Existing rows without this key are treated as v1. No DDL needed for DB-01.

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS fulfillment_data jsonb;

COMMENT ON COLUMN analyses.fulfillment_data IS
  'Structured per-criterion fulfillment data from v2 hybrid scoring pipeline';

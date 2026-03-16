-- 003_add_stale_column.sql
-- Phase 11: Score Caching - Add stale flag for cache invalidation

alter table analyses add column stale boolean not null default false;

-- Index for efficient cache lookups: find non-stale analysis for a user+listing+profile
create index idx_analyses_cache_lookup
  on analyses (user_id, listing_id, profile_id)
  where (stale = false);

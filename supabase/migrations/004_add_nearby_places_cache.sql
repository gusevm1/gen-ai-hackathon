-- 004_add_nearby_places_cache.sql
-- Phase 22: Database & Coordinate Resolution
-- Cache table for nearby-places Apify results (read/write logic added in Phase 23)

create table if not exists nearby_places_cache (
  id            uuid             default gen_random_uuid() primary key,
  lat           double precision not null,
  lon           double precision not null,
  query         text             not null,
  radius_km     double precision not null,
  response_json jsonb            not null default '[]',
  created_at    timestamptz      default now() not null
);

-- Composite index for exact-match cache lookups: (lat, lon, query, radius_km)
create index if not exists idx_nearby_places_cache_lookup
  on nearby_places_cache (lat, lon, query, radius_km);

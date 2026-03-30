-- 005_listing_profiles.sql
-- Pre-computed listing profiles for deterministic scoring (Layer 1 → Layer 2)
--
-- Each row represents a comprehensive analysis of a Flatfox listing,
-- produced by the research agent. Consumed by the deterministic scoring
-- engine to generate ScoreResponse without per-user LLM calls.

create table if not exists listing_profiles (
  id               uuid             default gen_random_uuid() primary key,
  listing_id       integer          not null unique,
  slug             text             not null default '',

  -- Objective data (from Flatfox API + scraping)
  title            text,
  address          text,
  city             text,
  zipcode          integer,
  canton           text,              -- e.g. "ZH", "BE"
  country          text not null default 'CH',
  latitude         double precision,
  longitude        double precision,
  price            integer,           -- rent_gross or purchase price
  rent_net         integer,
  rent_charges     integer,
  rooms            double precision,
  sqm              integer,           -- surface_living
  floor            integer,
  year_built       integer,
  year_renovated   integer,
  offer_type       text not null default 'RENT',
  object_category  text not null default 'APARTMENT',
  object_type      text not null default 'APARTMENT',
  is_furnished     boolean not null default false,
  is_temporary     boolean not null default false,
  moving_date      text,
  moving_date_type text,
  attributes       jsonb not null default '[]',
  image_urls       jsonb not null default '[]',
  description      text,

  -- AI-analyzed condition (from images)
  condition_score        integer check (condition_score between 0 and 100),
  natural_light_score    integer check (natural_light_score between 0 and 100),
  kitchen_quality_score  integer check (kitchen_quality_score between 0 and 100),
  bathroom_quality_score integer check (bathroom_quality_score between 0 and 100),
  interior_style         text,     -- 'modern', 'classic', 'renovated', 'dated'
  maintenance_notes      jsonb not null default '[]',

  -- AI-researched neighborhood
  neighborhood_character      text,
  noise_level_estimate        integer check (noise_level_estimate between 0 and 100),
  family_friendly_score       integer check (family_friendly_score between 0 and 100),
  nightlife_proximity_score   integer check (nightlife_proximity_score between 0 and 100),
  green_space_score           integer check (green_space_score between 0 and 100),

  -- Pre-fetched proximity data (Google Places results per category)
  amenities    jsonb not null default '{}',

  -- Swiss-specific context
  canton_tax_rate    double precision,
  avg_rent_for_area  double precision,
  price_vs_market    text,   -- 'below', 'at', 'above'

  -- Free-text research notes
  highlights          jsonb not null default '[]',
  concerns            jsonb not null default '[]',
  description_summary text,

  -- Metadata
  analyzed_at          timestamptz default now() not null,
  flatfox_last_updated text,
  profile_version      integer not null default 1,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);

-- Fast lookup by listing_id (already unique constraint)
create index if not exists idx_listing_profiles_listing_id
  on listing_profiles (listing_id);

-- Spatial lookup for nearby listings
create index if not exists idx_listing_profiles_location
  on listing_profiles (latitude, longitude)
  where latitude is not null and longitude is not null;

-- Filter by offer type and location
create index if not exists idx_listing_profiles_offer_canton
  on listing_profiles (offer_type, canton);

-- Auto-update updated_at trigger
create or replace function update_listing_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listing_profiles_updated_at
  before update on listing_profiles
  for each row
  execute function update_listing_profiles_updated_at();

-- No RLS needed: listing_profiles are system-wide, not per-user.
-- Backend uses service_role key (bypasses RLS) for all operations.

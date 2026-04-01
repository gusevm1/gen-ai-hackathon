-- Bulk OSM POI data for Canton Zürich + LLM neighborhood analyses

create table if not exists neighborhood_pois (
  id             bigint generated always as identity primary key,
  osm_id         bigint not null,
  osm_type       text not null,
  name           text,
  category       text not null,
  category_group text not null,
  lat            double precision not null,
  lon            double precision not null,
  tags           jsonb not null default '{}',
  unique(osm_id, osm_type)
);

create index if not exists idx_neighborhood_pois_coords
  on neighborhood_pois (lat, lon);

create index if not exists idx_neighborhood_pois_category
  on neighborhood_pois (category_group, category);

create table if not exists neighborhood_analyses (
  id                        bigint generated always as identity primary key,
  cell_id                   integer unique not null,
  lat                       double precision not null,
  lon                       double precision not null,
  radius_m                  integer not null default 500,
  poi_counts                jsonb not null default '{}',
  total_pois                integer not null default 0,
  neighborhood_character    text,
  noise_level_estimate      integer,
  family_friendly_score     integer,
  nightlife_proximity_score integer,
  green_space_score         integer,
  transit_score             integer,
  dining_score              integer,
  summary                   text,
  highlights                jsonb default '[]',
  concerns                  jsonb default '[]',
  model_used                text,
  analyzed_at               timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

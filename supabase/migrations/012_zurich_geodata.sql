-- Zürich open data: transit quality, population density, transit stops, noise, etc.
-- Bulk-imported from Canton ZH WFS, Stadt ZH WFS, and opendata CSVs.

create table if not exists zurich_geodata (
  id          bigint generated always as identity primary key,
  source      text not null,       -- 'canton_wfs', 'stadt_wfs', 'opendata_csv'
  dataset     text not null,       -- 'oev_gueteklassen', 'population_ha', 'zvv_stops', etc.
  lat         double precision,
  lon         double precision,
  properties  jsonb not null default '{}',
  geom_type   text,                -- 'point', 'polygon_centroid', 'line_centroid'
  imported_at timestamptz not null default now()
);

-- Primary spatial lookup: filter by dataset then scan lat/lon range
create index if not exists idx_zurich_geodata_dataset_coords
  on zurich_geodata (dataset, lat, lon);

-- Dataset-level queries (counts, deletes for reimport)
create index if not exists idx_zurich_geodata_dataset
  on zurich_geodata (dataset);

-- JSONB property searches (e.g. find by gemeinde name, quartier)
create index if not exists idx_zurich_geodata_props
  on zurich_geodata using gin (properties);

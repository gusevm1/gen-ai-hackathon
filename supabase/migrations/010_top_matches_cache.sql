create table if not exists top_matches_cache (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid not null,
  profile_id   uuid not null,
  matches      jsonb not null default '[]',
  total_scored integer not null default 0,
  computed_at  timestamptz not null default now(),
  stale        boolean not null default false,
  unique(user_id, profile_id)
);

-- RLS
alter table top_matches_cache enable row level security;

create policy "Users can read own cache"
  on top_matches_cache for select
  using (auth.uid() = user_id);

create policy "Service role full access on top_matches_cache"
  on top_matches_cache for all
  using (true)
  with check (true);

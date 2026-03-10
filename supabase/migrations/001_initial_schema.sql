-- User preferences table (one row per user, JSONB for flexibility)
create table if not exists user_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  preferences jsonb not null default '{}',
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Analyses table (one row per user+listing pair)
create table if not exists analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  listing_id text not null,
  score numeric not null,
  breakdown jsonb not null default '{}',
  summary text,
  created_at timestamptz default now() not null,
  unique(user_id, listing_id)
);

-- Row Level Security
alter table user_preferences enable row level security;
alter table analyses enable row level security;

-- Users can only read/write their own preferences
create policy "Users can view own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);

-- Users can only read/write their own analyses
create policy "Users can view own analyses"
  on analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analyses"
  on analyses for update
  using (auth.uid() = user_id);

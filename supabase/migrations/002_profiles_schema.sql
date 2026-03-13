-- 002_profiles_schema.sql
-- Phase 5: DB Schema Migration - Multi-profile support
-- Drops legacy tables (clean slate -- only test data exists), creates profiles + analyses with profile FK

-- ============================================================
-- 1. Drop legacy tables (clean slate -- only test data exists)
-- ============================================================
drop table if exists analyses;
drop table if exists user_preferences;

-- ============================================================
-- 2. Enable extensions
-- ============================================================
create extension if not exists moddatetime schema extensions;

-- ============================================================
-- 3. Create profiles table
-- ============================================================
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Meine Suche'
    check (char_length(name) between 1 and 100),
  preferences jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enforce at most one default profile per user
create unique index idx_profiles_one_default_per_user
  on profiles (user_id)
  where (is_default = true);

-- Performance index for user lookups
create index idx_profiles_user_id on profiles (user_id);

-- Auto-update updated_at
create trigger handle_profiles_updated_at
  before update on profiles
  for each row
  execute procedure extensions.moddatetime(updated_at);

-- ============================================================
-- 4. Create analyses table (with profile_id FK)
-- ============================================================
create table analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  listing_id text not null,
  score numeric not null,
  breakdown jsonb not null default '{}',
  summary text,
  created_at timestamptz default now() not null,
  unique(user_id, listing_id, profile_id)
);

-- Performance index for profile lookups
create index idx_analyses_profile_id on analyses (profile_id);

-- ============================================================
-- 5. RLS policies -- profiles
-- ============================================================
alter table profiles enable row level security;

create policy "Users can view own profiles"
  on profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own profiles"
  on profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own profiles"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own profiles"
  on profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- 6. RLS policies -- analyses
-- ============================================================
alter table analyses enable row level security;

create policy "Users can view own analyses"
  on analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own analyses"
  on analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own analyses"
  on analyses for update
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- 7. RPC: Atomic profile switching
-- ============================================================
create or replace function set_active_profile(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- Look up the profile and verify it exists
  select user_id into v_user_id
    from public.profiles
    where id = target_profile_id;

  if v_user_id is null then
    raise exception 'Profile not found';
  end if;

  -- Verify the caller owns this profile
  if v_user_id != auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Deactivate current default (if any)
  update public.profiles
    set is_default = false
    where user_id = v_user_id
      and is_default = true;

  -- Activate the target profile
  update public.profiles
    set is_default = true
    where id = target_profile_id;
end;
$$;

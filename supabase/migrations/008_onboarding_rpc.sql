-- 008_onboarding_rpc.sql
-- Phase 34: Onboarding Tutorial System
-- Creates RPC function for atomic onboarding state updates in profiles.preferences JSONB

create or replace function update_onboarding_state(
  p_step integer,
  p_active boolean,
  p_completed boolean
) returns void
language plpgsql security definer
as $$
begin
  update profiles
  set preferences = jsonb_set(
    coalesce(preferences, '{}'::jsonb),
    '{onboarding}',
    jsonb_build_object(
      'onboarding_step', p_step,
      'onboarding_active', p_active,
      'onboarding_completed', p_completed
    )
  )
  where user_id = auth.uid()
    and is_default = true;
end;
$$;

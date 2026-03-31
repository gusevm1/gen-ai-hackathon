-- 009_ai_costs.sql
-- Track AI API costs per OpenRouter call for monitoring and budgeting.

create table if not exists ai_costs (
  id               uuid             default gen_random_uuid() primary key,
  created_at       timestamptz      default now() not null,

  -- What triggered this call
  call_type        text not null,    -- 'deterministic_review', 'subjective_scoring', 'bullets_only', etc.
  model            text not null,    -- e.g. 'google/gemini-2.5-flash-lite'

  -- Token usage
  prompt_tokens    integer,
  completion_tokens integer,
  total_tokens     integer,

  -- Cost (from OpenRouter response)
  total_cost       double precision, -- USD

  -- Context
  listing_id       integer,
  user_id          text,

  -- Raw usage JSON from OpenRouter (for debugging)
  raw_usage        jsonb
);

-- Query costs by time range
create index if not exists idx_ai_costs_created_at on ai_costs (created_at);

-- Query costs by type
create index if not exists idx_ai_costs_call_type on ai_costs (call_type);

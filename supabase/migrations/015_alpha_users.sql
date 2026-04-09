create table alpha_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- Seed the founding team members as approved
insert into alpha_users (email, approved) values
  ('maxim.gusev11@gmail.com', true),
  ('prakhargupta00003@gmail.com', true),
  ('rajitpal.singh07@icloud.com', true);

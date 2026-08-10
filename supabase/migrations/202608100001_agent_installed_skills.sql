-- User-owned Agent Skills. Skills are installed through the authenticated
-- server endpoint and are never exposed through direct browser table access.
-- user_id is text because Apparent supports both Supabase UUID identities and
-- Kinde identities (`kinde:<subject>`).

create table if not exists public.agent_installed_skills (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text not null check (role in ('founder', 'investor')),
  name text not null check (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null,
  source_url text not null,
  source_hash text not null,
  version text not null default '',
  instructions text not null,
  metadata jsonb not null default '{}'::jsonb,
  resources jsonb not null default '{}'::jsonb,
  allowed_tools text[] not null default '{}'::text[],
  has_scripts boolean not null default false,
  has_references boolean not null default false,
  has_assets boolean not null default false,
  activation_mode text not null default 'explicit'
    check (activation_mode in ('explicit', 'auto')),
  enabled boolean not null default true,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role, name)
);

create index if not exists agent_installed_skills_owner_idx
  on public.agent_installed_skills (user_id, role, updated_at desc);

alter table public.agent_installed_skills enable row level security;

-- All reads and writes go through /api/agent-skills after requireAgentAccess.
-- No browser role receives direct access, which also keeps Kinde-owned rows
-- enforceable without trying to map a Kinde subject onto auth.uid().
revoke all on public.agent_installed_skills from anon, authenticated;
grant all on public.agent_installed_skills to service_role;

-- VC ⇄ builder interest, powering the Discover swipe deck.
--   like      → soft interest; the founder sees it and can reach out.
--   superlike → the investor's intro DM lands in the founder's inbox directly.
-- Ingested (not-yet-claimed) builders have a null builder_user_id; the like is
-- still stored and becomes a claim incentive ("N investors liked you").

create table if not exists public.vc_interest (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references auth.users(id) on delete cascade,
  investor_name text not null default '',
  builder_id text not null,         -- builder node id (real user id or ingested signal id)
  builder_user_id uuid,             -- the founder's Apparent user id when claimed (enables their read)
  builder_name text not null default '',
  kind text not null default 'like' check (kind in ('like', 'superlike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_id, builder_id)
);

alter table public.vc_interest enable row level security;

-- Investors fully manage their own interest rows.
drop policy if exists "vc_interest owner all" on public.vc_interest;
create policy "vc_interest owner all" on public.vc_interest
  for all using (auth.uid() = investor_id) with check (auth.uid() = investor_id);

-- Founders can read interest expressed in them (so they see who liked them).
drop policy if exists "vc_interest founder reads" on public.vc_interest;
create policy "vc_interest founder reads" on public.vc_interest
  for select using (auth.uid() = builder_user_id);

create index if not exists vc_interest_builder_user_idx on public.vc_interest (builder_user_id);

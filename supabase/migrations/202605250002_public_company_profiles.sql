alter table public.founder_profiles
  add column if not exists profile_name text default '',
  add column if not exists headline text default '',
  add column if not exists bio text default '',
  add column if not exists profile_photo_url text default '',
  add column if not exists website text default '',
  add column if not exists linkedin text default '',
  add column if not exists x_profile text default '',
  add column if not exists past_products text default '',
  add column if not exists public_profile_enabled boolean not null default true;

alter table public.product_launches
  add column if not exists slug text,
  add column if not exists intro text default '',
  add column if not exists location text default '',
  add column if not exists logo_url text default '',
  add column if not exists banner_url text default '',
  add column if not exists demo_video_url text default '',
  add column if not exists pitch_video_url text default '',
  add column if not exists pitch_deck_url text default '',
  add column if not exists pitch_book_note text default '',
  add column if not exists pitch_visibility text not null default 'public',
  add column if not exists founder_signals text[] not null default '{}',
  add column if not exists team_summary text default '',
  add column if not exists customer_summary text default '',
  add column if not exists tech_stack text default '',
  add column if not exists funding_status text default '',
  add column if not exists looking_for text default '',
  add column if not exists public_profile_enabled boolean not null default true;

create unique index if not exists product_launches_slug_unique_idx
  on public.product_launches (slug)
  where slug is not null and slug <> '';

create table if not exists public.launch_team_members (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references public.product_launches(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  apparent_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  role text default '',
  bio text default '',
  location text default '',
  avatar_url text default '',
  profile_url text default '',
  linkedin_url text default '',
  x_profile_url text default '',
  github_url text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists launch_team_members_launch_sort_idx
  on public.launch_team_members (launch_id, sort_order, created_at);

create index if not exists launch_team_members_apparent_user_idx
  on public.launch_team_members (apparent_user_id);

drop trigger if exists launch_team_members_set_updated_at on public.launch_team_members;
create trigger launch_team_members_set_updated_at before update on public.launch_team_members
for each row execute function public.set_updated_at();

alter table public.launch_team_members enable row level security;

drop policy if exists "product launches public profile reads" on public.product_launches;
create policy "product launches public profile reads" on public.product_launches
for select using (public_profile_enabled = true);

drop policy if exists "founder profiles public profile reads" on public.founder_profiles;
create policy "founder profiles public profile reads" on public.founder_profiles
for select using (public_profile_enabled = true);

drop policy if exists "launch team public reads" on public.launch_team_members;
create policy "launch team public reads" on public.launch_team_members
for select using (
  exists (
    select 1
    from public.product_launches
    where product_launches.id = launch_team_members.launch_id
      and product_launches.public_profile_enabled = true
  )
);

drop policy if exists "launch team owner writes" on public.launch_team_members;
create policy "launch team owner writes" on public.launch_team_members
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

grant select on public.founder_profiles to anon, authenticated;
grant select on public.product_launches to anon, authenticated;
grant select on public.launch_team_members to anon, authenticated;
grant insert, update, delete on public.launch_team_members to authenticated;

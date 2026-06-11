-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications + founder→VC "first dibs" push.
--
-- Until now matching was pull-only: a VC saw a founder only if/when the VC
-- happened to browse the radar. This adds a persistent notifications inbox and a
-- SECURITY DEFINER function that, when a founder publishes a public launch,
-- pushes a notification to every on-platform investor whose thesis/sectors
-- overlap the launch — giving platform VCs first dibs before the founder falls
-- back to cold outreach on the heat map.
--
-- The SQL match here is a deliberately coarse first-pass filter (token overlap);
-- the precise, synonym-aware ranking still happens app-side in calculateBuilderFit.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null default '',
  body text default '',
  link text default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at);

-- One launch_match notification per (investor, launch) — re-publishing a launch
-- must not spam the same VC.
create unique index if not exists notifications_launch_match_unique
  on public.notifications (user_id, type, ((data ->> 'launch_id')))
  where type = 'launch_match';

alter table public.notifications enable row level security;

-- Owner can read / mark read / dismiss. There is intentionally NO insert policy:
-- rows are only ever created by the SECURITY DEFINER function below, which runs
-- with elevated rights and bypasses RLS.
drop policy if exists "notifications owner read" on public.notifications;
create policy "notifications owner read" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications owner update" on public.notifications;
create policy "notifications owner update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications owner delete" on public.notifications;
create policy "notifications owner delete" on public.notifications
  for delete using (auth.uid() = user_id);

grant select, update, delete on public.notifications to authenticated;

-- Push "first dibs" notifications to thesis-matched investors for a launch.
-- Only the launch owner may invoke it, and only for a public launch.
create or replace function public.notify_investors_of_launch(p_launch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
  v_public boolean;
  v_haystack text;
  v_terms text[];
  v_founder_name text;
  affected integer := 0;
begin
  select pl.owner_id,
         pl.name,
         pl.public_profile_enabled,
         lower(coalesce(pl.category, '') || ' ' || coalesce(pl.tagline, '') || ' ' ||
               coalesce(pl.name, '') || ' ' || coalesce(pl.stage, ''))
    into v_owner, v_name, v_public, v_haystack
    from public.product_launches pl
   where pl.id = p_launch_id;

  if v_owner is null or v_public is not true then
    return 0;
  end if;

  -- Guard: only the founder who owns the launch can trigger its notifications.
  if auth.uid() <> v_owner then
    return 0;
  end if;

  select coalesce(nullif(fp.profile_name, ''), nullif(pr.display_name, ''),
                  nullif(split_part(coalesce(pr.email, ''), '@', 1), ''), 'A founder')
    into v_founder_name
    from public.profiles pr
    left join public.founder_profiles fp on fp.user_id = pr.id
   where pr.id = v_owner;

  -- Significant tokens (>= 3 chars, minus generic words) from the launch.
  select array_agg(distinct t)
    into v_terms
    from regexp_split_to_table(v_haystack, '[^a-z0-9]+') as t
   where length(t) >= 3
     and t not in ('the','and','for','with','that','this','our','your','are','from','app',
                   'team','new','tech','startup','founder','building','build','tool','tools',
                   'platform','product','software','solution','company','early','stage');

  if v_terms is null or array_length(v_terms, 1) is null then
    return 0;
  end if;

  insert into public.notifications (user_id, type, title, body, link, data)
  select ic.user_id,
         'launch_match',
         v_founder_name || ' launched ' || v_name,
         'A new launch matches your thesis — you have first dibs to review and reach out.',
         '/dashboard',
         jsonb_build_object('launch_id', p_launch_id, 'founder_id', v_owner)
    from public.investor_criteria ic
    join public.profiles pr on pr.id = ic.user_id and pr.role = 'investor'
   where ic.user_id <> v_owner
     and exists (
       select 1
         from regexp_split_to_table(
                lower(coalesce(ic.sectors, '') || ' ' || coalesce(ic.thesis, '')),
                '[^a-z0-9]+'
              ) as ct
        where length(ct) >= 3
          and ct = any (v_terms)
     )
  on conflict (user_id, type, ((data ->> 'launch_id'))) where type = 'launch_match'
  do nothing;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.notify_investors_of_launch(uuid) to authenticated;

-- Ensure realtime fires for the inbox + DM tables the dashboard subscribes to.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.user_messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;



-- Notifications + founder->VC "first dibs" push.
--
-- Until now matching was pull-only: a VC saw a founder only if/when the VC
-- happened to browse the radar. This adds a persistent notifications inbox and a
-- SECURITY DEFINER function that, when a founder publishes a public launch,
-- pushes a notification to every on-platform investor whose thesis/sectors
-- overlap the launch — giving platform VCs first dibs before the founder falls
-- back to cold outreach on the heat map.
--
-- The SQL match here is a deliberately coarse first-pass filter (token overlap);
-- the precise, synonym-aware ranking still happens app-side in calculateBuilderFit.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null default '',
  body text default '',
  link text default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at);

-- One launch_match notification per (investor, launch) — re-publishing a launch
-- must not spam the same VC.
create unique index if not exists notifications_launch_match_unique
  on public.notifications (user_id, type, ((data ->> 'launch_id')))
  where type = 'launch_match';

alter table public.notifications enable row level security;

-- Owner can read / mark read / dismiss. There is intentionally NO insert policy:
-- rows are only ever created by the SECURITY DEFINER function below, which runs
-- with elevated rights and bypasses RLS.
drop policy if exists "notifications owner read" on public.notifications;
create policy "notifications owner read" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications owner update" on public.notifications;
create policy "notifications owner update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications owner delete" on public.notifications;
create policy "notifications owner delete" on public.notifications
  for delete using (auth.uid() = user_id);

grant select, update, delete on public.notifications to authenticated;

-- Push "first dibs" notifications to thesis-matched investors for a launch.
-- Only the launch owner may invoke it, and only for a public launch.
create or replace function public.notify_investors_of_launch(p_launch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
  v_public boolean;
  v_haystack text;
  v_terms text[];
  v_founder_name text;
  affected integer := 0;
begin
  select pl.owner_id,
         pl.name,
         pl.public_profile_enabled,
         lower(coalesce(pl.category, '') || ' ' || coalesce(pl.tagline, '') || ' ' ||
               coalesce(pl.name, '') || ' ' || coalesce(pl.stage, ''))
    into v_owner, v_name, v_public, v_haystack
    from public.product_launches pl
   where pl.id = p_launch_id;

  if v_owner is null or v_public is not true then
    return 0;
  end if;

  -- Guard: only the founder who owns the launch can trigger its notifications.
  if auth.uid() <> v_owner then
    return 0;
  end if;

  select coalesce(nullif(fp.profile_name, ''), nullif(pr.display_name, ''),
                  nullif(split_part(coalesce(pr.email, ''), '@', 1), ''), 'A founder')
    into v_founder_name
    from public.profiles pr
    left join public.founder_profiles fp on fp.user_id = pr.id
   where pr.id = v_owner;

  -- Significant tokens (>= 3 chars, minus generic words) from the launch.
  select array_agg(distinct t)
    into v_terms
    from regexp_split_to_table(v_haystack, '[^a-z0-9]+') as t
   where length(t) >= 3
     and t not in ('the','and','for','with','that','this','our','your','are','from','app',
                   'team','new','tech','startup','founder','building','build','tool','tools',
                   'platform','product','software','solution','company','early','stage');

  if v_terms is null or array_length(v_terms, 1) is null then
    return 0;
  end if;

  insert into public.notifications (user_id, type, title, body, link, data)
  select ic.user_id,
         'launch_match',
         v_founder_name || ' launched ' || v_name,
         'A new launch matches your thesis — you have first dibs to review and reach out.',
         '/dashboard',
         jsonb_build_object('launch_id', p_launch_id, 'founder_id', v_owner)
    from public.investor_criteria ic
    join public.profiles pr on pr.id = ic.user_id and pr.role = 'investor'
   where ic.user_id <> v_owner
     and exists (
       select 1
         from regexp_split_to_table(
                lower(coalesce(ic.sectors, '') || ' ' || coalesce(ic.thesis, '')),
                '[^a-z0-9]+'
              ) as ct
        where length(ct) >= 3
          and ct = any (v_terms)
     )
  on conflict (user_id, type, ((data ->> 'launch_id'))) where type = 'launch_match'
  do nothing;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.notify_investors_of_launch(uuid) to authenticated;

-- Ensure realtime fires for the inbox + DM tables the dashboard subscribes to.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.user_messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

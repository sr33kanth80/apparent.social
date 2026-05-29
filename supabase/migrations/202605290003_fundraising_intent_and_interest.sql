-- ─────────────────────────────────────────────────────────────────────────────
-- Apparent's differentiator layer: opt-in fundraising INTENT + investor INTEREST.
-- This is the thing pure scrapers (Harmonic/Specter/etc.) structurally cannot
-- offer: founders who DECLARE they're raising and are open to contact, plus a
-- come-back loop telling founders who is tracking them.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.founder_profiles
  add column if not exists fundraising_status text not null default 'not_raising', -- 'raising' | 'open' | 'not_raising'
  add column if not exists raising_round text default '',
  add column if not exists raising_amount text default '',
  add column if not exists raising_ask text default '',
  add column if not exists open_to_contact boolean not null default true,
  add column if not exists raising_updated_at timestamptz;

-- Aggregate "who is tracking me" for the calling founder, WITHOUT exposing the
-- investor's private notes/outreach drafts (so we can't just open RLS on
-- builder_discovery_states). SECURITY DEFINER, scoped to auth.uid() as builder.
create or replace function public.founder_interest_summary()
returns table (save_count integer, recent_saver_names text[])
language sql
security definer
set search_path = public
as $$
  select
    count(*)::int as save_count,
    (array_remove(array_agg(p.display_name order by bds.updated_at desc), null))[1:5] as recent_saver_names
  from public.builder_discovery_states bds
  join public.profiles p on p.id = bds.user_id
  where bds.builder_id = auth.uid()::text
    and bds.saved = true;
$$;

grant execute on function public.founder_interest_summary() to authenticated;

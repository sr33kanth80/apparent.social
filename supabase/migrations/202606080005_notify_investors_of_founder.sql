-- ─────────────────────────────────────────────────────────────────────────────
-- Founder amplification — push a founder to the on-platform investors they fit.
--
-- The mirror of notify_investors_of_launch, but profile-driven: when a founder
-- asks their agent to "make me apparent", this matches their profile + dossier
-- against investor theses and notifies the matched on-platform investors. One
-- notification per (investor, founder) so no investor gets spammed.
-- ─────────────────────────────────────────────────────────────────────────────

-- One founder_match notification per (investor, founder).
create unique index if not exists notifications_founder_match_unique
  on public.notifications (user_id, type, ((data ->> 'founder_id')))
  where type = 'founder_match';

create or replace function public.notify_investors_of_founder()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder uuid := auth.uid();
  v_public boolean;
  v_name text;
  v_haystack text;
  v_terms text[];
  affected integer := 0;
begin
  if v_founder is null then
    return 0;
  end if;

  select fp.public_profile_enabled,
         coalesce(nullif(fp.profile_name, ''), nullif(pr.display_name, ''),
                  nullif(split_part(coalesce(pr.email, ''), '@', 1), ''), 'A founder'),
         lower(coalesce(fp.category, '') || ' ' || coalesce(fp.headline, '') || ' ' ||
               coalesce(fp.bio, '') || ' ' || coalesce(fp.current_build, '') || ' ' ||
               coalesce(fp.traction, '') || ' ' || coalesce(fp.agent_dossier, ''))
    into v_public, v_name, v_haystack
    from public.founder_profiles fp
    join public.profiles pr on pr.id = fp.user_id
   where fp.user_id = v_founder;

  if v_public is not true then
    return 0;
  end if;

  -- Fold the founder's public launches into the match haystack.
  select v_haystack || ' ' || coalesce(string_agg(
           lower(coalesce(pl.category, '') || ' ' || coalesce(pl.tagline, '') || ' ' || coalesce(pl.name, '')), ' '
         ), '')
    into v_haystack
    from public.product_launches pl
   where pl.owner_id = v_founder and pl.public_profile_enabled = true;

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
         'founder_match',
         v_name || ' matches your thesis',
         'A founder on Apparent fits what you invest in — view their dossier and reach out.',
         '/dashboard',
         jsonb_build_object('founder_id', v_founder)
    from public.investor_criteria ic
    join public.profiles pr on pr.id = ic.user_id and pr.role = 'investor'
   where ic.user_id <> v_founder
     and exists (
       select 1
         from regexp_split_to_table(
                lower(coalesce(ic.sectors, '') || ' ' || coalesce(ic.thesis, '')),
                '[^a-z0-9]+'
              ) as ct
        where length(ct) >= 3
          and ct = any (v_terms)
     )
  on conflict (user_id, type, ((data ->> 'founder_id'))) where type = 'founder_match'
  do nothing;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.notify_investors_of_founder() to authenticated;

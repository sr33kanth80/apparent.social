-- ─────────────────────────────────────────────────────────────────────────────
-- npx apparent — upload + claim handoff.
--
-- The CLI uploads an APPROVED build payload (aggregate git stats only — never
-- source) to /api/cli-ingest, which stores it here keyed by a short code and
-- returns a claim URL. The founder signs in and calls claim_cli_build(code),
-- which merges the build into their founder_profiles dossier — the same dossier
-- the investor agent already reads. One submission, one claim, 30-min expiry.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.cli_build_submissions (
  code text primary key,
  payload jsonb not null,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create index if not exists cli_build_submissions_expiry_idx on public.cli_build_submissions (expires_at);

-- No client access. Rows are inserted by api/cli-ingest (service role) and read
-- by the SECURITY DEFINER claim fn below — both bypass RLS.
alter table public.cli_build_submissions enable row level security;

create or replace function public.claim_cli_build(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_top_desc text;
  v_commits int;
  v_lang_summary text;
  v_name text;
  v_narrative text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select payload into v_payload
    from public.cli_build_submissions
   where code = p_code and claimed_by is null and expires_at > now();

  if v_payload is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  v_commits := coalesce((v_payload->'totals'->>'commits')::int, 0);
  v_top_desc := v_payload->'projects'->0->>'description';
  v_name := coalesce(nullif(v_payload->>'displayName', ''), 'A builder');

  -- Top 3 languages, in order, as "TypeScript 54% · SQL 25% · ...".
  select string_agg(t.name || ' ' || t.pct || '%', ' · ')
    into v_lang_summary
  from (
    select l->>'name' as name, l->>'percent' as pct
    from jsonb_array_elements(v_payload->'languages') with ordinality as a(l, ord)
    order by ord
    limit 3
  ) t;

  v_narrative := v_name || ' — ' ||
                 coalesce(nullif(v_top_desc, ''), 'building in public') || '. ' ||
                 v_commits || ' commits' ||
                 coalesce(' · ' || v_lang_summary, '') || '. (via npx apparent)';

  -- Make sure a founder_profiles row exists (public_profile_enabled defaults true).
  insert into public.founder_profiles (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  -- Merge the build in. Store the full payload under dossier.cli_build; only fill
  -- summary/narrative/build fields when empty so a richer GitHub-verified dossier
  -- or the founder's own edits are never clobbered.
  update public.founder_profiles fp set
    dossier = coalesce(fp.dossier, '{}'::jsonb) || jsonb_build_object('cli_build', v_payload),
    github_summary = coalesce(
      nullif(fp.github_summary, ''),
      v_commits || ' commits' || coalesce(' · ' || v_lang_summary, '')
    ),
    agent_dossier = coalesce(nullif(fp.agent_dossier, ''), v_narrative),
    current_build = coalesce(nullif(fp.current_build, ''), nullif(v_top_desc, '')),
    dossier_updated_at = now()
  where fp.user_id = v_uid;

  update public.cli_build_submissions
     set claimed_by = v_uid, claimed_at = now()
   where code = p_code;

  return jsonb_build_object(
    'ok', true,
    'commits', v_commits,
    'languages', coalesce(v_lang_summary, ''),
    'project', coalesce(v_payload->'projects'->0->>'name', '')
  );
end;
$$;

grant execute on function public.claim_cli_build(text) to authenticated;

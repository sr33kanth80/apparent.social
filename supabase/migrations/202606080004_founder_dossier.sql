-- ─────────────────────────────────────────────────────────────────────────────
-- Founder dossier — the founder agent's GitHub-enriched, investor-facing profile.
--
-- The founder agent pulls the founder's PUBLIC GitHub (repos, languages, stars,
-- READMEs, bio) and synthesizes a concise dossier. These columns live on the
-- already-public founder_profiles row, so the investor agent reads them for free
-- via search_apparent_founders — the shared-data handoff between the two agents.
--
-- Written server-side (service role) by api/founder-enrich.js. No new RLS needed:
-- the existing "founder profiles discoverable reads" policy already exposes the
-- row, and these columns carry only public info.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.founder_profiles
  add column if not exists github_summary text default '',
  add column if not exists agent_dossier text default '',
  add column if not exists dossier jsonb not null default '{}'::jsonb,
  add column if not exists dossier_updated_at timestamptz;

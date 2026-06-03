-- ─────────────────────────────────────────────────────────────────────────────
-- Persist the founder's GitHub OAuth token (encrypted at rest with an
-- application key derived from GITHUB_OAUTH_SECRET, so a Supabase compromise
-- alone never leaks the raw tokens). Used by /api/github/contributions to
-- fetch the real GitHub contribution calendar on the public profile.
--
-- Lock it down at the column-grant level: only the service-role server (the
-- OAuth confirm + the contributions endpoint) can read or write it. Founders
-- never see their own ciphertext, never need to; their JWT can't touch it.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.founder_profiles
  add column if not exists github_access_token_enc text default '';

-- Lock SELECT + UPDATE + INSERT on the new column from the authenticated and
-- anon roles. Even an exhaustive `select *` from the client cannot pull this
-- column back.
revoke select (github_access_token_enc) on public.founder_profiles from authenticated;
revoke select (github_access_token_enc) on public.founder_profiles from anon;
revoke update (github_access_token_enc) on public.founder_profiles from authenticated;
revoke update (github_access_token_enc) on public.founder_profiles from anon;
revoke insert (github_access_token_enc) on public.founder_profiles from authenticated;
revoke insert (github_access_token_enc) on public.founder_profiles from anon;

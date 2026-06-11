-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening — close cross-user data exposure in the RLS layer.
--
-- Three independent fixes, all reversible, no data migration:
--   1. profiles.email was world-readable (anon + authenticated) because the
--      "profiles public reads" policy uses `using(true)` for the /@username
--      pages. Email rode along. The client no longer selects email at all
--      (it only ever used the local-part as a display-name fallback, which
--      `username` already carries), so we revoke the column outright.
--   2. The original v1 "founder profiles discoverable reads" policy granted
--      anon SELECT whenever ANY field was non-empty — it was never dropped
--      when the public_profile_enabled policy was added later, and permissive
--      policies OR together, so a founder with public profile OFF was still
--      fully readable. Drop the stale policy so the toggle actually hides them.
--   3. investor_criteria was readable by ANY authenticated member (thesis,
--      check_size, pass_signals, portfolio_examples). The app's only reader
--      already filters public_profile_enabled = true, so the blanket
--      authenticated-read clause was unused. Scope it to opted-in rows + owner.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Stop exposing email to the client roles. Service role still reads it.
revoke select (email) on public.profiles from anon;
revoke select (email) on public.profiles from authenticated;

-- 2. Remove the stale permissive founder-profile read policy. The
--    "founder profiles public profile reads" policy (public_profile_enabled)
--    and the owner "founder profiles own rows" policy remain.
drop policy if exists "founder profiles discoverable reads" on public.founder_profiles;

-- 3. Tighten investor_criteria reads to opted-in-public rows (or the owner).
drop policy if exists "investor criteria platform reads" on public.investor_criteria;
create policy "investor criteria public reads" on public.investor_criteria
  for select using (
    public_profile_enabled = true   -- opted into a public profile
    or auth.uid() = user_id         -- own row
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Lock the GitHub-verification columns so only the trusted server (service
-- role, via the OAuth callback) can write them. Without this, a founder could
-- set github_verified = true on their own row through the normal profile
-- update path and fake the badge — which would gut the whole point of the
-- trust layer.
--
-- Column-level REVOKE is enforced by Postgres below RLS: the authenticated /
-- anon roles simply cannot UPDATE these columns. The service-role key (used by
-- api/github/confirm) bypasses this, so the verified write still works.
-- Founders updating the rest of their profile are unaffected — their save
-- never touches these columns.
-- ─────────────────────────────────────────────────────────────────────────────

revoke update (github_verified, github_username, github_verified_at)
  on public.founder_profiles from authenticated;
revoke update (github_verified, github_username, github_verified_at)
  on public.founder_profiles from anon;

-- Stripe-connected metric columns get the same lock for the next phase — only
-- the Stripe sync (service role) should ever write verified revenue.
revoke update (stripe_connected, stripe_account_id, stripe_connected_at, mrr_cents, active_customers, mrr_synced_at)
  on public.founder_profiles from authenticated;
revoke update (stripe_connected, stripe_account_id, stripe_connected_at, mrr_cents, active_customers, mrr_synced_at)
  on public.founder_profiles from anon;

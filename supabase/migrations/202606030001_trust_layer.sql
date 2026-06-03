-- ─────────────────────────────────────────────────────────────────────────────
-- Trust layer: verifiable founder proof.
--
-- Apparent does NOT do diligence. It makes a founder's proof verifiable so a
-- VC's own diligence runs faster. Two sources, both opt-in:
--   * GitHub  — ownership proven via a public-gist code check (no OAuth app).
--   * Stripe  — read-only Connect link; we surface "Stripe connected" + the
--               founder's own monthly revenue series. Never a guarantee, just
--               a connected fact the VC can read.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.founder_profiles
  -- GitHub ownership proof. github_username is the resolved login; verified
  -- flips true only after the gist-code check passes.
  add column if not exists github_username text default '',
  add column if not exists github_verified boolean not null default false,
  add column if not exists github_verified_at timestamptz,
  -- Stripe read-only Connect. account_id is the connected acct_… id; the rest
  -- is a cached snapshot refreshed by the sync job. mrr_cents/customer_count
  -- are display facts, always shown with their as-of timestamp.
  add column if not exists stripe_connected boolean not null default false,
  add column if not exists stripe_account_id text default '',
  add column if not exists stripe_connected_at timestamptz,
  add column if not exists mrr_cents bigint,
  add column if not exists active_customers integer,
  add column if not exists mrr_synced_at timestamptz;

-- Monthly revenue series for the founder's project page chart. One row per
-- (user, month). Populated by the Stripe sync — never user-editable, so the
-- chart can't be hand-faked (the whole point of the connected layer).
create table if not exists public.founder_revenue_monthly (
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- First day of the month, UTC. e.g. 2026-05-01.
  month date not null,
  mrr_cents bigint not null default 0,
  currency text not null default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

create index if not exists founder_revenue_monthly_user_idx
  on public.founder_revenue_monthly (user_id, month);

drop trigger if exists founder_revenue_monthly_set_updated_at on public.founder_revenue_monthly;
create trigger founder_revenue_monthly_set_updated_at
  before update on public.founder_revenue_monthly
  for each row execute function public.set_updated_at();

alter table public.founder_revenue_monthly enable row level security;

-- Owner can read their own series. Anyone can read the series of a founder
-- who has a public profile enabled (so the VC-facing project page chart
-- works). Writes are service-role only — there is deliberately NO insert /
-- update / delete policy, so the numbers can only be written by the trusted
-- Stripe sync running with the service key.
drop policy if exists "revenue owner read" on public.founder_revenue_monthly;
create policy "revenue owner read" on public.founder_revenue_monthly
  for select using (auth.uid() = user_id);

drop policy if exists "revenue public read for public founders" on public.founder_revenue_monthly;
create policy "revenue public read for public founders" on public.founder_revenue_monthly
  for select using (
    exists (
      select 1
      from public.product_launches pl
      where pl.owner_id = founder_revenue_monthly.user_id
        and pl.public_profile_enabled = true
    )
  );

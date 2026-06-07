-- ─────────────────────────────────────────────────────────────────────────────
-- VC-grade founder profile fields.
--
-- VCs are the paying side of Apparent — they need decision-grade data on every
-- founder profile, not just a name + headline. This migration adds the columns
-- the dashboard form now writes (typed traction signal, team size, prior raise,
-- target close date) plus a cached `profile_completeness` score so VC views can
-- gate + sort founders without recomputing on every read.
--
-- All columns are nullable / default-empty so existing rows continue to load
-- and existing inserts/upserts (which omit these keys) keep working.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.founder_profiles
  -- Typed traction signal. `traction_type` ∈
  -- ('mrr' | 'users' | 'gmv' | 'prototype' | 'loi' | 'pmf' | ''), and
  -- `traction_value` holds the matching freeform metric, e.g.
  -- "$24K MRR · +22% MoM", "12K WAU", "3 signed LOIs".
  add column if not exists traction_type text not null default '',
  add column if not exists traction_value text not null default '',

  -- Team headcount including founders. Stored as text so we can use bands
  -- ("3-5", "11+") rather than forcing a precise integer.
  add column if not exists team_size text not null default '',

  -- Capital raised before the current round. Freeform string so founders can
  -- say "$500K pre-seed", "None", "$2M (SAFE)", etc.
  add column if not exists prior_raise_amount text not null default '',

  -- Target close date for the current round. ISO date string; nullable when
  -- the founder hasn't picked a date or isn't actively raising. Used as an
  -- urgency signal in VC views.
  add column if not exists target_close_date date,

  -- Cached 0-100 weighted completeness score (recomputed in the app layer on
  -- every save by `computeFounderCompleteness`). Drives VC visibility gating
  -- + default sort order in investor discovery views.
  add column if not exists profile_completeness smallint not null default 0;

-- Keep the cached score in a sane range even if a future bug tries to write
-- something out of bounds.
alter table public.founder_profiles
  drop constraint if exists founder_profiles_profile_completeness_range;
alter table public.founder_profiles
  add constraint founder_profiles_profile_completeness_range
    check (profile_completeness between 0 and 100);

-- VCs default-sort and filter by `profile_completeness`, so an index on it
-- (scoped to publicly-visible profiles) keeps the discovery feed snappy as
-- the founder set grows.
create index if not exists founder_profiles_completeness_idx
  on public.founder_profiles (profile_completeness desc)
  where public_profile_enabled = true;

-- The typed traction filter ("show me founders with revenue") benefits from
-- a small index too — most queries will combine it with stage/category.
create index if not exists founder_profiles_traction_type_idx
  on public.founder_profiles (traction_type)
  where traction_type <> '';

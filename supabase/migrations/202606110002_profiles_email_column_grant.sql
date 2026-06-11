-- ─────────────────────────────────────────────────────────────────────────────
-- Fix the profiles.email exposure properly.
--
-- 202606110001 tried `revoke select (email) ...`, but that is a no-op here: a
-- COLUMN-level revoke cannot subtract from a TABLE-level grant, and earlier
-- migrations did `grant select on public.profiles to anon, authenticated`
-- (whole table). Postgres keeps the broad table grant, so email stayed
-- readable.
--
-- The only way to hide one column when callers need the others is to drop the
-- table-wide SELECT and re-grant SELECT on the explicit non-email columns.
-- RLS ("profiles public reads" = using(true)) still governs which ROWS are
-- visible; this governs which COLUMNS. The app selects profiles columns
-- explicitly (id, role, username, display_name) — never `select *` — so no
-- client read breaks. Service role keeps full access for auth/server paths.
--
-- profiles columns: id, role, email, display_name, created_at, updated_at,
-- username. Everything except email is re-granted below.
-- ─────────────────────────────────────────────────────────────────────────────

revoke select on public.profiles from anon;
revoke select on public.profiles from authenticated;

grant select (id, role, username, display_name, created_at, updated_at)
  on public.profiles to anon, authenticated;

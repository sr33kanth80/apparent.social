-- Remember that a company's roles were looked up, even when none came back.
--
-- Fetching one company's roles is a paid call. Some companies genuinely have
-- none to find: their domain is not in the provider's index, or it is a stray
-- like "social.abb" derived from a social page rather than a real website.
-- Without a record of the attempt, every visitor who opened that company would
-- pay for the same empty lookup again.

alter table public.companies
  add column if not exists roles_checked_at timestamptz;

-- Finding companies whose roles are worth (re)checking.
create index if not exists companies_roles_checked_idx
  on public.companies (roles_checked_at);

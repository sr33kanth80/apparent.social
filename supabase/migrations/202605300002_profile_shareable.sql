-- Lets a founder/investor turn the public "Share profile" button off if they
-- prefer (the profile stays public; this only hides the in-app share affordance).
alter table public.founder_profiles
  add column if not exists shareable boolean not null default true;

alter table public.investor_criteria
  add column if not exists shareable boolean not null default true;

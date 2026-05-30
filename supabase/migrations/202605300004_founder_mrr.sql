-- Optional headline revenue metric for founders (e.g. "$24K MRR · +22% MoM").
-- Shown as a highlighted stat on the founder's public profile when set.
alter table public.founder_profiles
  add column if not exists mrr text not null default '';

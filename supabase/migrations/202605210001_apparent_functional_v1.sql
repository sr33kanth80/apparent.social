create extension if not exists pgcrypto;

do $$ begin
  create type public.apparent_role as enum ('founder', 'investor');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.deal_stage as enum ('New', 'Reviewing', 'Reached Out', 'Meeting', 'Watchlist');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.apparent_role not null,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.founder_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_build text default '',
  category text default '',
  stage text default '',
  github text default '',
  traction text default '',
  looking_for text default '',
  location text default '',
  press text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investor_criteria (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  thesis text default '',
  sectors text default '',
  stage text default '',
  check_size text default '',
  geography text default '',
  founder_signals text default '',
  pass_signals text default '',
  portfolio_examples text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_signals (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  founder text not null,
  detail text not null,
  source_type text not null,
  source_url text not null,
  profile_url text not null,
  stage text default '',
  location text default '',
  freshness_at timestamptz not null default now(),
  github_url text default '',
  raw_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.investor_signal_states (
  investor_id uuid not null references public.profiles(id) on delete cascade,
  signal_id uuid not null references public.source_signals(id) on delete cascade,
  stage public.deal_stage not null default 'New',
  saved boolean not null default true,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (investor_id, signal_id)
);

create table if not exists public.outreach_drafts (
  investor_id uuid not null references public.profiles(id) on delete cascade,
  signal_id uuid not null references public.source_signals(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (investor_id, signal_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_digest_enabled boolean not null default true,
  slack_alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_launches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  tagline text default '',
  category text default '',
  stage text default '',
  launch_url text default '',
  proof_url text default '',
  metrics text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles(id) on delete set null,
  host_role public.apparent_role not null default 'investor',
  title text not null,
  audience text default '',
  city text default '',
  venue text default '',
  starts_at timestamptz not null default now(),
  capacity integer not null default 25,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetup_rsvps (
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'attending',
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

create table if not exists public.term_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  instrument text default '',
  amount text default '',
  valuation text default '',
  pro_rata text default '',
  notes text default '',
  status text not null default 'Reviewing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recipient text not null,
  subject text default '',
  body text default '',
  status text not null default 'draft',
  context text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_item_actions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  saved boolean not null default false,
  reposted boolean not null default false,
  reply text default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.builder_discovery_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  builder_id text not null,
  saved boolean not null default false,
  hidden boolean not null default false,
  stage public.deal_stage,
  note text default '',
  outreach_body text default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, builder_id)
);

create index if not exists founder_profiles_location_idx on public.founder_profiles ((lower(location)));
create index if not exists founder_profiles_category_idx on public.founder_profiles ((lower(category)));
create index if not exists founder_profiles_stage_idx on public.founder_profiles ((lower(stage)));
create index if not exists product_launches_owner_updated_idx on public.product_launches (owner_id, updated_at desc);
create index if not exists builder_discovery_states_user_builder_idx on public.builder_discovery_states (user_id, builder_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists founder_profiles_set_updated_at on public.founder_profiles;
create trigger founder_profiles_set_updated_at before update on public.founder_profiles
for each row execute function public.set_updated_at();

drop trigger if exists investor_criteria_set_updated_at on public.investor_criteria;
create trigger investor_criteria_set_updated_at before update on public.investor_criteria
for each row execute function public.set_updated_at();

drop trigger if exists investor_signal_states_set_updated_at on public.investor_signal_states;
create trigger investor_signal_states_set_updated_at before update on public.investor_signal_states
for each row execute function public.set_updated_at();

drop trigger if exists outreach_drafts_set_updated_at on public.outreach_drafts;
create trigger outreach_drafts_set_updated_at before update on public.outreach_drafts
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists product_launches_set_updated_at on public.product_launches;
create trigger product_launches_set_updated_at before update on public.product_launches
for each row execute function public.set_updated_at();

drop trigger if exists meetups_set_updated_at on public.meetups;
create trigger meetups_set_updated_at before update on public.meetups
for each row execute function public.set_updated_at();

drop trigger if exists term_reviews_set_updated_at on public.term_reviews;
create trigger term_reviews_set_updated_at before update on public.term_reviews
for each row execute function public.set_updated_at();

drop trigger if exists user_messages_set_updated_at on public.user_messages;
create trigger user_messages_set_updated_at before update on public.user_messages
for each row execute function public.set_updated_at();

drop trigger if exists feed_item_actions_set_updated_at on public.feed_item_actions;
create trigger feed_item_actions_set_updated_at before update on public.feed_item_actions
for each row execute function public.set_updated_at();

drop trigger if exists builder_discovery_states_set_updated_at on public.builder_discovery_states;
create trigger builder_discovery_states_set_updated_at before update on public.builder_discovery_states
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.founder_profiles enable row level security;
alter table public.investor_criteria enable row level security;
alter table public.source_signals enable row level security;
alter table public.investor_signal_states enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.user_settings enable row level security;
alter table public.product_launches enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_rsvps enable row level security;
alter table public.term_reviews enable row level security;
alter table public.user_messages enable row level security;
alter table public.feed_item_actions enable row level security;
alter table public.builder_discovery_states enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "founder profiles own rows" on public.founder_profiles;
create policy "founder profiles own rows" on public.founder_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "founder profiles discoverable reads" on public.founder_profiles;
create policy "founder profiles discoverable reads" on public.founder_profiles
for select using (
  coalesce(current_build, '') <> ''
  or coalesce(category, '') <> ''
  or coalesce(stage, '') <> ''
  or coalesce(github, '') <> ''
  or coalesce(traction, '') <> ''
  or coalesce(location, '') <> ''
  or coalesce(press, '') <> ''
);

drop policy if exists "investor criteria own rows" on public.investor_criteria;
create policy "investor criteria own rows" on public.investor_criteria
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "source signals readable" on public.source_signals;
create policy "source signals readable" on public.source_signals
for select using (true);

drop policy if exists "signal states own rows" on public.investor_signal_states;
create policy "signal states own rows" on public.investor_signal_states
for all using (auth.uid() = investor_id) with check (auth.uid() = investor_id);

drop policy if exists "outreach drafts own rows" on public.outreach_drafts;
create policy "outreach drafts own rows" on public.outreach_drafts
for all using (auth.uid() = investor_id) with check (auth.uid() = investor_id);

drop policy if exists "settings own rows" on public.user_settings;
create policy "settings own rows" on public.user_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "product launches readable" on public.product_launches;
create policy "product launches readable" on public.product_launches
for select using (true);

drop policy if exists "product launches own writes" on public.product_launches;
create policy "product launches own writes" on public.product_launches
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "meetups readable" on public.meetups;
create policy "meetups readable" on public.meetups
for select using (true);

drop policy if exists "meetups host writes" on public.meetups;
create policy "meetups host writes" on public.meetups
for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists "meetup rsvps readable" on public.meetup_rsvps;
create policy "meetup rsvps readable" on public.meetup_rsvps
for select using (true);

drop policy if exists "meetup rsvps own writes" on public.meetup_rsvps;
create policy "meetup rsvps own writes" on public.meetup_rsvps
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "term reviews own rows" on public.term_reviews;
create policy "term reviews own rows" on public.term_reviews
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user messages own rows" on public.user_messages;
create policy "user messages own rows" on public.user_messages
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "feed actions own rows" on public.feed_item_actions;
create policy "feed actions own rows" on public.feed_item_actions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "builder discovery states own rows" on public.builder_discovery_states;
create policy "builder discovery states own rows" on public.builder_discovery_states
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.source_signals
  (company, founder, detail, source_type, source_url, profile_url, stage, location, freshness_at, github_url, raw_tags)
values
  ('KernelTrace', 'Maya Chen', 'GitHub-native analytics for engineering leaders. New repository activity, two design partners, and repeat weekly usage.', 'GitHub + launch post', 'https://github.com/', '/profile/maya-chen', 'Seed', 'Brooklyn', now() - interval '18 minutes', 'https://github.com/', array['devtools','analytics','github','seed']),
  ('AgentDock', 'Arjun Patel', 'Open-source agent deployment control plane with launch traction from infra-heavy teams and strong technical documentation.', 'Product launch + docs', 'https://github.com/', '/profile/arjun-patel', 'Pre-seed', 'San Francisco', now() - interval '41 minutes', 'https://github.com/', array['infra','agents','open-source','pre-seed']),
  ('HelpLoop AI', 'Nora Ellis', 'AI support automation with a public customer case study and visible hiring signal around implementation engineering.', 'Customer story', 'https://example.com/customer-story', '/profile/nora-ellis', 'Seed', 'Seattle', now() - interval '2 hours', '', array['ai','support','automation','seed']),
  ('SchemaPilot', 'Elena Morris', 'Database migration assistant showing fresh Hacker News attention, CLI usage, and a sharp wedge for platform teams.', 'HN + package installs', 'https://news.ycombinator.com/', '/profile/elena-morris', 'Pre-seed', 'Remote', now() - interval '1 day', 'https://github.com/', array['database','cli','infra','pre-seed']),
  ('Briefwise', 'Samir Rao', 'Workflow automation for legal ops with a fast-moving founder, early pilots, and narrow ICP clarity.', 'Founder profile', 'https://example.com/briefwise', '/profile/samir-rao', 'Seed', 'Austin', now() - interval '1 day', '', array['workflow','legal-ops','automation','seed'])
on conflict do nothing;

insert into public.meetups
  (title, audience, city, venue, starts_at, capacity, description, host_role)
values
  ('AI Infra Builder Office Hours', 'Technical founders building deployment, evals, and observability tools.', 'San Francisco', 'South Park Commons', now() + interval '3 days', 32, 'Small room for founders with public proof and infra-heavy users.', 'investor'),
  ('Devtools Demo Night', 'Builders shipping developer workflows with active GitHub or package signals.', 'New York', 'Union Square Loft', now() + interval '8 days', 45, 'Demo-format meetup with investor follow-up slots after each product walkthrough.', 'investor')
on conflict do nothing;

create table if not exists public.vc_contacts (
  id uuid primary key default gen_random_uuid(),
  import_source text not null default '2000 Plus VC Contact Emails.xlsx',
  source_row_number integer not null,
  investor_name text not null,
  fund_type text default '',
  fund_stage text default '',
  website text default '',
  fund_focus_sectors text default '',
  partner_name text default '',
  partner_email text not null,
  portfolio_companies text default '',
  location text default '',
  normalized_city text default '',
  latitude double precision,
  longitude double precision,
  twitter_url text default '',
  linkedin_url text default '',
  facebook_url text default '',
  number_of_investments integer not null default 0,
  number_of_exits integer not null default 0,
  fund_description text default '',
  founding_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vc_contacts_source_row_unique unique (source_row_number),
  constraint vc_contacts_partner_email_present check (length(trim(partner_email)) > 0)
);

create index if not exists vc_contacts_location_idx on public.vc_contacts ((lower(location)));
create index if not exists vc_contacts_normalized_city_idx on public.vc_contacts ((lower(normalized_city)));
create index if not exists vc_contacts_fund_stage_idx on public.vc_contacts using gin (to_tsvector('simple', coalesce(fund_stage, '')));
create index if not exists vc_contacts_focus_idx on public.vc_contacts using gin (to_tsvector('simple', coalesce(fund_focus_sectors, '')));
create index if not exists vc_contacts_partner_email_idx on public.vc_contacts ((lower(partner_email)));

drop trigger if exists vc_contacts_set_updated_at on public.vc_contacts;
create trigger vc_contacts_set_updated_at before update on public.vc_contacts
for each row execute function public.set_updated_at();

alter table public.vc_contacts enable row level security;

drop policy if exists "vc contacts founder reads" on public.vc_contacts;
create policy "vc contacts founder reads" on public.vc_contacts
for select using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'founder'::public.apparent_role
  )
);

grant select on public.vc_contacts to authenticated;

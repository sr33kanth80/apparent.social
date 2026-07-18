create table if not exists public.kinde_identities (
  kinde_user_id text primary key,
  role text not null check (role in ('founder', 'investor')),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kinde_identities enable row level security;

revoke all on table public.kinde_identities from anon, authenticated;

comment on table public.kinde_identities is
  'Immutable server-side binding between a verified Kinde subject and its Apparent dashboard role.';

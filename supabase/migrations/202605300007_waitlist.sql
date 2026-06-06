-- ─────────────────────────────────────────────────────────────────────────────
-- Public-launch waitlist. Anyone (anon) can sign up — they leave an email
-- and optionally tell us which side of the table they're on. Only admins
-- (service-role / authenticated admin role) can read the list back.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Soft hint about who the signup is — never validated, never used for
  -- access. Just useful for segmenting the early-access announcement email.
  role text default '' check (role in ('', 'founder', 'investor', 'curious')),
  -- Where on the site the signup happened (e.g. 'landing-cta', 'for-founders').
  source text default 'landing-cta',
  -- Optional user-agent + referrer so we can spot bot waves without storing
  -- IPs. Set client-side; empty string when absent.
  user_agent text default '',
  referrer text default '',
  created_at timestamptz not null default now(),
  constraint waitlist_signups_email_present check (length(trim(email)) > 0),
  constraint waitlist_signups_email_shape check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- One row per email — repeat submits return the existing row instead of
  -- a UNIQUE-violation error.
  constraint waitlist_signups_email_unique unique (email)
);

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);
create index if not exists waitlist_signups_role_idx
  on public.waitlist_signups (role);

alter table public.waitlist_signups enable row level security;

-- Anyone (even anon) can insert. Read is locked down — only the service role
-- (admin scripts, scheduled jobs) can SELECT, and there's no UPDATE/DELETE
-- policy so the rows are append-only from the client side.
drop policy if exists "waitlist anon insert" on public.waitlist_signups;
create policy "waitlist anon insert" on public.waitlist_signups
  for insert with check (true);

grant insert on public.waitlist_signups to anon, authenticated;

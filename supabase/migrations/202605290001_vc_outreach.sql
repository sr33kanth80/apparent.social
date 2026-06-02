-- ─────────────────────────────────────────────────────────────────────────────
-- VC outreach: per-founder log of cold emails sent to VCs + saved templates.
-- Powers the "Compose" dialog on the heat map (last-contacted counter,
-- mark-as-sent) and the founder dashboard's outreach kanban
-- (Drafted → Sent → Replied → Meeting → Passed).
-- ─────────────────────────────────────────────────────────────────────────────

-- The vc_contact_key is the lower-cased partner email (or, when missing,
-- "name|website") so the same VC dedupes correctly across the bundled seed
-- list and the live vc_contacts table.
create table if not exists public.vc_outreach_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vc_contact_key text not null,
  vc_contact_id uuid references public.vc_contacts(id) on delete set null,
  to_email text not null,
  to_name text default '',
  investor_name text default '',
  partner_name text default '',
  subject text default '',
  body text default '',
  stage text not null default 'Drafted'
    check (stage in ('Drafted', 'Sent', 'Replied', 'Meeting', 'Passed')),
  sent_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vc_outreach_log_user_vc_unique unique (user_id, vc_contact_key)
);

create index if not exists vc_outreach_log_user_idx
  on public.vc_outreach_log (user_id, updated_at desc);
create index if not exists vc_outreach_log_stage_idx
  on public.vc_outreach_log (user_id, stage);
create index if not exists vc_outreach_log_sent_idx
  on public.vc_outreach_log (user_id, sent_at desc);

drop trigger if exists vc_outreach_log_set_updated_at on public.vc_outreach_log;
create trigger vc_outreach_log_set_updated_at
  before update on public.vc_outreach_log
  for each row execute function public.set_updated_at();

alter table public.vc_outreach_log enable row level security;

drop policy if exists "outreach owner read" on public.vc_outreach_log;
create policy "outreach owner read" on public.vc_outreach_log
  for select using (auth.uid() = user_id);

drop policy if exists "outreach owner write" on public.vc_outreach_log;
create policy "outreach owner write" on public.vc_outreach_log
  for insert with check (auth.uid() = user_id);

drop policy if exists "outreach owner update" on public.vc_outreach_log;
create policy "outreach owner update" on public.vc_outreach_log
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "outreach owner delete" on public.vc_outreach_log;
create policy "outreach owner delete" on public.vc_outreach_log
  for delete using (auth.uid() = user_id);

-- Reusable email templates (subject + body) with `{{founder_name}}`,
-- `{{my_company}}`, `{{vc_partner}}`, `{{vc_firm}}`, `{{traction}}` variables
-- substituted client-side at compose time.
create table if not exists public.vc_outreach_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled template',
  subject text default '',
  body text default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vc_outreach_templates_user_idx
  on public.vc_outreach_templates (user_id, updated_at desc);

drop trigger if exists vc_outreach_templates_set_updated_at on public.vc_outreach_templates;
create trigger vc_outreach_templates_set_updated_at
  before update on public.vc_outreach_templates
  for each row execute function public.set_updated_at();

alter table public.vc_outreach_templates enable row level security;

drop policy if exists "templates owner read" on public.vc_outreach_templates;
create policy "templates owner read" on public.vc_outreach_templates
  for select using (auth.uid() = user_id);

drop policy if exists "templates owner write" on public.vc_outreach_templates;
create policy "templates owner write" on public.vc_outreach_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "templates owner update" on public.vc_outreach_templates;
create policy "templates owner update" on public.vc_outreach_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "templates owner delete" on public.vc_outreach_templates;
create policy "templates owner delete" on public.vc_outreach_templates
  for delete using (auth.uid() = user_id);

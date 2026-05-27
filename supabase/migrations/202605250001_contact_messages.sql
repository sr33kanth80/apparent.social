create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  email text not null check (char_length(email) between 3 and 320),
  company text check (company is null or char_length(company) <= 180),
  role text not null default 'Other' check (char_length(role) <= 80),
  topic text not null default 'General' check (char_length(topic) <= 120),
  message text not null check (char_length(message) between 1 and 5000),
  page_url text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages (status);

alter table public.contact_messages enable row level security;

drop policy if exists "contact messages public insert" on public.contact_messages;
create policy "contact messages public insert" on public.contact_messages
for insert
with check (true);

grant insert on public.contact_messages to anon, authenticated;

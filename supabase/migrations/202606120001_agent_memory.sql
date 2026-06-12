-- Personal agent memory and provenance.
--
-- Agents can ingest external sources and draft workspace/profile changes, but
-- durable memory stays owned by the authenticated user. Profile edits are still
-- applied through the existing dashboard save flow after review.

create table if not exists public.agent_source_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('founder', 'investor')),
  source_type text not null default 'url',
  source_url text not null default '',
  title text not null default '',
  status text not null default 'used' check (status in ('used', 'unavailable', 'ignored')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists agent_source_records_user_created_idx
  on public.agent_source_records (user_id, created_at desc);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('founder', 'investor')),
  scope text not null check (scope in ('profile', 'preference', 'source', 'action', 'conversation_summary')),
  key text not null,
  value text not null default '',
  source_url text not null default '',
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_memories_user_scope_idx
  on public.agent_memories (user_id, scope, updated_at desc);

create unique index if not exists agent_memories_user_role_scope_key_unique
  on public.agent_memories (user_id, role, scope, key);

alter table public.agent_source_records enable row level security;
alter table public.agent_memories enable row level security;

drop policy if exists "agent source records owner read" on public.agent_source_records;
create policy "agent source records owner read" on public.agent_source_records
  for select using (auth.uid() = user_id);

drop policy if exists "agent source records owner insert" on public.agent_source_records;
create policy "agent source records owner insert" on public.agent_source_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "agent memories owner read" on public.agent_memories;
create policy "agent memories owner read" on public.agent_memories
  for select using (auth.uid() = user_id);

drop policy if exists "agent memories owner insert" on public.agent_memories;
create policy "agent memories owner insert" on public.agent_memories
  for insert with check (auth.uid() = user_id);

drop policy if exists "agent memories owner update" on public.agent_memories;
create policy "agent memories owner update" on public.agent_memories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert on public.agent_source_records to authenticated;
grant select, insert, update on public.agent_memories to authenticated;

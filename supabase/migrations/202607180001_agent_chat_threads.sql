-- Durable, owner-scoped Apparent Agent conversations.
-- Converts the former one-transcript-per-role history into a real thread model
-- without discarding any existing messages.

create table if not exists public.agent_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('founder', 'investor')),
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_chat_threads_user_role_updated_idx
  on public.agent_chat_threads (user_id, role, updated_at desc);

alter table public.agent_chat_messages
  add column if not exists thread_id uuid references public.agent_chat_threads(id) on delete cascade;

-- Preserve each legacy founder/investor transcript as its own conversation.
insert into public.agent_chat_threads (user_id, role, title, created_at, updated_at)
select
  messages.user_id,
  messages.role,
  left(coalesce(
    (array_agg(nullif(trim(messages.content), '') order by messages.created_at)
      filter (where messages.message_role = 'user'))[1],
    'Previous conversation'
  ), 90),
  min(messages.created_at),
  max(messages.created_at)
from public.agent_chat_messages messages
where messages.thread_id is null
group by messages.user_id, messages.role;

update public.agent_chat_messages messages
set thread_id = threads.id
from public.agent_chat_threads threads
where messages.thread_id is null
  and threads.user_id = messages.user_id
  and threads.role = messages.role;

alter table public.agent_chat_messages
  alter column thread_id set not null;

drop index if exists agent_chat_messages_user_role_created_idx;
create index if not exists agent_chat_messages_thread_created_idx
  on public.agent_chat_messages (thread_id, created_at asc);

alter table public.agent_chat_threads enable row level security;

drop policy if exists "agent chat threads owner read" on public.agent_chat_threads;
create policy "agent chat threads owner read" on public.agent_chat_threads
  for select using (auth.uid() = user_id);

drop policy if exists "agent chat threads owner insert" on public.agent_chat_threads;
create policy "agent chat threads owner insert" on public.agent_chat_threads
  for insert with check (auth.uid() = user_id);

drop policy if exists "agent chat threads owner update" on public.agent_chat_threads;
create policy "agent chat threads owner update" on public.agent_chat_threads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agent chat threads owner delete" on public.agent_chat_threads;
create policy "agent chat threads owner delete" on public.agent_chat_threads
  for delete using (auth.uid() = user_id);

drop policy if exists "agent chat messages owner insert" on public.agent_chat_messages;
create policy "agent chat messages owner insert" on public.agent_chat_messages
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.agent_chat_threads threads
      where threads.id = thread_id
        and threads.user_id = auth.uid()
        and threads.role = agent_chat_messages.role
    )
  );

grant select, insert, update, delete on public.agent_chat_threads to authenticated;

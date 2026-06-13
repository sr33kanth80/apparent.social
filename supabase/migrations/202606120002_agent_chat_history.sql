-- Server-side agent chat history.
--
-- Durable agent memory is stored in agent_memories; this table stores the
-- visible transcript so a user can sign in from another device and resume the
-- same founder/investor agent conversation.

create table if not exists public.agent_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('founder', 'investor')),
  message_role text not null check (message_role in ('user', 'assistant')),
  content text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_chat_messages_user_role_created_idx
  on public.agent_chat_messages (user_id, role, created_at asc);

alter table public.agent_chat_messages enable row level security;

drop policy if exists "agent chat messages owner read" on public.agent_chat_messages;
create policy "agent chat messages owner read" on public.agent_chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists "agent chat messages owner insert" on public.agent_chat_messages;
create policy "agent chat messages owner insert" on public.agent_chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "agent chat messages owner delete" on public.agent_chat_messages;
create policy "agent chat messages owner delete" on public.agent_chat_messages
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.agent_chat_messages to authenticated;

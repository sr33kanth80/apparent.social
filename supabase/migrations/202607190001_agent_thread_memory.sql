-- Tie conversational memories to their originating Agent thread so removing a
-- conversation also removes the summaries derived from it. Profile,
-- preference, source, and action memories remain user-scoped and untouched.

alter table public.agent_memories
  add column if not exists thread_id uuid references public.agent_chat_threads(id) on delete cascade;

create index if not exists agent_memories_thread_idx
  on public.agent_memories (thread_id)
  where thread_id is not null;

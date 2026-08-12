-- Agent transcripts are append/update-by-id. This policy lets an owner update
-- presentation payloads (proposal state, research trail) without deleting and
-- reinserting the full conversation.

drop policy if exists "agent chat messages owner update" on public.agent_chat_messages;
create policy "agent chat messages owner update" on public.agent_chat_messages
  for update using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.agent_chat_threads threads
      where threads.id = thread_id
        and threads.user_id = auth.uid()
        and threads.role = agent_chat_messages.role
    )
  ) with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.agent_chat_threads threads
      where threads.id = thread_id
        and threads.user_id = auth.uid()
        and threads.role = agent_chat_messages.role
    )
  );

grant update on public.agent_chat_messages to authenticated;

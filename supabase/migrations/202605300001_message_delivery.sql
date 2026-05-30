-- Two-way DM delivery: messages can be addressed to a real Apparent member so
-- they land in that member's inbox (not just the sender's outbox).
alter table public.user_messages
  add column if not exists recipient_id uuid references public.profiles(id) on delete set null,
  add column if not exists sender_name text default '';

create index if not exists user_messages_recipient_idx
  on public.user_messages (recipient_id, created_at desc);

-- Owner keeps full control of their own rows (compose/edit/delete).
drop policy if exists "user messages own rows" on public.user_messages;
create policy "user messages owner all" on public.user_messages
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- The addressed recipient can READ messages sent to them (their inbox). They
-- reply by composing a new message they own, so no write access is needed here.
drop policy if exists "user messages recipient reads" on public.user_messages;
create policy "user messages recipient reads" on public.user_messages
  for select using (auth.uid() = recipient_id);

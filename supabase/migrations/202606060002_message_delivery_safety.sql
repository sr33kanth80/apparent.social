-- Safety replay for the old 202605300001_message_delivery migration. The repo
-- previously had two 202605300001 migrations, so an existing production DB may
-- have recorded that version for the waitlist migration instead. These
-- statements are idempotent and ensure DM delivery columns/policies exist.

alter table public.user_messages
  add column if not exists recipient_id uuid references public.profiles(id) on delete set null,
  add column if not exists sender_name text default '';

create index if not exists user_messages_recipient_idx
  on public.user_messages (recipient_id, created_at desc);

drop policy if exists "user messages own rows" on public.user_messages;
drop policy if exists "user messages owner all" on public.user_messages;
create policy "user messages owner all" on public.user_messages
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "user messages recipient reads" on public.user_messages;
create policy "user messages recipient reads" on public.user_messages
  for select using (auth.uid() = recipient_id);

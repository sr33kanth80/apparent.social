-- ─────────────────────────────────────────────────────────────────────────────
-- Message read state. Until now a recipient had no way to know a DM arrived:
-- there was no unread tracking. This adds a `read_at` timestamp (null = unread
-- for the recipient) plus a SECURITY DEFINER RPC the recipient calls to mark a
-- whole conversation read. We use an RPC rather than a broad UPDATE policy so
-- recipients can only flip read state — not edit the sender's message body.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.user_messages
  add column if not exists read_at timestamptz;

-- Fast "my unread inbox" lookups.
create index if not exists user_messages_unread_idx
  on public.user_messages (recipient_id, read_at);

-- Mark every unread message from `p_counterparty` to the caller as read.
-- Returns how many rows were flipped.
create or replace function public.mark_thread_read(p_counterparty uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.user_messages
    set read_at = now()
    where recipient_id = auth.uid()
      and owner_id = p_counterparty
      and read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.mark_thread_read(uuid) to authenticated;

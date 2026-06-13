-- Persistent API rate-limit buckets for agent endpoints.
--
-- The API writes these rows with the service role key. No client grants are
-- provided; this table is backend-only usage protection.

create table if not exists public.agent_rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists agent_rate_limits_reset_idx
  on public.agent_rate_limits (reset_at);

alter table public.agent_rate_limits enable row level security;

revoke all on public.agent_rate_limits from anon, authenticated;

create or replace function public.consume_agent_rate_limit(
  bucket_key text,
  window_ms integer,
  max_count integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  next_reset timestamptz := now_ts + ((greatest(window_ms, 1)::text || ' milliseconds')::interval);
  next_count integer;
  bucket_reset timestamptz;
begin
  if bucket_key is null or bucket_key = '' or max_count < 1 then
    return query select false, 60;
    return;
  end if;

  insert into public.agent_rate_limits as bucket (key, count, reset_at, updated_at)
  values (bucket_key, 1, next_reset, now_ts)
  on conflict (key) do update
    set count = case
          when bucket.reset_at <= now_ts then 1
          else bucket.count + 1
        end,
        reset_at = case
          when bucket.reset_at <= now_ts then excluded.reset_at
          else bucket.reset_at
        end,
        updated_at = now_ts
  returning count, reset_at into next_count, bucket_reset;

  return query
    select
      next_count <= max_count,
      case
        when next_count <= max_count then 0
        else greatest(1, ceil(extract(epoch from (bucket_reset - now_ts)))::integer)
      end;
end;
$$;

revoke all on function public.consume_agent_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_agent_rate_limit(text, integer, integer) to service_role;

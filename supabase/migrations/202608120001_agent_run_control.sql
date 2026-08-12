-- Distributed admission, idempotency, and usage accounting for paid Agent work.
-- Every Vercel instance goes through these RPCs before it may spend against the
-- shared Orthogonal account.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  user_key text not null,
  role text not null check (role in ('founder', 'investor')),
  endpoint text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'cancelled', 'expired')),
  reserved_spend_cents integer not null default 0 check (reserved_spend_cents >= 0),
  call_count integer not null default 0 check (call_count >= 0),
  spend_cents numeric(12, 4) not null default 0 check (spend_cents >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  response_payload jsonb,
  started_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists agent_runs_active_idx
  on public.agent_runs (status, lease_expires_at)
  where status = 'running';

create index if not exists agent_runs_user_started_idx
  on public.agent_runs (user_key, started_at desc);

create index if not exists agent_runs_started_idx
  on public.agent_runs (started_at desc);

alter table public.agent_runs enable row level security;
revoke all on public.agent_runs from anon, authenticated;

create or replace function public.begin_agent_run(
  p_request_key text,
  p_user_key text,
  p_role text,
  p_endpoint text,
  p_global_limit integer,
  p_user_limit integer,
  p_lease_seconds integer,
  p_reserved_spend_cents integer,
  p_daily_user_spend_cents integer,
  p_daily_global_spend_cents integer
)
returns table(
  action text,
  run_id uuid,
  retry_after integer,
  response_payload jsonb,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  day_start timestamptz := date_trunc('day', now_ts at time zone 'UTC') at time zone 'UTC';
  existing public.agent_runs%rowtype;
  active_global integer;
  active_user integer;
  committed_global numeric;
  committed_user numeric;
  new_id uuid;
begin
  if p_request_key is null or length(p_request_key) < 16 or length(p_request_key) > 160
     or p_user_key is null or p_user_key = '' or length(p_user_key) > 320
     or p_role not in ('founder', 'investor') or p_endpoint is null or p_endpoint = ''
     or p_global_limit < 1 or p_user_limit < 1 or p_lease_seconds < 30
     or p_reserved_spend_cents < 0 or p_daily_user_spend_cents < 1
     or p_daily_global_spend_cents < 1 then
    return query select 'invalid'::text, null::uuid, 0, null::jsonb, 'invalid_agent_run'::text;
    return;
  end if;

  -- One lock serializes the inexpensive admission decision across all serverless
  -- instances. Agent execution itself never holds this lock.
  perform pg_advisory_xact_lock(hashtext('apparent-agent-admission'));

  update public.agent_runs as runs
  set status = 'expired',
      error_code = coalesce(runs.error_code, 'agent_run_lease_expired'),
      completed_at = now_ts,
      updated_at = now_ts
  where status = 'running' and lease_expires_at <= now_ts;

  select * into existing
  from public.agent_runs
  where request_key = p_request_key
  limit 1;

  if found then
    if existing.user_key <> p_user_key or existing.role <> p_role then
      return query select 'conflict'::text, null::uuid, 0, null::jsonb, 'agent_run_key_conflict'::text;
    elsif existing.status = 'completed' then
      return query select 'completed'::text, existing.id, 0, existing.response_payload, null::text;
    elsif existing.status = 'running' and existing.lease_expires_at > now_ts then
      return query select 'running'::text, existing.id,
        greatest(1, ceil(extract(epoch from (existing.lease_expires_at - now_ts)))::integer),
        null::jsonb, null::text;
    else
      return query select existing.status, existing.id, 0, null::jsonb,
        coalesce(existing.error_code, 'agent_run_not_reusable');
    end if;
    return;
  end if;

  select count(*)::integer into active_global
  from public.agent_runs
  where status = 'running' and lease_expires_at > now_ts;

  select count(*)::integer into active_user
  from public.agent_runs
  where status = 'running' and lease_expires_at > now_ts and user_key = p_user_key;

  if active_user >= p_user_limit then
    return query select 'user_busy'::text, null::uuid, 15, null::jsonb, 'agent_user_concurrency'::text;
    return;
  end if;

  if active_global >= p_global_limit then
    return query select 'global_busy'::text, null::uuid, 20, null::jsonb, 'agent_global_concurrency'::text;
    return;
  end if;

  -- A lease may expire after the provider has already accepted work. Keep its
  -- reservation in today's budget instead of releasing capacity we may have
  -- already spent upstream.
  select coalesce(sum(case when status in ('running', 'expired') then reserved_spend_cents else spend_cents end), 0)
    into committed_global
  from public.agent_runs
  where started_at >= day_start and status in ('running', 'completed', 'failed', 'expired');

  select coalesce(sum(case when status in ('running', 'expired') then reserved_spend_cents else spend_cents end), 0)
    into committed_user
  from public.agent_runs
  where started_at >= day_start and user_key = p_user_key
    and status in ('running', 'completed', 'failed', 'expired');

  if committed_user + p_reserved_spend_cents > p_daily_user_spend_cents then
    return query select 'user_quota'::text, null::uuid,
      greatest(1, ceil(extract(epoch from ((day_start + interval '1 day') - now_ts)))::integer),
      null::jsonb, 'agent_user_daily_budget'::text;
    return;
  end if;

  if committed_global + p_reserved_spend_cents > p_daily_global_spend_cents then
    return query select 'global_quota'::text, null::uuid,
      greatest(1, ceil(extract(epoch from ((day_start + interval '1 day') - now_ts)))::integer),
      null::jsonb, 'agent_global_daily_budget'::text;
    return;
  end if;

  insert into public.agent_runs (
    request_key, user_key, role, endpoint, reserved_spend_cents, lease_expires_at
  ) values (
    p_request_key, p_user_key, p_role, p_endpoint, p_reserved_spend_cents,
    now_ts + make_interval(secs => p_lease_seconds)
  ) returning id into new_id;

  return query select 'started'::text, new_id, 0, null::jsonb, null::text;
end;
$$;

create or replace function public.finish_agent_run(
  p_run_id uuid,
  p_user_key text,
  p_status text,
  p_call_count integer,
  p_spend_cents numeric,
  p_duration_ms integer,
  p_error_code text default null,
  p_response_payload jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  if p_status not in ('completed', 'failed', 'cancelled') then return false; end if;

  update public.agent_runs
  set status = p_status,
      call_count = greatest(coalesce(p_call_count, 0), 0),
      spend_cents = greatest(coalesce(p_spend_cents, 0), 0),
      duration_ms = greatest(coalesce(p_duration_ms, 0), 0),
      error_code = nullif(left(coalesce(p_error_code, ''), 160), ''),
      response_payload = case when p_status = 'completed' then p_response_payload else null end,
      completed_at = now(),
      updated_at = now()
  where id = p_run_id and user_key = p_user_key and status = 'running';

  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.get_agent_run(
  p_request_key text,
  p_user_key text
)
returns table(
  status text,
  response_payload jsonb,
  error_code text,
  retry_after integer
)
language sql
security definer
set search_path = public
as $$
  select
    case when runs.status = 'running' and runs.lease_expires_at <= now() then 'expired' else runs.status end,
    case when runs.status = 'completed' then runs.response_payload else null end,
    case
      when runs.status = 'running' and runs.lease_expires_at <= now() then 'agent_run_lease_expired'
      else runs.error_code
    end,
    case
      when runs.status = 'running' and runs.lease_expires_at > now()
        then greatest(1, ceil(extract(epoch from (runs.lease_expires_at - now())))::integer)
      else 0
    end
  from public.agent_runs runs
  where runs.request_key = p_request_key and runs.user_key = p_user_key
  limit 1;
$$;

revoke all on function public.begin_agent_run(text, text, text, text, integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.finish_agent_run(uuid, text, text, integer, numeric, integer, text, jsonb) from public;
revoke all on function public.get_agent_run(text, text) from public;
grant execute on function public.begin_agent_run(text, text, text, text, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.finish_agent_run(uuid, text, text, integer, numeric, integer, text, jsonb) to service_role;
grant execute on function public.get_agent_run(text, text) to service_role;

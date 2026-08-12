-- Qualify agent_runs.error_code so PL/pgSQL never confuses it with the
-- begin_agent_run table-return field of the same name. The original migration
-- is corrected for fresh databases; this replacement repairs projects that
-- already applied it.

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

revoke all on function public.begin_agent_run(text, text, text, text, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.begin_agent_run(text, text, text, text, integer, integer, integer, integer, integer, integer) to service_role;

# Apparent Agent launch runbook

The Agent remains a modular part of the Apparent/Vercel application. Supabase is
the shared control plane for admission, idempotency, usage accounting, and chat
state; Orthogonal remains the inference/tool gateway.

## Required deployment order

1. Apply all Supabase migrations, including:
   - `202608120001_agent_run_control.sql`
   - `202608120002_agent_chat_message_updates.sql`
2. Set the server-only variables in `.env.example` on Vercel. Never prefix the
   Orthogonal or service-role keys with `VITE_`.
3. Deploy the application.
4. Verify one founder Agent run, one investor Agent run, and `/api/agent-run`
   reconnection before opening Apparent Agent to the public.

Production intentionally fails closed if either the persistent rate limiter or
distributed admission RPC is unavailable. This prevents a Supabase outage or a
missed migration from turning horizontal Vercel scaling into uncontrolled paid
Orthogonal traffic.

## Initial capacity policy

- Global active paid runs: 8
- Active runs per user: 1
- Safe runtime: 240 seconds inside Vercel's 300-second ceiling
- Reserved spend per normal Agent turn: 100 cents
- User daily reserved/actual spend: 500 cents
- Global daily reserved/actual spend: 10,000 cents

These are safety defaults, not measured provider capacity. Increase the global
concurrency only after Orthogonal confirms sustained RPS, burst RPS, concurrent
`/v1/run` allowance, model token limits, and 429 behavior. Change one limit at a
time and observe at least a full traffic cycle.

## Operational queries

Run these from the Supabase SQL editor with an administrative account.

```sql
-- Current pressure
select endpoint, count(*) as active
from public.agent_runs
where status = 'running' and lease_expires_at > now()
group by endpoint;

-- Last 24 hours: reliability, latency, and spend
select
  endpoint,
  count(*) as runs,
  count(*) filter (where status = 'completed') as completed,
  count(*) filter (where status <> 'completed') as unsuccessful,
  round(avg(duration_ms)) as avg_duration_ms,
  percentile_cont(0.95) within group (order by duration_ms) as p95_duration_ms,
  round(sum(spend_cents), 2) as spend_cents
from public.agent_runs
where started_at >= now() - interval '24 hours'
group by endpoint
order by endpoint;

-- Failure reasons
select error_code, count(*)
from public.agent_runs
where started_at >= now() - interval '24 hours' and status <> 'completed'
group by error_code
order by count(*) desc;
```

## Alert thresholds

- Orthogonal balance below two days of recent average spend.
- Any `agent_global_daily_budget` response.
- More than 5% unsuccessful runs over 15 minutes.
- p95 duration above 210 seconds.
- Any `agent_run_lease_expired` event.
- Orthogonal 402, repeated 429, or repeated upstream 5xx responses.

Orthogonal exposes `/v1/credits/balance` and `/v1/credits/usage`; check both in
the provider dashboard until automated alerting is connected.

## Incident controls

- **Unexpected spend:** set `AGENT_GLOBAL_CONCURRENCY_MAX=1`, reduce
  `AGENT_GLOBAL_DAILY_SPEND_CENTS`, and redeploy. Set it back gradually only
  after identifying the route/user in `agent_runs`.
- **Orthogonal 429s:** lower global concurrency. Do not raise retry counts; paid
  retries already reuse one idempotency key and extra retries increase latency.
- **Supabase control-plane failure:** leave fail-closed behavior enabled. Restore
  Supabase/RPC availability rather than enabling process-local limits in public.
- **Long-run failures:** inspect p95 and error codes. The browser can reconnect to
  completed runs, while the runtime exits before Vercel's hard timeout.
- **Rollback:** Vercel rollback is safe. Do not remove the `agent_runs` table;
  older deployments simply ignore it.

## Pre-launch verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
git diff --check
```

Then run a provider-approved staged test at 5, 10, and 25 concurrent users. The
expected result above the configured cap is a controlled 409/429—not additional
Orthogonal work. Never conduct a live paid load test without approval and a
temporary global daily budget.

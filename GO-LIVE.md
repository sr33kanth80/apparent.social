# Apparent — Go-Live Checklist

Operational steps for testing the full two-sided product and the `npx apparent` CLI.

## 1. Supabase migrations

Run the migrations in the SQL editor in filename order. They are idempotent. In particular, verify the founder dossier columns, founder amplification RPC, CLI build submissions, durable agent memories/transcripts, and agent rate-limit migrations have been applied.

Quick verification for the original launch-critical objects:

```sql
select to_regclass('public.cli_build_submissions') as cli_table,
       (select count(*) from pg_proc where proname='notify_investors_of_founder') as has_founder_push,
       (select count(*) from pg_proc where proname='claim_cli_build') as has_claim,
       (select count(*) from information_schema.columns
         where table_name='founder_profiles' and column_name='agent_dossier') as has_dossier;
```

## 2. Environment variables

Set these in Vercel under Project → Settings → Environment Variables.

Required:

- `ORTHOGONAL_API_KEY` — server-only key for Apparent inference and external research. Never prefix it with `VITE_`.
- `SUPABASE_SERVICE_ROLE_KEY` — founder enrichment, CLI ingest, scheduled ingestion, and other privileged server routes.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase client and authenticated API access.
- `GITHUB_OAUTH_SECRET` — GitHub token decryption for founder dossiers.

Verified Apparent agent defaults (optional overrides):

- `ORTHOGONAL_INFERENCE_API=baseten`
- `ORTHOGONAL_INFERENCE_PATH=/v1/chat/completions`
- `APPARENT_AGENT_MODEL=zai-org/GLM-5.2`
- `ORTHOGONAL_AGENT_MAX_CALLS=44`
- `ORTHOGONAL_AGENT_MAX_SPEND_CENTS=100`
- `ORTHOGONAL_TIMEOUT_MS=45000`

The runtime rejects Anthropic, Claude, and OpenAI inference slugs. It also checks fixed catalog pricing before paid calls, bounds agent context, and keeps the Orthogonal key server-side.

Optional:

- `AGENT_CRON_SECRET` — authenticates scheduled ingestion and follow-up endpoints.
- `INGEST_TARGET_COUNT` — web-ingestion target count (default 24, maximum 60).

Redeploy after any environment change.

## 3. `npx apparent` CLI

- Confirm `https://apparent.social` serves the deployment containing `/api/cli-ingest`. Otherwise attach the domain in Vercel or update `BASE_URL` in `cli/lib/config.js` before publishing.
- Bump the CLI package version for a new release, then publish from `D:\SocialVC\apparent\cli` with `npm publish --access public`.

## 4. Investor deal-flow ingestion

`/api/ingest-signals` keeps the investor dashboard populated with fresh, deduplicated sourced startups before native founders onboard.

Required environment variables are `ORTHOGONAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, and `AGENT_CRON_SECRET`.

Run every 12 hours:

```text
POST https://apparent.social/api/ingest-signals
x-agent-cron-secret: <AGENT_CRON_SECRET>
```

Discovery targets the union of sectors in real `investor_criteria` rows and falls back to a default sector set. Rows are deduplicated on `(source_type, source_url)` and remain labeled `Sourced`, never `Verified`.

Verify with:

```sql
select count(*) from source_signals where source_type='web';
```

Then check `scrape_runs` for `apparent-orthogonal-discovery`.

## 5. End-to-end smoke test

1. Investor agent: sign in with a thesis, ask for matching founders, then ask for off-platform sourcing and draft outreach. Verify auto-send only occurs after direct outreach intent.
2. Founder dossier: connect GitHub and confirm the dossier card builds.
3. Founder agent: find matching investors, draft an intro, then explicitly ask to be amplified.
4. Profile setup: give each agent a public profile/product URL and verify it returns a reviewable patch rather than silently editing the profile.
5. Launch push: publish a public launch and confirm matched investors receive the realtime notification.
6. CLI: run `npx apparent` in a repository, accept consent, claim the build, and confirm it appears on the founder profile.
7. Security: verify a pasted webpage instruction cannot trigger outreach/amplification or cause private memory to appear in an external search query.

## 6. Honest limits

- Sourced deal flow is AI-discovered and unverified; investors should treat it as leads.
- Off-platform email remains draft-to-inbox and is never sent by the backend.
- Public research accepts only disclosure-safe search terms and exact user-supplied/search-returned URLs, so the agent may ask the user for a clearer public query or URL.
- Off-hours follow-ups require a scheduler and `AGENT_CRON_SECRET`.
- Git line counts are presentation metadata, not investor underwriting.

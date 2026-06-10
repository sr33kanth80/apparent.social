# Apparent — Go-Live Checklist

Everything operational (not code) that must be in place before testing the full
two-sided product + the `npx apparent` CLI. Do these in order.

## 1. Supabase migrations (run in the SQL editor, in order)

| Migration | Adds | Status |
|---|---|---|
| `202606080001_message_read_state.sql` | DM unread state + `mark_thread_read` | ✅ applied |
| `202606080002_notifications.sql` | notifications inbox + `notify_investors_of_launch` + realtime | ✅ applied |
| `202606080003_agent_autonomy.sql` | `agent_autonomy` on user_settings | ✅ applied |
| `202606080004_founder_dossier.sql` | founder dossier columns (GitHub enrichment) | ⏳ run it |
| `202606080005_notify_investors_of_founder.sql` | founder amplification RPC | ⏳ run it |
| `202606080006_cli_build_claim.sql` | `cli_build_submissions` + `claim_cli_build` (npx apparent) | ⏳ run it |

> Each is idempotent — safe to re-run. Quick verify after running the last three:
> ```sql
> select to_regclass('public.cli_build_submissions') as cli_table,
>        (select count(*) from pg_proc where proname='notify_investors_of_founder') as has_founder_push,
>        (select count(*) from pg_proc where proname='claim_cli_build') as has_claim,
>        (select count(*) from information_schema.columns
>          where table_name='founder_profiles' and column_name='agent_dossier') as has_dossier;
> ```
> All four should be non-null / non-zero.

## 2. Environment variables (Vercel → Project → Settings → Env)

**Required**
- `ANTHROPIC_API_KEY` — both agents, founder enrichment. ✅ set (⚠️ **fund credits** — nothing responds on an empty balance).
- `SUPABASE_SERVICE_ROLE_KEY` — founder enrichment, CLI ingest, GitHub contributions. (Confirm it's set — several server routes need it.)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — ✅ already set.
- `GITHUB_OAUTH_SECRET` — GitHub token decrypt for the dossier. ✅ already set.

**Optional (features degrade gracefully if absent)**
- `HUNTER_API_KEY` — verified emails for off-platform contact enrichment (else the agent uses web search).
- `FOUNDER_ENRICH_MODEL` — override the founder-enrichment model (default `claude-sonnet-4-6`).
- `AGENT_CRON_SECRET` (+ service role) — enables the off-hours follow-up endpoint `/api/agent-followups` for a Claude Code Routine to call.

After adding/changing env vars: **redeploy**.

## 3. `npx apparent` CLI

- [ ] Confirm `https://apparent.social` serves THIS deployment (where `/api/cli-ingest` lives).
      If not, either attach the domain in Vercel **or** change `BASE_URL` in `cli/lib/config.js`
      to the live production URL before publishing.
- [ ] Publish:
      ```cmd
      cd /d D:\SocialVC\apparent\cli
      npm publish --access public
      ```
      (version is `0.2.0`; bump it for each subsequent publish.)

## 4. End-to-end smoke test

1. **Investor agent** — sign in as an investor with a thesis set; open the overview chat; ask
   "show me founders raising now that fit my thesis." Flip the autonomy toggle; try
   "find founders not on Apparent and prep intros."
2. **Founder dossier** — sign in as a founder, connect GitHub, confirm the dossier card builds.
3. **Founder agent** — "which investors fit me," draft an intro, "put me in front of investors."
4. **Launch push** — publish a public launch; confirm matched investors get the first-dibs
   notification (live, no refresh = realtime is wired).
5. **`npx apparent`** — run it in a repo, type `y` at the consent prompt, follow the claim link,
   sign in, confirm the build lands on the founder profile.

## 5. Known honest limits (by design, for later)
- Off-hours autonomous follow-ups need the Routine + `AGENT_CRON_SECRET` wired (optional).
- Off-platform email is always draft-to-inbox (no send backend — intentional).
- Git line counts feed the brag card, not investor underwriting.

# Apparent — Launch Checklist

**What this is:** Apparent is a web app — a React single-page site with a small set of serverless backend functions — that runs on **Vercel**, stores its data in **Supabase** (a hosted Postgres database), signs users in through **Kinde**, stores uploaded files in **Cloudflare R2**, and runs an Apparent-owned founder/investor agent runtime backed by **Orthogonal**. It's already partly live at `apparent.social`; this guide closes the gap between "partly live" and "a stranger can sign up and use it safely."

**Estimated time to complete:** ~4–6 hours of active work, spread over 1–2 days (some steps wait on DNS or API verification).

**Estimated running cost:** roughly **$25–60/month** to start — Vercel Hobby/Pro ($0–20), Supabase Free/Pro ($0–25), Kinde Free, Cloudflare R2 (~$0–5 at low volume), plus Orthogonal pay-per-call usage (depends on agent traffic — budget $10–30 to start and watch it).

**There is no payments step.** The audit found no Stripe/Paddle/payment code — Apparent is free at this stage. When you add paid plans later, re-run this skill and a payments phase will appear.

### How to read each step

- 🧑 **You** — needs your identity, an account, a payment method, or a judgement call. An agent can't (or shouldn't) do it for you.
- 🤖 **Agent** — paste the quoted prompt into your coding agent and it does the work in the codebase.
- 🤝 **Together** — the agent prepares it; you click the final button or paste a value into a dashboard.

> **Golden rule about secrets:** API keys, database passwords, and tokens are like house keys. Never paste them into a chat, never commit them into your code. They go in **one place only** — the hosting platform's "Environment Variables" settings screen. This guide will say "🧑 You" for every step that touches a real secret, because only you should handle them.

---

## Phase 0 — Fix the blockers first

These are things the audit found that should be fixed *before* you invite real users. Each is small.

### 0.1 — Stop shipping the private VC contact list to the browser 🤖 · ~20 min

Right now the file `src/data/vc-contact-seed.ts` (your full VC contact database, ~3.9 MB) is bundled into the public website. That means two problems: every visitor downloads ~700 KB of extra data they don't need, **and** anyone can open their browser's developer tools and read your entire VC contact list. It's used in `src/components/logo-cloud.tsx` and `src/lib/dashboard-service.ts`.

> **Prompt for your agent:**
> "The file `src/data/vc-contact-seed.ts` is being imported into client-side code (`src/components/logo-cloud.tsx` and `src/lib/dashboard-service.ts`) and is bundled into the public browser build — this exposes the full VC contact list to any visitor and adds ~700 KB gzipped. Audit both usages. For `logo-cloud.tsx`, replace the seed import with a small hardcoded list of just the logo names actually displayed. For `dashboard-service.ts`, move any reliance on the seed to a Supabase query (the data already lives in the `vc_contacts` table) so the raw seed never reaches the browser. Then confirm `src/data/vc-contact-seed.ts` is no longer in the client bundle by running `npm run build` and checking the `dist/assets` output no longer contains a multi-megabyte `vc-contact-seed` chunk."

**You'll know it worked when...** `npm run build` finishes and there is **no** `vc-contact-seed-*.js` file of several megabytes in `dist/assets/`.

### 0.2 — Confirm the three pending database migrations are run 🧑 · ~10 min

Your own `GO-LIVE.md` lists three database changes marked "⏳ run it" — they add founder-dossier columns and the `npx apparent` CLI support. Until they're run, those features error for real users.

- Go to your **Supabase dashboard** (supabase.com) → your project → **SQL Editor**.
- Open each of these files from `supabase/migrations/` in your code, copy the contents into the SQL editor, and run them in order:
  - `202606080004_founder_dossier.sql`
  - `202606080005_notify_investors_of_founder.sql`
  - `202606080006_cli_build_claim.sql`
- They're safe to re-run if you're unsure whether one already ran.

**You'll know it worked when...** running this in the SQL editor returns all non-zero values:
```sql
select to_regclass('public.cli_build_submissions') as cli_table,
       (select count(*) from pg_proc where proname='claim_cli_build') as has_claim,
       (select count(*) from information_schema.columns
         where table_name='founder_profiles' and column_name='agent_dossier') as has_dossier;
```

### 0.3 — Add a basic error tracker 🤖 · ~25 min

Right now, if the app crashes for a user, you'll never know unless they tell you. An **error tracker** (a service that automatically records crashes and shows you what broke) fixes that. Sentry's free tier is plenty to start.

First do the 🧑 part: go to **sentry.io**, sign up (free), create a project of type **React**, and copy the **DSN** (a URL-shaped ID that tells Sentry where to send errors — it's safe in client code, not a secret). Then:

> **Prompt for your agent:**
> "Add Sentry browser error tracking to this Vite + React 19 app. Install `@sentry/react`, initialise it in `src/main.tsx` guarded so it only runs in production, read the DSN from a `VITE_SENTRY_DSN` environment variable, and wrap the router in a Sentry error boundary. Add `VITE_SENTRY_DSN` to `.env.example` with an empty value and a comment. Keep it a no-op when the variable is unset so local dev is unaffected."

**You'll know it worked when...** after deploying, you can trigger a deliberate test error and see it appear in your Sentry dashboard within a minute.

---

## Phase 1 — Confirm your accounts and credits

Apparent already runs on these services, so this is mostly *verifying* rather than *creating*. Walk the list and make sure each account exists, is yours, and (where noted) has a payment method or credits.

### 1.1 — Vercel (hosting) 🧑 · ~5 min
The platform that serves your website. Log in at **vercel.com**, confirm the `apparent` project exists and its most recent deployment is green (successful). **Cost:** Hobby tier is free; upgrade to Pro ($20/mo) only if you need a team or higher limits.
**You'll know it worked when...** you can open the project and see a "Ready" production deployment.

### 1.2 — Supabase (database) 🧑 · ~5 min
Your database and user data. Log in at **supabase.com**, confirm your project is active (not paused — free projects pause after inactivity). **Cost:** Free tier works to start; Pro ($25/mo) adds daily backups and stops auto-pausing — recommended once you have real users.
**You'll know it worked when...** the project shows "Active" and the Table Editor lists your tables.

### 1.3 — Kinde (login) 🧑 · ~5 min
Handles sign-up and sign-in. Log in at **kinde.com**, confirm your Apparent business exists. **Cost:** Free up to a generous user count.
**You'll know it worked when...** you can see your application under Settings → Applications.

### 1.4 — Cloudflare R2 (file storage) 🧑 · ~5 min
Stores files users upload. Log in at **cloudflare.com** → R2, confirm your bucket exists. **Cost:** ~$0 at low volume; R2 has no egress fees, so it stays cheap.
**You'll know it worked when...** your bucket is listed in the R2 dashboard.

### 1.5 — Orthogonal (agent inference and data) — fund credits 🧑 · ~5 min
Supplies replaceable inference plus the external search, scraping, and enrichment APIs used by Apparent's agent runtime. **This silently breaks if ignored:** with an empty balance, agent calls fail. Log in at **orthogonal.com**, add a payment method, and load credits (start with $10–30). Turn on auto top-up if you don't want to babysit it.
**You'll know it worked when...** the Orthogonal dashboard shows a positive credit balance and the API catalog lists the inference endpoint you approved.

---

## Phase 2 — Environment variables on Vercel

**Environment variables** are settings (especially secrets) stored outside your code, on the hosting platform. Apparent needs the full set below set in **Vercel → your project → Settings → Environment Variables**, for the **Production** environment. After changing any of them you must **redeploy** for the change to take effect.

> 🧑 This whole phase is "You" — it involves real secrets, which only you should handle. Paste each value straight into Vercel, never into chat or code.

### 2.1 — Client variables (the `VITE_` ones, safe to be public)
These get baked into the browser build, so they're not secret — but they still must be set or features break:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — your Supabase project URL and public key.
- `VITE_APP_URL` — your live address, `https://apparent.social`.
- `VITE_KINDE_CLIENT_ID`, `VITE_KINDE_DOMAIN`, `VITE_KINDE_REDIRECT_URI`, `VITE_KINDE_LOGOUT_URI` — from your Kinde app (the redirect/logout URIs must point at your **live** domain — see 3.2).
- `VITE_KINDE_GOOGLE_CONN_ID`, `VITE_KINDE_EMAIL_PASSWORD_CONN_ID`, `VITE_KINDE_USERNAME_PASSWORD_CONN_ID` — optional one-click login connection IDs from Kinde.
- `VITE_GITHUB_CLIENT_ID` — public client ID for GitHub login/verification.
- `VITE_NETWORK_TILE_URL` — map tile URL (e.g. an OpenStreetMap tile template).

### 2.2 — Server secrets (the real keys — guard these)
These are read only by your backend functions and must **never** appear in the browser:

- `ORTHOGONAL_API_KEY` — 🔴 critical; server-only key for inference and external agent tools. Keep credits funded — Phase 1.5.
- `ORTHOGONAL_INFERENCE_API=baseten`, `ORTHOGONAL_INFERENCE_PATH=/v1/chat/completions` — verified Orthogonal chat-completion route; change only for an approved non-Anthropic/OpenAI replacement.
- `APPARENT_AGENT_MODEL=zai-org/GLM-5.2` — verified open-weight tool-calling model used by Apparent.
- `SUPABASE_SERVICE_ROLE_KEY` — 🔴 full database access for server routes (founder enrichment, CLI ingest, GitHub contributions).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — server-side copies of your Supabase URL/anon key.
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_SECRET` — GitHub OAuth app, for connecting founder GitHub accounts.
- `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` — Cloudflare R2 storage credentials and the bucket's public URL.
- `APP_URL` — server-side copy of your live address, `https://apparent.social`.

### 2.3 — Optional (features degrade gracefully if unset)
- `AGENT_CRON_SECRET` — enables the scheduled follow-up and deal-flow ingestion endpoints. A long random string you make up; the scheduler must send the same value.
- `ORTHOGONAL_AGENT_MAX_CALLS`, `ORTHOGONAL_AGENT_MAX_SPEND_CENTS`, `ORTHOGONAL_TIMEOUT_MS` — per-request safety and timeout limits. `MAX_CALLS` is a runaway-loop stop; spend is capped by `MAX_SPEND_CENTS`. A value too small to cover the agent step limit is raised at runtime, since it would only guarantee mid-turn failure.
- `INGEST_TARGET_COUNT` — how many startups each deal-flow ingestion run targets (default 18).

**You'll know this phase worked when...** Vercel's Environment Variables list contains every required name above with a value, scoped to Production, and you've triggered a fresh deploy afterward.

---

## Phase 3 — Point the production services at your live domain

### 3.1 — Supabase: confirm Row Level Security is on 🧑 · ~10 min
**Row Level Security (RLS)** is the rule layer that stops user A from reading user B's data. Your migrations set it up; just confirm it's enforced. In Supabase → **Authentication → Policies**, scan that your user-data tables (profiles, messages, notifications, etc.) each show RLS **enabled** with policies. If any user-facing table shows "RLS disabled," that table is wide open — flag it and fix before launch.
**You'll know it worked when...** every table holding user data shows RLS enabled with at least one policy.

### 3.2 — Kinde: set the live redirect URLs 🧑 · ~10 min
Login only works if Kinde knows which addresses are allowed to send users back after sign-in. In **Kinde → Settings → Applications → your app**, set:
- **Allowed callback URLs:** `https://apparent.social/callback` (match whatever `VITE_KINDE_REDIRECT_URI` uses).
- **Allowed logout redirect URLs:** `https://apparent.social`.
Keep your `localhost` entries too, so local dev still works.
**You'll know it worked when...** signing in on the live site returns you to the app, logged in, with no "redirect URI mismatch" error.

### 3.3 — GitHub OAuth: set the live callback 🧑 · ~5 min
In your **GitHub OAuth App** settings (github.com → Settings → Developer settings → OAuth Apps), set the **Authorization callback URL** to your live `/api/github/callback` address: `https://apparent.social/api/github/callback`.
**You'll know it worked when...** a founder can connect their GitHub on the live site without an OAuth error.

### 3.4 — R2: confirm the bucket's public URL serves files 🧑 · ~5 min
Uploaded files are served from `R2_PUBLIC_URL`. Confirm that bucket has public access (or a connected custom domain) enabled, and that the value in Vercel matches.
**You'll know it worked when...** opening an uploaded file's public URL in a browser shows the file, not an access-denied error.

---

## Phase 4 — Deploy

Apparent deploys through Vercel's Git integration: pushing to your `main` branch triggers a production build automatically.

### 4.1 — Ship the latest code 🤝 · ~5 min
Make sure Phase 0 fixes are committed, then push to `main`. Vercel picks it up and builds.

> **Prompt for your agent (if you want it to handle the push):**
> "Commit the Phase 0 launch-checklist fixes with a clear message and push to `main`."

**You'll know it worked when...** Vercel shows a new green "Ready" production deployment for the commit you just pushed, and the live site loads.

---

## Phase 5 — Domain

You already use `apparent.social`, so this is a confirmation, not a purchase.

### 5.1 — Confirm the domain points at this Vercel project 🧑 · ~10 min (DNS can take up to a day)
In **Vercel → your project → Settings → Domains**, confirm `apparent.social` is listed and shows "Valid Configuration." **DNS** (the internet's address book that points a domain name at a server) changes can take anywhere from minutes to a full day to spread worldwide — if it's not green yet, wait, don't re-configure repeatedly.
**You'll know it worked when...** `https://apparent.social` loads your latest deployment with a padlock (HTTPS) in the address bar.

---

## Phase 6 — Pre-launch smoke test (walk it as a real customer)

The product isn't "launched" until you've gone through it as a stranger would. Do this on the **live** site, ideally in a private/incognito window. (Adapted from your `GO-LIVE.md`.)

- [ ] 🧑 **Sign up fresh** — create a brand-new account via the live login. Confirm you land in the app, not an error.
- [ ] 🧑 **Investor agent** — sign in as an investor with a thesis set, open the overview chat, ask *"show me founders raising now that fit my thesis."* Confirm a real answer comes back (this proves the Apparent runtime, Orthogonal credits, and key are working).
- [ ] 🧑 **Founder dossier** — sign in as a founder, connect GitHub, confirm the dossier card builds (proves GitHub OAuth + service-role key).
- [ ] 🧑 **Founder agent** — ask *"which investors fit me,"* draft an intro, try *"put me in front of investors."*
- [ ] 🧑 **Launch push realtime** — publish a public launch; confirm matched investors get the notification live, with no page refresh (proves realtime is wired).
- [ ] 🧑 **File upload** — upload an avatar or asset; confirm it appears and its public URL loads (proves R2).
- [ ] 🧑 **`npx apparent` CLI** — run it in a repo, accept the consent prompt, follow the claim link, sign in, confirm the build lands on the founder profile.
- [ ] 🧑 **On a phone** — open `apparent.social` on your actual phone and walk the core flow; confirm nothing is broken or cut off.

**You'll know the product is launched when...** every box above passes for a freshly created account that has none of your special access.

---

## Phase 7 — After launch

### 7.1 — Turn on analytics 🤝 · ~15 min
**Analytics** (a tool that shows how many people visit and what they click) tells you whether the launch worked. The lightest option for a Vercel app is **Vercel Web Analytics** — enable it in the Vercel dashboard (Project → Analytics → Enable), then:
> **Prompt for your agent:** "Add Vercel Web Analytics to this Vite + React app: install `@vercel/analytics` and render its `<Analytics />` component once at the app root in `src/main.tsx` or the top-level layout."
**You'll know it worked when...** the Vercel Analytics tab starts showing visitors within a day.

### 7.2 — Confirm database backups 🧑 · ~5 min
If your data vanished, could you get it back? On Supabase **Free**, backups are limited — upgrading to **Pro ($25/mo)** gives daily automatic backups and point-in-time recovery. Before you have real users' data to lose, decide and (recommended) upgrade.
**You'll know it worked when...** Supabase → Database → Backups shows automatic backups enabled.

### 7.3 — Know where to look when something breaks 🧑 · ongoing
- **Site won't load / build failed** → Vercel → Deployments → click the failed build → read the log.
- **A feature errors for users** → your Sentry dashboard (from step 0.3).
- **Agents stopped responding** → check the Orthogonal balance and usage first (Phase 1.5), then Vercel function logs.
- **Login broken** → Kinde redirect URLs (3.2) and the `VITE_KINDE_*` env vars.

---

## Summary

- **Phase 0** clears three real blockers (data leak, pending migrations, error tracking).
- **Phases 1–3** verify your existing accounts, set every environment variable on Vercel, and point each service at the live domain.
- **Phases 4–5** deploy and confirm the domain.
- **Phase 6** is the real-customer smoke test — the actual definition of "launched."
- **Phase 7** is the safety net: analytics, backups, and where to look when something breaks.

Most of this is verification because Apparent is already most of the way there. The genuinely new work is in Phase 0.

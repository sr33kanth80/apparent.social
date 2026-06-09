# `npx apparent` — v1 Build Blueprint

The supply-side growth engine for Apparent. A founder runs one command; it turns
their **real build activity** into (a) a brag-worthy card they post on X and
(b) a pre-filled founder profile on Apparent. Distribution is the moat — every
card carries `npx apparent` attribution, so each run recruits the next founder.

> Modeled on Standout's `npx standout`. Their CLI was their entire supply engine;
> this is ours. Difference: we capture **proof of building that scrapers
> structurally can't get**, while never touching the founder's source code.

---

## 0. The non-negotiable privacy contract

This is the whole game. State it loudly in the README, the terminal, and the
preview screen.

| `apparent` DOES read (locally) | `apparent` NEVER does |
|---|---|
| Local `git` metadata: commit counts, dates, authors, cadence | Read, store, or upload **source code** |
| File **extensions** → language breakdown | Upload **file paths** (can leak feature/product names) |
| `numstat` line counts (numbers only) | Upload **repo names** unless the founder keeps them |
| Root `README.md` text (to draft a project description) | Send anything to a server **before explicit confirm** |
| The git emails present, to ask "which is you?" | Touch anything outside the chosen scope |

Everything is computed **on the founder's machine**. A plain-English preview
shows exactly what would be shared. **Nothing uploads until they confirm**, and
they can edit/redact project names and descriptions first.

---

## 1. UX flow

```
npx apparent
  1. Scope picker:   [ this repo ]   [ pick repos in this folder ]   [ whole workspace ]
  2. (multi) Repo checklist — only repos with commits authored by the user, pre-listed
  3. Identity:       "Which git email is you?"  → attribute stats to those only
  4. Compute locally: stats + languages + cadence + READMEs
  5. Render the ASCII card in the terminal      ← the screenshot moment
  6. Preview:        plain-English list of exactly what will be shared (editable)
  7. "Add to your Apparent profile?"  [y/N]
        y → upload approved payload → print claim URL + open browser
        N → done; card already shown, nothing left the machine
  8. Browser: sign in / sign up → profile auto-filled with the build evidence + card
```

**Scope is the founder's choice, every run** (per the product decision):
- **this repo** — safest, fastest "wow", a *project* card.
- **pick repos / whole workspace** — discovers git repos under the folder, shows
  a **checklist** (never auto-includes everything), produces an aggregate
  *founder* card.

Two card flavors fall out for free: single-repo → **project card**; multi-repo →
**founder card** (the stronger flex + better profile seed).

---

## 2. What gets captured (exact payload)

Computed locally; only this leaves the machine, only after confirm:

```jsonc
{
  "scope": "repo" | "workspace",
  "authoredEmails": ["me@x.com"],          // chosen by the founder
  "totals": {
    "commits": 1240,
    "repos": 8,                            // count only; names are per-project + editable
    "linesAdded": 84210,                   // numbers only, never the code
    "linesRemoved": 31002,
    "firstCommit": "2025-03-02",
    "lastCommit": "2026-06-07",
    "activeDays": 211
  },
  "cadence": {
    "commitsLast30d": 180,
    "commitsLast90d": 540,
    "shippedDaysLast60": 47                 // the best flex: consistency
  },
  "languages": [{ "name": "TypeScript", "percent": 61 }, { "name": "Python", "percent": 22 }],
  "projects": [
    {
      "name": "apparent",                  // EDITABLE; defaults to repo dir name
      "description": "Investor matching for builders.",  // from README, EDITABLE/removable
      "primaryLanguage": "TypeScript",
      "commits": 612,
      "lastActive": "2026-06-07"
    }
  ],
  "card": { "version": 1, "ascii": "...rendered card text..." },
  "generatedAt": "2026-06-08T12:00:00Z"
}
```

**Notes**
- **Author filtering is mandatory.** Only count commits whose author email is in
  `authoredEmails`. Otherwise forks/co-founders inflate the stats — dishonest on
  a brag card, misleading to investors. This is what makes the numbers *true*.
- **No stars / no GitHub data** from the CLI — those come from the existing
  web-app GitHub verification + dossier path. CLI stays **local-git only**, so it
  needs zero credentials and zero network read of code.
- **AI-inflation caveat:** founders coding with agents produce huge diffs.
  `linesAdded` is fine for a *vanity* card; it is **not** an investor underwriting
  signal. Keep lanes separate — card = virality, dossier + traction = underwriting.

---

## 3. The ASCII card

- **Render in-terminal** with ANSI/box-drawing — gorgeous, monospace, brag-worthy.
  This is the artifact; founders screenshot the terminal and post it (raw ASCII
  pasted as text on X breaks alignment — so the *screenshot* is the share unit).
- **Footer is the growth loop:** `@handle · built with npx apparent · apparent.social`.
  No attribution = no compounding.
- **Hosted version for link unfurls:** the founder's Apparent profile renders an
  **OG image** of the same card (reuse the existing `api/og.js` pattern), so a
  pasted profile URL unfurls into the card on X even without a screenshot.

Card content (founder flavor): name/handle · commits · `shippedDaysLast60` streak
· top languages · top project · date range. Keep it tight and flexy.

---

## 4. Architecture

### CLI (this `cli/` package)
- Node ≥18, **near-zero dependencies** (devs inspect `npx` tools; a fat dep tree
  reads as a supply-chain risk). Use `child_process` to shell out to `git`,
  Node's built-in `readline` for prompts, hand-rolled ANSI for the card.
- **Repo discovery:** `git rev-parse --is-inside-work-tree` for "this repo";
  for workspace, walk subdirs for `.git` with bounded depth, **skipping
  `node_modules`, vendored dirs, and dot-folders**.
- **Stats (per repo, local):**
  - commits/cadence/authors: `git log --author=<me> --date=short --pretty=...`
  - lines: `git log --author=<me> --numstat` (sum adds/removes; filenames stay local)
  - languages: `git ls-files` → map extensions → aggregate to `%` (paths stay local)
  - description: read `./README.md`, take title + first paragraph
- **Upload:** single `POST /api/cli-ingest` with the approved payload → get a
  `{ code, claimUrl }` back → print + `open` the browser.

### Ingest endpoint — `api/cli-ingest.js` (new, in the web app)
- **Unauthenticated** (the CLI holds no login). Stores the payload as a *pending*
  submission keyed by a short random `code` (e.g. 8 chars), service-role insert,
  **30-min expiry**. Returns `{ code, claimUrl: "https://apparent.social/claim-build?code=..." }`.
- Rate-limit by IP to prevent spam.

### Claim handoff (reuses the existing `/claim` concept)
- New page `/claim-build?code=...`: requires sign-in/sign-up, reads the code,
  calls an authenticated RPC **`claim_cli_build(p_code)`** (SECURITY DEFINER)
  that merges the pending submission into the founder's `founder_profiles`
  **dossier** (the columns from migration `202606080004`) and deletes the
  pending row. Sets/updates `agent_dossier` narrative + a `cli_build` block in the
  `dossier` jsonb, and stamps `dossier_updated_at`.
- This means the CLI feeds the **same dossier** the investor agent already reads —
  no parallel system. The CLI is just a richer, local front door to it.

### DB (new migration)
```sql
create table public.cli_build_submissions (
  code text primary key,                 -- short random, shown in terminal
  payload jsonb not null,
  claimed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
-- RLS: no client access. Inserted by api/cli-ingest (service role), consumed by
-- claim_cli_build() (security definer). Authenticated users never touch it directly.
```

---

## 5. Build phases

- **v0 — claim the name (today).** Publish the placeholder in this folder so
  `apparent` is yours on npm. (Steps below.)
- **v1 — local card + manual profile.** Scope picker → author filter → stats →
  ASCII card in terminal. End screen: "copy this to your Apparent profile" + a
  link to sign up. *No upload yet* — proves the wow + virality with zero backend.
- **v1.1 — ingest + claim.** Add `api/cli-ingest.js`, the `cli_build_submissions`
  table, `claim_cli_build` RPC, and `/claim-build`. Now the card auto-fills the
  founder profile/dossier. The investor agent immediately reads the richer data.
- **v1.2 — hosted OG card** on the profile for link unfurls.
- **v2 (opt-in, later).** Deeper signals from coding-agent/IDE sessions (Codex,
  Claude Code, Cursor, Windsurf) — per-tool, explicit opt-in, still local-first.
  High value, high privacy-sensitivity; not part of the launch.

---

## 6. Claim the `apparent` npm name (do this now)

`apparent` is currently free. Lock it before a squatter does. From `cli/`:

```bash
# 1. One-time: create / log into a (free) npm account
npm login            # or: npm adduser   — needs a verified email; enable 2FA

# 2. Confirm you're logged in
npm whoami

# 3. Publish the placeholder as a PUBLIC package (free)
cd cli
npm publish --access public

# 4. Verify it works from anywhere
npx apparent@latest
```

Notes:
- Public npm publishing is **free**; you only pay for *private* packages.
- Unscoped name `apparent` → `npx apparent` works directly. (A scoped name like
  `@apparenthq/cli` would force `npx @apparenthq/cli`, which is why owning the
  bare name matters.)
- Bump `version` in `package.json` for every subsequent publish (npm rejects
  re-publishing the same version).
- Keep the placeholder friendly (it already is) — early curious runners will see
  it before v1 ships.
```

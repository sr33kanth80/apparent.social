# apparent.social

A React + TypeScript + Vite application backed by Supabase. This repo contains the marketing site, a basic authenticated dashboard shell, VC contact data (for development/demo), and supporting Supabase SQL and Edge Functions.

## Tech stack
- React 19 + TypeScript
- Vite 8 (dev server and build)
- Tailwind CSS 4
- Radix UI primitives
- React Router 7
- Supabase (database + auth + Edge Functions)
- Map tooling: maplibre-gl and Leaflet (tile layer driven via env)

## Quick start
1) Requirements
   - Node.js 20+ and npm 10+
   - A Supabase project (optional for basic UI; required for auth/data)
2) Install
   - npm install
3) Configure environment
   - Copy .env.example to .env and fill in values (see Environment variables)
4) Run
   - npm run dev
   - Open the URL printed by Vite (usually http://localhost:5173)

## Scripts
- npm run dev — start Vite dev server
- npm run build — type-check (tsc -b) and build for production
- npm run preview — preview the production build locally
- npm run lint — run ESLint

## Environment variables (.env)
Copy .env.example to .env and provide the following values:
- VITE_SUPABASE_URL — your Supabase project URL
- VITE_SUPABASE_ANON_KEY — your Supabase anon (public) API key
- VITE_KINDE_CLIENT_ID and VITE_KINDE_DOMAIN — your Kinde SPA application
- VITE_KINDE_AUDIENCE — the Kinde API audience registered for Apparent's backend; set
  KINDE_AUDIENCE to the same value for the serverless agent routes
- ORTHOGONAL_API_KEY — server-only key for Apparent's inference and agent tools. Usage-priced
  inference reserves `ORTHOGONAL_DYNAMIC_PRICE_ESTIMATE_CENTS` (10 cents by default) against
  the per-request `ORTHOGONAL_AGENT_MAX_SPEND_CENTS` budget before each call, then records
  Orthogonal's reported final price.
- VITE_NETWORK_TILE_URL — map tile URL template. Example (OpenStreetMap):
  https://tile.openstreetmap.org/{z}/{x}/{y}.png
  Note: ensure you comply with the tile provider's terms of use.

The app reads these from import.meta.env (see src/lib/supabase.ts and map components).

Run the Supabase migrations before deploying. Kinde proves the user's identity,
then Apparent binds the founder/investor choice once in `kinde_identities`; later
agent requests authorize against that server-side binding. Signed Kinde roles
with keys `founder`, `investor`, `apparent-founder`, or `apparent-investor` are
also accepted when the Roles additional claim is enabled.

Before enabling Apparent Agent for the public, follow the
[Agent launch runbook](docs/agent-launch-runbook.md). It covers the shared
Supabase admission ledger, concurrency and daily-spend limits, deployment order,
operational queries, alerts, and incident controls.

## Project layout
- src/ — application code
  - components/ — UI components and sections (Navbar, Hero, Footer, etc.)
  - components/ui/ — design system & widgets (buttons, inputs, sidebar, map, etc.)
  - pages/ — route-level pages (Home, ForFounders, ForVCs, Dashboard, etc.)
  - lib/ — utilities and services (Supabase client, auth helpers, types)
- public/ — static assets (icons, logos, fonts)
- supabase/ — database assets
  - migrations/ — SQL migrations used to create and evolve schema
  - seed.sql — large development seed of VC contacts (idempotent upserts)
  - functions/ — Supabase Edge Functions (TypeScript)
- scripts/ — local scripts (e.g., data seed helpers)

## Supabase setup (optional but recommended)
1) Create a Supabase project and get its URL and anon key.
2) Database schema & seed
   - Open the Supabase SQL editor and run the files in supabase/migrations/ in chronological order.
   - Optionally, load supabase/seed.sql to import development/demo VC contacts. This is a large script that performs upserts; running it is safe to repeat.
3) Environment
   - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
4) Builder Radar signals
   - Builder Radar reads ingested signals from the public.source_signals table. Load that table by whatever means you prefer (manual import, a one-off script, the Supabase SQL editor, etc.).

## Routing and auth
- React Router powers navigation in src/pages.
- Protected routes use the wrapper in src/components/ProtectedDashboardRoute.tsx.
- Supabase client initialization lives in src/lib/supabase.ts. If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing, the client is not created and the app will run in a limited, unauthenticated mode.

## Development notes
- .gitignore excludes node_modules, build artifacts, and .env by default.
- If you work across Windows/macOS/Linux and care about consistent line endings, consider adding a .gitattributes like:
  * text=auto eol=lf
  I can add this in a follow-up PR if desired.

## Deployment
This is a standard static Vite build output that can be hosted on any static host (e.g., Vercel, Netlify, GitHub Pages with a SPA fallback). For Netlify/Vercel, set the build command to npm run build and the output directory to dist. Be sure to configure environment variables in your hosting provider.

## Contributing
- Run npm run lint locally before committing.
- Use clear, conventional commit messages when possible (e.g., feat:, fix:, chore:).

## License
Add your license of choice (e.g., MIT) or keep this private.

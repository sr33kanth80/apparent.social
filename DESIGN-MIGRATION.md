# DESIGN-MIGRATION.md — Apparent → "Apparent / Tavus" neo-brutalist reskin

Recon output. **No code changed yet.** Awaiting go-ahead before mass edits.

## 1. Key finding: there is one clean hook point

The entire **public marketing site** (15 routes: Home, ForFounders, ForVCs, OurThesis,
AboutUs, Blog, Contact, Resources, Legal, Login, ClaimProfile/Build, ProjectDetail,
SourcedDetail, PublicProfile) is driven by a single, well-namespaced layer:

- **`src/editorial.css`** — `--ed-*` design tokens + `.ed-*` component classes
  (`.ed-page`, `.ed-btn*`, `.ed-nav`, `.ed-card`, `.ed-display`, `.ed-sec-title`, …).
- 58 `.tsx` files consume `.ed-*` classes; 73 `.ed-btn` usages.

**This means the reskin is ~90% a CSS-only edit of `editorial.css`.** Retheme the `--ed-*`
tokens + restyle the shared `.ed-*` component rules, and every public page inherits the new
look with zero JSX/behavior changes. Handlers, routing, forms, auth, `data-*` all untouched.

The **dashboards** (`/dashboard/*`) are a *separate* legacy shadcn layer
(`--background/--foreground/--primary/…` in `index.css`, plus `.monad`/`.alden-*`). They do
**not** use `.ed-*`. **Recommendation: leave dashboards out of scope** (they're the logged-in
product, not the marketing surface, and retheming the shadcn base risks the app shell). Flag Q1.

## 2. Token mapping — reference → this repo (`--ed-*`)

| Reference (`D:\diitto\apparent`) | Value | This repo `--ed-*` | Current value | New value |
|---|---|---|---|---|
| `--background` | `#F7F4EF` warm paper | `--ed-canvas` / `--ed-white` bg | `#ffffff` | `#F7F4EF` |
| `--foreground` | `#28292A` near-black text | `--ed-ink` | `#17191c` | `#28292A` |
| `--border`     | `#140206` hard border | *(new)* `--ed-border` | — | `#140206` |
| `--surface`    | `#EAE5DE` panel bg | `--ed-paper` | `#f2f2f3` | `#EAE5DE` |
| `--accent`     | `#FF6183` coral | `--ed-accent` (repurpose `--ed-ember`) | `#5d2a1a` | `#FF6183` |
| `--primary`    | `#FFB4C5` light pink | *(new)* `--ed-primary` | — | `#FFB4C5` |
| white / black  | `#FFF` / `#000` | `--ed-white` / *(new)* `--ed-black` | — | as-is |
| success-green  | `#38F261` | `--ed-green` (keep or `--ed-success`) | `#16a34a` | see Q2 |
| amber          | `#FFB835` | *(new)* `--ed-amber` | — | `#FFB835` |
| shadow-001     | `5px 5px 0 0 #140206` | *(new)* `--ed-shadow-hard` | soft blur shadows | offset, no blur |

**Fonts** (wired through vars, real files droppable later — Fonts note honored):

| Role | Reference | `--ed-*` var | Fallback now (no license) |
|---|---|---|---|
| Display / h1–h4 | `Perfectlynineties` serif | `--ed-serif` | `Georgia, ui-serif, serif` (already there) |
| Labels/eyebrows/buttons | `Fk Raster Grotesk Compact Blended` UPPERCASE | *(new)* `--ed-label` | grotesque/mono — `'JetBrains Mono', ui-monospace, …` |
| Body | `Suisse Intl` | `--ed-font` | `'Inter', system-ui, sans-serif` (already there) |

## 3. Motif deltas (Steep → neo-brutalist) — what actually changes in CSS

| Motif | Current (`--ed-*` "Steep") | Target (reference) |
|---|---|---|
| Radii | pills 999px, cards 16–24px | **0** (sharp) — `--ed-r*` → 0 |
| Borders | mostly borderless / `--ed-fog` soft | **1px solid `--ed-border`** on cards/buttons/inputs/nav |
| Body frame | none | **thick ~10px solid frame** around page |
| Shadows | soft blurred (`--ed-shadow-*`) | **`5px 5px 0 0 --ed-border`** offset, no blur |
| Buttons | pill, opacity hover | rect + hard border + shadow, **press `translate(4px,4px)`** on hover |
| Eyebrows | plain caps | UPPERCASE tracked + **10px solid square bullet** |
| Panels | plain | **titlebar chrome**: square + caps label + thin rules |
| Headlines | serif (kept) | serif (kept) — good, already aligned |

## 4. Motion (add last, `prefers-reduced-motion` guarded)

New keyframes/util in a small `--ed-*`-scoped block (mirroring reference `ditto.css`):
scroll-reveal (fail-safe: opacity/translate → visible on intersect), marquee ticker
(`translateX` loop), hover "press" transform. Repo already ships `framer-motion`/`motion` —
use existing dep for reveals if a JS reveal is cleaner; no new dependency.

## 5. Files planned to touch (pending approval)

**Primary (does ~90% of the work):**
- `src/editorial.css` — retoken `--ed-*`, restyle `.ed-*` rules, add frame/shadow/press
  utils + keyframes + label font var. **No JSX touched.**

**Secondary (small, only if a motif needs a wrapper the CSS can't reach):**
- `src/components/editorial/EditorialNavbar.tsx` / `EditorialFooter.tsx` — only if the
  page-frame / titlebar chrome needs a wrapper element. Add-only, no handler/prop changes.
- A few pages where an eyebrow/panel wants the square-bullet or titlebar markup — **presentational
  wrapper spans only**, added around existing content, never altering interactive elements.

**Explicitly NOT touched:** `index.css` shadcn base, `apparent-theme.css`, `.monad`/`.alden-*`,
all `src/components/ui/*`, dashboards, any data/hook/handler/route code, `tailwind.config.js`
(unless you want the label font as a Tailwind family — Q3).

## 6. Decisions I need from you before editing

- **Q1 — Scope:** Public marketing site only (recommended), or also retheme the logged-in
  dashboards? Dashboards use a different token layer; retheming them is a separate, riskier pass.
- **Q2 — Audience accents:** Memory records a *product decision* — founders = blue `#1d9bf0`,
  investors = green `#16a34a` (`--ed-blue`/`--ed-green`), used on CTAs to signal audience. The
  reference is monochrome + single coral accent. Options: (a) keep blue/green audience accents,
  add coral as the general accent only; (b) collapse everything to coral (loses the
  audience-color system). Recommend (a).
- **Q3 — Label font as Tailwind family?** Add `font-label` to `tailwind.config.js`, or keep it
  purely a `--ed-*` CSS var? (Config edit is low-risk but touches a config file.)
- **Q4 — Frame border:** Reference frames the whole `<body>`. Apply the ~10px page frame to
  public `.ed-page` routes only (dashboards/app shell excluded), correct?

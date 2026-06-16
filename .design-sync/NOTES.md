# design-sync NOTES — Apparent

Repo-specific quirks for future syncs of this design system.

- **This is a private app, not a library.** No `main`/`module`/`exports` in package.json; `dist/` is an app build (HTML + hashed assets), not a component-library entry. The converter runs in **synth-entry mode** off `src/` (`srcDir: src`, `tsconfig: tsconfig.app.json` for the `@/*` alias). There is no `--entry`.
- **Design system = shadcn/ui** (`components.json`, new-york style, neutral base, CSS variables). Primitives live in `src/components/ui/`; product components in `src/components/`.
- **Tailwind v4, CSS-first.** Tokens + theme are in `src/index.css` via `@theme`/`@theme inline` and `:root` CSS variables. Utilities are generated at build time, so the **compiled** CSS is required for previews — copied to `.design-sync/styles-compiled.css` (from `dist/assets/index-*.css`) and used as `cssEntry`. The dist filename is content-hashed; re-syncs should re-copy the latest `dist/assets/index-*.css` (or regenerate via Tailwind CLI scanning `src/**` + `.design-sync/previews/**`) before building.
- **Fonts:**
  - `Inter` / `Source Serif 4` / `JetBrains Mono` load via a remote Google Fonts `@import` in `src/index.css` → expect `[FONT_REMOTE]` (informational, no action).
  - `TT Norms Pro` is the configured Tailwind `sans` and has `@font-face` rules, but the woff2 files are **NOT in the repo** (`dist/fonts/` and `public/fonts/` only contain README.md — it's a licensed font). Suppressed via `runtimeFontPrefixes: ["TT Norms Pro"]`. Note: `body` actually renders in `Inter`, so most text is unaffected.

## Bundle / discovery decisions
- **Self-package junction:** synth-entry mode resolves `PKG_DIR` to `node_modules/apparent`, which doesn't exist in the app's own repo. Created a junction `node_modules/apparent -> repo root` (`New-Item -ItemType Junction`) so all path-relative config (cssEntry, srcDir, tsconfig) stays correct. **This junction is gitignored (node_modules/) and must be recreated on a fresh clone before building.** It's harmless but could confuse vite/tsc if left around — it was removed after the sync; recreate for re-syncs.
- **5 MB bundle cap:** the importable bundle started at 8.6 MB. Slimmed by excluding heavy, un-static-renderable components via `componentSrcMap: null` + the `source-kit.mjs` fork (which also drops their files from the synth entry):
  - `Map` (maplibre-gl ~45 MB pkg), `BuilderRadarMap` (leaflet), `PixelSnow` (three.js) — WebGL/map components.
  - `LogoCloud` — dynamically `import()`s `src/data/vc-contact-seed.ts`, a **4 MB seed file** that esbuild inlines in IIFE mode. This was the single biggest contributor.
  - Final bundle: **1.9 MB**. `@anthropic-ai/sdk` and `@aws-sdk` are NOT in the component graph (only a type-only supabase import).
- **Component explosion:** shadcn compound exports (Card→7, dropdown-menu→15, etc.) yield 63 discovered components from 42 files. Most sub-parts ship honest floor cards; the composed parents (Card, DropdownMenu) are authored.
- **guidelinesGlob disabled (`[]`):** the repo's only `docs/*.md` file is an **internal strategy/memory file** (`project_apparent_positioning.md`), NOT a design guideline — it must never upload. If real design guidelines are added under `docs/`, re-enable the glob.

## Known render warns (triaged benign — do not re-investigate)
- `[RENDER_THIN] GitHubIcon` — pure SVG mark with no text; the "no text / paints nothing" heuristic misfires. Confirmed rendering correctly in the review sheet (GitHub logo at 4 sizes). Authored preview is `previews/GitHubIcon.tsx`.

## Previews authored (21, all graded good)
Button, Badge, Card, CardHeader, CardContent, CardFooter, Avatar, Input, Textarea, Switch, Label, Separator, Skeleton, Tooltip, DropdownMenu, DropdownMenuLabel, ScrollArea, InfiniteSlider, VerifiedAvatar, GitHubIcon, LogoIcon.
- Layout glue uses **inline styles** (not Tailwind utilities) so previews don't depend on which utilities the app happened to compile; components use their real props/classes.
- `Tooltip` popup is hover-only (react-tooltip) — static cards show the anchor; visible on hover in `.review.html`.
- `LogoIcon` only forwards `className` (not `style`) to its svg — sized via a scoped `<style>` block in the preview.
- `DropdownMenu`/`DropdownMenuLabel` are overlays → `cfg.overrides` `cardMode: single`.

## Re-sync risks
- `cssEntry` points at a copy of the hashed dist CSS — it can go stale if the app is rebuilt. Re-copy `dist/assets/index-*.css` before a re-sync, or regenerate with the Tailwind v4 CLI scanning `src/**` + `.design-sync/previews/**` (the latter also covers utilities used only in authored previews).
- Synth-entry mode produces weaker `.d.ts` contracts than a real library build would.
- Many product components in `src/components/` are app-coupled (leaflet/maplibre maps, data-fetching chats, auth-gated routes) and may only ever get floor cards.

# Apparent — "Cold DMs Are Dead" Brag Video

## Style Prompt
A fast, hard-cutting vertical Gen-Z social ad for Apparent, built from the app's real editorial design system (`--ed-*` in `src/editorial.css`). Chaotic-tier pacing (6-7 scenes, hard cuts, quick zoom/flash transitions) but mixed-case/lowercase typography — never ALL-CAPS shouting. Recreate the real `npx apparent` CLI build card and the investor signal-inbox pattern; don't invent generic SaaS visuals.

## Colors
- Ink (dark scenes — hook, turn, punchline, outro): `#222222`
- Canvas (light scenes — reveal, terminal, fit score, DM inbox): `#e9e9e9`
- Paper (card surfaces): `#ffffff`
- Ember (accent, CTA, badges): `#fa5d29`
- Graphite (secondary text on light): `#4d4d4d`
- Smoke (tertiary text/meta): `#808080`
- Fog (hairline borders on light): `#dedede`
- White text (on dark): `#ffffff`
- Terminal-specific (scene 3 only, matches the real `.cli-card` component):
  - Terminal background: `#15170d`
  - Terminal green (prompt/accent): `#9bbb16`
  - Terminal bright green (success/highlight): `#9cff9c`
  - Terminal cyan (sparkline): `#3fdede`
  - Terminal yellow (dates): `#ffb02e`
  - Terminal off-white (body): `#efece3`
  - Terminal bright white (names/emphasis): `#ffffff`
  - Terminal dim (labels): `rgba(255,255,255,0.4)`

## Typography
- Display font: `Inter Tight` (self-hosted `.woff2`, weights 400/500/600/700 in `assets/fonts/`) — mixed case / lowercase, medium-to-semibold weight. Never all-caps.
- Mono font: `JetBrains Mono` (self-hosted `.woff2`, weights 400/500 in `assets/fonts/`) — terminal scene only.
- Headlines: 64-96px range at 1080 width. Body/caption: 28-36px. Never smaller than 24px — this renders at video scale, not web-UI scale.

## Motion / Pacing
- 7 scenes, ~20s total, hard-cut/flash-cut/zoom-cut transitions (chaotic tier) — no soft crossfades.
- Every element enters via `gsap.from()`. No exit tweens except the final outro scene.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`, ~110 BPM. Punchline and outro scenes beat-lock near the track's strongest cues (~15.8s, ~18.0-18.6s).

## What Not To Do
- No ALL CAPS typography (overrides the chaotic preset default).
- No generic SaaS stock-gradient/particle filler — every scene must show real product material (the CLI card, the fit-score orb, the signal-inbox rows) or the brand's own copy.
- No invented colors outside the palette above.
- No glitch/error SFX — keep the sound aspirational, not comedic-broken.

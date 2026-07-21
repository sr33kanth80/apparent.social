# Apparent — "Source Before Consensus" Brag Video (Investor Version)

## Style Prompt
Companion piece to the founder-side "Cold DMs Are Dead" brag video — identical visual system, pacing, and music so the two read as one campaign. Chaotic-tier pacing (7 scenes, hard cuts, quick zoom/flash transitions), mixed-case/lowercase typography (never ALL-CAPS). Recreate the real thesis-chip workspace, the ranked signal list, and the agent-draft interaction from `Home.tsx` / `ForVCs.tsx` — no generic SaaS filler.

## Colors
- Ink (dark scenes — hook, turn, punchline, outro): `#222222`
- Canvas (light scenes): `#e9e9e9`
- Paper (card surfaces): `#ffffff`
- Ember (accent, CTA, badges): `#fa5d29`
- Graphite (secondary text on light): `#4d4d4d`
- Smoke (tertiary text/meta): `#808080`
- Fog (hairline borders on light): `#dedede`
- White text (on dark): `#ffffff`

## Typography
- Display font: `Inter Tight` (self-hosted `.woff2`, weights 400/500/600/700 in `assets/fonts/`) — mixed case / lowercase, medium-to-semibold weight. Never all-caps.
- Mono font: `JetBrains Mono` (self-hosted `.woff2`, weights 400/500) — CTA line only.
- Headlines: 64-96px range at 1080 width. Body/caption: 28-36px. Never smaller than 24px.

## Motion / Pacing
- 7 scenes, ~20.5s total, hard-cut/flash-cut transitions (chaotic tier) — no soft crossfades.
- Every element enters via `gsap.from()`. No exit tweens except the final outro scene.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`, ~110 BPM — same track as the founder video. Punchline and outro scenes beat-lock near the track's strongest cues (~15.8s, ~18.0-18.6s).

## What Not To Do
- No ALL CAPS typography.
- No generic SaaS stock-gradient/particle filler — every scene shows real product material (thesis chips, ranked list, agent-draft panel) or the brand's own copy.
- No invented colors outside the palette above — must match the founder video exactly.
- No glitch/error SFX.

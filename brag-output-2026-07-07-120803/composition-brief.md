# Hyperframes Composition Brief: Apparent — Investor Sourcing Version

## Objective
Companion piece to the existing founder-side "cold DMs are dead" brag video — same visual system, pacing, and music, re-aimed at the investor's sourcing pain: unranked, unverified inbound vs. a thesis-driven, agent-ranked signal feed.

## Output
- Composition directory: `brag-output-2026-07-07-120803/composition/`
- Rendered video: `brag-output-2026-07-07-120803/brag.mp4`
- Format: vertical — 1080x1920
- Duration: ~20.5 seconds

## Source Material
- Project root: `D:\SocialVC\apparent`
- Primary files read: `src/pages/Home.tsx` (thesis/sourcing tab mocks), `src/pages/ForVCs.tsx` (`InvestorSourcingPreview` component, FAQ, dark band), `src/editorial.css`
- Product name: Apparent
- Tagline / strongest claim: "By the time it's consensus, the round is full." (verbatim, `ForVCs.tsx` dark band)
- Key UI or visual moment to recreate:
  - The thesis-workspace chip mock (`Home.tsx` `META.thesis` panel): chips like "Sector · Dev tools", "Stage · Pre-seed → A", "Check · $250k–$2M", "Signal · Ships in public"
  - The "Ranked by fit" signal list (`Home.tsx` `META.sourcing` panel / `ForVCs.tsx` `VC_SIGNALS`): rows with company, category/stage/geo, and a fit score (96 / 92 / 89)
  - The `InvestorSourcingPreview` detail panel (`ForVCs.tsx`): fit orb, proof chips ("412 commits", "GitHub verified", "3 launches"), the "Agent draft ✍️" box, and the Save / Source / Draft outreach button row
- Copy that must appear verbatim (or near-verbatim, shortened for pacing):
  - "by the time it's consensus, the round is full." (verbatim, dark band)
  - "source your deal flow" (verbatim CTA button copy, `ForVCs.tsx`)
  - "your devtools thesis maps to their agent runtime and weekly shipping cadence." (verbatim agent-draft line, `ForVCs.tsx`)
  - Chip and row labels above, verbatim from source

## Creative Direction
- Tone preset: `chaotic` (pacing/scene-count/hard-cut energy only) — matches the founder video for a consistent campaign.
- Creative direction: same Gen-Z social-ad energy as the founder-side video — hard cuts, quick zooms, lowercase/sentence-case copy, never ALL-CAPS. Investor voice: confident and a little wry about inbox chaos, still simple words.
- Angle: from "your inbox is drowning in unranked pitches" to "your thesis, ranked and drafted for you" — landing on the site's own consensus line.
- Hook: `#222222` full-bleed, "400 cold pitches." / "0 fit your thesis. 🗑️"
- Outro / punchline: "by the time it's consensus, the round is full." → mark + wordmark + "source before consensus." + "source your deal flow →"
- Avoid: generic SaaS language, abstract filler visuals, ALL CAPS, unrelated visual redesign — reuse the exact same `--ed-*` palette and Inter Tight as the founder video so the two feel like one campaign.

## Visual Identity
- Background (light scenes): `#e9e9e9`
- Background (dark scenes — hook, turn, punchline, outro): `#222222`
- Card/paper surface: `#ffffff`
- Accent: `#fa5d29`
- Secondary text: `#4d4d4d` / `#808080`
- Text on dark: `#ffffff`
- Display font: Inter Tight (self-hosted `.woff2`, same files as the founder-video composition)
- Visual references from the project: `ed-chip` thesis chips, `ed-row`/`ed-score` ranked-list rows, `ed-fit-orb`, the agent-draft card pattern, Save/Source/Draft-outreach button row

## Storyboard
Use the storyboard in `brag-plan.md` as the creative contract. Scene summary:

1. **Hook** — 2.0s — "400 cold pitches." / "0 fit your thesis. 🗑️"
2. **Turn** — 1.4s — Apparent mark slams in, "your sourcing desk"
3. **Thesis chips** — 4.3s — 4 chips land one by one; caption "your taste, now criteria."
4. **Ranked signal list** — 2.6s — 3 founder rows cascade in with fit scores 96/92/89; caption "verified. ranked by fit."
5. **Agent draft + click** — 4.4s — detail panel with fit orb, proof chips, agent-draft text, simulated click on "Draft outreach"; caption "the agent drafts it. you send."
6. **Punchline** — 2.8s — "by the time it's consensus, the round is full."
7. **Outro** — 3.0s — mark + wordmark + "source before consensus." + "source your deal flow →"

## Audio
- Audio role: dense rhythmic layer, same restrained-chaotic posture as the founder video
- Audio arc: hot from frame one; chip pops and card-slides carry the middle scenes; a new UI-click beat for the simulated button press; punchline and outro beat-lock to the track's two strongest cues
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (reuse from the founder-video composition's assets — same file, same bundled cue preset)
- Music treatment: start at 0s, volume ~0.35, no fade-in, brief fade under the final outro frames
- Music cue guidance: bundled preset (`assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`). Strong cues at 15.82s, 18.01s, 18.55s, 20.19s — punchline scene (14.7-17.5s) and outro scene (17.5-20.5s) both contain one of these; lock a secondary emphasis pulse to each rather than delaying the primary text entrance (protects reading time, same approach as the founder video).
- Audio-reactive treatment: none — extraction helper unavailable in this environment, same as the founder video; documented, not blocking.
- Audio-coupled moments:
  - Scene 3 — chip pop-ins: soft drop sound on chip 1 and chip 4 only
  - Scene 4 — row cascades: card-slide sound on row 1 and row 3 only; small emphasis stamp on the top row's "96"
  - Scene 5 — agent-draft panel resolve: soft impact hit; simulated click on "Draft outreach": crisp UI click sound
  - Scene 6 — punchline: slam hit, emphasis pulse near ~15.8s strong cue
  - Scene 7 — outro: logo hit, emphasis pulse near ~18.0-18.6s strong cue
- SFX selection guidance: reuse the same restrained families as the founder video (`impact/impactSoft_medium_*`, `impact/impactPlate_light_*`, `impact/impactBell_heavy_003`, `casino/card-slide-1`), plus `interface/drop_*` for chip pop-ins and `interface/click_*` for the simulated button click (new to this video). Avoid glitch/error families.
- Audio files: reuse the music, font, and most SFX files already copied into the founder video's `composition/assets/`; add `interface/drop_001.ogg`, `interface/drop_002.ogg`, and `interface/click_001.ogg` for the new chip-pop and click moments.

## Hyperframes Instructions
Use the current `hyperframes` skill and CLI workflow, matching the conventions already established in the founder-video composition (single root composition, plain `.scene` divs opacity-crossfaded by one authored GSAP timeline, self-hosted `@font-face` woff2 fonts, SFX as individual `<audio>` clips on ascending track-indices).

Requirements:
- Show at least one real UI/copy element from the source project — the thesis chips, ranked list, and agent-draft panel are all required.
- Keep all text readable — respect reading-time floors (short label ~0.8s settled, sentence ~0.3s/word).
- Keep the video within 15-25 seconds (target ~20.5s).
- Include the planned music/SFX layer; reuse the founder video's copied assets where the file is identical (music, fonts, most impact/casino SFX) rather than re-fetching.
- Every scene needs entrance animations on every element and a transition into the next — no jump cuts; only the final scene may use exit/fade tweens.
- Use only 1-3 strong-cue beat locks; mark them `// beat-locked` in the GSAP code.
- Run Hyperframes lint, validate, and inspect before render; treat the known false-positive contrast-warning pattern (documented against the founder-video composition) as informational, not blocking, but re-check with real snapshots if anything looks genuinely different this time.

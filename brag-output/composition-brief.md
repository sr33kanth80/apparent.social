# Hyperframes Composition Brief: Apparent

## Objective
Create a short, fast, Gen-Z-voiced launch brag video for Apparent — an app where founders turn shipped work into verified proof with one command, and investors get an AI agent that ranks those founders against their thesis and drafts the DM.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: vertical — 1080x1920
- Duration: ~20 seconds

## Source Material
- Project root: `D:\SocialVC\apparent`
- Primary files read: `index.html`, `src/editorial.css`, `README.md`, `src/pages/Home.tsx`, `src/pages/ForVCs.tsx`, `src/pages/ForFounders.tsx`
- Product name: Apparent
- Tagline / strongest claim: "Where cracked founders meet capital." / "Your GitHub is a better pitch than your network."
- Key UI or visual moment to recreate:
  - The real CLI build card from `ForFounders.tsx`: macOS traffic-light terminal titled `founder@local: ~/medai`, `npx apparent` typed in, resolving into a verified build card (GitHub-verified badge, commit count, launch count).
  - The fit-score orb from `ForVCs.tsx` (`ed-fit-orb`, e.g. "96" / "Fit").
  - The signal-inbox row pattern from `ForVCs.tsx` (`ed-row`, avatar initials + company + meta + "New"/score badge) — recreate as investor DM notifications landing one by one.
- Copy that must appear verbatim (or near-verbatim, shortened for pacing):
  - "you shipped it. nobody saw it." (hook, adapted from the site's founder pain point — cf. ForFounders "Stop launching into the void")
  - "npx apparent" (the real CLI command)
  - "your code > your network." (shortened from "Your GitHub is a better pitch than your network.")
  - "where cracked founders meet capital." (site tagline, verbatim lowercase)

## Creative Direction
- Tone preset: `chaotic` (pacing/scene-count/hard-cut energy only)
- Creative direction: Gen-Z social-ad energy — TikTok/Reels pacing, hard cuts, quick zooms/flashes — but voiced in Apparent's own lowercase/sentence-case, emoji-flecked copy. Do NOT use aggressive ALL CAPS typography (that's the one chaotic-preset default to override). Words must stay simple — no VC jargon, no "thesis-aligned sourcing infrastructure."
- Interpretation: Keep chaotic's 6-7 scene count and hard-cut/flash transitions for TikTok-speed pacing. Pull typography to mixed case / lowercase at medium-to-semibold weight (Inter Tight) so it reads as Apparent's brand voice, not a generic hype reel.
- Angle: "Cold DMs are dead." The video opens on the universal founder pain (you ship, nobody sees it), flips into the fix (one terminal command → verified proof), shows the mechanic that makes it real (fit-score matching), and pays off with investor DMs landing — closing on the site's own thesis line, shortened to one punchy sentence.
- Hook: Full-bleed dark frame, "you shipped it. nobody saw it. 💀" — no logo yet.
- Outro / punchline: "your code > your network." → Apparent mark + wordmark + tagline + `npx apparent →` as the CTA.
- Avoid:
  - Generic SaaS language ("streamline," "unlock," "revolutionize")
  - Abstract filler visuals (no stock-photo-style gradients/particles standing in for the product)
  - Unrelated visual redesign — stay inside the `--ed-*` palette and Inter Tight, don't invent a new brand look
  - ALL CAPS shouting typography, aggressive/violent SFX (glitch/error families) — keep it aspirational, not comedic-broken

## Visual Identity
- Background (light scenes): `#e9e9e9` (`--ed-canvas`)
- Background (dark scenes — hook, turn, punchline, outro): `#222222` (`--ed-ink`)
- Card/paper surface: `#ffffff` (`--ed-paper`)
- Accent: `#fa5d29` (`--ed-ember`)
- Secondary text: `#4d4d4d` (`--ed-graphite`) / `#808080` (`--ed-smoke`)
- Text on dark: `#ffffff`
- Display font: Inter Tight (headlines — medium/semibold weight, mixed case, not all-caps)
- Mono font: JetBrains Mono (terminal/CLI scene only)
- Visual references from the project:
  - `ed-mock` / `ed-row` card list pattern (avatar circle + bold name + meta line + right-aligned badge)
  - `ed-fit-orb` circular fit-score badge
  - CLI card macOS traffic-light chrome from the ForFounders hero
  - `VerifiedBadge` checkmark glyph shape (recreate simply, don't need the exact SVG path)

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract. Scene summary:

1. **Hook** — 2.0s — dark frame, "you shipped it. nobody saw it. 💀" must be fully readable.
2. **Turn** — 1.4s — Apparent mark slams in on light canvas bg, "meet apparent" beneath.
3. **Terminal → build card** — 4.5s — `npx apparent` types out character by character in a real terminal chrome, then resolves into the verified build card (GitHub-verified badge, commit count, launch count). Caption: "one command. instant proof."
4. **Fit score stamp** — 2.0s — same card, a "96" fit-score orb stamps onto it. Caption: "ranked. matched. done."
5. **DM inbox lands** — 4.6s — signal-inbox header, three investor DM rows land one by one (seed fund / angel / GP), each tagged "New", all remain visible at scene end.
6. **Punchline** — 2.4s — dark frame, "your code > your network." (">" oversized).
7. **Outro** — 3.0s — dark frame, Apparent mark + wordmark + tagline "where cracked founders meet capital." + `npx apparent →` CTA line, holds to end.

## Audio
- Audio role: dense rhythmic layer, chaotic-tier density but clean-tier sound choices (not abrasive)
- Audio arc: hits hot from frame one with the music bed; typing/keypress and card-reveal SFX carry the middle scenes; two strongest musical beats in the whole track land almost exactly on the punchline and outro, so those get beat-locked; fades out under the final 0.3s
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (60s loop, ~110 BPM, punchy — matches chaotic pacing and the ~20s runtime)
- Music treatment: start at 0s, volume ~0.35, no fade-in (hits with the hook), fade out over the last ~0.3s of the outro
- Music cue guidance: bundled preset at `assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json` (also `.md` summary alongside it). Strong cues cluster at 15.82s, 18.01s, 18.55s, 20.19s. General beat grid ~0.55s apart for earlier scenes. Suggested (not mandatory) locks: punchline slam near ~15.8s, outro logo/wordmark near ~18.0-18.6s — adjust scene start times slightly if it helps hit these within ±0.15s, but readability and the 7-scene story beat order come first.
- Audio-reactive treatment: subtle — let the fit-score orb (scene 4) and DM-row card presence (scene 5) breathe slightly with RMS/bass. No waveform/equalizer visuals. Skip if extraction is unavailable; don't block the render on it.
- Audio-coupled moments:
  - Scene 3 typing — randomized keypress SFX per character (`assets/sfx/keyboard/keypress-*.wav`)
  - Scene 3 card resolve — a soft impact hit when the build card materializes
  - Scene 4 fit-score stamp — a crisp "locked in" hit
  - Scene 5 DM rows — card-landing SFX on the first and last row only (skip the middle row to avoid over-scoring three near-identical hits)
  - Scene 6 punchline — slam hit, ideally near the ~15.8s strong cue
  - Scene 7 outro — logo/wordmark hit, ideally near the ~18.0-18.6s strong cue window
- SFX selection guidance: choose from `keyboard/`, `interface/`, `impact/`, and `casino/` families per the moment→sound heuristics in the hyperframes/brag audio reference. Avoid `interface/glitch_*` and `interface/error_*` (too comedic/broken for this brand). Favor `impact/impactSoft_medium_*`, `impact/impactBell_heavy_*`, `impact/impactPlate_light_*`, and `casino/card-place-*`.
- SFX analysis guidance: read `assets/sfx/sfx-analysis.md` if present; prefer low/medium high-frequency-risk files since several moments repeat (typing, card landings).
- Exact SFX choice: Hyperframes should choose exact filenames, timestamps, density, and volume based on the implemented animation timing.
- Audio files: copy the chosen music track (and cue preset) and any selected SFX into `brag-output/composition/assets/`.

## Hyperframes Instructions
Use the current `hyperframes` skill and CLI workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the CLI build card and the signal-inbox/fit-score pattern are both required — this is the strongest material the video has).
- Keep all text readable in the final render — respect the reading-time floors noted in `brag-plan.md` (short label ~0.8s settled, sentence ~0.3s/word).
- Keep the video within 15-25 seconds (target ~20s).
- Include the planned music/SFX layer.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet — choose exact SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore cues that hurt readability, scene pacing, or the product story. Use only 1-3 strong cue locks.
- Use SFX to support motion and interaction: card sounds for the DM-row and build-card reveals, an announcement-style hit for the fit-score payoff, keypress sounds for the typed terminal command, restraint elsewhere.
- Honor the music fade-out under the final outro frames.
- Every scene needs entrance animations on every element (no element appears fully-formed) and a transition into the next scene — no jump cuts. Only the final scene (outro) may use exit/fade tweens.
- When music is present, wire at least one subtle audio-reactive visual (fit-score orb or DM-card presence responding to RMS/bass) per the current Hyperframes audio-reactive workflow, unless extraction is unavailable — in that case document it and skip, don't block the render.
- Use local assets for audio; copy files into `composition/assets/` before referencing them (relative paths only).
- Run Hyperframes lint, validate, and inspect before render.

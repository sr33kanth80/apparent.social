# Hyperframes Composition Brief: Apparent — Narrated Investor Overview (v2)

## Objective
Re-scope the narrated brand overview (`brag-output-2026-07-07-121947/`) to investors only, after user feedback that the dual-audience version confused viewers. Same visual system, same `default`-tone calm crossfade pacing, same voiceover-driven scene timing methodology — investor content only, no founder material.

## Output
- Composition directory: `brag-output-2026-07-07-123420/composition/`
- Rendered video: `brag-output-2026-07-07-123420/brag.mp4`
- Format: vertical — 1080x1920
- Duration: ~26.95s (driven by measured voiceover)

## Source Material
Same as the investor social ad (`brag-output-2026-07-07-120803/`): `src/pages/Home.tsx` (thesis panel), `src/pages/ForVCs.tsx` (ranked list, agent-draft card, "source your deal flow" / dark-band copy).

## Creative Direction
- Tone preset: `default`, identical to the first narrated video — soft ~0.3s opacity crossfades, no hard cuts.
- Scope: investor only. Do not reintroduce founder-side content (no CLI card, no "founders build in silence" material) — that was the exact source of the "confuses both audiences" feedback.
- Avoid: generic SaaS language, ALL CAPS, invented colors outside the shared `--ed-*` palette.

## Visual Identity
Identical palette/fonts to every prior video in the campaign: `#e9e9e9` / `#222222` / `#ffffff` / `#fa5d29` / `#4d4d4d` / `#808080`, Inter Tight self-hosted woff2 (reuse the font files already copied for videos 1-3).

## Voiceover — already generated and measured
Six per-line clips generated via `hyperframes tts --voice af_heart`, already rendered to `assets/vo/vo-1-hook.wav` through `vo-6-outro.wav`. Exact measured durations (ffprobe): 3.520s, 2.176s, 5.547s, 5.739s, 5.291s, 2.581s. **Do not regenerate or re-estimate — scene timing is derived directly from these measured numbers**, per `brag-plan.md`'s storyboard (exact boundary timestamps included there).

## Storyboard
Use `brag-plan.md`'s storyboard as the creative contract:
1. Hook — 0.0-3.82s — inbox/thesis-mismatch pain, two-part reveal
2. Turn — 3.82-6.30s — logo + "your private sourcing desk"
3. Thesis capture — 6.30-12.14s — 4 thesis chips
4. Agent ranks + drafts — 12.14-18.18s — ranked list (3 rows) then an agent-draft card
5. Contrast — 18.18-23.77s — "no more spray and pray" struck through → "just proof, matched to fit"
6. Outro — 23.77-26.95s — mark + wordmark + "source before consensus."

## Audio
- Music: reuse the vol-10 track already present in prior compositions, constant low volume (~0.14) for the whole runtime.
- SFX: 4 sparse default-tier accents (logo settle, chip pop, list-row pop, outro hit) — must sit under the narration, never on a spoken syllable.
- Audio-reactive: none (unavailable in this environment, consistent with prior videos).

## Hyperframes Instructions
- Same architecture as videos 1-3: single root composition, plain `.scene` divs opacity-crossfaded by one authored GSAP timeline, self-hosted `@font-face` fonts, each `<audio>` clip carrying an explicit `data-duration` (lesson learned from video 3's lint pass — omitting it causes false `duplicate_audio_track` warnings on a shared VO track).
- Scene entrance timings must be derived from the VO start times in `brag-plan.md` — not an independently planned rhythm.
- Every scene needs entrance animations; only the final scene may use exit/fade tweens.
- Run lint, validate, and inspect before render; treat the established false-positive contrast-warning pattern as informational, and re-confirm anything new via real snapshots.

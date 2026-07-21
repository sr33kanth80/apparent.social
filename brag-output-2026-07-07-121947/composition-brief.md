# Hyperframes Composition Brief: Apparent — Narrated Brand Overview

## Objective
Third piece in the Apparent campaign: a calmer, fully-narrated brand overview covering both founders and investors, sharing the visual system of videos 1 and 2 but paced by voiceover rather than hard cuts.

## Output
- Composition directory: `brag-output-2026-07-07-121947/composition/`
- Rendered video: `brag-output-2026-07-07-121947/brag.mp4`
- Format: vertical — 1080x1920
- Duration: ~25.7 seconds (driven by measured voiceover length, see below)

## Source Material
- Project root: `D:\SocialVC\apparent`
- Primary files read: `src/pages/ForFounders.tsx` (CLI card), `src/pages/Home.tsx` (thesis panel), `src/pages/ForVCs.tsx` (ranked list), `src/editorial.css`
- Product name: Apparent
- Tagline: "Where cracked founders meet capital."
- Copy that must appear verbatim: "This is Apparent, where cracked founders meet capital." (spoken, and echoed on screen in the outro)

## Creative Direction
- Tone preset: `default` — a deliberate shift from the `chaotic` hard-cut pacing of videos 1 and 2, because full-length narration needs breathing room.
- Transitions: soft opacity crossfades (~0.3s, no blur/scale punch) — NOT the hard-cut/blur/scale transitions used in the prior two videos.
- Avoid: generic SaaS language, ALL CAPS, abstract filler, inventing colors outside the shared `--ed-*` palette.

## Visual Identity
Identical palette/fonts to videos 1 and 2: `#e9e9e9` / `#222222` / `#ffffff` / `#fa5d29` / `#4d4d4d` / `#808080`, Inter Tight self-hosted woff2.

## Voiceover — already generated and measured
Six per-line clips generated via `hyperframes tts --voice af_heart`, already rendered to `assets/vo/vo-1-hook.wav` through `vo-6-outro.wav`. Exact measured durations (via ffprobe): 3.861s, 1.408s, 3.264s, 6.528s, 5.739s, 2.816s. **Do not regenerate or re-estimate these — the scene timing below is derived directly from these exact measured numbers.** Wire each as its own `<audio>` clip on a dedicated voiceover track-index, placed back-to-back with a 0.3s gap between each (also used as the crossfade transition window), a 0.3s lead-in before line 1, and a 0.3s hold after line 6.

## Storyboard
Use `brag-plan.md`'s storyboard as the creative contract — it includes exact scene boundary timestamps derived from the measured VO durations:
1. Hook — 0.0-4.16s — two-line pain statement
2. Turn — 4.16-5.87s — logo settles
3. Founder proof — 5.87-9.43s — condensed CLI build-card
4. Investor sourcing — 9.43-16.26s — thesis chips + ranked list composed together
5. Contrast — 16.26-22.30s — "no guessing" / "no spray and pray" struck through, "just proof, matched to fit" affirmed
6. Outro — 22.30-25.72s — mark + wordmark + tagline

## Audio
- Music: reuse `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (already present in earlier compositions — copy it in), held at a constant low volume (~0.14) for the whole runtime since the voiceover spans nearly all of it. No beat-locking in this video — pacing comes from the measured VO timestamps, not the music's beat grid.
- SFX: default-tier sparseness (3-5 accents total) — logo slam, CLI card reveal, one chip/list pop, outro hit. Must sit clearly under the narration and never land on a spoken syllable; prefer the small inter-line silences.
- Audio-reactive: none (unavailable in this environment, same as videos 1-2).

## Hyperframes Instructions
- Same composition architecture as videos 1 and 2 (single root composition, plain `.scene` divs opacity-crossfaded by one authored GSAP timeline, self-hosted `@font-face` fonts).
- Scene entrance timings must be derived from the actual VO start times listed above — do not use an independently-planned rhythm.
- Every scene needs entrance animations; only the final scene may use exit/fade tweens.
- Run Hyperframes lint, validate, and inspect before render. Treat the known false-positive contrast-warning pattern (documented in videos 1 and 2) as informational; re-confirm anything genuinely new via real snapshots.

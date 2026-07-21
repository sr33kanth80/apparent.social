# Brag Plan: Apparent — Narrated Investor Overview (v2 of the narrated video)

## Revision note 2 (light theme + new accent + emoji)
Follow-up feedback: convert to an all-light theme (no dark scenes at all — hook, contrast, and outro were previously dark ink), drop the ember/orange accent entirely in favor of a new one, and add relevant emoji to key screens. Applied:
- All 6 scenes now sit on `--canvas`/`--paper`, text flipped to ink/graphite throughout.
- New accent `#3454d1` (deep cobalt blue) replaces ember everywhere — kickers, chip/list live-dots, the selection ring, the strike-through bar, the affirmation line, glow blooms.
- Emoji added to on-screen labels, several reused verbatim from the real site's own copy for authenticity: "the investor problem 📬", "your private sourcing desk 🔍", "thesis workspace 🧭" / "private 🔒", "ranked by fit 🎯" / "fresh today ⚡" (site-verbatim), "Agent draft ✍️" (site-verbatim), "no more spray and pray. 🚫", "just proof, matched to fit. ✅", "source before consensus. 🔎".

## Revision note (visual + audio polish pass)
After the first cut of this video, feedback was: narration/pacing/scope good, but "the visuals are okay ish, not good" — asked for a more premium, Anthropic-product-demo-inspired look plus richer, more satisfying sound design (mechanical keyboard typing, Apple-style mouse click). Applied in place:
- **Visual:** kicker/eyebrow labels for hierarchy, a subtle oversized background mark bleeding off-frame in the hook, softer/warmer card shadows, an ember glow bloom behind the scene-5 affirmation, an ambient breathing glow in the turn and outro scenes, varied easing/duration/direction per the motion-principles guardrails (no more than 2 tweens sharing an ease per scene), switched `.from()` to `.fromTo()` throughout for deterministic non-linear-seek safety.
- **Interaction + audio:** scene 3 now shows "Dev tools" typed character-by-character into a thesis input (8 mechanical keypress sounds), confirming into the chip row; scene 4 adds a simulated cursor that clicks the top-ranked row (Apple-style `mouseclick1` sound) before the agent-draft card reveals. SFX count went from 4 to 14 sparse accents (keypresses, confirm tick, chip pops, row pop, click, draft reveal, negation snap, affirm chime, logo/outro hits) — still under the narration, never on top of a spoken syllable.
- Narration, scene timing, and investor-only scope are unchanged from the original plan below.

## Why this version exists
The first narrated overview (`brag-output-2026-07-07-121947/`) covered both founders and investors in one video and, per direct user feedback, "confuses both founders and investors watching it." This version keeps the same narrated, calmer `default`-tone approach and the same visual system, but drops the founder half entirely and speaks to one audience only: investors sourcing deal flow. Single audience, single throughline.

## What is this app?
For investors, Apparent is a private sourcing desk: capture your thesis once, and an AI agent ranks verified founders against it every day, then drafts the outreach — so you source before the round is competitive.

## The angle
A calm, narrated walk through the investor mechanism only: the pain of unranked inbound, the fix (a private sourcing desk), the mechanism (thesis capture → agent ranking → drafted outreach), and the payoff line. No founder-side content, no split attention.

## Hook (first few seconds)
"Your inbox is drowning in pitches that don't fit your thesis." — stated flat, the qualifier ("that don't fit your thesis") lands a beat after the rest, in emphasis.

## Key moments (the middle)
- Thesis capture: the real thesis-chip mock (Sector, Stage, Check, Signal) landing as the narration lists them.
- Agent ranking + drafting: the real ranked signal list (three founder rows, fit scores) cascading in, followed by a compact "agent draft" card appearing right as the narration says "drafts the outreach for you."
- Contrast: "no more spray and pray" struck through, landing on "just proof, matched to fit."

## Outro / punchline
"This is Apparent. Source before consensus." — spoken over the mark, wordmark, and the investor-specific tagline (reused verbatim from the investor social ad, `brag-output-2026-07-07-120803/`).

## User flow worth showing
Investor only, entry → action → result: capture thesis (chips) → agent ranks verified founders daily (list with fit scores) → agent drafts the outreach (draft card). Same real components as the investor social ad and the first narrated video, recomposed for narration pacing and stripped of any founder-side material.

## Tone
- Preset: `default` (same as the first narrated video) — soft crossfades, comfortable rhythm, paced entirely by the measured voiceover.
- Creative direction: identical visual system and calm pacing to the first narrated video; the only change is scope — investor-only content, investor-only language throughout.

## Format: vertical — 1080x1920
## Duration: driven by narration — 6 lines measure ~24.85s total; with 0.3s inter-line pauses/crossfades, a 0.3s lead-in, and a 0.3s trailing hold, total video is ~26.95s.

## Visual identity (from the project)
Identical to all prior videos in the campaign: `#e9e9e9` / `#222222` / `#ffffff` / `#fa5d29` / `#4d4d4d` / `#808080`, Inter Tight self-hosted.

## Share copy (draft)
your thesis, narrated: capture it once, let an AI agent rank verified founders against it daily, and let it draft the outreach. source before it's consensus.

## Voiceover script
Generated per-line via `hyperframes tts --voice af_heart`, measured exactly via `ffprobe`:

| # | Line | File | Duration |
|---|---|---|---|
| 1 | "Your inbox is drowning in pitches that don't fit your thesis." | `assets/vo/vo-1-hook.wav` | 3.52s |
| 2 | "Apparent is your private sourcing desk." | `assets/vo/vo-2-turn.wav` | 2.18s |
| 3 | "Capture your thesis once, sectors, stages, check size, the signals you actually back." | `assets/vo/vo-3-thesis.wav` | 5.55s |
| 4 | "An agent ranks verified founders against it, every single day, and drafts the outreach for you." | `assets/vo/vo-4-agent.wav` | 5.74s |
| 5 | "No more spray and pray. Just proof, matched to fit, before the round turns competitive." | `assets/vo/vo-5-contrast.wav` | 5.29s |
| 6 | "This is Apparent. Source before consensus." | `assets/vo/vo-6-outro.wav` | 2.58s |

Total spoken audio: 24.85s. A 0.3s pause/crossfade window separates each line, plus a 0.3s lead-in and a 0.3s trailing hold — total video ~26.95s.

## Audio direction
- Role: voiceover-led, identical posture to the first narrated video — narration spans nearly the whole runtime, music and SFX only ever support it.
- Music: same track, held at a constant low volume (~0.14) throughout.
- SFX: default-tier sparse (4 accents) — logo settle, chip pop, list-row pop, outro hit.
- Audio-reactive: none (unavailable in this environment).

## Storyboard

### Scene 1 — Hook — 0.0s to 3.82s (VO1, 3.52s)
`#222222`. "your inbox is drowning in pitches" lands first; "that don't fit your thesis." appends in ember shortly after, timed to the sentence's second clause.
Transition: soft crossfade (0.3s) → Scene 2

### Scene 2 — Turn — 3.82s to 6.30s (VO2, 2.18s)
`#e9e9e9`. Apparent mark settles, "your private sourcing desk" beneath.
Transition: soft crossfade → Scene 3

### Scene 3 — Thesis capture — 6.30s to 12.14s (VO3, 5.55s)
`#e9e9e9`. Thesis-workspace card, 4 chips (Sector, Stage, Check, Signal) landing in quick sequence, holding for the rest of the line.
Transition: soft crossfade → Scene 4

### Scene 4 — Agent ranks + drafts — 12.14s to 18.18s (VO4, 5.74s)
`#e9e9e9`. Ranked signal list (3 rows, fit scores) cascades in first; a compact "agent draft" card appears in the back half of the line, timed to "drafts the outreach for you."
Transition: soft crossfade → Scene 5

### Scene 5 — Contrast — 18.18s to 23.77s (VO5, 5.29s)
`#222222`. "no more spray and pray." lands and is struck through; "just proof, matched to fit." lands bigger, in ember, and holds through "before the round turns competitive."
Transition: soft crossfade → Scene 6

### Scene 6 — Outro — 23.77s to 26.95s (VO6, 2.58s + 0.3s trailing hold)
`#222222`. Mark + wordmark + "source before consensus." land together, hold to end.

**Audio summary:** Same posture as the first narrated video — six voiceover lines drive the whole runtime, music sits low and constant, SFX are sparse accents that never compete with the voice. The only change from the first narrated video is scope: investor-only content, no founder material, addressing the "confuses both audiences" feedback directly.

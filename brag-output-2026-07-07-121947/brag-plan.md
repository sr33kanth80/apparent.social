# Brag Plan: Apparent — Narrated Brand Overview

## What is this app?
Apparent is a proof-first marketplace connecting founders and investors: founders turn shipped work into a verified profile with one command, investors capture a thesis once and let an AI agent rank real founders against it daily and draft the outreach — so the match happens before the round turns competitive.

## The angle
The third piece in the campaign — where videos 1 and 2 were fast, silent, hard-cut social ads for one audience each, this is the narrated brand overview: calmer, voice-led, covering both sides of the marketplace in one continuous story. Same visual system (`--ed-*` palette, Inter Tight), but `default`-tone pacing (crossfades, not hard cuts) so the voiceover can carry the piece.

## Hook (first few seconds)
Dark frame, two lines landing in sequence as they're spoken: "founders build in silence." / "investors drown in cold decks." — both sides' pain, stated flat, before the turn.

## Key moments (the middle)
- The founder proof moment: a condensed real CLI build-card reveal (GitHub-verified badge, commit count) as the narration says "your work becomes verified proof."
- The investor sourcing moment: thesis chips stacked above a ranked signal list with real fit scores, composed as one frame — literally showing thesis → ranked founders as narration describes the mechanism.
- The contrast beat: "no guessing" and "no spray and pray" struck through in quick succession, landing on the affirmative "just proof, matched to fit" as the narration turns positive.

## Outro / punchline
"This is Apparent, where cracked founders meet capital." — spoken over the mark, wordmark, and tagline landing together, verbatim from the site.

## User flow worth showing
Both sides in sequence, matching the narration: founder runs one command → verified proof profile; investor captures thesis once → agent ranks founders daily → drafts outreach. Pulled from the same real components used in videos 1 and 2 (`ForFounders.tsx` CLI card, `Home.tsx` thesis panel, `ForVCs.tsx` ranked list), condensed to fit the narration's pace rather than re-explained from scratch.

## Tone
- Preset: `default` (playful, clean, postable, warm, direct — comfortable rhythm, crossfade transitions) — a deliberate shift from videos 1 and 2's `chaotic` hard-cut pacing, because full narration needs room to be heard and understood, not competed with by rapid cuts.
- Creative direction: same brand voice and visual system as the first two videos, but the calmer sibling — this is the explainer that plays when someone wants to actually understand what Apparent does, not the social hook.
- Interpretation: soft opacity crossfades (~0.3s, no blur/scale punch) instead of hard cuts; scene count and cut timing are driven entirely by the voiceover's actual measured duration per line, not by an independent visual rhythm.

## Format: vertical — 1080x1920
## Duration: driven by narration — actual voiceover measures ~23.6s across 6 lines; total video ~25.7s once inter-line pauses and a closing hold are added (see Voiceover script below for exact per-line durations).

## Visual identity (from the project)
- Background: `#e9e9e9` light scenes; `#222222` dark scenes (hook, turn, outro)
- Accent: `#fa5d29`
- Text: `#222222` on light, `#ffffff` on dark
- Display font: Inter Tight (self-hosted, same files as videos 1 and 2)
- Strongest visual elements: the CLI build-card (founder proof), the thesis-chips + ranked-list composition (investor sourcing), reused from the first two compositions for visual continuity across the campaign

## Share copy (draft)
one video, both sides of Apparent: founders turn shipped work into verified proof, investors turn a thesis into a daily ranked shortlist. no guessing, no spray and pray — just proof, matched to fit.

## Voiceover script
Generated per-line via `hyperframes tts --voice af_heart`, measured exactly (not estimated) so scene cuts land on the actual audio boundaries:

| # | Line | File | Duration |
|---|---|---|---|
| 1 | "Founders build in silence. Investors drown in cold decks." | `assets/vo/vo-1-hook.wav` | 3.86s |
| 2 | "Apparent fixes both." | `assets/vo/vo-2-turn.wav` | 1.41s |
| 3 | "Run one command, and your work becomes verified proof." | `assets/vo/vo-3-founder.wav` | 3.26s |
| 4 | "Capture your thesis once, and an agent ranks real founders against it, every day, then drafts the outreach." | `assets/vo/vo-4-investor.wav` | 6.53s |
| 5 | "No guessing. No spray and pray. Just proof, matched to fit, before the round turns competitive." | `assets/vo/vo-5-contrast.wav` | 5.74s |
| 6 | "This is Apparent, where cracked founders meet capital." | `assets/vo/vo-6-outro.wav` | 2.82s |

Total spoken audio: 23.6s. A 0.3s pause separates each line (also used as the crossfade transition window between scenes), plus a 0.3s lead-in before line 1 and a 0.3s hold after line 6 — bringing total video duration to ~25.7s. Scene visual entrances are timed to each line's measured start, not to an independently-planned rhythm.

## Audio direction
- Role: voiceover-led — the narration is the primary audio element for the full runtime; music and SFX support it and never compete with it.
- Music: same track as videos 1 and 2, `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`, but held at a constant low ducked volume (~0.14) for the entire piece since narration spans nearly the whole runtime — no dynamic duck/return automation needed given the silence gaps are only 0.3s each.
- Music treatment: constant low bed under narration; a small swell only after the voiceover ends is unnecessary here since the outro line is spoken, not silent.
- Music cue guidance: not used for beat-locking in this video — pacing is dictated by the voiceover's measured per-line timing, not by the music's beat grid. This is a deliberate departure from videos 1 and 2.
- Audio-reactive treatment: none (same as videos 1 and 2 — extraction helper unavailable in this environment).
- SFX posture: default-tier — sparser and quieter than the chaotic videos. 3-5 light accents at key visual beats only (logo slam, card reveal, chip/list pop-ins, outro hit); nothing competes with the voice.
- Audio-coupled moments: logo slam (scene 2), CLI card reveal (scene 3), chip + ranked-list pop-ins (scene 4, first item only), strike-through negation beats (scene 5), outro logo hit (scene 6).
- Restraint rule: SFX must sit well under the narration in volume and never land on a syllable — align to the small silences between spoken lines where possible.

## Storyboard

### Scene 1 — Hook — 0.0s to 4.16s (~3.86s of VO + 0.3s lead-in)
`#222222`. Two lines land as they're spoken: "founders build in silence." near the start, "investors drown in cold decks." roughly mid-line (matching the sentence boundary in the audio).
Sequential/interaction: none
Audio: VO line 1 starts at 0.3s
Transition mood: soft crossfade (0.3s) → Scene 2

### Scene 2 — Turn — 4.16s to 5.87s (~1.41s)
`#e9e9e9`. Apparent mark settles in center as "Apparent fixes both" is spoken.
Audio: VO line 2 starts at 4.46s; logo slam SFX at entrance
Transition mood: soft crossfade → Scene 3

### Scene 3 — Founder proof — 5.87s to 9.43s (~3.26s)
`#e9e9e9`. Condensed real CLI build-card (macOS terminal chrome, "$ npx apparent", GitHub-verified badge, commit count) resolves as one reveal — no letter-by-letter typing this time, the line is too short for it.
Audio: VO line 3 starts at 6.17s; soft card-reveal SFX
Transition mood: soft crossfade → Scene 4

### Scene 4 — Investor sourcing — 9.43s to 16.26s (~6.53s)
`#e9e9e9`. Composed single frame: thesis chips (Sector, Stage, Check) in a small card up top, ranked signal list (2-3 real founder rows with fit scores) cascading in below it shortly after — visually showing thesis → ranked founders as one pipeline, timed to the narration's two clauses.
Sequential/interaction: yes — chips settle first, ranked rows cascade in partway through the line
Audio: VO line 4 starts at 9.73s; light pop SFX on first chip and first ranked row only
Transition mood: soft crossfade → Scene 5

### Scene 5 — Contrast — 16.26s to 22.30s (~5.74s)
`#222222`. "no guessing." lands and gets struck through; "no spray and pray." lands and gets struck through; then "just proof, matched to fit." lands bigger, in ember, and holds for the remainder of the line (before the round turns competitive is spoken over this same held frame — no new text, avoids overloading the frame).
Sequential/interaction: yes — three sequential text beats, timed to the three spoken clauses
Audio: VO line 5 starts at 16.56s
Transition mood: soft crossfade → Scene 6

### Scene 6 — Outro — 22.30s to 25.72s (~2.82s of VO + 0.3s trailing hold)
`#222222`. Apparent mark + wordmark + tagline "where cracked founders meet capital." land together as the closing line is spoken, then hold.
Audio: VO line 6 starts at 22.6s; outro logo hit SFX
Transition mood: hold to end

**Music mood for this video:** same track as videos 1/2, held low throughout — this video is about the voice, not the beat.
**Audio summary:** Six voiceover lines drive the entire runtime; music sits as a quiet, constant bed; SFX are sparse accents timed to visual beats, never competing with the narration.

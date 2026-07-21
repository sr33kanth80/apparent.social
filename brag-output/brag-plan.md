# Brag Plan: Apparent

## What is this app?
Apparent replaces cold outreach with proof: founders run one command (`npx apparent`) to turn their real GitHub activity and launches into a verified profile, and investors get an AI agent that ranks those verified founders against their thesis and drafts the first DM — so the right people find each other before either side has to cold-pitch.

## The angle
"Cold DMs are dead." The video plays as a fast, relatable founder problem (you ship, nobody sees it) solved in one terminal command, then flips to show the payoff investors were built for (verified deal flow lands in their inbox, ranked and ready to message). It's the site's own best line — "Your GitHub is a better pitch than your network" — turned into 20 seconds of proof, not slides.

## Hook (first 2-3 seconds)
Full-bleed ink-dark frame. Big type: "you shipped it. nobody saw it." No logo yet. This is the universal indie-hacker/founder pain — instant recognition, sets up the "watch this instead" turn.

## Key moments (the middle)
- The `npx apparent` terminal typing live, keys audibly ticking, resolving into the real verified build card (GitHub verified badge, commit count, launch count) — the product's actual CLI artifact, not a mockup.
- A "96 Fit" score orb stamping onto the card — visualizing thesis-matching, the mechanic that makes this not just another directory.
- Three investor DM rows landing one by one in a signal inbox ("Seed fund, dev tools," "Angel, ex-founder," "GP, AI infra thesis") each tagged "New" — the actual payoff, dramatized as notifications arriving in real time.

## Outro / punchline
"your code > your network." — the site's real thesis, shortened to a genz-legible one-liner — then the Apparent mark, wordmark, and `npx apparent` as the closing CTA.

## User flow worth showing
Founder side, entry → action → result: founder types `npx apparent` in a real terminal → verified build card renders (GitHub commits, launches, traction) → investor DMs land in the signal inbox, matched by thesis and ranked by fit. This is the actual product loop (verify → match → get DMed), pulled from the ForFounders CLI card and the ForVCs signal-inbox mock, not just landing-page copy.

## Tone
- Preset: `chaotic` (pacing, scene count, hard cuts/flash energy)
- Creative direction: Gen-Z social-ad energy — TikTok/Reels pacing, fast hard cuts, quick zooms — but voiced in Apparent's own lowercase/sentence-case, emoji-flecked copy (like the site's "Stop 👏 launching 👏 into 👏 the 👏 void"), never ALL-CAPS shouting. Simple words only — no "thesis-aligned sourcing infrastructure," just "your code gets you DMed."
- Interpretation: Keep chaotic's scene count (6-7) and hard-cut/flash transitions for TikTok-speed pacing, but pull typography back to mixed case / lowercase at comfortable-to-heavy weight (matching `--ed-font: Inter Tight`) so it reads as this brand, not a generic hype reel. Restraint on caps = the language stays "easy," per the ask.

## Format: vertical — 1080x1920
## Duration: 20s

## Visual identity (from the project)
- Background: `#e9e9e9` (ed-canvas) for light scenes; `#222222` (ed-ink) for dark/hook/outro scenes
- Accent: `#fa5d29` (ed-ember)
- Text: `#222222` on light, `#ffffff` on dark
- Display font: Inter Tight (headlines, medium/semibold weight)
- Body/mono font: JetBrains Mono for the terminal/CLI scene
- Strongest visual element: the real CLI build card from ForFounders ("founder@local: ~/medai" macOS terminal chrome, GitHub-verified badge) and the signal-inbox fit-score orb from ForVCs

## Share copy (draft)
cold DMs are dead 💀 run `npx apparent`, ship your proof, and let investors DM *you*.

## Audio direction
- Role: dense rhythmic layer, matched to chaotic pacing but not abrasive
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (60s compact loop, ~110 BPM, punchy — bundled preset available)
- Music treatment: start at 0s, volume ~0.35, no fade-in (hits with the hook), quick fade-out under the last 0.3s of the outro
- Music cue guidance: preset read (`vol-10.music-cues.md`, ~110 BPM). Beat grid ~0.55s apart usable for accent hits throughout. Strong cues cluster at 15.82s, 18.01s, 18.55s, 20.19s — these land almost exactly on the planned punchline (~14.5-16.9s) and outro (~16.9-19.9s) scenes, so lock the punchline slam near 15.8s and the logo/outro hit near 18.0-18.6s. Earlier scenes (hook/terminal/DM inbox) use the general beat grid for cut timing, not exact strong-cue locks.
- Audio-reactive treatment: subtle; let the fit-score orb and DM-card presence breathe slightly with RMS/bass. No waveform/equalizer visuals.
- SFX posture: dense but clean — one SFX per beat-relevant moment, not stacked on every single cut. Chaotic-tier density, clean-tier file choices (avoid the noisiest glitch/error files given the brand is not aggressive).
- Audio-coupled moments: terminal typing (randomized `keyboard/keypress-*.wav` per character), build-card materializing (`impact/impactSoft_medium_*`), fit-score stamp (`impact/impactBell_heavy_000` or `impact/impactPlate_light_*`), each DM row landing (`casino/card-place-*`, accent first + last row only), punchline slam (`impact/impactSoft_medium_*`), outro logo (`impact/impactBell_heavy_003`).
- Restraint rule: no glitch/error SFX (keep it aspirational, not comedic-broken), no more than one sound per 0.5s window, never drown the typing/keypress audio under the music.

## Storyboard

### Scene 1 — Hook — 2.0s
Full-bleed `#222222` background. Center type (mixed case, heavy-ish weight, Inter Tight): "you shipped it. nobody saw it." Small trailing "💀" after "saw it." No logo, no chrome — just the line, dead center, holding for the full scene.
Sequential/interaction: none
Audio intent: deadpan gut-punch under the music's first bar — let the line land in silence-ish space before the beat kicks
Audio-coupled idea: none (hold the line clean)
Music: track starts at 0s, low-key intro energy
Transition mood: hard cut → Scene 2

### Scene 2 — Turn — 1.4s
Flash cut to `#e9e9e9`. Apparent mark (LogoIcon) slams in center, scales 1.15→1.0, with "meet apparent" in small mixed-case type beneath it.
Sequential/interaction: none
Audio intent: a single confident hit — this is the "here's the fix" beat
Audio-coupled idea: logo slam synced to `impact/impactSoft_medium_002` at entry
Music: beat grid accent near ~2.0-2.5s window
Transition mood: hard cut/flash → Scene 3

### Scene 3 — Terminal → build card — 4.5s
Recreate the real ForFounders CLI card: macOS traffic-light terminal titled "founder@local: ~/medai." Cursor types `npx apparent` character by character (~1.2s), then the terminal panel flips/wipes into the verified build card: GitHub-verified badge, commit count, launch count, on the `#e9e9e9`/paper surface. Small caption beneath, mixed case: "one command. instant proof." holds for the back half of the scene.
Sequential/interaction: yes — `npx apparent` types out one character at a time; card then reveals as one motion (not itemized)
Audio intent: tactile, satisfying — the typing should feel real, the card reveal should feel like a payoff
Audio-coupled idea: randomized `keyboard/keypress-*.wav` per typed character; `impact/impactSoft_medium_001` at the moment the card resolves
Music: steady groove, no special accent needed beyond the card-reveal hit
Transition mood: clean wipe → Scene 4

### Scene 4 — Fit score stamp — 2.0s
Same build card, now with a "96" fit-score orb (from the ForVCs `ed-fit-orb` treatment) stamping onto the top corner of the card with a small scale-bounce. Caption: "ranked. matched. done." in mixed case beneath.
Sequential/interaction: yes — the orb stamps in as a single decisive beat (not gradual)
Audio intent: a crisp "locked in" moment
Audio-coupled idea: orb stamp synced to `impact/impactPlate_light_001` or `impact/impactBell_heavy_000`
Music: beat grid accent
Transition mood: hard cut → Scene 5

### Scene 5 — DM inbox lands — 4.6s
Cut to the ForVCs-style signal inbox on `#ffffff`/paper: header "signal inbox 📡 · fresh today ⚡." Three rows land one by one, each sliding/popping in with a "New" tag: "Seed fund, dev tools — writing $250k–$1M cheques now," "Angel, ex-founder — backs technical pre-seed teams," "GP, AI infra thesis — leads and co-invests at seed." All three remain stacked and visible by the end of the scene.
Sequential/interaction: yes — 3 rows arrive in sequence, roughly 1.2-1.4s apart, holding position once landed
Audio intent: notification excitement building — each arrival should feel like a ping, not a chore
Audio-coupled idea: `casino/card-place-002` (or similar) on row 1 and row 3 only; skip row 2 to avoid over-scoring three near-identical hits
Music: approaching the 15.82s strong-cue window by the scene's end — let the third row's landing lean toward that cue
Transition mood: hard cut → Scene 6

### Scene 6 — Punchline — 2.4s
Full-bleed `#222222`. Center type: "your code > your network." mixed case, the ">" rendered oversized/bold for emphasis.
Sequential/interaction: none
Audio intent: the line should slam right on/near the 15.82s strong beat
Audio-coupled idea: text entrance synced to `impact/impactSoft_medium_003` timed to the ~15.8s strong cue
Music: strong cue lock (15.82s, ±0.15s)
Transition mood: hard cut → Scene 7

### Scene 7 — Outro — 3.0s
`#222222` background. Apparent mark + wordmark "apparent" center, tagline beneath in smaller type: "where cracked founders meet capital." Final line, smallest, mono font: `npx apparent →`. Everything holds to the end; music fades out under the last few frames.
Sequential/interaction: none
Audio intent: confident, settled landing — no more urgency, just the brand
Audio-coupled idea: logo/wordmark entrance synced to the 18.01-18.55s strong-cue window via `impact/impactBell_heavy_003`
Music: strong cue lock (~18.0-18.6s), then fade out over the final 0.3s
Transition mood: hold to black/end

**Music mood for this video:** upbeat, punchy, chaotic-but-clean — vol-10 compact loop
**Audio summary:** The track runs hot from frame one, typing/keypress and card-reveal hits carry the middle section, and the two strongest musical beats in the whole track (≈15.8s and ≈18.0-18.6s) line up almost exactly with the punchline slam and the logo outro — so those two moments get locked to the music, everything else rides the general beat grid.

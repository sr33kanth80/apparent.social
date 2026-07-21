# Brag Plan: Apparent — Investor Sourcing Version

## What is this app?
Apparent is a private sourcing desk for investors: capture your thesis once, and an AI agent ranks verified founders against it every day — proof-first, not another cold-pitch inbox — then drafts the outreach so you reach the founder before the round is competitive.

## The angle
Companion piece to the founder-side "cold DMs are dead" video, same visual system and pacing, flipped to the investor's actual daily pain: an inbox full of unranked, unverified pitches that don't map to any thesis. The fix is shown as a mechanic, not a slide — thesis chips get captured once, the agent ranks real founders by fit daily, and drafts the first message — landing on the site's own gut-punch line about consensus.

## Hook (first 2-3 seconds)
Full-bleed ink-dark frame. "400 cold pitches." / "0 fit your thesis. 🗑️" — the investor's actual inbox problem, stated flat.

## Key moments (the middle)
- The thesis workspace: 4 criteria chips (sector, stage, check size, founder signal) landing one by one — "your taste, now criteria," pulled directly from the real Home.tsx thesis panel.
- The ranked signal list: three real founder rows (Edge runtime for agents / Local-first sync engine / Eval harness for LLMs) cascading in with fit scores 96 / 92 / 89 — the actual ForVCs "Ranked by fit" mock.
- The agent-draft detail panel: proof chips (412 commits, GitHub verified, 3 launches), the agent's drafted outreach line, and a simulated cursor click on "Draft outreach" — the real `InvestorSourcingPreview` interaction from ForVCs.tsx.

## Outro / punchline
"by the time it's consensus, the round is full." — verbatim from the site's dark-band section — then the Apparent mark, wordmark, "source before consensus." tagline, and the real CTA copy "source your deal flow →".

## User flow worth showing
Investor side, entry → action → result: define thesis (chips saved once) → agent ranks verified founders against it daily (signal inbox, fit scores) → agent drafts the first outreach, investor clicks to send. Pulled directly from `Home.tsx`'s four-tab product preview and `ForVCs.tsx`'s `InvestorSourcingPreview` component — the actual investor product loop, not just landing-page claims.

## Tone
- Preset: `chaotic` (pacing, scene count, hard-cut energy) — same as the founder-side companion video.
- Creative direction: same Gen-Z social-ad energy as the founder video (fast hard cuts, quick zooms) but voiced from the investor's side — confident, a little wry about their own inbox chaos, still lowercase/sentence-case, never ALL-CAPS. Simple words — no "thesis-aligned sourcing infrastructure," just "your taste, now criteria."
- Interpretation: Matched pair with the founder video — same rhythm, same hard-cut transitions, same restraint on shouty typography — so the two read as one campaign, not two different products.

## Format: vertical — 1080x1920
## Duration: ~20.5s

## Visual identity (from the project)
- Background: `#e9e9e9` (ed-canvas) light scenes; `#222222` (ed-ink) dark scenes (hook, turn, punchline, outro)
- Accent: `#fa5d29` (ed-ember)
- Text: `#222222` on light, `#ffffff` on dark
- Display font: Inter Tight (self-hosted, same as the founder video)
- Strongest visual elements: the thesis-chip workspace mock, the "Ranked by fit" signal list, and the `ed-fit-orb` + "Agent draft" panel — all real components from `Home.tsx` and `ForVCs.tsx`

## Share copy (draft)
your thesis, on autopilot 🎯 apparent ranks verified founders against it daily and drafts the DM — so you source before it's consensus.

## Audio direction
- Role: dense rhythmic layer, same restrained-chaotic posture as the founder video
- Music: same track, `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (~110 BPM) — keeps this a matched pair with the founder video
- Music treatment: start at 0s, volume ~0.35, no fade-in, brief fade under the final outro frames
- Music cue guidance: same bundled preset. Strong cues at 15.82s, 18.01s, 18.55s, 20.19s. Punchline scene (14.7-17.5s) beat-locks its accent near 15.82s; outro scene (17.5-20.5s) beat-locks its accent near 18.0-18.6s.
- Audio-reactive treatment: none planned (matches founder video — extraction helper unavailable in this environment; documented, not blocking).
- SFX posture: same restrained-chaotic density as the founder video; no glitch/error families.
- Audio-coupled moments: thesis chips popping in (soft drop sounds, first + last chip only), ranked-list rows cascading (card-slide, row 1 + row 3 only), agent-draft panel resolving (soft impact), simulated cursor click on "Draft outreach" (crisp UI click — new interaction beat for this video), punchline slam, outro logo hit.
- Restraint rule: same as founder video — no more than one sound per ~0.5s window, nothing comedic-broken.

## Storyboard

### Scene 1 — Hook — 2.0s
Full-bleed `#222222`. "400 cold pitches." then "0 fit your thesis. 🗑️" — held for the full scene, no logo yet.
Sequential/interaction: none
Audio intent: flat, deadpan gut-punch before the beat kicks in
Music: track starts at 0s
Transition mood: hard cut → Scene 2

### Scene 2 — Turn — 1.4s
`#e9e9e9`. Apparent mark slams in, "your sourcing desk" beneath it in small type.
Sequential/interaction: none
Audio intent: one confident hit — the "here's the fix" beat
Audio-coupled idea: logo slam synced to a soft impact hit
Transition mood: hard cut/flash → Scene 3

### Scene 3 — Thesis chips — 4.3s
Recreate the real thesis-workspace mock: 4 chips land one by one — "Sector · Dev tools," "Stage · Pre-seed → A," "Check · $250k–$2M," "Signal · Ships in public" — all remain visible together. Caption beneath: "your taste, now criteria."
Sequential/interaction: yes — 4 chips arrive in quick sequence, first + last accented with a soft drop sound
Audio intent: light, satisfying pops — building the workspace
Transition mood: hard cut → Scene 4

### Scene 4 — Ranked signal list — 2.6s
The real "Ranked by fit" mock: three rows cascade in — Edge runtime for agents (96), Local-first sync engine (92), Eval harness for LLMs (89). Caption: "verified. ranked by fit."
Sequential/interaction: yes — 3 rows arrive in sequence (row 1 + row 3 get a card-slide accent, row 2 silent, matching the founder video's restraint pattern); the top row's "96" gets a small emphasis stamp as the standout
Audio intent: building excitement, top score lands with a little extra punch
Transition mood: hard cut → Scene 5

### Scene 5 — Agent draft + click — 4.4s
The real `InvestorSourcingPreview` detail panel: selected founder card with a big fit orb, proof chips (412 commits / GitHub verified / 3 launches), the "Agent draft ✍️" box with its real drafted line, and the Save / Source / Draft outreach button row. A cursor simulates a click on "Draft outreach." Caption: "the agent drafts it. you send."
Sequential/interaction: yes — simulated cursor click on the primary button, with a crisp UI click sound
Audio intent: the click should feel decisive — this is the "it just works" moment
Transition mood: hard cut → Scene 6

### Scene 6 — Punchline — 2.8s
`#222222`. "by the time it's consensus, the round is full." — verbatim from the site's dark band.
Sequential/interaction: none
Audio intent: the line should land near the ~15.8s strong beat (a secondary emphasis pulse, not the primary entrance — matches the founder video's approach to protect reading time)
Transition mood: hard cut → Scene 7

### Scene 7 — Outro — 3.0s
`#222222`. Apparent mark + wordmark, tagline "source before consensus." beneath, CTA line "source your deal flow →" in mono, smallest.
Sequential/interaction: none
Audio intent: settled, confident landing; music fades under the last frames
Transition mood: hold to end

**Music mood for this video:** upbeat, punchy, chaotic-but-clean — same vol-10 loop as the founder video
**Audio summary:** Same audio arc as the founder companion piece — hot from frame one, SFX carry the middle scenes (chip pops, card slides, a UI click), and the two strongest beats in the track land on the punchline and the outro logo.

#!/usr/bin/env bash
# Voiceover for the technical feature tour (edge-tts, same narrator as the explainer).
set -e
VOICE="en-US-AndrewNeural"
RATE="-4%"
OUT="public/vo2"
mkdir -p "$OUT"
say () { python -m edge_tts --voice "$VOICE" --rate="$RATE" --text "$2" --write-media "$OUT/$1.mp3"; echo "  wrote $1.mp3"; }

say 01-intro     "Under the hood, Apparent is a two-sided platform, with an A.I. agent working for each side, founders and investors, matched on proof, not warm intros."
say 02-arch      "It starts with evidence. A founder's GitHub, launches, and traction become a verified profile. Public signals enrich it. Then thesis matching ranks every founder against every investor's criteria."
say 03-fverify   "Founders verify in one command. Run npx apparent, and your shipped products, GitHub history, and traction become a proof profile investors can trust."
say 04-fagent    "Get matched by thesis, stage, and category. Then your A.I. founder agent finds the investors who fit, and opens personalized intros on your behalf. Never spam."
say 05-ithesis   "Investors start with a thesis. Sectors, stages, geographies, check size, the must-have signals, and the reasons you pass."
say 06-isource   "An A.I. sourcing agent screens founders around the clock, and delivers pre-vetted deal flow, ranked by proof, freshness, and fit, with revenue and traction surfaced upfront."
say 07-iradar    "Builder Radar maps where talent is clustering. Deep-dive research briefs each company. And a clean pipeline moves it from first pass to partner review, with the intro already drafted."
say 08-stack     "It all runs on React and TypeScript, a Supabase backend, Kinde identity, and an inference layer that powers both agents, with a live signals pipeline behind Builder Radar."
say 09-close     "Two sides. Two agents. One fit. Apparent."
echo done

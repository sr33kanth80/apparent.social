#!/usr/bin/env bash
# Generates per-scene voiceover with edge-tts (free Microsoft neural voices).
set -e
VOICE="en-US-AndrewNeural"
RATE="-4%"
OUT="public/vo"
mkdir -p "$OUT"

say () { python -m edge_tts --voice "$VOICE" --rate="$RATE" --text "$2" --write-media "$OUT/$1.mp3"; echo "  wrote $1.mp3"; }

say 01-hook       "Venture capital still runs on warm intros. The best founders stay invisible, until someone you know, knows them."
say 02-what       "Apparent is where traction meets conviction. An A.I. sourcing agent that connects investors with founders who've actually shipped."
say 03-thesis     "It starts with your thesis. Capture the sectors, stages, geographies, and check sizes you back, and the signals you pass on."
say 04-sourcing   "Then your agent goes to work. Around the clock, it ranks verified founders against your thesis, by proof, freshness, and fit."
say 05-density    "Builder Radar plots investors and builders by geography, stage, and thesis. Read the density, before it becomes consensus."
say 06-pipeline   "Save a builder and move them through a clean deal flow board. The agent even drafts your first outreach."
say 07-founders   "Founders get the other half. Verified builds, launches, and traction, in one quiet profile. No warm intro required."
say 08-close      "Apparent. Source from proof, not noise."
echo "done"

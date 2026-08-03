#!/usr/bin/env bash
# Snappy Gen-Z investor cut. Bright expressive voice, faster rate. No em-dashes anywhere.
set -e
VOICE="en-US-AvaNeural"
RATE="+8%"
OUT="public/vo3"
mkdir -p "$OUT"
say () { python -m edge_tts --voice "$VOICE" --rate="$RATE" --text "$2" --write-media "$OUT/$1.mp3"; echo "  wrote $1.mp3"; }

say 01-hook     "Warm intros? Dead."
say 02-meet     "Meet Apparent. Your A.I. sourcing agent."
say 03-thesis   "Set your thesis once."
say 04-source   "Your agent sources founders around the clock."
say 05-rank     "Ranked by proof, freshness, and fit."
say 06-proof    "Real revenue. Verified. Right up front."
say 07-radar    "See where builders are clustering."
say 08-pipe     "Save it. Draft the intro. Move fast."
say 09-close    "Source from proof, not noise. Apparent."
echo done

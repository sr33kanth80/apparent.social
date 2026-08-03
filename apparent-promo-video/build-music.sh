#!/usr/bin/env bash
# Builds an original ambient pad bed (royalty-free, deterministic) for the explainer.
# Slow chord swells: Cmaj7 -> Am7 -> Fmaj7 -> G, looped, reverbed, low-passed, quiet.
set -e
TMP="./mtmp"
rm -rf "$TMP"; mkdir -p "$TMP"
OUT="public/music"
mkdir -p "$OUT"
DUR=4.0

chord () { # $1=outfile  $2..=freqs
  local out="$1"; shift
  local inputs=() maps="" n=0
  for f in "$@"; do inputs+=(-f lavfi -i "sine=frequency=$f:duration=$DUR"); maps+="[$n]"; n=$((n+1)); done
  ffmpeg -y -loglevel error "${inputs[@]}" \
    -filter_complex "${maps}amix=inputs=$n:normalize=1,afade=t=in:d=1.1,afade=t=out:st=2.6:d=1.4[a]" \
    -map "[a]" "$out"
}

chord "$TMP/c1.wav" 261.63 329.63 392.00 493.88   # Cmaj7
chord "$TMP/c2.wav" 220.00 261.63 329.63 392.00   # Am7
chord "$TMP/c3.wav" 174.61 220.00 261.63 329.63   # Fmaj7
chord "$TMP/c4.wav" 196.00 261.63 293.66 392.00   # Gsus

ffmpeg -y -loglevel error -i "$TMP/c1.wav" -i "$TMP/c2.wav" -i "$TMP/c3.wav" -i "$TMP/c4.wav" \
  -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1[a]" -map "[a]" "$TMP/prog.wav"

# Loop the 16s progression to cover ~64s, then warm it up and quiet it down.
ffmpeg -y -loglevel error -stream_loop 3 -i "$TMP/prog.wav" \
  -filter_complex "vibrato=f=5:d=0.04,aecho=0.8:0.9:120|280:0.3|0.2,lowpass=f=1900,highpass=f=90,afade=t=in:d=2,afade=t=out:st=58:d=5,volume=0.16" \
  -t 63 -ar 44100 -ac 2 "$OUT/bed.mp3"

rm -rf "$TMP"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/bed.mp3"

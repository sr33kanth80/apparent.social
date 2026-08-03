#!/usr/bin/env python3
"""Original 128 BPM electronic beat bed (royalty-free, deterministic) for the
snappy investor cut. Kick, clap, hats, bassline, arpeggio, pad. ffmpeg only."""
import os, subprocess, math, sys

OUTFILE = sys.argv[1] if len(sys.argv) > 1 else "public/music/beat.mp3"
TARGET = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
TMP = "./btmp"
os.makedirs(TMP, exist_ok=True)
os.makedirs(os.path.dirname(OUTFILE) or ".", exist_ok=True)

BPM = 128.0
SPB = 60.0 / BPM          # 0.46875 s per beat
BAR = 4 * SPB             # 1.875 s
PHRASE = 4 * BAR          # 7.5 s (4 chords)

def sh(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# ── one-shots ────────────────────────────────────────────────────────────────
def kick(path):
    # 55 Hz body with a quick exponential pitch/amp drop
    sh(["ffmpeg","-y","-f","lavfi","-i","sine=frequency=55:duration=0.18",
        "-af","afade=t=out:st=0.02:d=0.15:curve=exp,volume=1.0",path])
def clap(path):
    sh(["ffmpeg","-y","-f","lavfi","-i","anoisesrc=d=0.14:color=white:amplitude=0.7",
        "-af","bandpass=f=1600:width_type=h:w=1200,afade=t=out:st=0.01:d=0.12:curve=exp,volume=0.5",path])
def hat(path):
    sh(["ffmpeg","-y","-f","lavfi","-i","anoisesrc=d=0.05:color=white:amplitude=0.5",
        "-af","highpass=f=8000,afade=t=out:st=0.005:d=0.045:curve=exp,volume=0.28",path])
def note(path, freq, dur, curve, vol, harm=0.0):
    # sine + optional 2nd-harmonic for a brighter pluck/bass
    if harm > 0:
        sh(["ffmpeg","-y","-f","lavfi","-i",f"sine=frequency={freq}:duration={dur}",
            "-f","lavfi","-i",f"sine=frequency={freq*2}:duration={dur}",
            "-filter_complex",f"[1]volume={harm}[h];[0][h]amix=inputs=2:normalize=0,afade=t=out:st=0.02:d={dur-0.02:.3f}:curve={curve},volume={vol}[a]",
            "-map","[a]",path])
    else:
        sh(["ffmpeg","-y","-f","lavfi","-i",f"sine=frequency={freq}:duration={dur}",
            "-af",f"afade=t=out:st=0.02:d={dur-0.02:.3f}:curve={curve},volume={vol}",path])

kick(f"{TMP}/kick.wav")
clap(f"{TMP}/clap.wav")
hat(f"{TMP}/hat.wav")

# chords: (bass_root_hz, [arp triad hz asc], [pad triad hz])
CHORDS = [
    (110.00, [220.00, 261.63, 329.63], [220.00, 261.63, 329.63]),  # Am
    ( 87.31, [174.61, 220.00, 261.63], [174.61, 220.00, 261.63]),  # F
    (130.81, [261.63, 329.63, 392.00], [261.63, 329.63, 392.00]),  # C
    ( 98.00, [196.00, 246.94, 293.66], [196.00, 246.94, 293.66]),  # G
]

# pre-render bass + arp note one-shots keyed by rounded freq
freqs_bass, freqs_arp = set(), set()
for root, arp, _ in CHORDS:
    freqs_bass.add(round(root,2)); freqs_bass.add(round(root*2,2))
    for a in arp: freqs_arp.add(round(a,2))
for fr in freqs_bass: note(f"{TMP}/bass_{fr}.wav", fr, 0.24, "exp", 0.55, harm=0.25)
for fr in freqs_arp:  note(f"{TMP}/arp_{fr}.wav",  fr, 0.16, "exp", 0.30, harm=0.4)

# ── place hits into a phrase track ───────────────────────────────────────────
def build_track(hits, out):
    # hits: list of (wavpath, time_seconds)
    inputs, filters, labels = [], [], []
    for i,(wav,t) in enumerate(hits):
        inputs += ["-i", wav]
        ms = int(round(t*1000))
        filters.append(f"[{i}]adelay={ms}|{ms}[a{i}]")
        labels.append(f"[a{i}]")
    graph = ";".join(filters) + ";" + "".join(labels) + f"amix=inputs={len(hits)}:normalize=0,atrim=0:{PHRASE:.3f}[o]"
    sh(["ffmpeg","-y",*inputs,"-filter_complex",graph,"-map","[o]",out])

kick_hits, clap_hits, hat_hits, bass_hits, arp_hits = [],[],[],[],[]
for bar in range(4):
    root, arp, _ = CHORDS[bar]
    b0 = bar*BAR
    for beat in range(4):
        t = b0 + beat*SPB
        kick_hits.append((f"{TMP}/kick.wav", t))
        if beat in (1,3): clap_hits.append((f"{TMP}/clap.wav", t))
        # bass: root on beats, octave-up on beat 4 for drive
        bf = round(root*2,2) if beat==3 else round(root,2)
        bass_hits.append((f"{TMP}/bass_{bf}.wav", t))
    for e in range(8):  # 8th-note hats + ascending arp
        t = b0 + e*(SPB/2)
        hat_hits.append((f"{TMP}/hat.wav", t))
        af = round(arp[e % 3],2)
        arp_hits.append((f"{TMP}/arp_{af}.wav", t))

build_track(kick_hits, f"{TMP}/t_kick.wav")
build_track(clap_hits, f"{TMP}/t_clap.wav")
build_track(hat_hits,  f"{TMP}/t_hat.wav")
build_track(bass_hits, f"{TMP}/t_bass.wav")
build_track(arp_hits,  f"{TMP}/t_arp.wav")

# pad: sustained chord per bar
pad_inputs, pad_filters, pad_labels = [], [], []
for bar in range(4):
    _,_,pad = CHORDS[bar]
    subs = []
    for j,fr in enumerate(pad):
        pad_inputs += ["-f","lavfi","-i",f"sine=frequency={fr}:duration={BAR:.3f}"]
    # handled below in one pass instead
# simpler: render each bar's pad, concat
pad_bar_files=[]
for bar in range(4):
    _,_,pad = CHORDS[bar]
    ins=[]; mix=""
    for fr in pad: ins += ["-f","lavfi","-i",f"sine=frequency={fr}:duration={BAR:.3f}"]
    mix = "".join(f"[{k}]" for k in range(len(pad))) + f"amix=inputs={len(pad)}:normalize=1,afade=t=in:d=0.15,afade=t=out:st={BAR-0.2:.3f}:d=0.2,volume=0.5[o]"
    f=f"{TMP}/pad_{bar}.wav"; pad_bar_files.append(f)
    sh(["ffmpeg","-y",*ins,"-filter_complex",mix,"-map","[o]",f])
concat_ins=[]; concat_lbl=""
for k,f in enumerate(pad_bar_files):
    concat_ins += ["-i",f]; concat_lbl += f"[{k}]"
sh(["ffmpeg","-y",*concat_ins,"-filter_complex",concat_lbl+f"concat=n={len(pad_bar_files)}:v=0:a=1[o]","-map","[o]",f"{TMP}/t_pad.wav"])

# ── master: loop each phrase to TARGET, mix with weights, glue + limit ────────
loops = math.ceil(TARGET/PHRASE)+1
tracks = [("t_kick",1.0),("t_clap",0.9),("t_hat",0.8),("t_bass",1.0),("t_arp",0.85),("t_pad",0.7)]
mi, lbl = [], ""
for i,(name,_) in enumerate(tracks):
    mi += ["-stream_loop",str(loops),"-i",f"{TMP}/{name}.wav"]
weights = " ".join(str(w) for _,w in tracks)
for i in range(len(tracks)): lbl += f"[{i}]"
fadeout = max(0, TARGET-3)
graph = (lbl + f"amix=inputs={len(tracks)}:normalize=0:weights={weights}[m];"
         f"[m]highpass=f=32,lowpass=f=15000,acompressor=threshold=-16dB:ratio=3:attack=8:release=180,"
         f"afade=t=in:d=0.2,afade=t=out:st={fadeout:.2f}:d=3,volume=9.0,alimiter=limit=0.95[o]")
sh(["ffmpeg","-y",*mi,"-filter_complex",graph,"-map","[o]","-t",str(TARGET),"-ar","44100","-ac","2",OUTFILE])

# cleanup
for f in os.listdir(TMP): os.remove(os.path.join(TMP,f))
os.rmdir(TMP)
dur = subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",OUTFILE]).decode().strip()
print("beat duration", dur)

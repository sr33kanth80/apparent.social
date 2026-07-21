param(
  [string]$Output = "promo/how-proof-gets-funded-openclaw-animated-promo.mp4",
  [switch]$ForceFrames
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workDir = Join-Path $root "promo/how-proof-gets-funded-openclaw-animated-work"
$framesDir = Join-Path $workDir "frames"
$voicePath = Join-Path $workDir "voiceover.wav"
$musicPath = Join-Path $workDir "music-bed.wav"
$silentPath = Join-Path $workDir "animated-silent.mp4"
$outputPath = Join-Path $root $Output
$assetDir = Join-Path $root "assets/how-proof-gets-funded-openclaw"

New-Item -ItemType Directory -Force $workDir | Out-Null
New-Item -ItemType Directory -Force $framesDir | Out-Null
New-Item -ItemType Directory -Force (Split-Path $outputPath -Parent) | Out-Null

function Invoke-Ffmpeg {
  param([string[]]$Arguments)

  & ffmpeg @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed with exit code $LASTEXITCODE"
  }
}

$voiceScript = @"
Your startup has proof already.
Repos. Launches. Early users.
Apparent turns that work into a proof card investors can actually read.
Then the heat map finds the investors who fit.
Stage, sector, city, thesis.
When proof meets thesis, cold starts warm.
Run npx apparent. Get discovered.
"@

Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice("Microsoft David Desktop")
$speaker.Rate = 1
$speaker.Volume = 100
$speaker.SetOutputToWaveFile($voicePath)
$speaker.Speak($voiceScript)
$speaker.SetOutputToNull()
$speaker.Dispose()

$lastFrame = Join-Path $framesDir "frame-0599.png"
if ($ForceFrames -or -not (Test-Path $lastFrame) -or -not (Test-Path $musicPath)) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "render-openclaw-animated-frames.ps1") -FramesDir $framesDir -AssetDir $assetDir -MusicPath $musicPath
  if ($LASTEXITCODE -ne 0) {
    throw "frame renderer failed with exit code $LASTEXITCODE"
  }
} else {
  Write-Host "Reusing rendered animation frames"
}

Invoke-Ffmpeg @(
  "-y",
  "-framerate", "30",
  "-i", (Join-Path $framesDir "frame-%04d.png"),
  "-c:v", "libx264",
  "-preset", "veryfast",
  "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-r", "30",
  "-movflags", "+faststart",
  $silentPath
)

Invoke-Ffmpeg @(
  "-y",
  "-i", $silentPath,
  "-i", $voicePath,
  "-i", $musicPath,
  "-filter_complex",
  "[1:a]volume=0.72,atempo=1.28,highpass=f=80,lowpass=f=9500,acompressor=threshold=-22dB:ratio=2.2:attack=8:release=120,volume=1.18,adelay=300|300,apad=whole_dur=20[voice];[2:a]volume=0.32,afade=t=in:st=0:d=0.6,afade=t=out:st=18.6:d=1.4[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.92[a]",
  "-map", "0:v",
  "-map", "[a]",
  "-c:v", "copy",
  "-c:a", "aac",
  "-b:a", "160k",
  "-shortest",
  "-movflags", "+faststart",
  $outputPath
)

Write-Host "Rendered $outputPath"

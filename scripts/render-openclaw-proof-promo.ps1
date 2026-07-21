param(
  [string]$Output = "promo/how-proof-gets-funded-openclaw-reel.mp4"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$assetDir = Join-Path $root "assets/how-proof-gets-funded-openclaw"
$workDir = Join-Path $root "promo/how-proof-gets-funded-openclaw-work"
$outputPath = Join-Path $root $Output

New-Item -ItemType Directory -Force $workDir | Out-Null
New-Item -ItemType Directory -Force (Split-Path $outputPath -Parent) | Out-Null

$fps = 30
$duration = 3.8
$frames = [int]($duration * $fps)
$fontRegular = "C\:/Windows/Fonts/segoeui.ttf"
$fontBold = "C\:/Windows/Fonts/segoeuib.ttf"

function Invoke-Ffmpeg {
  param([string[]]$Arguments)

  & ffmpeg @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed with exit code $LASTEXITCODE"
  }
}

function Set-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Value
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

$scenes = @(
  @{
    File = "01-scattered-proof.png"
    Headline = "You already have proof."
    Subline = "repos, launches, users"
    Slug = "scene-01"
  },
  @{
    File = "02-verified-proof.png"
    Headline = "Make it investor-readable."
    Subline = "npx apparent turns work into a proof card"
    Slug = "scene-02"
  },
  @{
    File = "03-heat-map-route.png"
    Headline = "Stop pitching everyone."
    Subline = "find investors by stage, sector, city"
    Slug = "scene-03"
  },
  @{
    File = "04-thesis-match.png"
    Headline = "Match proof to thesis."
    Subline = "the right investor sees why now"
    Slug = "scene-04"
  },
  @{
    File = "05-warm-investor-conversation.png"
    Headline = "Turn cold into warm."
    Subline = "proof makes the first conversation easier"
    Slug = "scene-05"
  }
)

function Write-FilterFile {
  param(
    [string]$Path,
    [string]$Headline,
    [string]$Subline
  )

  $filter = @"
[0:v]scale=1320:-2,setsar=1,zoompan=z='1+0.00028*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1000x563:fps=$fps,format=rgba[art];
[1:v]format=rgba[base];
[base][art]overlay=x='40+18*min(t/0.5,1)':y=655:shortest=1[v1];
[v1]drawbox=x=64:y=130:w=112:h=8:color=0xEC3B31@0.92:t=fill[v2];
[v2]drawtext=fontfile='$fontBold':text='$Headline':fontcolor=0x111111:fontsize=70:x=64:y=168:alpha='min(max((t-0.12)/0.32,0),1)'[v3];
[v3]drawtext=fontfile='$fontRegular':text='$Subline':fontcolor=0x444444:fontsize=36:x=66:y=268:alpha='min(max((t-0.32)/0.34,0),1)'[v4];
[v4]drawbox=x=64:y=1528:w=952:h=1:color=0x111111@0.12:t=fill[v5];
[v5]drawtext=fontfile='$fontRegular':text='npx apparent':fontcolor=0xEC3B31:fontsize=34:x=64:y=1570:alpha='0.95'[v6];
[v6]drawtext=fontfile='$fontRegular':text='apparent.social':fontcolor=0x222222:fontsize=34:x=w-tw-64:y=1570:alpha='0.75'[vout]
"@

  Set-Utf8NoBom -Path $Path -Value $filter
}

function Render-Scene {
  param([hashtable]$Scene)

  $imagePath = Join-Path $assetDir $Scene.File
  $filterPath = Join-Path $workDir "$($Scene.Slug).filter.txt"
  $scenePath = Join-Path $workDir "$($Scene.Slug).mp4"

  Write-FilterFile -Path $filterPath -Headline $Scene.Headline -Subline $Scene.Subline

  Invoke-Ffmpeg @(
    "-y",
    "-i", $imagePath,
    "-f", "lavfi", "-i", "color=c=0xFBFAF7:s=1080x1920:r=${fps}:d=$duration",
    "-filter_complex_script", $filterPath,
    "-map", "[vout]",
    "-t", "$duration",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "$fps", "-movflags", "+faststart",
    $scenePath
  )

  return $scenePath
}

function Render-Outro {
  $filterPath = Join-Path $workDir "scene-06.filter.txt"
  $scenePath = Join-Path $workDir "scene-06.mp4"
  $outroDuration = 3.6

  $filter = @"
[0:v]format=rgba[base];
[base]drawbox=x=64:y=144:w=112:h=8:color=0xEC3B31@0.92:t=fill[v1];
[v1]drawtext=fontfile='$fontBold':text='Apparent':fontcolor=0x111111:fontsize=96:x=64:y=190:alpha='min(max((t-0.10)/0.32,0),1)'[v2];
[v2]drawtext=fontfile='$fontRegular':text='turn founder proof into investor discovery':fontcolor=0x333333:fontsize=40:x=66:y=318:alpha='min(max((t-0.30)/0.34,0),1)'[v3];
[v3]drawtext=fontfile='$fontBold':text='npx apparent':fontcolor=0xEC3B31:fontsize=66:x=(w-tw)/2:y=820:alpha='min(max((t-0.75)/0.35,0),1)'[v4];
[v4]drawbox=x=220:y=930:w=640:h=1:color=0x111111@0.14:t=fill[v5];
[v5]drawtext=fontfile='$fontRegular':text='apparent.social':fontcolor=0x111111:fontsize=42:x=(w-tw)/2:y=980:alpha='min(max((t-1.00)/0.35,0),1)'[v6];
[v6]drawtext=fontfile='$fontRegular':text='free for founders getting ready to raise':fontcolor=0x666666:fontsize=32:x=(w-tw)/2:y=1516:alpha='0.82'[vout]
"@

  Set-Utf8NoBom -Path $filterPath -Value $filter

  Invoke-Ffmpeg @(
    "-y",
    "-f", "lavfi", "-i", "color=c=0xFBFAF7:s=1080x1920:r=${fps}:d=$outroDuration",
    "-filter_complex_script", $filterPath,
    "-map", "[vout]",
    "-t", "$outroDuration",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "$fps", "-movflags", "+faststart",
    $scenePath
  )

  return $scenePath
}

$scenePaths = @()
foreach ($scene in $scenes) {
  $scenePaths += Render-Scene -Scene $scene
}
$scenePaths += Render-Outro

$concatPath = Join-Path $workDir "concat.txt"
$concatLines = $scenePaths | ForEach-Object {
  $safe = $_.Replace("\", "/")
  "file '$safe'"
}
$concatLines | Set-Content -LiteralPath $concatPath -Encoding ASCII

Invoke-Ffmpeg @(
  "-y",
  "-f", "concat", "-safe", "0", "-i", $concatPath,
  "-c", "copy", "-movflags", "+faststart",
  $outputPath
)

Write-Host "Rendered $outputPath"

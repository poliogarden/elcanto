#!/bin/bash
# elcanto composition render plan
# Requires: yt-dlp (with rights to source), ffmpeg
# Run on Railway worker — NOT on Vercel serverless
set -euo pipefail
WORKDIR="${1:-./render-out}"
mkdir -p "$WORKDIR/clips" "$WORKDIR/out"

# CLIP 01 — SOURCE 01 — THE COMMON GROUND
# https://www.youtube.com/watch?v=1lXMwmPomUY&t=199s
# ffmpeg -ss 199 -to 219 -i "input_01.mp4" -c copy "$WORKDIR/clips/clip_01.mp4"

# CLIP 02 — SOURCE 02 — THE COMMON GROUND
# https://www.youtube.com/watch?v=lzMdDfxuyDU&t=0s
# ffmpeg -ss 0 -to 20 -i "input_02.mp4" -c copy "$WORKDIR/clips/clip_02.mp4"

# Interludes (title cards / TTS) — implement per policy
# INTERLUDE 2: "But when these arguments are placed next to each other, another possibility appe..." (6s)

# Concat
# ffconcat file: $WORKDIR/concat.txt
# ffmpeg -f concat -safe 0 -i "$WORKDIR/concat.txt" -c copy "$WORKDIR/out/8e30ab63-1938-4bbe-a459-92a9f9969f55.mp4"

echo "Render plan ready. Supply licensed source files before running ffmpeg."
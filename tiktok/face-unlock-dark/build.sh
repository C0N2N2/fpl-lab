#!/bin/sh
# One command: Hidden Lines No. 001 — How your phone sees you in the dark (vertical 1080×1920, 80 s).
#   sh build.sh          voice (if missing) → timeline → events → picture → mix → master → subtitles → poster
# Needs the Lemo-Opuscar library with the core, voice and music tiers (setup.sh deps voice music).
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
NAME=face-unlock-dark
WORKERS=${WORKERS:-2}
SIZE=1080x1920
export LEMO_ANGLE=${LEMO_ANGLE:-swiftshader}     # no GPU in the cloud machine; drop this on a Mac
cd "$LIB"
"$PY" core/audio/sampler.py --need "$HERE/mix.py"
if [ ! -f "$HERE/voice/l12.wav" ]; then
  "$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voice"
  "$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voice" --lang en
fi
python3 "$HERE/tools/timeline.py" > /dev/null
node core/render/events.mjs "$HERE" --size $SIZE
node core/render/video.mjs "$HERE" --fps 24 --workers "$WORKERS" --size $SIZE --q "jit=${JIT:-4}" --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py" "$HERE/out/mix.wav"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
python3 "$HERE/tools/srt.py"
node core/render/still.mjs "$HERE" 46.6 --size $SIZE --q "jit=8&subs=0" --out "$HERE/out/poster" && cp "$HERE/out/poster/t_46.6.jpg" "$HERE/poster.jpg"
echo "done: $HERE/$NAME.mp4"

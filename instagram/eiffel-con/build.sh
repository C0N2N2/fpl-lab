#!/bin/sh
# One command: "The Man Who Sold the Eiffel Tower" — Victor Lustig, 1925 (Torn Paper Collage, 1080×1920, 94 s, Instagram Reels).
#   sh build.sh      voice (if missing) → timeline → events → picture → mix → master → subtitles → cover
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
PY="$LIB/.venv/bin/python"
NAME=eiffel-con
SIZE=1080x1920
cd "$LIB"
"$PY" core/audio/sampler.py --need "$HERE/mix.py"
if [ ! -f "$HERE/voice/l14.wav" ]; then
  "$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voice"
  "$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voice" --lang en
fi
python3 "$HERE/tools/timeline.py" > /dev/null
node core/render/events.mjs "$HERE" --size $SIZE
node core/render/video.mjs "$HERE" --fps 24 --workers ${WORKERS:-3} --size $SIZE --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py" "$HERE/out/mix.wav"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
python3 "$HERE/tools/srt.py"
node core/render/still.mjs "$HERE" 3.5 --size $SIZE --q "subs=0" --out "$HERE/out/poster" && cp "$HERE/out/poster/t_3.5.jpg" "$HERE/poster.jpg"
echo "done: $HERE/$NAME.mp4"

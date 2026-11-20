"""timeline.json subtitles → subtitles_en.srt (the subtitles are also burned into the picture)."""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subs = json.load(open(os.path.join(HERE, 'timeline.json')))['subs']
ts = lambda t: f"{int(t//3600):02d}:{int(t%3600//60):02d}:{int(t%60):02d},{int(round((t%1)*1000)):03d}"
open(os.path.join(HERE, 'subtitles_en.srt'), 'w').write(''.join(f"{i+1}\n{ts(s['t0'])} --> {ts(s['t1'])}\n{s['text']}\n\n" for i, s in enumerate(subs)))
print('subtitles_en.srt', len(subs), 'cues')

"""Narration starts → timeline.json: subtitle cues (split at sentences, ≤ 2 lines) and absolute word times."""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO = {'l01': 0.6, 'l02': 5.2, 'l03': 11.6, 'l04': 17.4, 'l05': 20.0, 'l06': 26.8, 'l07': 31.4, 'l08': 37.4, 'l09': 43.2, 'l10': 49.2, 'l11': 58.6, 'l12': 66.6}
END = 76.0
lines = {l['id']: l for l in json.load(open(os.path.join(HERE, 'lines.json')))}
dur = json.load(open(os.path.join(HERE, 'voice', 'dur.json')))
words = json.load(open(os.path.join(HERE, 'voice', 'words.json')))
MAXC = 64                                   # one cue: up to ~2 lines of 34 characters
subs, W = [], {}
for lid, t in VO.items():
    sub = lines[lid]['sub']
    sents = [s.strip() for s in re.findall(r'[^.?!]+[.?!]?', sub) if s.strip()]
    ws = words[lid]
    W[lid] = [[w, round(t + max(a, 0), 3), round(t + b, 3)] for w, a, b in ws]
    # group sentences into cues
    cues, cur = [], ''
    for s in sents:
        if cur and len(cur) + 1 + len(s) > MAXC: cues.append(cur); cur = s
        else: cur = (cur + ' ' + s).strip()
    cues.append(cur)
    # time each cue by its share of words
    nw = [len(c.split()) for c in cues]; tot = sum(nw); k = 0
    for c, n in zip(cues, nw):
        a = ws[min(k, len(ws) - 1)][1]; b = ws[min(k + n, len(ws)) - 1][2]; k += n
        subs.append({'id': f'{lid}_{len(subs)}', 'line': lid, 'text': c, 't0': round(t + max(a, 0) - 0.15, 3), 't1': round(t + b + 0.35, 3)})
# make every cue last ≥ max(1.8 s, its speech + 0.6 s), without overlapping the next cue
for i, s in enumerate(subs):
    nxt = subs[i + 1]['t0'] - 0.04 if i + 1 < len(subs) else END
    s['t1'] = round(min(max(s['t1'], s['t0'] + 1.8), nxt), 3)
json.dump({'end': END, 'vo': VO, 'dur': dur, 'subs': subs, 'words': W}, open(os.path.join(HERE, 'timeline.json'), 'w'), indent=1)
for s in subs: print(f"{s['t0']:6.2f}–{s['t1']:6.2f}  {s['text']}")

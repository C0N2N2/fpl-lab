"""Sound for \"Tulip Mania\": narration (Kokoro bm_george) + a baroque score (harpsichord, recorder, strings, organ) + paper foley.

    $LIB/.venv/bin/python mix.py [out.wav]

Near-silences 46.9–48.2 s (before Haarlem) and 71.8–72.9 s (before the virus)."""
import json, os, sys
import numpy as np, soundfile as sf, soxr
LIB = os.environ.get('LIB') or '/root/lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit, click, whoosh, t_

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
FILM = float(TL['end'])
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', 'mix.wav')
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
NF = int((FILM + 1.0) * SR)
rng = np.random.default_rng(17)
BEAT = 60 / 104; BAR = 4 * 60 / 104
SIL = [(46.9, 48.2), (71.8, 72.9)]

def stereo(n): return np.zeros((n, 2))
def pan_st(x, pan):
    th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], 1)
def place(buf, st, t):
    i0 = int(t * SR); n = min(len(st), len(buf) - i0)
    if n > 0: buf[i0:i0 + n] += st[:n]
def glide(d, f0, f1, harm=(1.0, 0.25, 0.08)):
    n = int(d * SR); f = np.geomspace(f0, f1, n); ph = np.cumsum(f) / SR * 2 * np.pi
    return sum(a * np.sin(ph * (i + 1)) for i, a in enumerate(harm))
def fadeio(x, a=0.01, b=0.05):
    n = len(x); e = np.ones(n); ia, ib = max(1, int(a * SR)), max(1, int(b * SR))
    e[:ia] = np.linspace(0, 1, ia); e[-ib:] = np.minimum(e[-ib:], np.linspace(1, 0, ib)); return x * e

# ---------------- foley ----------------
fol = stereo(NF)
for e in EV:
    t, ty, d = e['t'], e['type'], e.get('d', 0.3); n = int(max(d, .05) * SR)
    if ty == 'tear':
        x = rng.standard_normal(n); crack = (rng.random(n) < 0.004) * rng.standard_normal(n) * 6
        y = bp(x, 1500, 7000) * (0.4 + 0.6 * np.abs(np.sin(np.linspace(0, 40, n)))) + bp(crack, 800, 5000)
        place(fol, pan_st(y * np.sin(np.linspace(0, np.pi, n)) ** .6 * 0.045, np.linspace(.6, -.6, n)), t)
    elif ty == 'thud':
        add(fol, lp(click(pitch=0.3 if e.get('big') else 0.45, v=1), 400) * (0.24 if e.get('big') else 0.16), t, 1.0, 0)
    elif ty == 'creak':
        add(fol, lp(glide(d, 170, 120, (1, .6, .4, .3)), 1500) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 0.03, t, 1.0, 0)
    elif ty == 'coins':
        for k in range(e.get('n', 10)):
            tt = t + d * rng.random(); f0 = 2600 + rng.random() * 2600
            x = sum(a * np.sin(2 * np.pi * f0 * m * t_(0.35)) for m, a in [(1, 1), (2.76, .5), (5.4, .25)]) * np.exp(-t_(0.35) / (0.05 + rng.random() * .08))
            add(fol, x * 0.03, tt, 1.0, rng.uniform(-.7, .7))
    elif ty == 'scratch':       # a red pencil crossing out
        for k in range(2): add(fol, bp(rng.standard_normal(int(.18 * SR)), 1500, 6000) * np.sin(np.linspace(0, np.pi, int(.18 * SR))) * 0.06, t + k * .2, 1.0, .2)
    elif ty == 'ting':
        x = sum(a * np.sin(2 * np.pi * f * t_(1.2)) for f, a in [(3520, 1), (5280, .4), (7040, .2)]) * np.exp(-t_(1.2) / .3); add(fol, x * 0.03, t, 1.0, .4)
    elif ty == 'bloom':         # a petal unfolding: soft paper rustle + a rising tone
        x = bp(rng.standard_normal(n), 2000, 7000) * np.sin(np.linspace(0, np.pi, n)) ** 2; add(fol, x * 0.035, t, 1.0, 0); add(fol, fadeio(glide(d, 660, 990, (1, .2))) * 0.012, t, 1.0, 0)
    elif ty == 'wind':
        x = bp(rng.standard_normal(n), 250 if e.get('cold') else 400, 1600); sw = .5 + .5 * np.sin(np.linspace(0, 6, n)) ** 2
        env = np.minimum(1, np.minimum(np.linspace(0, 5, n), np.linspace(5, 0, n))); place(fol, np.stack([x * sw * env * .03, np.roll(x, 700) * sw * env * .03], 1), t)
    elif ty == 'pop':
        for k in range(e.get('n', 1)): add(fol, bp(click(pitch=1.0, v=1), 400, 4000) * 0.06, t + k * .07, 1.0, -.4 + .2 * k)
    elif ty == 'room':          # a tavern: murmur, a mug set down now and then
        x = bp(rng.standard_normal(n), 200, 1200) * (0.6 + 0.4 * np.sin(np.linspace(0, 13, n)) ** 2); place(fol, np.stack([x * .012, np.roll(x, 1100) * .012], 1), t)
        for k in range(4): add(fol, lp(click(pitch=0.6, v=1), 900) * 0.05, t + 1 + k * 1.9, 1.0, -.4 + .25 * k)
    elif ty == 'paper':
        x = bp(rng.standard_normal(n), 1500, 7000) * np.sin(np.linspace(0, np.pi, n)) ** 1.5; add(fol, x * 0.045, t, 1.0, .1)
    elif ty == 'shimmer':
        for k in range(10): add(fol, np.sin(2 * np.pi * (2093 * 2 ** (k % 5 / 12 * 3)) * t_(0.8)) * np.exp(-t_(0.8) / .3) * 0.009, t + k * d / 10, 1.0, np.sin(k) * .6)
    elif ty == 'gavel':
        add(fol, lp(click(pitch=0.5, v=1), 1200) * (0.08 if e.get('soft') else 0.16), t, 1.0, 0); add(fol, lp(click(pitch=0.5, v=1), 1200) * (0.05 if e.get('soft') else 0.1), t + .18, 1.0, 0)
    elif ty == 'fall':
        add(fol, fadeio(glide(d, 880, 160, (1, .3, .1))) * 0.022, t, 1.0, -.2)
    elif ty == 'rip':
        x = rng.standard_normal(int(.5 * SR)); y = bp(x, 1200, 7000) * (0.5 + 0.5 * np.abs(np.sin(np.linspace(0, 30, len(x))))) * np.sin(np.linspace(0, np.pi, len(x))) ** .5; add(fol, y * 0.07, t, 1.0, .2)
    elif ty == 'droop':
        add(fol, fadeio(glide(d, 520, 330, (1, .3))) * 0.012, t, 1.0, 0)

# ---------------- score: 104 bpm, G minor / B-flat major; baroque ----------------
ev = []
def arp(t0, bars, chords, vel=.3, inst='harpsichord', step=None):
    step = step or BEAT / 2
    for b in range(bars):
        ch = chords[b % len(chords)]; pat = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[2] + 12, ch[1]]
        for i in range(int(BAR / step)): ev.append((t0 + b * BAR + i * step, inst, pat[i % 8], step * 1.6, vel + .04 * (i % 4 == 0), .15 * (1 if i % 2 else -1), .45))
def bassline(t0, bars, roots, inst='cellos_pizz', vel=.45):
    for b in range(bars):
        r = roots[b % len(roots)]
        for i, iv in enumerate([0, 7, 12, 7]): ev.append((t0 + b * BAR + i * BEAT, inst, r + iv, BEAT * .8, vel - .05 * (i % 2), -.1, .6))
def melody(t0, notes, inst='recorder', vel=.32):
    for o, p, d in notes: ev.append((t0 + o * BEAT, inst, p, d * BEAT, vel, -.2, .45))
Gm, Bb, F, Eb, D, Cm = [55, 62, 67], [58, 65, 70], [53, 60, 65], [51, 58, 63], [50, 57, 62], [48, 55, 60]
THEME = [(0, 74, 1), (1, 72, 1), (2, 70, 1.5), (3.5, 69, .5), (4, 70, 1), (5, 72, 1), (6, 74, 2)]
# hook → Ottoman (0–16): harpsichord and recorder, gentle
arp(0.3, 6, [Bb, F, Gm, Eb], .26); bassline(2.6, 5, [34, 41, 43, 39], vel=.36); melody(0.6, THEME, vel=.28); melody(0.6 + 2 * BAR, THEME, 'oboe', .26)
# flames (16–24): mystery, pizzicato strings
arp(16.0, 3, [Gm, D, Gm], .24); ev.append((20.7, 'violins', 74, 2.6, .18, .2, .3)); ev.append((20.7, 'violins', 70, 2.6, .16, -.2, .28))
# bet + tavern (24–34.6): a tavern dance
bassline(24.1, 5, [43, 38, 43, 41]); arp(24.1, 5, [Gm, D, Gm, F], .3); for_ = None
for k in range(5): melody(24.1 + k * BAR, [(0, 67, .5), (.5, 70, .5), (1, 74, 1), (2, 72, .5), (2.5, 70, .5), (3, 69, 1)], 'violins_spic', .3)
# doubled (34.6–41): rising, faster, a frenzy
for i in range(24): ev.append((34.8 + i * BEAT / 2, 'violins_spic', 62 + i // 2, BEAT * .4, .26 + i * .006, .2, .45))
arp(34.8, 3, [Gm, Bb, D], .3, step=BEAT / 4); bassline(34.8, 3, [43, 46, 38], vel=.5)
# Semper Augustus (41–46.9): held, shining
ev.append((41.2, 'violins', 74, 5.4, .2, .2, .3)); ev.append((41.2, 'violins', 70, 5.4, .18, -.2, .28)); ev.append((41.2, 'cellos', 46, 5.4, .2, 0, .3))
for i, p in enumerate([86, 82, 79, 86]): ev.append((43.3 + i * .3, 'glockenspiel', p, 1.2, .2, .3, .3))
# Haarlem (48.2–55): cold, a lone cello and sparse harpsichord
ev.append((48.3, 'cellos', 43, 6.4, .24, 0, .35))
for i, p in enumerate([67, 62, 70, 67, 62]): ev.append((48.8 + i * 1.2, 'harpsichord', p, 1.0, .24, .2, .4))
# crash (55–63): falling strings, a collapse
for i in range(16): ev.append((55.3 + i * BEAT / 2, 'violins_spic', 82 - i, BEAT * .4, .3, .2, .45))
for p in [43, 49, 55, 61]: ev.append((57.96, 'harpsichord', p, 1.6, .5, 0, .5))
ev.append((57.96, 'cellos', 31, 4.6, .3, 0, .4)); bassline(59.2, 2, [31, 31], vel=.4)
# trust (63–71.8): soft organ, a minor recorder line
ev.append((63.2, 'organ_soft', 55, 8.4, .2, 0, .3)); ev.append((63.2, 'organ_soft', 62, 8.4, .18, 0, .28)); ev.append((63.2, 'organ_soft', 70, 8.4, .16, 0, .26))
melody(63.6, [(0, 74, 1.5), (1.5, 72, .5), (2, 70, 1), (3, 69, 1), (4, 67, 3)], 'recorder', .26)
# virus (72.9–78.3): a strange shimmer
ev.append((72.95, 'violins_trem', 79, 5.0, .14, .3, .25)); ev.append((72.95, 'violins_trem', 80, 5.0, .12, -.3, .22))
for i in range(8): ev.append((74.5 + i * .4, 'glockenspiel', [91, 90, 86, 85][i % 4], .8, .18, .3 * (1 if i % 2 else -1), .3))
# sick (78.4–85.3): a harpsichord lament
arp(78.4, 3, [Gm, Cm, D], .22, step=BEAT); ev.append((78.4, 'cellos', 43, 6.6, .18, 0, .28))
# end (85.5–95): the theme, resolving in B-flat major
arp(85.6, 4, [Bb, Eb, F, Bb], .24); bassline(85.6, 4, [34, 39, 41, 34], vel=.34); melody(85.6, THEME, 'recorder', .28)
ev.append((91.2, 'organ_soft', 58, 3.6, .16, 0, .26)); ev.append((91.2, 'organ_soft', 65, 3.6, .14, 0, .24)); ev.append((90.4, 'glockenspiel', 94, 1.6, .22, .2, .3))
S.seed(8)
music = S.render(ev, dur=FILM + 1.0, master=False)[:NF]
music = S.room(music, size=0.4, mix=0.2)
tt = np.arange(NF) / SR
for a, b in SIL: music *= (1 - 0.85 * np.clip(np.minimum((tt - a) / .3, (b - tt) / .3), 0, 1))[:, None]
music *= np.clip((FILM - tt) / 1.5, 0, 1)[:, None] ** 1.2
def dip(x): return x - bp(x, 300, 4000, 2) * 0.44
music = np.stack([dip(music[:, 0]), dip(music[:, 1])], 1)

# ---------------- narration ----------------
vo = np.zeros(NF)
for lid, t0 in TL['vo'].items():
    x, sr = sf.read(os.path.join(HERE, 'voice', lid + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 90); x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.08
    x = compress(x, thr=0.12, ratio=3.0)
    i0 = int(t0 * SR); vo[i0:i0 + len(x)] += x[:NF - i0]
env = np.abs(vo); k = int(0.15 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
speaking = env > 0.01
duck = 1 - 0.37 * np.clip(np.convolve(speaking.astype(float), np.ones(int(0.3 * SR)) / int(0.3 * SR), 'same'), 0, 1)
bed = (music * 0.9 + fol) * duck[:, None]
rv = np.sqrt(np.mean(vo[speaking] ** 2)); rb = np.sqrt(np.mean(np.mean(bed[speaking] ** 2, 1)))
bed *= (rv / 10 ** (10 / 20)) / max(rb, 1e-9)
film = bed + np.stack([vo, vo], 1) * 0.98
mix = film[:int(FILM * SR)].copy()
fo = int(0.4 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix = np.stack([limit(mix[:, 0]), limit(mix[:, 1])], 1)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sf.write(OUT, mix.astype(np.float32), SR)
names = sorted({(e['inst'] if isinstance(e, dict) else e[1]) for e in ev})
open(os.path.join(HERE, 'out', 'instruments.txt'), 'w').write(str(S.credits(names)))
print(os.path.basename(OUT), f'{len(mix) / SR:.2f}s', 'instruments:', ', '.join(names))

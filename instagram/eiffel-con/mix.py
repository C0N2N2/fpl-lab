"""Sound for \"The Man Who Sold the Eiffel Tower\": narration (Kokoro bm_george) + a 1920s heist score (jazz bass, clarinet, accordion, upright piano, snare taps) + paper foley.

    $LIB/.venv/bin/python mix.py [out.wav]

Near-silences 51.2–52.4 s (the doubts) and 72.7–74.2 s (before he comes back)."""
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
BEAT = 60 / 112; BAR = 4 * 60 / 112
SIL = [(51.2, 52.4), (72.7, 74.2)]

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
    elif ty == 'stamp':         # a rubber stamp: whoosh down, a thick wooden thump
        add(fol, lp(whoosh(.2, 1.0), 1500) * 0.04, t - .2, 1.0, 0); add(fol, lp(click(pitch=0.35, v=1), 500) * 0.22, t, 1.0, 0); add(fol, bp(click(pitch=0.8, v=1), 400, 3000) * 0.08, t + .01, 1.0, 0)
    elif ty == 'steps':
        k = 0
        while k * .28 < d: add(fol, lp(click(pitch=0.55 + .1 * (k % 2), v=1), 1400) * 0.07, t + k * .28, 1.0, -.2 + .1 * (k % 2)); k += 1
    elif ty == 'clank':
        x = sum(a * np.sin(2 * np.pi * f * t_(0.6)) for f, a in [(1240, 1), (2970, .5), (4410, .3)]) * np.exp(-t_(0.6) / 0.08); add(fol, x * 0.05, t, 1.0, .4)
    elif ty == 'paper':
        x = bp(rng.standard_normal(n), 1500, 7000) * np.sin(np.linspace(0, np.pi, n)) ** 1.5; add(fol, x * 0.05, t, 1.0, .1)
    elif ty == 'creak':
        add(fol, lp(glide(d, 170, 120, (1, .6, .4, .3)), 1500) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 0.03, t, 1.0, 0)
    elif ty == 'whoosh':
        add(fol, hp(whoosh(d, 1.0), 900) * 0.05, t, 1.0, rng.uniform(-.5, .5))
    elif ty == 'thud':
        add(fol, lp(click(pitch=0.25, v=1), 260) * 0.25, t, 1.0, 0)
    elif ty == 'dream':
        for k in range(8): add(fol, np.sin(2 * np.pi * (1568 * 2 ** (k / 12 * 2)) * t_(0.7)) * np.exp(-t_(0.7) / .25) * 0.012, t + k * .09, 1.0, np.sin(k) * .5)
    elif ty == 'tick':          # the clock, getting faster
        tt = t; k = 0
        while tt < t + d: add(fol, hp(click(pitch=1.6 if k % 2 else 1.3, v=1), 2500) * 0.05, tt, 1.0, .5); tt += max(.18, .5 - k * .03); k += 1
    elif ty == 'slide':
        x = bp(rng.standard_normal(n), 900, 5000) * np.sin(np.linspace(0, np.pi, n)) ** 1.2; add(fol, x * 0.05, t, 1.0, .2)
    elif ty == 'notes':
        for k in range(int(d / .12)): add(fol, bp(rng.standard_normal(int(.08 * SR)), 2000, 8000) * np.exp(-t_(.08) / .02) * 0.05, t + k * .12, 1.0, rng.uniform(-.4, .4))
    elif ty == 'train':         # chuff-chuff and the rails
        k = 0
        while k * .26 < d: add(fol, lp(rng.standard_normal(int(.18 * SR)), 1200) * np.exp(-t_(.18) / .06) * (0.09 if k % 2 == 0 else 0.05), t + k * .26, 1.0, -.4 + .8 * k * .26 / d); k += 1
        add(fol, glide(1.2, 620, 600, (1, .5, .3)) * np.sin(np.linspace(0, np.pi, int(1.2 * SR))) * 0.015, t + .6, 1.0, 0)
    elif ty == 'whistle':       # a police whistle: trilled tone
        tt = t_(d); x = np.sin(2 * np.pi * 2900 * tt + 40 * np.sin(2 * np.pi * 28 * tt)) * np.minimum(1, np.minimum(tt / .03, (d - tt) / .1)); add(fol, x * 0.03, t, 1.0, .5)
    elif ty == 'bars':
        x = sum(a * np.sin(2 * np.pi * f * t_(1.4)) for f, a in [(180, 1), (420, .6), (930, .3)]) * np.exp(-t_(1.4) / .35); add(fol, x * 0.06, t, 1.0, 0); add(fol, lp(click(pitch=0.3, v=1), 400) * 0.2, t, 1.0, 0)
    elif ty == 'press':         # a printing press: rhythmic clanks
        for k in range(int(d / .3)): add(fol, bp(click(pitch=0.7, v=1), 300, 3000) * 0.07, t + k * .3, 1.0, -.3); add(fol, hp(click(pitch=1.4, v=1), 2000) * 0.03, t + k * .3 + .15, 1.0, -.3)

# ---------------- score: 112 bpm, D minor; a sly 1920s heist ----------------
ev = []
def walk(t0, bars, roots, vel=.5):                         # walking bass, one root per bar
    for b in range(bars):
        r = roots[b % len(roots)]
        for i, iv in enumerate([0, 3, 5, 7] if b % 2 == 0 else [7, 5, 3, 2]): ev.append((t0 + b * BAR + i * BEAT, 'jazz_bass', r + iv, BEAT * .9, vel - .06 * (i % 2), -.05, .85))
def taps(t0, bars, vel=.22):
    for b in range(bars):
        for i in range(4): ev.append({'t': t0 + b * BAR + i * BEAT, 'inst': 'snare2', 'pitch': 60, 'dur': .2, 'vel': vel * (1.3 if i % 2 else .8), 'pan': .25, 'var': 'taps'})
        ev.append({'t': t0 + b * BAR + 1.5 * BEAT, 'inst': 'hihat', 'pitch': 60, 'dur': .2, 'vel': vel * .8, 'pan': .35, 'var': 'closed'})
def sly(t0, vel=.36):                                       # the clarinet's sneaky theme (2 bars)
    for o, p, d in [(0, 62, .5), (.5, 65, .5), (1, 69, .5), (1.5, 68, .5), (2, 67, 1), (3.5, 65, .5), (4, 62, .5), (4.5, 61, .5), (5, 62, 1.5)]: ev.append((t0 + o * BEAT, 'clarinet_stac', p, d * BEAT, vel, -.25, .55))
def comp(t0, bars, chords, vel=.24):                       # upright piano off-beat chords
    for b in range(bars):
        ch = chords[b % len(chords)]
        for i in (1, 3):
            for p in ch: ev.append((t0 + b * BAR + i * BEAT, 'upright', p, BEAT * .6, vel, .2, .45))
def acc(t0, dur, ch, vel=.22):
    for p in ch: ev.append((t0, 'accordion', p, dur, vel, .1, .35))
Dm, Gm, A7, Bb, F, D = [62, 65, 69], [62, 67, 70], [61, 64, 67], [62, 65, 70], [60, 65, 69], [62, 66, 69]
# hook (0–8): an accordion chord, the sly theme, hits on the stamps
acc(0.0, 2.4, [50, 57, 62], .2); sly(0.6, .3)
for st in (2.52, 6.42): ev.append((st, 'upright', 38, 1.2, .5, 0, .6)); ev.append((st, 'upright', 50, 1.2, .4, 0, .5))
acc(4.4, 3.4, [55, 58, 62], .2)
# Lustig → the meeting (8–40.5): the heist groove
G = 8.0; nb = int((40.4 - G) / BAR)
walk(G, nb, [38, 43, 45, 38]); taps(G + BAR, nb - 1); comp(G + 2 * BAR, nb - 2, [Dm, Gm, A7, Dm])
for k in range(0, nb - 2, 4): sly(G + (k + 2) * BAR, .32)
ev.append((36.26, 'upright', 26, 1.6, .55, 0, .6)); ev.append((36.26, 'upright', 38, 1.6, .45, 0, .5))
# Poisson's dream (40.5–47.6): warm accordion, a twinkle
acc(40.6, 3.6, [53, 57, 60], .2); acc(44.4, 3.2, [58, 62, 65], .24)
for i, p in enumerate([77, 81, 84, 89]): ev.append((44.44 + i * .1, 'glockenspiel', p, 1.0, .22, .3, .3))
# doubts (47.6–51.2): bass alone, then the near-silence
for i in range(7): ev.append((47.7 + i * BEAT, 'jazz_bass', [38, 38, 39, 38][i % 4], BEAT * .8, .42, 0, .8))
ev.append((47.7, 'accordion', 51, 3.4, .14, 0, .25))
# the bribe (52.4–62.7): the groove returns, quieter, sly theme low
G2 = 52.4; walk(G2, 5, [38, 43, 45, 38], .44); taps(G2, 5, .18); sly(G2 + BAR, .28); comp(G2 + 2 * BAR, 3, [Gm, A7, Dm], .2)
acc(57.98, 2.4, [50, 54, 57], .22)
# money (62.7–66): piano stabs on each pile
for st in (63.46, 65.06): ev.append((st, 'upright', 62, .6, .5, .2, .5)); ev.append((st, 'upright', 66, .6, .45, .2, .5))
# train (66–69.3): a rolling bass ostinato
for i in range(14): ev.append((66.05 + i * BEAT / 2, 'jazz_bass', [38, 45][i % 2], BEAT * .45, .4, 0, .8))
# police (69.3–72.7): a sad accordion
acc(69.4, 3.2, [50, 53, 57], .18)
# again (74.2–81.7): the theme returns, a run up as he slips away
G3 = 74.2; walk(G3, 3, [38, 43, 45], .46); taps(G3, 3, .2); sly(G3 + .2, .32)
for i, p in enumerate([62, 64, 65, 67, 69, 71, 73, 74]): ev.append((80.12 + i * .07, 'clarinet_stac', p, .15, .34, -.2, .5))
# America (81.7–86.6): low piano, the bars
ev.append((83.0, 'upright', 26, 2.0, .55, 0, .6)); ev.append({'t': 83.0, 'inst': 'gran_cassa', 'pitch': 60, 'dur': 1.5, 'vel': .5, 'pan': 0, 'var': 'hit'})
walk(83.6, 1, [38], .38)
# end (86.6–94): an accordion waltz in D major
for b in range(5):
    t0 = 86.7 + b * 3 * BEAT * 1.1
    ev.append((t0, 'jazz_bass', [38, 45, 38, 45, 38][b], BEAT, .4, 0, .8))
    for i in (1, 2): acc(t0 + i * BEAT * 1.1, BEAT * .9, [D, [57, 61, 64], D, [55, 59, 62], D][b], .18)
for i, p in enumerate([74, 78, 81, 86]): ev.append((89.14 + i * .12, 'glockenspiel', p, 1.4, .22, .3, .3))
ev.append((90.6, 'accordion', 50, 3.0, .16, 0, .25)); ev.append((90.6, 'accordion', 57, 3.0, .14, 0, .25)); ev.append((90.6, 'accordion', 62, 3.0, .14, 0, .25))
S.seed(6)
music = S.render(ev, dur=FILM + 1.0, master=False)[:NF]
music = S.room(music, size=0.3, mix=0.15)
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

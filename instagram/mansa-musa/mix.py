"""Sound for \"The King Who Broke an Economy\": narration (Kokoro bm_george) + a kora-like score (harp, marimba, hand drum, shaker) + paper foley.

    $LIB/.venv/bin/python mix.py [out.wav]

Near-silences 44.9–46.0 s (after \"something strange happened\") and 62.7–63.6 s (before the map)."""
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
BEAT = 0.6; BAR = 2.4
SIL = [(44.9, 46.0), (62.7, 63.6)]

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
    if ty == 'tear':            # paper ripping across the frame
        x = rng.standard_normal(n); crack = (rng.random(n) < 0.004) * rng.standard_normal(n) * 6
        y = bp(x, 1500, 7000) * (0.4 + 0.6 * np.abs(np.sin(np.linspace(0, 40, n)))) + bp(crack, 800, 5000)
        place(fol, pan_st(y * np.sin(np.linspace(0, np.pi, n)) ** .6 * 0.05, np.linspace(.6, -.6, n)), t)
    elif ty == 'coins':
        for k in range(e.get('n', 10)):
            tt = t + d * rng.random(); f0 = 2600 + rng.random() * 2600
            x = sum(a * np.sin(2 * np.pi * f0 * m * t_(0.35)) for m, a in [(1, 1), (2.76, .5), (5.4, .25)]) * np.exp(-t_(0.35) / (0.05 + rng.random() * .08))
            add(fol, x * 0.03, tt, 1.0, rng.uniform(-.7, .7))
    elif ty == 'thump':
        add(fol, lp(click(pitch=0.3, v=1), 260) * 0.2, t, 1.0, 0); add(fol, lp(whoosh(.5, 1.0), 900) * 0.04, t - .3, 1.0, 0)
    elif ty == 'sparkle':
        for k in range(12): add(fol, np.sin(2 * np.pi * (3000 + k * 220) * t_(0.4)) * np.exp(-t_(0.4) / .1) * 0.012, t + k * d / 12, 1.0, np.sin(k) * .6)
    elif ty == 'wind':
        x = bp(rng.standard_normal(n), 300, 1800); sw = .5 + .5 * np.sin(np.linspace(0, 7, n)) ** 2
        env = np.minimum(1, np.minimum(np.linspace(0, 6, n), np.linspace(6, 0, n))); place(fol, np.stack([x * sw * env * .03, np.roll(x, 900) * sw * env * .03], 1), t)
    elif ty == 'step':          # soft camel feet on sand
        add(fol, lp(rng.standard_normal(int(.12 * SR)), 500) * np.exp(-t_(.12) / .03) * 0.05 * e.get('v', .6), t, 1.0, rng.uniform(-.3, .3))
    elif ty == 'hush':
        add(fol, np.sin(2 * np.pi * 55 * t_(d)) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 0.02, t, 1.0, 0)
    elif ty == 'creak':
        add(fol, lp(glide(d, 180, 120, (1, .6, .4, .3)), 1500) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 0.03, t, 1.0, 0)
    elif ty == 'slide':
        x = bp(rng.standard_normal(n), 1200, 6000) * np.sin(np.linspace(0, np.pi, n)) ** 1.2; add(fol, x * 0.05, t, 1.0, -.3)
    elif ty == 'fall':
        add(fol, fadeio(glide(d, 880, 220, (1, .3, .1))) * 0.02, t, 1.0, -.2)
    elif ty == 'page':
        x = hp(rng.standard_normal(int(.09 * SR)), 1800) * np.exp(-t_(.09) / .025); add(fol, x * 0.05, t, 1.0, .3)
    elif ty == 'rumble':
        add(fol, lp(rng.standard_normal(n), 120) * np.sin(np.linspace(0, np.pi, n)) * 0.12, t, 1.0, 0)
    elif ty == 'pen':
        x = bp(rng.standard_normal(n), 2500, 8000) * (0.5 + 0.5 * np.abs(np.sin(np.linspace(0, 60, n)))); add(fol, x * 0.018, t, 1.0, .2)
    elif ty == 'stamp':
        add(fol, lp(click(pitch=0.35, v=1), 500) * 0.2, t, 1.0, .3); add(fol, hp(click(pitch=1.0, v=1), 1200) * 0.06, t, 1.0, .3)

# ---------------- score: 100 bpm, D dorian; harp as kora, marimba as balafon ----------------
ev = []
def kora(t0, root, bars, vel=.34, dens=2):
    pat = [0, 7, 12, 10, 7, 14, 12, 7]
    for b in range(bars):
        for i in range(8 if dens == 2 else 4):
            st = BEAT / 2 if dens == 2 else BEAT
            ev.append((t0 + b * BAR + i * st, 'harp', root + pat[(i + b) % 8] + 12, 0.8, vel + .04 * (i % 2 == 0), (-.3 if i % 2 else .3), 0.55))
def bass(t0, roots, vel=.5):
    for b, r in enumerate(roots): ev.append((t0 + b * BAR, 'marimba', r, 1.0, vel, 0, 0.7)); ev.append((t0 + b * BAR + 1.5 * BEAT, 'marimba', r + 7, .6, vel - .1, 0, .6))
def drum(t0, bars, vel=.5):
    for b in range(bars):
        for i, (o, v) in enumerate([(0, 1), (1.5, .6), (2, .8), (3, .6), (3.5, .5)]): ev.append({'t': t0 + b * BAR + o * BEAT, 'inst': 'frame_drum', 'pitch': 60, 'dur': .5, 'vel': vel * v, 'pan': -.1, 'var': 'hand' if i else 'large'})
        for i in range(8): ev.append({'t': t0 + b * BAR + i * BEAT / 2, 'inst': 'shaker', 'pitch': 60, 'dur': .2, 'vel': .25 + .1 * (i % 2 == 0), 'pan': .3})
D, F, G, A, C = 50, 53, 55, 57, 48
# hook (0–9.4): sparse kora, a low pad; coins at 7.8 get a bright run
ev.append((0.0, 'vibraphone_bowed', 50, 9.0, .18, 0, .22)); kora(0.6, D, 3, .26, 1)
for i, p in enumerate([74, 77, 81, 84, 86]): ev.append((7.84 + i * .07, 'glockenspiel', p, 1.2, .26, .3, .3))
# Mali + gold (9.4–23.4): full kora with balafon bass
kora(9.6, D, 6, .3); bass(9.6, [D - 12, C - 12, F - 12, D - 12, G - 12, A - 12])
# the Sahara (23.4–35): the caravan groove
kora(23.6, D, 5, .3); bass(23.6, [D - 12, F - 12, C - 12, D - 12, A - 12]); drum(23.6, 5, .45)
# Cairo giving (35–42.2): bright, a run on each throw
kora(35.2, F, 3, .3); bass(35.2, [F - 12, C - 12, G - 12])
for th in [36.5, 37.86, 38.94, 39.84]: ev.append((th + .2, 'kalimba', 74, .6, .4, .4, .4))
# strange (42.2–46): only the pad, then near-silence
ev.append((42.3, 'vibraphone_bowed', 50, 2.6, .2, 0, .24)); ev.append((42.3, 'vibraphone_bowed', 56, 2.6, .16, 0, .2))
# cheap (46–58): marimba ticking like a clock, kora returns minor
for i in range(19): ev.append((46.0 + i * BEAT, 'marimba', [62, 57][i % 2], .4, .3, .2, .4))
kora(50.8, D, 3, .26, 1); bass(50.8, [D - 12, A - 12, D - 12])
# shook (58–62.7): a low drum hit and the pad
ev.append({'t': 59.48, 'inst': 'frame_drum', 'pitch': 60, 'dur': 1.0, 'vel': .8, 'pan': 0, 'var': 'large'})
ev.append((58.0, 'vibraphone_bowed', 45, 4.6, .2, 0, .24))
# map (63.6–75): the theme opens to F major
kora(63.6, F, 5, .3); bass(63.6, [F - 12, C - 12, D - 12, A - 12, F - 12])
for i, p in enumerate([53, 60, 65, 69, 72, 77]): ev.append((72.78 + i * .04, 'harp', p, 2.0, .4, -.2 + i * .08, .55))
# end (75–84): slow kora, bowed hold, last note
kora(75.2, D, 3, .24, 1); ev.append((75.2, 'vibraphone_bowed', 53, 8.0, .2, -.1, .26)); ev.append((75.2, 'vibraphone_bowed', 57, 8.0, .18, .1, .24))
ev.append((80.9, 'glockenspiel', 86, 1.8, .26, .2, .3))
S.seed(4)
music = S.render(ev, dur=FILM + 1.0, master=False)[:NF]
music = S.room(music, size=0.36, mix=0.18)
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

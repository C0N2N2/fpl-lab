"""Sound for Hidden Lines No. 001: narration + an original score (vibraphone, glockenspiel, harp, bass) + foley from events.json.

    $LIB/.venv/bin/python mix.py [out.wav]

96 bpm (bar 2.5 s), D minor turning to F major at the unlock. Two near-silences: 37.5–40.9 s (the grid hangs in the air)
and 62.2–63.5 s (after "no unlock"). Narration compressed, then set ~10 dB above the bed by RMS; −14 LUFS is done by mux.sh.
"""
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
BEAT = 0.625; BAR = 2.5
SIL = [(37.5, 40.9), (62.2, 63.5)]

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
    t, ty, pan, d = e['t'], e['type'], e.get('pan', 0), e.get('d', 0.3)
    n = int(max(d, 0.05) * SR)
    if ty == 'sweep':
        x = rng.standard_normal(n); fcs = np.geomspace(900, 5200, 8)[::(-1 if e.get('up') else 1)]; pos = np.linspace(0, 7, n); y = np.zeros(n)
        for k, f in enumerate(fcs): y += bp(x, f * 0.85, f * 1.18, 2) * np.clip(1 - np.abs(pos - k), 0, 1)
        place(fol, pan_st(y * np.sin(np.linspace(0, np.pi, n)) ** 0.7 * 0.08, np.linspace(pan, e.get('pan1', pan), n)), t)
    elif ty == 'type':
        for k in range(int(d / 0.1)): add(fol, hp(click(pitch=1.4 + 0.2 * rng.random(), v=1), 2500) * 0.022, t + k * 0.1, 1.0, pan + 0.03 * k)
    elif ty == 'tick':
        add(fol, hp(click(pitch=1.5 if e.get('accent') else 1.25, v=1), 1500) * (0.07 if e.get('accent') else 0.055), t, 1.0, pan)
    elif ty == 'ping':
        add(fol, glide(1.2, 2093, 2093, (1.0, 0.0, 0.12)) * np.exp(-t_(1.2) / 0.32) * 0.035, t, 1.0, pan)
    elif ty == 'ruler':
        k = 0
        while k * 0.045 < d: add(fol, hp(click(pitch=1.7, v=1), 3000) * 0.018, t + k * 0.045, 1.0, pan + 0.3 * k * 0.045 / max(d, .1)); k += 1
    elif ty == 'swell':
        x = lp(rng.standard_normal(n + int(0.3 * SR)), 1600); x *= np.sin(np.linspace(0, np.pi, len(x))) ** 2
        add(fol, x * 0.035, t, 1.0, pan)
    elif ty == 'zip':
        x = glide(d, 520, 1560, (1.0, 0.3, 0.12)) * (0.4 + 0.6 * np.linspace(0, 1, n) ** 0.8)
        x = fadeio(x, 0.08, 0.05) + bp(rng.standard_normal(n), 2500, 6000) * 0.15 * np.linspace(0.3, 1, n)
        place(fol, pan_st(x * 0.026, np.linspace(pan, e.get('pan1', pan), n)), t)
    elif ty == 'flood':
        x = lp(rng.standard_normal(n + int(0.4 * SR)), 1800); x *= np.sin(np.linspace(0, np.pi, len(x))) ** 2
        add(fol, x * 0.05, t, 1.0, pan); add(fol, fadeio(glide(d, 660, 1320, (1, .2))) * 0.02, t, 1.0, pan)
    elif ty == 'flash':
        x = lp(rng.standard_normal(int(0.5 * SR)), 2400) * np.exp(-t_(0.5) / 0.12)
        add(fol, x * 0.05, t, 1.0, pan)
    elif ty == 'shutter':
        add(fol, hp(click(pitch=1.1, v=1), 1200) * 0.08, t, 1.0, pan); add(fol, hp(click(pitch=0.9, v=1), 900) * 0.06, t + 0.07, 1.0, pan)
    elif ty == 'glass':
        x = sum(a * np.sin(2 * np.pi * f * t_(1.0)) for f, a in [(2637, 1), (3951, .4), (5274, .2)]) * np.exp(-t_(1.0) / 0.25)
        add(fol, x * 0.02, t, 1.0, pan)
    elif ty == 'drain':
        add(fol, fadeio(glide(d, 990, 330, (1, .3, .1))) * 0.03, t, 1.0, pan)
    elif ty == 'dive':
        x = rng.standard_normal(n); ramp = np.linspace(0, 1, n) ** 2
        add(fol, (lp(x, 600) * (1 - ramp) + bp(x, 1500, 7000) * ramp) * ramp ** 0.6 * 0.035, t, 1.0, pan)
    elif ty == 'spray':           # thousands of dots land: a fizz of tiny ticks spreading in the stereo field
        k = int(d * (90 if e.get('small') else 160))
        for i in range(k):
            tt = t + d * (i / k) ** 0.7 + rng.random() * 0.02
            add(fol, hp(click(pitch=2.2 + rng.random() * 0.8, v=1), 5000) * (0.010 + 0.006 * rng.random()), tt, 1.0, rng.uniform(-0.8, 0.8))
        add(fol, fadeio(glide(0.6, 1320, 2640, (1, .2))) * 0.02, t, 1.0, 0)
    elif ty == 'orbit':
        w_ = lp(whoosh(d, 1.0), 1600) * 0.06; place(fol, pan_st(w_, np.linspace(pan, e.get('pan1', pan), len(w_))), t)
    elif ty == 'contour':
        k = 0
        while k * 0.09 < d: add(fol, hp(click(pitch=1.9, v=1), 3500) * 0.014, t + k * 0.09, 1.0, np.sin(k) * 0.4); k += 1
    elif ty == 'slide':
        w_ = lp(whoosh(d, 1.0), 1400) * 0.07; place(fol, pan_st(w_, np.linspace(pan, e.get('pan1', pan), len(w_))), t)
    elif ty == 'seat':
        add(fol, click(pitch=0.8, v=1.0) * 0.07, t, 1.0, pan); add(fol, lp(click(pitch=0.35, v=1.0), 600) * 0.09, t, 1.0, pan)
    elif ty == 'deny':            # locked: two low knocks
        for k in range(2): add(fol, lp(click(pitch=0.4, v=1), 700) * 0.14, t + k * 0.18, 1.0, pan)
    elif ty == 'unlock':          # shackle: metallic click + low knock + bright ding
        add(fol, hp(click(pitch=1.3, v=1), 1500) * 0.10, t, 1.0, pan); add(fol, lp(click(pitch=0.3, v=1), 400) * 0.16, t + 0.03, 1.0, pan)
        add(fol, glide(1.4, 2637, 2637, (1, 0, .1)) * np.exp(-t_(1.4) / 0.35) * 0.03, t + 0.08, 1.0, pan)
    elif ty == 'trace':
        x = fadeio(glide(d, 880, 1760, (1, .2, .1)), 0.05, 0.3) + bp(rng.standard_normal(n), 5000, 11000) * 0.2
        place(fol, pan_st(x * 0.02, np.sin(np.linspace(0, 2 * np.pi, n)) * 0.6), t)

# ---------------- score: 96 bpm, D minor → F major ----------------
ev = []
def bar(t0, ns, dens, vel=0.26, bass=True, glock=False):
    root, hi = ns[0], ns[1:] + [ns[1] + 12]
    if bass: ev.append((t0, 'jazz_bass', root, 0.9, 0.5, -0.05, 0.85)); ev.append((t0 + 2.5 * BEAT, 'jazz_bass', root + 7, 0.5, 0.4, -0.05, 0.7))
    if dens >= 1:
        pat = [0, 2, 1, 3] if dens == 1 else [0, 2, 3, 1, 2, 0, 3, 2]
        step = BEAT if dens == 1 else BEAT / 2
        for i, k in enumerate(pat): ev.append((t0 + i * step, 'vibraphone_hard', hi[k % len(hi)], 0.4, vel + 0.03 * (i % 2 == 0), 0.3 * (1 if i % 2 else -1), 0.45))
    if glock:
        for i in range(4): ev.append((t0 + BEAT / 2 + i * BEAT, 'glockenspiel', hi[[2, 0, 3, 1][i] % len(hi)] + 12, 0.3, 0.12, 0.45, 0.22))
Dm, Bb, F, C, Gm, A, Am = [38, 62, 65, 69, 74], [34, 62, 65, 70, 74], [41, 60, 65, 69, 72], [36, 60, 64, 67, 72], [43, 62, 67, 70, 74], [33, 61, 64, 69, 73], [45, 60, 64, 69, 72]
# hook: bowed pad + single mallet notes
ev.append((0.0, 'vibraphone_bowed', 50, 5.0, 0.24, 0.0, 0.28)); ev.append((0.0, 'vibraphone_bowed', 57, 5.0, 0.2, 0.1, 0.25))
for i, p in enumerate([74, 69, 65]): ev.append((0.6 + i * 0.625, 'vibraphone_hard', p, 0.8, 0.22, 0.2, 0.4))
ev.append((5.0, 'glockenspiel', 81, 1.5, 0.3, 0.2, 0.4))
bar(5.0, Dm, 1, 0.22, bass=False); bar(7.5, Bb, 1, 0.24)
# parts: mallet pulses + bass (10–22.5)
for b, ch in enumerate([Dm, Bb, F, C, Dm]): bar(10.0 + b * BAR, ch, 2 if b in (1, 3) else 1, 0.22, glock=(b == 4))
# flood + camera (22.5–32.5): glockenspiel climbing
for b, ch in enumerate([F, C, Dm, Bb]): bar(22.5 + b * BAR, ch, 2, 0.22, glock=True)
for i, p in enumerate([72, 74, 77, 79, 81, 84]): ev.append((24.6 + i * 0.12, 'glockenspiel', p, 0.5, 0.18 + 0.02 * i, 0.3, 0.3))
# fooled → fire (32.5–37.5): bass eighths rising, harp sweep on "fires"
for i in range(8): ev.append((32.5 + i * BEAT / 2, 'jazz_bass', [38, 38, 45, 38][i % 4], 0.25, 0.32 + 0.02 * i, -0.05, 0.6))
for i, p in enumerate([50, 57, 62, 65, 69, 74, 77, 81]): ev.append((34.94 + i * 0.03, 'harp', p, 2.2, 0.42, -0.3 + i * 0.08, 0.6))
ev.append((34.94, 'glockenspiel', 86, 1.5, 0.3, 0.3, 0.35))
# near-silence 1 (37.5–40.9): only a low bowed pad
ev.append((37.4, 'vibraphone_bowed', 38, 3.8, 0.2, 0.0, 0.22))
# the bend (41–56): first sound after the silence is a glockenspiel note, then a mallet ostinato
ev.append((41.0, 'glockenspiel', 81, 1.4, 0.32, 0.2, 0.36))
for b, ch in enumerate([Gm, Dm, Bb, F, Gm, A]): bar(41.25 + b * BAR, ch, 2 if b >= 1 else 1, 0.2, glock=(b in (2, 4)))
for i, p in enumerate([53, 57, 60, 65, 69, 72]): ev.append((52.9 + i * 0.03, 'harp', p, 1.8, 0.38, -0.2 + i * 0.08, 0.55))
# photo (56.25–62.2): bass + sparse mallet
bar(56.25, Dm, 1, 0.18); bar(58.75, Bb, 0, 0.18)
ev.append((60.56, 'vibraphone_hard', 61, 0.9, 0.3, 0.2, 0.4)); ev.append((60.74, 'vibraphone_hard', 57, 1.2, 0.26, 0.2, 0.4))
# near-silence 2 (62.2–63.5)
ev.append((62.2, 'vibraphone_bowed', 45, 1.6, 0.18, 0.0, 0.2))
# match → open (63.5–69): build, F major on the unlock
bar(63.6, Gm, 2, 0.2); bar(65.0, A, 2, 0.22, glock=True)
for i, p in enumerate([41, 48, 53, 57, 60, 65, 69, 72, 77]): ev.append((66.94 + i * 0.025, 'harp', p, 2.4, 0.45, -0.3 + i * 0.07, 0.65))
ev.append((66.94, 'glockenspiel', 84, 1.6, 0.38, 0.3, 0.38)); ev.append((66.94, 'contrabass_pizz', 29, 1.2, 0.6, 0.0, 0.8))
# ending (68–80): F → Bb → C → F, bowed hold under the title block
bar(68.0, F, 1, 0.2); bar(70.5, Bb, 1, 0.2); bar(73.0, C, 1, 0.2, glock=True)
ev.append((75.5, 'vibraphone', 65, 2.0, 0.34, 0.0, 0.4)); ev.append((75.5, 'contrabass_pizz', 29, 1.2, 0.5, 0.0, 0.7))
ev.append((75.5, 'vibraphone_bowed', 53, 4.4, 0.24, -0.1, 0.3)); ev.append((75.5, 'vibraphone_bowed', 60, 4.4, 0.22, 0.1, 0.28))
ev.append((76.6, 'glockenspiel', 89, 1.8, 0.28, 0.2, 0.3))
S.seed(5)
music = S.render(ev, dur=FILM + 1.0, master=False)[:NF]
music = S.room(music, size=0.32, mix=0.16)
tick = hp(click(pitch=2.0, v=1), 4000) * 0.010
for k in range(int(FILM / (BEAT / 4))):
    t = k * BEAT / 4
    if any(a < t < b for a, b in SIL) or t > 76.0: continue
    dense = 10 < t < 22 or 41 < t < 56
    if not dense and k % 4: continue
    add(music, tick * (1.0 if k % 4 == 0 else 0.5), t, 1.0, 0.5 if k % 2 else -0.5)
tt = np.arange(NF) / SR
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
names = sorted({e[1] for e in ev})
open(os.path.join(HERE, 'out', 'instruments.txt'), 'w').write(str(S.credits(names)))
print(os.path.basename(OUT), f'{len(mix) / SR:.2f}s', 'instruments:', ', '.join(names))

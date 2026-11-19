"""Sound for Hidden Lines No. 002 (noise cancelling): narration + score + paper foley + the train, which stops dead at the button.

    $LIB/.venv/bin/python mix.py [out.wav]

96 bpm. The train rumble fills 0–9.3 s and cuts at the button; near-silences 9.4–11.6 s and 41.8–43.2 s. Narration compressed, then set ~10 dB above the bed by RMS; −14 LUFS is done by mux.sh.
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
SIL = [(9.3, 11.6), (41.8, 43.2)]

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
def train(d, level, seed):
    r = np.random.default_rng(seed); n = int(d * SR); x = r.standard_normal(n)
    rum = lp(x, 180) * 3.0 + bp(x, 200, 900) * 0.8 + bp(x, 2000, 6000) * 0.12          # rumble, body, rail hiss
    tt = np.arange(n) / SR
    clack = np.zeros(n)
    for k, tc in enumerate(np.arange(0.31, d, 0.62)):                                  # wheel joints: clack-clack
        for o in (0, 0.11):
            i0 = int((tc + o) * SR); m = min(int(0.08 * SR), n - i0)
            if m > 0: clack[i0:i0 + m] += lp(r.standard_normal(m), 1200) * np.exp(-np.arange(m) / SR / 0.018) * 2.2
    sway = 0.85 + 0.15 * np.sin(2 * np.pi * 0.4 * tt)
    return (rum * sway + clack) * level
for e in EV:
    t, ty, pan, d = e['t'], e['type'], e.get('pan', 0), e.get('d', 0.3)
    n = int(max(d, 0.05) * SR)
    if ty == 'train':
        x = train(d, 0.06, 1); x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))     # cut dead at the button
        place(fol, np.stack([x, np.roll(x, 300)], 1), t)
    elif ty == 'trainsoft':     # after the dive back: the train is still there, but only as a faint hum through the tips
        x = lp(train(d, 0.012, 2), 300); env = np.ones(len(x)); fi = int(1.0 * SR); env[:fi] = np.linspace(0, 1, fi)
        env *= np.clip(np.linspace(1.4, -0.2, len(x)), 0, 1); place(fol, np.stack([x * env, x * env], 1), t)
    elif ty == 'click':
        add(fol, hp(click(pitch=1.4, v=1), 1500) * 0.09, t, 1.0, 0.1); add(fol, lp(click(pitch=0.5, v=1), 800) * 0.07, t + 0.02, 1.0, 0.1)
    elif ty == 'type':
        for k in range(int(d / 0.1)): add(fol, hp(click(pitch=1.4 + 0.2 * rng.random(), v=1), 2500) * 0.02, t + k * 0.1, 1.0, -0.4 + 0.03 * k)
    elif ty == 'iris':          # a card turning: a paper whoosh, low thud when it lands
        add(fol, hp(whoosh(d, 1.0), 700) * 0.06, t, 1.0, 0); add(fol, lp(click(pitch=0.3, v=1), 300) * 0.12, t + (d if not e.get('open') else 0), 1.0, 0)
    elif ty == 'card':          # one slice folding up: a dry card tap
        add(fol, bp(click(pitch=0.9 + 0.2 * rng.random(), v=1), 600, 4000) * 0.08 * e.get('v', 0.8), t, 1.0, rng.uniform(-0.4, 0.4))
    elif ty == 'slide':         # paper sliding on paper
        x = bp(rng.standard_normal(n), 1200, 6000) * np.sin(np.linspace(0, np.pi, n)) ** 1.2
        add(fol, x * 0.05, t, 1.0, pan)
    elif ty == 'tick':
        add(fol, hp(click(pitch=1.5 if e.get('accent') else 1.25, v=1), 1500) * (0.065 if e.get('accent') else 0.05), t, 1.0, 0.2)
    elif ty == 'zip':
        x = glide(d, 520, 1560, (1.0, 0.3, 0.12)) * (0.4 + 0.6 * np.linspace(0, 1, n) ** 0.8)
        add(fol, fadeio(x, 0.08, 0.05) * 0.024, t, 1.0, 0)
    elif ty == 'flip':          # the wave turning over: a glide down, then up
        x = np.concatenate([glide(d / 2, 880, 440, (1, .2)), glide(d / 2, 440, 880, (1, .2))]); add(fol, fadeio(x) * 0.022, t, 1.0, 0.3)
    elif ty == 'sum':           # two tones meeting and cancelling: a beating pair that thins to nothing
        tt = np.arange(n) / SR; x = (np.sin(2 * np.pi * 220 * tt) + np.sin(2 * np.pi * 220 * tt + np.pi * np.clip(tt / d, 0, 1))) * (1 - tt / d) ** 0.5
        add(fol, x * 0.03, t, 1.0, 0)
    elif ty == 'clink':
        x = sum(a * np.sin(2 * np.pi * f * t_(0.6)) for f, a in [(3136, 1), (4699, .6), (6272, .3)]) * np.exp(-t_(0.6) / 0.09)
        add(fol, x * 0.05, t, 1.0, 0.4)
    elif ty == 'flood':
        x = lp(rng.standard_normal(n + int(0.3 * SR)), 1600); x *= np.sin(np.linspace(0, np.pi, len(x))) ** 2; add(fol, x * 0.04, t, 1.0, 0.2)
    elif ty == 'brake':         # the train easing into the station, far away
        x = lp(glide(d, 300, 180, (1, .4, .2)), 900) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 0.006; add(fol, x, t, 1.0, 0)
    elif ty == 'ruler':
        k = 0
        while k * 0.045 < d: add(fol, hp(click(pitch=1.7, v=1), 3000) * 0.016, t + k * 0.045, 1.0, -0.3); k += 1

# ---------------- score: 96 bpm, A minor → C major at the bookend ----------------
ev = []
def bar(t0, ns, dens, vel=0.24, bass=True, glock=False):
    root, hi = ns[0], ns[1:] + [ns[1] + 12]
    if bass: ev.append((t0, 'jazz_bass', root, 0.9, 0.46, -0.05, 0.85)); ev.append((t0 + 2.5 * BEAT, 'jazz_bass', root + 7, 0.5, 0.38, -0.05, 0.7))
    pat = [0, 2, 1, 3] if dens == 1 else [0, 2, 3, 1, 2, 0, 3, 2]; step = BEAT if dens == 1 else BEAT / 2
    if dens: [ev.append((t0 + i * step, 'vibraphone_hard', hi[k % len(hi)], 0.4, vel + 0.03 * (i % 2 == 0), 0.3 * (1 if i % 2 else -1), 0.45)) for i, k in enumerate(pat)]
    if glock: [ev.append((t0 + BEAT / 2 + i * BEAT, 'glockenspiel', hi[[2, 0, 3, 1][i] % len(hi)] + 12, 0.3, 0.12, 0.45, 0.22)) for i in range(4)]
Am, F, C, G, Dm, E = [45, 60, 64, 69, 72], [41, 60, 65, 69, 72], [36, 60, 64, 67, 72], [43, 59, 62, 67, 71], [38, 62, 65, 69, 74], [40, 59, 64, 68, 71]
# under the train: only a low bowed pad, the train is the music
ev.append((0.0, 'vibraphone_bowed', 45, 9.3, 0.16, 0.0, 0.2))
# after the button: one glockenspiel note into the silence, then mallets
ev.append((11.6, 'glockenspiel', 76, 2.0, 0.3, 0.2, 0.4))
for b, ch in enumerate([Am, F, C, G]): bar(12.5 + b * BAR, ch, 1, 0.2, bass=b > 0)
# inside the earbud (19.3–41.8): ostinato, glock on the chip, harp on the cancel
for b, ch in enumerate([Am, F, Dm, E, Am, F, C, G, Am]): bar(20.0 + b * BAR, ch, 2 if b >= 2 else 1, 0.2, glock=b in (3, 6))
for i, p in enumerate([57, 64, 69, 72, 76, 81]): ev.append((40.7 + i * 0.03, 'harp', p, 2.4, 0.4, -0.2 + i * 0.08, 0.6))
ev.append((40.9, 'glockenspiel', 88, 1.6, 0.3, 0.3, 0.35))
# near-silence 2 (41.8–43.2)
ev.append((41.7, 'vibraphone_bowed', 57, 1.6, 0.16, 0.0, 0.2))
# inner mic + limits (43.2–58)
for b, ch in enumerate([Dm, Am, F, E, Am, Dm]): bar(43.2 + b * BAR, ch, 1 if b < 3 else 2, 0.19, glock=b == 4)
# bookend (58.7–76): C major, slower, bowed hold under the title block
for b, ch in enumerate([F, C, G, C]): bar(58.7 + b * BAR, ch, 1, 0.18)
for i, p in enumerate([48, 55, 60, 64, 67, 72, 76]): ev.append((66.8 + i * 0.03, 'harp', p, 2.4, 0.42, -0.3 + i * 0.08, 0.6))
ev.append((68.6, 'vibraphone', 64, 2.0, 0.32, 0.0, 0.4)); ev.append((68.6, 'contrabass_pizz', 36, 1.2, 0.5, 0.0, 0.7))
ev.append((68.6, 'vibraphone_bowed', 48, 6.0, 0.22, -0.1, 0.3)); ev.append((68.6, 'vibraphone_bowed', 55, 6.0, 0.2, 0.1, 0.28))
ev.append((70.0, 'glockenspiel', 84, 1.8, 0.26, 0.2, 0.3))
S.seed(9)
music = S.render(ev, dur=FILM + 1.0, master=False)[:NF]
music = S.room(music, size=0.32, mix=0.16)
tick = hp(click(pitch=2.0, v=1), 4000) * 0.009
for k in range(int(FILM / (BEAT / 4))):
    t = k * BEAT / 4
    if t < 12.5 or any(a < t < b for a, b in SIL) or t > 70.0: continue
    if not (20 < t < 41.8) and k % 4: continue
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

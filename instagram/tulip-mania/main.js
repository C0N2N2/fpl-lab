// "Tulip Mania" — Holland, 1637. Torn Paper Collage, vertical 1080×1920 for Instagram Reels.
// Scenes and timings come from scenes.json; every shape is a cached torn-paper sprite (paper.js, dutch.js).
import { sheet, draw, rect, circle, ellipse, band, profile, grad, caption, ragged, rng } from './paper.js';
import { clamp, lerp, seg, eio, eo, ei, ss, back, monotone } from '/core/lib.js';

await Promise.all([`700 20px "Fraunces"`, `800 20px "Fraunces"`, `italic 400 20px "Fraunces"`].map(f => document.fonts.load(f, 'AB'))); await document.fonts.ready;
const Z = await import('./dutch.js');
const { C } = Z;
const Q = new URLSearchParams(location.search), SUBS = Q.get('subs') !== '0';
const SC = await (await fetch('scenes.json')).json(), TL = await (await fetch('timeline.json')).json();
const [W, H] = SC.size, FILM = SC.end, SERIF = '"Fraunces", serif';
const S = Object.fromEntries(SC.scenes.map(s => [s.id, s]));
const cv = document.getElementById('c'), g = cv.getContext('2d');

// ---------- shared pieces ----------
const sky = s => sheet(rect(-200, -200, W + 400, H + 400), grad(s.sky.map((c, i) => [i / (s.sky.length - 1), c])), { rim: 0, shadow: 0, crumple: .8, grainK: .5 });
const flat = c => sheet(rect(-200, -200, W + 400, H + 400), c, { rim: 0, shadow: 0, crumple: 1, grainK: .6 });
const ground = (base, color, seed, kind = 'flat', amp = 30, w = W + 1600) => sheet(band(profile(kind, w, base, amp, seed).map(([x, y]) => [x - 800, y]), H + 400), color, { seed, rim: 4.5 });
function clouds(seed, n, ys, col = '#f6efe2', col2 = '#e9dcc8') { const r = rng(seed); return Array.from({ length: n }, (_, i) => { const w = 260 + r() * 420, h = 36 + r() * 36;
  return { s: sheet([...profile('hills', w, 0, h, seed + i, 10).map(([x, y]) => [x, y + h * .6]), [w + 40, h * .9], [-40, h * .9]], i % 2 ? col : col2, { seed: seed + i * 3, rim: 3.5, shadow: .12, crumple: .3 }), x: r() * (W + 600) - 300, y: ys[0] + r() * (ys[1] - ys[0]), v: 6 + r() * 10 }; }); }
const drawClouds = (cl, t) => cl.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y));

// tulip varieties
const TU = { red: Z.tulip(10, C.red), yellow: Z.tulip(20, C.yellow), pink: Z.tulip(30, C.pink), flame: Z.tulip(40, null, C.red2), flameY: Z.tulip(50, null, '#b23a6a'), semper: Z.tulip(60, null, '#a01e2a', 330) };
const PLAIN = [TU.red, TU.yellow, TU.pink];
const BULB = Z.bulb(7), MILL = Z.windmill(), SLIPS = Array.from({ length: 6 }, (_, i) => Z.slip(500 + i));
const TRADERS = [Z.trader(70, { coat: '#26211e' }), Z.trader(80, { coat: '#3a2a22', beard: true, skin: C.skin2 }), Z.trader(90, { coat: '#2b2a3a' }), Z.trader(100, { coat: '#3a3326', beard: true })];

// a balance scale (bulb vs house)
const scl = { post: sheet([[-14, 0], [14, 0], [10, -520], [-10, -520]], '#5a3a24', { seed: 1, rim: 3 }), base: sheet([[-170, 0], [170, 0], [130, -50], [-130, -50]], '#3e2a1c', { seed: 2, rim: 3 }), beam: sheet(rect(-330, -10, 660, 20), '#5a3a24', { seed: 3, rim: 3 }), pan: sheet([[-120, 0], [120, 0], [90, 40], [-90, 40]], '#a07a3a', { seed: 4, rim: 3 }) };
const HOUSE1 = Z.canalHouses(140, 211)[0].s;
const POST_LONG = sheet([[-14, 0], [14, 0], [10, -860], [-10, -860]], '#5a3a24', { seed: 5, rim: 3 });
function scale(t, cx, cy, tilt, left, right) {
  draw(g, scl.base, cx, cy + 860); draw(g, POST_LONG, cx, cy + 820);
  g.save(); g.translate(cx, cy); g.rotate(tilt); draw(g, scl.beam, 0, 0); g.restore();
  const L = [cx - Math.cos(tilt) * 300, cy - Math.sin(tilt) * 300], R = [cx + Math.cos(tilt) * 300, cy + Math.sin(tilt) * 300];
  for (const [p, fn] of [[L, left], [R, right]]) { g.save(); g.strokeStyle = '#3e2a1c'; g.lineWidth = 3; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - 100, p[1] + 220); g.moveTo(p[0], p[1]); g.lineTo(p[0] + 100, p[1] + 220); g.stroke(); g.restore(); draw(g, scl.pan, p[0], p[1] + 220); fn && fn(p[0], p[1] + 220); }
}

// interiors
const tavernWall = sheet(rect(-200, -200, W + 400, 1500), '#4a3324', { rim: 0, shadow: 0, crumple: 1, detail: gg => { gg.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -200; x < W + 200; x += 90) gg.fillRect(x, -200, 6, 1700); gg.fillStyle = '#2b1d14'; for (const y of [120, 520]) gg.fillRect(-200, y, W + 400, 46); } });
const winSnow = sheet(rect(0, 0, 300, 360), grad([[0, '#8aa0b8'], [1, '#d8e2ea']]), { seed: 13, rim: 3, detail: gg => { gg.fillStyle = '#f4f7fa'; gg.fillRect(0, 300, 300, 60); gg.fillStyle = '#2b1d14'; gg.fillRect(146, 0, 8, 360); gg.fillRect(0, 176, 300, 8); } });
const tTable = sheet([[-470, 0], [470, 0], [540, 230], [-540, 230]], grad([[0, '#6a4630'], [1, '#4a3022']]), { seed: 9, rim: 4 });
const mug = sheet([[-26, 0], [26, 0], [24, -70], [-24, -70]], '#8a7a5a', { seed: 14, rim: 2.5, detail: gg => { gg.fillStyle = '#efe6cf'; gg.fillRect(-24, -76, 48, 12); } });
const hallWall = sheet(rect(-200, -200, W + 400, 1500), '#5a5040', { rim: 0, shadow: 0, crumple: 1, detail: gg => { gg.fillStyle = 'rgba(255,240,200,.08)'; for (let x = -200; x < W + 200; x += 240) gg.fillRect(x, -200, 120, 1700); } });
const floorS = ground(1250, '#3a2c20', 15);
const CHAIRS = Array.from({ length: 9 }, (_, i) => Z.chair(600 + i));
const SOIL = sheet(rect(-460, 0, 920, 360), grad([[0, '#6a4630'], [1, '#3a2418']]), { seed: 16, rim: 4, detail: gg => { const r = rng(16); gg.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 160; i++) gg.fillRect(-460 + r() * 920, r() * 360, 3, 3); } });
const SNOWBAND = sheet(band(profile('flat', W + 1600, 0, 10, 17).map(([x, y]) => [x - 800, y]), 40), '#f2f5f7', { seed: 17, rim: 3 });

// labels, captions, stamps
const LABELS = new Map();
const tagS = text => { if (!LABELS.has(text)) { g.font = `700 30px ${SERIF}`; const m = g.measureText(text).width + text.length * 3.2;
  LABELS.set(text, sheet(rect(0, 0, m + 50, 60), '#efe6cf', { seed: text.length * 31, rim: 2.5, shadow: .35, detail: g2 => { g2.fillStyle = C.ink; g2.font = `700 30px ${SERIF}`; g2.letterSpacing = '3px'; g2.fillText(text, 25, 41); } })); } return LABELS.get(text); };
const X = (x, y, k = 1) => { g.save(); g.strokeStyle = '#c8302a'; g.lineWidth = 12 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 70 * k, y - 70 * k); g.lineTo(x + 70 * k, y + 70 * k); g.moveTo(x + 70 * k, y - 70 * k); g.lineTo(x - 70 * k, y + 70 * k); g.stroke(); g.restore(); };
function label(text, x, y, k = 1, rot = -.03, font = `800 52px ${SERIF}`) { const cp = caption(text, font, 900); draw(g, cp.s, x - cp.W / 2, y - cp.H / 2, k, rot, cp.W / 2, cp.H / 2); }

// ---------- camera ----------
const CAM = Object.fromEntries(SC.scenes.map(s => [s.id, [1, 2, 3].map(j => monotone(s.cam.map(k => [k[0], k[j]])))]));
const camOf = (s, t) => { const [x, y, z] = CAM[s.id].map(f => f(t)); return { x, y, z }; };
function P(c, d, fn) { g.save(); g.translate(W / 2, H / 2); g.scale(1 + (c.z - 1) * d, 1 + (c.z - 1) * d); g.translate(-W / 2 - c.x * d, -H / 2 - c.y * d); fn(); g.restore(); }
function spot(x, y, r, a = .55) { const gr = g.createRadialGradient(x, y, r * .3, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(8,6,10,${a})`); g.fillStyle = gr; g.fillRect(-300, -300, W + 600, H + 600); }
const pop = (t, t0, d = .45) => back(seg(t, t0, t0 + d), 1.8);
function chart(t, x0, y0, w, h, pts, p, color = '#2f7a3a', lw = 8) {
  g.save(); g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0 - h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
  g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); const n = (pts.length - 1) * clamp(p); g.moveTo(x0 + pts[0][0] * w, y0 - pts[0][1] * h);
  for (let i = 1; i <= Math.ceil(n); i++) { const u = Math.min(1, n - (i - 1)), a = pts[i - 1], b = pts[i]; g.lineTo(x0 + lerp(a[0], b[0], u) * w, y0 - lerp(a[1], b[1], u) * h); } g.stroke(); g.restore();
}
const tulipRow = (t, y, n, x0, dx, k, kinds, grow = () => 1) => { for (let i = 0; i < n; i++) Z.drawTulip(g, kinds[i % kinds.length], x0 + i * dx, y, k, t, { grow: grow(i) }); };

// ---------- per-scene sprites ----------
const B = {
  hook: { sky: sky(S.hook), clouds: clouds(3, 6, [260, 700]), row: Z.canalHouses(W + 400, 31), canal: ground(1290, '#3e5a66', 32), quay: ground(1440, '#5a4636', 33) },
  notgold: { bg: flat(S.notgold.paper) },
  ottoman: { sky: sky(S.ottoman), east: Z.ottoman(560, 41, '#a0605a'), west: Z.canalHouses(520, 42, ['#5a4636', '#3e4a3c', '#7a3b2e'], .2), ground: ground(1300, '#c9a86a', 43) },
  flames: { sky: sky(S.flames), clouds: clouds(5, 5, [260, 700]), field: ground(1240, '#6f8a4a', 51), soil: ground(1260, '#5a3a24', 52, 'flat', 10), deep: ground(1560, '#3a2418', 53) },
  bet: { bg: flat(S.bet.paper) },
  doubled: { bg: flat(S.doubled.paper) },
  semper: { bg: flat(S.semper.paper), ped: sheet([[-110, 0], [110, 0], [90, -60], [70, -260], [-70, -260], [-90, -60]], '#5a5040', { seed: 71, rim: 3 }), mansion: Z.canalHouses(420, 72, ['#7a5a3a'], .8) },
  haarlem: { snow: Array.from({ length: 60 }, (_, i) => [rng(i + 1)() * 300, rng(i + 9)() * 360]) },
  crash: { bg: flat(S.crash.paper) },
  trust: { bg: flat(S.trust.paper), hL: Z.hand(81, 1), hR: Z.hand(82, -1) },
  virus: { bg: flat(S.virus.paper), parts: Array.from({ length: 14 }, (_, i) => Z.virus(700 + i)) },
  sick: { bg: flat(S.sick.paper) },
  end: { sky: sky(S.end), clouds: clouds(9, 6, [300, 800], '#f2c79a', '#d99a86'), far: ground(1160, '#5a3a52', 91, 'hills', 60), field: ground(1240, '#3a2a3a', 92) },
};

// ---------- scenes ----------
const R = {
  hook(t, s) { const c = camOf(s, t), b = B.hook;
    P(c, 0, () => draw(g, b.sky)); P(c, .1, () => drawClouds(b.clouds, t));
    P(c, .5, () => { Z.drawRow(g, b.row, -100, 1295, .5); draw(g, b.canal); });
    P(c, .85, () => { draw(g, b.quay);
      const bk = seg(t, s.bulb - .4, s.bulb), hk = seg(t, s.house - .4, s.house);
      const tilt = hk >= 1 ? .0 + Math.sin((t - s.house) * 8) * .05 * Math.exp(-(t - s.house) * 2.5) : (bk >= 1 ? -.22 : 0);
      scale(t, 540, 600, tilt, (x, y) => { if (bk > 0) draw(g, BULB, x, lerp(y - 600, y - 18, eo(bk)), 1.6); }, (x, y) => { if (hk > 0) draw(g, HOUSE1, x - 60, lerp(y - 700, y + 2, eo(hk)), .55); }); });
  },
  notgold(t, s) { const c = camOf(s, t), b = B.notgold;
    P(c, 0, () => draw(g, b.bg));
    P(c, .9, () => { const k1 = pop(t, s.gold), k2 = pop(t, s.diam);
      if (k1 > 0) { for (let i = 0; i < 12; i++) draw(g, Z.coins[i % 6], 300 + (i % 4) * 40 - 60, 560 - Math.floor(i / 4) * 30, 1.6 * k1); if (t > s.gold + .5) X(300, 520, Math.min(1, (t - s.gold - .5) / .2)); }
      if (k2 > 0) { draw(g, Z.diamond, 780, 520, 1.5 * k2); if (t > s.diam + .5) X(780, 520, Math.min(1, (t - s.diam - .5) / .2)); }
      const k3 = seg(t, s.tulip - .2, s.tulip + .7); if (k3 > 0) Z.drawTulip(g, TU.flame, 540, 1280, 1.8, t, { grow: eo(k3) }); });
  },
  ottoman(t, s) { const c = camOf(s, t), b = B.ottoman;
    P(c, 0, () => draw(g, b.sky)); P(c, .5, () => { draw(g, b.east, -40, 1300); Z.drawRow(g, b.west, 600, 1300, .85); Z.drawWindmill(g, MILL, 960, 1300, .7, t); draw(g, b.ground); });
    P(c, .8, () => { g.save(); g.setLineDash([14, 12]); g.strokeStyle = '#7a2a22'; g.lineWidth = 4; g.beginPath(); g.moveTo(200, 1000); g.quadraticCurveTo(540, 520, 880, 1000); g.stroke(); g.restore();
      for (let i = 0; i < 4; i++) { const u = clamp(seg(t, s.go + i * .35, s.go + i * .35 + 2.2)); if (u <= 0) continue; const x = lerp(200, 880, u), y = (1 - u) * (1 - u) * 1000 + 2 * (1 - u) * u * 520 + u * u * 1000; Z.drawTulip(g, PLAIN[i % 3], x, y + 40, .45, t); }
      for (let i = 0; i < 5; i++) Z.drawTulip(g, PLAIN[i % 3], 640 + i * 80, 1430, .7, t, { grow: eo(seg(t, s.love - .6 + i * .12, s.love + .2 + i * .12)) }); });
  },
  flames(t, s) { const c = camOf(s, t), b = B.flames;
    P(c, 0, () => draw(g, b.sky)); P(c, .1, () => drawClouds(b.clouds, t));
    P(c, .6, () => { draw(g, b.field); for (let i = 0; i < 7; i++) if (i !== 3) Z.drawTulip(g, PLAIN[i % 3], 120 + i * 140, 1250, .9, t);
      const fk = pop(t, s.flame, .6); if (fk > 0) Z.drawTulip(g, TU.flame, 540, 1250, .9 * (.4 + .6 * fk) + .25 * fk, t);
      draw(g, b.soil); draw(g, b.deep);
      for (let i = 0; i < 5; i++) { draw(g, BULB, 160 + i * 190, 1420 + (i % 2) * 40, 1.3); }
      const qk = pop(t, s.predict); if (qk > 0) { g.save(); g.fillStyle = '#efe6cf'; g.font = `800 ${110 * qk}px ${SERIF}`; g.textAlign = 'center'; for (let i = 0; i < 5; i++) g.fillText('?', 160 + i * 190, 1330 + (i % 2) * 40); g.restore(); } });
  },
  bet(t, s) { const c = camOf(s, t), b = B.bet;
    P(c, 0, () => draw(g, b.bg));
    P(c, .9, () => { draw(g, BULB, 540, 760, 3); for (let i = 0; i < 14; i++) { const u = seg(t, s.t0 + .2 + i * .1, s.t0 + .6 + i * .1); if (u > 0) draw(g, Z.coins[i % 6], 300 + (i % 7) * 80, lerp(-100, 1080 - Math.floor(i / 7) * 34, eo(u)), 1.7); }
      if (t > s.bet - .1) label('PLACE YOUR BETS', 540, 400, pop(t, s.bet - .1)); });
  },
  tavern(t, s) { const c = camOf(s, t);
    P(c, .2, () => { draw(g, tavernWall); draw(g, winSnow, 700, 220); g.save(); g.fillStyle = '#fff'; const r = rng(3); for (let i = 0; i < 40; i++) g.fillRect(700 + r() * 300, 220 + ((r() * 360 + t * 60) % 360), 4, 4); g.restore(); });
    P(c, .7, () => { Z.drawTrader(g, TRADERS[0], 230, 1180, 1.15, t, { seated: true, armR: .8 + .2 * Math.sin(t * 2), held: SLIPS[0] }); Z.drawTrader(g, TRADERS[1], 820, 1180, 1.15, t + 1, { seated: true, armL: .8 + .2 * Math.sin(t * 2 + 1), heldL: SLIPS[1] });
      Z.drawTrader(g, TRADERS[2], 520, 1120, .95, t + 2, { seated: true }); draw(g, tTable, 540, 1100); draw(g, mug, 380, 1150); draw(g, mug, 690, 1160);
      for (let i = 0; i < 4; i++) { const u = ((t - s.t0) * .6 + i / 4) % 1; draw(g, SLIPS[2 + i], lerp(300, 780, u), 900 - Math.sin(u * Math.PI) * 260, 1, u * 3); } });
    P(c, .95, () => { const k = pop(t, s.ground, .5); if (k > 0) { g.save(); g.translate(540, 520); g.scale(k, k); g.beginPath(); g.arc(0, 0, 230, 0, 7); g.save(); g.clip(); draw(g, SOIL, 0, -60); draw(g, SNOWBAND, 0, -60, 1); draw(g, BULB, -90, 90, 1.1); draw(g, BULB, 80, 70, 1.1); g.restore();
        g.strokeStyle = '#efe6cf'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 230, 0, 7); g.stroke(); g.restore();
        const qk = pop(t, s.unseen); if (qk > 0) { g.save(); g.fillStyle = '#efe6cf'; g.font = `800 ${130 * qk}px ${SERIF}`; g.textAlign = 'center'; g.fillText('?', 760, 420); g.restore(); } } });
  },
  doubled(t, s) { const c = camOf(s, t), b = B.doubled;
    P(c, 0, () => draw(g, b.bg));
    P(c, .9, () => { const pts = [[0, .05], [.2, .08], [.35, .14], [.5, .28], [.65, .5], [.8, .78], [.95, .98]];
      chart(t, 130, 1150, 820, 820, pts, seg(t, s.t0 + .2, s.t1 - .6));
      g.fillStyle = C.ink; g.font = `700 34px ${SERIF}`; g.fillText('price of a bulb', 150, 300);
      if (t > s.x2a) label('×2', 560, 820, pop(t, s.x2a), .05); if (t > s.x2b) label('×2', 760, 560, pop(t, s.x2b), -.05);
      for (let i = 0; i < 4; i++) { const u = seg(t, s.sell + i * .3, s.sell + i * .3 + .9); if (u > 0 && u < 1) draw(g, SLIPS[i], lerp(150, 950, u), 1250 - Math.sin(u * Math.PI) * 200, 1.1, u * 4); } });
  },
  semper(t, s) { const c = camOf(s, t), b = B.semper;
    P(c, 0, () => draw(g, b.bg));
    P(c, .4, () => { const mk = eo(seg(t, s.mansion - .3, s.mansion + .6)); if (mk > 0) { g.save(); g.globalAlpha = mk; Z.drawRow(g, b.mansion, 330, 1020 + (1 - mk) * 300, 1.0); g.restore(); } });
    P(c, .8, () => { draw(g, b.ped, 540, 1260); Z.drawTulip(g, TU.semper, 540, 1000, 1.2, t, { sway: .015 }); });
    P(c, 1, () => spot(540, 760, 620, .75));
    P(c, .95, () => { if (t > s.mansion) { g.save(); g.fillStyle = '#efe6cf'; g.font = `italic 400 34px ${SERIF}`; g.textAlign = 'center'; g.globalAlpha = seg(t, s.mansion, s.mansion + .4); g.fillText('(so the story goes)', 540, 330); g.restore(); } });
  },
  haarlem(t, s) { const c = camOf(s, t), b = B.haarlem;
    P(c, .2, () => { draw(g, hallWall); for (const wx of [80, 760]) { draw(g, winSnow, wx, 200); g.save(); g.fillStyle = '#fff'; for (const [x, y] of b.snow) g.fillRect(wx + x, 200 + ((y + t * 70) % 360), 4, 4); g.restore(); } draw(g, floorS); });
    P(c, .7, () => { draw(g, Z.lectern, 540, 1040); Z.drawTrader(g, TRADERS[3], 540, 860, .8, t, { seated: true, armR: 1.5 + .1 * Math.sin(t * 3), held: BULB }); });
    P(c, .9, () => { for (let r2 = 0; r2 < 2; r2++) for (let i = 0; i < 4; i++) draw(g, CHAIRS[r2 * 4 + i], 160 + i * 250, 1260 + r2 * 140, 1.2 + r2 * .2); });
    P(c, 1, () => { const k = seg(t, s.away, s.away + 1.2); if (k > 0) spot(540, 1300, 900 - 300 * k, .6 * k); });
  },
  crash(t, s) { const c = camOf(s, t), b = B.crash;
    P(c, 0, () => draw(g, b.bg));
    P(c, .9, () => { const pts = [[0, .05], [.2, .1], [.35, .3], [.5, .6], [.6, .95], [.68, .55], [.76, .2], [.88, .06], [1, .03]];
      const p = t < s.fall ? 4 / 8 + .5 / 8 * seg(t, s.t0, s.fall) : lerp(4.5 / 8, 1, seg(t, s.fall, s.fall + 1.4));
      chart(t, 130, 1150, 820, 820, pts, p, t > s.fall ? '#b03a2a' : '#2f7a3a');
      g.fillStyle = C.ink; g.font = `700 34px ${SERIF}`; g.fillText('price of a bulb', 150, 300);
      if (t > s.panic) label('PANIC', 300, 470, pop(t, s.panic), -.06);
      const rk = seg(t, s.refuse, s.refuse + .8); if (rk > 0) { g.save(); g.translate(760, 1300); g.rotate(-.2 * eo(rk)); g.translate(-40 * eo(rk), 0); draw(g, SLIPS[0], 0, 0, 2.2); g.restore(); g.save(); g.translate(860, 1300); g.rotate(.25 * eo(rk)); g.translate(40 * eo(rk), 30 * eo(rk)); draw(g, SLIPS[1], 0, 0, 2.2); g.restore(); if (rk > .5) label('UNPAID', 800, 1180, pop(t, s.refuse + .4), .05, `800 40px ${SERIF}`); } });
  },
  trust(t, s) { const c = camOf(s, t), b = B.trust;
    P(c, 0, () => draw(g, b.bg));
    P(c, .9, () => { const bk = eo(seg(t, s.ruin, s.ruin + .6)), bo = ei(seg(t, s.broke - .5, s.broke)); if (bk > 0 && bo < 1) draw(g, Z.book, 220, 360 + (1 - bk) * 1400 - bo * 1400);
      const lk = eo(seg(t, s.broke - .3, s.broke + .4)), lo = ei(seg(t, s.trust - .4, s.trust)); if (lk > 0 && lo < 1) { draw(g, Z.ledger, 220, 360 + (1 - lk) * 1400 - lo * 1400); g.save(); g.translate(0, (1 - lk) * 1400 - lo * 1400); g.fillStyle = '#b03a2a'; g.font = `800 48px ${SERIF}`; g.fillText('few went broke', 300, 760); g.restore(); }
      const tk = seg(t, s.trust - .2, s.trust + 1.6); if (tk > 0) { const sep = eio(seg(t, s.trust + .3, s.trust + 1.4)) * 150; draw(g, b.hL, 470 - sep, 700, 1.6, .05 * sep / 150); draw(g, b.hR, 610 + sep, 700, 1.6, -.05 * sep / 150);
        if (sep > 40) label('TRUST', 540, 520, pop(t, s.trust + .6), -.04); } });
  },
  virus(t, s) { const c = camOf(s, t), b = B.virus;
    P(c, 0, () => draw(g, b.bg));
    P(c, .8, () => Z.drawTulip(g, TU.flame, 540, 1450, 2.6, t, { sway: .01 }));
    P(c, .95, () => { const k = pop(t, s.zoom, .6); if (k > 0) { g.save(); g.translate(560, 560); g.scale(k, k); g.beginPath(); g.arc(0, 0, 260, 0, 7); g.save(); g.clip(); g.fillStyle = '#f6efe2'; g.fillRect(-300, -300, 600, 600);
        g.fillStyle = '#a01e2a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-300 + i * 130, 300); g.quadraticCurveTo(-250 + i * 130 + Math.sin(i) * 40, 0, -300 + i * 130 + 30, -300); g.lineTo(-300 + i * 130 + 70, -300); g.quadraticCurveTo(-210 + i * 130, 0, -300 + i * 130 + 50, 300); g.fill(); }
        b.parts.forEach((v, i) => draw(g, v, Math.sin(i * 2.1 + t * .3) * 200, Math.cos(i * 1.7 + t * .25) * 200, 1.2, i + t * .2));
        draw(g, Z.aphid, -60 + (t - s.zoom) * 18, 120, 2.2, -.2); g.restore(); g.strokeStyle = '#efe6cf'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 260, 0, 7); g.stroke(); g.restore(); }
      if (t > s.virus) { label('TULIP BREAKING VIRUS', 540, 940, pop(t, s.virus), -.03, `800 46px ${SERIF}`); if (t > s.virus + .4) { g.save(); g.fillStyle = '#efe6cf'; g.font = `italic 400 34px ${SERIF}`; g.textAlign = 'center'; g.globalAlpha = seg(t, s.virus + .4, s.virus + .8); g.fillText('spread by aphids · discovered 1928', 540, 1040); g.restore(); } } });
  },
  sick(t, s) { const c = camOf(s, t), b = B.sick;
    P(c, 0, () => draw(g, b.bg));
    P(c, .8, () => { Z.drawTulip(g, TU.semper, 540, 1260, 1.5, t, { droop: .5 * eio(seg(t, s.sick, s.sick + 1.6)), sway: .01 });
      for (let i = 0; i < 18; i++) { const u = seg(t, s.paid + i * .06, s.paid + i * .06 + .7); if (u > 0) draw(g, Z.coins[i % 6], 380 + (i % 9) * 40, lerp(-100, 1250 - Math.floor(i / 9) * 30, eo(u)), 1.5); } });
    P(c, .95, () => { if (t > s.sick) label('SICK', 280, 520, pop(t, s.sick), -.08, `800 64px ${SERIF}`); if (t > s.paid) label('PRICELESS?', 790, 420, pop(t, s.paid), .06, `800 46px ${SERIF}`); });
  },
  end(t, s) { const c = camOf(s, t), b = B.end;
    P(c, 0, () => draw(g, b.sky)); P(c, .1, () => drawClouds(b.clouds, t));
    P(c, .4, () => { draw(g, b.far); Z.drawWindmill(g, MILL, 820, 1180, .8, t); });
    P(c, .7, () => { draw(g, b.field); for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 12; i++) Z.drawTulip(g, [TU.red, TU.yellow, TU.pink, TU.flame][(i + r2) % 4], -40 + i * 100 + r2 * 40, 1260 + r2 * 70, .55 + r2 * .12, t); });
    const ck = seg(t, s.card, s.card + .6); if (ck > 0) { const a = caption('TULIP MANIA · 1637', `800 54px ${SERIF}`, 900), bb = caption('follow for more stories of money & history', `italic 400 38px ${SERIF}`, 860);
      draw(g, a.s, (W - a.W) / 2, 300 - (1 - eo(ck)) * 900); draw(g, bb.s, (W - bb.W) / 2, 300 + a.H + 30 - (1 - eo(seg(t, s.card + .2, s.card + .8))) * 900);
      if (CAPT) CAPT.push({ id: 'card1', text: 'TULIP MANIA · 1637', x0: 200, y0: 300, x1: 880, y1: 380 }, { id: 'card2', text: 'follow for more stories of money & history', x0: 100, y0: 420, x1: 980, y1: 500 }); }
  },
};

// ---------- frame: scene, torn wipe to the next, place tag, caption ----------
const EDGE = ragged([[0, -100], [0, H + 100]], { amp: 9, seed: 99, open: true, step: 6 });
let CAPT = null;
function frame(t) {
  const L = SC.scenes; let i = L.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = L.length - 1; const s = L[i];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  R[s.id](t, s);
  const nx = L[i + 1], wd = SC.wipe;
  if (nx && t > nx.t0 - wd) { const k = eio(seg(t, nx.t0 - wd, nx.t0)), ex = lerp(W + 60, -80, k);
    g.save(); g.beginPath(); g.moveTo(ex + EDGE[0][0], EDGE[0][1]); for (const [x, y] of EDGE) g.lineTo(ex + x + (y % 40), y); g.lineTo(W + 200, H + 100); g.lineTo(W + 200, -100); g.closePath();
    g.shadowColor = 'rgba(10,8,5,.5)'; g.shadowBlur = 24; g.shadowOffsetX = -8; g.fillStyle = '#f7f2e7'; g.fill(); g.shadowColor = 'transparent';
    g.beginPath(); g.moveTo(ex + 5 + EDGE[0][0], EDGE[0][1]); for (const [x, y] of EDGE) g.lineTo(ex + 6 + x * 1.3 + (y % 40), y); g.lineTo(W + 200, H + 100); g.lineTo(W + 200, -100); g.closePath(); g.clip();
    R[nx.id](nx.t0, nx); g.restore(); }
  if (s.label) { const lk = eo(seg(t, s.t0 + .1, s.t0 + .45)) * (1 - seg(t, s.t1 - .3, s.t1 - .05)); if (lk > 0) { const ts = tagS(s.label); draw(g, ts, 60 - (1 - lk) * 600, 200, 1, -.02);
    if (CAPT && lk >= 1) CAPT.push({ id: s.label, text: s.label, x0: 60, y0: 200, x1: 60 + ts.c.width - 40, y1: 260 }); } }
  if (SUBS) { const sb = TL.subs.find(q => t >= q.t0 && t < q.t1); if (sb) { const cp = caption(sb.text, `700 46px ${SERIF}`, 820), a = Math.min(1, (t - sb.t0) / .15); draw(g, cp.s, (W - cp.W) / 2, 1400 - cp.H / 2 + (1 - eo(a)) * 40); } }
}

// ---------- sound events ----------
function buildEV() {
  const ev = []; SC.scenes.slice(1).forEach(s => ev.push({ t: s.t0 - SC.wipe, type: 'tear', d: SC.wipe }));
  ev.push({ t: S.hook.bulb, type: 'thud' }); ev.push({ t: S.hook.house, type: 'thud', big: true }); ev.push({ t: S.hook.house, type: 'creak', d: 1.2 });
  ev.push({ t: S.notgold.gold, type: 'coins', d: .6, n: 10 }); ev.push({ t: S.notgold.gold + .5, type: 'scratch' }); ev.push({ t: S.notgold.diam, type: 'ting' }); ev.push({ t: S.notgold.diam + .5, type: 'scratch' }); ev.push({ t: S.notgold.tulip, type: 'bloom', d: .8 });
  ev.push({ t: S.ottoman.go, type: 'wind', d: 3.0 }); ev.push({ t: S.ottoman.love, type: 'bloom', d: 1.0 });
  ev.push({ t: S.flames.flame, type: 'bloom', d: .8 }); ev.push({ t: S.flames.predict, type: 'pop', n: 5 });
  ev.push({ t: S.bet.t0 + .2, type: 'coins', d: 1.6, n: 14 });
  ev.push({ t: S.tavern.t0, type: 'room', d: S.tavern.t1 - S.tavern.t0 }); ev.push({ t: S.tavern.ground, type: 'pop', n: 1 });
  ev.push({ t: S.doubled.x2a, type: 'pop', n: 1 }); ev.push({ t: S.doubled.x2b, type: 'pop', n: 1 }); ev.push({ t: S.doubled.sell, type: 'paper', d: 1.4 });
  ev.push({ t: S.semper.t0 + .3, type: 'shimmer', d: 2.0 }); ev.push({ t: S.semper.mansion, type: 'thud' });
  ev.push({ t: S.haarlem.t0 + .2, type: 'wind', d: 6.5, cold: true }); ev.push({ t: S.haarlem.t0 + 1.2, type: 'gavel' }); ev.push({ t: S.haarlem.away + .8, type: 'gavel', soft: true });
  ev.push({ t: S.crash.panic, type: 'pop', n: 1 }); ev.push({ t: S.crash.fall, type: 'fall', d: 1.4 }); ev.push({ t: S.crash.refuse, type: 'rip' });
  ev.push({ t: S.trust.ruin, type: 'paper', d: .6 }); ev.push({ t: S.trust.broke - .3, type: 'paper', d: .6 }); ev.push({ t: S.trust.trust + .3, type: 'rip' });
  ev.push({ t: S.virus.zoom, type: 'shimmer', d: 1.2 }); ev.push({ t: S.virus.virus, type: 'pop', n: 1 });
  ev.push({ t: S.sick.sick, type: 'droop', d: 1.6 }); ev.push({ t: S.sick.paid, type: 'coins', d: 1.4, n: 18 });
  ev.push({ t: S.end.card, type: 'paper', d: .6 });
  return ev.sort((a, b) => a.t - b.t).map(e => ({ ...e, t: +e.t.toFixed(3) }));
}
window.DUR = FILM; window.render = frame;
window.TEXTS = t => { CAPT = []; frame(t); const r = CAPT; CAPT = null; return r; };
window.EV = buildEV(); frame(0); window.READY = true;

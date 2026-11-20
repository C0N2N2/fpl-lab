// "The King Who Broke an Economy" — Mansa Musa, 1324. Torn Paper Collage, vertical 1080×1920 for Instagram Reels.
// Scenes, timings and cameras come from scenes.json; every shape is a cached torn-paper sprite (paper.js, figures.js).
import { sheet, draw, rect, circle, ellipse, band, profile, grad, caption, ragged, rng, fbm } from './paper.js';
import * as F from './figures.js';
import { clamp, lerp, seg, eio, eo, ei, ss, back, monotone } from '/core/lib.js';

const Q = new URLSearchParams(location.search), SUBS = Q.get('subs') !== '0';
const SC = await (await fetch('scenes.json')).json();
const TL = await (await fetch('timeline.json')).json();
const [W, H] = SC.size, FILM = SC.end;
const cv = document.getElementById('c'), g = cv.getContext('2d');
const SERIF = '"Fraunces", serif';
const S = Object.fromEntries(SC.scenes.map(s => [s.id, s]));

// ---------- shared pieces ----------
const sky = s => sheet(rect(-200, -200, W + 400, H + 400), grad(s.sky.map((c, i) => [i / (s.sky.length - 1), c])), { rim: 0, shadow: 0, crumple: .8, grainK: .5 });
const sun = (s) => sheet(circle(0, 0, s.sun[2], 64), grad([[0, '#fff6d8'], [.5, s.sun[3]], [1, s.sun[3]]]), { rim: 3, seed: 11, shadow: .12 });
function clouds(seed, n, ys, col = '#f6e7cf', col2 = '#e9c9a6') {
  const r = rng(seed); return Array.from({ length: n }, (_, i) => { const w = 260 + r() * 420, h = 40 + r() * 40;
    const top = profile('hills', w, 0, h, seed + i, 10).map(([x, y]) => [x, y + h * .6]);
    return { s: sheet([...top, [w + 40, h * .9], [-40, h * .9]], i % 2 ? col : col2, { seed: seed + i * 3, rim: 4, shadow: .12, crumple: .3 }), x: r() * (W + 600) - 300, y: ys[0] + r() * (ys[1] - ys[0]), d: .05 + r() * .12, v: 6 + r() * 10 }; });
}
const layer = (kind, base, amp, color, seed, bottom = H + 300, w = W + 1600, opts = {}) => sheet(band(profile(kind, w, base, amp, seed).map(([x, y]) => [x - 800, y]), bottom), color, { seed, rim: 4, ...opts });

// ---------- build every scene ----------
const B = {};
{ const s = S.cairo_hook; B.cairo_hook = {
  sky: sky(s), sun: sun(s), clouds: clouds(5, 7, [300, 900]),
  pyr: [F.pyramid(260, 170, 21), F.pyramid(190, 120, 22), F.pyramid(120, 80, 23)],
  nile: sheet(band(profile('flat', W + 1600, 1190, 20, 24).map(([x, y]) => [x - 800, y]), 1290), '#6d8fa0', { seed: 24, rim: 3 }),
  far: F.cairo(W + 1400, 31, '#9b5a63'), near: F.cairo(W + 1400, 32, '#5e3448'),
  roof: layer('flat', 1560, 40, '#3c2233', 33),
  palms: [F.palm(40, 260), F.palm(41, 220)] }; }
{ const s = S.mali; B.mali = {
  sky: sky(s), sun: sun(s), clouds: clouds(7, 6, [260, 700], '#fbf2dc', '#efe0c0'),
  hills: layer('hills', 1080, 140, '#b98d5a', 51), plain: layer('flat', 1300, 30, '#d6ae67', 52), fore: layer('flat', 1640, 40, '#b8853f', 53),
  mosque: F.mosque(70), trees: [F.acacia(54), F.acacia(55)], king: F.king(40),
  crowd: Array.from({ length: 8 }, (_, i) => F.walker(80 + i * 4, ['#f3ead6', '#2f3d6b', '#a8382b', '#e8b33a'][i % 4], ['#2f3d6b', '#f3ead6', '#2b1d16', '#a8382b'][i % 4], i % 2 ? F.COL.skin : F.COL.skin2)) }; }
{ const s = S.gold; B.gold = {
  sky: sky(s), sun: sun(s), clouds: clouds(9, 5, [300, 760]),
  hills: layer('hills', 1000, 160, '#9b7a4a', 61), bank: layer('hills', 1260, 50, '#c89a58', 62),
  river: sheet(band(profile('flat', W + 1600, 1330, 30, 63).map(([x, y]) => [x - 800, y]), 1560), grad([[0, '#5c8aa0'], [1, '#3f6b84']]), { seed: 63, rim: 4 }),
  near: layer('hills', 1600, 60, '#a7743a', 64),
  panners: [F.walker(90, '#f3ead6', '#a8382b'), F.walker(91, '#2f3d6b', '#e8b33a'), F.walker(92, '#e8b33a', '#2f3d6b')] }; }
{ const s = S.sahara; B.sahara = {
  sky: sky(s), sun: sun(s), clouds: clouds(13, 6, [260, 620], '#fbf6ea', '#f1e4cc'),
  far: layer('dunes', 1060, 230, '#e3a25b', 71, H + 300, W + 3200), mid: layer('dunes', 1200, 150, '#d48443', 72, H + 300, W + 3200),
  floor: layer('flat', 1300, 14, '#e8be76', 73, H + 300, W + 3200), fore: layer('dunes', 1700, 160, '#c46f35', 74, H + 300, W + 3600),
  camels: Array.from({ length: 9 }, (_, i) => F.camel(100 + i * 9)), people: Array.from({ length: 7 }, (_, i) => F.walker(200 + i * 5, ['#f3ead6', '#2f3d6b', '#a8382b'][i % 3], ['#2f3d6b', '#e8b33a', '#f3ead6'][i % 3])) }; }
{ const s = S.giving; B.giving = {
  sky: sky(s), sun: sun(s), clouds: clouds(15, 5, [300, 700]),
  far: F.cairo(W + 1400, 34, '#a0606a'), near: F.cairo(W + 1400, 35, '#6a3a4e'),
  street: layer('flat', 1500, 20, '#c9935a', 36), fore: layer('flat', 1760, 30, '#8c5a36', 37),
  stalls: [0, 1, 2].map(i => sheet([[-120, 0], [120, 0], [140, -60], [-140, -60]], (g2, x0, y0, x1, y1) => { for (let k = 0; k < 8; k++) { g2.fillStyle = k % 2 ? '#f3ead6' : ['#a8382b', '#2f3d6b', '#4f6b3a'][i]; g2.fillRect(-150 + k * 37, -70, 37, 80); } }, { seed: 400 + i, rim: 3 })),
  king: F.king(40),
  people: [F.walker(500, '#2f3d6b', '#f3ead6'), F.walker(501, '#a8382b', '#2b1d16'), F.walker(502, '#8d6e52', '#6b5a48', F.COL.skin2), F.walker(503, '#f3ead6', '#a8382b')] }; }
{ const s = S.strange; B.strange = { sky: sky(s), sun: sun(s) }; }
{ const s = S.cheap; B.cheap = {
  paper: sheet(rect(-100, -100, W + 200, H + 500), s.paper, { rim: 0, shadow: 0, crumple: 1, grainK: .6 }),
  post: sheet([[-14, 0], [14, 0], [10, -520], [-10, -520]], '#7a5232', { seed: 501, rim: 3 }),
  base: sheet([[-170, 0], [170, 0], [130, -50], [-130, -50]], '#5b3b26', { seed: 502, rim: 3 }),
  beam: sheet(rect(-330, -10, 660, 20), '#7a5232', { seed: 503, rim: 3 }),
  pan: sheet([[-120, 0], [120, 0], [90, 40], [-90, 40]], '#b07a3a', { seed: 504, rim: 3 }),
  silver: Array.from({ length: 3 }, (_, i) => sheet(circle(0, 0, 18, 28), grad([[0, '#f4f4f0'], [1, '#9ea3a8']]), { seed: 520 + i, rim: 2, shadow: .2 })),
  card: sheet(rect(0, 0, 820, 470), '#f7efdc', { seed: 510, rim: 3, shadow: .3 }),
  pages: Array.from({ length: 13 }, (_, i) => sheet(rect(0, 0, 250, 200), i === 12 ? '#f6d9a8' : '#f8f1e2', { seed: 600 + i, rim: 2.5, shadow: .25 })) }; }
{ const s = S.shook; B.shook = { sky: sky(s), sun: sun(s), far: F.cairo(W + 1400, 38, '#6c3f57'), near: F.cairo(W + 1400, 39, '#3a2234'), fore: layer('flat', 1580, 30, '#2a1824', 40) }; }
{ const s = S.map; B.map = {
  paper: sheet(rect(-100, -100, W + 200, H + 500), grad([[0, '#ead7a8'], [1, '#d9bf86']]), { rim: 0, shadow: 0, crumple: 1.2, grainK: .7 }),
  king: F.king(41),
  throne: sheet([[-150, 0], [150, 0], [150, -230], [120, -260], [100, -230], [100, -120], [-100, -120], [-100, -230], [-120, -260], [-150, -230]], grad([[0, '#e8b33a'], [1, '#9a6512']]), { seed: 701, rim: 3 }),
  seal: sheet(circle(0, 0, 70, 40), '#a8382b', { seed: 702, rim: 3, detail: g2 => { g2.fillStyle = '#f4e1c0'; g2.font = `700 40px ${SERIF}`; g2.textAlign = 'center'; g2.fillText('1375', 0, 14); } }) }; }
{ const s = S.end; B.end = { sky: sky(s), sun: sun(s), clouds: clouds(17, 6, [300, 900], '#f2c79a', '#d99a86'),
  far: layer('dunes', 1240, 200, '#9a4f55', 81, H + 300, W + 2400), near: layer('dunes', 1440, 160, '#5e3046', 82, H + 300, W + 2400), fore: layer('dunes', 1760, 120, '#3a2034', 83, H + 300, W + 2400),
  camels: Array.from({ length: 5 }, (_, i) => F.camel(150 + i * 7)), people: Array.from({ length: 3 }, (_, i) => F.walker(260 + i, '#3a2034', '#3a2034', '#3a2034')) }; }
const LABELS = new Map();
const tagS = text => { if (!LABELS.has(text)) { g.font = `700 30px ${SERIF}`; const m = g.measureText(text).width + text.length * 3.2;
  LABELS.set(text, sheet(rect(0, 0, m + 50, 60), '#2b1d16', { seed: text.length * 31, rim: 2.5, shadow: .3, detail: g2 => { g2.fillStyle = '#f4ecd8'; g2.font = `700 30px ${SERIF}`; g2.letterSpacing = '3px'; g2.fillText(text, 25, 41); } })); } return LABELS.get(text); };

// the channel's mark: a dark torn-paper price tag (made on first use, after the fonts load)
let BRAND = null;
const brand = () => BRAND || (BRAND = (() => { g.font = `800 40px ${SERIF}`; const w = g.measureText('THE PRICE OF HISTORY').width + 20 * 4 + 110;
  return { w, s: sheet([[0, 42], [44, 0], [w, 0], [w, 84], [44, 84]], '#231a16', { seed: 777, rim: 3, shadow: .4, detail: gg => {
    gg.globalCompositeOperation = 'destination-out'; gg.beginPath(); gg.arc(34, 42, 11, 0, 7); gg.fill(); gg.globalCompositeOperation = 'source-over';
    gg.fillStyle = '#efe6cf'; gg.font = `800 40px ${SERIF}`; gg.letterSpacing = '4px'; gg.fillText('THE PRICE OF HISTORY', 70, 57); } }) }; })());

// ---------- camera ----------
const CAM = Object.fromEntries(SC.scenes.map(s => [s.id, [1, 2, 3].map(j => monotone(s.cam.map(k => [k[0], k[j]])))]));
function camOf(s, t) { const [x, y, z] = CAM[s.id].map(f => f(t)); return { x, y, z }; }
// draw a sprite at a world position with parallax depth d (0 = fixed sky, 1 = the camera plane)
function P(c, d, fn) { g.save(); g.translate(W / 2, H / 2); g.scale(1 + (c.z - 1) * d, 1 + (c.z - 1) * d); g.translate(-W / 2 - c.x * d, -H / 2 - c.y * d); fn(); g.restore(); }

// ---------- coins in the air ----------
function coinRain(t, t0, n, seed, area = [0, W], from = -80) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const d0 = t0 + r() * 1.6, x = area[0] + r() * (area[1] - area[0]), v = 900 + r() * 500, rot = r() * 6, sp = (r() - .5) * 8, k = .7 + r() * .7;
    const u = t - d0; if (u < 0) continue; const y = from + v * u + 300 * u * u; if (y > H + 100) continue;
    draw(g, F.coins[i % F.coins.length], x + Math.sin(u * 3 + i) * 20, y, k * Math.abs(Math.cos(rot + u * sp)) + .15, 0, 0, 0); }
}
function coinArc(t, t0, from, to, i, dur = .9) { const u = seg(t, t0, t0 + dur); if (u <= 0 || u >= 1) return;
  const x = lerp(from[0], to[0], u), y = lerp(from[1], to[1], u) - Math.sin(u * Math.PI) * 260; draw(g, F.coins[i % 6], x, y, Math.abs(Math.cos(u * 9 + i)) * .9 + .2); }

// ---------- scenes ----------
const R = {
  cairo_hook(t, s) { const c = camOf(s, t), b = B.cairo_hook;
    P(c, 0, () => draw(g, b.sky)); P(c, .05, () => draw(g, b.sun, s.sun[0], s.sun[1] + t * 4));
    P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .25, () => { draw(g, b.pyr[0], 300, 1205); draw(g, b.pyr[1], 470, 1210); draw(g, b.pyr[2], 590, 1212); draw(g, b.nile); });
    P(c, .45, () => draw(g, b.far, -500, 1330)); P(c, .7, () => draw(g, b.near, -450, 1470));
    P(c, 1, () => { draw(g, b.roof); F.drawPalm(g, b.palms[0], 90, 1640, 1.2, t); F.drawPalm(g, b.palms[1], 960, 1660, 1.1, t); });
    P(c, .9, () => coinRain(t, s.coins.start, s.coins.count, 7));
  },
  mali(t, s) { const c = camOf(s, t), b = B.mali;
    P(c, 0, () => draw(g, b.sky)); P(c, .05, () => draw(g, b.sun, s.sun[0], s.sun[1]));
    P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .3, () => draw(g, b.hills)); P(c, .5, () => { draw(g, b.plain); draw(g, b.mosque, 540, 1330); F.drawPalm; draw(g, b.trees[0].trunk, 160, 1320); draw(g, b.trees[0].crown, 160, 1320); draw(g, b.trees[1].trunk, 930, 1310, .8); draw(g, b.trees[1].crown, 930, 1310, .8); });
    P(c, .85, () => { const k = back(seg(t, s.kingAt - .3, s.kingAt + .5), 1.4); g.save(); g.translate(0, (1 - k) * 700); F.drawKing(g, b.king, 540, 1600, .95, t); g.restore();
      b.crowd.forEach((w, i) => F.drawWalker(g, w, i < 4 ? 120 + i * 70 : 760 + (i - 4) * 70, 1620 + (i % 2) * 20, 1.5, t, i, false)); });
    P(c, 1, () => draw(g, b.fore));
  },
  gold(t, s) { const c = camOf(s, t), b = B.gold;
    P(c, 0, () => draw(g, b.sky)); P(c, .05, () => draw(g, b.sun, s.sun[0], s.sun[1]));
    P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .3, () => draw(g, b.hills)); P(c, .5, () => draw(g, b.bank));
    P(c, .65, () => { draw(g, b.river); const r = rng(5); for (let i = 0; i < 40; i++) { const x = r() * (W + 400) - 200, y = 1360 + r() * 180, tw = Math.max(0, Math.sin(t * 4 + i * 1.7)) * seg(t, s.glint - .4, s.glint + .4);
        if (tw > .05) { g.save(); g.globalAlpha = tw; g.fillStyle = '#ffe9a0'; g.beginPath(); g.moveTo(x, y - 14 * tw); g.lineTo(x + 4, y); g.lineTo(x, y + 14 * tw); g.lineTo(x - 4, y); g.closePath(); g.fill(); g.fillRect(x - 12 * tw, y - 1.5, 24 * tw, 3); g.restore(); } }
      b.panners.forEach((p, i) => F.drawWalker(g, p, 200 + i * 330, 1500 + i * 14, 1.6, t, i, false)); });
    P(c, 1, () => { draw(g, b.near); [[180, 1690], [520, 1740], [860, 1700]].forEach(([x, y], i) => draw(g, F.nugget, x, y, 2.2 + i * .3, i)); });
  },
  sahara(t, s) { const c = camOf(s, t), b = B.sahara, u = t - s.t0;
    P(c, 0, () => draw(g, b.sky)); P(c, .03, () => draw(g, b.sun, s.sun[0], s.sun[1]));
    P(c, .08, () => b.clouds.forEach(k => draw(g, k.s, k.x + 300 + t * k.v, k.y)));
    P(c, .3, () => draw(g, b.far)); P(c, .55, () => draw(g, b.mid)); P(c, .8, () => draw(g, b.floor));
    P(c, .8, () => { const lead = 760 + c.x * .8 + u * 12; const n = 5 + Math.round(4 * seg(t, s.more - .5, s.more + 1.5));
      for (let i = 0; i < n; i++) { const x = lead - i * 230; F.drawCamel(g, b.camels[i], x, 1325, 1.0, t, i * 1.3); if (i < b.people.length) F.drawWalker(g, b.people[i], x + 140, 1335, 1.05, t, i); } });
    P(c, 1.2, () => draw(g, b.fore));
  },
  giving(t, s) { const c = camOf(s, t), b = B.giving;
    P(c, 0, () => draw(g, b.sky)); P(c, .05, () => draw(g, b.sun, s.sun[0], s.sun[1]));
    P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .4, () => draw(g, b.far, -500, 1300)); P(c, .6, () => { draw(g, b.near, -450, 1450); draw(g, b.street); b.stalls.forEach((st, i) => draw(g, st, 140 + i * 400, 1480)); });
    P(c, .9, () => {
      const raise = Math.max(...s.throws.map(th => Math.max(0, 1 - Math.abs(t - th) / .45)));
      F.drawKing(g, b.king, 540, 1700, .78, t, { raise });
      const tgt = [[150, 1560], [330, 1600], [800, 1590], [960, 1560]];
      b.people.forEach((p, i) => F.drawWalker(g, p, tgt[i][0], tgt[i][1] + 60, 1.6, t, i, false));
      s.throws.forEach((th, j) => { for (let k = 0; k < 6; k++) coinArc(t, th + k * .05, [470, 1330], [tgt[(j + k) % 4][0] + (k - 3) * 10, tgt[(j + k) % 4][1] - 120], k + j); });
    });
    P(c, 1, () => draw(g, b.fore));
  },
  strange(t, s) { const c = camOf(s, t), b = B.strange, bg2 = B.giving;
    P(c, 0, () => draw(g, b.sky)); P(c, .05, () => draw(g, b.sun, s.sun[0], s.sun[1]));
    P(c, .4, () => draw(g, bg2.far, -500, 1300)); P(c, .6, () => { draw(g, bg2.near, -450, 1450); draw(g, bg2.street); });
    g.save(); g.fillStyle = 'rgba(30,15,40,.35)'; g.fillRect(0, 0, W, H); g.restore();
    P(c, .9, () => { const r = rng(42); for (let i = 0; i < 26; i++) { const x = 100 + r() * 880, y = 380 + r() * 900, ph = r() * 6; draw(g, F.coins[i % 6], x, y + Math.sin(t * 1.2 + ph) * 10, (.8 + r() * .8) * (Math.abs(Math.cos(t * .9 + ph)) * .85 + .15)); } });
    P(c, 1, () => draw(g, bg2.fore));
  },
  cheap(t, s) { const c = camOf(s, t), b = B.cheap;
    P(c, 0, () => draw(g, b.paper));
    P(c, .8, () => {
      const tilt = .32 * back(seg(t, s.tilt - .2, s.tilt + .9), 1.5);       // the gold side rises: gold is worth less
      const cx = 540, cy = 1010, armL = [cx - 300, cy], armR = [cx + 300, cy];
      draw(g, b.base, cx, 1540); draw(g, b.post, cx, 1500);
      g.save(); g.translate(cx, cy); g.rotate(tilt); draw(g, b.beam, 0, 0); g.restore();
      const L = [cx - Math.cos(tilt) * 300, cy - Math.sin(tilt) * 300], Rr = [cx + Math.cos(tilt) * 300, cy + Math.sin(tilt) * 300];
      for (const [p, side] of [[L, 'gold'], [Rr, 'silver']]) {
        g.save(); g.strokeStyle = '#3d2716'; g.lineWidth = 3; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - 100, p[1] + 220); g.moveTo(p[0], p[1]); g.lineTo(p[0] + 100, p[1] + 220); g.stroke(); g.restore();
        draw(g, b.pan, p[0], p[1] + 220);
        if (side === 'gold') { const n = Math.round(40 * seg(t, s.pile[0], s.pile[1])); for (let i = 0; i < n; i++) { const row = Math.floor(Math.sqrt(i * 2)); const col = i - row * (row + 1) / 2; draw(g, F.coins[i % 6], p[0] - row * 18 + col * 36, p[1] + 210 - (8 - row) * 0 - row * 0 - (10 - row) * 0 - (row ? 0 : 0) - (Math.min(row, 8)) * 4 - 6, .9); } }
        else for (let i = 0; i < 3; i++) draw(g, b.silver[i], p[0] - 30 + i * 30, p[1] + 206, 1);
      }
      g.save(); g.font = `700 34px ${SERIF}`; g.fillStyle = '#2b1d16'; g.textAlign = 'center'; const lk = seg(t, s.pile[0], s.pile[0] + .5);
      g.globalAlpha = lk; g.fillText('GOLD', L[0], L[1] + 320); g.fillText('SILVER', Rr[0], Rr[1] + 320); g.restore();
    });
    // the falling line, on a card that slides in
    const ck = eo(seg(t, s.fall - .4, s.fall + .3)), co = ei(seg(t, s.years - .5, s.years));
    if (ck > 0 && co < 1) P(c, .9, () => { g.save(); g.translate((1 - ck) * -900 + co * -900, 270); g.translate(540, 0); g.scale(.82, .82); g.translate(-540, 0); draw(g, b.card, 130, 300);
      g.strokeStyle = '#2b1d16'; g.lineWidth = 3; g.beginPath(); g.moveTo(190, 340); g.lineTo(190, 720); g.lineTo(900, 720); g.stroke();
      const p = seg(t, s.fall, s.fall + 1.6); g.strokeStyle = '#b03a2a'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath();
      const pts = [[200, 400], [330, 410], [420, 470], [520, 560], [640, 610], [760, 640], [880, 650]]; const m = Math.max(1, Math.floor(p * (pts.length - 1)));
      g.moveTo(...pts[0]); for (let i = 1; i <= m; i++) g.lineTo(...pts[i]); g.stroke();
      g.fillStyle = '#2b1d16'; g.font = `700 32px ${SERIF}`; g.fillText('value of gold', 210, 370); g.font = `italic 400 24px ${SERIF}`; g.fillText('after 1324 (al-Umari)', 560, 760); g.restore(); });
    // years flipping: 1324 → 1336
    if (t > s.years - .3) P(c, .9, () => { const k = clamp((t - s.years) / 2.4); const n = Math.floor(k * 12);
      for (let i = 12; i >= n; i--) { const fl = i === n ? ss((k * 12) % 1) : 0; g.save(); g.translate(415, 560); g.rotate(-fl * .6); g.translate(0, -fl * 120); draw(g, b.pages[i], 0, 0); g.fillStyle = i === 12 ? '#b03a2a' : '#2b1d16'; g.font = `700 74px ${SERIF}`; g.textAlign = 'center'; g.fillText(String(1324 + i), 125, 128); g.restore(); }
      if (k >= 1) { g.save(); g.fillStyle = '#2b1d16'; g.font = `italic 400 30px ${SERIF}`; g.textAlign = 'center'; g.fillText('still not recovered', 540, 830); g.restore(); } });
  },
  shook(t, s) { const c = camOf(s, t), b = B.shook; const sh = Math.max(0, 1 - Math.abs(t - s.shake) / .9) * 10;
    const c2 = { ...c, x: c.x + Math.sin(t * 40) * sh, y: c.y + Math.cos(t * 33) * sh };
    P(c2, 0, () => draw(g, b.sky)); P(c2, .05, () => draw(g, b.sun, s.sun[0], s.sun[1]));
    P(c2, .4, () => draw(g, b.far, -500, 1350)); P(c2, .7, () => draw(g, b.near, -450, 1500));
    P(c2, 1, () => { draw(g, b.fore); const r = rng(77); for (let i = 0; i < 30; i++) draw(g, F.coins[i % 6], r() * W, 1600 + r() * 260, .8 + r() * .5); });
  },
  map(t, s) { const c = camOf(s, t), b = B.map;
    P(c, 0, () => draw(g, b.paper));
    P(c, 1, () => {
      // a schematic coastline: the Mediterranean and the top of Africa, drawn in ink as the camera arrives
      const p = seg(t, s.t0 + .2, s.t0 + 2.6); g.save(); g.strokeStyle = '#3d2716'; g.lineWidth = 4; g.lineJoin = 'round';
      const coast = ragged([[60, 520], [200, 560], [330, 610], [460, 600], [560, 660], [680, 640], [780, 610], [900, 640], [1020, 600]], { amp: 6, seed: 3, open: true, step: 6 });
      const n = Math.floor(p * coast.length); if (n > 1) { g.beginPath(); g.moveTo(...coast[0]); for (let i = 1; i < n; i++) g.lineTo(...coast[i]); g.stroke(); }
      g.globalAlpha = p * .5; g.lineWidth = 1.5; for (let y = 430; y < 560; y += 22) { g.beginPath(); g.moveTo(80, y); g.lineTo(1000, y + 10); g.stroke(); }   // sea hatching
      g.globalAlpha = 1; g.fillStyle = '#3d2716'; g.font = `italic 400 34px ${SERIF}`; g.textAlign = 'center';
      g.globalAlpha = seg(t, s.t0 + 1.4, s.t0 + 2); g.fillText('Mediterranean Sea', 540, 480); g.fillText('Sahara', 560, 900);
      g.globalAlpha = seg(t, s.mali, s.mali + .5); g.font = `700 54px ${SERIF}`; g.fillStyle = '#7a2a1e'; g.fillText('MALI', 470, 1330); g.restore();
      // compass
      g.save(); g.translate(900, 1500); g.globalAlpha = seg(t, s.t0 + 1, s.t0 + 2); g.strokeStyle = '#3d2716'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, i % 2 ? -40 : -80); g.stroke(); } g.restore();
      // the king on a throne, placed on the map like a cut-out
      const k = back(seg(t, s.throne - 1.4, s.throne), 1.4);
      if (k > 0) { g.save(); g.translate(470, 1240); g.scale(k, k); draw(g, b.throne, 0, 0); F.drawKing(g, b.king, 0, 0, .55, t, { raise: .55 * seg(t, s.nugget - .4, s.nugget + .4), staff: true, nugget: t > s.nugget - .3 ? F.nugget : null }); g.restore(); }
      const sk = back(seg(t, s.throne + .8, s.throne + 1.3), 2); if (sk > 0) draw(g, b.seal, 760, 1060, sk, -.2);
    });
  },
  end(t, s) { const c = camOf(s, t), b = B.end, u = t - s.t0;
    P(c, 0, () => draw(g, b.sky)); P(c, .03, () => draw(g, b.sun, s.sun[0], s.sun[1] + u * 8));
    P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .35, () => draw(g, b.far)); P(c, .6, () => { draw(g, b.near); for (let i = 0; i < 5; i++) { const x = 380 + u * 40 - i * 110; F.drawCamel(g, b.camels[i], x, 1300, .45, t, i); if (i < 3) F.drawWalker(g, b.people[i], x + 60, 1302, .45, t, i); } });
    P(c, 1, () => draw(g, b.fore));
    const ck = seg(t, s.card, s.card + .6); if (ck > 0) { const a = caption('MANSA MUSA · 1324', `700 54px ${SERIF}`, 900), bb = caption('follow for more stories of money & history', `italic 400 38px ${SERIF}`, 860);
      draw(g, a.s, (W - a.W) / 2, 520 - (1 - eo(ck)) * 900); const br = brand(); draw(g, br.s, (W - br.w) / 2, 390 - (1 - eo(ck)) * 900); draw(g, bb.s, (W - bb.W) / 2, 700 - (1 - eo(seg(t, s.card + .3, s.card + .9))) * 900); if (CAPT) CAPT.push({ id: 'brand', text: 'THE PRICE OF HISTORY', x0: 150, y0: 390, x1: 930, y1: 474 }, { id: 'card1', text: 'MANSA MUSA · 1324', x0: 100, y0: 520, x1: 980, y1: 600 }, { id: 'card2', text: 'follow for more stories of money & history', x0: 100, y0: 700, x1: 980, y1: 780 }); }
  },
};

// ---------- torn-paper wipe between scenes ----------
const EDGE = ragged([[0, -100], [0, H + 100]], { amp: 9, seed: 99, open: true, step: 6 });
function sceneAt(t) { const L = SC.scenes; let i = L.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = L.length - 1; return i; }
let CAPT = null;
function frame(t) {
  const L = SC.scenes, i = sceneAt(t), s = L[i];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.save(); g.translate(0, -230); R[s.id](t, s); g.restore();
  const nx = L[i + 1], wd = SC.wipe;
  if (nx && t > nx.t0 - wd) {                       // the next sheet slides in from the right with a torn left edge
    const k = eio(seg(t, nx.t0 - wd, nx.t0)), ex = lerp(W + 60, -80, k);
    g.save(); g.beginPath(); g.moveTo(ex + EDGE[0][0], EDGE[0][1]); for (const [x, y] of EDGE) g.lineTo(ex + x + (y % 40), y); g.lineTo(W + 200, H + 100); g.lineTo(W + 200, -100); g.closePath();
    g.shadowColor = 'rgba(30,15,5,.45)'; g.shadowBlur = 24; g.shadowOffsetX = -8; g.fillStyle = '#f7f2e7'; g.fill(); g.shadowColor = 'transparent';
    g.beginPath(); g.moveTo(ex + 5 + EDGE[0][0], EDGE[0][1]); for (const [x, y] of EDGE) g.lineTo(ex + 6 + x * 1.3 + (y % 40), y); g.lineTo(W + 200, H + 100); g.lineTo(W + 200, -100); g.closePath(); g.clip();
    g.translate(0, -230); R[nx.id](nx.t0, nx); g.restore();
  }
  // place label: a small dark torn tag, top-left
  if (s.label) { const lk = eo(seg(t, s.t0 + .3, s.t0 + .9)) * (1 - seg(t, s.t1 - .9, s.t1 - .4)); if (lk > 0) { const ts = tagS(s.label); g.save(); g.globalAlpha = 1; draw(g, ts, 60 - (1 - lk) * 600, 230, 1, -.02); g.restore();
    if (CAPT && lk >= 1) CAPT.push({ id: s.label, text: s.label, x0: 60, y0: 230, x1: 60 + ts.c.width - 40, y1: 290 }); } }
  if (SUBS) { const sb = TL.subs.find(q => t >= q.t0 && t < q.t1); if (sb) { const cp = caption(sb.text, `700 46px ${SERIF}`, 820), a = Math.min(1, (t - sb.t0) / .15);
      draw(g, cp.s, (W - cp.W) / 2, 1390 - cp.H / 2 + (1 - eo(a)) * 40); } }
}

// ---------- sound events ----------
function buildEV() {
  const ev = []; SC.scenes.slice(1).forEach(s => ev.push({ t: s.t0 - SC.wipe, type: 'tear', d: SC.wipe }));
  ev.push({ t: S.cairo_hook.coins.start, type: 'coins', d: 2.0, n: 30 });
  ev.push({ t: S.mali.kingAt - .3, type: 'thump' });
  ev.push({ t: S.gold.glint, type: 'sparkle', d: 1.5 });
  ev.push({ t: S.sahara.t0, type: 'wind', d: S.sahara.t1 - S.sahara.t0 });
  for (let k = 0; k < 20; k++) ev.push({ t: S.sahara.t0 + .4 + k * .55, type: 'step', v: .5 + (k % 2) * .3 });
  S.giving.throws.forEach(th => ev.push({ t: th + .25, type: 'coins', d: .8, n: 6 }));
  ev.push({ t: S.strange.t0 + .3, type: 'hush', d: 3.4 });
  ev.push({ t: S.cheap.pile[0], type: 'coins', d: 2.8, n: 26 }); ev.push({ t: S.cheap.tilt, type: 'creak', d: .9 });
  ev.push({ t: S.cheap.fall, type: 'slide', d: .6 }); ev.push({ t: S.cheap.fall + .2, type: 'fall', d: 1.6 });
  for (let k = 0; k < 12; k++) ev.push({ t: S.cheap.years + k * .2, type: 'page' });
  ev.push({ t: S.shook.shake - .3, type: 'rumble', d: 1.6 });
  ev.push({ t: S.map.t0 + .2, type: 'pen', d: 2.4 }); ev.push({ t: S.map.throne - 1, type: 'thump' }); ev.push({ t: S.map.throne + .9, type: 'stamp' }); ev.push({ t: S.map.nugget, type: 'sparkle', d: 1 });
  ev.push({ t: S.end.card, type: 'slide', d: .6 });
  return ev.sort((a, b) => a.t - b.t).map(e => ({ ...e, t: +e.t.toFixed(3) }));
}
window.DUR = FILM;
window.render = frame;
window.TEXTS = t => { CAPT = []; const sv = SUBS; frame(t); const r = CAPT; CAPT = null; return r; };
await Promise.all([`700 20px "Fraunces"`, `italic 400 20px "Fraunces"`].map(f => document.fonts.load(f, 'AB'))); await document.fonts.ready;
window.EV = buildEV(); frame(0); window.READY = true;

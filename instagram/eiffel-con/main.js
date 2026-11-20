// "The Man Who Sold the Eiffel Tower" — Victor Lustig, Paris 1925. Torn Paper Collage, vertical 1080×1920 for Instagram Reels.
// Scenes and timings come from scenes.json; every shape is a cached torn-paper sprite (paper.js, paris.js).
import { sheet, draw, rect, circle, ellipse, band, profile, grad, caption, ragged, rng } from './paper.js';
import { clamp, lerp, seg, eio, eo, ei, ss, back, monotone } from '/core/lib.js';

await Promise.all([`700 20px "Fraunces"`, `800 20px "Fraunces"`, `italic 400 20px "Fraunces"`].map(f => document.fonts.load(f, 'AB'))); await document.fonts.ready;
const Z = await import('./paris.js');           // after the fonts: the props print text into their sprites
const { C } = Z;
const Q = new URLSearchParams(location.search), SUBS = Q.get('subs') !== '0';
const SC = await (await fetch('scenes.json')).json(), TL = await (await fetch('timeline.json')).json();
const [W, H] = SC.size, FILM = SC.end, SERIF = '"Fraunces", serif';
const S = Object.fromEntries(SC.scenes.map(s => [s.id, s]));
const cv = document.getElementById('c'), g = cv.getContext('2d');

// ---------- shared pieces ----------
const sky = s => sheet(rect(-200, -200, W + 400, H + 400), grad(s.sky.map((c, i) => [i / (s.sky.length - 1), c])), { rim: 0, shadow: 0, crumple: .8, grainK: .5 });
const flat = (c) => sheet(rect(-200, -200, W + 400, H + 400), c, { rim: 0, shadow: 0, crumple: 1, grainK: .6 });
const ground = (base, color, seed, w = W + 1600) => sheet(band(profile('flat', w, base, 30, seed).map(([x, y]) => [x - 800, y]), H + 400), color, { seed, rim: 4.5 });
function clouds(seed, n, ys, col = '#5b6588', col2 = '#7a7f9e') { const r = rng(seed); return Array.from({ length: n }, (_, i) => { const w = 260 + r() * 420, h = 36 + r() * 36;
  return { s: sheet([...profile('hills', w, 0, h, seed + i, 10).map(([x, y]) => [x, y + h * .6]), [w + 40, h * .9], [-40, h * .9]], i % 2 ? col : col2, { seed: seed + i * 3, rim: 3.5, shadow: .15, crumple: .3 }), x: r() * (W + 600) - 300, y: ys[0] + r() * (ys[1] - ys[0]), v: 6 + r() * 10 }; }); }
const stars = (seed, n, y1) => { const r = rng(seed); return Array.from({ length: n }, () => [r() * W, r() * y1, 1 + r() * 2.2, r() * 6]); };
function drawStars(st, t) { g.save(); for (const [x, y, s, ph] of st) { g.globalAlpha = .4 + .4 * Math.sin(t * 2 + ph) ** 2; g.fillStyle = '#efe6cf'; g.fillRect(x, y, s, s); } g.restore(); }
// interior: wallpaper, wainscot, chandelier
const wall = sheet(rect(-200, -200, W + 400, 1500), '#6e2f33', { rim: 0, shadow: 0, crumple: 1, detail: gg => { gg.fillStyle = 'rgba(240,200,140,.12)'; for (let x = -200; x < W + 200; x += 60) gg.fillRect(x, -200, 22, 1700); } });
const wains = sheet(rect(-200, 1050, W + 400, 900), '#3b2420', { seed: 5, rim: 3.5, detail: gg => { gg.strokeStyle = 'rgba(240,200,140,.25)'; gg.lineWidth = 3; for (let x = -160; x < W + 200; x += 200) gg.strokeRect(x, 1090, 160, 140); } });
const chand = sheet([[-120, 0], [120, 0], [90, 40], [40, 60], [-40, 60], [-90, 40]], grad([[0, '#f3d27a'], [1, '#b98a2a']]), { seed: 8, rim: 3, detail: gg => { gg.fillStyle = '#fff4c8'; for (let i = -2; i <= 2; i++) { gg.beginPath(); gg.arc(i * 48, -8, 10, 0, 7); gg.fill(); } } });
const table = sheet([[-470, 0], [470, 0], [540, 230], [-540, 230]], grad([[0, '#2f5a46'], [1, '#22443a']]), { seed: 9, rim: 4, detail: gg => { gg.fillStyle = 'rgba(240,220,160,.3)'; gg.fillRect(-520, 210, 1040, 10); } });
const blueprint = sheet(rect(-150, -220, 300, 440), '#2f4a8a', { seed: 12, rim: 3, detail: gg => { gg.strokeStyle = 'rgba(230,240,255,.85)'; gg.lineWidth = 3; gg.beginPath(); gg.moveTo(-90, 180); gg.quadraticCurveTo(-40, 0, -8, -180); gg.lineTo(8, -180); gg.quadraticCurveTo(40, 0, 90, 180); gg.moveTo(-70, 100); gg.lineTo(70, 100); gg.moveTo(-40, -20); gg.lineTo(40, -20); gg.stroke(); } });

// ---------- cast ----------
const LUSTIG = Z.man(10, { suit: '#3b3f52', hat: 'fedora', tache: true, tie: C.red });
const POISSON = Z.man(20, { suit: '#5a4636', hat: 'bowler', tie: '#2f4a8a', skin: '#e8bf9c' });
const DEALERS = [30, 40, 50, 60].map((s, i) => Z.man(s, { suit: ['#3d4a3a', '#4a3a4a', '#2e3a4e', '#5a4a3a'][i], hat: 'bowler', tie: ['#7a2a22', '#2f4a8a', '#d9a93a', '#efe6cf'][i], skin: [C.skin, C.skin2, '#e8bf9c', C.skin][i] }));
const COPS = [70, 71].map(s => Z.man(s, { suit: C.navy2, hat: 'kepi', cape: true, tie: C.navy2 }));
const TOWER = Z.tower(), TOWER_N = Z.tower('#4a3a40', 6);

// ---------- per-scene sprites ----------
const B = {
  hook: { sky: sky(S.hook), clouds: clouds(3, 6, [300, 800], '#b7a2b2', '#d5b39a'), far: Z.paris(W + 1400, 21, '#4a4a70', .35), near: Z.paris(W + 1400, 22, '#2a3150', .55), quai: ground(1480, '#1f2538', 23), sold1: Z.stamp('SOLD'), sold2: Z.stamp('SOLD AGAIN?', C.red, 560) },
  lustig: { sky: sky(S.lustig), street: ground(1340, '#2a2f44', 31), lamp: sheet([[-8, 0], [8, 0], [6, -620], [30, -640], [30, -700], [-30, -700], [-30, -640], [-6, -620]], '#1a1e2c', { seed: 32, rim: 3, detail: gg => { gg.fillStyle = C.lamp; gg.fillRect(-24, -694, 48, 52); } }), wall: Z.paris(W + 1400, 33, '#20263a', .3) },
  news: { bg: flat(S.news.paper), paper: Z.newspaper(), tower: Z.tower('#5b4a3e', 34) },
  letters: { bg: flat(S.letters.paper), letter: Z.letter(), conf: Z.stamp('CONFIDENTIAL', C.red, 620), env: [0, 1, 2, 3, 4].map(i => Z.envelope(200 + i)) },
  hotel: { sky: sky(S.hotel), stars: stars(4, 60, 700), hotel: Z.hotel(), street: ground(1330, '#22283a', 41), cars: null },
  meeting: {},
  money: { bg: flat(S.money.paper), notes: Array.from({ length: 10 }, (_, i) => Z.banknote(300 + i)) },
  train: { sky: sky(S.train), stars: stars(6, 80, 900), moon: sheet(circle(0, 0, 70, 40), '#efe6cf', { seed: 61, rim: 3, shadow: .1 }), hills: sheet(band(profile('hills', W + 2600, 1180, 140, 62).map(([x, y]) => [x - 800, y]), H + 400), '#151b2c', { seed: 62, rim: 4 }), track: ground(1240, '#0e1220', 63, W + 2600), tr: Z.train() },
  police: { sky: sky(S.police), street: ground(1330, '#1a2034', 71), station: sheet(rect(0, 0, 640, 700), '#3a3f52', { seed: 72, rim: 4, detail: gg => { gg.fillStyle = '#1a1e2c'; gg.fillRect(250, 380, 140, 320); gg.fillStyle = C.lamp; gg.fillRect(80, 120, 90, 110); gg.fillRect(470, 120, 90, 110); gg.fillStyle = '#efe6cf'; gg.font = '800 54px "Fraunces", serif'; gg.textAlign = 'center'; gg.fillText('POLICE', 320, 330); } }), lamp: sheet(circle(0, 0, 26, 24), C.lamp, { seed: 73, rim: 2 }) },
  america: { sky: sky(S.america), far: Z.nyc(W + 900, 81, '#2a3352'), near: Z.nyc(W + 900, 82, '#161c2e'), street: ground(1360, '#121624', 83), notes: Array.from({ length: 8 }, (_, i) => Z.banknote(400 + i)), bars: Array.from({ length: 9 }, (_, i) => Z.bar(1500, 500 + i)) },
  end: { sky: sky(S.end), stars: stars(9, 120, 1000), near: Z.paris(W + 1400, 91, '#0f1424', .4), quai: ground(1480, '#0b0f1c', 92), sign: sheet(rect(-170, -60, 340, 120), '#d9c49a', { seed: 93, rim: 3, shadow: .35, detail: gg => { gg.fillStyle = C.ink; gg.font = '800 44px "Fraunces", serif'; gg.textAlign = 'center'; gg.fillText('NOT FOR SALE', 0, 16); } }) },
};
B.poisson = B.meeting; B.doubts = B.meeting; B.bribe = B.meeting;
B.again = B.hook;
const Q1 = Z.qmark(1), Q2 = Z.qmark(2), CLOCK = Z.clockFace(), BOLT = Z.bolt;
const DREAM = sheet([...ragged(ellipse(0, 0, 330, 200, 40), { amp: 14, seed: 3 })], '#efe6cf', { seed: 14, rim: 3, shadow: .3, detail: gg => { gg.fillStyle = C.ink; gg.font = '800 44px "Fraunces", serif'; gg.textAlign = 'center'; gg.fillText('POISSON BUYS', 0, -20); gg.fillText('THE EIFFEL TOWER!', 0, 34); } });
const OFFICIAL = Z.stamp('OFFICIAL?', '#2f4a8a', 470), TONS = caption('7,000 TONS OF IRON', `800 64px ${SERIF}`, 900), SECRET = Z.stamp('TOP SECRET', C.red, 520), BRIBE_T = caption('a bribe', `italic 400 46px ${SERIF}`, 400);
const LABELS = new Map();
const tagS = text => { if (!LABELS.has(text)) { g.font = `700 30px ${SERIF}`; const m = g.measureText(text).width + text.length * 3.2;
  LABELS.set(text, sheet(rect(0, 0, m + 50, 60), '#efe6cf', { seed: text.length * 31, rim: 2.5, shadow: .35, detail: g2 => { g2.fillStyle = C.ink; g2.font = `700 30px ${SERIF}`; g2.letterSpacing = '3px'; g2.fillText(text, 25, 41); } })); } return LABELS.get(text); };

// ---------- camera & helpers ----------
const CAM = Object.fromEntries(SC.scenes.map(s => [s.id, [1, 2, 3].map(j => monotone(s.cam.map(k => [k[0], k[j]])))]));
const camOf = (s, t) => { const [x, y, z] = CAM[s.id].map(f => f(t)); return { x, y, z }; };
function P(c, d, fn) { g.save(); g.translate(W / 2, H / 2); g.scale(1 + (c.z - 1) * d, 1 + (c.z - 1) * d); g.translate(-W / 2 - c.x * d, -H / 2 - c.y * d); fn(); g.restore(); }
const slam = (t, t0) => { const u = seg(t, t0, t0 + .25); return u <= 0 ? 0 : lerp(1.8, 1, eo(u)); };      // a rubber stamp coming down
function stampAt(sp, t, t0, x, y, rot = -.12) { const k = slam(t, t0); if (k > 0) { g.save(); g.globalAlpha = seg(t, t0, t0 + .1); draw(g, sp, x, y, k, rot); g.restore(); } }
function spot(x, y, r, a = .55) { const gr = g.createRadialGradient(x, y, r * .3, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(8,6,10,${a})`); g.fillStyle = gr; g.fillRect(-300, -300, W + 600, H + 600); }
function meetingRoom(c, t, ppl = true) {
  P(c, .2, () => { draw(g, wall); draw(g, wains); }); P(c, .4, () => { draw(g, blueprint, 880, 640); g.save(); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.beginPath(); g.moveTo(540, -50); g.lineTo(540, 230); g.stroke(); g.restore(); draw(g, chand, 540, 240, 1, Math.sin(t) * .01); });
  P(c, .7, () => { if (ppl) { Z.drawMan(g, DEALERS[0], 190, 1180, 1.05, t, { seated: true }); Z.drawMan(g, POISSON, 380, 1150, .95, t + 1, { seated: true }); Z.drawMan(g, DEALERS[2], 700, 1150, .95, t + 2, { seated: true }); Z.drawMan(g, DEALERS[3], 890, 1180, 1.05, t + 3, { seated: true }); } draw(g, table, 540, 1100); });
}

// ---------- scenes ----------
const R = {
  hook(t, s) { const c = camOf(s, t), b = B.hook;
    P(c, 0, () => draw(g, b.sky)); P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .35, () => draw(g, b.far, -500, 1300)); P(c, .55, () => draw(g, TOWER, 540, 1330, 1.15));
    P(c, .75, () => draw(g, b.near, -450, 1450)); P(c, 1, () => draw(g, b.quai));
    P(c, .55, () => { stampAt(b.sold1, t, s.sold1, 540, 760, -.14); stampAt(b.sold2, t, s.sold2, 540, 930, .08); });
  },
  lustig(t, s) { const c = camOf(s, t), b = B.lustig;
    P(c, 0, () => draw(g, b.sky)); P(c, .3, () => draw(g, b.wall, -500, 1250)); P(c, .7, () => { draw(g, b.street); draw(g, b.lamp, 860, 1330); });
    P(c, .85, () => { const k = back(seg(t, s.t0 + .1, s.t0 + .7), 1.3); Z.drawMan(g, LUSTIG, 470, 1330 + (1 - k) * 700, 2.0, t, { armR: .25 });
      const bk = seg(t, s.bolt - .1, s.bolt + .6); if (bk > 0) { const y = lerp(380, 1250, ei(bk)); draw(g, BOLT, 820, y, 1.3, bk * 6); if (bk >= 1) { g.save(); g.strokeStyle = C.red; g.lineWidth = 8; g.beginPath(); g.moveTo(770, 1200); g.lineTo(870, 1300); g.moveTo(870, 1200); g.lineTo(770, 1300); g.stroke(); g.restore(); } } });
    P(c, 1, () => spot(470, 700, 900, .45));
  },
  news(t, s) { const c = camOf(s, t), b = B.news;
    P(c, 0, () => draw(g, b.bg));
    P(c, .8, () => { const k = eo(seg(t, s.t0 + .1, s.t0 + .8)); g.save(); g.translate(90, 160 + (1 - k) * 1600); g.rotate(-.03 * (1 - k) - .015);
      draw(g, b.paper, 0, 0);
      g.fillStyle = C.ink; g.font = `800 60px ${SERIF}`; g.textAlign = 'center'; const hp = seg(t, 14.0, 15.4);
      g.save(); g.beginPath(); g.rect(40, 180, 820 * hp, 160); g.clip(); g.fillText('THE TOWER IS RUSTING.', 450, 250); g.font = `italic 400 40px ${SERIF}`; g.fillText('Repairs “too costly”, say critics', 450, 310); g.restore();
      draw(g, b.tower, 450, 680, .5);
      const rk = seg(t, s.rust, s.rust + 1.4), r = rng(5); g.fillStyle = 'rgba(176,82,40,.85)'; for (let i = 0; i < 40 * rk; i++) { const yy = 680 - r() * 440, xx = 450 + (r() - .5) * (180 - (680 - yy) * .35); g.beginPath(); g.arc(xx, yy, 5 + r() * 9, 0, 7); g.fill(); }
      g.restore(); });
    P(c, .9, () => { const ck = seg(t, s.cost, s.cost + .4); if (ck > 0) { const cp = caption('TOO COSTLY TO REPAIR', `800 50px ${SERIF}`, 700); draw(g, cp.s, 300, 1040, back(ck, 2), .06); } });
  },
  letters(t, s) { const c = camOf(s, t), b = B.letters;
    P(c, 0, () => draw(g, b.bg));
    P(c, .6, () => { Z.drawMan(g, LUSTIG, 540, 1500, 1.5, t, { armR: .9 * seg(t, s.print, s.print + .5), armL: .4 }); });
    P(c, .9, () => { const k = eo(seg(t, s.print - .2, s.print + .5)), out = seg(t, s.invite, s.invite + .4); if (k > 0 && out < 1) { g.save(); g.translate(220, 200 + (1 - k) * -1400); g.scale(1 - out * .7, 1 - out * .7); g.rotate(.03); draw(g, b.letter, 0, 0); g.restore(); }
      stampAt(b.conf, t, s.official + .3, 540, 760, -.1);
      b.env.forEach((e, i) => { const u = seg(t, s.invite + i * .18, s.invite + i * .18 + 1.1); if (u <= 0 || u >= 1) return; const x = lerp(540, [80, 300, 540, 780, 1000][i], u), y = lerp(620, -120, ei(u)) - Math.sin(u * Math.PI) * 120; draw(g, e, x, y, 1.2, (i - 2) * .3 * u); }); });
  },
  hotel(t, s) { const c = camOf(s, t), b = B.hotel;
    P(c, 0, () => { draw(g, b.sky); drawStars(b.stars, t); }); P(c, .7, () => { draw(g, b.hotel, 40, 560); draw(g, b.street); });
    P(c, .85, () => { for (let i = 0; i < 4; i++) { const x = lerp(-200, 260 + i * 150, eo(seg(t, s.t0 + .4 + i * .3, s.t0 + 1.6 + i * .3))); Z.drawMan(g, DEALERS[i], x, 1350, .8, t + i, { bob: Math.abs(Math.sin(t * 6 + i)) * 3 }); } });
  },
  meeting(t, s) { const c = camOf(s, t);
    meetingRoom(c, t);
    P(c, .8, () => { Z.drawMan(g, LUSTIG, 540, 1120, 1.1, t, { armR: .5 + .2 * Math.sin(t * 2), armL: .2 }); draw(g, table, 540, 1100); });
    P(c, .95, () => { const k = seg(t, s.tons, s.tons + .4); if (k > 0) draw(g, TONS.s, (W - TONS.W) / 2, 300, back(k, 2) * .98 + .02); stampAt(SECRET, t, s.secret, 540, 520, -.12); });
  },
  poisson(t, s) { const c = camOf(s, t);
    meetingRoom(c, t, false);
    P(c, .7, () => { Z.drawMan(g, DEALERS[0], 160, 1180, 1.05, t, { seated: true }); Z.drawMan(g, DEALERS[3], 900, 1180, 1.05, t + 3, { seated: true }); });
    P(c, 1, () => spot(420, 860, 560, .75));
    P(c, .8, () => { Z.drawMan(g, POISSON, 420, 1290, 1.55, t + 1, { seated: true }); draw(g, table, 540, 1100); });
    P(c, .95, () => { const k = back(seg(t, s.dream, s.dream + .6), 1.6); if (k > 0) { draw(g, DREAM, 600, 380, k); for (const [x, y, r] of [[440, 620, 22], [400, 690, 14]]) { g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(x, y, r * k, 0, 7); g.fill(); } } });
  },
  doubts(t, s) { const c = camOf(s, t);
    meetingRoom(c, t, false); P(c, 1, () => spot(420, 860, 520, .82));
    P(c, .8, () => { Z.drawMan(g, POISSON, 420, 1290, 1.55, t + 1, { seated: true, nod: -.15 * Math.sin(t * 3) }); draw(g, table, 540, 1100); });
    P(c, .95, () => { const k1 = back(seg(t, s.q1, s.q1 + .35), 2), k2 = back(seg(t, s.q2, s.q2 + .35), 2);
      if (k1 > 0) draw(g, Q1, 170, 520, k1, -.2); if (k2 > 0) draw(g, Q2, 690, 500, k2 * 1.2, .2);
      const ck = eo(seg(t, s.t0 + .2, s.t0 + .7)); if (ck > 0) { draw(g, CLOCK, 840, 360, ck); g.save(); g.translate(840, 360); g.strokeStyle = C.ink; g.lineCap = 'round'; g.lineWidth = 6; g.rotate(t * 1.1); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -44); g.stroke(); g.lineWidth = 4; g.rotate(t * 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -64); g.stroke(); g.restore(); } });
  },
  bribe(t, s) { const c = camOf(s, t);
    P(c, .2, () => { draw(g, wall); draw(g, wains); }); P(c, .4, () => draw(g, chand, 540, 240));
    P(c, .8, () => { const lean = eo(seg(t, s.confess, s.confess + .8)) * .9;
      Z.drawMan(g, LUSTIG, 300 + lean * 40, 1150, 1.15, t, { seated: true, nod: lean * .3, armR: .9 * seg(t, s.env - .6, s.env) });
      Z.drawMan(g, POISSON, 780, 1150, 1.15, t + 1, { seated: true, nod: Math.max(0, Math.sin((t - s.nod) * 9)) * .6 * (t > s.nod && t < s.nod + 1.1 ? 1 : 0) });
      draw(g, table, 540, 1100);
      const ek = seg(t, s.env, s.env + 1.0); if (ek > 0) { draw(g, B.letters.env[0], lerp(380, 700, eio(ek)), 1170, 1.3, .1); if (ek > .3) draw(g, BRIBE_T.s, 470, 1205, 1, -.04); } });
    P(c, .95, () => stampAt(OFFICIAL, t, s.official, 300, 640, -.12));
  },
  money(t, s) { const c = camOf(s, t), b = B.money;
    P(c, 0, () => draw(g, b.bg));
    P(c, .9, () => { for (const [t0, x, lab, n] of [[s.pay, 330, 'THE TOWER', 6], [s.bribe, 760, 'THE BRIBE', 4]]) { for (let i = 0; i < n; i++) { const u = seg(t, t0 + i * .12, t0 + i * .12 + .4); if (u > 0) draw(g, b.notes[(i + n) % 10], x + (i % 2 ? 10 : -10), lerp(-200, 1000 - i * 34, eo(u)), 1.4, (i % 3 - 1) * .08); }
      if (t > t0 + .5) { const cp = caption(lab, `800 40px ${SERIF}`, 400); draw(g, cp.s, x - cp.W / 2, 1110); } } });
  },
  train(t, s) { const c = camOf(s, t), b = B.train, u = t - s.t0;
    P(c, 0, () => { draw(g, b.sky); drawStars(b.stars, t); draw(g, b.moon, 820, 380); });
    P(c, .4, () => draw(g, b.hills)); P(c, 1, () => draw(g, b.track));
    P(c, 1, () => { const x0 = -300 + u * 420; for (let i = 3; i >= 1; i--) { draw(g, b.tr.car, x0 - i * 310, 1236); for (const wx of [50, 250]) draw(g, b.tr.wheel, x0 - i * 310 + wx, 1240, 1, u * 8); }
      draw(g, b.tr.loco, x0, 1236); for (const wx of [60, 160, 280]) draw(g, b.tr.wheel, x0 + wx, 1240, 1, u * 8);
      for (let i = 0; i < 7; i++) { const a = (u * 1.6 + i / 7) % 1; draw(g, b.tr.puff, x0 + 64 - a * 260, 1050 - a * 260, .4 + a * 1.3); } });
  },
  police(t, s) { const c = camOf(s, t), b = B.police;
    P(c, 0, () => draw(g, b.sky)); P(c, .6, () => { draw(g, b.station, 400, 640); draw(g, b.street); draw(g, b.lamp, 650, 610); });
    P(c, .85, () => { const away = eio(seg(t, s.away, s.away + 2.2)); Z.drawMan(g, POISSON, lerp(360, -120, away), 1340, 1.4, t, { bob: away > 0 && away < 1 ? Math.abs(Math.sin(t * 7)) * 5 : 0, nod: .25 }); });
    P(c, 1, () => spot(650, 700, 700, .5));
  },
  again(t, s) { const c = camOf(s, t), b = B.hook;
    P(c, 0, () => draw(g, b.sky)); P(c, .1, () => b.clouds.forEach(k => draw(g, k.s, ((k.x + t * k.v) % (W + 700)) - 350, k.y)));
    P(c, .35, () => draw(g, b.far, -500, 1300)); P(c, .55, () => draw(g, TOWER, 540, 1330, 1.15)); P(c, .75, () => draw(g, b.near, -450, 1450)); P(c, 1, () => draw(g, b.quai));
    P(c, .55, () => stampAt(b.sold2, t, s.again, 540, 760, .08));
    P(c, .9, () => { const sl = eio(seg(t, s.slip, s.slip + 1.2));
      Z.drawMan(g, LUSTIG, lerp(260, -260, sl), 1500, .95, t, { bob: sl > 0 && sl < 1 ? Math.abs(Math.sin(t * 8)) * 6 : 0 });
      Z.drawMan(g, DEALERS[2], 560, 1500, .9, t + 2); Z.drawMan(g, DEALERS[3], 700, 1500, .9, t + 3);
      COPS.forEach((cp, i) => { const k = eo(seg(t, s.cops + i * .3, s.cops + 1.2 + i * .3)); if (k > 0) Z.drawMan(g, cp, lerp(1300, 860 + i * 120, k), 1500, 1.0, t, { bob: k < 1 ? Math.abs(Math.sin(t * 9 + i)) * 7 : 0, armR: i === 0 ? 1.2 : 0 }); }); });
  },
  america(t, s) { const c = camOf(s, t), b = B.america;
    P(c, 0, () => draw(g, b.sky)); P(c, .35, () => draw(g, b.far, -300, 1250)); P(c, .7, () => { draw(g, b.near, -400, 1360); draw(g, b.street); });
    P(c, .9, () => { b.notes.forEach((n, i) => { const u = (t * .35 + i / 8) % 1, k = seg(t, s.print - .4, s.print + .4); if (k > 0) draw(g, n, 100 + i * 120 + Math.sin(u * 6 + i) * 40, lerp(-150, 1300, u), 1.1 * k, u * 4 + i); }); });
    P(c, 1, () => { const k = seg(t, s.caught, s.caught + .35); if (k > 0) b.bars.forEach((br, i) => draw(g, br, 60 + i * 120, lerp(-200, 1550, eo(k)) + (i % 2) * 10)); });
  },
  end(t, s) { const c = camOf(s, t), b = B.end;
    P(c, 0, () => { draw(g, b.sky); drawStars(b.stars, t); }); P(c, .55, () => draw(g, TOWER_N, 540, 1330, 1.15)); P(c, .75, () => draw(g, b.near, -450, 1450)); P(c, 1, () => draw(g, b.quai));
    P(c, .55, () => { const k = back(seg(t, s.sign, s.sign + .5), 1.6); if (k > 0) { g.save(); g.strokeStyle = '#d9c49a'; g.lineWidth = 3; g.beginPath(); g.moveTo(470, 1120 - 140 * k); g.lineTo(440, 1060); g.moveTo(610, 1120 - 140 * k); g.lineTo(640, 1060); g.stroke(); g.restore(); draw(g, b.sign, 540, 1120, k, Math.sin(t * 2) * .04); } });
    const ck = seg(t, s.card, s.card + .6); if (ck > 0) { const a = caption('THE MAN WHO SOLD THE EIFFEL TOWER', `800 50px ${SERIF}`, 900), bb = caption('follow for more stories of money & history', `italic 400 38px ${SERIF}`, 860);
      draw(g, a.s, (W - a.W) / 2, 300 - (1 - eo(ck)) * 900); draw(g, bb.s, (W - bb.W) / 2, 300 + a.H + 30 - (1 - eo(seg(t, s.card + .2, s.card + .8))) * 900);
      if (CAPT) CAPT.push({ id: 'card1', text: 'THE MAN WHO SOLD THE EIFFEL TOWER', x0: 90, y0: 300, x1: 990, y1: 380 }, { id: 'card2', text: 'follow for more stories of money & history', x0: 100, y0: 420, x1: 980, y1: 500 }); }
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
  for (const [t] of [[S.hook.sold1], [S.hook.sold2], [S.letters.official + .3], [S.meeting.secret], [S.bribe.official], [S.again.again]]) ev.push({ t, type: 'stamp' });
  ev.push({ t: S.lustig.t0 + .1, type: 'steps', d: .7 }); ev.push({ t: S.lustig.bolt + .55, type: 'clank' });
  ev.push({ t: S.news.t0 + .1, type: 'paper', d: .7 }); ev.push({ t: S.news.rust, type: 'creak', d: 1.4 });
  ev.push({ t: S.letters.print - .2, type: 'paper', d: .6 }); for (let i = 0; i < 5; i++) ev.push({ t: S.letters.invite + i * .18, type: 'whoosh', d: .5 });
  ev.push({ t: S.hotel.t0 + .4, type: 'steps', d: 2.2 });
  ev.push({ t: S.meeting.tons, type: 'thud' });
  ev.push({ t: S.poisson.dream, type: 'dream', d: 1.4 });
  ev.push({ t: S.doubts.t0 + .2, type: 'tick', d: 4.0 });
  ev.push({ t: S.bribe.env, type: 'slide', d: 1.0 }); ev.push({ t: S.money.pay, type: 'notes', d: 1.0 }); ev.push({ t: S.money.bribe, type: 'notes', d: .7 });
  ev.push({ t: S.train.t0, type: 'train', d: 3.6 });
  ev.push({ t: S.police.away, type: 'steps', d: 2.2 });
  ev.push({ t: S.again.cops, type: 'whistle', d: 1.0 }); ev.push({ t: S.again.cops, type: 'steps', d: 1.5 }); ev.push({ t: S.again.slip, type: 'whoosh', d: 1.0 });
  ev.push({ t: S.america.caught, type: 'bars' }); ev.push({ t: S.america.print - .3, type: 'press', d: 2.0 });
  ev.push({ t: S.end.sign, type: 'creak', d: .6 }); ev.push({ t: S.end.card, type: 'slide', d: .6 });
  return ev.sort((a, b) => a.t - b.t).map(e => ({ ...e, t: +e.t.toFixed(3) }));
}
window.DUR = FILM; window.render = frame;
window.TEXTS = t => { CAPT = []; frame(t); const r = CAPT; CAPT = null; return r; };
window.EV = buildEV(); frame(0); window.READY = true;

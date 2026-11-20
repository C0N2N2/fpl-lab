// Cut-paper figures and set pieces for "Mansa Musa". Static pieces are single sprites; walkers and camels are
// jointed puppets (body + swinging legs), like paper marionettes.
import { sheet, draw, rect, circle, ellipse, rng, grad } from './paper.js';

const C = { ink: '#2b1d16', robe: '#f3ead6', gold: '#e8b33a', gold2: '#c98b1f', indigo: '#2f3d6b', red: '#a8382b', camel: '#c48a52', camel2: '#a8703f', skin: '#6b4026', skin2: '#7c4b2d' };
export const COL = C;

// ---------- camel (faces right; origin at the feet line, centre) ----------
export function camel(seed = 1, load = 'gold') {
  const body = sheet([[-70, -120], [-50, -150], [-20, -165], [5, -150], [20, -128], [55, -125], [70, -110], [62, -90], [-62, -88], [-78, -100]], C.camel, { seed, rim: 3 });
  const neck = sheet([[50, -120], [80, -150], [92, -195], [104, -205], [130, -200], [134, -188], [112, -184], [100, -150], [78, -105]], C.camel, { seed: seed + 1, rim: 3 });
  const leg = sheet(rect(-6, 0, 12, 92), C.camel2, { seed: seed + 2, rim: 2, shadow: .15 });
  const sack = load === 'gold' ? sheet([[-48, -170], [8, -172], [16, -138], [-56, -136]], grad([[0, C.gold], [1, C.gold2]]), { seed: seed + 3, rim: 3 }) : null;
  const blanket = sheet([[-60, -142], [30, -142], [36, -108], [-66, -108]], C.red, { seed: seed + 4, rim: 2.5 });
  return { body, neck, leg, sack, blanket };
}
export function drawCamel(g, P, x, y, k, t, phase = 0) {
  const w = t * 5.2 + phase;           // gait
  g.save(); g.translate(x, y); g.scale(k, k);
  const legs = [[-52, 0], [-36, Math.PI], [40, Math.PI * .5], [56, Math.PI * 1.5]];
  for (const [lx, ph] of legs) draw(g, P.leg, lx, -95, 1, Math.sin(w + ph) * .38, 0, 0);
  const bob = Math.abs(Math.sin(w)) * 3;
  g.translate(0, -bob);
  draw(g, P.body, 0, 0); draw(g, P.blanket, 0, 0); if (P.sack) draw(g, P.sack, 0, 0);
  draw(g, P.neck, 0, 0, 1, Math.sin(w * 2) * .03, 70, -110);
  g.restore();
}

// ---------- a walking person in a robe (faces right; origin at the feet) ----------
export function walker(seed = 1, robe = C.robe, wrap = C.indigo, skin = C.skin) {
  return {
    robe: sheet([[-20, -118], [16, -118], [30, -14], [-30, -14]], robe, { seed, rim: 2.5 }),
    head: sheet(circle(0, -132, 13, 24), skin, { seed: seed + 1, rim: 2 }),
    wrap: sheet([[-16, -146], [16, -150], [14, -136], [-14, -132]], wrap, { seed: seed + 2, rim: 2 }),
    leg: sheet(rect(-4, 0, 9, 22), skin, { seed: seed + 3, rim: 1.5, shadow: .1 }),
  };
}
export function drawWalker(g, P, x, y, k, t, phase = 0, walking = true, arm = 0) {
  const w = t * 6.5 + phase; g.save(); g.translate(x, y); g.scale(k, k);
  if (walking) { draw(g, P.leg, -8, -20, 1, Math.sin(w) * .45); draw(g, P.leg, 8, -20, 1, -Math.sin(w) * .45); } else { draw(g, P.leg, -8, -20); draw(g, P.leg, 8, -20); }
  const bob = walking ? Math.abs(Math.sin(w)) * 2 : 0; g.translate(0, -bob);
  draw(g, P.robe, 0, 0); draw(g, P.head, 0, 0); draw(g, P.wrap, 0, 0);
  if (arm) { g.save(); g.strokeStyle = C.ink; g.lineWidth = 0; g.restore(); }
  g.restore();
}

// ---------- the king: tall, a white and gold robe, a golden crown, a staff (front-facing, origin at the feet) ----------
export function king(seed = 40) {
  const robe = sheet([[-70, -330], [70, -330], [110, 0], [-110, 0]], grad([[0, '#f6eedb'], [1, '#e9dcc0']]), { seed, rim: 4, detail: g => {
    g.fillStyle = C.gold; for (let i = 0; i < 9; i++) g.fillRect(-100 + i * 2, -22 - i * 36, 200 - i * 4, 7);          // gold bands
    g.fillStyle = C.gold2; g.fillRect(-8, -330, 16, 330); } });
  const cape = sheet([[-80, -330], [80, -330], [140, -40], [-140, -40]], grad([[0, '#c98b1f'], [1, '#9a6512']]), { seed: seed + 1, rim: 4 });
  const head = sheet(ellipse(0, -372, 34, 42, 40), C.skin, { seed: seed + 2, rim: 3, detail: g => {
    g.fillStyle = '#2a1810'; g.fillRect(-18, -380, 10, 4); g.fillRect(8, -380, 10, 4); g.fillRect(-9, -352, 18, 3);     // a calm face, three strokes
    g.fillStyle = '#1e120c'; g.beginPath(); g.ellipse(0, -334, 26, 18, 0, 0, Math.PI); g.fill(); } });                    // beard
  const crown = sheet([[-40, -408], [-40, -440], [-26, -424], [-13, -452], [0, -428], [13, -452], [26, -424], [40, -440], [40, -408]], grad([[0, '#f6cf5a'], [1, C.gold2]]), { seed: seed + 3, rim: 3 });
  const staff = sheet(rect(-5, -430, 10, 430), C.gold2, { seed: seed + 4, rim: 2 });
  const orb = sheet(circle(0, -440, 16, 30), grad([[0, '#ffe08a'], [1, C.gold2]]), { seed: seed + 5, rim: 2.5 });
  const arm = sheet([[-14, 0], [14, 0], [12, 120], [-12, 120]], '#efe3c8', { seed: seed + 6, rim: 2.5 });
  const hand = sheet(circle(0, 128, 14, 20), C.skin, { seed: seed + 7, rim: 2 });
  return { robe, cape, head, crown, staff, orb, arm, hand };
}
export function drawKing(g, P, x, y, k, t, { raise = 0, staff = true, nugget = null } = {}) {
  g.save(); g.translate(x, y); g.scale(k, k);
  draw(g, P.cape, 0, 0); if (staff) { draw(g, P.staff, 120, 0); draw(g, P.orb, 120, 0); }
  draw(g, P.robe, 0, 0);
  // right arm (viewer's left) can rise to throw
  g.save(); g.translate(-66, -300); g.rotate(.15 + raise * 2.2); draw(g, P.arm, 0, 0); draw(g, P.hand, 0, 0); if (nugget) draw(g, nugget, 0, 140); g.restore();
  g.save(); g.translate(66, -300); g.rotate(-.15); draw(g, P.arm, 0, 0); draw(g, P.hand, 0, 0); g.restore();
  draw(g, P.head, 0, 0, 1, Math.sin(t * .8) * .02, 0, -340); draw(g, P.crown, 0, 0, 1, Math.sin(t * .8) * .02, 0, -340);
  g.restore();
}

// ---------- coins and nuggets ----------
export const coins = Array.from({ length: 6 }, (_, i) => sheet(circle(0, 0, 18, 28), grad([[0, '#ffe08a'], [.6, C.gold], [1, C.gold2]]), { seed: 300 + i, rim: 2, shadow: .2, detail: g => {
  g.strokeStyle = 'rgba(120,70,10,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.stroke(); } }));
export const nugget = sheet([[-22, -10], [-8, -24], [14, -20], [26, -2], [16, 18], [-12, 20], [-26, 6]], grad([[0, '#ffe7a0'], [1, C.gold2]]), { seed: 333, rim: 2.5 });

// ---------- set pieces ----------
export function palm(seed, h = 300) {
  const trunk = sheet([[-8, 0], [8, 0], [14, -h], [2, -h]], '#7a5232', { seed, rim: 2 });
  const fronds = []; const r = rng(seed);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .45 + (r() - .5) * .2, L = 120 + r() * 50;
    const tip = [Math.cos(a) * L, Math.sin(a) * L * .6 + 30];
    fronds.push(sheet([[0, 0], [tip[0] * .5 - 12, tip[1] * .5 - 20], [tip[0], tip[1]], [tip[0] * .5 + 12, tip[1] * .5 + 6]].map(([x, y]) => [x + 8, y - h]), i % 2 ? '#4f6b3a' : '#5f7d44', { seed: seed + i + 1, rim: 2 })); }
  return { trunk, fronds };
}
export function drawPalm(g, P, x, y, k = 1, t = 0) { g.save(); g.translate(x, y); g.scale(k, k); draw(g, P.trunk, 0, 0); P.fronds.forEach((f, i) => draw(g, f, 0, 0, 1, Math.sin(t * 1.3 + i) * .02, 8, -300)); g.restore(); }
export function pyramid(w, h, seed) {
  return sheet([[-w / 2, 0], [0, -h], [w / 2, 0]], (g, x0, y0, x1, y1) => { g.fillStyle = '#d9a35f'; g.fillRect(x0 - 30, y0 - 30, x1 - x0 + 60, y1 - y0 + 60);
    g.fillStyle = '#b97f45'; g.beginPath(); g.moveTo(0, -h); g.lineTo(w / 2, 0); g.lineTo(w * .08, 0); g.closePath(); g.fill(); }, { seed, rim: 3 });
}
// Mali mud mosque: a tall facade with buttress towers and wooden beams (toron) sticking out
export function mosque(seed = 70) {
  const P = [[-260, 0], [-260, -190], [-240, -210], [-220, -190], [-170, -190], [-170, -260], [-140, -300], [-110, -260], [-110, -200], [-30, -200], [-30, -330], [0, -380], [30, -330], [30, -200], [110, -200], [110, -260], [140, -300], [170, -260], [170, -190], [220, -190], [240, -210], [260, -190], [260, 0]];
  return sheet(P, grad([[0, '#c98a54'], [1, '#a8693b']]), { seed, rim: 4, detail: g => {
    g.fillStyle = '#5a3a24'; for (const [x0, y0, h] of [[-140, -280, 260], [0, -350, 330], [140, -280, 260]]) for (let y = y0; y < -30; y += 34) { g.fillRect(x0 - 26, y, 52, 5); }
    g.fillStyle = '#3d2716'; g.beginPath(); g.ellipse(0, -10, 34, 70, 0, Math.PI, 0); g.fill(); } });
}
// Cairo skyline: domes and minarets in one sheet
export function cairo(w, seed, color) {
  const r = rng(seed), P = [[0, 0]]; let x = 0;
  while (x < w) {
    const kind = r(); const bw = 60 + r() * 90, bh = 120 + r() * 160;
    if (kind < .25) { const mh = bh + 160 + r() * 120; P.push([x, -bh], [x + 12, -bh], [x + 14, -mh], [x + 20, -mh - 30], [x + 26, -mh], [x + 28, -bh], [x + 40, -bh]); x += 40; }
    else if (kind < .55) { const dr = bw * .45; P.push([x, -bh]); for (let a = Math.PI; a >= 0; a -= Math.PI / 12) P.push([x + bw / 2 + Math.cos(a) * dr, -bh - Math.sin(a) * dr * 1.15]); P.push([x + bw, -bh]); x += bw; }
    else { P.push([x, -bh], [x + bw, -bh]); x += bw; }
    P.push([x, -40 - r() * 60]);
  }
  P.push([x, 0]);
  return sheet(P, color, { seed, rim: 3.5, detail: g => { g.fillStyle = 'rgba(255,200,120,.9)'; const q = rng(seed + 9); for (let i = 0; i < w / 18; i++) { const wx = q() * w, wy = -30 - q() * 160; g.fillRect(wx, wy, 6, 9); } } });
}
export function acacia(seed) {
  const trunk = sheet([[-6, 0], [6, 0], [4, -90], [40, -150], [34, -156], [0, -110], [-34, -158], [-40, -152], [-4, -90]], '#5b3b26', { seed, rim: 2 });
  const crown = sheet([[-120, -150], [-60, -190], [40, -196], [130, -160], [100, -140], [-100, -136]], '#6f7d3c', { seed: seed + 1, rim: 2.5 });
  return { trunk, crown };
}

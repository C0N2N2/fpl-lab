// Cut-paper figures and set pieces for "Tulip Mania" (Holland, 1637).
import { sheet, draw, rect, circle, ellipse, rng, grad, ragged } from './paper.js';

export const C = { ink: '#231a16', cream: '#efe6cf', red: '#c8302a', red2: '#9a2420', yellow: '#e8b83a', pink: '#d9718a', stem: '#4f6b3a', leaf: '#5f7d44', brown: '#5a3a24', teal: '#2f4f4a', sky: '#9fb8c4', gold: '#e8b33a', gold2: '#c98b1f', black: '#26211e', skin: '#e2b48f', skin2: '#c98f6a' };

// ---------- tulips (origin at the stem's foot) ----------
export function tulip(seed, color, flame = null, h = 260) {
  const stem = sheet([[-5, 0], [5, 0], [4, -h], [-4, -h]], C.stem, { seed, rim: 2, shadow: .15 });
  const leafL = sheet([[0, -10], [-34, -90], [-46, -170], [-14, -110], [0, -40]], C.leaf, { seed: seed + 1, rim: 2.5 });
  const leafR = sheet([[0, -20], [30, -110], [40, -190], [12, -120], [0, -60]], C.stem, { seed: seed + 2, rim: 2.5 });
  const cup = sheet([[-46, -h + 20], [-54, -h - 40], [-34, -h - 96], [-18, -h - 60], [0, -h - 104], [18, -h - 60], [34, -h - 96], [54, -h - 40], [46, -h + 20], [0, -h + 34]], flame ? '#f6efe2' : color, { seed: seed + 3, rim: 3, detail: flame ? g => {
    g.fillStyle = flame; const r = rng(seed);
    for (let i = 0; i < 9; i++) { const x0 = -44 + i * 11 + (r() - .5) * 6; g.beginPath(); g.moveTo(x0, -h + 26); for (let y = -h + 26; y > -h - 104; y -= 8) g.lineTo(x0 + Math.sin(y * .09 + i) * 6 + (r() - .5) * 4, y); for (let y = -h - 104; y < -h + 26; y += 8) g.lineTo(x0 + 4 + Math.sin(y * .09 + i + 1) * 5, y); g.closePath(); g.fill(); }
  } : g => { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(0, -h + 34); g.lineTo(18, -h - 60); g.lineTo(46, -h + 20); g.fill(); } });
  return { stem, leafL, leafR, cup, h };
}
export function drawTulip(g, T, x, y, k = 1, t = 0, { grow = 1, droop = 0, sway = .03 } = {}) {
  if (grow <= 0) return;
  g.save(); g.translate(x, y); g.scale(k, k * grow); const s = Math.sin(t * 1.3 + x * .01) * sway + droop * .9;
  draw(g, T.leafL, 0, 0); draw(g, T.leafR, 0, 0);
  g.save(); g.rotate(s * .5); draw(g, T.stem, 0, 0); g.translate(0, -T.h * (1 - Math.cos(s) * .02)); g.rotate(s * .6 + droop * .5); g.translate(0, T.h); draw(g, T.cup, 0, 0); g.restore();
  g.restore();
}
export const bulb = (seed) => sheet([[0, -70], [22, -48], [40, -10], [36, 24], [14, 38], [-14, 38], [-36, 24], [-40, -10], [-22, -48]], grad([[0, '#c99a6a'], [1, '#8a5a36']]), { seed, rim: 3, detail: g => {
  g.strokeStyle = 'rgba(60,30,10,.4)'; g.lineWidth = 2; for (const x of [-18, 0, 18]) { g.beginPath(); g.moveTo(x * .3, -66); g.quadraticCurveTo(x, 0, x * .6, 36); g.stroke(); }
  g.fillStyle = '#d8c3a0'; for (let i = -3; i <= 3; i++) g.fillRect(i * 8, 36, 3, 14); } });

// ---------- windmill (origin at the base) ----------
export function windmill(seed = 30) {
  const body = sheet([[-70, 0], [70, 0], [44, -300], [-44, -300]], '#5a4636', { seed, rim: 3.5, detail: g => { g.fillStyle = '#2b211b'; g.fillRect(-18, -80, 36, 80); g.fillStyle = '#f5cf7a'; g.fillRect(-14, -200, 28, 34); } });
  const cap = sheet([[-56, -296], [56, -296], [30, -350], [-30, -350]], '#3a2c24', { seed: seed + 1, rim: 3 });
  const sail = sheet([[-14, 0], [14, 0], [22, -230], [-6, -230]], '#e9dcc0', { seed: seed + 2, rim: 2.5, detail: g => { g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = 2; for (let y = -20; y > -230; y -= 22) { g.beginPath(); g.moveTo(-10, y); g.lineTo(20, y); g.stroke(); } } });
  return { body, cap, sail };
}
export function drawWindmill(g, M, x, y, k, t) { g.save(); g.translate(x, y); g.scale(k, k); draw(g, M.body, 0, 0); draw(g, M.cap, 0, 0);
  g.save(); g.translate(0, -330); g.rotate(t * .6); for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); draw(g, M.sail, 0, 0); } g.restore();
  g.fillStyle = '#231a16'; g.beginPath(); g.arc(0, -330, 10, 0, 7); g.fill(); g.restore(); }

// ---------- Amsterdam canal houses (stepped and bell gables), one sheet ----------
export function canalHouses(w, seed, colors = ['#7a3b2e', '#5a4636', '#3e4a3c', '#8a5a3c', '#4a3a3a'], lit = .4) {
  const r = rng(seed), out = []; let x = 0;
  while (x < w) { const bw = 110 + r() * 50, bh = 320 + r() * 160, kind = r(), c = colors[Math.floor(r() * colors.length)];
    let P;
    if (kind < .5) { const s = bw / 7; P = [[x, 0], [x, -bh]]; for (let i = 1; i <= 3; i++) P.push([x + s * i - s, -bh - (i - 1) * 34], [x + s * i, -bh - (i - 1) * 34], [x + s * i, -bh - i * 34]); P.push([x + s * 4, -bh - 3 * 34 - 10]); for (let i = 3; i >= 1; i--) P.push([x + bw - s * i, -bh - i * 34], [x + bw - s * i, -bh - (i - 1) * 34], [x + bw - s * i + s, -bh - (i - 1) * 34]); P.push([x + bw, -bh], [x + bw, 0]); }
    else { P = [[x, 0], [x, -bh], [x + bw * .15, -bh]]; for (let a = Math.PI; a >= 0; a -= Math.PI / 10) P.push([x + bw / 2 + Math.cos(a) * bw * .35, -bh - 30 - Math.sin(a) * 90]); P.push([x + bw * .85, -bh], [x + bw, -bh], [x + bw, 0]); }
    out.push({ s: sheet(P, c, { seed: seed + out.length, rim: 3, detail: g => { const q = rng(seed + out.length * 3); for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { g.fillStyle = q() < lit ? '#f5cf7a' : '#2b2a2e'; g.fillRect(x + 18 + col * (bw - 36) / 3, -bh + 40 + row * (bh - 80) / 4, (bw - 36) / 3 - 14, (bh - 80) / 4 - 22); } g.fillStyle = '#efe6cf'; g.fillRect(x + bw / 2 - 3, -bh - 20, 6, 14); } }) });
    x += bw + 2; }
  return out;
}
export const drawRow = (g, row, x, y, k = 1) => { g.save(); g.translate(x, y); g.scale(k, k); row.forEach(h => draw(g, h.s, 0, 0)); g.restore(); };

// ---------- a 17th-century Dutch trader: wide black hat, white collar (front view, origin at the feet) ----------
export function trader(seed, { coat = C.black, skin = C.skin, beard = false } = {}) {
  const o = { seed, rim: 3 };
  return {
    legs: sheet([[-36, -170], [36, -170], [32, 0], [6, 0], [0, -120], [-6, 0], [-32, 0]], '#2b211b', { ...o, seed: seed + 1 }),
    coat: sheet([[-56, -330], [56, -330], [74, -140], [-74, -140]], coat, { ...o, detail: g => { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-2, -320, 4, 170); } }),
    collar: sheet([[-62, -336], [62, -336], [48, -300], [0, -290], [-48, -300]], '#f4efe6', { ...o, seed: seed + 7 }),
    head: sheet(ellipse(0, -370, 29, 36, 36), skin, { ...o, seed: seed + 2, detail: g => { g.fillStyle = '#2a1810'; g.fillRect(-15, -378, 9, 4); g.fillRect(6, -378, 9, 4); if (beard) { g.beginPath(); g.moveTo(-14, -352); g.lineTo(14, -352); g.lineTo(0, -326); g.closePath(); g.fill(); } else g.fillRect(-7, -352, 14, 3); } }),
    hat: sheet([[-64, -398], [64, -398], [58, -388], [-58, -388]], C.black, { ...o, seed: seed + 3 }),
    crown: sheet([[-30, -396], [-26, -446], [26, -446], [30, -396]], C.black, { ...o, seed: seed + 4, detail: g => { g.fillStyle = '#c9a24a'; g.fillRect(-30, -410, 60, 7); } }),
    arm: sheet([[-11, 0], [11, 0], [10, 150], [-10, 150]], coat, { ...o, seed: seed + 5 }),
    hand: sheet(circle(0, 158, 12, 18), skin, { ...o, seed: seed + 6, rim: 2 }),
  };
}
export function drawTrader(g, M, x, y, k = 1, t = 0, { armL = 0, armR = 0, nod = 0, seated = false, held = null, heldL = null } = {}) {
  g.save(); g.translate(x, y); g.scale(k, k);
  if (!seated) draw(g, M.legs, 0, 0);
  g.save(); g.translate(58, -320); g.rotate(-.12 - armR); draw(g, M.arm, 0, 0); draw(g, M.hand, 0, 0); if (held) draw(g, held, 0, 175); g.restore();
  g.save(); g.translate(-58, -320); g.rotate(.12 + armL); draw(g, M.arm, 0, 0); draw(g, M.hand, 0, 0); if (heldL) draw(g, heldL, 0, 175); g.restore();
  draw(g, M.coat, 0, 0); draw(g, M.collar, 0, 0);
  const tilt = Math.sin(t * .9) * .02 + nod * .18;
  draw(g, M.head, 0, 0, 1, tilt, 0, -340); draw(g, M.hat, 0, 0, 1, tilt, 0, -340); draw(g, M.crown, 0, 0, 1, tilt, 0, -340);
  g.restore();
}

// ---------- props ----------
export const coins = Array.from({ length: 6 }, (_, i) => sheet(circle(0, 0, 18, 28), grad([[0, '#ffe08a'], [.6, C.gold], [1, C.gold2]]), { seed: 300 + i, rim: 2, shadow: .2, detail: g => { g.strokeStyle = 'rgba(120,70,10,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.stroke(); } }));
export const diamond = sheet([[-60, -20], [-34, -50], [34, -50], [60, -20], [0, 60]], grad([[0, '#e8f4ff'], [1, '#9cc4e6']]), { seed: 321, rim: 3, detail: g => { g.strokeStyle = 'rgba(60,90,130,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-60, -20); g.lineTo(60, -20); g.moveTo(-34, -50); g.lineTo(-20, -20); g.lineTo(0, 60); g.lineTo(20, -20); g.lineTo(34, -50); g.stroke(); } });
export const slip = (seed) => sheet(rect(-60, -40, 120, 80), '#f2e8d2', { seed, rim: 2, shadow: .3, detail: g => { g.fillStyle = 'rgba(35,26,22,.6)'; for (let y = -26; y < 30; y += 12) g.fillRect(-46, y, 70 + (y % 24 ? -20 : 0), 3); g.fillStyle = C.red; g.beginPath(); g.arc(36, 22, 8, 0, 7); g.fill(); } });
export function ottoman(w, seed, color) {
  const r = rng(seed), P = [[0, 0]]; let x = 0;
  while (x < w) { const kind = r(), bw = 60 + r() * 90, bh = 120 + r() * 140;
    if (kind < .3) { const mh = bh + 180 + r() * 100; P.push([x, -bh], [x + 12, -bh], [x + 14, -mh], [x + 20, -mh - 40], [x + 26, -mh], [x + 28, -bh], [x + 40, -bh]); x += 40; }
    else if (kind < .7) { const dr = bw * .5; P.push([x, -bh]); for (let a = Math.PI; a >= 0; a -= Math.PI / 12) P.push([x + bw / 2 + Math.cos(a) * dr, -bh - Math.sin(a) * dr * .8]); P.push([x + bw, -bh]); x += bw; }
    else { P.push([x, -bh], [x + bw, -bh]); x += bw; }
    P.push([x, -40 - r() * 50]); }
  P.push([x, 0]);
  return sheet(P, color, { seed, rim: 3.5 });
}
export const chair = (seed) => sheet([[-40, 0], [-30, 0], [-30, -80], [30, -80], [30, 0], [40, 0], [40, -100], [36, -200], [-36, -200], [-40, -100]], '#4a3324', { seed, rim: 2.5, detail: g => { g.fillStyle = '#7a2a22'; g.fillRect(-30, -190, 60, 80); } });
export const lectern = sheet([[-80, 0], [80, 0], [60, -260], [100, -300], [-100, -300], [-60, -260]], '#4a3324', { seed: 401, rim: 3, detail: g => { g.fillStyle = 'rgba(240,200,140,.25)'; g.fillRect(-60, -240, 120, 6); } });
export const gavel = sheet([[-40, -14], [40, -14], [40, 14], [-40, 14]], '#6a4630', { seed: 402, rim: 2 });
export const book = sheet(rect(0, 0, 640, 440), '#efe6cf', { seed: 403, rim: 3, shadow: .4, detail: g => {
  g.fillStyle = '#7a2a22'; g.fillRect(316, 0, 8, 440);
  g.fillStyle = '#231a16'; g.textAlign = 'center'; g.font = '800 58px "Fraunces", serif'; g.fillText('RUIN!', 160, 120); g.font = 'italic 400 24px "Fraunces", serif'; g.fillText('the tulip madness', 160, 160); g.fillText('as told in 1841', 160, 192);
  g.fillStyle = 'rgba(35,26,22,.5)'; for (let y = 230; y < 400; y += 18) g.fillRect(40, y, 240, 5); for (let y = 60; y < 400; y += 18) g.fillRect(360, y, 240, 5); } });
export const ledger = sheet(rect(0, 0, 640, 440), '#e8dcbc', { seed: 404, rim: 3, shadow: .4, detail: g => {
  g.strokeStyle = 'rgba(35,26,22,.35)'; g.lineWidth = 1.5; for (let y = 50; y < 420; y += 26) { g.beginPath(); g.moveTo(30, y); g.lineTo(610, y); g.stroke(); }
  g.fillStyle = 'rgba(35,26,22,.6)'; const r = rng(4); for (let y = 66; y < 420; y += 26) { g.fillRect(40, y - 12, 160 + r() * 120, 4); g.fillRect(470, y - 12, 80 + r() * 40, 4); } } });
export const magnifier = sheet([...circle(0, 0, 120, 48)], 'rgba(220,235,240,.18)', { seed: 405, rim: 0, shadow: .25, crumple: 0, grainK: 0 });
export const hand = (seed, flip = 1) => sheet([[-120 * flip, -30], [20 * flip, -40], [60 * flip, -30], [80 * flip, -10], [70 * flip, 10], [40 * flip, 20], [20 * flip, 36], [-120 * flip, 34]], C.skin, { seed, rim: 2.5, detail: g => { g.fillStyle = C.black; g.fillRect(flip > 0 ? -130 : 0, -42, 130, 86); } });
export const aphid = sheet(ellipse(0, 0, 36, 24, 30), grad([[0, '#9fc46a'], [1, '#5f8a3a']]), { seed: 406, rim: 2.5, detail: g => { g.strokeStyle = '#3f5a2a'; g.lineWidth = 3; for (const x of [-16, 0, 16]) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x - 8, 34); g.moveTo(x, -18); g.lineTo(x - 8, -34); g.stroke(); } g.beginPath(); g.moveTo(34, -6); g.lineTo(60, -26); g.moveTo(34, 6); g.lineTo(62, -10); g.stroke(); g.fillStyle = '#231a16'; g.beginPath(); g.arc(26, -6, 4, 0, 7); g.fill(); } });
export const virus = (seed) => sheet(rect(-36, -7, 72, 14), grad([[0, '#c8302a'], [1, '#7a1a16']]), { seed, rim: 1.5, shadow: .2 });

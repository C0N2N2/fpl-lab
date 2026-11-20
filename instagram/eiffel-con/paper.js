// Torn Paper Collage — the paper toolkit. Every shape becomes a cached sprite of torn coloured paper:
// a ragged edge (fractal noise along the outline), a white fibrous rim where the paper tore, grain, soft crumples
// and a short drop shadow. Frames only composite cached sprites, so rendering is fast.

export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function hash(i, s) { let h = (i * 374761393 + s * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; }
function vnoise(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, s) * (1 - u) + hash(i + 1, s) * u; }
export function fbm(x, s, oct = 4) { let a = 0, amp = 1, fr = 1, n = 0; for (let o = 0; o < oct; o++) { a += (vnoise(x * fr, s + o * 17) - .5) * amp; n += amp; amp *= .5; fr *= 2.1; } return a / n * 2; }

// ---------- paper grain tile (multiplied over every sheet) ----------
let GRAIN = null;
export function grain() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rng(9);
  const img = g.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = 235 + (r() - .5) * 26; img.data[i * 4] = v; img.data[i * 4 + 1] = v - 2; img.data[i * 4 + 2] = v - 6; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(120,100,80,.10)'; g.lineWidth = .8;                      // fibres
  for (let k = 0; k < 900; k++) { const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 4 + r() * 14; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + (r() - .5) * 4, y + Math.sin(a) * l * .5 + (r() - .5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 500; k++) g.fillRect(r() * 512, r() * 512, 1.5, 1.5);
  return GRAIN = c;
}

// ---------- ragged outlines ----------
// pts: closed polygon [[x,y],...]; returns a densely sampled outline displaced along its normal by noise
export function ragged(pts, { step = 3, amp = 2.4, seed = 1, open = false } = {}) {
  const out = []; let dist = 0; const n = pts.length, segs = open ? n - 1 : n;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const m = Math.max(1, Math.round(L / step));
    for (let k = 0; k < m; k++) { const u = k / m, d = dist + L * u, off = fbm(d * 0.045, seed) * amp * 2.2 + fbm(d * 0.6, seed + 5, 2) * amp * .45;
      out.push([a[0] + dx * u + nx * off, a[1] + dy * u + ny * off]); }
    dist += L;
  }
  if (open) out.push(pts[n - 1]);
  return out;
}
// push an outline outward from its centroid-free normals (for the white rim under the colour)
export function grow(pts, d, seed = 3) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const k = d * (0.35 + 0.65 * Math.max(0, fbm(i * 0.05, seed) + .5)); out.push([pts[i][0] - dy / L * k, pts[i][1] + dx / L * k]); }
  return out;
}
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
function path(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); }

// ---------- a torn sheet sprite ----------
// shape: polygon in local px; fill: colour or (g, w, h) => void painter; returns { c, x, y } (draw at x, y in local coords)
export function sheet(shape, fill, o = {}) {
  const { rim = 5.5, amp = 2.6, seed = 1, shadow = 0.28, crumple = 0.5, grainK = 0.55, rimColor = '#f7f2e7', detail = null } = o;
  let P = ragged(shape, { amp, seed });
  if (signedArea(P) < 0) P = P.reverse();
  const R = rim > 0 ? grow(P, -rim, seed + 1) : P;           // outward for a counter-clockwise outline in screen space (y down)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of R) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const M = 24, W = Math.ceil(x1 - x0 + M * 2), H = Math.ceil(y1 - y0 + M * 2);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.translate(M - x0, M - y0);
  if (shadow > 0) { g.save(); g.shadowColor = `rgba(40,20,10,${shadow})`; g.shadowBlur = 10; g.shadowOffsetX = 3; g.shadowOffsetY = 6; g.fillStyle = rimColor; path(g, R); g.fill(); g.restore(); }
  if (rim > 0) { g.fillStyle = rimColor; path(g, R); g.fill(); g.save(); path(g, R); g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .5; g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(x0 - M, y0 - M, W, H); g.restore(); }
  g.save(); path(g, P); g.clip();
  if (typeof fill === 'function') fill(g, x0, y0, x1, y1); else { g.fillStyle = fill; g.fillRect(x0 - M, y0 - M, W, H); }
  if (detail) detail(g);
  if (crumple > 0) { const r = rng(seed * 7 + 3); for (let k = 0; k < 7; k++) { const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), rr = 60 + r() * Math.max(80, (x1 - x0) * .3);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr), lt = r() < .5; gr.addColorStop(0, lt ? `rgba(255,250,240,${.12 * crumple})` : `rgba(60,30,10,${.10 * crumple})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); } }
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = grainK; g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(x0 - M, y0 - M, W, H);
  g.restore();
  return { c, x: x0 - M, y: y0 - M };
}
export function draw(g, s, x = 0, y = 0, k = 1, rot = 0, ax = 0, ay = 0) {
  if (!rot && k === 1) { g.drawImage(s.c, x + s.x, y + s.y); return; }
  g.save(); g.translate(x + ax, y + ay); g.rotate(rot); g.scale(k, k); g.drawImage(s.c, s.x - ax, s.y - ay); g.restore();
}

// ---------- handy shapes ----------
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function circle(cx, cy, r, n = 48) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
export function ellipse(cx, cy, rx, ry, n = 48) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
// a band filling from a profile line down to `bottom`
export function band(profile, bottom) { return [...profile, [profile[profile.length - 1][0], bottom], [profile[0][0], bottom]]; }
export function profile(kind, w, base, amp, seed, step = 12) {
  const p = [], r = rng(seed);
  if (kind === 'dunes') { const crest = []; let x = -40; while (x < w + 80) { crest.push([x, base - amp * (.45 + .55 * r())]); x += 160 + r() * 260; }
    for (let i = 0; i < crest.length - 1; i++) { const [ax, ay] = crest[i], [bx, by] = crest[i + 1], mx = ax + (bx - ax) * (.6 + .15 * r()), my = base + amp * .1;
      for (let x2 = ax; x2 < mx; x2 += step) { const u = (x2 - ax) / (mx - ax); p.push([x2, ay + (my - ay) * Math.pow(u, 1.6)]); }
      for (let x2 = mx; x2 < bx; x2 += step) { const u = (x2 - mx) / (bx - mx); p.push([x2, my + (by - my) * (1 - Math.pow(1 - u, 2.2))]); } }
    return p; }
  for (let x = -40; x <= w + 40; x += step) {
    let y = base;
    if (kind === 'hills') y -= amp * (fbm(x * .0025, seed) * .8 + .5);
    else if (kind === 'mountains') y -= amp * (Math.abs(fbm(x * .004, seed, 5)) * 1.6 + .2);
    else if (kind === 'flat') y -= amp * fbm(x * .01, seed, 3) * .2;
    p.push([x, y]);
  }
  return p;
}
// a gradient painter
export const grad = (stops, vertical = true) => (g, x0, y0, x1, y1) => { const gr = vertical ? g.createLinearGradient(0, y0, 0, y1) : g.createLinearGradient(x0, 0, x1, 0);
  stops.forEach(([k, c]) => gr.addColorStop(k, c)); g.fillStyle = gr; g.fillRect(x0 - 30, y0 - 30, x1 - x0 + 60, y1 - y0 + 60); };

// ---------- caption strip: bold serif on a torn cream strip ----------
const CAP = new Map();
export function caption(text, font, maxW) {
  const key = text + font; if (CAP.has(key)) return CAP.get(key);
  const m = document.createElement('canvas').getContext('2d'); m.font = font;
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (m.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur);
  const lh = 58, pad = 26, W = Math.max(...lines.map(l => m.measureText(l).width)) + pad * 2, H = lines.length * lh + pad * 1.2;
  const s = sheet(rect(0, 0, W, H), '#f4ecd8', { rim: 2.5, amp: 1.6, seed: text.length * 13 + 7, shadow: .35, crumple: .3, grainK: .4, detail: g => {
    g.fillStyle = '#1e1712'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    lines.forEach((l, i) => g.fillText(l, W / 2, pad * .6 + 42 + i * lh)); } });
  const r = { s, W, H }; CAP.set(key, r); return r;
}

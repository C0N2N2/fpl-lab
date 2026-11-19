// Hidden Lines No. 002 — How noise cancelling works (Night Paper Cutaway, vertical 1080×1920, 76 s).
// Story bookend in cut paper (a commuter on a night train), a dive through her earbud into a sliced-card cutaway, and back.
import * as THREE from 'three';
import { clamp, lerp, seg, eio, eo, ei, ss, back, monotone } from '/core/lib.js';
import { PAL, U, makeEngine } from './engine.js';
import { bud, slices, P, set, layers } from './scene.js';

THREE.ColorManagement.enabled = false;
const Q = new URLSearchParams(location.search);
const TLJ = await (await fetch('timeline.json')).json();
const FILM = TLJ.end, SUBS = Q.get('subs') !== '0';
const PX = 1080, PY = 1920, SS = +(Q.get('ss') || 1), JIT = +(Q.get('jit') || 4);
const SANS = '"Fraunces", serif', MONO = '"Fraunces", serif';
const SAFE_R = 930;

// ---------- timeline (whole-film seconds; anchored on word times) ----------
const K = {
  s1: [0.5, 7.4], db: [5.4, 9.6], press: 9.3, quiet: [9.35, 10.3], s2: [12.6, 16.9],
  iris1: [18.6, 19.3], open1: [19.3, 19.95],
  fold: [19.9, 22.6], book: [22.6, 23.9],
  lbMic: [21.8, 30.4], noiseIn: [22.4, 31.0], path1a: [27.0, 28.2], lbChip: [26.9, 31.0], flip: [29.1, 30.9],
  path1b: [32.7, 33.3], lbSpk: [32.98, 42.0], strip: [31.3, 41.8], sum: [39.6, 41.0], silence: 40.9,
  lbIn: [43.56, 48.6], leftover: [44.6, 47.6], path2: [46.8, 47.6],
  cards: [49.1, 57.4], rumble: 50.3, clink: 53.2, tip: [55.5, 57.4], lbTip: [55.5, 58.6],
  close: [57.5, 58.2], iris2: [58.2, 58.7], open2: [58.7, 59.3],
  s3: [60.9, 66.0], arrive: [64.5, 67.6], title: 68.6,
};
const BUD = [K.open1[0], K.iris2[1]];          // the cutaway is on screen between the two dives
const inBud = t => t >= BUD[0] && t < BUD[1];

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(PX, PY, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x000000, 0); renderer.autoClear = false; renderer.localClippingEnabled = true;
const scene = new THREE.Scene(); scene.add(bud); scene.add(set);
const renderView = makeEngine(renderer, scene, PX, PY, SS, JIT);
const cam = new THREE.PerspectiveCamera(30, PX / PY, 2, 8000);

// ---------- the set ----------
layers.person.position.set(-60, -330, 0); layers.wall.position.set(0, 0, -160);
const EB = new THREE.Vector3(-60 + 12, -330 + 154, 1);          // the earbud on her ear (sheet → world)
function trainX(t) {                                             // city scroll: full speed, slowing to a stop at the end
  const v = 130; const t1 = K.arrive[0], t2 = K.arrive[1];
  if (t < t1) return v * t; const u = clamp((t - t1) / (t2 - t1)); return v * t1 + v * (t2 - t1) * (u - u * u / 2);
}

// ---------- scene state ----------
function setScene(t) {
  const b = inBud(t); bud.visible = b; set.visible = !b;
  const cx = -((trainX(t) % 1400) + 1400) % 1400; layers.city.position.set(150 + cx + 700, -150, -480);
  const sway = t < K.arrive[1] ? Math.sin(t * 2.1) * 0.006 : 0;
  layers.person.rotation.set(0, 0, sway); layers.person.position.y = -330 + Math.sin(t * 4.3) * 1.2 * (t < K.arrive[1] ? 1 : 0);
  // earbud: fold up slice by slice, open like a book, close again
  const n = slices.length;
  for (const s of slices) {
    const d0 = K.fold[0] + (s.i / n) * (K.fold[1] - K.fold[0] - 0.35), up = back(seg(t, d0, d0 + 0.35), 1.6);
    const front = s.z > 0 ? 1 : 0, k = s.i - n / 2;
    const open = eio(seg(t, ...K.book)) * (1 - eio(seg(t, ...K.close)));
    s.g.rotation.x = -(1 - up) * Math.PI / 2; s.g.visible = up > 0.001;
    s.g.position.set(0, (1 - up) * -20, (k * 2.4 + front * 14) * open);
  }
  const ins = seg(t, K.fold[1] - 0.6, K.fold[1]);
  P.ins.visible = ins > 0; P.ins.scale.setScalar(Math.max(0.001, back(ins, 1.4)));
  P.noz.visible = seg(t, K.fold[1] - 0.3, K.fold[1]) > 0;
  U.uPath.value = lerp(0, 0.62, eio(seg(t, ...K.path1a))) + 0.38 * eio(seg(t, ...K.path1b));
  U.uPath2.value = eio(seg(t, ...K.path2));
  U.uFlood.value = eo(seg(t, K.tip[0], K.tip[0] + 0.5)) * (1 - seg(t, K.tip[1], K.tip[1] + 0.4));
  bud.updateMatrixWorld(true);
}

// ---------- camera: keys of [position x, y, z, target x, y, z, fov] ----------
const E = [EB.x, EB.y, EB.z];
const SETK = [
  [0.0, 520, -120, 2100, -40, -60, 0, 34, -4], [5.0, 420, 40, 1800, -40, -60, 0, 34, 2], [10.0, 360, 60, 1650, -40, -70, 0, 34, 0], [17.6, 290, 30, 1400, -40, -110, 0, 34, -3],
  [19.3, E[0] + 18, E[1] + 4, 70, ...E, 34, 20],
  [58.7, E[0] + 18, E[1] + 4, 70, ...E, 34, -20], [62.5, 330, 50, 1500, -40, -80, 0, 34, 4], [68.0, 380, 70, 1700, -40, -60, 0, 34, -1], [76.0, 420, 90, 1850, -40, -60, 0, 34, 0],
];
const BUDK = [
  [19.3, 30, -60, 220, 0, -6, 0, 34, -25], [21.5, 60, -10, 190, 0, -6, 0, 30, -8], [23.5, 150, 46, 120, 0, -4, 6, 30, 0], [27.5, 115, 48, 88, -4, 1, 6, 30, 7],
  [31.0, 160, 30, 125, 2, -4, 6, 30, -4], [37.4, 175, 34, 150, 2, -9, 6, 30, 3], [42.6, 180, 38, 140, 2, -9, 6, 30, 0], [44.5, 105, 4, 112, 6, -4, 4, 30, -9],
  [48.8, 150, 40, 140, 2, -6, 6, 30, 2], [52.0, 160, 50, 130, 2, -6, 6, 30, -2], [55.6, 105, -6, 70, 13, -3, 4, 30, 12], [57.4, 150, 40, 140, 0, -6, 4, 30, 0], [58.7, 60, -30, 210, 0, -6, 4, 34, 22],
];
const mk = keys => Array.from({ length: 8 }, (_, j) => monotone(keys.map(k => [k[0], k[j + 1]])));
const CS = mk(SETK), CB = mk(BUDK);
function camAt(t, j = [0, 0]) {
  const v = (inBud(t) ? CB : CS).map(f => f(t));
  cam.position.set(v[0], v[1], v[2]); cam.up.set(0, 1, 0); cam.lookAt(v[3], v[4], v[5]); cam.rotateZ(v[7] * Math.PI / 180); cam.fov = v[6];
  cam.near = inBud(t) ? 5 : 20; cam.updateMatrixWorld();
  cam.setViewOffset(PX, PY, j[0], j[1] + (inBud(t) ? 60 : 0), PX, PY); cam.updateProjectionMatrix(); return cam;
}

// ---------- 2D helpers ----------
const bg = document.getElementById('bg').getContext('2d'), ov = document.getElementById('ov').getContext('2d');
const proj = v => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * PX, (1 - p.y) / 2 * PY]; };
const wp = v => v.clone().applyMatrix4(P.ins.matrixWorld);
const CLOUDS = (() => { const r = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(1234), out = [];
  for (let i = 0; i < 14; i++) { const depth = 0.3 + r() * 0.7, puffs = []; const n = 5 + Math.floor(r() * 6);
    for (let k = 0; k < n; k++) puffs.push([(r() - .5) * 260, -r() * 160 * (k / n), 50 + r() * 70]);
    out.push({ x: r() * 1600 - 260, y: 300 + r() * 1100, s: 0.5 + depth * 0.9, depth, puffs }); }
  return out.sort((a, b) => a.depth - b.depth); })();
let SKYT = 0, SKYV = 0;
function drawPaper(t = SKYT) {
  const g = bg.createLinearGradient(0, 0, 0, PY), st = [0, .22, .45, .64, .82, 1];
  PAL.sky.forEach((c, i) => g.addColorStop(st[i], c)); bg.fillStyle = g; bg.fillRect(0, 0, PX, PY);
  const sun = bg.createRadialGradient(PX * .62, PY * .9, 20, PX * .62, PY * .9, 900); sun.addColorStop(0, 'rgba(255,214,150,.55)'); sun.addColorStop(1, 'rgba(255,214,150,0)');
  bg.fillStyle = sun; bg.fillRect(0, 0, PX, PY);
  bg.fillStyle = 'rgba(246,236,220,.6)'; for (let i = 0; i < 60; i++) { const x = (i * 197.3) % PX, y = (i * 83.7) % 520; bg.fillRect(x, y, 2, 2); }
  for (const cl of CLOUDS) {
    const x = ((cl.x - (t * 40 + SKYV) * cl.depth) % 1600 + 1600) % 1600 - 260, y = cl.y;
    bg.strokeStyle = 'rgba(27,22,51,.45)'; bg.lineWidth = 4; bg.beginPath(); for (const [px, py, r] of cl.puffs) { bg.moveTo(x + px * cl.s + r * cl.s, y + py * cl.s); bg.arc(x + px * cl.s, y + py * cl.s, r * cl.s, 0, Math.PI * 2); } bg.stroke();
    for (const [col, dx, dy, k] of [[PAL.cloudLo, 6, 10, 1], [PAL.cloud, 0, 0, 0.94], [PAL.cloudHi, -12, -14, .58]]) {
      bg.fillStyle = col; bg.beginPath(); for (const [px, py, r] of cl.puffs) { bg.moveTo(x + (px + dx) * cl.s + r * cl.s * k, y + (py + dy) * cl.s); bg.arc(x + (px + dx) * cl.s, y + (py + dy) * cl.s, r * cl.s * k, 0, Math.PI * 2); } bg.fill(); }
  }
}
let CAPTURE = null;
function textW(text, font, sp = 0) { ov.save(); ov.font = font; if (sp) ov.letterSpacing = sp + 'px'; const w = ov.measureText(text).width; ov.restore(); return w; }
function wipeText(c, text, x, y, p, font, color, sp = 0, out = 0) {
  if (p <= 0 || out >= 1) return 0;
  if (CAPTURE && out <= 0) { const px = +(/(\d+(?:\.\d+)?)px/.exec(font) || [0, 20])[1]; CAPTURE.push({ id: text, text, x0: Math.round(x), y0: Math.round(y - px), x1: Math.round(x + textW(text, font, sp)), y1: Math.round(y + px * 0.3) }); }
  c.save(); c.font = font; c.fillStyle = color; if (sp) c.letterSpacing = sp + 'px'; c.shadowColor = 'rgba(22,20,46,.85)'; c.shadowBlur = 14;
  const w = c.measureText(text).width, x0 = x - 4 + (w + 8) * eio(out), x1 = x - 4 + (w + 8) * eo(p);
  c.beginPath(); c.rect(x0, y - 200, Math.max(0, x1 - x0), 260); c.clip(); c.fillText(text, x, y); c.restore(); return w;
}
function dot(c, x, y, col, r = 4.6) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); }
function tag(c, t, [t0, t1], a, { dx, dy, name, spec, acc = false }) {
  const u = t - t0; if (u <= 0 || t >= t1 + 0.45) return;
  const out = seg(t, t1, t1 + 0.4), nf = `600 34px ${SANS}`, nw = textW(name, nf, 0.5), R = 46;
  const lx = a[0] + dx, ly = a[1] + dy, tx = dx < 0 ? lx - nw - 14 : lx + 14;
  // the line arrives along a curve, loops once round the part, and runs out to the label
  const P = []; const N = 70;
  for (let i = 0; i <= N; i++) { const k = i / N, th = -Math.PI / 2 + k * Math.PI * 2.15; P.push([a[0] + Math.cos(th) * R * (1 + .08 * Math.sin(k * 9)), a[1] + Math.sin(th) * R * .8]); }
  const e = P[P.length - 1]; for (let i = 1; i <= 20; i++) { const k = i / 20; P.push([lerp(e[0], lx, ss(k)), lerp(e[1], ly - 12, k)]); }
  const p = eio(seg(u, 0, 0.7));
  c.save(); c.globalAlpha = 1 - out; c.strokeStyle = PAL.cream; c.lineWidth = 2.6; c.lineCap = 'round';
  const tail = clamp(1 - seg(u, 1.2, 2.2), 0.25, 1); const i0 = Math.floor(P.length * p * (1 - tail)), i1 = Math.max(i0 + 1, Math.floor(P.length * p));
  c.beginPath(); c.moveTo(...P[i0]); for (let i = i0 + 1; i <= Math.min(i1, P.length - 1); i++) c.lineTo(...P[i]); c.stroke();
  const hd = P[Math.min(i1, P.length - 1)]; dot(c, hd[0], hd[1], PAL.acc, 7); if (acc) dot(c, a[0], a[1], PAL.acc, 5); c.restore();
  wipeText(c, name, tx, ly, seg(u, 0.55, 0.9), nf, acc ? PAL.acc : PAL.cream, 0.5, out);
  if (spec) wipeText(c, spec, tx, ly + 36, seg(u, 0.65, 1.05), `italic 400 26px ${SANS}`, PAL.creamDim, 0, out);
}
function statement(c, t, [t0, t1], rows, y0 = 250, size = 70) {
  if (t < t0 || t > t1 + 0.5) return; const out = seg(t, t1, t1 + 0.45), f = `600 ${size}px ${SANS}`;
  rows.forEach((row, r) => { let x = 64; row.forEach(([s, acc], i) => { const d = r * 0.25 + i * 0.15; wipeText(c, s, x, y0 + r * size * 1.2, seg(t, t0 + d, t0 + d + 0.55), f, acc ? PAL.acc : PAL.cream, 1, out); x += textW(s + ' ', f, 1); }); });
}
function wave(c, x0, x1, y, amp, lam, ph, col, lw, env = () => 1) {
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.beginPath();
  for (let x = x0; x <= x1; x += 3) { const u = (x - x0) / Math.max(1, x1 - x0), yy = y + Math.sin((x / lam) * Math.PI * 2 + ph) * amp * env(u); x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
  c.stroke(); c.restore();
}
// a paper strip panel that slides in from the right with its shadow
function strip(c, t, [t0, t1], x, y, w, h, draw) {
  const k = eo(seg(t, t0, t0 + 0.6)), out = ei(seg(t, t1, t1 + 0.5)); if (k <= 0 || out >= 1) return;
  const ox = (1 - k) * (PX - x + 40) - out * (x + w + 60);
  c.save(); c.translate(ox, 0);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + 10, y + 12, w, h);
  c.fillStyle = 'rgba(30,25,60,0.92)'; c.fillRect(x, y, w, h); c.strokeStyle = PAL.cream; c.lineWidth = 2; c.strokeRect(x, y, w, h);
  draw(c); c.restore();
}
function wrap(text, font, maxW) { const ws = text.split(' '), out = []; let cur = '';
  for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (textW(tr, font, 0.2) > maxW && cur) { out.push(cur); cur = w; } else cur = tr; } out.push(cur); return out; }
function subtitles(c, t) {
  if (!SUBS) return; const s = TLJ.subs.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const a = Math.min(1, (t - s.t0) / 0.12, (s.t1 - t) / 0.12), f = `500 44px ${SANS}`, lines = wrap(s.text, f, 800), lh = 56;
  const w = Math.max(...lines.map(l => textW(l, f, 0.2))), h = lines.length * lh + 30, y0 = 1500 - h;
  c.save(); c.globalAlpha = clamp(a); c.fillStyle = 'rgba(22,20,46,0.78)'; c.fillRect(48, y0, w + 44, h); c.fillStyle = PAL.cream; c.fillRect(48, y0, 4, h);
  c.font = f; c.letterSpacing = '0.2px'; c.fillStyle = PAL.cream; lines.forEach((l, i) => c.fillText(l, 72, y0 + 53 + i * lh)); c.restore();
}
function titleBlock(c, u, x, y) {
  const rows = [['CHANNEL', 'HIDDEN LINES', 30], ['No.', '002', 24], ['TITLE', 'HOW NOISE CANCELLING WORKS', 22], ['SCALE', '1 : 1 · SHEET 1 OF 1', 22]];
  const RH = 64, LW = 150, WD = SAFE_R - x, H_ = rows.length * RH;
  c.save(); c.fillStyle = 'rgba(22,20,46,0.85)'; c.fillRect(x, y, WD * eo(seg(u, 0, 0.45)), H_); c.strokeStyle = PAL.cream;
  const g = eo(seg(u, 0, 0.45)); c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + WD * g, y); c.moveTo(x, y + H_); c.lineTo(x + WD * g, y + H_); c.stroke();
  const gv = eo(seg(u, 0.2, 0.55)); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + H_ * gv); c.moveTo(x + WD, y); c.lineTo(x + WD, y + H_ * gv); c.stroke();
  c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + LW, y); c.lineTo(x + LW, y + H_ * gv);
  for (let i = 1; i < rows.length; i++) { c.moveTo(x, y + i * RH); c.lineTo(x + WD * eo(seg(u, 0.25 + i * 0.08, 0.6 + i * 0.08)), y + i * RH); } c.stroke(); c.restore();
  rows.forEach(([lab, val, sz], i) => { const by = y + i * RH + RH / 2, d = 0.35 + i * 0.2;
    wipeText(c, lab, x + 18, by + 6, seg(u, d, d + 0.3), `500 17px ${MONO}`, PAL.faint, 2.4);
    wipeText(c, val, x + LW + 20, by + sz * 0.36, seg(u, d + 0.1, d + 0.55), `600 ${sz}px ${SANS}`, PAL.cream, 1.2); });
}
// noise around the train: shaky cream lines that die when she presses the button
function noiseLines(c, t, k) {
  if (k <= 0.01) return;
  const rows = [[1150, 0.0], [1210, 1.3], [1270, 2.1], [500, 0.7], [560, 2.6]];
  c.save(); c.strokeStyle = PAL.cream; c.lineJoin = 'round';
  rows.forEach(([y, ph], r) => { c.lineWidth = 2.6 - r * 0.25; c.globalAlpha = 0.85 - r * 0.08; c.beginPath();
    for (let x = 40; x <= 900; x += 8) { const n = Math.sin(x * 0.11 + t * 31 + ph * 5) * 0.6 + Math.sin(x * 0.037 - t * 17 + ph) * 0.8 + Math.sin(x * 0.29 + t * 53) * 0.3;
      const yy = y + n * 16 * k; x === 40 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); });
  c.restore();
}
// iris: a round hole in a ground-coloured card, ringed in cream
function iris(c, center, r) {
  if (r < 1400) { c.save(); c.strokeStyle = PAL.cream; c.lineWidth = 2.6; c.beginPath(); const N = 120;
    for (let i = 0; i <= N; i++) { const k = i / N, th = k * Math.PI * 4, rr = r + (1 - k) * 260; const p = [center[0] + Math.cos(th) * rr, center[1] + Math.sin(th) * rr * .9]; i ? c.lineTo(...p) : c.moveTo(...p); }
    c.stroke(); dot(c, center[0] + r, center[1], PAL.acc, 8); c.restore(); }
  c.save(); c.beginPath(); c.rect(0, 0, PX, PY); c.moveTo(center[0] + r, center[1]); c.arc(center[0], center[1], Math.max(0.5, r), 0, Math.PI * 2, true);
  c.fillStyle = PAL.sky[1]; c.fill('evenodd'); c.strokeStyle = PAL.cream; c.lineWidth = 3; c.beginPath(); c.arc(center[0], center[1], Math.max(0.5, r), 0, Math.PI * 2); c.stroke(); c.restore();
}

// ---------- overlay ----------
function overlay(t, c) {
  if (!inBud(t)) {
    // story
    const quietK = 1 - eo(seg(t, ...K.quiet));
    noiseLines(c, t, t < K.press ? 1 : (t < K.open2[0] ? quietK : 0));
    statement(c, t, K.s1, [[['7:42 PM.', 0]], [['THE LOUDEST TRAIN', 0]], [['IN THE CITY.', 1]]]);
    if (t > K.db[0] && t < K.db[1] + 0.5) { const out = seg(t, K.db[1], K.db[1] + 0.4), v = t < K.press ? 90 + Math.round(Math.sin(t * 9) * 2) : Math.round(lerp(90, 20, eo(seg(t, ...K.quiet))));
      wipeText(c, 'SOUND LEVEL', 640, 760, seg(t, K.db[0], K.db[0] + 0.4), `500 20px ${MONO}`, PAL.faint, 2, out);
      if (CAPTURE == null) wipeText(c, `≈ ${v} dB`, 640, 820, seg(t, K.db[0] + 0.1, K.db[0] + 0.5), `600 52px ${SANS}`, t < K.press ? PAL.cream : PAL.acc, 1, out); }
    const eb = proj(EB);
    if (t > K.press && t < K.press + 1.2) { const k = seg(t, K.press, K.press + 1.2); c.save(); c.strokeStyle = PAL.acc; c.globalAlpha = 1 - k; c.lineWidth = 4 * (1 - k) + 1;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(eb[0], eb[1], 14 + (80 + i * 50) * eo(k), 0, Math.PI * 2); c.stroke(); } c.restore(); }
    if (t > K.press && t < K.iris1[0] + 0.1 || t > K.open2[0]) dot(c, eb[0], eb[1], PAL.acc, 5.5);
    statement(c, t, K.s2, [[['NOTHING', 0], ['BLOCKED', 0]], [['IT.', 0], ['IT', 0], ['ADDED', 1]], [['SOUND.', 1]]]);
    statement(c, t, K.s3, [[['HER EARS ARE', 0]], [['FULL OF', 0], ['SOUND.', 1]]]);
    if (t > K.title) titleBlock(c, (t - K.title) / 2.2, 64, 1100);
    if (t > K.iris1[0] && t < K.iris1[1] + 0.01) iris(c, eb, lerp(1500, 0, ei(seg(t, ...K.iris1))));
    if (t > K.open2[0] && t < K.open2[1]) iris(c, eb, lerp(0, 1500, ei(seg(t, ...K.open2))));
    return;
  }
  // inside the earbud
  const mo = proj(wp(P.micOut)), ch = proj(wp(P.chip)), dr = proj(wp(P.driver)), mi = proj(wp(P.micIn)), noz = proj(wp(P.out));
  if (t > K.noiseIn[0] && t < K.noiseIn[1]) { const k = seg(t, K.noiseIn[0], K.noiseIn[0] + 0.8) * (1 - seg(t, K.noiseIn[1] - 0.4, K.noiseIn[1]));
    wave(c, 40, mo[0] - 20, mo[1], 32 * k, 110, -t * 14, PAL.cream, 3.5, u => ss(clamp(u * 3)));
    wipeText(c, 'TRAIN NOISE', 64, mo[1] - 70, seg(t, K.noiseIn[0] + 0.3, K.noiseIn[0] + 0.9), `600 26px ${SANS}`, PAL.cream, 1.6, seg(t, K.noiseIn[1] - 0.4, K.noiseIn[1])); }
  tag(c, t, K.lbMic, mo, { dx: -40, dy: 300, name: 'OUTER MIC', spec: 'hears the train' });
  tag(c, t, K.lbChip, ch, { dx: -30, dy: -330, name: 'CHIP', spec: 'flips the wave', acc: true });
  if (t > K.flip[0] && t < K.flip[1] + 0.4) {          // the wave flipping, drawn beside the chip label
    const k = eio(seg(t, K.flip[0], K.flip[0] + 0.8)), out = seg(t, K.flip[1], K.flip[1] + 0.4), x0 = 560, y = 330;
    c.save(); c.globalAlpha = 1 - out; wave(c, x0, x0 + 360, y, 26, 120, 0, PAL.cream, 3); wave(c, x0, x0 + 360, y + 90, 26 * lerp(1, -1, k), 120, 0, k > 0.5 ? PAL.acc : PAL.cream, 3);
    c.fillStyle = PAL.creamDim; c.font = `400 20px ${MONO}`; c.fillText('in', x0 - 40, y + 6); c.fillText('out', x0 - 50, y + 96); c.restore(); }
  tag(c, t, K.lbSpk, dr, { dx: -40, dy: -380, name: 'SPEAKER', spec: 'plays the opposite', acc: true });
  strip(c, t, K.strip, 70, 1010, 860, 290, c => {
    const pw = seg(t, 31.6, 32.6), sk = seg(t, ...K.sum);
    const y1 = 1080, y2 = 1080 + 140 * (1 - eio(sk)), y3 = 1230;
    wave(c, 110, 890, y1, 40 * (1 - eio(seg(t, 40.7, 41.2))), 160, -t * 2, PAL.cream, 3.5);
    wave(c, 110, 110 + 780 * eo(seg(t, 33.0, 33.9)), y2 + 0, 40 * (1 - eio(seg(t, 40.7, 41.2))), 160, -t * 2 + Math.PI, PAL.acc, 3.5);
    c.fillStyle = PAL.cream; c.font = `600 22px ${SANS}`; c.letterSpacing = '1.4px';
    if (pw > 0) { c.globalAlpha = pw; c.fillText('TRAIN', 100, 1042); c.globalAlpha = 1; }
    if (t > 33.0) { c.fillStyle = PAL.acc; c.fillText('SPEAKER', 100, 1042 + 140 * (1 - eio(sk))); }
    if (t > K.silence - 0.2) { c.fillStyle = PAL.cream; c.globalAlpha = seg(t, K.silence - 0.2, K.silence + 0.3); c.fillText('= SILENCE', 100, 1270); }
  });
  tag(c, t, K.lbIn, mi, { dx: 60, dy: 330, name: 'INNER MIC', spec: 'checks what’s left' });
  if (t > K.leftover[0] && t < K.leftover[1] + 0.4) { const k = 1 - eio(seg(t, K.path2[0] + 0.3, K.leftover[1])), out = seg(t, K.leftover[1], K.leftover[1] + 0.4);
    c.save(); c.globalAlpha = 1 - out; wave(c, mi[0] + 20, mi[0] + 220, mi[1] - 70, 10 * k + 0.5, 50, -t * 10, PAL.cream, 2.5); c.restore(); }
  // the two cards: steady rumble cancels, a sudden clink gets through
  if (t > K.cards[0] - 0.1 && t < K.cards[1] + 0.6) {
    const card = (x, y, d0, title, ok) => { const k = eo(seg(t, d0, d0 + 0.5)), out = ei(seg(t, K.cards[1], K.cards[1] + 0.5)); if (k <= 0 || out >= 1) return;
      c.save(); c.translate(0, (1 - k) * 700 + out * 900); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 10, y + 12, 420, 300); c.fillStyle = 'rgba(30,25,60,0.92)'; c.fillRect(x, y, 420, 300); c.strokeStyle = PAL.cream; c.lineWidth = 2; c.strokeRect(x, y, 420, 300);
      c.fillStyle = PAL.cream; c.font = `600 26px ${SANS}`; c.letterSpacing = '1.4px'; c.fillText(title, x + 24, y + 46);
      if (ok) { const sk = eio(seg(t, d0 + 0.8, d0 + 1.8)); wave(c, x + 24, x + 396, y + 130, 28, 110, 0, PAL.cream, 3); wave(c, x + 24, x + 396, y + 130, 28 * (1 - sk) + 0.0, 110, Math.PI, PAL.acc, 3);
        wave(c, x + 24, x + 396, y + 230, 28 * (1 - sk), 110, 0, PAL.cream, 3); c.fillStyle = PAL.cream; c.fillText(sk > .9 ? 'CANCELLED ✓' : '', x + 24, y + 284); }
      else { c.strokeStyle = PAL.cream; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 24, y + 150); c.lineTo(x + 180, y + 150); c.lineTo(x + 196, y + 70); c.lineTo(x + 212, y + 230); c.lineTo(x + 228, y + 110); c.lineTo(x + 244, y + 150); c.lineTo(x + 396, y + 150); c.stroke();
        c.fillStyle = PAL.cream; c.fillText(seg(t, d0 + 1, d0 + 1.5) > 0 ? 'TOO FAST TO FLIP' : '', x + 24, y + 284); }
      c.restore(); };
    card(64, 180, K.rumble - 0.4, 'STEADY RUMBLE', true); card(500, 520, K.clink - 0.3, 'SUDDEN CLINK', false);
  }
  tag(c, t, K.lbTip, noz, { dx: -60, dy: 330, name: 'EAR TIP', spec: 'blocks clinks', acc: true });
  // dives in and out
  const bc = proj(wp(new THREE.Vector3(0, 0, 0)));
  if (t < K.open1[1]) iris(c, [PX / 2, 820], lerp(0, 1500, ei(seg(t, ...K.open1))));
  if (t > K.iris2[0]) iris(c, [PX / 2, 820], lerp(1500, 0, ei(seg(t, ...K.iris2))));
}

function camSpeed(t) { const a = (inBud(t) ? CB : CS).map(f => f(t)), b = (inBud(t + .04) === inBud(t) ? (inBud(t) ? CB : CS) : (inBud(t) ? CB : CS)).map(f => f(t + .04));
  const sc = inBud(t) ? 1 / 3 : 1 / 60; return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * sc + Math.abs(b[7] - a[7]) * 0.15; }
function streaks(c, t) { const v = clamp((camSpeed(t) - 0.5) / 2.5); if (v <= 0.02) return;
  c.save(); c.strokeStyle = PAL.cream; c.lineCap = 'round';
  for (let i = 0; i < 22; i++) { const s = (i * 0.6180339) % 1, y = (s * PY * 1.3 + t * 900 * (0.6 + s)) % (PY + 400) - 200, x = (i * 0.37 % 1) * PX;
    c.globalAlpha = v * (0.25 + 0.5 * ((i * 7) % 3) / 2); c.lineWidth = 2 + (i % 3); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 40 * v, y - 380 * v); c.stroke(); }
  c.restore(); }
function frameAt(t) {
  SKYV = ((inBud(t) ? CB : CS)[0](t)) * (inBud(t) ? 3 : 0.4);
  drawPaper(t); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear(); ov.clearRect(0, 0, PX, PY);
  renderView('main', { x: 0, y: 0, w: PX, h: PY }, (dt, j) => { const tt = clamp(t + dt, 0, FILM); setScene(tt); return camAt(tt, j); });
  setScene(t); camAt(t); streaks(ov, t); overlay(t, ov); subtitles(ov, t);
}

// ---------- sound events ----------
function buildEV() {
  const ev = [];
  ev.push({ t: 0, type: 'train', d: K.press + 0.05 });
  ev.push({ t: K.open2[0], type: 'trainsoft', d: K.arrive[1] - K.open2[0] });
  ev.push({ t: K.press, type: 'click' });
  ev.push({ t: K.s1[0], type: 'type', d: 1.2 }); ev.push({ t: K.s2[0], type: 'type', d: 1.2 }); ev.push({ t: K.s3[0], type: 'type', d: 1.0 });
  ev.push({ t: K.iris1[0], type: 'iris', d: 0.7 }); ev.push({ t: K.open1[0], type: 'iris', d: 0.65, open: true });
  const n = slices.length; for (let i = 0; i < n; i += 2) ev.push({ t: K.fold[0] + (i / n) * (K.fold[1] - K.fold[0] - 0.35) + 0.25, type: 'card', v: 0.6 + 0.4 * (i % 4 === 0) });
  ev.push({ t: K.book[0], type: 'slide', d: 1.2 });
  for (const k of ['lbMic', 'lbChip', 'lbSpk', 'lbIn', 'lbTip']) ev.push({ t: K[k][0], type: 'tick', accent: ['lbChip', 'lbSpk', 'lbTip'].includes(k) });
  ev.push({ t: K.path1a[0], type: 'zip', d: 1.2 }); ev.push({ t: K.path1b[0], type: 'zip', d: 0.6 });
  ev.push({ t: K.flip[0], type: 'flip', d: 0.8 });
  ev.push({ t: K.strip[0], type: 'slide', d: 0.6 });
  ev.push({ t: K.sum[0], type: 'sum', d: 1.4 });
  ev.push({ t: K.path2[0], type: 'zip', d: 0.8 });
  ev.push({ t: K.rumble - 0.4, type: 'slide', d: 0.5 }); ev.push({ t: K.clink - 0.3, type: 'slide', d: 0.5 }); ev.push({ t: K.clink + 0.4, type: 'clink' });
  ev.push({ t: K.tip[0], type: 'flood', d: 0.6 });
  ev.push({ t: K.close[0], type: 'slide', d: 0.7 });
  ev.push({ t: K.iris2[0], type: 'iris', d: 0.5 }); ev.push({ t: K.open2[0], type: 'iris', d: 0.6, open: true });
  ev.push({ t: K.arrive[1] - 0.6, type: 'brake', d: 1.2 });
  ev.push({ t: K.title, type: 'ruler', d: 0.6 }); ev.push({ t: K.title + 0.4, type: 'type', d: 1.3 });
  return ev.sort((a, b) => a.t - b.t).map(e => ({ ...e, t: +e.t.toFixed(4) }));
}

window.DUR = FILM;
window.TEXTS = (t) => { CAPTURE = []; setScene(t); camAt(t); ov.clearRect(0, 0, PX, PY); overlay(t, ov); const r = CAPTURE; CAPTURE = null; return r; };
window.render = frameAt;
await Promise.all([`600 20px "Fraunces"`, `500 20px "Fraunces"`, `italic 400 20px "Fraunces"`, `700 20px "Fraunces"`].map(f => document.fonts.load(f, 'AB'))); await document.fonts.ready;
window.EV = buildEV(); frameAt(0); window.READY = true;

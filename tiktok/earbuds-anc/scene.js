// Night Paper Cutaway — models for Hidden Lines No. 002 (noise cancelling).
// The earbud is built from stacked cut-card slices (1.2 mm card) along its front-back axis, so it can open like a book of
// layers; the commuter and the train are flat cut-paper sheets with real holes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, PAL } from './engine.js';
import { clamp, mulberry } from '/core/lib.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function clean(g) { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'aS'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.aS) g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); return g; }
export function add(group, geos, m) { const g = mergeGeometries(geos.map(clean)); const mesh = new THREE.Mesh(g, m); group.add(mesh); return mesh; }
const ext = (shape, depth, z0 = 0, seg = 40) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg }).translate(0, 0, z0);
function ellipseShape(rx, ry, cx = 0, cy = 0, hole = null) {
  const s = new THREE.Shape(); s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false);
  if (hole) { const p = new THREE.Path(); p.absellipse(hole[2] ?? cx, hole[3] ?? cy, hole[0], hole[1], 0, Math.PI * 2, true); s.holes.push(p); }
  return s;
}
function rrShape(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape(), x = cx - w / 2, y = cy - h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, 1.5 * Math.PI); return s;
}
const cylX = (r, len, x, y, z, s = 32) => new THREE.CylinderGeometry(r, r, len, s).rotateZ(Math.PI / 2).translate(x + len / 2, y, z);

// ---------- materials ----------
export const M = {
  card1: mat(0x9a948a), card2: mat(0x8c867c), card3: mat(0x7e786f), tip: mat(0xb3ada1, 5, { grain: .4 }),
  part: mat(0x8a857b), dark: mat(0x3a3936), mid: mat(0xa39d92), light: mat(0xc2bcb0),
  path1: mat(PAL.accGL, 3, { off: 0x8a857b, grain: 0 }), path2: mat(PAL.accGL, 4, { off: 0x8a857b, grain: 0 }), driver: mat(0xa39d92),
};

// ---------- the earbud (mm; local: x toward the ear canal, y up the stem axis, z out of the face) ----------
export const EAR = { HR: [11.5, 10.5, 9.5], SL: 1.2 };
export const bud = new THREE.Group();
export const slices = [];            // { mesh group, i, z }
export const P = {};                 // anchor points (bud-local)
{
  const [ax, ay, az] = EAR.HR, n = Math.floor(2 * az / EAR.SL);
  const stem = { x0: -2.5, w: 6.4, d: 5.6, y0: -34, y1: -3 };
  for (let i = 0; i < n; i++) {
    const z0 = -az + i * EAR.SL, zc = z0 + EAR.SL / 2, k = Math.sqrt(clamp(1 - (zc / az) ** 2, 0, 1));
    const g = new THREE.Group(); bud.add(g);
    const geos = [];
    const wall = 1.4, inner = k > 0.35 && i > 0 && i < n - 1;
    geos.push(ext(ellipseShape(ax * k, ay * k, 0, 0, inner ? [ax * k - wall, ay * k - wall] : null), EAR.SL * 0.96, z0));
    const sk = Math.sqrt(clamp(1 - (zc / (stem.d / 2)) ** 2, 0, 1));
    if (sk > 0.05) geos.push(ext(rrShape(stem.w * sk, stem.y1 - stem.y0, 2.2 * sk, stem.x0, (stem.y0 + stem.y1) / 2 - 4), EAR.SL * 0.96, z0));
    add(g, geos, [M.card1, M.card2, M.card3][i % 3]);
    slices.push({ g, i, z: zc, n });
  }
  // nozzle and ear tip (silicone: smooth, not sliced)
  const noz = new THREE.Group(); bud.add(noz); P.noz = noz;
  add(noz, [cylX(3.4, 6, 9.5, -1.5, 0), new THREE.SphereGeometry(6.2, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(0.85, 1, 1).translate(15, -1.5, 0)], M.tip);
  // inside: speaker driver, chip, battery, two microphones, the anti-noise path
  const ins = new THREE.Group(); bud.add(ins); P.ins = ins;
  add(ins, [cylX(5.8, 1.6, 4.2, -1, 0), cylX(2.4, 2.2, 2.0, -1, 0)], M.driver);                       // speaker driver
  add(ins, [new THREE.BoxGeometry(5, 4, 1.2).translate(-3.2, 4.2, 0)], M.dark);                          // chip
  add(ins, [new THREE.CylinderGeometry(3.4, 3.4, 4.5, 28).translate(-4.5, -3.6, 0)], M.mid);             // battery
  add(ins, [new THREE.BoxGeometry(2.4, 2.4, 1.4).translate(-10.4, 3.6, 0), new THREE.BoxGeometry(2.0, 2.0, 1.2).translate(8.6, -5.2, 0)], M.light);   // outer mic, inner mic
  P.micOut = V3(-11.6, 3.6, 0); P.chip = V3(-3.2, 4.2, 0); P.driver = V3(5.0, -1, 0); P.micIn = V3(8.6, -5.2, 0); P.out = V3(19, -1.5, 0);
  // the anti-noise path: outer mic → chip → driver (a trace on a flex)
  const curve = new THREE.CatmullRomCurve3([V3(-10.4, 3.6, 0), V3(-7, 5.2, 0), V3(-3.2, 4.2, 0), V3(0.5, 2.5, 0), V3(3.2, 0.2, 0)]);
  const tube = new THREE.TubeGeometry(curve, 80, 0.55, 10, false);
  const uv = tube.attributes.uv, aS = new Float32Array(uv.count); for (let i = 0; i < uv.count; i++) aS[i] = uv.getX(i);
  tube.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  add(ins, [tube], M.path1);
  const c2 = new THREE.CatmullRomCurve3([V3(8.6, -5.2, 0.9), V3(5.5, -6.5, 1.2), V3(0.5, -5.8, 1.4), V3(-2.0, 0.5, 1.2), V3(-3.0, 3.2, 0.9)]);
  const t2 = new THREE.TubeGeometry(c2, 80, 0.45, 10, false);
  const uv2 = t2.attributes.uv, a2 = new Float32Array(uv2.count); for (let i = 0; i < uv2.count; i++) a2[i] = uv2.getX(i);
  t2.setAttribute('aS', new THREE.BufferAttribute(a2, 1)); add(ins, [t2], M.path2);
}

// ---------- cut-paper set: commuter + train window + city ----------
function cutSheet(w, h, draw, px = 4) {
  const cv = document.createElement('canvas'); cv.width = Math.round(w * px); cv.height = Math.round(h * px);
  const c = cv.getContext('2d'); c.scale(px, px); draw(c, w, h);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
  const g = new THREE.Group(); add(g, [new THREE.PlaneGeometry(w, h)], mat(0xffffff, 0, { map: tex })); return g;
}
const rng = mulberry(77);
export const set = new THREE.Group();
export const layers = {};
{
  // back: the city at night (window lights are holes onto the darkest back card)
  layers.city = cutSheet(2800, 900, (c, w, h) => {
    c.fillStyle = '#4a4843';
    let x = 0; while (x < w / 2) { const bw = 60 + rng() * 120, bh = 260 + rng() * 520; c.fillRect(x, h - bh, bw - 8, bh);
      c.globalCompositeOperation = 'destination-out'; for (let yy = h - bh + 30; yy < h - 30; yy += 46) for (let xx = x + 14; xx < x + bw - 30; xx += 30) if (rng() < 0.35) c.fillRect(xx, yy, 12, 18);
      c.globalCompositeOperation = 'source-over'; x += bw; }
    c.drawImage(c.canvas, 0, 0, c.canvas.width / 2, c.canvas.height, w / 2, 0, w / 2, h);
  }, 2);
  set.add(layers.city);
  // middle: the carriage wall with a window hole
  layers.wall = cutSheet(1300, 1500, (c, w, h) => {
    c.fillStyle = '#34332f'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.roundRect(170, 330, 960, 560, 90); c.fill(); c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#26252300'; c.strokeStyle = '#3d3b37'; c.lineWidth = 16; c.beginPath(); c.roundRect(170, 330, 960, 560, 90); c.stroke();
    c.fillStyle = '#3d3b37'; c.fillRect(0, 1060, w, 40);                                             // the hand rail
  });
  set.add(layers.wall);
  // front: the commuter, head and shoulders in profile, earbud in
  layers.person = cutSheet(620, 900, (c, w, h) => {
    c.fillStyle = '#6a665e';
    c.beginPath(); c.moveTo(20, h); c.bezierCurveTo(30, 640, 140, 600, 230, 585);                   // back shoulder
    c.lineTo(250, 470); c.bezierCurveTo(170, 440, 150, 330, 175, 250);                                  // nape, back of head
    c.bezierCurveTo(190, 120, 290, 60, 380, 80); c.bezierCurveTo(470, 100, 510, 170, 505, 250);         // crown, forehead
    c.lineTo(540, 310); c.lineTo(510, 322); c.bezierCurveTo(520, 345, 515, 360, 500, 368);              // brow, nose
    c.lineTo(505, 392); c.bezierCurveTo(495, 410, 470, 440, 430, 445);                                  // lips, chin
    c.lineTo(400, 470); c.lineTo(395, 560); c.bezierCurveTo(500, 590, 600, 650, 610, h); c.closePath(); c.fill();
    c.fillStyle = '#56534c'; c.beginPath(); c.moveTo(175, 250); c.bezierCurveTo(180, 110, 300, 50, 400, 82); c.bezierCurveTo(470, 100, 500, 150, 498, 205);
    c.bezierCurveTo(440, 170, 360, 175, 300, 230); c.bezierCurveTo(260, 300, 250, 380, 240, 470); c.bezierCurveTo(180, 420, 160, 330, 175, 250); c.fill();   // hair
    c.fillStyle = '#7a766d'; c.beginPath(); c.ellipse(320, 300, 24, 38, -0.1, 0, 7); c.fill();         // ear
    c.fillStyle = '#d8d1c2'; c.beginPath(); c.ellipse(322, 296, 13, 12, 0, 0, 7); c.fill(); c.fillRect(316, 296, 11, 62);   // earbud
    c.fillStyle = '#4c4944'; c.beginPath(); c.moveTo(250, 585); c.lineTo(300, 640); c.lineTo(395, 560); c.lineTo(420, 610); c.lineTo(330, 700); c.closePath(); c.fill();   // collar
  });
  set.add(layers.person);
}

// place the set behind the subject, facing a viewpoint: depth d along the view line, offset (ox, oy) across it, scale k
export function placeSet(camPos, target, items) {
  const dir = target.clone().sub(camPos).normalize(), right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, dir);
  for (const [o, d, ox, oy, k] of items) { o.position.copy(target).addScaledVector(dir, d).addScaledVector(right, ox).addScaledVector(up, oy); o.scale.setScalar(k); o.lookAt(camPos); }
}

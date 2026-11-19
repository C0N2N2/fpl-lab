// Hidden Lines No. 001 — How your phone sees you in the dark (Line-Art Cutaway, vertical 1080×1920, 80 s).
// A generic phone and a diagram head, modelled in millimetres, traced live into line art (silhouette / occlusion / crease tiers,
// 2× supersampling × sub-pixel jitter accumulation). One accent (#FF4D1A) = infrared light: the flood, the dots, the route.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, seg, eio, eo, ei, ss, back, monotone, mulberry } from '/core/lib.js';

THREE.ColorManagement.enabled = false;
const Q = new URLSearchParams(location.search);
const TLJ = await (await fetch('timeline.json')).json();
const FILM = TLJ.end;
const SUBS = Q.get('subs') !== '0';
const PX = 1080, PY = 1920, SS = +(Q.get('ss') || 1), JIT = +(Q.get('jit') || 4);
const PAPER = '#f6f5f0', INK = '#141414', GRAPH = '#5a5955', FAINT = '#8a8984', ACC = '#ff4d1a', ACC_GL = 0xff4d1a;
const SANS = '"Plex Sans", sans-serif', MONO = '"Plex Mono", monospace';
// safe area for TikTok: text stays in x 64..930, y 140..1500
const SAFE_R = 930;

// ---------- Timeline (whole-film seconds; word times come from timeline.json) ----------
const K = {
  s1: [0.4, 4.4], s2: [7.0, 9.6], pulse: [7.1, 8.6],
  sweepDown: [10.2, 11.5], sweepUp: [22.3, 23.1],
  lbFlood: [12.72, 21.9], lbDot: [13.84, 21.9], lbCam: [14.98, 21.9],
  ruler: [17.3, 21.9], red: 19.54, cantSee: 20.86,
  floodPath: [23.5, 24.6], flood: [24.6, 25.7], flash: 26.76, floodOff: [33.2, 34.0],
  shutter: 29.32, inset: [29.6, 33.7],
  spray: [34.94, 36.5], wallLbl: [41.1, 44.7],
  nose: [46.22, 49.4], eyes: [46.84, 49.4], cheek: [47.44, 50.25],
  ghosts: [49.7, 53.75], contour: [52.9, 54.7],
  drainF: [56.3, 56.9], headOut: [56.9, 57.9], cardIn: [57.3, 58.3], sprayP: [58.55, 59.4],
  photoLbl: [58.1, 62.1], depth0: [59.7, 62.1], lockOn: 59.6, shake: [60.6, 61.3],
  drainP: [62.1, 62.5], cardOut: [62.3, 63.1], headIn: [62.6, 63.6], sprayF2: [63.5, 64.3], contour2: [63.7, 64.5],
  stored: [64.75, 68.3], match: 65.9, open: 66.94, route: [66.95, 68.2],
  endLine: 72.62, title: 74.6,
};

// ---------- Renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(PX, PY, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0xffffff, 0);
renderer.autoClear = false;
renderer.localClippingEnabled = true;

// ---------- Materials: one shader, two modes (0 = grey tone, 1 = normal + linear depth) ----------
const U = {
  uMode: { value: 0 }, uFlood: { value: 0 }, uFloodR: { value: 0 }, uFloodC: { value: new THREE.Vector3() },
  uCont: { value: 0 }, uContY: { value: -999 }, uPhP: { value: new THREE.Vector3() }, uPhN: { value: new THREE.Vector3(0, 0, 1) },
  uGlow: { value: 0 }, uGlowP: { value: 0 },
};
const VS = `
#include <clipping_planes_pars_vertex>
attribute float aS;
varying vec3 vN; varying vec3 vWN; varying vec2 vUv; varying float vVZ; varying vec3 vWP; varying float vS;
void main(){
  vec4 mvPosition = modelViewMatrix * vec4(position,1.);
  vN = normalize(normalMatrix*normal); vWN = normalize(mat3(modelMatrix)*normal);
  vUv = uv; vVZ = -mvPosition.z; vWP = (modelMatrix*vec4(position,1.)).xyz; vS = aS;
  gl_Position = projectionMatrix*mvPosition;
  #include <clipping_planes_vertex>
}`;
const FS = `
#include <clipping_planes_pars_fragment>
uniform float uMode; uniform vec3 uColor; uniform float uKind; uniform sampler2D uMap; uniform float uHasMap;
uniform float uFlood, uFloodR; uniform vec3 uFloodC; uniform float uCont, uContY; uniform vec3 uPhP, uPhN; uniform float uGlow, uGlowP;
varying vec3 vN; varying vec3 vWN; varying vec2 vUv; varying float vVZ; varying vec3 vWP; varying float vS;
float hatch(float period){ float h = mod(gl_FragCoord.x + gl_FragCoord.y, period); return smoothstep(0.6, 1.6, h) * (1. - smoothstep(2.6, 3.6, h)); }
void main(){
  #include <clipping_planes_fragment>
  if(uMode>0.5){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = vec3(0.,0.,1.); gl_FragColor = vec4(n, vVZ); return; }
  vec3 acc = vec3(1., .302, .102);
  vec3 col = uColor;
  if(!gl_FrontFacing){ gl_FragColor = vec4(mix(vec3(.90), vec3(.34), hatch(10.)), 1.); return; }   // section faces
  vec3 n = normalize(vWN); vec3 L = normalize(vec3(-.35,1.,.55));
  float d = max(dot(n,L),0.);
  float tone = .9 + .1*d + .02*n.y;
  if(uKind>0.5 && uKind<1.5){ float s=.5+.5*sin((vWP.x*1.3 - vWP.y)*.09); col *= mix(.95,1.0,s); }      // glass: faint streaks
  if(uKind>2.5 && uKind<3.5){ col = mix(col, acc, uGlow); if(uGlow>.5) tone = .95 + .05*d; }           // emitter windows
  if(uKind>5.5 && uKind<6.5){                                                                         // head: hair tone, IR flood, depth contours
    col = mix(col, vec3(.88), vS);
    float fl = uFlood * smoothstep(uFloodR, uFloodR - 25., distance(vWP, uFloodC)) * smoothstep(.05, .45, dot(n, uPhN)) * smoothstep(-112., -95., vWP.y);
    col = mix(col, vec3(1.,.70,.60), fl*.8);
    if(fl > .5) tone = .93 + .07*d;
    if(uCont > 0.){
      float z = dot(vWP - uPhP, uPhN);
      float f = abs(fract(z/7. - .5) - .5)*7. / max(fwidth(z), 1e-3);
      float ln = (1. - smoothstep(.55, 1.5, f)) * step(vWP.y, uContY) * (1. - vS*.6) * smoothstep(.0, .35, dot(n, uPhN)) * step(-128., vWP.y);
      col = mix(col, vec3(.33), ln*.85*uCont);
    }
  }
  if(uHasMap>.5){ vec4 m=texture2D(uMap,vUv); col = mix(col, m.rgb, m.a); }
  gl_FragColor = vec4(col*min(tone,1.0), 1.);
}`;
const phoneClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);   // section plane, applied to phone materials only
function mat(hex, kind = 0, map = null, clip = false) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uColor: { value: new THREE.Color(hex) }, uKind: { value: kind }, uMap: { value: map }, uHasMap: { value: map ? 1 : 0 } },
    vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, clipping: clip, clippingPlanes: clip ? [phoneClip] : null });
}
const M = {
  glass: mat(0xf7f7f4, 1, null, true), screen: mat(0xeeeeea, 1, null, true), frame: mat(0xededea, 0, null, true), back: mat(0xe2e2de, 0, null, true),
  pill: mat(0x3a3a39, 0, null, true), dark: mat(0x4a4a49, 0, null, true), mid: mat(0x9a9a97, 0, null, true), light: mat(0xfbfbf9, 0, null, true),
  flex: mat(0xdcdcd8, 0, null, true), lens: mat(0xbcbcb8, 0, null, true), emit: mat(0xd8d8d4, 3, null, true),
  skin: mat(0xfaf9f6, 6), wall: mat(0xfbfbf9), stand: mat(0xdcdcd8),
};
const scene = new THREE.Scene();

// ---------- Geometry helpers ----------
function rrPath(P, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2, y = cy - h / 2; r = Math.min(r, w / 2, h / 2);
  P.moveTo(x + r, y); P.lineTo(x + w - r, y); P.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  P.lineTo(x + w, y + h - r); P.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  P.lineTo(x + r, y + h); P.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  P.lineTo(x, y + r); P.absarc(x + r, y + r, r, Math.PI, 1.5 * Math.PI); return P;
}
const rr = (w, h, r, cx = 0, cy = 0) => rrPath(new THREE.Shape(), w, h, r, cx, cy);
const rrHole = (w, h, r, cx = 0, cy = 0) => rrPath(new THREE.Path(), w, h, r, cx, cy);
// upright extrusion: shape in (x, y), thickness along +z from z0
const ext = (shape, depth, z0 = 0, seg = 18) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg }).translate(0, 0, z0);
const boxZ = (w, h, d, x, y, z0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z0 + d / 2);
const cylZ = (r, d, x, y, z0, s = 32) => new THREE.CylinderGeometry(r, r, d, s).rotateX(Math.PI / 2).translate(x, y, z0 + d / 2);
function clean(g) { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'aS'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.aS) g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); return g; }
function add(group, geos, m) { const g = mergeGeometries(geos.map(clean)); const mesh = new THREE.Mesh(g, m); group.add(mesh); return mesh; }
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- The phone (generic; 147 × 71.5 × 7.8 mm; local: x width, y height, z thickness, screen at +z) ----------
const PW = 71.5, PH = 147, PT = 7.8, PR = 10;
const SY = PH / 2 - 7;                 // sensor strip centre (local y)
const MOD = { cam: V3(-8.2, SY, 0), flood: V3(-1.6, SY, 0), prox: V3(1.6, SY, 0), proj: V3(8.2, SY, 0) };
const phone = new THREE.Group(); scene.add(phone);
{
  const g = phone;
  add(g, [ext(rr(PW, PH, PR), 0.8, 0)], M.back);
  const fr = rr(PW, PH, PR); fr.holes.push(rrHole(PW - 3.2, PH - 3.2, PR - 1.6)); add(g, [ext(fr, PT - 0.8, 0.4, 24)], M.frame);
  add(g, [boxZ(PW - 4, 110, 4.0, 0, -12, 1.0)], M.dark);                                  // battery
  add(g, [boxZ(PW - 6, 22, 0.8, 0, SY - 6, 0.9)], M.flex);                                 // board under the strip
  const disp = rr(PW - 3.4, PH - 3.4, PR - 1.7); disp.holes.push(rrHole(27, 7.2, 3.6, 0, SY));
  add(g, [ext(disp, 1.1, 5.7)], M.screen);
  add(g, [ext(rr(PW - 3.2, PH - 3.2, PR - 1.6), 0.7, 6.9)], M.glass);                       // cover glass
  add(g, [ext(rr(26, 6.6, 3.3, 0, SY), 0.05, 7.6)], M.pill);                                // the dark pill under the glass
  // modules under the pill: IR camera (lens stack), flood illuminator, proximity sensor, dot projector (emitter chip + optics)
  const c = MOD.cam, p = MOD.proj, f = MOD.flood;
  add(g, [cylZ(2.7, 4.6, c.x, c.y, 1.7), cylZ(2.9, 0.6, c.x, c.y, 1.7)], M.frame);
  add(g, [cylZ(1.9, 0.35, c.x, c.y, 3.6), cylZ(1.7, 0.35, c.x, c.y, 4.5), cylZ(1.5, 0.35, c.x, c.y, 5.4)], M.lens);
  add(g, [boxZ(3.6, 3.6, 0.5, c.x, c.y, 1.75)], M.dark);                                   // image sensor
  add(g, [cylZ(2.9, 4.4, p.x, p.y, 1.7), cylZ(3.1, 0.6, p.x, p.y, 1.7)], M.frame);
  add(g, [boxZ(1.6, 1.6, 0.45, p.x, p.y, 2.3)], M.dark);                                  // emitter chip
  add(g, [cylZ(2.2, 0.35, p.x, p.y, 4.0), cylZ(2.2, 0.25, p.x, p.y, 5.6)], M.lens);         // lens + pattern plate
  add(g, [boxZ(2.6, 2.6, 2.6, f.x, f.y, 2.9)], M.frame);
  add(g, [boxZ(1.9, 1.9, 0.3, MOD.prox.x, MOD.prox.y, 5.0), boxZ(1.9, 1.9, 2.0, MOD.prox.x, MOD.prox.y, 3.0)], M.mid);
  add(g, [boxZ(2.0, 2.0, 0.35, f.x, f.y, 5.55), cylZ(1.1, 0.12, p.x, p.y, 5.9, 24)], M.emit);   // the flood window and projector window: accent when lit
}
phone.position.set(0, -165, 300);
phone.lookAt(0, 5, 40);
phone.updateMatrixWorld(true);
const PN = V3(0, 0, 1).transformDirection(phone.matrixWorld);       // screen normal (world)
const PUp = V3(0, 1, 0).transformDirection(phone.matrixWorld);
const ph = (v, z = 6.5) => V3(v.x, v.y, z).applyMatrix4(phone.matrixWorld);   // phone-local → world
const Pp = ph(MOD.proj, 6.0), Pf = ph(MOD.flood, 5.8), Pc = ph(MOD.cam, 6.0), Ps = ph(V3(0, SY, 0), 7.6);
U.uPhP.value.copy(Pp); U.uPhN.value.copy(PN).negate();

// ---------- The head (a diagram head: one radial surface r(direction), features as bumps; local +z = face) ----------
const HA = 76, HB = 112, HB2 = 104, HC = 97;
const gauss = (x, s) => Math.exp(-(x / s) * (x / s));
function headR(dx, dy, dz) {
  const lat = Math.asin(clamp(dy, -1, 1)), lon = Math.atan2(dx, dz), al = Math.abs(lon);
  const b = dy > 0 ? HB : HB2;
  let r = 1 / Math.sqrt((dx / HA) ** 2 + (dy / b) ** 2 + (dz / HC) ** 2);
  r *= 1 - 0.16 * ss(seg(lat, -0.1, -0.95)) * Math.min(1, Math.abs(Math.sin(lon)) * 1.4);   // jaw narrows
  if (al < 1.2) {
    const tip = ss(seg(lat, 0.24, -0.14)) * (1 - ss(seg(lat, -0.15, -0.25)));
    r += 24 * gauss(lon, 0.055 + 0.07 * ss(seg(lat, 0.1, -0.16))) * tip;                       // nose
    r += 5 * gauss(al - 0.12, 0.05) * gauss(lat + 0.18, 0.05);                                 // nostril wings
    r -= 10 * gauss(al - 0.34, 0.13) * gauss(lat - 0.12, 0.085);                                // eye sockets
    r += 7.5 * gauss(al - 0.34, 0.085) * gauss(lat - 0.11, 0.05);                               // eyeballs
    r -= 1.6 * gauss(al - 0.34, 0.1) * gauss(lat - 0.15 - 0.035 * Math.cos((al - 0.34) * 14), 0.01);   // upper lid crease
    r += 5 * gauss(al - 0.3, 0.2) * gauss(lat - 0.25, 0.06);                                    // brow
    r += 7 * gauss(al - 0.52, 0.15) * gauss(lat + 0.05, 0.12);                                  // cheekbones
    r += 6 * gauss(lon, 0.16) * gauss(lat + 0.42, 0.045) + 6 * gauss(lon, 0.14) * gauss(lat + 0.53, 0.045);   // lips
    r -= 3 * gauss(lon, 0.17) * gauss(lat + 0.475, 0.012);                                       // mouth line
    r += 6 * gauss(lon, 0.2) * gauss(lat + 0.93, 0.12);                                          // chin
  }
  return r + 4.5 * hairW(lon, lat);
}
function hairW(lon, lat) { const edge = lerp(0.47, -0.4, ss(seg(Math.abs(lon), 0.5, 2.4))); return ss(seg(lat, edge - 0.004, edge + 0.02)); }
const head = new THREE.Group(); scene.add(head);
let headGeo;
{
  const g = new THREE.SphereGeometry(1, 200, 150); const p = g.attributes.position, aS = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i)).normalize(), r = headR(v.x, v.y, v.z);
    p.setXYZ(i, v.x * r, v.y * r, v.z * r);
    aS[i] = hairW(Math.atan2(v.x, v.z), Math.asin(clamp(v.y, -1, 1)));
  }
  g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.computeVertexNormals(); headGeo = g;
  const ears = [-1, 1].map(s => new THREE.SphereGeometry(1, 28, 20).scale(7, 30, 17).rotateY(s * 0.25).translate(s * (HA + 3), 2, -8));
  const neck = new THREE.CylinderGeometry(50, 54, 260, 48, 1, true).translate(0, -200, -18);
  const torso = new RoundedBoxGeometry(400, 260, 210, 6, 60).translate(0, -440, -30);
  add(head, [g], M.skin); add(head, [...ears, neck, torso], M.skin);
}
// the flat wall behind, and the printed photo on a stand
const wall = new THREE.Group(); scene.add(wall);
add(wall, [new THREE.BoxGeometry(560, 700, 6).translate(0, 120, -306)], M.wall);
const card = new THREE.Group(); scene.add(card);
const CARD = { w: 120, h: 165, z: 70, y: 8 };
let cardTex;
{
  const cv = document.createElement('canvas'); cv.width = 480; cv.height = 660; const c = cv.getContext('2d');
  c.fillStyle = '#ededea'; c.fillRect(0, 0, 480, 660); c.strokeStyle = '#3a3a39'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.ellipse(240, 300, 140, 190, 0, 0, Math.PI * 2); c.stroke();                       // face outline
  c.beginPath(); c.moveTo(105, 230); c.quadraticCurveTo(240, 40, 375, 230); c.stroke();               // hairline
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(240 + s * 58, 285, 26, 12, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(240 + s * 58, 285, 7, 0, Math.PI * 2); c.fillStyle = '#3a3a39'; c.fill(); }
  c.beginPath(); c.moveTo(240, 300); c.lineTo(222, 375); c.lineTo(248, 382); c.stroke();               // nose
  c.beginPath(); c.moveTo(195, 425); c.quadraticCurveTo(240, 445, 285, 425); c.stroke();               // mouth
  c.strokeStyle = '#8a8984'; c.lineWidth = 3; c.strokeRect(14, 14, 452, 632);
  cardTex = new THREE.CanvasTexture(cv); cardTex.colorSpace = THREE.NoColorSpace; cardTex.anisotropy = 8;
  const plate = new THREE.BoxGeometry(CARD.w, CARD.h, 1.6);
  add(card, [plate], M.wall);
  const face = new THREE.PlaneGeometry(CARD.w - 4, CARD.h - 4).translate(0, 0, 0.82);
  const fm = new THREE.Mesh(face, mat(0xededea, 0, cardTex)); fm.userData.noND = true; card.add(fm);
  add(card, [new THREE.CylinderGeometry(2.5, 2.5, 200, 16).translate(0, -CARD.h / 2 - 100, -4), new THREE.CylinderGeometry(40, 44, 8, 40).translate(0, -CARD.h / 2 - 200, -4)], M.stand);
}
const CARD_HOME = V3(0, CARD.y, CARD.z);
function placeCard(x) { card.position.set(CARD_HOME.x + x, CARD_HOME.y, CARD_HOME.z); card.lookAt(Pp.x + x, Pp.y, Pp.z); card.updateMatrixWorld(true); }
placeCard(0);
const cardN = V3(0, 0, 1).transformDirection(card.matrixWorld);

// ---------- The dots: a regular angular grid from the projector; hits on the face (exact, by marching r(direction)), the wall, the photo ----------
const AIM = V3(0, 8, 55);
const aimD = AIM.clone().sub(Pp).normalize();
const bx = V3().crossVectors(aimD, V3(0, 1, 0)).normalize(), by = V3().crossVectors(bx, aimD).normalize();
const NX = 76, NY = 108, DA = 0.0068;
function insideHead(p) {
  const l = p.length(); if (l < 1e-6) return true;
  if (l < headR(p.x / l, p.y / l, p.z / l)) return true;
  const dy = p.y + 200; if (Math.abs(dy) < 130 && Math.hypot(p.x, (p.z + 18)) < 50 + 4 * (p.y < -70 ? 1 : 0)) return p.y < -60;   // neck
  return false;
}
function hitWall(o, d) { const t = (-303 - o.z) / d.z; return o.clone().addScaledVector(d, t); }
function hitCard(o, d) {
  const n = cardN, t = (CARD_HOME.clone().sub(o)).dot(n) / d.dot(n); const p = o.clone().addScaledVector(d, t);
  const lp = card.worldToLocal(p.clone()); return Math.abs(lp.x) < CARD.w / 2 - 1 && Math.abs(lp.y) < CARD.h / 2 - 1 ? p : null;
}
const dotF = [], dotP = [], dotD = [], dotK = [], REF = [];
{
  const rng = mulberry(4242), refN = PN.clone().negate();
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const ax = (i - (NX - 1) / 2) * DA, ay = (j - (NY - 1) / 2) * DA;
    const d = aimD.clone().addScaledVector(bx, Math.tan(ax)).addScaledVector(by, Math.tan(ay)).normalize();
    let hit = null, prev = 0;
    for (let t = 150; t < 560; t += 2.5) { if (insideHead(Pp.clone().addScaledVector(d, t))) { let a = prev, b = t;
      for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (insideHead(Pp.clone().addScaledVector(d, m))) b = m; else a = m; }
      hit = Pp.clone().addScaledVector(d, a - 0.6); break; } prev = t; }
    const onFace = !!hit; if (!hit) hit = hitWall(Pp, d);
    dotF.push(hit.x, hit.y, hit.z);
    const hc = hitCard(Pp, d); const hp = hc ? hc.addScaledVector(d, -2.2) : hitWall(Pp, d); dotP.push(hp.x, hp.y, hp.z);
    dotD.push(rng() * 0.35 + (Math.hypot(ax, ay) / (DA * 70)) * 0.35); dotK.push(onFace ? 1 : 0);
    // reference: where the same ray meets a flat plane through the face (for "how far each dot moved")
    const t0 = (AIM.clone().sub(Pp)).dot(refN) / d.dot(refN); REF.push({ i, j, d, onFace, hit, flat: Pp.clone().addScaledVector(d, t0) });
  }
}
const dotGeo = new THREE.BufferGeometry();
dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotF, 3));
dotGeo.setAttribute('aP', new THREE.Float32BufferAttribute(dotP, 3));
dotGeo.setAttribute('aD', new THREE.Float32BufferAttribute(dotD, 1));
dotGeo.setAttribute('aK', new THREE.Float32BufferAttribute(dotK, 1));
const DU = { uSrc: { value: Pp.clone() }, uSprayF: { value: 0 }, uSprayP: { value: 0 }, uSel: { value: 0 }, uSize: { value: 5.0 }, uDim: { value: 1 }, uBright: { value: 0 }, uBrightR: { value: 0 } };
const dotMat = new THREE.ShaderMaterial({
  uniforms: DU, transparent: false, depthTest: true, depthWrite: false,
  vertexShader: `attribute vec3 aP; attribute float aD; attribute float aK;
    uniform vec3 uSrc; uniform float uSprayF, uSprayP, uSel, uSize, uBright, uBrightR; varying float vU; varying float vB;
    void main(){ vec3 tg = uSel < .5 ? position : aP; float sp = uSel < .5 ? uSprayF : uSprayP;
      float u = clamp((sp - aD) / .3, 0., 1.); vU = u;
      vec3 p = mix(uSrc, tg, u); vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
      float dist = distance(tg, uSrc); vB = uBright * smoothstep(60., 0., abs(dist - uBrightR));
      gl_PointSize = u <= 0. ? 0. : uSize * (u < 1. ? .6 : 1.) * (1. + vB*.6); }`,
  fragmentShader: `uniform float uDim; varying float vU; varying float vB;
    void main(){ if(vU <= 0.) discard; vec2 q = gl_PointCoord - .5; if(dot(q,q) > .25) discard;
      vec3 acc = vec3(1., .302, .102); gl_FragColor = vec4(mix(mix(vec3(1.), acc, uDim), vec3(1.,.72,.55), vB*.7), 1.); }` });
const dots = new THREE.Points(dotGeo, dotMat); dots.frustumCulled = false; dots.userData.noND = true; scene.add(dots);
// three dots on the nose / cheek for the "how far it moved" beat
const pick = (fx, fy) => { let best = null, bd = 1e9; for (const r of REF) if (r.onFace) { const lp = r.hit; const dd = Math.hypot(lp.x - fx, lp.y - fy); if (dd < bd) { bd = dd; best = r; } } return best; };
const GH = [pick(0, -14), pick(-2, 18), pick(36, -10)];

// ---------- Scene state at time t ----------
function setScene(t) {
  // section plane through the strip (phone-local y), sweeping down then back up
  const cut = t < 16 ? lerp(PH / 2 + 4, SY, eio(seg(t, ...K.sweepDown))) : lerp(SY, PH / 2 + 40, eio(seg(t, ...K.sweepUp)));
  const on = t > K.sweepDown[0] && t < K.sweepUp[1];
  if (on) { phoneClip.normal.set(0, -1, 0); phoneClip.constant = cut; phoneClip.applyMatrix4(phone.matrixWorld); }
  else { phoneClip.normal.set(0, -1, 0); phoneClip.constant = 1e5; }
  // head out / in, card in / out (sideways, perpendicular to the view)
  const hx = -520 * ei(seg(t, ...K.headOut)) + 520 * eo(seg(t, ...K.headIn));
  head.position.set(Math.min(0, hx), 0, 0); head.updateMatrixWorld(true);
  const cx = 520 * (1 - eo(seg(t, ...K.cardIn))) + 520 * ei(seg(t, ...K.cardOut));
  card.visible = t > K.cardIn[0] - 0.01 && t < K.cardOut[1]; placeCard(cx);
  // IR flood on the face (from the nose tip outward), drained back later
  const fl = eo(seg(t, ...K.flood)) * (1 - seg(t, ...K.floodOff));
  U.uFlood.value = fl > 0 ? 1 : 0; U.uFloodC.value.set(0, -20, 105); U.uFloodR.value = 30 + 220 * fl;
  // flash at "like a flash": a brief extra wash
  // emitter windows
  const flashK = Math.max(0, 1 - Math.abs(t - K.flash) / 0.35);
  U.uGlow.value = clamp(Math.max(seg(t, K.pulse[0], K.pulse[0] + 0.25) * (1 - seg(t, K.pulse[1] - 0.3, K.pulse[1])),
    seg(t, K.floodPath[0] - 0.2, K.floodPath[0]) * (1 - seg(t, ...K.floodOff)), seg(t, K.spray[0] - 0.15, K.spray[0]) * (1 - seg(t, ...K.drainF)),
    seg(t, K.sprayP[0] - 0.15, K.sprayP[0]) * (1 - seg(t, ...K.drainP)), seg(t, K.sprayF2[0] - 0.15, K.sprayF2[0]), flashK));
  // dots
  const sF = t < K.headIn[0] ? seg(t, K.spray[0], K.spray[1]) * 1.0 * (1 - seg(t, ...K.drainF)) : seg(t, ...K.sprayF2);
  DU.uSprayF.value = sF * 1.3; DU.uSel.value = (t > K.drainF[1] && t < K.headIn[0]) ? 1 : 0;
  DU.uSprayP.value = seg(t, ...K.sprayP) * 1.3 * (1 - seg(t, ...K.drainP));
  DU.uDim.value = 1;
  DU.uSize.value = 9.0;
  const rb = seg(t, ...K.route); DU.uBright.value = rb > 0 && rb < 1 ? 1 : 0; DU.uBrightR.value = lerp(150, 700, rb);
  // depth contours
  const c1 = seg(t, ...K.contour), c2 = seg(t, ...K.contour2);
  const cOn = (t > K.contour[0] && t < K.drainF[1]) || t > K.contour2[0];
  U.uCont.value = cOn ? 1 : 0;
  U.uContY.value = t < K.headOut[0] ? lerp(-130, 130, eio(c1)) : lerp(-130, 130, eio(c2));
}

// ---------- Post: tracing + downsampled accumulation (the style's line engine) ----------
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadGeo = new THREE.PlaneGeometry(2, 2);
const VQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
const edgeMat = new THREE.ShaderMaterial({
  uniforms: { tC: { value: null }, tN: { value: null }, px: { value: new THREE.Vector2() }, rS: { value: 2.7 }, rO: { value: 1.7 }, rC: { value: 1.05 }, thD: { value: 0.0016 }, thO: { value: 0.012 }, thN: { value: 0.12 } },
  vertexShader: VQ,
  fragmentShader: `
  uniform sampler2D tC, tN; uniform vec2 px; uniform float rS, rO, rC, thD, thO, thN; varying vec2 vUv;
  float iz(vec4 s){ return s.a>0. ? 1./s.a : 0.; }
  void main(){
    vec4 c = texture2D(tC, vUv); vec4 n0 = texture2D(tN, vUv); float z0 = iz(n0); bool f0 = n0.a > 0.;
    float dS = 99.;
    for(int i=0;i<16;i++){ float a = float(i)*0.392699; vec2 d = vec2(cos(a), sin(a));
      for(int k=1;k<=4;k++){ float r = float(k)*rS*0.3; vec4 s = texture2D(tN, vUv + d*px*r); if((s.a>0.) != f0){ dS = min(dS, r); } } }
    float eS = 1. - smoothstep(rS*0.62, rS*1.12, dS);
    float eO = 0., eC = 0.;
    vec2 dirs[4]; dirs[0]=vec2(1.,0.); dirs[1]=vec2(0.,1.); dirs[2]=vec2(.7071,.7071); dirs[3]=vec2(.7071,-.7071);
    for(int i=0;i<4;i++){
      vec4 a = texture2D(tN, vUv + dirs[i]*px*rO), b = texture2D(tN, vUv - dirs[i]*px*rO);
      if(f0 && a.a>0. && b.a>0.){ float za = iz(a), zb = iz(b), m = max(z0, max(za, zb)); eO = max(eO, smoothstep(thO, thO*1.8, abs(za + zb - 2.*z0) / m)); }
      vec4 a2 = texture2D(tN, vUv + dirs[i]*px*rC), b2 = texture2D(tN, vUv - dirs[i]*px*rC);
      if(f0 && a2.a>0. && b2.a>0.){ float za = iz(a2), zb = iz(b2), m = max(z0, max(za, zb));
        eC = max(eC, smoothstep(thD, thD*2.2, abs(za + zb - 2.*z0) / m));
        eC = max(eC, smoothstep(thN, thN*1.8, 1.-dot(n0.xyz, a2.xyz)));
        eC = max(eC, smoothstep(thN, thN*1.8, 1.-dot(n0.xyz, b2.xyz))); }
    }
    vec3 inkS = vec3(.078), inkO = vec3(.11), inkC = vec3(.25);
    float wS = eS, wO = eO*.95, wC = eC*.78;
    float e = max(wS, max(wO, wC));
    vec3 ink = wS >= max(wO, wC) ? inkS : (wO >= wC ? inkO : inkC);
    vec3 col = mix(c.rgb, ink, e);
    float al = max(c.a > .01 ? 1. : 0., e);
    gl_FragColor = vec4(col*al, al);
  }`, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
const downMat = new THREE.ShaderMaterial({
  uniforms: { tE: { value: null }, px: { value: new THREE.Vector2() }, w: { value: 1 } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tE; uniform vec2 px; uniform float w; varying vec2 vUv;
  void main(){ vec4 s = texture2D(tE, vUv + px*vec2(.5,.5)) + texture2D(tE, vUv + px*vec2(-.5,.5)) + texture2D(tE, vUv + px*vec2(.5,-.5)) + texture2D(tE, vUv + px*vec2(-.5,-.5)); gl_FragColor = s*.25*w; }`,
  depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
const copyMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, circ: { value: new THREE.Vector3() }, size: { value: new THREE.Vector2() } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tA; uniform vec3 circ; uniform vec2 size; varying vec2 vUv;
  void main(){ vec4 s = texture2D(tA, vUv); s = vec4(min(s.rgb, vec3(s.a)), min(s.a, 1.));
    if(circ.z > 0.){ float d = distance(vUv*size, circ.xy); if(d > circ.z) discard; vec3 paper = vec3(.965,.961,.941); gl_FragColor = vec4(s.rgb + paper*(1.-s.a), 1.); return; }
    gl_FragColor = s; }`,
  depthTest: false, depthWrite: false, blending: THREE.NoBlending });
const quad = new THREE.Mesh(quadGeo, edgeMat); const quadScene = new THREE.Scene(); quadScene.add(quad);
const RT = {};
function targets(key, w, h) {
  if (RT[key]) return RT[key];
  const lin = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  RT[key] = {
    c: new THREE.WebGLRenderTarget(w * SS, h * SS, { type: THREE.UnsignedByteType, ...lin }),
    n: new THREE.WebGLRenderTarget(w * SS, h * SS, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }),
    e: new THREE.WebGLRenderTarget(w * SS, h * SS, { type: THREE.UnsignedByteType, ...lin }),
    a: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, ...lin }),
  };
  return RT[key];
}
function pass(t, cam, wgt) {
  U.uMode.value = 1;
  const hid = []; scene.traverse(o => { if (o.userData.noND && o.visible) { o.visible = false; hid.push(o); } });
  renderer.setRenderTarget(t.n); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
  hid.forEach(o => { o.visible = true; });
  U.uMode.value = 0;
  renderer.setRenderTarget(t.c); renderer.setClearColor(0xffffff, 0); renderer.clear(); renderer.render(scene, cam);
  quad.material = edgeMat; edgeMat.uniforms.tC.value = t.c.texture; edgeMat.uniforms.tN.value = t.n.texture;
  edgeMat.uniforms.px.value.set(1 / t.c.width, 1 / t.c.height);
  renderer.setRenderTarget(t.e); renderer.clear(); renderer.render(quadScene, quadCam);
  quad.material = downMat; downMat.uniforms.tE.value = t.e.texture; downMat.uniforms.px.value.set(1 / t.e.width, 1 / t.e.height); downMat.uniforms.w.value = wgt;
  renderer.setRenderTarget(t.a); renderer.render(quadScene, quadCam);
}
const JOFF = [[-0.125, -0.375], [0.375, -0.125], [0.125, 0.375], [-0.375, 0.125], [0, 0], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25]];
const SHUTTER = 0.12 / 24;
function renderView(key, rect, setup, opt = {}) {
  const t = targets(`${key}-${rect.w}x${rect.h}`, rect.w, rect.h);
  renderer.setRenderTarget(t.a); renderer.setClearColor(0x000000, 0); renderer.clear();
  for (let k = 0; k < JIT; k++) {
    const dt = JIT > 1 ? (k / (JIT - 1) - 0.5) * SHUTTER : 0;
    pass(t, setup(dt, JOFF[k % JOFF.length]), 1 / JIT);
  }
  quad.material = copyMat; copyMat.uniforms.tA.value = t.a.texture;
  copyMat.uniforms.size.value.set(rect.w, rect.h); copyMat.uniforms.circ.value.set(rect.w / 2, rect.h / 2, opt.circle ? rect.w / 2 : 0);
  renderer.setRenderTarget(null); renderer.setViewport(rect.x, PY - rect.y - rect.h, rect.w, rect.h); renderer.setScissor(rect.x, PY - rect.y - rect.h, rect.w, rect.h); renderer.setScissorTest(true);
  renderer.render(quadScene, quadCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, PX, PY);
}

// ---------- Camera: world orbit keys [t, az°, el°, ln dist, target x, y, z, fov] ----------
const mainCam = new THREE.PerspectiveCamera(24, PX / PY, 1, 6000);
const Ln = Math.log, D2R = Math.PI / 180;
function orbitOf(pos, tgt) { const d = pos.clone().sub(tgt), L = d.length(); return [Math.atan2(d.x, d.z) / D2R, Math.asin(d.y / L) / D2R, Ln(L)]; }
// the strip, seen from in front of the screen; the projector's own viewpoint
const [sAz, sEl] = orbitOf(Ps.clone().addScaledVector(PN, 100).addScaledVector(PUp, 30), Ps);
const [cAz, cEl] = orbitOf(Ps.clone().addScaledVector(PN, 40).addScaledVector(PUp, 95), Ps);       // above the cut, looking down into it
const PPOS = Pp.clone().addScaledVector(aimD, 22);
const [pAz, pEl, pLd] = orbitOf(PPOS, AIM);
const S = [Ps.x, Ps.y, Ps.z], A = [AIM.x, AIM.y, AIM.z];
const WIDE = [0, -75, 170];
const KEYS = [
  [0.0, sAz, sEl, Ln(150), ...S, 24, 0],
  [2.4, sAz - 4, sEl - 2, Ln(185), ...S, 24, 0],
  [5.0, sAz - 30, sEl - 8, Ln(460), Ps.x, Ps.y + 50, Ps.z - 70, 24, 0],
  [8.3, 62, 12, Ln(1750), ...WIDE, 24, 0],
  [9.4, 64, 12, Ln(1680), ...WIDE, 24, 0],
  [10.4, cAz + 14, cEl - 6, Ln(150), ...S, 24, 160],
  [12.0, cAz + 6, cEl, Ln(118), ...S, 24, 200],
  [16.5, cAz - 4, cEl + 1, Ln(112), ...S, 24, 200],
  [21.8, cAz - 12, cEl - 1, Ln(118), ...S, 24, 200],
  [23.4, 58, 14, Ln(1650), ...WIDE, 24, 0],
  [28.6, 52, 11, Ln(1250), 0, -50, 140, 24, 0],
  [32.6, 46, 10, Ln(1150), 0, -50, 150, 24, 0],
  [34.2, pAz + 6, pEl + 4, Ln(Math.exp(pLd) + 160), ...A, 32, 0],
  [35.2, pAz, pEl, pLd, ...A, 60, 0],
  [43.9, pAz, pEl, pLd, ...A, 60, 0],
  [46.2, 62, 10, Ln(640), 0, 6, 40, 26, 0],
  [49.0, 54, 9, Ln(600), 0, 8, 40, 26, 0],
  [52.6, 44, 6, Ln(560), 0, 6, 50, 26, 0],
  [56.2, 30, 4, Ln(560), 0, 4, 50, 26, 0],
  [57.0, 38, 6, Ln(880), 0, -20, 80, 26, 0],
  [62.0, 32, 5, Ln(860), 0, -20, 80, 26, 0],
  [63.6, 34, 10, Ln(1300), 0, -80, 150, 26, 0],
  [66.2, 40, 11, Ln(1400), 0, -85, 160, 24, 0],
  [69.0, 70, 12, Ln(1500), 0, -40, 90, 24, 0],
  [80.0, 96, 13, Ln(1620), 0, -40, 90, 24, 0],
];
const CAMF = Array.from({ length: 8 }, (_, j) => monotone(KEYS.map(k => [k[0], k[j + 1]])));
const tgtV = new THREE.Vector3();
function camAt(t, jit = [0, 0], cam = mainCam) {
  const [az, el, ld, tx, ty, tz, fov, oy] = CAMF.map(f => f(t));
  const d = Math.exp(ld); tgtV.set(tx, ty, tz);
  const a = az * D2R, e = el * D2R;
  cam.position.set(tx + Math.sin(a) * Math.cos(e) * d, ty + Math.sin(e) * d, tz + Math.cos(a) * Math.cos(e) * d);
  cam.up.set(0, 1, 0); cam.lookAt(tgtV); cam.fov = fov; cam.near = clamp(d * 0.05, 2, 40); cam.far = 6000;
  cam.updateMatrixWorld();
  cam.setViewOffset(PX, PY, jit[0], jit[1] + oy, PX, PY); cam.updateProjectionMatrix();
  return cam;
}
// the IR camera's own view (for the "infrared photo" inset and the stored map)
const insetCam = new THREE.PerspectiveCamera(30, 1, 5, 3000);
function insetAt(t, jit = [0, 0], from = Pc) {
  insetCam.position.copy(from); insetCam.up.set(0, 1, 0); insetCam.lookAt(0, -2, 60); insetCam.fov = 52; insetCam.updateMatrixWorld();
  insetCam.setViewOffset(460, 460, jit[0], jit[1], 460, 460); insetCam.updateProjectionMatrix(); return insetCam;
}

// ---------- 2D: paper, labels, subtitles ----------
const bg = document.getElementById('bg').getContext('2d');
const ov = document.getElementById('ov').getContext('2d');
function proj(v, cam = mainCam) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * PX, (1 - p.y) / 2 * PY, p.z]; }
function drawPaper() {
  bg.fillStyle = PAPER; bg.fillRect(0, 0, PX, PY);
  bg.strokeStyle = 'rgba(20,20,20,0.04)'; bg.lineWidth = 1;
  for (let x = 0; x <= PX; x += 40) { bg.beginPath(); bg.moveTo(x + .5, 0); bg.lineTo(x + .5, PY); bg.stroke(); }
  for (let y = 0; y <= PY; y += 40) { bg.beginPath(); bg.moveTo(0, y + .5); bg.lineTo(PX, y + .5); bg.stroke(); }
  bg.strokeStyle = 'rgba(20,20,20,0.15)';
  for (let x = 40; x < PX; x += 200) for (let y = 40; y < PY; y += 200) { bg.beginPath(); bg.moveTo(x - 5, y + .5); bg.lineTo(x + 6, y + .5); bg.moveTo(x + .5, y - 5); bg.lineTo(x + .5, y + 6); bg.stroke(); }
}
let CAPTURE = null;
function wipeText(c, text, x, y, p, font, color, spacing = 0, out = 0, pass_ = false) {
  if (p <= 0 || out >= 1) return 0;
  if (CAPTURE && out <= 0) { const px = +(/(\d+(?:\.\d+)?)px/.exec(font) || [0, 20])[1]; const w = textW(text, font, spacing); CAPTURE.push({ id: text, text, x0: Math.round(x), y0: Math.round(y - px), x1: Math.round(x + w), y1: Math.round(y + px * 0.3), ...(pass_ ? { pass: true } : {}) }); }
  c.save(); c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
  if (spacing) c.letterSpacing = spacing + 'px';
  const w = c.measureText(text).width;
  const x0 = x - 4 + (w + 8) * eio(out), x1 = x - 4 + (w + 8) * eo(p);
  c.beginPath(); c.rect(x0, y - 200, Math.max(0, x1 - x0), 260); c.clip();
  c.fillText(text, x, y); c.restore(); return w;
}
function textW(text, font, spacing = 0) { ov.save(); ov.font = font; if (spacing) ov.letterSpacing = spacing + 'px'; const w = ov.measureText(text).width; ov.restore(); return w; }
function dot(c, x, y, col = INK, r = 4) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); }
function polyGrow(c, pts, p) {
  if (p <= 0) return null;
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let rem = tot * clamp(p); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); let end = pts[0];
  for (let i = 1; i < pts.length && rem > 0; i++) { const u = Math.min(1, rem / L[i - 1]); end = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; c.lineTo(end[0], end[1]); rem -= L[i - 1]; }
  c.stroke(); return end;
}
// a label hanging from a part: dot → leader → name (+ one spec line)
function tag(c, t, [t0, t1], anchor, { dx, dy, name, spec, accent = false }) {
  const u = t - t0; if (u <= 0 || t >= t1 + 0.45) return;
  const out = seg(t, t1, t1 + 0.4), col = accent ? ACC : INK;
  const nameFont = `600 30px ${SANS}`, nw = textW(name, nameFont, 1.6);
  const left = dx < 0, lx = anchor[0] + dx, ly = anchor[1] + dy, tx = left ? lx - nw - 12 : lx + 12;
  c.save(); c.strokeStyle = col; c.lineWidth = 1.8;
  polyGrow(c, [anchor, [lx, ly - 10]], seg(u, 0, 0.35) * (1 - out));
  if (seg(u, 0.05, 0.2) > 0 && out < 1) dot(c, anchor[0], anchor[1], col, 4.6 * back(seg(u, 0.02, 0.18), 2));
  wipeText(c, name, tx, ly, seg(u, 0.18, 0.5), nameFont, col, 1.6, out);
  if (spec) wipeText(c, spec, tx, ly + 34, seg(u, 0.3, 0.7), `400 22px ${MONO}`, GRAPH, 0, out);
  c.restore();
}
function arcs(c, p, ang, t, k) {
  if (k <= 0.01) return;
  c.save(); c.strokeStyle = ACC;
  for (let i = 0; i < 3; i++) { const ph = ((t * 0.9 + i / 3) % 1), r = 30 + ph * 120 * k;
    c.globalAlpha = k * (1 - ph) * 0.9; c.lineWidth = 3 * (1 - ph) + 0.8; c.beginPath(); c.arc(p[0], p[1], r, ang - 0.7, ang + 0.7); c.stroke(); }
  c.restore();
}
function dimLine(c, a, b, off, text, p = 1) {
  if (p <= 0) return;
  c.save();
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * off, ny = dx / L * off;
  const A = [a[0] + nx, a[1] + ny], Bp = [b[0] + nx, b[1] + ny], M0 = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2];
  const q2 = seg(p, 0.0, 0.7), q3 = seg(p, 0.6, 1);
  c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(lerp(M0[0], A[0], ss(q2)), lerp(M0[1], A[1], ss(q2))); c.lineTo(lerp(M0[0], Bp[0], ss(q2)), lerp(M0[1], Bp[1], ss(q2))); c.stroke();
  const ux = dx / L, uy = dy / L;
  if (q2 >= 1) for (const [P0, s] of [[A, 1], [Bp, -1]]) { c.beginPath(); c.moveTo(P0[0], P0[1]); c.lineTo(P0[0] + s * ux * 14 + uy * 4.5, P0[1] + s * uy * 14 - ux * 4.5); c.lineTo(P0[0] + s * ux * 14 - uy * 4.5, P0[1] + s * uy * 14 + ux * 4.5); c.closePath(); c.fill(); }
  if (q3 > 0 && text) { c.font = `500 24px ${MONO}`; const tw = c.measureText(text).width; c.fillStyle = PAPER; c.fillRect(M0[0] - tw / 2 - 8, M0[1] - 16, tw + 16, 32);
    c.globalAlpha = ss(q3); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, M0[0], M0[1] + 1); }
  c.restore();
}
// big statement in the top-left column; one word may be accent
function statement(c, t, [t0, t1], parts, y = 250, size = 76) {
  if (t < t0 || t > t1 + 0.5) return;
  const out = seg(t, t1, t1 + 0.45), font = `600 ${size}px ${SANS}`;
  let x = 64;
  parts.forEach(([txt, acc], i) => { const d = i * 0.18; const w = wipeText(c, txt, x, y, seg(t, t0 + d, t0 + d + 0.55), font, acc ? ACC : INK, 1, out); x += textW(txt + ' ', font, 1); });
}
// subtitles: English only, bottom-left of the safe area, wrapped to two lines
function wrap(text, font, maxW) { const ws = text.split(' '), lines = []; let cur = '';
  for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (textW(tr, font, 0.2) > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function subtitles(c, t) {
  if (!SUBS) return;
  const s = TLJ.subs.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const a = Math.min(1, (t - s.t0) / 0.12, (s.t1 - t) / 0.12);
  const f = `500 44px ${SANS}`, lines = wrap(s.text, f, 800), lh = 56;
  const w = Math.max(...lines.map(l => textW(l, f, 0.2))), h = lines.length * lh + 30, y0 = 1480 - h;
  c.save(); c.globalAlpha = clamp(a);
  c.fillStyle = 'rgba(246,245,240,0.92)'; c.fillRect(48, y0, w + 44, h);
  c.fillStyle = INK; c.fillRect(48, y0, 4, h);
  c.font = f; c.letterSpacing = '0.2px'; c.fillStyle = INK; lines.forEach((l, i) => c.fillText(l, 72, y0 + 15 + 42 + i * lh - 4));
  c.restore();
}
function padlock(c, x, y, open, shake = 0, cross = 0, acc = false) {
  c.save(); c.translate(x + Math.sin(shake * 40) * 7 * shake, y); c.strokeStyle = acc ? ACC : INK; c.lineWidth = 4; c.lineJoin = 'round';
  c.fillStyle = PAPER; c.beginPath(); c.roundRect(-34, -8, 68, 52, 7); c.fill(); c.stroke();
  const lift = 22 * back(open, 2.2);
  c.beginPath(); c.moveTo(-21, -8 - lift * (open > 0 ? 0 : 1)); c.lineTo(-21, -30 - lift); c.arc(0, -30 - lift, 21, Math.PI, 0); c.lineTo(21, -8 - (open > 0 ? lift : 0)); c.stroke();
  c.fillStyle = acc ? ACC : INK; c.beginPath(); c.arc(0, 12, 5.5, 0, Math.PI * 2); c.fill(); c.fillRect(-2.5, 12, 5, 14);
  if (cross > 0) { c.strokeStyle = INK; c.lineWidth = 5; const k = eo(cross); c.beginPath(); c.moveTo(52, -36); c.lineTo(52 + 40 * k, -36 + 40 * k); c.moveTo(92, -36); c.lineTo(92 - 40 * eo(seg(cross, 0.4, 1)), -36 + 40 * eo(seg(cross, 0.4, 1))); c.stroke(); }
  c.restore();
}
function titleBlock(c, u, x, y) {
  const rows = [['CHANNEL', 'HIDDEN LINES', 30], ['No.', '001', 24], ['TITLE', 'HOW YOUR PHONE SEES YOU IN THE DARK', 22], ['SCALE', '1 : 1 · SHEET 1 OF 1', 22]];
  const RH = 64, LW = 150, WD = SAFE_R - x, H_ = rows.length * RH;
  c.save(); c.fillStyle = 'rgba(246,245,240,0.94)'; c.fillRect(x, y, WD * eo(seg(u, 0, 0.45)), H_); c.strokeStyle = INK;
  const g = eo(seg(u, 0, 0.45)); c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + WD * g, y); c.moveTo(x, y + H_); c.lineTo(x + WD * g, y + H_); c.stroke();
  const gv = eo(seg(u, 0.2, 0.55)); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + H_ * gv); c.moveTo(x + WD, y); c.lineTo(x + WD, y + H_ * gv); c.stroke();
  c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + LW, y); c.lineTo(x + LW, y + H_ * gv);
  for (let i = 1; i < rows.length; i++) { c.moveTo(x, y + i * RH); c.lineTo(x + WD * eo(seg(u, 0.25 + i * 0.08, 0.6 + i * 0.08)), y + i * RH); }
  c.stroke(); c.restore();
  rows.forEach(([lab, val, sz], i) => { const by = y + i * RH + RH / 2, d = 0.35 + i * 0.2;
    wipeText(c, lab, x + 18, by + 6, seg(u, d, d + 0.3), `500 17px ${MONO}`, FAINT, 2.4);
    wipeText(c, val, x + LW + 20, by + sz * 0.36, seg(u, d + 0.1, d + 0.55), `600 ${sz}px ${SANS}`, i === 0 ? INK : INK, 1.2); });
}

// ---------- Overlay: everything 2D at time t (labels, paths, statements) ----------
const pm = v => proj(v);
const wd = n => (TLJ.words[n.l] || []).find(w => w[0].toLowerCase().startsWith(n.w))?.[1] ?? 0;
function overlay(t, c) {
  // hook statements
  statement(c, t, K.s1, [['LIGHTS', 0], ['OFF.', 1]]);
  statement(c, t, K.s2, [['IT BRINGS', 0], ['ITS OWN.', 1]]);
  // accent pulse at the strip
  if (t > K.pulse[0] && t < K.pulse[1] + 0.3) { const p = pm(Pf); arcs(c, p, -Math.PI / 2 - 0.3, t, eo(seg(t, K.pulse[0], K.pulse[0] + 0.4)) * (1 - seg(t, K.pulse[1] - 0.2, K.pulse[1] + 0.3))); }
  // module labels (in the section)
  if (t > 12 && t < 22.5) {
    const cam = pm(ph(MOD.cam, 5.0)), fl = pm(ph(MOD.flood, 5.6)), pr = pm(ph(MOD.proj, 5.6));
    tag(c, t, K.lbFlood, fl, { dx: -60, dy: -250, name: 'FLOOD ILLUMINATOR', spec: 'an invisible flash', accent: true });
    tag(c, t, K.lbDot, pr, { dx: 40, dy: -120, name: 'DOT PROJECTOR', spec: '30,000+ dots', accent: true });
    tag(c, t, K.lbCam, cam, { dx: -40, dy: 190, name: 'INFRARED CAMERA', spec: 'sees what you can’t' });
  }
  // wavelength ruler
  if (t > K.ruler[0] && t < K.ruler[1] + 0.5) {
    const out = seg(t, K.ruler[1], K.ruler[1] + 0.45), p = seg(t, K.ruler[0], K.ruler[0] + 0.8), x0 = 90, x1 = 900, y = 1180;
    const X = nm => lerp(x0, x1, (nm - 400) / 600);
    c.save(); c.globalAlpha = 1 - out;
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(X(400), y); c.lineTo(lerp(X(400), X(1000), eo(p)), y); c.stroke();
    c.lineWidth = 1.2; for (let nm = 400; nm <= 1000; nm += 50) { if (X(nm) > lerp(X(400), X(1000), eo(p))) break; const big = nm % 100 === 0; c.beginPath(); c.moveTo(X(nm), y); c.lineTo(X(nm), y + (big ? 16 : 9)); c.stroke();
      if (big) { c.font = `400 20px ${MONO}`; c.fillStyle = GRAPH; c.textAlign = 'center'; c.fillText(nm, X(nm), y + 42); } }
    c.textAlign = 'left';
    // the band your eyes see: grey hatch, 400–700 nm
    const vb = seg(t, K.ruler[0] + 0.5, K.ruler[0] + 1.1);
    if (vb > 0) { c.save(); c.beginPath(); c.rect(X(400), y - 46, (X(700) - X(400)) * eo(vb), 34); c.clip(); c.fillStyle = '#e4e4e0'; c.fillRect(X(400), y - 46, X(700) - X(400), 34);
      c.strokeStyle = '#9a9a96'; c.lineWidth = 1; c.beginPath(); for (let k = X(400) - 40; k < X(700) + 40; k += 7) { c.moveTo(k, y - 12); c.lineTo(k + 34, y - 46); } c.stroke(); c.restore();
      c.strokeStyle = INK; c.lineWidth = 1.4; c.strokeRect(X(400), y - 46, (X(700) - X(400)) * eo(vb), 34); }
    wipeText(c, 'WHAT YOUR EYES SEE', X(400), y - 64, seg(t, K.ruler[0] + 0.9, K.ruler[0] + 1.5), `600 24px ${SANS}`, INK, 1.4, out);
    // past red: the infrared band, in accent
    const ir = seg(t, K.red - 0.2, K.red + 0.5);
    if (ir > 0) { c.fillStyle = ACC; c.fillRect(X(800), y - 46, (X(1000) - X(800)) * eo(ir), 34); }
    wipeText(c, 'INFRARED', X(800), y - 64, seg(t, K.red, K.red + 0.5), `600 24px ${SANS}`, ACC, 1.4, out);
    wipeText(c, 'wavelength, nm', X(400), y + 82, seg(t, K.ruler[0] + 0.4, K.ruler[0] + 1.0), `400 20px ${MONO}`, FAINT, 0, out);
    c.restore();
  }
  // the flood: the accent travels from the emitter to the face, then floods it
  if (t > K.floodPath[0] && t < K.floodOff[1]) {
    const a = pm(Pf), top = pm(V3(0, 100, 70)), bot = pm(V3(0, -112, 90)), mid = pm(V3(0, -10, 110));
    const pth = eo(seg(t, ...K.floodPath)), off = seg(t, ...K.floodOff);
    c.save(); c.strokeStyle = ACC; c.lineWidth = 2; c.setLineDash([10, 8]);
    for (const b of [top, bot]) { c.beginPath(); c.moveTo(a[0], a[1]); const e = [lerp(a[0], b[0], pth), lerp(a[1], b[1], pth)]; const s = [lerp(a[0], b[0], off), lerp(a[1], b[1], off)]; c.moveTo(s[0], s[1]); c.lineTo(e[0], e[1]); c.stroke(); }
    c.setLineDash([]);
    if (pth < 1) { const h = [lerp(a[0], mid[0], pth), lerp(a[1], mid[1], pth)]; dot(c, h[0], h[1], ACC, 7); }
    c.restore();
    if (t < K.floodOff[0]) tag(c, t, [K.flood[0] + 0.2, K.floodOff[0] - 0.4], pm(V3(-40, 60, 70)), { dx: -40, dy: -170, name: 'INFRARED FLOOD', spec: 'like a flash you can’t see', accent: true });
  }
  // shutter: a thin ring at the IR camera
  if (t > K.shutter && t < K.shutter + 0.5) { const p = pm(Pc), k = seg(t, K.shutter, K.shutter + 0.5); c.save(); c.strokeStyle = INK; c.lineWidth = 3 * (1 - k); c.beginPath(); c.arc(p[0], p[1], 10 + 60 * eo(k), 0, Math.PI * 2); c.stroke(); c.restore(); }
  // dots: the flat wall label, the three features, the "moved" ghosts
  if (t > K.wallLbl[0] && t < K.wallLbl[1] + 0.5) tag(c, t, K.wallLbl, pm(V3(150, 330, -303)), { dx: -30, dy: -110, name: 'FLAT WALL', spec: 'a perfect grid' });
  if (t > 46 && t < 50.2) {
    tag(c, t, K.nose, pm(V3(0, -22, 118)), { dx: 30, dy: -300, name: 'NOSE', spec: 'rows bend out' , accent: false });
    tag(c, t, K.eyes, pm(V3(26, 14, 84)), { dx: 170, dy: -110, name: 'EYES', spec: 'rows dip in' });
    tag(c, t, K.cheek, pm(V3(48, -14, 82)), { dx: 200, dy: 120, name: 'CHEEK', spec: 'rows curve away' });
  }
  if (t > K.ghosts[0] && t < K.ghosts[1] + 0.4) {
    const out = seg(t, K.ghosts[1], K.ghosts[1] + 0.4);
    GH.forEach((g, i) => { const d0 = K.ghosts[0] + i * 0.35, k = seg(t, d0, d0 + 0.5); if (k <= 0 || out >= 1) return;
      const a = pm(g.flat), b = pm(g.hit);
      c.save(); c.globalAlpha = 1 - out; c.strokeStyle = ACC; c.lineWidth = 2.5; c.beginPath(); c.arc(a[0], a[1], 9 * back(k, 2), 0, Math.PI * 2); c.stroke();
      c.setLineDash([6, 5]); c.lineWidth = 2; polyGrow(c, [a, b], seg(t, d0 + 0.2, d0 + 0.8)); c.restore(); });
    const g = GH[0], a = pm(g.flat), b = pm(g.hit);
    wipeText(c, 'WHERE A FLAT FACE WOULD PUT IT', 64, 300, seg(t, K.ghosts[0] + 0.3, K.ghosts[0] + 0.9), `600 26px ${SANS}`, INK, 1.2, out);
    wipeText(c, 'how far it moved = how close it is', 64, 340, seg(t, K.ghosts[0] + 0.6, K.ghosts[0] + 1.2), `400 22px ${MONO}`, GRAPH, 0, out);
  }
  if (t > 53.95 && t < 57.4) { const out = seg(t, 56.9, 57.3);
    wipeText(c, '3D MAP', 64, 310, seg(t, 53.95, 54.4), `600 56px ${SANS}`, INK, 1.4, out);
    wipeText(c, 'one line every 7 mm of depth', 64, 360, seg(t, 54.1, 54.7), `400 24px ${MONO}`, GRAPH, 0, out); }
  // the printed photo
  if (t > K.photoLbl[0] && t < K.photoLbl[1] + 0.5) {
    const cp = V3(CARD.w / 2, CARD.h / 2, 1).applyMatrix4(card.matrixWorld);
    tag(c, t, K.photoLbl, pm(cp), { dx: -40, dy: -160, name: 'PRINTED PHOTO', spec: 'flat: the rows stay straight' });
  }
  if (t > K.depth0[0] && t < K.depth0[1] + 0.5) {
    const a = pm(V3(-CARD.w / 2, -CARD.h / 2 - 6, 0).applyMatrix4(card.matrixWorld)), b = pm(V3(CARD.w / 2, -CARD.h / 2 - 6, 0).applyMatrix4(card.matrixWorld));
    dimLine(c, a, b, 40, 'DEPTH 0 mm', seg(t, K.depth0[0], K.depth0[0] + 0.7) * (1 - seg(t, K.depth0[1], K.depth0[1] + 0.4)));
  }
  // padlock above the phone
  if (t > K.lockOn && t < K.cardOut[0]) { const p = [820, 380], k = seg(t, K.lockOn, K.lockOn + 0.4);
    if (k > 0) { c.save(); c.globalAlpha = k; padlock(c, p[0], p[1] - 40, 0, Math.max(0, 1 - Math.abs(t - (K.shake[0] + 0.35)) / 0.35), seg(t, K.shake[0], K.shake[0] + 0.6)); c.restore(); } }
  if (t > K.stored[0] - 0.4 && t < 72) { const p = [820, 380], k = seg(t, K.stored[0] - 0.4, K.stored[0]);
    c.save(); c.globalAlpha = k; padlock(c, p[0], p[1] - 40, seg(t, K.open, K.open + 0.45), 0, 0, t > K.open); c.restore(); }
  // the stored map: label on the phone
  if (t > K.stored[0] && t < K.stored[1] + 0.5) {
    tag(c, t, K.stored, pm(ph(V3(-10, 20, 0), 5)), { dx: 150, dy: -230, name: 'STORED MAP', spec: 'kept on the phone' });
    if (t > K.match) wipeText(c, 'MATCH ✓', 64, 300, seg(t, K.match, K.match + 0.4), `600 56px ${SANS}`, INK, 1.4, seg(t, K.stored[1], K.stored[1] + 0.4));
  }
  // ending
  statement(c, t, [K.endLine, 80], [['YOU JUST', 0], ['COULDN’T', 0]], 250, 70);
  statement(c, t, [K.endLine + 0.35, 80], [['SEE', 1], ['IT.', 0]], 335, 70);
  if (t > K.title) titleBlock(c, (t - K.title) / 2.2, 64, 1180);
}
function overlayTexts(t, c) { overlay(t, c); }

// ---------- Compositing ----------
function frameAt(T) {
  drawPaper();
  renderer.setRenderTarget(null); renderer.setClearColor(0xffffff, 0); renderer.clear();
  ov.clearRect(0, 0, PX, PY);
  renderView('main', { x: 0, y: 0, w: PX, h: PY }, (dt, j) => { const tt = clamp(T + dt, 0, FILM); setScene(tt); return camAt(tt, j); });
  setScene(T); camAt(T);
  // infrared photo / stored map: a circle inset from the IR camera's own viewpoint
  const insetOn = (T > K.inset[0] && T < K.inset[1] + 0.4) ? [K.inset, 'INFRARED PHOTO'] : (T > K.stored[0] + 0.3 && T < K.stored[1] + 0.4) ? [[K.stored[0] + 0.3, K.stored[1]], 'YOUR FACE, AS DEPTH'] : null;
  if (insetOn) {
    const [[a, b], label] = insetOn, k = eo(seg(T, a, a + 0.5)) * (1 - ei(seg(T, b, b + 0.4))), R = Math.round(230 * k / 2) * 2;
    if (R > 8) {
      const cx = 300, cy = 640;
      renderView('inset', { x: cx - R, y: cy - R, w: R * 2, h: R * 2 }, (dt, j) => { setScene(T); dots.visible = false; const cm = insetAt(T, j); cm.setViewOffset(R * 2, R * 2, j[0], j[1], R * 2, R * 2); cm.aspect = 1; cm.updateProjectionMatrix(); return cm; }, { circle: true });
      dots.visible = true;
      ov.save(); ov.strokeStyle = INK; ov.lineWidth = 3; ov.beginPath(); ov.arc(cx, cy, R, 0, Math.PI * 2); ov.stroke();
      const src = pm(label === 'INFRARED PHOTO' ? Pc : ph(V3(-10, 20, 0), 5)); ov.setLineDash([8, 7]); ov.lineWidth = 1.6; ov.strokeStyle = GRAPH;
      const ang = Math.atan2(src[1] - cy, src[0] - cx); ov.beginPath(); ov.moveTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); ov.lineTo(src[0], src[1]); ov.stroke(); ov.restore();
      wipeText(ov, label, cx - R, cy - R - 24, seg(T, a + 0.3, a + 0.8), `600 26px ${SANS}`, INK, 1.4, seg(T, b, b + 0.4));
    }
  }
  overlay(T, ov);
  subtitles(ov, T);
}

// ---------- Sound events ----------
function buildEV() {
  const ev = [], panAt = (t, v) => { setScene(t); camAt(t); return clamp(pm(v)[0] / PX * 2 - 1, -1, 1); };
  ev.push({ t: K.s1[0], type: 'type', d: 0.7, pan: -0.5 });
  ev.push({ t: K.s2[0], type: 'type', d: 0.8, pan: -0.5 });
  ev.push({ t: K.pulse[0], type: 'ping', pan: 0 });
  ev.push({ t: K.sweepDown[0], type: 'sweep', d: K.sweepDown[1] - K.sweepDown[0], pan: -0.2, pan1: 0.2 });
  for (const k of ['lbFlood', 'lbDot', 'lbCam']) ev.push({ t: K[k][0], type: 'tick', pan: panAt(K[k][0], Pf) * 0.5, accent: k !== 'lbCam' });
  ev.push({ t: K.ruler[0], type: 'ruler', d: 0.8, pan: -0.3 });
  ev.push({ t: K.red - 0.2, type: 'swell', d: 0.7, pan: 0.4 });
  ev.push({ t: K.sweepUp[0], type: 'sweep', d: K.sweepUp[1] - K.sweepUp[0], pan: 0.2, pan1: -0.2, up: true });
  ev.push({ t: K.floodPath[0], type: 'zip', d: K.floodPath[1] - K.floodPath[0], pan: 0.3, pan1: -0.1 });
  ev.push({ t: K.flood[0], type: 'flood', d: K.flood[1] - K.flood[0], pan: -0.1 });
  ev.push({ t: K.flash, type: 'flash', pan: 0 });
  ev.push({ t: K.shutter, type: 'shutter', pan: 0.3 });
  ev.push({ t: K.inset[0], type: 'glass', pan: -0.5 });
  ev.push({ t: K.floodOff[0], type: 'drain', d: K.floodOff[1] - K.floodOff[0], pan: 0 });
  ev.push({ t: K.spray[0] - 0.9, type: 'dive', d: 0.9, pan: 0 });
  ev.push({ t: K.spray[0], type: 'spray', d: K.spray[1] - K.spray[0], pan: 0 });
  ev.push({ t: K.wallLbl[0], type: 'tick', pan: 0.3 });
  ev.push({ t: 43.9, type: 'orbit', d: 2.3, pan: -0.3, pan1: 0.3 });
  for (const k of ['nose', 'eyes', 'cheek']) ev.push({ t: K[k][0], type: 'tick', pan: 0.3 });
  for (let i = 0; i < 3; i++) ev.push({ t: K.ghosts[0] + i * 0.35, type: 'ruler', d: 0.5, pan: 0.1 });
  ev.push({ t: K.contour[0], type: 'contour', d: K.contour[1] - K.contour[0], pan: 0 });
  ev.push({ t: K.drainF[0], type: 'drain', d: K.drainF[1] - K.drainF[0], pan: 0 });
  ev.push({ t: K.headOut[0], type: 'slide', d: 1.0, pan: 0.2, pan1: -0.8 });
  ev.push({ t: K.cardIn[0], type: 'slide', d: 1.0, pan: 0.8, pan1: 0 });
  ev.push({ t: K.cardIn[1], type: 'seat', pan: 0 });
  ev.push({ t: K.sprayP[0], type: 'spray', d: K.sprayP[1] - K.sprayP[0], pan: 0, small: true });
  ev.push({ t: K.depth0[0], type: 'ruler', d: 0.7, pan: -0.2 });
  ev.push({ t: K.shake[0], type: 'deny', pan: 0.2 });
  ev.push({ t: K.drainP[0], type: 'drain', d: 0.4, pan: 0 });
  ev.push({ t: K.cardOut[0], type: 'slide', d: 0.8, pan: 0, pan1: 0.8 });
  ev.push({ t: K.headIn[0], type: 'slide', d: 1.0, pan: -0.8, pan1: 0 });
  ev.push({ t: K.sprayF2[0], type: 'spray', d: 0.8, pan: 0, small: true });
  ev.push({ t: K.stored[0], type: 'tick', pan: -0.2 });
  ev.push({ t: K.stored[0] + 0.3, type: 'glass', pan: -0.5 });
  ev.push({ t: K.match, type: 'type', d: 0.4, pan: -0.5 });
  ev.push({ t: K.open, type: 'unlock', pan: 0.1 });
  ev.push({ t: K.route[0], type: 'trace', d: K.route[1] - K.route[0], pan: 0 });
  ev.push({ t: K.endLine, type: 'type', d: 1.0, pan: -0.5 });
  ev.push({ t: K.title, type: 'ruler', d: 0.6, pan: -0.3 });
  ev.push({ t: K.title + 0.4, type: 'type', d: 1.3, pan: -0.3 });
  return ev.sort((a, b) => a.t - b.t).map(e => ({ ...e, t: +e.t.toFixed(4) }));
}

window.DUR = FILM;
window.TEXTS = (t) => { CAPTURE = []; setScene(t); camAt(t); ov.clearRect(0, 0, PX, PY); overlayTexts(t, ov); const r = CAPTURE; CAPTURE = null; return r; };
window.render = (t) => frameAt(t);
await Promise.all([`600 20px "Plex Sans"`, `500 20px "Plex Sans"`, `400 20px "Plex Mono"`, `500 20px "Plex Mono"`].map(f => document.fonts.load(f, 'AB')));
await document.fonts.ready;
window.EV = buildEV(); window.render(0); window.READY = true;

// Cut-paper figures and set pieces for "The Man Who Sold the Eiffel Tower" (Paris, 1925).
import { sheet, draw, rect, circle, ellipse, rng, grad, ragged } from './paper.js';

export const C = { ink: '#231a16', cream: '#efe6cf', rust: '#8a5536', rust2: '#6e4029', navy: '#26314d', navy2: '#1b2338', lamp: '#f5cf7a', red: '#a8382b', blue: '#2f4a8a', green: '#2f5a46', skin: '#e2b48f', skin2: '#c98f6a', gold: '#d9a93a' };

// ---------- the Eiffel Tower (origin at the base centre; ~905 px tall) ----------
export function tower(color = C.rust, seed = 5) {
  const half = [[-260, 0], [-235, -60], [-200, -150], [-160, -235], [-176, -238], [-176, -268], [-118, -268], [-100, -360], [-82, -460], [-70, -520], [-86, -522], [-86, -546], [-54, -546], [-40, -650], [-26, -760], [-15, -830], [-22, -834], [-22, -850], [-8, -852], [-5, -880], [0, -905]];
  const P = [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  return sheet(P, color, { seed, rim: 4.5, detail: g => {
    g.strokeStyle = 'rgba(30,15,8,.55)'; g.lineWidth = 2.2;
    const width = y => { for (let i = 0; i < half.length - 1; i++) { const [x0, y0] = half[i], [x1, y1] = half[i + 1]; if (y <= y0 && y >= y1) return -(x0 + (x1 - x0) * (y - y0) / (y1 - y0)); } return 0; };
    for (let y = -10; y > -880; y -= 26) { const w0 = width(y), w1 = width(y - 26); g.beginPath(); g.moveTo(-w0, y); g.lineTo(w1, y - 26); g.moveTo(w0, y); g.lineTo(-w1, y - 26); g.moveTo(-w0, y); g.lineTo(w0, y); g.stroke(); }
    g.fillStyle = 'rgba(25,12,6,.5)'; g.fillRect(-180, -270, 360, 8); g.fillRect(-90, -548, 180, 7);          // platforms
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(0, 0, 150, 170, 0, Math.PI, 0); g.fill(); g.globalCompositeOperation = 'source-over';   // the great arch
  } });
}

// ---------- Paris rooftops: Haussmann blocks, mansard roofs, chimneys, a dome ----------
export function paris(w, seed, color, lit = .5) {
  const r = rng(seed), P = [[0, 0]]; let x = 0;
  while (x < w) {
    const k = r(), bw = 90 + r() * 110, bh = 150 + r() * 110;
    if (k < .12) { const dr = 70 + r() * 30; P.push([x, -bh], [x + 20, -bh]); for (let a = Math.PI; a >= 0; a -= Math.PI / 14) P.push([x + 20 + dr + Math.cos(a) * dr, -bh - 40 - Math.sin(a) * dr * 1.2]); P.push([x + 20 + dr, -bh - 40 - dr * 1.2 - 40], [x + 20 + dr + 2, -bh - 40 - dr * 1.2 - 40]); P.push([x + 40 + dr * 2, -bh], [x + 60 + dr * 2, -bh]); x += 60 + dr * 2; }
    else { P.push([x, -bh], [x + 12, -bh - 40], [x + bw * .3, -bh - 40], [x + bw * .3, -bh - 62], [x + bw * .3 + 12, -bh - 62], [x + bw * .3 + 12, -bh - 40], [x + bw - 12, -bh - 40], [x + bw, -bh]); x += bw; }
  }
  P.push([x, 0]);
  return sheet(P, color, { seed, rim: 3.5, detail: g => { const q = rng(seed + 3); g.fillStyle = C.lamp;
    for (let i = 0; i < w / 14; i++) if (q() < lit) { const wx = q() * w, wy = -20 - q() * 150; g.fillRect(wx, wy, 7, 11); } } });
}

// ---------- a man in a suit, front view (origin at the feet) ----------
// hat: 'fedora' | 'bowler' | 'kepi' | null; tache: moustache; seated: draws from the waist up only
export function man(seed, { suit = C.navy, shirt = '#efe6cf', tie = C.red, hat = 'fedora', hatColor = '#2b2420', skin = C.skin, tache = false, cape = false } = {}) {
  const o = { seed, rim: 3 };
  return {
    legs: sheet([[-38, -170], [38, -170], [34, 0], [6, 0], [0, -120], [-6, 0], [-34, 0]], suit, { ...o, seed: seed + 1 }),
    coat: sheet(cape ? [[-52, -330], [52, -330], [110, -110], [-110, -110]] : [[-52, -330], [52, -330], [66, -150], [-66, -150]], suit, { ...o, detail: g => {
      g.fillStyle = shirt; g.beginPath(); g.moveTo(-18, -330); g.lineTo(18, -330); g.lineTo(0, -270); g.closePath(); g.fill();
      g.fillStyle = tie; g.beginPath(); g.moveTo(-5, -322); g.lineTo(5, -322); g.lineTo(8, -280); g.lineTo(0, -268); g.lineTo(-8, -280); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-2, -268, 4, 110); for (const y of [-240, -205]) { g.beginPath(); g.arc(0, y, 4, 0, 7); g.fill(); } } }),
    head: sheet(ellipse(0, -372, 30, 38, 36), skin, { ...o, seed: seed + 2, detail: g => {
      g.fillStyle = '#2a1810'; g.fillRect(-16, -380, 9, 4); g.fillRect(7, -380, 9, 4);
      if (tache) { g.beginPath(); g.moveTo(-18, -352); g.quadraticCurveTo(0, -362, 18, -352); g.quadraticCurveTo(0, -346, -18, -352); g.fill(); } else g.fillRect(-8, -352, 16, 3); } }),
    hat: hat === 'fedora' ? sheet([[-46, -396], [46, -396], [40, -386], [-40, -386]].concat([]), hatColor, { ...o, seed: seed + 3, detail: null }) : null,
    crown: hat === 'fedora' ? sheet([[-30, -394], [-26, -432], [-8, -426], [0, -436], [8, -426], [26, -432], [30, -394]], hatColor, { ...o, seed: seed + 4, detail: g => { g.fillStyle = 'rgba(160,40,30,.8)'; g.fillRect(-30, -404, 60, 8); } })
      : hat === 'bowler' ? sheet([[-40, -394], [40, -394], [36, -386], [30, -392], [26, -420], [10, -434], [-10, -434], [-26, -420], [-30, -392], [-36, -386]], hatColor, { ...o, seed: seed + 4 })
      : hat === 'kepi' ? sheet([[-30, -396], [34, -396], [44, -390], [30, -388], [28, -430], [-26, -432]], C.navy2, { ...o, seed: seed + 4, detail: g => { g.fillStyle = C.red; g.fillRect(-28, -432, 56, 12); } }) : null,
    arm: sheet([[-11, 0], [11, 0], [10, 150], [-10, 150]], suit, { ...o, seed: seed + 5 }),
    hand: sheet(circle(0, 158, 12, 18), skin, { ...o, seed: seed + 6, rim: 2 }),
  };
}
export function drawMan(g, M, x, y, k = 1, t = 0, { armL = 0, armR = 0, nod = 0, seated = false, bob = 0, held = null } = {}) {
  g.save(); g.translate(x, y - bob); g.scale(k, k);
  if (!seated) draw(g, M.legs, 0, 0);
  g.save(); g.translate(56, -320); g.rotate(-.12 - armR); draw(g, M.arm, 0, 0); draw(g, M.hand, 0, 0); if (held) draw(g, held, 0, 175); g.restore();
  g.save(); g.translate(-56, -320); g.rotate(.12 + armL); draw(g, M.arm, 0, 0); draw(g, M.hand, 0, 0); g.restore();
  draw(g, M.coat, 0, 0);
  const tilt = Math.sin(t * .9) * .02 + nod * .18;
  draw(g, M.head, 0, 0, 1, tilt, 0, -340); if (M.hat) draw(g, M.hat, 0, 0, 1, tilt, 0, -340); if (M.crown) draw(g, M.crown, 0, 0, 1, tilt, 0, -340);
  g.restore();
}

// ---------- paper props ----------
export function newspaper(seed = 61) {
  return sheet(rect(0, 0, 900, 1060), '#eee4cb', { seed, rim: 3.5, shadow: .35, detail: g => {
    g.fillStyle = C.ink; g.font = '800 70px "Fraunces", serif'; g.textAlign = 'center'; g.fillText('LE JOURNAL DU SOIR', 450, 100);
    g.fillRect(40, 122, 820, 4); g.fillRect(40, 132, 820, 1.5);
    g.font = 'italic 400 24px "Fraunces", serif'; g.fillText('Paris · 1925', 450, 164);
    g.fillStyle = 'rgba(35,26,22,.55)'; const r = rng(seed); for (let col = 0; col < 3; col++) for (let y = 700; y < 1020; y += 16) g.fillRect(50 + col * 280, y, 240 - (r() < .15 ? r() * 120 : 0), 6);
  } });
}
export function letter(seed = 71) {
  return sheet(rect(0, 0, 640, 820), '#f6efdd', { seed, rim: 3, shadow: .35, detail: g => {
    for (const [i, c] of [['#2f4a8a', 0], ['#f6efdd', 1], [C.red, 2]].map(([c, i]) => [i, c])) { g.fillStyle = c; g.fillRect(40 + i * 14, 40, 14, 120); }
    g.fillStyle = C.ink; g.font = '700 30px "Fraunces", serif'; g.fillText('MINISTRY OF POSTS', 110, 80); g.fillText('& TELEGRAPHS', 110, 116);
    g.font = 'italic 400 22px "Fraunces", serif'; g.fillText('Deputy Director-General', 110, 148);
    g.fillStyle = 'rgba(35,26,22,.55)'; for (let y = 230; y < 640; y += 30) g.fillRect(50, y, 520 - (y % 90 === 0 ? 120 : 0), 5);
    g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(360, 720); g.bezierCurveTo(400, 680, 420, 760, 460, 700); g.bezierCurveTo(480, 670, 500, 740, 560, 705); g.stroke();
  } });
}
export const envelope = (seed) => sheet(rect(-90, -58, 180, 116), '#eadcbc', { seed, rim: 2.5, shadow: .3, detail: g => { g.strokeStyle = 'rgba(80,50,30,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-90, -58); g.lineTo(0, 10); g.lineTo(90, -58); g.stroke(); g.fillStyle = C.red; g.beginPath(); g.arc(0, 10, 12, 0, 7); g.fill(); } });
export const banknote = (seed) => sheet(rect(-110, -55, 220, 110), grad([[0, '#c9cfae'], [1, '#a7b08a']]), { seed, rim: 2.5, shadow: .25, detail: g => {
  g.strokeStyle = 'rgba(40,60,40,.6)'; g.lineWidth = 2; g.strokeRect(-98, -44, 196, 88); g.beginPath(); g.ellipse(0, 0, 34, 30, 0, 0, 7); g.stroke();
  g.fillStyle = 'rgba(40,60,40,.85)'; g.font = '700 22px "Fraunces", serif'; g.textAlign = 'center'; g.fillText('1000', -64, -16); g.fillText('FRANCS', 0, 40); } });
export function hotel(seed = 81) {
  return sheet(rect(0, 0, 1000, 760), grad([[0, '#d8cdb4'], [1, '#b8ab90']]), { seed, rim: 4, detail: g => {
    g.fillStyle = '#a49576'; g.fillRect(0, 0, 1000, 70); g.fillRect(0, 300, 1000, 22);
    g.fillStyle = '#efe6cf'; for (let i = 0; i < 12; i++) g.fillRect(40 + i * 82, 330, 26, 430);                      // colonnade
    g.fillStyle = C.lamp; for (let i = 0; i < 11; i++) for (const y of [110, 200]) g.fillRect(70 + i * 82, y, 36, 56);
    g.fillStyle = '#5a4a3a'; for (let i = 0; i < 11; i++) g.fillRect(70 + i * 82, 420, 36, 260);
    for (const fx of [260, 740]) { g.fillStyle = '#5a4a3a'; g.fillRect(fx, -150, 5, 160); for (const [k, c] of [[0, '#2f4a8a'], [1, '#f6efdd'], [2, C.red]]) { g.fillStyle = c; g.fillRect(fx + 5 + k * 26, -150, 26, 56); } }
  } });
}
export function stamp(text, color = C.red, w = 380) {
  return sheet(rect(-w / 2, -60, w, 120), '#efe6cf', { seed: text.length * 7, rim: 3, shadow: .4, crumple: .4, grainK: .45, detail: g => {
    g.strokeStyle = color; g.lineWidth = 8; g.strokeRect(-w / 2 + 12, -48, w - 24, 96); g.fillStyle = color; g.font = '800 66px "Fraunces", serif'; g.textAlign = 'center'; g.fillText(text, 0, 23);
    g.fillStyle = 'rgba(239,230,207,.85)'; const r = rng(text.length); for (let i = 0; i < 180; i++) g.fillRect(-w / 2 + r() * w, -60 + r() * 120, 2 + r() * 4, 1.5 + r() * 2.5);   // worn ink
  } });
}
export function train(seed = 91) {
  const loco = sheet([[0, 0], [0, -120], [40, -120], [40, -180], [90, -180], [90, -120], [230, -120], [250, -150], [280, -150], [280, -120], [330, -110], [340, 0]], '#1f2230', { seed, rim: 3, detail: g => { g.fillStyle = C.lamp; g.fillRect(52, -166, 26, 30); g.fillStyle = '#7a2a22'; g.fillRect(0, -40, 340, 10); } });
  const car = sheet(rect(0, -130, 300, 130), '#3a2a2f', { seed: seed + 1, rim: 3, detail: g => { g.fillStyle = C.lamp; for (let i = 0; i < 5; i++) g.fillRect(18 + i * 56, -110, 34, 40); } });
  const wheel = sheet(circle(0, 0, 26, 24), '#16171f', { seed: seed + 2, rim: 2 });
  const puff = sheet(circle(0, 0, 50, 30), '#d9d2c4', { seed: seed + 3, rim: 3, shadow: .1 });
  return { loco, car, wheel, puff };
}
export function nyc(w, seed, color) {
  const r = rng(seed), P = [[0, 0]]; let x = 0;
  while (x < w) { const bw = 60 + r() * 90, bh = 200 + r() * 520; const spire = r() < .25;
    P.push([x, -bh * .7], [x + bw * .15, -bh * .7], [x + bw * .15, -bh], ...(spire ? [[x + bw * .45, -bh], [x + bw * .5, -bh - 120], [x + bw * .55, -bh]] : []), [x + bw * .85, -bh], [x + bw * .85, -bh * .7], [x + bw, -bh * .7]); x += bw + 6; P.push([x - 6, -60], [x, -60]); }
  P.push([x, 0]);
  return sheet(P, color, { seed, rim: 3.5, detail: g => { const q = rng(seed + 5); g.fillStyle = C.lamp; for (let i = 0; i < w / 6; i++) if (q() < .5) g.fillRect(q() * w, -40 - q() * 600, 6, 9); } });
}
export const bar = (h, seed) => sheet(rect(-11, -h, 22, h), grad([[0, '#4a4f5a'], [1, '#2a2d36']], false), { seed, rim: 2.5, shadow: .4 });
export const qmark = (seed) => sheet(rect(-60, -80, 120, 160), 'rgba(0,0,0,0)', { seed, rim: 0, shadow: 0, crumple: 0, grainK: 0, detail: g => { g.fillStyle = '#efe6cf'; g.font = '800 150px "Fraunces", serif'; g.textAlign = 'center'; g.fillText('?', 0, 55); } });
export function clockFace(seed = 99) { return sheet(circle(0, 0, 90, 48), '#efe6cf', { seed, rim: 3, shadow: .35, detail: g => { g.fillStyle = C.ink; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(Math.cos(a) * 72 - 3, Math.sin(a) * 72 - 3, 6, 6); } } }); }
export const bolt = sheet([[-30, -17], [0, -35], [30, -17], [30, 17], [0, 35], [-30, 17]], grad([[0, '#9aa0a8'], [1, '#5b616b']]), { seed: 111, rim: 2.5, detail: g => { g.fillStyle = '#3a3f48'; g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill(); } });

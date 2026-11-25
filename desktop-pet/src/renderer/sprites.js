/* Pixel-art sprite data for Kimbo.
   Each sprite is an array of equal-length strings; one character = one pixel.
   '.' is transparent. Everything else indexes into PALETTE. */
(function () {


const PALETTE = {
  K: '#15151a', // cap black
  k: '#26262e', // cap highlight
  o: '#0a0a0d', // cap strap holes
  h: '#2a1d16', // hair
  S: '#e9b185', // skin
  s: '#c98a62', // skin shadow
  L: '#f6cda6', // skin highlight
  b: '#4a3324', // eyebrow
  G: '#101014', // glasses frame
  R: '#a85f68', // rose lens
  r: '#c8838b', // rose lens highlight
  E: '#2a1a12', // eye
  D: '#3a2a1e', // beard
  d: '#4d3826', // beard light
  M: '#8a5247', // mouth
  W: '#efe7d8', // cream tee
  w: '#d9d0c0', // cream shade
  C: '#1f3d2b', // cardigan
  c: '#15291d', // cardigan shade
  n: '#2d5a3e', // cardigan light
  P: '#2b2f38', // trousers
  p: '#1d212a', // trousers shade
  X: '#0e0e12', // shoes
  J: '#c8102e', // jersey red
  j: '#960c22', // jersey shade
  F: '#f5f5f5', // white (jersey number, snow, eyes)
  T: '#c99a63', // dog tan
  t: '#a87c4c', // dog tan shade
  N: '#7a4a2a', // dog nose / collar
  A: '#3a3f4a', // laptop body
  a: '#555c6a', // laptop edge
  Z: '#8fd8e8', // screen glow
  z: '#5fb6cc', // screen glow dim
  U: '#c0392b', // mug
  u: '#8e2a20', // mug shade
  V: '#6b4a2f', // console / wood
  v: '#4a331f',
  Q: '#9aa3b2', // blanket / pillow
  q: '#78808c',
  g: '#2f8f4f', // console green led
};

/* ---------- head: 18 x 20 ---------- */
const HEAD = [
  '....KKKKKKKKKK....',
  '..KKKKKKKKKKKKKK..',
  '.KKKKKKKKKKKKKKKK.',
  'KKKKKKKKKKKKKKKKKK',
  'KKKK.hhhhhhhh.KKKK',
  'KKK.hhhhhhhhhh.KKK',
  'KKKKKKKKKKKKKKKKKK',
  'KKKoKoKoKoKoKoKKKK',
  '.KKKKKKKKKKKKKKKK.',
  '..sSSSSSSSSSSSSs..',
  '.sSSSSSLLLLSSSSSs.',
  '.DSSSSSSSSSSSSSSD.',
  '.DbbbbbSSSSbbbbbD.',
  '.GGGGGG.GG.GGGGGG.',
  'GGrRRRGGSSGGRRRrGG',
  'GGRRRRGGSSGGRRRRGG',
  '.GGGGGG.sS.GGGGGG.',
  '..DDSSSDDDDSSSDD..',
  '..DDSSSMMMMSSSDD..',
  '...DDDDDDDDDDDD...',
];

/* asleep: lenses go dark, mouth relaxes */
const HEAD_SLEEP = HEAD.map((row, y) => {
  if (y === 14) return 'GGkkkkGGSSGGkkkkGG';
  if (y === 15) return 'GGkkkkGGSSGGkkkkGG';
  if (y === 18) return '..DDSSSSMMSSSSDD..';
  return row;
});

/* ---------- torso: 14 wide ---------- */
const TORSO = [
  '...WWWWWWWW...',
  '..CWWWWWWWWC..',
  '.CCCWWWWWWCCC.',
  'CCCCWWWWWWCCCC',
  'CCCCWWWWWWCCCC',
  'nCCCWWWWWWCCCn',
  'nCCCWWWWWWCCCn',
  '.CCCCWWWWCCCC.',
  '..CCCCCCCCCC..',
];

const TORSO_JERSEY = [
  '...JJJJJJJJ...',
  '..JJJJJJJJJJ..',
  '.JJJJJJJJJJJJ.',
  'JJJJ.F.FFFJJJJ',
  'JJJJFF.F.FJJJJ',
  'jJJJ.F.F.FJJJj',
  'jJJJ.F.F.FJJJj',
  '.JJJFF.FFFJJJ.',
  '..jjjjjjjjjj..',
];

const LEGS_STAND = [
  '...PPP..PPP...',
  '...PPP..PPP...',
  '...PPP..PPP...',
  '...ppp..ppp...',
  '..XXXX..XXXX..',
];

const LEGS_WALK_A = [
  '...PPP..PPP...',
  '..PPP....PPP..',
  '.PPP......PPP.',
  '.ppp......ppp.',
  'XXXX......XXXX',
];

const LEGS_WALK_B = [
  '...PPP..PPP...',
  '...PPP..PPP...',
  '...PPPPPPP....',
  '....ppppp.....',
  '...XXXXXX.....',
];

const LEGS_SIT = [
  '..PPPPPPPPPP..',
  '.PPPPPPPPPPPP.',
  '.pppp....pppp.',
  '.XXXX....XXXX.',
  '..............',
];

/* ---------- props ---------- */
const LAPTOP = [
  '..aAAAAAAAAa..',
  '..aAZZZZZZAa..',
  '..aAZzzzzZAa..',
  '..aAZZZZZZAa..',
  '..aAAAAAAAAa..',
  '.aaaaaaaaaaaa.',
  'aAAAAAAAAAAAAa',
  '.aaaaaaaaaaaa.',
];

const CONSOLE = [
  '..VVVVVVVV..',
  '.VVVVVVVVVV.',
  'VVKVVggVVKVV',
  '.VVVVVVVVVV.',
  '..V......V..',
];

const MUG = [
  'UUUUU..',
  'UuuuUUU',
  'Uuuuu.U',
  'UuuuUUU',
  'UUUUU..',
];

const BED = [
  'V......................V',
  'VV....................VV',
  'VVQQQQ................VV',
  'VVQQQQQQQQQQQQQQQQQQQQVV',
  'VVqqqqqqqqqqqqqqqqqqqqVV',
  'VVVVVVVVVVVVVVVVVVVVVVVV',
  '.VV..................VV.',
  '.VV..................VV.',
];

const DESK = [
  'VVVVVVVVVVVVVVVVVVVVVVVVVVVV',
  'vvvvvvvvvvvvvvvvvvvvvvvvvvvv',
  '.VV......................VV.',
  '.VV......................VV.',
  '.VV......................VV.',
  '.VV......................VV.',
  '.VV......................VV.',
  '.vv......................vv.',
];

const STOOL = [
  'VVVVVVVV',
  'vvvvvvvv',
  '.V....V.',
  '.V....V.',
  '.v....v.',
];

const DOG = [
  '.............TT.',
  '..TTTTTTTTTTTTTT',
  '.TTTTTTTTTTTTTNT',
  'TtTTTTTTTTTTTTT.',
  '.T...T...T...T..',
  '.t...t...t...t..',
];

const SNOWMAN = [
  '...FFFF...',
  '..FFFFFF..',
  '..FKFFKF..',
  '..FFNNFF..',
  '..FFFFFF..',
  '.FFFFFFFF.',
  'FFFFFFFFFF',
  'FFFKFFKFFF',
  'FFFFFFFFFF',
  '.FFFFFFFF.',
  '..FFFFFF..',
];

const ZZZ = [
  'FFFFF',
  '...F.',
  '..F..',
  '.F...',
  'FFFFF',
];

const SPRITES = {
  HEAD, HEAD_SLEEP, TORSO, TORSO_JERSEY,
  LEGS_STAND, LEGS_WALK_A, LEGS_WALK_B, LEGS_SIT,
  LAPTOP, CONSOLE, MUG, BED, DESK, STOOL, DOG, SNOWMAN, ZZZ,
};

/* Draw a sprite onto a 2d context at (ox, oy) with pixel size `px`.
   Optional `tint` multiplies nothing — it simply overrides a palette key map. */
function drawSprite(ctx, sprite, ox, oy, px, overrides) {
  const pal = overrides ? Object.assign({}, PALETTE, overrides) : PALETTE;
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * px, oy + y * px, px, px);
    }
  }
}

function spriteWidth(sprite) { return sprite[0].length; }
function spriteHeight(sprite) { return sprite.length; }

/* Validate that every sprite is rectangular — catches typos in the maps. */
function validateSprites() {
  const bad = [];
  for (const [name, sprite] of Object.entries(SPRITES)) {
    const w = sprite[0].length;
    sprite.forEach((row, i) => {
      if (row.length !== w) bad.push(`${name} row ${i}: ${row.length} != ${w}`);
    });
  }
  return bad;
}

if (typeof window !== 'undefined') {
  window.Sprites = { PALETTE, SPRITES, drawSprite, spriteWidth, spriteHeight, validateSprites };
}
if (typeof module !== 'undefined') {
  module.exports = { PALETTE, SPRITES, drawSprite, spriteWidth, spriteHeight, validateSprites };
}
})();

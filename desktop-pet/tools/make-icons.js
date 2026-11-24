/* Renders the app/tray icons from the sprite data so the icon can never drift
   from the pet. Dev-only: needs playwright. The PNGs it writes are committed.
     node tools/make-icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PALETTE, SPRITES } = require('../src/renderer/sprites.js');

const OUT = path.join(__dirname, '..', 'assets');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();

  async function render(size, pad, bg) {
    const buf = await page.evaluate(async ({ PALETTE, HEAD, size, pad, bg }) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      if (bg) {
        ctx.fillStyle = bg;
        const r = size * 0.22;
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, r);
        ctx.fill();
      }
      const cols = HEAD[0].length, rows = HEAD.length;
      const px = Math.floor((size - pad * 2) / Math.max(cols, rows));
      const ox = Math.round((size - cols * px) / 2);
      const oy = Math.round((size - rows * px) / 2);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const ch = HEAD[y][x];
          if (ch === '.') continue;
          ctx.fillStyle = PALETTE[ch] || '#f0f';
          ctx.fillRect(ox + x * px, oy + y * px, px, px);
        }
      }
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, { PALETTE, HEAD: SPRITES.HEAD, size, pad, bg });
    return Buffer.from(buf);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'icon.png'), await render(512, 48, '#c8102e'));
  fs.writeFileSync(path.join(OUT, 'tray.png'), await render(36, 1, null));
  fs.writeFileSync(path.join(OUT, 'tray@2x.png'), await render(72, 2, null));
  await b.close();
  console.log('wrote assets/icon.png, assets/tray.png, assets/tray@2x.png');
})();

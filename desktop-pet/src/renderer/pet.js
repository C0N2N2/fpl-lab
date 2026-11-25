/* Kimbo: the state machine and everything that gets drawn on the strip. */

(function () {

const { SPRITES, drawSprite, PALETTE } = window.Sprites;

const HEAD_W = 18, HEAD_H = 20;
const TORSO_W = 14, TORSO_H = 9;
const LEGS_H = 5;
const BODY_ROWS = HEAD_H + TORSO_H + LEGS_H - 1; // 1 row of neck overlap
const STOOL_H = SPRITES.STOOL.length;            // he sits this high at the desk

const LINES = {
  idle: [
    'Yalla, what are we doing?',
    'Standing here. Supervising.',
    'You good?',
    'One more reel. Then work. Promise.',
    'I am not procrastinating. I am buffering.',
    'Tab number forty-one. Bold.',
    'Looking busy is also a skill.',
  ],
  morning: ['Sabah el kheir.', 'I am up! I am up!', 'Coffee first. Obviously.'],
  night:   ['It is late, twin.', 'Sleep is also productivity.', 'Last one. Then bed.'],
  focus:   ['Locked in.', 'Do not touch the phone.', 'Deep work. Respect.', 'I am watching the screen for you.'],
  focusEnd:['Session done. Breathe.', 'That is one. Go again?', 'Break time. Stand up.'],
  desk:    ['Answering emails. Allegedly.', 'At my desk. Very professional.', 'Just checking one thing.'],
  bored:   ['Bored. Loading a game.', 'Nothing to do, so…', 'Where did everyone go?'],
  wake:    ['I am up! I am up!', 'Five more minutes.', 'Who pressed the thing?'],
  done:    ['Shoghl! Nice one.', 'Ticked. Love that.', 'One down, keep going.', 'That is the energy.'],
  poke:    ['Oi.', 'Careful.', 'Stop poking, twin.', 'Yes? Hello?'],
  grabbed: ['Put me down.', 'Wheee.', 'Easy, easy.', 'I can walk, you know.'],
  dropped: ['Thanks. I think.', 'Nice landing.', 'Warn me next time.'],
  rain:    ['Raining. Stay in. Work.', 'Weather is on my side today.'],
  snow:    ['Snow! Building a guy.', 'It is freezing out there.'],
  storm:   ['Did you see that?', 'Save your work. Now.'],
  dog:     ['Kimbo! Come here.', '*sniffs Kimbo*', 'Good boy.'],
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];

class Pet {
  constructor(opts = {}) {
    this.px = opts.scale || 4;
    this.x = opts.x || 180;
    this.dir = 1;
    this.state = 'idle';
    this.t = 0;              // seconds in current state
    this.frame = 0;
    this.speed = 34;         // px/sec when walking
    this.bubble = null;      // { text, until }
    this.note = null;        // text on the paper he holds up
    this.jersey = false;
    this.confetti = [];
    this.zzz = 0;
    this.nextIdleLine = 14 + Math.random() * 25;
    this.focusEndsAt = null;
    this.focusKind = 'work';
    this.forcedSleep = false; // set when *you* send him to bed — survives the behaviour tick
    this.homeY = 0;
    this.hop = 0;

    // picking him up
    this.lift = 0;           // px above the ground line
    this.vy = 0;             // fall velocity after you let go
    this.dragging = false;
  }

  get width()  { return HEAD_W * this.px; }
  get height() { return BODY_ROWS * this.px; }
  get atDesk() { return this.state === 'focus' || this.state === 'desk'; }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.t = 0;
    this.frame = 0;
    if (s === 'walk') this.dir = Math.random() < 0.5 ? -1 : 1;
  }

  say(text, seconds = 4.5) {
    if (!text) return;
    this.bubble = { text, until: performance.now() + seconds * 1000 };
  }

  /* Hold up a paper with the reminder written on it. */
  showNote(text, seconds = 14) {
    this.note = text;
    this.noteUntil = performance.now() + seconds * 1000;
    this.setState('remind');
  }

  clearNote() {
    this.note = null;
    this.noteUntil = 0;
    if (this.state === 'remind') this.setState('idle');
  }

  /* ---------------- being picked up ---------------- */

  grab() {
    this.dragging = true;
    this.vy = 0;
    this.wasState = (this.state === 'remind' || this.state === 'falling') ? 'idle' : this.state;
    this.setState('held');
    this.say(pick(LINES.grabbed), 3);
  }

  dragTo(x, groundY, y, maxLift) {
    if (!this.dragging) return;
    this.x = x;
    const ceiling = (maxLift == null) ? Infinity : Math.max(0, maxLift);
    this.lift = Math.min(ceiling, Math.max(0, groundY - y));
  }

  release() {
    if (!this.dragging) return;
    this.dragging = false;
    this.vy = 0;
    // picking him up takes him away from his desk / out of bed — he does not
    // teleport the furniture with him
    if (this.wasState === 'desk' || this.wasState === 'sleep') this.wasState = 'idle';
    this.setState(this.lift > 4 ? 'falling' : (this.wasState || 'idle'));
    if (this.lift <= 4) this.lift = 0;
  }

  /* ---------------- behaviour ---------------- */

  update(dt, w, ground, ctxState) {
    this.t += dt;
    this.frame += dt;
    this.homeY = ground;

    if (this.bubble && performance.now() > this.bubble.until) this.bubble = null;
    if (this.note && this.noteUntil && performance.now() > this.noteUntil) {
      this.note = null;
      if (this.state === 'remind') this.setState('idle');
    }

    // gravity, once you let go of him
    if (!this.dragging && this.lift > 0) {
      this.vy += 1500 * dt;
      this.lift -= this.vy * dt;
      if (this.lift <= 0) {
        this.lift = 0;
        if (this.vy > 260) { this.vy = -this.vy * 0.28; this.lift = 0.1; }  // one small bounce
        else {
          this.vy = 0;
          if (this.state === 'falling') {
            this.setState(this.wasState || 'idle');
            this.say(pick(LINES.dropped), 3);
          }
        }
      }
    }

    if (this.dragging) return;   // nothing else happens while he is in your hand

    switch (this.state) {
      case 'idle': {
        this.nextIdleLine -= dt;
        if (this.nextIdleLine <= 0) {
          this.nextIdleLine = 18 + Math.random() * 30;
          const tod = ctxState.tod;
          if (tod === 'dawn') this.say(pick(LINES.morning));
          else if (tod === 'night' || tod === 'evening') this.say(pick(LINES.night));
          else this.say(pick(LINES.idle));
        }
        if (this.t > 6 + Math.random() * 8) this.setState('walk');
        break;
      }

      case 'walk': {
        this.x += this.dir * this.speed * dt;
        const margin = this.width;
        if (this.x < margin) { this.x = margin; this.dir = 1; }
        if (this.x > w - margin) { this.x = w - margin; this.dir = -1; }
        if (this.t > 5 + Math.random() * 7) this.setState('idle');
        break;
      }

      case 'desk': {
        if (this.t > 30 + Math.random() * 60) this.setState('idle');
        else if (this.t > 4 && !this._saidDesk) { this._saidDesk = true; this.say(pick(LINES.desk)); }
        break;
      }

      case 'focus': {
        if (this.focusEndsAt) {
          const left = (this.focusEndsAt - Date.now()) / 1000;
          if (left <= 0) {
            this.say(pick(LINES.focusEnd), 6);
            this.setState('idle');
            this.focusEndsAt = null;
            if (this.onFocusEnd) this.onFocusEnd(this.focusKind);
          } else if (this.t > 8 && !this._saidFocus) {
            this._saidFocus = true;
            this.say(pick(LINES.focus));
          }
        }
        break;
      }

      case 'game':
      case 'sleep':
        this.zzz += dt;
        break;

      case 'drink':
        if (this.t > 5) this.setState(this.note ? 'remind' : 'idle');
        break;

      case 'celebrate':
        if (this.t > 3) this.setState('idle');
        break;
    }

    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.vy += 420 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.life -= dt;
      if (c.life <= 0 || c.y > ground + 10) this.confetti.splice(i, 1);
    }

    if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 3);
  }

  celebrate() {
    this.setState('celebrate');
    this.say(pick(LINES.done), 5);
    this.hop = 1;
    for (let i = 0; i < 46; i++) {
      this.confetti.push({
        x: this.x + (Math.random() - 0.5) * 40,
        y: this.homeY - this.height * 0.8,
        vx: (Math.random() - 0.5) * 190,
        vy: -120 - Math.random() * 190,
        life: 1.1 + Math.random() * 1.1,
        c: pick(['#c8102e', '#2d5a3e', '#efe7d8', '#e9b185', '#8fd8e8', '#f2c14e']),
        s: 2 + Math.floor(Math.random() * 3),
      });
    }
  }

  startFocus(minutes, kind = 'work') {
    this.focusKind = kind;
    this.focusEndsAt = Date.now() + minutes * 60_000;
    this._saidFocus = false;
    this.setState('focus');
    this.say(kind === 'work' ? `Focus. ${minutes} min. Go.` : `Break. ${minutes} min.`, 5);
  }

  stopFocus() {
    this.focusEndsAt = null;
    this.setState('idle');
  }

  /* ---------------- drawing ---------------- */

  hitBox() {
    const px = this.px;
    const w = this.width;
    const base = this.homeY - this.lift;

    if (this.state === 'sleep') {
      const bedW = SPRITES.BED[0].length * px;
      const bedH = SPRITES.BED.length * px;
      return { x: this.x - bedW / 2 - 4, y: base - bedH - HEAD_H * px, w: bedW + 8, h: bedH + HEAD_H * px };
    }

    const deskLift = this.atDesk ? STOOL_H * px : 0;
    const h = this.height + deskLift;
    const boxW = this.atDesk ? Math.max(w, SPRITES.DESK[0].length * px) : w;
    return { x: this.x - boxW / 2 - 6, y: base - h - 34, w: boxW + 12, h: h + 40 };
  }

  draw(ctx, ground) {
    const px = this.px;
    const base = ground - this.lift;

    if (this.state === 'sleep') { this.drawSleeping(ctx, base); this.drawBubble(ctx, ground); return; }

    const sitting = this.atDesk || this.state === 'game';
    const held = this.dragging || this.state === 'falling';
    const hopOff = Math.round(Math.sin(this.hop * Math.PI) * 10);

    // breathing bob — one pixel, slow
    const bob = (this.state === 'idle' && Math.sin(this.frame * 2) > 0.4) ? px : 0;
    const sitDrop = this.state === 'game' ? 3 * px : 0;
    const deskLift = this.atDesk ? STOOL_H * px : 0;

    const legsTop  = base - LEGS_H * px + sitDrop - hopOff - deskLift;
    const torsoTop = legsTop - TORSO_H * px;
    const headTop  = torsoTop - (HEAD_H - 1) * px + bob;

    const torsoX = Math.round(this.x - (TORSO_W / 2) * px);
    const headX  = Math.round(this.x - (HEAD_W / 2) * px);

    // the stool goes down first, behind everything
    if (this.atDesk) {
      const stW = SPRITES.STOOL[0].length * px;
      drawSprite(ctx, SPRITES.STOOL, Math.round(this.x - stW / 2), base - STOOL_H * px, px);
    }

    // legs
    let legs = SPRITES.LEGS_STAND;
    if (sitting) legs = SPRITES.LEGS_SIT;
    else if (held) legs = SPRITES.LEGS_WALK_A;   // dangling
    else if (this.state === 'walk') legs = (Math.floor(this.frame * 7) % 2) ? SPRITES.LEGS_WALK_A : SPRITES.LEGS_WALK_B;
    drawSprite(ctx, legs, torsoX, legsTop, px);

    // torso + head
    drawSprite(ctx, this.jersey ? SPRITES.TORSO_JERSEY : SPRITES.TORSO, torsoX, torsoTop, px);
    drawSprite(ctx, SPRITES.HEAD, headX, headTop, px);

    // the desk is drawn in front of him, so he reads as sitting behind it
    if (this.atDesk) {
      const dW = SPRITES.DESK[0].length * px;
      const dH = SPRITES.DESK.length * px;
      const dX = Math.round(this.x - dW / 2);
      const dY = base - dH;

      if (this.state === 'focus') {
        const flicker = 0.10 + Math.abs(Math.sin(this.frame * 3.1)) * 0.07;
        ctx.fillStyle = `rgba(143,216,232,${flicker})`;
        ctx.fillRect(headX, headTop + 8 * px, HEAD_W * px, 10 * px);
      }

      drawSprite(ctx, SPRITES.DESK, dX, dY, px);

      const lW = SPRITES.LAPTOP[0].length * px;
      const lH = SPRITES.LAPTOP.length * px;
      drawSprite(ctx, SPRITES.LAPTOP, Math.round(this.x - lW / 2), dY - lH + 2 * px, px);
    }

    if (this.state === 'game') {
      const cw = SPRITES.CONSOLE[0].length * px;
      drawSprite(ctx, SPRITES.CONSOLE, Math.round(this.x - cw / 2), torsoTop + 5 * px, px);
    }

    if (this.state === 'drink') {
      const mx = Math.round(this.x + (TORSO_W / 2) * px - 3 * px);
      drawSprite(ctx, SPRITES.MUG, mx, torsoTop + 4 * px, px);
    }

    for (const c of this.confetti) {
      ctx.fillStyle = c.c;
      ctx.fillRect(Math.round(c.x), Math.round(c.y), c.s, c.s);
    }

    if (this.note) this.drawSign(ctx, torsoTop);
    this.drawBubble(ctx, ground);
  }

  /* The paper he holds up with the reminder written on it. */
  drawSign(ctx, torsoTop) {
    const px = this.px;
    const text = this.note;
    ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textBaseline = 'top';

    // wrap to at most three lines
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const probe = line ? `${line} ${word}` : word;
      if (ctx.measureText(probe).width > 150 && line) { lines.push(line); line = word; }
      else line = probe;
    }
    if (line) lines.push(line);
    while (lines.length > 3) lines.pop();

    const lineH = 14;
    const padX = 8, padY = 7;
    const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
    const pw = Math.ceil(tw) + padX * 2;
    const ph = lines.length * lineH + padY * 2;

    const screenW = ctx.canvas.width / (window.devicePixelRatio || 1);
    let left = this.x + (TORSO_W / 2) * px + 3 * px;
    if (left + pw > screenW - 6) left = this.x - (TORSO_W / 2) * px - 3 * px - pw;  // flip to his other side
    left = Math.round(Math.max(6, left));
    const top = Math.round(torsoTop + 2 * px - ph + lineH);

    // arm reaching out to hold it
    const shoulderX = this.x + (left > this.x ? (TORSO_W / 2) * px - px : -(TORSO_W / 2) * px + px);
    const handX = left > this.x ? left + 3 : left + pw - 3;
    ctx.strokeStyle = PALETTE.C;
    ctx.lineWidth = px;
    ctx.beginPath();
    ctx.moveTo(shoulderX, torsoTop + 4 * px);
    ctx.lineTo(handX, top + ph - 2);
    ctx.stroke();

    // paper
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(left + 3, top + 3, pw, ph);
    ctx.fillStyle = '#f6f1e4';
    ctx.fillRect(left, top, pw, ph);
    ctx.fillStyle = '#2b2f38';
    ctx.fillRect(left, top, pw, 2);
    ctx.fillRect(left, top + ph - 2, pw, 2);
    ctx.fillRect(left, top, 2, ph);
    ctx.fillRect(left + pw - 2, top, 2, ph);

    ctx.fillStyle = '#23262c';
    lines.forEach((l, i) => ctx.fillText(l, left + padX, top + padY + i * lineH));
  }

  drawSleeping(ctx, base) {
    const px = this.px;
    const bedW = SPRITES.BED[0].length * px;
    const bedH = SPRITES.BED.length * px;
    const bedX = Math.round(this.x - bedW / 2);
    const bedY = base - bedH;
    drawSprite(ctx, SPRITES.BED, bedX, bedY, px);

    // head on the pillow, then the blanket over him so he reads as tucked in
    const headX = bedX + 3 * px;
    const headY = bedY + 5 * px - HEAD_H * px;
    drawSprite(ctx, SPRITES.HEAD_SLEEP, headX, headY, px);
    ctx.fillStyle = PALETTE.Q;
    ctx.fillRect(bedX + 2 * px, bedY + 3 * px, bedW - 4 * px, px);
    ctx.fillStyle = PALETTE.q;
    ctx.fillRect(bedX + 2 * px, bedY + 4 * px, bedW - 4 * px, px);

    // z   z   z — each one rises, drifts and fades on its own beat
    for (let i = 0; i < 3; i++) {
      const phase = ((this.zzz * 0.4) + i * 0.34) % 1;
      const scale = Math.max(2, Math.round(px * (0.5 + phase * 0.8)));
      const zx = headX + HEAD_W * px - 2 * px + phase * 26;
      const zy = headY + 2 * px - phase * 46;
      ctx.globalAlpha = Math.max(0, 1 - phase * 1.15);
      drawSprite(ctx, SPRITES.ZZZ, Math.round(zx), Math.round(zy), scale);
      ctx.globalAlpha = 1;
    }
  }

  drawBubble(ctx, ground) {
    if (!this.bubble) return;
    const text = this.bubble.text;
    const pad = 7;
    ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textBaseline = 'top';
    const tw = Math.ceil(ctx.measureText(text).width);
    const bw = tw + pad * 2;
    const bh = 24;
    const timerGap = (this.state === 'focus' && this.focusEndsAt) ? 26 : 0;
    const base = ground - this.lift;
    const topOfHead = base - this.height - (this.state === 'sleep' ? -20 : 10) - timerGap;
    let bx = Math.round(this.x - bw / 2);
    let by = Math.round(topOfHead - bh);

    const w = ctx.canvas.width / (window.devicePixelRatio || 1);
    bx = Math.max(6, Math.min(bx, w - bw - 6));
    by = Math.max(4, by);

    ctx.fillStyle = 'rgba(18,20,24,0.94)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#efe7d8';
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillRect(bx, by + bh - 2, bw, 2);
    ctx.fillRect(bx, by, 2, bh);
    ctx.fillRect(bx + bw - 2, by, 2, bh);

    const tx = Math.max(bx + 8, Math.min(Math.round(this.x) - 4, bx + bw - 16));
    ctx.fillStyle = 'rgba(18,20,24,0.94)';
    ctx.fillRect(tx, by + bh, 8, 6);
    ctx.fillStyle = '#efe7d8';
    ctx.fillRect(tx, by + bh + 4, 8, 2);

    ctx.fillStyle = '#efe7d8';
    ctx.fillText(text, bx + pad, by + 6);
  }
}

/* Kimbo the dog — wanders in now and then, sits with him, leaves. */
class Dog {
  constructor(px) {
    this.px = px;
    this.active = false;
    this.x = -60;
    this.dir = 1;
    this.target = 0;
    this.phase = 'off';
    this.t = 0;
    this.cooldown = 60 + Math.random() * 180;
  }
  update(dt, w, ground, petX) {
    this.cooldown -= dt;
    if (!this.active && this.cooldown <= 0) {
      this.active = true;
      this.phase = 'in';
      this.dir = Math.random() < 0.5 ? 1 : -1;
      this.x = this.dir === 1 ? -40 : w + 40;
      this.target = petX + (this.dir === 1 ? -40 : 40);
      this.t = 0;
    }
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'in') {
      this.x += this.dir * 58 * dt;
      if ((this.dir === 1 && this.x >= this.target) || (this.dir === -1 && this.x <= this.target)) {
        this.phase = 'sit'; this.t = 0;
      }
    } else if (this.phase === 'sit') {
      if (this.t > 7) { this.phase = 'out'; this.dir *= -1; }
    } else if (this.phase === 'out') {
      this.x += this.dir * 58 * dt;
      if (this.x < -60 || this.x > w + 60) {
        this.active = false;
        this.phase = 'off';
        this.cooldown = 120 + Math.random() * 300;
      }
    }
  }
  draw(ctx, ground) {
    if (!this.active) return;
    const px = this.px;
    const h = SPRITES.DOG.length * px;
    const w = SPRITES.DOG[0].length * px;
    ctx.save();
    if (this.dir === -1) {
      ctx.translate(Math.round(this.x) + w / 2, 0);
      ctx.scale(-1, 1);
      drawSprite(ctx, SPRITES.DOG, -w / 2, ground - h, px);
    } else {
      drawSprite(ctx, SPRITES.DOG, Math.round(this.x) - w / 2, ground - h, px);
    }
    ctx.restore();
  }
}

window.PetKit = { Pet, Dog, LINES, pick };

})();

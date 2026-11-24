/* Atmosphere: particles, snow drifts, fog, lightning and a time-of-day wash.
   Everything is drawn in the transparent strip along the bottom of the screen,
   so the only thing that reads as "weather" is what moves through it. */
(function () {


const CONDITIONS = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'snow', 'storm'];

function timeOfDay(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 5.5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 17) return 'day';
  if (h < 19.5) return 'dusk';
  if (h < 22) return 'evening';
  return 'night';
}

// A faint wash sitting behind the pet so the strip feels like it has air in it.
const WASH = {
  dawn:    ['rgba(255,176,120,0.00)', 'rgba(255,146,96,0.16)'],
  day:     ['rgba(160,210,255,0.00)', 'rgba(130,190,255,0.10)'],
  dusk:    ['rgba(255,120,90,0.00)',  'rgba(190,80,120,0.20)'],
  evening: ['rgba(80,70,150,0.00)',   'rgba(50,40,110,0.22)'],
  night:   ['rgba(20,24,60,0.00)',    'rgba(10,14,40,0.28)'],
};

class Weather {
  constructor() {
    this.condition = 'clear';
    this.temp = null;
    this.isDay = true;
    this.tod = timeOfDay();
    this.particles = [];
    this.drift = null;        // snow accumulation heights, one per column bucket
    this.driftBucket = 6;
    this.flash = 0;
    this.nextFlash = 0;
    this.simIndex = 0;
    this.error = null;
  }

  set(data) {
    if (!data) return;
    if (data.error) { this.error = data.error; return; }
    this.error = null;
    if (data.condition) this.condition = data.condition;
    if (typeof data.temp === 'number') this.temp = data.temp;
    if (typeof data.isDay === 'boolean') this.isDay = data.isDay;
  }

  // Simulated mode cycles slowly so you can actually see every atmosphere.
  simulate() {
    this.simIndex = (this.simIndex + 1) % CONDITIONS.length;
    this.condition = CONDITIONS[this.simIndex];
  }

  resize(w) {
    const n = Math.ceil(w / this.driftBucket) + 1;
    const old = this.drift;
    this.drift = new Float32Array(n);
    if (old) for (let i = 0; i < Math.min(old.length, n); i++) this.drift[i] = old[i];
  }

  update(dt, w, h, ground) {
    this.tod = timeOfDay();
    if (!this.drift || this.drift.length * this.driftBucket < w) this.resize(w);

    const c = this.condition;
    const spawn =
      c === 'rain'  ? 2.4 :
      c === 'storm' ? 4.0 :
      c === 'snow'  ? 1.1 : 0;

    if (spawn) {
      this._acc = (this._acc || 0) + spawn * dt * 60;
      while (this._acc >= 1) {
        this._acc -= 1;
        const snow = c === 'snow';
        this.particles.push({
          x: Math.random() * (w + 120) - 60,
          y: -10 - Math.random() * 40,
          vx: snow ? (Math.random() - 0.5) * 24 : (c === 'storm' ? -150 : -90),
          vy: snow ? 26 + Math.random() * 26 : 520 + Math.random() * 220,
          size: snow ? (Math.random() < 0.35 ? 3 : 2) : 2,
          snow,
          sway: Math.random() * Math.PI * 2,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.sway += dt * 2.2;
      p.x += (p.vx + (p.snow ? Math.sin(p.sway) * 18 : 0)) * dt;
      p.y += p.vy * dt;
      if (p.y >= ground) {
        if (p.snow) {
          const b = Math.max(0, Math.min(this.drift.length - 1, Math.floor(p.x / this.driftBucket)));
          this.drift[b] = Math.min(10, this.drift[b] + 0.34);
          // bleed into neighbours so drifts look soft rather than spiky
          if (b > 0) this.drift[b - 1] = Math.min(10, this.drift[b - 1] + 0.12);
          if (b < this.drift.length - 1) this.drift[b + 1] = Math.min(10, this.drift[b + 1] + 0.12);
        }
        this.particles.splice(i, 1);
      } else if (p.x < -80 || p.x > w + 80) {
        this.particles.splice(i, 1);
      }
    }

    // melt the drifts away once it stops snowing
    if (c !== 'snow' && this.drift) {
      for (let i = 0; i < this.drift.length; i++) {
        if (this.drift[i] > 0) this.drift[i] = Math.max(0, this.drift[i] - dt * 0.35);
      }
    }

    if (c === 'storm') {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 4 + Math.random() * 9; }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
  }

  drawBehind(ctx, w, h, ground) {
    const pair = WASH[this.tod] || WASH.day;
    const g = ctx.createLinearGradient(0, ground - 150, 0, h);
    g.addColorStop(0, pair[0]);
    g.addColorStop(1, pair[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, ground - 150, w, h - ground + 150);

    if (this.condition === 'fog') {
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      for (let i = 0; i < 4; i++) {
        const y = ground - 20 - i * 26;
        ctx.fillStyle = `rgba(210,220,230,${0.05 + i * 0.012})`;
        const off = (t / (900 + i * 400)) % 1;
        ctx.fillRect(-w * off, y, w * 2, 14);
      }
    }

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(235,240,255,${this.flash * 0.33})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawFront(ctx, w, h, ground) {
    if (this.drift) {
      ctx.fillStyle = '#f2f6fa';
      for (let i = 0; i < this.drift.length; i++) {
        const d = this.drift[i];
        if (d < 0.4) continue;
        const px = Math.round(d);
        ctx.fillRect(i * this.driftBucket, ground - px, this.driftBucket, px);
      }
    }

    for (const p of this.particles) {
      if (p.snow) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      } else {
        ctx.strokeStyle = this.condition === 'storm' ? 'rgba(190,215,255,0.75)' : 'rgba(170,200,235,0.6)';
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      }
    }
  }
}

if (typeof window !== 'undefined') window.WeatherKit = { Weather, timeOfDay, CONDITIONS };
if (typeof module !== 'undefined') module.exports = { Weather, timeOfDay, CONDITIONS };
})();

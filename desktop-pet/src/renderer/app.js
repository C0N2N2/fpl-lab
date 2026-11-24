/* Wires the pet, the weather and the OS together. */
(function () {


const { Pet, Dog, LINES, pick } = window.PetKit;
const { Weather } = window.WeatherKit;
const { SPRITES, drawSprite } = window.Sprites;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let state = null;
let pet = null;
let dog = null;
const weather = new Weather();

let lastInteraction = Date.now();
let prompt = null;            // { text, buttons: [{ label, action, rect }] }
let lastMatchdayAsk = null;
let hovering = false;

/* ---------------- canvas ---------------- */

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);

const W = () => window.innerWidth;
const H = () => window.innerHeight;
const GROUND = () => H() - (state?.settings.groundOffset ?? 78);

/* ---------------- boot ---------------- */

async function boot() {
  state = await window.kimbo.getState();
  pet = new Pet({ scale: state.settings.scale, x: state.settings.side === 'right' ? W() - 220 : 200 });
  dog = new Dog(state.settings.scale);
  pet.onFocusEnd = onFocusEnd;
  resize();

  await refreshWeather();
  window.kimbo.onWeatherRefresh(refreshWeather);

  window.kimbo.onState((s) => {
    state = s;
    pet.px = s.settings.scale;
    dog.px = s.settings.scale;
  });

  window.kimbo.onNudge(({ kind, text }) => {
    lastInteraction = Date.now();
    wake();
    if (kind === 'water' || kind === 'coffee') {
      pet.setState('drink');
    }
    pet.say(text, 7);
  });
  window.kimbo.onSay((t) => { wake(); pet.say(t, 5); });
  window.kimbo.onCelebrate((t) => { wake(); pet.celebrate(t); });
  window.kimbo.onPoke(() => poke());
  window.kimbo.onSleep(() => { pet.forcedSleep = true; pet.setState('sleep'); });
  window.kimbo.onFocusStart(() => startFocus('work'));
  window.kimbo.onFocusStop(() => { pet.stopFocus(); pet.say('Stopped. Fair enough.'); });

  requestAnimationFrame(loop);
  setInterval(behaviourTick, 5000);
  behaviourTick();
}

async function refreshWeather() {
  if (!state) return;
  if (state.settings.weatherMode === 'auto') {
    const data = await window.kimbo.getWeather();
    weather.set(data);
    if (data && !data.error) reactToWeather(data.condition);
  } else if (state.settings.weatherMode === 'sim') {
    weather.simulate();
    reactToWeather(weather.condition);
  } else {
    weather.condition = 'clear';
  }
}

let lastWeatherSpoken = null;
function reactToWeather(cond) {
  if (cond === lastWeatherSpoken) return;
  lastWeatherSpoken = cond;
  if (LINES[cond]) pet.say(pick(LINES[cond]), 6);
}

/* ---------------- behaviour ---------------- */

function wake() {
  if (pet.state === 'sleep') {
    pet.forcedSleep = false;
    pet.setState('idle');
    pet.say(pick(LINES.wake), 4);
  }
  lastInteraction = Date.now();
}

function poke() {
  if (pet.state === 'sleep') return wake();
  lastInteraction = Date.now();
  pet.setState('idle');
  pet.say(pick(LINES.poke), 3);
  pet.hop = 1;
}

function inQuietHours() {
  const s = state.settings;
  if (!s.sleepAtNight) return false;
  const h = new Date().getHours();
  return s.quietStart <= s.quietEnd
    ? (h >= s.quietStart && h < s.quietEnd)
    : (h >= s.quietStart || h < s.quietEnd);
}

function behaviourTick() {
  if (!state || !pet) return;
  const idleMs = Date.now() - lastInteraction;
  const boredMs = state.settings.boredomMinutes * 60_000;

  if (pet.state === 'focus') return;

  if (inQuietHours() && pet.state !== 'sleep') {
    pet.setState('sleep');
    return;
  }
  if (pet.forcedSleep) return;   // you put him to bed; leave him there until poked

  if (!inQuietHours() && pet.state === 'sleep' && idleMs < 60_000) {
    pet.setState('idle');
  }

  if (idleMs > boredMs * 2 && pet.state !== 'sleep') {
    pet.setState('sleep');
  } else if (idleMs > boredMs && pet.state !== 'game' && pet.state !== 'sleep') {
    pet.setState('game');
    pet.say(pick(LINES.bored), 5);
  }

  maybeAskMatchday();
}

function maybeAskMatchday() {
  if (!state.settings.matchdayPrompt || prompt) return;
  const today = new Date().toDateString();
  if (lastMatchdayAsk === today) return;
  const h = new Date().getHours();
  if (h < 11 || h > 21) return;
  lastMatchdayAsk = today;
  prompt = {
    text: 'Is there a match today?',
    buttons: [
      { label: 'YES', action: () => { pet.jersey = true; pet.say('Jersey on. Yalla!', 5); } },
      { label: 'NO',  action: () => { pet.jersey = false; pet.say('Boring week.', 4); } },
    ],
  };
}

function startFocus(kind) {
  const mins = kind === 'work' ? state.settings.focus.work : state.settings.focus.break;
  lastInteraction = Date.now();
  pet.startFocus(mins, kind);
}

function onFocusEnd(kind) {
  if (kind === 'work') {
    window.kimbo.focusDone(state.settings.focus.work);
    window.kimbo.notify('Focus done', `${state.settings.focus.work} minutes in the bag. Break?`);
    setTimeout(() => startFocus('break'), 1500);
  } else {
    window.kimbo.notify('Break over', 'Back to it.');
  }
}

/* ---------------- loop ---------------- */

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const w = W(), h = H(), ground = GROUND();
  ctx.clearRect(0, 0, w, h);

  weather.update(dt, w, h, ground);
  weather.drawBehind(ctx, w, h, ground);

  // a snowman turns up when it actually snows
  if (weather.condition === 'snow' && weather.drift) {
    const px = pet.px;
    const sw = SPRITES.SNOWMAN[0].length * px;
    drawSprite(ctx, SPRITES.SNOWMAN, Math.round(pet.x - pet.width - sw), ground - SPRITES.SNOWMAN.length * px, px);
  }

  dog.update(dt, w, ground, pet.x);
  dog.draw(ctx, ground);

  pet.update(dt, w, ground, { tod: weather.tod });
  pet.draw(ctx, ground);

  drawPrompt(ctx, ground);
  drawFocusTimer(ctx, ground);

  weather.drawFront(ctx, w, h, ground);

  requestAnimationFrame(loop);
}

/* ---------------- prompt + timer chrome ---------------- */

function drawPrompt(ctx, ground) {
  if (!prompt) return;
  ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.textBaseline = 'top';
  const tw = Math.ceil(ctx.measureText(prompt.text).width);
  const bw = Math.max(tw + 16, 160);
  const bh = 52;
  const bx = Math.round(Math.max(6, Math.min(pet.x - bw / 2, W() - bw - 6)));
  const by = Math.round(ground - pet.height - bh - 14);

  ctx.fillStyle = 'rgba(18,20,24,0.96)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#efe7d8';
  ctx.fillRect(bx, by, bw, 2);
  ctx.fillRect(bx, by + bh - 2, bw, 2);
  ctx.fillRect(bx, by, 2, bh);
  ctx.fillRect(bx + bw - 2, by, 2, bh);
  ctx.fillText(prompt.text, bx + 8, by + 7);

  const bwid = 54, bhei = 18;
  prompt.buttons.forEach((b, i) => {
    const x = bx + 8 + i * (bwid + 8);
    const y = by + 26;
    b.rect = { x, y, w: bwid, h: bhei };
    ctx.fillStyle = i === 0 ? '#2d5a3e' : '#6b2a30';
    ctx.fillRect(x, y, bwid, bhei);
    ctx.fillStyle = '#efe7d8';
    const lw = ctx.measureText(b.label).width;
    ctx.fillText(b.label, x + (bwid - lw) / 2, y + 3);
  });
}

function drawFocusTimer(ctx, ground) {
  if (pet.state !== 'focus' || !pet.focusEndsAt) return;
  const left = Math.max(0, pet.focusEndsAt - Date.now());
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  ctx.font = 'bold 13px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(label).width;
  const x = Math.round(pet.x - tw / 2 - 7);
  const y = Math.round(ground - pet.height - 26);
  ctx.fillStyle = 'rgba(18,20,24,0.9)';
  ctx.fillRect(x, y, tw + 14, 20);
  ctx.fillStyle = pet.focusKind === 'work' ? '#8fd8e8' : '#9ad6a4';
  ctx.fillText(label, x + 7, y + 3);
}

/* ---------------- mouse ---------------- */

function hit(box, x, y) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

window.addEventListener('mousemove', (e) => {
  if (!pet) return;
  const over = hit(pet.hitBox(), e.clientX, e.clientY)
    || (prompt && prompt.buttons.some(b => b.rect && hit(b.rect, e.clientX, e.clientY)));
  if (over !== hovering) {
    hovering = over;
    window.kimbo.setHover(over);
    document.body.style.cursor = over ? 'pointer' : 'default';
  }
});

window.addEventListener('mousedown', (e) => {
  if (!pet) return;
  if (e.button === 2) { window.kimbo.openMenu(); return; }
  if (prompt) {
    for (const b of prompt.buttons) {
      if (b.rect && hit(b.rect, e.clientX, e.clientY)) {
        b.action();
        prompt = null;
        lastInteraction = Date.now();
        return;
      }
    }
  }
  if (hit(pet.hitBox(), e.clientX, e.clientY)) poke();
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('dblclick', (e) => {
  if (pet && hit(pet.hitBox(), e.clientX, e.clientY)) window.kimbo.openPanel('tasks');
});

boot();

// Handle for tests and for poking at the pet from devtools.
window.KimboApp = {
  get pet() { return pet; },
  get dog() { return dog; },
  get weather() { return weather; },
  get state() { return state; },
  setPrompt(p) { prompt = p; },
  clearPrompt() { prompt = null; },
};
})();

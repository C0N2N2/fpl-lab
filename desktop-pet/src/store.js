const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  settings: {
    scale: 4,                 // pixel size — bump to 5/6 for a bigger pet
    side: 'left',             // where the pet starts
    groundOffset: 78,         // px up from the screen bottom — clear your Dock
    weatherMode: 'auto',      // 'auto' (Open-Meteo) | 'sim' (cycles) | 'off'
    city: '',
    lat: null,
    lon: null,
    sleepAtNight: true,       // naps between quiet hours
    quietStart: 23,
    quietEnd: 7,
    boredomMinutes: 12,       // idle time before he finds a console / bed
    matchdayPrompt: true,     // "is there a match today?" -> jersey
    reminders: {
      water:   { on: true,  every: 45, label: 'Water break. Go on.' },
      coffee:  { on: true,  every: 180, label: 'Coffee? You have earned it.' },
      stretch: { on: true,  every: 90, label: 'Stand up. Stretch. 60 seconds.' },
      eyes:    { on: true,  every: 20, label: '20-20-20: look 20ft away for 20s.' },
      posture: { on: false, every: 60, label: 'Sit up straight, twin.' },
    },
    focus: { work: 25, break: 5 },
    notifications: true,
  },
  tasks: [],
  // when each reminder last fired, so the schedule survives a restart
  clocks: {},
  stats: { focusSessions: 0, focusMinutes: 0, tasksDone: 0, lastDay: null, streak: 0 },
};

function deepMerge(base, patch) {
  if (Array.isArray(patch) || patch === null || typeof patch !== 'object') return patch;
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const [k, v] of Object.entries(patch)) {
    out[k] = (k in out) ? deepMerge(out[k], v) : v;
  }
  return out;
}

class Store {
  constructor(dir) {
    this.file = path.join(dir, 'kimbo-state.json');
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    this.load();
  }
  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      this.data = deepMerge(this.data, JSON.parse(raw));
    } catch (_) { /* first run */ }
  }
  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (e) { console.error('[kimbo] could not save state:', e.message); }
  }
  get() { return this.data; }
  patch(p) { this.data = deepMerge(this.data, p); this.save(); return this.data; }
}

module.exports = { Store, DEFAULTS };

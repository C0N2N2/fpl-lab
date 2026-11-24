const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, screen, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Store } = require('./store');

const STRIP_HEIGHT = 300;   // tall enough for the pet, bubbles and weather
let petWin = null;
let panelWin = null;
let tray = null;
let store = null;

/* ------------------------------------------------------------------ *
 * Windows
 * ------------------------------------------------------------------ */

function createPetWindow() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  petWin = new BrowserWindow({
    x,
    y: y + height - STRIP_HEIGHT,
    width,
    height: STRIP_HEIGHT,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    acceptFirstMouse: true,
    type: process.platform === 'darwin' ? 'panel' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
sandbox: false,
    },
  });

  // Float above the Dock and follow the user across Spaces / fullscreen apps.
  petWin.setAlwaysOnTop(true, 'screen-saver');
  petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Start fully click-through; the renderer tells us when the cursor is
  // actually over the pet so clicks land on him and nothing else.
  petWin.setIgnoreMouseEvents(true, { forward: true });

  petWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // KIMBO_DEBUG=1 surfaces renderer errors in the terminal.
  if (process.env.KIMBO_DEBUG) {
    petWin.webContents.on('console-message', (e, level, message, line, src) => {
      // Electron >= 36 passes a single event object; older versions pass positionals.
      const d = (e && typeof e === 'object' && 'message' in e)
        ? { level: e.level, message: e.message, line: e.lineNumber, src: e.sourceId }
        : { level, message, line, src };
      console.log(`[pet:${d.level}] ${d.message} (${d.src}:${d.line})`);
    });
    petWin.webContents.on('render-process-gone', (_e, d) => console.log('[pet] gone', d));
  }

  petWin.on('closed', () => { petWin = null; });

  // Keep the strip glued to the bottom if the display setup changes.
  const reposition = () => {
    if (!petWin) return;
    const d = screen.getPrimaryDisplay();
    petWin.setBounds({
      x: d.bounds.x,
      y: d.bounds.y + d.bounds.height - STRIP_HEIGHT,
      width: d.bounds.width,
      height: STRIP_HEIGHT,
    });
  };
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
}

function openPanel(tab) {
  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.show();
    panelWin.focus();
    if (tab) panelWin.webContents.send('panel:tab', tab);
    return;
  }
  panelWin = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 380,
    minHeight: 480,
    title: 'Kimbo',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#12161b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  panelWin.loadFile(path.join(__dirname, 'panel', 'panel.html'));
  panelWin.once('ready-to-show', () => {
    panelWin.show();
    if (tab) panelWin.webContents.send('panel:tab', tab);
  });
  panelWin.on('closed', () => { panelWin = null; });
}

/* ------------------------------------------------------------------ *
 * Tray
 * ------------------------------------------------------------------ */

function trayIcon() {
  const file = path.join(__dirname, '..', 'assets', 'tray.png');
  if (fs.existsSync(file)) {
    const img = nativeImage.createFromPath(file);
    img.setTemplateImage(false);
    return img.resize({ width: 18, height: 18 });
  }
  return nativeImage.createEmpty();
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Kimbo');
  refreshTrayMenu();
}

function refreshTrayMenu() {
  if (!tray) return;
  const open = store.get().tasks.filter(t => !t.done).length;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: open ? `${open} task${open === 1 ? '' : 's'} open` : 'All clear', enabled: false },
    { type: 'separator' },
    { label: 'Tasks…', click: () => openPanel('tasks') },
    { label: 'Start focus session', click: () => send('focus:start') },
    { label: 'Stop focus session', click: () => send('focus:stop') },
    { type: 'separator' },
    { label: 'Poke him', click: () => send('pet:poke') },
    { label: 'Send him to bed', click: () => send('pet:sleep') },
    { label: 'Settings…', click: () => openPanel('settings') },
    { type: 'separator' },
    { label: 'Quit Kimbo', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
}

function send(channel, payload) {
  if (petWin && !petWin.isDestroyed()) petWin.webContents.send(channel, payload);
}
function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

/* ------------------------------------------------------------------ *
 * Weather (Open-Meteo — no API key)
 * ------------------------------------------------------------------ */

// https://open-meteo.com/en/docs — WMO weather codes collapsed into the
// handful of atmospheres the renderer knows how to draw.
function codeToCondition(code) {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`geocoding ${r.status}`);
  const j = await r.json();
  if (!j.results || !j.results.length) throw new Error('city not found');
  const hit = j.results[0];
  return { lat: hit.latitude, lon: hit.longitude, name: `${hit.name}, ${hit.country_code}` };
}

async function fetchWeather() {
  const s = store.get().settings;
  if (s.weatherMode !== 'auto') return null;
  let { lat, lon } = s;
  if ((lat == null || lon == null) && s.city) {
    try {
      const g = await geocode(s.city);
      lat = g.lat; lon = g.lon;
      store.patch({ settings: { lat, lon } });
    } catch (e) { return { error: e.message }; }
  }
  if (lat == null || lon == null) return { error: 'no location set' };
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`forecast ${r.status}`);
    const j = await r.json();
    return {
      condition: codeToCondition(j.current.weather_code),
      temp: Math.round(j.current.temperature_2m),
      isDay: j.current.is_day === 1,
      code: j.current.weather_code,
    };
  } catch (e) {
    return { error: e.message };
  }
}

/* ------------------------------------------------------------------ *
 * Reminders
 * ------------------------------------------------------------------ */

const lastFired = {};

function inQuietHours() {
  const s = store.get().settings;
  if (!s.sleepAtNight) return false;
  const h = new Date().getHours();
  const { quietStart: a, quietEnd: b } = s;
  return a <= b ? (h >= a && h < b) : (h >= a || h < b);
}

function tickReminders() {
  const s = store.get().settings;
  const now = Date.now();
  if (inQuietHours()) return;

  for (const [key, cfg] of Object.entries(s.reminders)) {
    if (!cfg.on) continue;
    const due = (lastFired[key] || 0) + cfg.every * 60_000;
    if (now >= due) {
      lastFired[key] = now;
      if (!lastFired[key + ':first']) { lastFired[key + ':first'] = true; continue; } // don't fire everything at launch
      nudge(key, cfg.label);
    }
  }

  // Overdue tasks: nag once each, gently.
  for (const t of store.get().tasks) {
    if (t.done || !t.due) continue;
    if (now >= t.due && !t.nagged) {
      t.nagged = true;
      store.save();
      nudge('task', `"${t.text}" — that was due.`);
      refreshTrayMenu();
    }
  }
}

function nudge(kind, text) {
  send('pet:nudge', { kind, text });
  if (store.get().settings.notifications && Notification.isSupported()) {
    const n = new Notification({ title: 'Kimbo', body: text, silent: false });
    n.on('click', () => openPanel('tasks'));
    n.show();
  }
}

/* ------------------------------------------------------------------ *
 * IPC
 * ------------------------------------------------------------------ */

function wireIpc() {
  ipcMain.handle('state:get', () => store.get());

  ipcMain.handle('state:patch', (_e, patch) => {
    const next = store.patch(patch);
    broadcast('state:changed', next);
    refreshTrayMenu();
    return next;
  });

  ipcMain.handle('tasks:add', (_e, { text, due }) => {
    store.get().tasks.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text, due: due || null, done: false, nagged: false, created: Date.now(),
    });
    store.save();
    broadcast('state:changed', store.get());
    refreshTrayMenu();
    send('pet:say', 'On it. Added.');
    return store.get().tasks;
  });

  ipcMain.handle('tasks:toggle', (_e, id) => {
    const t = store.get().tasks.find(t => t.id === id);
    if (t) {
      t.done = !t.done;
      if (t.done) {
        store.get().stats.tasksDone++;
        send('pet:celebrate', t.text);
      }
      store.save();
      broadcast('state:changed', store.get());
      refreshTrayMenu();
    }
    return store.get().tasks;
  });

  ipcMain.handle('tasks:remove', (_e, id) => {
    const s = store.get();
    s.tasks = s.tasks.filter(t => t.id !== id);
    store.save();
    broadcast('state:changed', s);
    refreshTrayMenu();
    return s.tasks;
  });

  ipcMain.handle('weather:get', () => fetchWeather());
  ipcMain.handle('geocode', (_e, city) => geocode(city).catch(e => ({ error: e.message })));

  ipcMain.on('pet:hover', (_e, isOver) => {
    if (!petWin || petWin.isDestroyed()) return;
    petWin.setIgnoreMouseEvents(!isOver, { forward: true });
  });

  ipcMain.on('pet:menu', () => {
    Menu.buildFromTemplate([
      { label: 'Tasks…', click: () => openPanel('tasks') },
      { label: 'Start focus session', click: () => send('focus:start') },
      { label: 'Nap', click: () => send('pet:sleep') },
      { type: 'separator' },
      { label: 'Settings…', click: () => openPanel('settings') },
      { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
    ]).popup({ window: petWin });
  });

  ipcMain.on('panel:open', (_e, tab) => openPanel(tab));

  ipcMain.on('notify', (_e, { title, body }) => {
    if (!store.get().settings.notifications || !Notification.isSupported()) return;
    new Notification({ title: title || 'Kimbo', body }).show();
  });

  ipcMain.on('focus:control', (_e, which) => {
    send(which === 'start' ? 'focus:start' : 'focus:stop');
  });

  ipcMain.on('focus:done', (_e, minutes) => {
    const st = store.get().stats;
    st.focusSessions++;
    st.focusMinutes += minutes;
    store.save();
    broadcast('state:changed', store.get());
  });

  ipcMain.on('open-external', (_e, url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
}

/* ------------------------------------------------------------------ *
 * Lifecycle
 * ------------------------------------------------------------------ */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openPanel('tasks'));

  app.whenReady().then(() => {
    store = new Store(app.getPath('userData'));
    if (process.platform === 'darwin' && app.dock) app.dock.hide(); // menu-bar app, no Dock tile
    wireIpc();
    createPetWindow();
    buildTray();

    setInterval(tickReminders, 30_000);
    setInterval(() => { if (petWin) send('weather:refresh'); }, 15 * 60_000);

    app.on('activate', () => {
      if (!petWin) createPetWindow();
    });
  });

  app.on('window-all-closed', (e) => {
    // The pet is the app — closing the panel should not quit.
    if (!app.isQuitting) e.preventDefault?.();
  });
}

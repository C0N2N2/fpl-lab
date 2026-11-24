let state = null;

const $ = (id) => document.getElementById(id);

/* ---------------- tabs ---------------- */
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
function showTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === name));
}
window.kimbo.onPanelTab(showTab);

/* ---------------- tasks ---------------- */

$('add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('task-text').value.trim();
  if (!text) return;
  let due = null;
  if ($('task-due').value) {
    const [h, m] = $('task-due').value.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1); // next occurrence
    due = d.getTime();
  }
  await window.kimbo.addTask(text, due);
  $('task-text').value = '';
  $('task-due').value = '';
});

function renderTasks() {
  const list = $('list');
  const tasks = [...state.tasks].sort((a, b) =>
    (a.done - b.done) || ((a.due || Infinity) - (b.due || Infinity)) || (a.created - b.created));
  list.innerHTML = '';
  $('empty').style.display = tasks.length ? 'none' : 'block';

  for (const t of tasks) {
    const li = document.createElement('li');
    if (t.done) li.classList.add('done');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = t.done;
    cb.addEventListener('change', () => window.kimbo.toggleTask(t.id));

    const txt = document.createElement('div');
    txt.className = 'txt';
    txt.textContent = t.text;

    li.append(cb, txt);

    if (t.due) {
      const due = document.createElement('div');
      due.className = 'due' + (!t.done && Date.now() > t.due ? ' over' : '');
      const d = new Date(t.due);
      due.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      li.append(due);
    }

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '×';
    del.title = 'Delete';
    del.addEventListener('click', () => window.kimbo.removeTask(t.id));
    li.append(del);

    list.append(li);
  }
}

$('focus-start').addEventListener('click', () => window.kimbo.focusStart());
$('focus-stop').addEventListener('click', () => window.kimbo.focusStop());

/* ---------------- settings ---------------- */

const REMINDER_KEYS = ['water', 'coffee', 'stretch', 'eyes', 'posture'];

function renderSettings() {
  const s = state.settings;
  $('s-scale').value = s.scale;
  $('s-ground').value = s.groundOffset;
  $('s-bored').value = s.boredomMinutes;
  $('s-matchday').checked = s.matchdayPrompt;
  $('s-weather').value = s.weatherMode;
  $('s-city').value = s.city || '';
  $('s-sleep').checked = s.sleepAtNight;
  $('s-qs').value = s.quietStart;
  $('s-qe').value = s.quietEnd;
  $('s-work').value = s.focus.work;
  $('s-break').value = s.focus.break;
  $('s-notify').checked = s.notifications;
  $('geo').textContent = s.lat != null ? `Using ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}` : '';

  const box = $('reminders');
  box.innerHTML = '';
  for (const key of REMINDER_KEYS) {
    const cfg = s.reminders[key];
    if (!cfg) continue;
    const row = document.createElement('div');
    row.className = 'rem';

    const on = document.createElement('input');
    on.type = 'checkbox';
    on.checked = cfg.on;
    on.addEventListener('change', () =>
      window.kimbo.patch({ settings: { reminders: { [key]: { on: on.checked } } } }));

    const name = document.createElement('span');
    name.textContent = key;

    const every = document.createElement('input');
    every.type = 'number';
    every.min = 1; every.max = 600;
    every.value = cfg.every;
    every.addEventListener('change', () =>
      window.kimbo.patch({ settings: { reminders: { [key]: { every: Number(every.value) } } } }));

    row.append(on, name, every);
    box.append(row);
  }
}

function bind(id, path, cast = Number) {
  $(id).addEventListener('change', () => {
    const el = $(id);
    const value = el.type === 'checkbox' ? el.checked : cast(el.value);
    const patch = {};
    let node = patch;
    const parts = path.split('.');
    parts.forEach((p, i) => {
      if (i === parts.length - 1) node[p] = value;
      else { node[p] = {}; node = node[p]; }
    });
    window.kimbo.patch(patch);
  });
}

bind('s-scale', 'settings.scale');
bind('s-ground', 'settings.groundOffset');
bind('s-bored', 'settings.boredomMinutes');
bind('s-matchday', 'settings.matchdayPrompt');
bind('s-weather', 'settings.weatherMode', String);
bind('s-sleep', 'settings.sleepAtNight');
bind('s-qs', 'settings.quietStart');
bind('s-qe', 'settings.quietEnd');
bind('s-work', 'settings.focus.work');
bind('s-break', 'settings.focus.break');
bind('s-notify', 'settings.notifications');

$('s-city').addEventListener('change', async () => {
  const city = $('s-city').value.trim();
  await window.kimbo.patch({ settings: { city, lat: null, lon: null } });
  if (!city) { $('geo').textContent = ''; return; }
  $('geo').textContent = 'Looking up…';
  const g = await window.kimbo.geocode(city);
  if (g.error) { $('geo').textContent = `Could not find "${city}" — ${g.error}`; return; }
  await window.kimbo.patch({ settings: { lat: g.lat, lon: g.lon } });
  $('geo').textContent = `Using ${g.name}`;
});

/* ---------------- stats ---------------- */

function renderStats() {
  $('st-sessions').textContent = state.stats.focusSessions;
  $('st-minutes').textContent = state.stats.focusMinutes;
  $('st-done').textContent = state.stats.tasksDone;
}

/* ---------------- boot ---------------- */

function renderAll() {
  renderTasks();
  renderSettings();
  renderStats();
}

window.kimbo.onState((s) => { state = s; renderAll(); });

(async () => {
  state = await window.kimbo.getState();
  renderAll();
})();

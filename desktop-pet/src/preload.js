const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kimbo', {
  // state
  getState:  ()        => ipcRenderer.invoke('state:get'),
  patch:     (p)       => ipcRenderer.invoke('state:patch', p),
  onState:   (fn)      => ipcRenderer.on('state:changed', (_e, s) => fn(s)),

  // tasks
  addTask:    (text, due) => ipcRenderer.invoke('tasks:add', { text, due }),
  toggleTask: (id)        => ipcRenderer.invoke('tasks:toggle', id),
  removeTask: (id)        => ipcRenderer.invoke('tasks:remove', id),

  // weather
  getWeather: ()      => ipcRenderer.invoke('weather:get'),
  geocode:    (city)  => ipcRenderer.invoke('geocode', city),
  onWeatherRefresh: (fn) => ipcRenderer.on('weather:refresh', () => fn()),

  // pet window plumbing
  setHover:  (over)   => ipcRenderer.send('pet:hover', over),
  openMenu:  ()       => ipcRenderer.send('pet:menu'),
  openPanel: (tab)    => ipcRenderer.send('panel:open', tab),
  notify:    (title, body) => ipcRenderer.send('notify', { title, body }),
  focusDone: (mins)   => ipcRenderer.send('focus:done', mins),
  focusStart: ()      => ipcRenderer.send('focus:control', 'start'),
  focusStop:  ()      => ipcRenderer.send('focus:control', 'stop'),

  // events from main
  onNudge:     (fn) => ipcRenderer.on('pet:nudge', (_e, p) => fn(p)),
  onSay:       (fn) => ipcRenderer.on('pet:say', (_e, t) => fn(t)),
  onCelebrate: (fn) => ipcRenderer.on('pet:celebrate', (_e, t) => fn(t)),
  onPoke:      (fn) => ipcRenderer.on('pet:poke', () => fn()),
  onSleep:     (fn) => ipcRenderer.on('pet:sleep', () => fn()),
  onFocusStart:(fn) => ipcRenderer.on('focus:start', () => fn()),
  onFocusStop: (fn) => ipcRenderer.on('focus:stop', () => fn()),
  onPanelTab:  (fn) => ipcRenderer.on('panel:tab', (_e, t) => fn(t)),
});

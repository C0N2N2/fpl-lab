# Kimbo — a pixel-art desktop companion

A little pixel version of you that lives along the bottom of your Mac screen,
walks around on top of the Dock, and keeps you honest about work, water and
breaks. Built with Electron.

<!-- the sprite is generated from code; see src/renderer/sprites.js -->

## What he does

| | |
|---|---|
| **Reminders** | Water, coffee, stretch, 20-20-20 eye breaks and posture — each one on its own interval, each one switchable. He holds up a **paper with the reminder written on it** for 18 seconds, and fires a macOS notification too. |
| **Tasks** | A small to-do list. Give a task a time and he nags you when it is due. Tick one off and he throws confetti. |
| **Desk** | He has a desk. Every minute or so he wanders over, climbs on his stool and sits at it for a while with his laptop. |
| **Focus** | A Pomodoro timer. While it runs he sits at the desk with the screen glow on his face and a countdown over his head, then rolls into a break. |
| **Boredom** | Leave him alone and he pulls out a games console. Leave him longer and he goes to bed. |
| **Sleep** | He naps in a little bed, tucked under the blanket with `z z z` drifting up, during your quiet hours (default 23:00–07:00). Poke him and he wakes up grumpy. |
| **Weather** | Real conditions from Open-Meteo — rain, snow, fog, storms with lightning, plus a time-of-day wash that shifts from dawn through to night. Snow settles into drifts along the bottom of your screen and a snowman turns up next to him. |
| **Matchday** | Once a day he asks if there is a match. Say yes and he changes into a red number 10. |
| **Kimbo** | The dog wanders across every few minutes. |

## Run it

```bash
cd desktop-pet
npm install
npm start
```

He appears along the bottom of your main display and a menu-bar icon appears
top right. There is no Dock tile — he *is* the app.

First launch, macOS will ask to allow notifications. Say yes, or the reminders
will only appear as speech bubbles.

## Using him

| Action | What happens |
|---|---|
| Click him | Poke — he reacts and wakes up |
| **Hold and drag** | Pick him up and move him anywhere. Let go above the ground and he falls, with a bounce. |
| Double-click him | Opens the Tasks panel |
| Right-click him | Quick menu: tasks, focus, nap, settings, quit |
| Menu-bar icon | Same menu, plus a count of open tasks |

## "He never reminds me of anything"

Check these in order:

1. **Give it time.** Nothing fires at launch — each reminder starts its clock
   when the app starts, so the soonest one is the eye break at 20 minutes and
   water is 45. Impatient? Right-click him → **Test a reminder now**, or the
   button on the Tasks panel. That fires one immediately.
2. **Quiet hours.** Reminders are suppressed between `quietStart` and
   `quietEnd` (default 23:00–07:00) — if you were testing late at night, that
   was it. Turn off *Nap during quiet hours* in Settings, or move the window.
3. **Restarting.** The clocks are saved to disk now, so quitting and relaunching
   no longer pushes every reminder a full interval into the future.

Timing has 30-second granularity — a 45-minute reminder fires at the first
30-second tick past 45 minutes.

## Settings

Right-click → **Settings…**

- **Size** — pixel scale. `4` is the default; `6` makes him properly large.
- **Ground offset** — how far up from the bottom of the screen he stands.
  Raise it if your Dock is covering his feet, lower it if he is floating.
- **Weather** — `Real` (Open-Meteo, needs a city), `Simulated` (cycles through
  every condition so you can see them all) or `Off`.
- **City** — typed in plain, looked up once via Open-Meteo's geocoder and cached
  as coordinates. No API key, no account.
- **Quiet hours**, **focus lengths**, **reminder intervals** — all editable.

Everything is stored in
`~/Library/Application Support/Kimbo/kimbo-state.json`.

## Build a real .app

```bash
npm run dist
```

Puts a DMG in `dist/`. It is unsigned, so the first open needs
right-click → Open (or `xattr -dr com.apple.quarantine` on the app).

To have him start with your Mac: System Settings → General → Login Items → add
the built app.

## Editing the pet

All the art is in `src/renderer/sprites.js` as plain character grids — one
character per pixel, `.` for transparent, every other letter a key into
`PALETTE` at the top of the file. Change a letter, save, restart. Rows must stay
the same length; `validateSprites()` tells you if you slip.

To regenerate the icons after changing the face:

```bash
node tools/make-icons.js
```

(That one needs `playwright` installed; the generated PNGs are committed so you
only need it if you change the art.)

The things he says live in `LINES` at the top of `src/renderer/pet.js`.

## Layout

```
src/
  main.js            Electron main — window, tray, reminders, weather fetch, IPC
  preload.js         the contextBridge API the windows get
  store.js           JSON persistence + defaults
  renderer/
    index.html       the transparent strip
    sprites.js       all pixel art + palette
    weather.js       particles, drifts, fog, lightning, time-of-day wash
    pet.js           state machine, animation, speech bubbles, the dog
    app.js           glue: behaviour driver, input, the main loop
  panel/             tasks + settings window
tools/make-icons.js  regenerates assets/ from the sprite data
```

## Notes and limits

- macOS is the target. It should run on Windows and Linux, but the always-on-top
  level, the Dock-clearing offset and `app.dock.hide()` are tuned for macOS.
- He sits on your **primary** display only.
- The window is click-through everywhere except the pet himself, so he never
  eats a click meant for something behind him.

# Hidden Lines No. 001 — How your phone sees your face in the dark

Style: Line-Art Cutaway (`hardcore-info`). Vertical 1080×1920, 24 fps, ~80 s. English narration, English-only subtitles.
Accent (#FF4D1A) = infrared light, and nothing else.

## Three candidate structures

1. **Mystery solved backwards.** Start on the result (a phone unlocking in a dark room), ask "how?", open the sensor strip, explain in reverse until we're back at the unlock.
2. **A journey along the light.** Follow the infrared from the moment it leaves the phone: flood light → face → camera, then the dots → face → camera → depth map → match → unlock. The accent travels the real route, step by step.
3. **Before / after.** The same scan run twice: on a flat printed photo (fails) and on a real face (opens). The comparison carries the film.

**Chosen: 2, with 3 folded in as the turn.** The style's strongest move is the one-colour path, and this topic *is* a path of light. The flat-photo comparison is a short second beat near the end, so the film ends on a "so that's why" moment instead of a list.
The opening is not a section sweep (the demo's opening): it is a **macro on the one part that matters** (the sensor strip) with a big statement, then a pull back to reveal the face. The ending is the **accent lighting its whole route once** and a pull back to the title block.

## Logline and arc

In total darkness your phone still recognises you, because it lights your face with its own invisible light and reads its shape in thirty thousand dots.

- **Setup (0–24 s):** lights off, the phone still knows you. Three tiny parts at the top of the screen. They work in infrared, light your eye can't see.
- **Development (24–50 s):** the flood light washes the face, the camera takes an infrared picture. A picture can be fooled, so the projector fires the dots.
- **Turn (50–64 s):** on a flat wall the dots sit in a grid; on a face they bend. The bend becomes depth: a 3D map.
- **Proof (64–71 s):** a flat photo makes no bend → no depth → no unlock.
- **Ending (71–82 s):** the map matches, the lock opens, the whole infrared route lights once. "You just couldn't see it."

## Benchmark

- *What to learn:* engineering cutaway explainers of the Animagraffs kind (one continuous camera through a single object, labels attached to parts, the process shown in the order it happens); vertical science shorts (a puzzle in the first two seconds, one idea per sentence).
- *What not to take:* their models, colours, typefaces, music, phrasing. No phone brand, no logos: a generic phone and a generic face.

## Shot list (1080×1920; subject in y 160–1300; subtitles y ≈ 1320–1480, x 64–900; nothing in the bottom 420 px or the right 150 px)

| # | t | Framing | Camera | Why |
|---|---|---|---|---|
| 1 | 0–6 | Macro on the sensor strip at the top of the phone | Slow pull back from the strip | Opens on the one part that matters; the statement "LIGHTS OFF." stands in the left column above |
| 2 | 6–11 | Full: head and phone facing each other in profile | Pull continues, slight crane up | Reveals who the phone is looking at; a short accent pulse at the strip: "it brings its own" |
| 3 | 11–24 | Close on the strip, cut open | Push in, **dive into the gap**, section plane sweeps across the strip | The three modules appear, each with a leader label |
| 4 | 24–31 | Locked: a ruler of wavelength drawn across the frame | Static, ruler grows from the middle | "Light just past red": the visible band in grey, the band the phone uses in accent |
| 5 | 31–40 | Medium: phone and face, three-quarter | Slow orbit right | The flood light's cone travels to the face and floods it; a magnifier inset shows the infrared picture |
| 6 | 40–47 | Close on the projector | Slow push | Near-silence, then the projector fires: dots spray out |
| 7 | 47–57 | Signature: dots landing on a flat wall (grid) and on the face (bent) | Orbit around the head while the dots stay stuck to the skin | The dots bend around the nose, eyes and cheeks; this is the idea of the film |
| 8 | 57–64 | Close: the face | Tracking up the face | Dot displacement becomes depth contour lines: a 3D map |
| 9 | 64–71 | Medium: a printed photo on a stand | Tip-over to look across the card | The dots stay in a grid on it; "DEPTH 0 mm" ruler; no unlock |
| 10 | 71–77 | Close: the phone, a padlock above the strip | Push, then the shackle lifts | The stored map matches; the accent lights the whole route once |
| 11 | 77–82 | Wide: face and phone | Pull back with slow orbit, to the title block | Last line; end card "HIDDEN LINES · No. 001" |

## Beat sheet

The narration (12 lines, ~175 words, calm American male, ~2.5 words/s, ≥0.6 s between sentences) sets the timing; the picture sections are locked to the measured line durations (see `timeline.js`). Two near-silences: before the dots fire (line 7 → dots) and before the match (line 10 → 11).

## Cue map

- 96 BPM, 4/4 (bar = 2.5 s), the picture's section starts snapped to bars where the voice allows.
- §A Hook (bars 1–4): bowed vibraphone pad, plotter tick at sixteenths, quiet.
- §B Parts (bars 5–10): hard-mallet vibraphone pulses on each label, pizzicato bass enters.
- §C Flood + camera (bars 11–16): glockenspiel arpeggio rising as the cone travels.
- Near-silence 1 (1 bar): bowed pad only. First sound after it: the projector "fire" swell.
- §D Dots + depth (bars 17–25): harp sweeps on the dot spray, mallet ostinato, bass walking.
- §E Photo: pulse drops to bass + tick.
- Near-silence 2 (half a bar).
- §F Match + end (last 4 bars): the full mallet chord on the unlock, harp sweep up, bowed vibraphone holds under the title block.

## Sound design

| Section | Ambience | Foley | Music |
|---|---|---|---|
| Hook | room tone | thin rising tone at the accent pulse | bowed pad |
| Parts | room tone | section sweep noise band, plotter ticks on every label, ratchet on leaders | mallet pulses, pizz bass |
| Ruler | room tone | ratchet as the ruler extends, ticks on the numbers | pulses |
| Flood + camera | room tone | rising tone following the cone, swell as the face floods, shutter click | glockenspiel arpeggio |
| Dots | near-silence, then soft spray of ticks | the fire swell, a hiss of many tiny ticks as the dots land | harp sweeps, ostinato |
| Depth | room tone | contour lines drawing (plotter ticks) | ostinato |
| Photo | room tone | flat card click, a falling tone (the accent drains) | bass + tick |
| Match + end | room tone | metallic click + low knock as the shackle lifts, swell as the route lights | full chord, bowed hold |

## Subtitles and titles

- English only, IBM Plex Sans SemiBold 44 px, on a paper-coloured plate with a thin ink rule on the left, bottom-left of the *safe area* (y ≈ 1320–1480), max width 820 px, never more than two lines.
- Big statements (opening and closing) in the left column at the top (y 170–420), 70 px, one accent word: "LIGHTS **OFF.**" / "YOU JUST COULDN'T **SEE** IT."
- Part labels 30 px uppercase Plex Sans, spec lines 22 px Plex Mono (sizes raised from the style's 1080p values because a phone screen shows the frame small).
- Text writes on and wipes off left to right, like a plotter.
- End card: an engineering title block: HIDDEN LINES · No. 001 · HOW YOUR PHONE SEES YOU IN THE DARK · SCALE 1:1 · SHEET 1 OF 1.

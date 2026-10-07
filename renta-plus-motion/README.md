# Renta+ — Trois pistes de logo (motion design)

A ~2 min 10 s motion video (1920×1080, 30 fps) that presents the three logo routes
for **SIRENTA V2 → Renta+** and ends by asking the team which logo it prefers.

Built from the brief *« Renta+ · Trois pistes de logo »* and the deck
*« SIRENTA V2 · Évolution du processus de facturation »*.

| # | Scène | Contenu |
|---|-------|---------|
| 1 | Intro | Sigle Outsourcia, « Trois pistes de logo pour SIRENTA V2 » |
| 2 | Contexte | Valider · Suivre · Piloter · Tracer, statuts À valider → Validé → Envoyé |
| 3 | Le nom | SIRENTA V2 se transforme en renta+ |
| 4 | Point de départ | Rentabilité · Univers Outsourcia · Outil du quotidien |
| 5 | ADN Outsourcia | Le point, le demi-anneau, les couleurs |
| 6 | Trois pistes | Une même idée : la rentabilité |
| 7–9 | Pistes 01/02/03 | Logo construit pièce par pièce, puis l'idée, le lien Outsourcia, les points forts |
| 10 | Comparatif | Tableau critère par critère + « À retenir » |
| 11 | Icônes | Version icône de chaque piste, en grand puis en petit |
| 12 | Question | « Quel logo préférez-vous ? » 01 · 02 · 03 |

## Files

- `renta-plus-trois-pistes.mp4` — final video with a light synthesised sound bed
- `renta-plus-trois-pistes-sans-son.mp4` — same video, silent
- `src/index.html` — the whole animation; every frame is a pure function `render(t)`
- `src/assets.js` — vector paths: the three logos (traced from the proposals, one path per letter/shape) and the Outsourcia mark (from the deck)
- `tools/` — `render.js` (Playwright → ffmpeg), `frames.js` (stills for review), `audio.py` (sound bed), `vec.py` (logo tracing)

## Preview / re-render

```bash
# scrub one moment:  open src/index.html?t=55     play live:  src/index.html?play
NODE_PATH=$(npm root -g) node tools/render.js src/index.html out 30 4
ffmpeg -f concat -i out/list.txt -c copy video.mp4
```

Texts are in French, taken from the brief. Change wording or timing in `src/index.html`
(`SC` holds the scene timeline, `PISTES` the per-route copy).

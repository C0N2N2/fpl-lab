# FPL Lab

Fantasy Premier League player projections, built from underlying data rather than last season's points.

```bash
npm run dev     # http://localhost:3000
```

## How it works

```
FPL API  ──►  app/api/players/route.ts  ──►  lib/predict.ts  ──►  app/page.tsx
              (proxy + 10 min cache)          (xP model)           (explorer UI)
```

The FPL API sends no CORS headers, so every upstream call happens server-side in the
route handler. Responses are cached for 10 minutes.

## The model

`lib/predict.ts` projects points for a single fixture from a player's per-90 rates:

| Component | Source |
|---|---|
| Appearance | Minutes per team game so far, adjusted by injury flags |
| Goals | `expected_goals_per_90` × position goal value × fixture multiplier |
| Assists | `expected_assists_per_90` × 3 × fixture multiplier |
| Clean sheet | Poisson `P(0 goals) = e^-λ`, where λ is `expected_goals_conceded_per_90` scaled by fixture |
| Saves | `saves_per_90` ÷ 3 (goalkeepers) |
| Conceded | −1 per 2 goals expected against (GKP, DEF) |
| Defensive contribution | Poisson `P(X ≥ threshold)` on `defensive_contribution_per_90` |
| Bonus | Scaled from attacking + clean-sheet expectation |

**Shrinkage.** Early in a season, per-90 rates are wildly noisy — one goal in 20 minutes
implies an absurd xG90. Every rate is blended toward a positional baseline with weight
`minutes / (minutes + 450)`, so a player needs roughly five full matches before their own
numbers dominate the prior. This is the single most important line in the model.

**Fixture difficulty.** FPL publishes a 1–5 rating per fixture, but it is set in preseason
and never updated. The model uses it, and the UI says so. Re-rating it on in-season
evidence (goals conceded, xGC) is the most valuable improvement available.

All scoring constants live in `SCORING` at the top of `lib/predict.ts`.

## Layout

```
app/
  api/players/route.ts   fetch, cache, project, serve
  page.tsx               explorer table
  layout.tsx
lib/
  fpl.ts                 API types + normalisation
  predict.ts             expected-points model
```

## Roadmap

- [ ] Squad builder — £100m budget, formation rules, max 3 per club, live projected total
- [ ] Form-adjusted fixture difficulty to replace FPL's static ratings
- [ ] Import an existing team by FPL entry ID
- [ ] Transfer suggestions ranked by projected points gained per £
- [ ] Captaincy comparison that accounts for ceiling, not just mean
- [ ] Backtest against completed gameweeks to measure real error
- [ ] Persist a saved squad

## Data

All data comes from the public Fantasy Premier League API. No authentication is required
for player, team or fixture data, and nothing here touches a private FPL account.

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

**Fixture difficulty is re-rated on results.** FPL publishes a 1–5 rating per fixture, but
it is fixed in preseason and never moves — a side that ships four goals on opening day keeps
whatever rating it was given in July. `lib/strength.ts` measures each team's attack and
leakiness from actual goals, shrinks them toward a preseason prior by matches played, and
derives expected goals for any fixture:

```
expected goals = 1.45 × attack(team) × leak(opponent) × home/away
```

Hover any fixture chip to compare FPL's rating with the re-rated one.

> Note: FPL ships `strength_attack_*` and `strength_defence_*` as all zeros in the 2026/27
> data. Only `strength_overall_home` / `strength_overall_away` (a 1–5 scale) carry signal,
> so those are what the prior is built from. If they ever go blank too, every team falls
> back to a neutral 1.0 and the model leans entirely on results.

All scoring constants live in `SCORING` at the top of `lib/predict.ts`.

## Layout

```
app/
  api/players/route.ts   fetch, cache, project, serve
  page.tsx               explorer table
  squad/page.tsx         squad builder
  layout.tsx
lib/
  fpl.ts                 API types + normalisation
  strength.ts            team ratings from results
  predict.ts             expected-points model
  squad.ts               squad rules, best XI, auto-fill
  api.ts                 shared client types
```

## Roadmap

- [x] Player explorer with projected points and per-player breakdown
- [x] Form-adjusted fixture difficulty replacing FPL's static ratings
- [x] Squad builder — £100m budget, formation rules, max 3 per club, best XI, auto-fill
- [ ] **Captaincy by ceiling, not mean.** The builder currently captains whoever has the
      highest expected points, which can pick a defender. Doubling a score rewards a fat
      right tail, so this needs a distribution, not an average.
- [ ] Import an existing team by FPL entry ID
- [ ] Transfer suggestions ranked by projected points gained per £
- [ ] Backtest against completed gameweeks to measure real error
- [ ] Bench order and autosub modelling

## Data

All data comes from the public Fantasy Premier League API. No authentication is required
for player, team or fixture data, and nothing here touches a private FPL account.

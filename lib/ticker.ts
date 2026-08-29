/**
 * Season fixture ticker.
 *
 * A grid of every club against the next N gameweeks, with difficulty re-rated
 * on results, and the double and blank gameweeks that decide when chips are
 * worth playing.
 *
 * A gameweek is a DOUBLE for a club when it has two or more fixtures, and a
 * BLANK when it has none — both arise from postponements and cup progress, so
 * they appear as the season goes on rather than being scheduled up front.
 */

import type { FplBootstrap, FplFixture } from "./fpl";
import { derivedDifficulty, expectedGoalsFor, type TeamStrength } from "./strength";

export interface TickerFixture {
  opponent: string;
  opponentId: number;
  home: boolean;
  /** FPL's preseason rating. */
  difficulty: number;
  /** Re-rated on results. */
  rerated: number;
  /** Goals this club is expected to concede. */
  expectedConceded: number;
  /** Goals this club is expected to score. */
  expectedScored: number;
}

export interface TickerCell {
  gw: number;
  fixtures: TickerFixture[];
  /** No fixture this gameweek. */
  blank: boolean;
  /** Two or more fixtures this gameweek. */
  double: boolean;
}

export interface TickerRow {
  teamId: number;
  team: string;
  short: string;
  attack: number;
  leak: number;
  cells: TickerCell[];
  /** Mean re-rated difficulty across the window; lower is easier. */
  averageDifficulty: number;
  /** Total expected goals scored minus conceded across the window. */
  netExpectedGoals: number;
  /** Fixtures in the window — more than one per gameweek raises this. */
  matchCount: number;
}

export interface TickerSummary {
  from: number;
  to: number;
  doubles: { gw: number; teams: string[] }[];
  blanks: { gw: number; teams: string[] }[];
}

export function buildTicker(
  boot: FplBootstrap,
  fixtures: FplFixture[],
  strengths: Map<number, TeamStrength>,
  span: number,
): { rows: TickerRow[]; summary: TickerSummary } {
  const short = new Map(boot.teams.map((t) => [t.id, t.short_name]));

  const pending = fixtures
    .filter((f) => !f.finished && f.event !== null)
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0));

  const firstGw = pending.length ? (pending[0].event as number) : 1;
  const window: number[] = [];
  for (let gw = firstGw; gw < firstGw + span && gw <= 38; gw++) window.push(gw);

  // team -> gameweek -> fixtures
  const byTeam = new Map<number, Map<number, TickerFixture[]>>();
  for (const t of boot.teams) byTeam.set(t.id, new Map());

  for (const f of pending) {
    const gw = f.event as number;
    if (!window.includes(gw)) continue;

    const add = (teamId: number, oppId: number, home: boolean, difficulty: number) => {
      const team = strengths.get(teamId);
      const opp = strengths.get(oppId);
      const conceded = expectedGoalsFor(opp, team, !home);
      const scored = expectedGoalsFor(team, opp, home);
      const slot = byTeam.get(teamId);
      if (!slot) return;
      const list = slot.get(gw) ?? [];
      list.push({
        opponent: short.get(oppId) ?? "???",
        opponentId: oppId,
        home,
        difficulty,
        rerated: derivedDifficulty(conceded),
        expectedConceded: Number(conceded.toFixed(2)),
        expectedScored: Number(scored.toFixed(2)),
      });
      slot.set(gw, list);
    };

    add(f.team_h, f.team_a, true, f.team_h_difficulty);
    add(f.team_a, f.team_h, false, f.team_a_difficulty);
  }

  const rows: TickerRow[] = boot.teams.map((t) => {
    const slots = byTeam.get(t.id) ?? new Map<number, TickerFixture[]>();
    const cells: TickerCell[] = window.map((gw) => {
      const fx = slots.get(gw) ?? [];
      return { gw, fixtures: fx, blank: fx.length === 0, double: fx.length > 1 };
    });

    const all = cells.flatMap((c) => c.fixtures);
    const s = strengths.get(t.id);

    return {
      teamId: t.id,
      team: t.name,
      short: t.short_name,
      attack: Number((s?.attack ?? 1).toFixed(2)),
      leak: Number((s?.leak ?? 1).toFixed(2)),
      cells,
      averageDifficulty: all.length
        ? Number((all.reduce((x, f) => x + f.rerated, 0) / all.length).toFixed(2))
        : 3,
      netExpectedGoals: Number(
        all.reduce((x, f) => x + f.expectedScored - f.expectedConceded, 0).toFixed(2),
      ),
      matchCount: all.length,
    };
  });

  const doubles: { gw: number; teams: string[] }[] = [];
  const blanks: { gw: number; teams: string[] }[] = [];
  for (const gw of window) {
    const d = rows.filter((r) => r.cells.find((c) => c.gw === gw)?.double).map((r) => r.short);
    const b = rows.filter((r) => r.cells.find((c) => c.gw === gw)?.blank).map((r) => r.short);
    if (d.length) doubles.push({ gw, teams: d });
    if (b.length) blanks.push({ gw, teams: b });
  }

  return {
    rows,
    summary: {
      from: window[0] ?? 1,
      to: window[window.length - 1] ?? 1,
      doubles,
      blanks,
    },
  };
}

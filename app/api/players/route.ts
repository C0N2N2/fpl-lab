import { NextResponse } from "next/server";
import {
  FPL_BASE,
  normalise,
  upcomingByTeam,
  nextGameweek,
  type FplBootstrap,
  type FplFixture,
} from "@/lib/fpl";
import { projectPlayer } from "@/lib/predict";
import { computeStrengths } from "@/lib/strength";
import { cachedJson } from "@/lib/cache";

/** Cache upstream responses for 10 minutes — FPL data changes slowly. */
const TTL = 600;

const fplFetch = <T>(path: string) => cachedJson<T>(`${FPL_BASE}${path}`, TTL);

export async function GET(request: Request) {
  // 38 covers the rest of any season; upcomingByTeam simply returns fewer.
  const horizon = Math.min(
    38,
    Math.max(1, Number(new URL(request.url).searchParams.get("horizon") ?? 5)),
  );

  try {
    const [boot, fixtures] = await Promise.all([
      fplFetch<FplBootstrap>("/bootstrap-static/"),
      fplFetch<FplFixture[]>("/fixtures/"),
    ]);

    const players = normalise(boot);
    const upcoming = upcomingByTeam(fixtures, boot, horizon);
    const next = nextGameweek(boot);

    // How many matches each team has already played — drives the minutes model.
    const played = new Map<number, number>();
    for (const f of fixtures) {
      if (!f.finished) continue;
      played.set(f.team_h, (played.get(f.team_h) ?? 0) + 1);
      played.set(f.team_a, (played.get(f.team_a) ?? 0) + 1);
    }

    const strengths = computeStrengths(boot, fixtures);

    const rows = players.map((p) => {
      const fx = upcoming.get(p.teamId) ?? [];
      const proj = projectPlayer(p, fx, played.get(p.teamId) ?? 0, horizon, strengths);
      return {
        ...p,
        xp: Number(proj.next.total.toFixed(2)),
        xpHorizon: Number(proj.horizon.toFixed(2)),
        value: p.price > 0 ? Number((proj.horizon / p.price).toFixed(2)) : 0,
        breakdown: {
          appearance: Number(proj.next.appearance.toFixed(2)),
          goals: Number(proj.next.goals.toFixed(2)),
          assists: Number(proj.next.assists.toFixed(2)),
          cleanSheet: Number(proj.next.cleanSheet.toFixed(2)),
          saves: Number(proj.next.saves.toFixed(2)),
          conceded: Number(proj.next.conceded.toFixed(2)),
          defcon: Number(proj.next.defcon.toFixed(2)),
          bonus: Number(proj.next.bonus.toFixed(2)),
        },
        expectedMinutes: Math.round(proj.next.minutes.expected),
        fixtures: proj.perGameweek.map((g) => ({
          gw: g.gw,
          opponent: g.opponent,
          home: g.home,
          difficulty: g.difficulty,
          rerated: g.rerated,
          points: Number(g.points.toFixed(2)),
        })),
      };
    });

    return NextResponse.json({
      meta: {
        nextGameweek: next?.id ?? null,
        deadline: next?.deadline_time ?? null,
        horizon,
        playerCount: rows.length,
        matchesPlayed: Math.max(0, ...played.values()),
        generatedAt: new Date().toISOString(),
      },
      teams: boot.teams.map((t) => {
        const s = strengths.get(t.id);
        return {
          id: t.id,
          name: t.name,
          short: t.short_name,
          attack: Number((s?.attack ?? 1).toFixed(2)),
          leak: Number((s?.leak ?? 1).toFixed(2)),
          goalsFor: s?.goalsFor ?? 0,
          goalsAgainst: s?.goalsAgainst ?? 0,
        };
      }),
      players: rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not load FPL data", detail: message },
      { status: 502 },
    );
  }
}

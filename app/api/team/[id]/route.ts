import { NextResponse } from "next/server";
import {
  FPL_BASE, normalise, upcomingByTeam, nextGameweek,
  type FplBootstrap, type FplFixture,
} from "@/lib/fpl";
import { projectPlayer } from "@/lib/predict";
import { computeStrengths } from "@/lib/strength";
import { cachedJson } from "@/lib/cache";

/** Manager picks change every deadline; the static data far less often. */
const TTL_ENTRY = 120;
const TTL_STATIC = 600;

interface Entry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number | null;
  summary_event_points: number;
  summary_event_rank: number | null;
  current_event: number | null;
  last_deadline_bank?: number;
  last_deadline_value?: number;
}

interface Pick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface PicksResponse {
  active_chip: string | null;
  picks: Pick[];
  entry_history: { event: number; points: number; total_points: number; overall_rank: number | null };
}

async function json<T>(path: string, ttl: number): Promise<T | null> {
  try {
    return await cachedJson<T>(`${FPL_BASE}${path}`, ttl);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const entryId = Number(id);

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json(
      { error: "That doesn't look like an FPL team ID", detail: "Expected a positive number." },
      { status: 400 },
    );
  }

  const entry = await json<Entry>(`/entry/${entryId}/`, TTL_ENTRY);
  if (!entry) {
    return NextResponse.json(
      {
        error: "Team not found",
        detail:
          "FPL returned nothing for that ID. Check the number in your team's URL on the FPL site.",
      },
      { status: 404 },
    );
  }

  const [boot, fixtures] = await Promise.all([
    json<FplBootstrap>("/bootstrap-static/", TTL_STATIC),
    json<FplFixture[]>("/fixtures/", TTL_STATIC),
  ]);
  if (!boot || !fixtures) {
    return NextResponse.json({ error: "Could not load FPL data" }, { status: 502 });
  }

  // Picks are published per completed gameweek; the newest is the current one.
  const gw = entry.current_event ?? (nextGameweek(boot)?.id ?? 1) - 1;
  const picks = gw >= 1 ? await json<PicksResponse>(`/entry/${entryId}/event/${gw}/picks/`, TTL_ENTRY) : null;

  const players = normalise(boot);
  const byId = new Map(players.map((p) => [p.id, p]));
  const strengths = computeStrengths(boot, fixtures);
  const upcoming = upcomingByTeam(fixtures, boot, 5);

  const played = new Map<number, number>();
  for (const f of fixtures) {
    if (!f.finished) continue;
    played.set(f.team_h, (played.get(f.team_h) ?? 0) + 1);
    played.set(f.team_a, (played.get(f.team_a) ?? 0) + 1);
  }

  const squad = (picks?.picks ?? []).flatMap((pick) => {
    const p = byId.get(pick.element);
    if (!p) return [];
    const proj = projectPlayer(p, upcoming.get(p.teamId) ?? [], played.get(p.teamId) ?? 0, 5, strengths);
    return [{
      ...p,
      xp: Number(proj.next.total.toFixed(2)),
      xpHorizon: Number(proj.horizon.toFixed(2)),
      value: p.price > 0 ? Number((proj.horizon / p.price).toFixed(2)) : 0,
      expectedMinutes: Math.round(proj.next.minutes.expected),
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
      fixtures: proj.perGameweek.map((g) => ({
        gw: g.gw, opponent: g.opponent, home: g.home,
        difficulty: g.difficulty, rerated: g.rerated,
        points: Number(g.points.toFixed(2)),
      })),
      // squad context
      slot: pick.position,
      benched: pick.position > 11,
      isCaptain: pick.is_captain,
      isVice: pick.is_vice_captain,
    }];
  });

  return NextResponse.json({
    manager: {
      id: entry.id,
      teamName: entry.name,
      managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
      overallPoints: entry.summary_overall_points,
      overallRank: entry.summary_overall_rank,
      gameweekPoints: entry.summary_event_points,
      gameweekRank: entry.summary_event_rank,
      currentEvent: gw,
      bank: (entry.last_deadline_bank ?? 0) / 10,
      squadValue: (entry.last_deadline_value ?? 0) / 10,
      activeChip: picks?.active_chip ?? null,
    },
    hasPicks: squad.length > 0,
    squad,
  });
}

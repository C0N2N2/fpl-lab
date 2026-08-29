import { NextResponse } from "next/server";
import { FPL_BASE, nextGameweek, type FplBootstrap, type FplFixture } from "@/lib/fpl";
import { computeStrengths } from "@/lib/strength";
import { buildTicker } from "@/lib/ticker";
import { cachedJson } from "@/lib/cache";

const TTL = 600;

export async function GET(request: Request) {
  const span = Math.min(
    20,
    Math.max(3, Number(new URL(request.url).searchParams.get("span") ?? 8)),
  );

  try {
    const [boot, fixtures] = await Promise.all([
      cachedJson<FplBootstrap>(`${FPL_BASE}/bootstrap-static/`, TTL),
      cachedJson<FplFixture[]>(`${FPL_BASE}/fixtures/`, TTL),
    ]);

    const strengths = computeStrengths(boot, fixtures);
    const { rows, summary } = buildTicker(boot, fixtures, strengths, span);
    const next = nextGameweek(boot);

    const played = new Map<number, number>();
    for (const f of fixtures) {
      if (!f.finished) continue;
      played.set(f.team_h, (played.get(f.team_h) ?? 0) + 1);
      played.set(f.team_a, (played.get(f.team_a) ?? 0) + 1);
    }

    return NextResponse.json({
      meta: {
        span,
        nextGameweek: next?.id ?? null,
        deadline: next?.deadline_time ?? null,
        matchesPlayed: Math.max(0, ...played.values()),
      },
      summary,
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not load fixtures",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

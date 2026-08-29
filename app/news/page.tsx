"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNews, type NewsItem, type NewsPayload } from "@/lib/api";
import { ErrorNote, Hero, Loading, Panel, PanelHead, Pill } from "@/components/ui";

type Tab = "headlines" | "transfers" | "availability";

export default function News() {
  const [data, setData] = useState<NewsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("availability");
  const [teamId, setTeamId] = useState<number | "all">("all");

  useEffect(() => {
    let cancelled = false;
    fetchNews()
      .then((json) => { if (!cancelled) setData(json); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const shortById = useMemo(() => {
    const m = new Map<number, string>();
    data?.teams.forEach((t) => m.set(t.id, t.short));
    return m;
  }, [data]);

  const filterByTeam = (items: NewsItem[]) =>
    teamId === "all" ? items : items.filter((i) => i.teamIds.includes(teamId));

  const availability = useMemo(() => {
    if (!data) return [];
    return teamId === "all"
      ? data.availability
      : data.availability.filter((t) => t.teamId === teamId);
  }, [data, teamId]);

  const flaggedCount = data?.availability.reduce((s, t) => s + t.entries.length, 0) ?? 0;

  return (
    <main className="py-10">
      <Hero
        kicker="Team news"
        title={<>Who&apos;s <span className="marker">out</span>, who just signed</>}
        blurb="Injury and suspension flags straight from FPL, plus transfer-window headlines. Check this before every deadline — an unavailable player in your XI is the cheapest mistake to avoid."
      />

      {error && <ErrorNote title="Couldn't load news" detail={error} />}
      {!data && !error && <Loading what="the latest" />}

      {data && (
        <>
          {data.meta.feedsFailed > 0 && (
            <div className="mb-4 rounded-lg border border-flare bg-flare-wash px-4 py-2 text-sm text-chalk-mid">
              {data.meta.feedsFailed} of {data.meta.feedsRequested} news feeds didn&apos;t
              respond. Availability data below is unaffected — it comes from FPL directly.
            </div>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {([
              ["availability", `Injuries & flags (${flaggedCount})`],
              ["transfers", `Transfer window (${data.transfers.length})`],
              ["headlines", `Headlines (${data.headlines.length})`],
            ] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`rounded-full border border-line px-4 py-1.5 text-sm font-bold transition ${
                  tab === id ? "bg-chalk text-void" : "bg-panel text-chalk-mid hover:bg-flare-wash"
                }`}
              >
                {label}
              </button>
            ))}

            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value === "all" ? "all" : Number(e.target.value))}
              aria-label="Filter by club"
              className="ml-auto rounded-lg border border-line bg-panel px-3 py-1.5 text-sm"
            >
              <option value="all">All clubs</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {tab === "availability" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availability.map((t) => (
                <Panel key={t.teamId}>
                  <PanelHead
                    title={t.team}
                    right={<span className="stat text-xs text-chalk-dim">{t.entries.length} flagged</span>}
                  />
                  <ul className="divide-y divide-line-soft">
                    {t.entries.map((e) => (
                      <li key={e.playerId} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold">{e.name}</span>
                          <span className="stat text-[10px] text-chalk-dim">
                            {e.position} · £{e.price.toFixed(1)} · {e.ownership.toFixed(1)}%
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-snug text-chalk-mid">{e.news}</p>
                        <div className="mt-1.5 flex gap-1.5">
                          {e.chance === 0 && <Pill tone="red">ruled out</Pill>}
                          {e.chance !== null && e.chance > 0 && e.chance < 100 && (
                            <Pill tone="yellow">{e.chance}% chance</Pill>
                          )}
                          {e.chance === null && e.status !== "a" && <Pill tone="red">unavailable</Pill>}
                          {e.ownership > 5 && <Pill>widely owned</Pill>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ))}
              {availability.length === 0 && (
                <Panel className="md:col-span-2 xl:col-span-3">
                  <p className="px-5 py-14 text-center text-sm text-chalk-mid">
                    No availability flags for that club right now.
                  </p>
                </Panel>
              )}
            </div>
          )}

          {(tab === "transfers" || tab === "headlines") && (
            <Panel>
              <PanelHead
                title={tab === "transfers" ? "Transfer window" : "Latest headlines"}
                right={<span className="stat text-xs text-chalk-dim">BBC Sport · Sky Sports</span>}
              />
              <ul className="divide-y divide-line-soft">
                {filterByTeam(tab === "transfers" ? data.transfers : data.headlines).map((item, i) => (
                  <li key={`${item.link}-${i}`} className="px-4 py-3">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline-offset-2 hover:text-strike hover:underline"
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="stat text-[10px] text-chalk-dim">{item.source}</span>
                      {item.published && (
                        <span className="stat text-[10px] text-chalk-dim">
                          {new Date(item.published).toLocaleString(undefined, {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      )}
                      {item.teamIds.map((id) => (
                        <Pill key={id} tone="yellow">{shortById.get(id) ?? "?"}</Pill>
                      ))}
                    </div>
                  </li>
                ))}
                {filterByTeam(tab === "transfers" ? data.transfers : data.headlines).length === 0 && (
                  <li className="px-5 py-14 text-center text-sm text-chalk-mid">
                    Nothing matching that club in the current feed.
                  </li>
                )}
              </ul>
            </Panel>
          )}

          <p className="stat mt-4 text-[10px] text-chalk-dim">
            Headlines are fetched from public RSS feeds and matched to clubs by name, so the odd
            tag may be wrong. Injury flags come straight from the FPL API and are authoritative.
          </p>
        </>
      )}
    </main>
  );
}

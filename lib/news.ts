/**
 * News aggregation.
 *
 * Two independent sources:
 *  1. Public football RSS feeds — headlines and transfer-window activity.
 *  2. The FPL API's own per-player `news` field — injuries, suspensions and
 *     availability, which is the part that actually changes your team.
 */

import type { FplBootstrap } from "./fpl";

export interface NewsItem {
  title: string;
  link: string;
  published: string | null;
  source: string;
  /** FPL team ids this headline appears to be about. */
  teamIds: number[];
  /** Reads like transfer-window business. */
  transfer: boolean;
}

export interface TeamNewsEntry {
  playerId: number;
  name: string;
  position: string;
  price: number;
  news: string;
  chance: number | null;
  status: string;
  ownership: number;
}

export interface TeamNews {
  teamId: number;
  team: string;
  short: string;
  entries: TeamNewsEntry[];
}

/* ------------------------------------------------------------------ */
/* RSS                                                                  */
/* ------------------------------------------------------------------ */

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&pound;/g, "£")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1]) : null;
}

const TRANSFER_WORDS =
  /\b(sign(s|ed|ing)?|transfer|deal|bid|loan|join(s|ed|ing)?|move(s|d)?|agree(s|d)?|fee|swoop|medical|contract|release[sd]?|window)\b/i;

/** Extract items from an RSS 2.0 or Atom document. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: NewsItem[] = [];

  for (const b of blocks) {
    const title = pick(b, "title");
    if (!title) continue;
    const link = pick(b, "link") ?? "";
    const published = pick(b, "pubDate") ?? pick(b, "dc:date");
    out.push({
      title,
      link,
      published,
      source,
      teamIds: [],
      transfer: TRANSFER_WORDS.test(title),
    });
  }
  return out;
}

/**
 * Aliases beyond the club's official name, so "Spurs" and "Nottm Forest"
 * still match. Keyed by FPL short_name.
 */
const ALIASES: Record<string, string[]> = {
  ARS: ["arsenal", "gunners"],
  AVL: ["aston villa", "villa"],
  BOU: ["bournemouth", "cherries"],
  BRE: ["brentford", "bees"],
  BHA: ["brighton", "seagulls"],
  CHE: ["chelsea", "blues"],
  CRY: ["crystal palace", "palace"],
  EVE: ["everton", "toffees"],
  FUL: ["fulham", "cottagers"],
  LIV: ["liverpool", "reds"],
  MCI: ["man city", "manchester city", "city"],
  MUN: ["man utd", "man united", "manchester united", "united"],
  NEW: ["newcastle", "magpies"],
  NFO: ["nottingham forest", "nottm forest", "forest"],
  TOT: ["tottenham", "spurs"],
  WHU: ["west ham", "hammers"],
  WOL: ["wolves", "wolverhampton"],
  LEE: ["leeds"],
  SUN: ["sunderland", "black cats"],
  IPS: ["ipswich"],
  HUL: ["hull city", "hull", "tigers"],
  COV: ["coventry city", "coventry"],
  BUR: ["burnley", "clarets"],
  SHU: ["sheffield united", "sheffield utd"],
  LUT: ["luton"],
  NOR: ["norwich"],
  SOU: ["southampton", "saints"],
  LEI: ["leicester", "foxes"],
};

/** Tag each headline with the FPL teams it mentions. */
export function tagTeams(items: NewsItem[], boot: FplBootstrap): NewsItem[] {
  const table = boot.teams.map((t) => ({
    id: t.id,
    needles: [t.name.toLowerCase(), ...(ALIASES[t.short_name] ?? [])],
  }));

  return items.map((item) => {
    const hay = item.title.toLowerCase();
    const teamIds = table
      .filter((t) => t.needles.some((n) => hay.includes(n)))
      .map((t) => t.id);
    return { ...item, teamIds };
  });
}

/* ------------------------------------------------------------------ */
/* FPL availability news                                                */
/* ------------------------------------------------------------------ */

const POS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

/**
 * Every player carrying a news note, grouped by club and ordered so the
 * players most likely to be in someone's squad come first.
 */
export function teamNews(boot: FplBootstrap): TeamNews[] {
  const byTeam = new Map<number, TeamNewsEntry[]>();

  for (const e of boot.elements) {
    const note = (e.news ?? "").trim();
    if (!note) continue;
    const list = byTeam.get(e.team) ?? [];
    list.push({
      playerId: e.id,
      name: e.web_name,
      position: POS[e.element_type] ?? "?",
      price: e.now_cost / 10,
      news: note,
      chance: e.chance_of_playing_next_round,
      status: e.status,
      ownership: parseFloat(e.selected_by_percent ?? "0") || 0,
    });
    byTeam.set(e.team, list);
  }

  return boot.teams
    .map((t) => ({
      teamId: t.id,
      team: t.name,
      short: t.short_name,
      entries: (byTeam.get(t.id) ?? []).sort((a, b) => b.ownership - a.ownership),
    }))
    .filter((t) => t.entries.length > 0)
    .sort((a, b) => b.entries.length - a.entries.length);
}

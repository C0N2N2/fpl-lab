import type { Metadata } from "next";
import { Hero, Panel, PanelHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "How FPL works",
  description:
    "The 2026/27 Fantasy Premier League rules in plain language: squad limits, scoring, defensive contributions, bonus points, transfers and all eight chips.",
};

const SCORING: { what: string; gkp: string; def: string; mid: string; fwd: string }[] = [
  { what: "Playing up to 60 minutes", gkp: "1", def: "1", mid: "1", fwd: "1" },
  { what: "Playing 60+ minutes", gkp: "2", def: "2", mid: "2", fwd: "2" },
  { what: "Goal scored", gkp: "10", def: "6", mid: "5", fwd: "4" },
  { what: "Assist", gkp: "3", def: "3", mid: "3", fwd: "3" },
  { what: "Clean sheet", gkp: "4", def: "4", mid: "1", fwd: "—" },
  { what: "Every 3 saves", gkp: "1", def: "—", mid: "—", fwd: "—" },
  { what: "Penalty save", gkp: "5", def: "—", mid: "—", fwd: "—" },
  { what: "Defensive contribution", gkp: "—", def: "2", mid: "2", fwd: "2" },
  { what: "Every 2 goals conceded", gkp: "−1", def: "−1", mid: "—", fwd: "—" },
  { what: "Penalty miss", gkp: "−2", def: "−2", mid: "−2", fwd: "−2" },
  { what: "Yellow card", gkp: "−1", def: "−1", mid: "−1", fwd: "−1" },
  { what: "Red card", gkp: "−3", def: "−3", mid: "−3", fwd: "−3" },
  { what: "Own goal", gkp: "−2", def: "−2", mid: "−2", fwd: "−2" },
];

const CHIPS = [
  {
    name: "Wildcard",
    what: "Unlimited transfers for one gameweek, with no points hit.",
    when: "When your squad needs four or more changes at once — after an injury pile-up, or to reshape around a good fixture run.",
  },
  {
    name: "Free Hit",
    what: "Unlimited transfers for one gameweek only. Your squad reverts afterwards.",
    when: "A blank gameweek, when half your team has no fixture. Also useful to attack a big double.",
  },
  {
    name: "Triple Captain",
    what: "Your captain scores triple instead of double.",
    when: "A premium attacker in a double gameweek — two fixtures, tripled.",
  },
  {
    name: "Bench Boost",
    what: "All 15 players score, not just your XI.",
    when: "A double gameweek, and only when all four bench players actually start. A non-playing bench keeper wastes it.",
  },
];

export default function Rules() {
  return (
    <main className="mx-auto max-w-[1000px] py-10">
      <Hero
        kicker="The basics"
        title={<>How the <span className="marker">game</span> works</>}
        blurb="Everything the 2026/27 rules actually say — squad limits, how points are scored, and when each chip is worth playing."
      />

      <div className="flex flex-col gap-6">
        <Panel>
          <PanelHead title="Your squad" />
          <div className="flex flex-col gap-3 px-5 py-4 text-[15px] leading-relaxed text-chalk-mid">
            <p>
              You pick <b className="text-chalk">15 players for £100.0m</b>: two goalkeepers, five
              defenders, five midfielders and three forwards. No more than{" "}
              <b className="text-chalk">three players from any one club</b>.
            </p>
            <p>
              Each gameweek you start 11 of them, in any shape with at least three defenders and
              one forward. You name a <b className="text-chalk">captain</b>, who scores double, and a
              vice-captain who takes over if the captain doesn&apos;t play at all.
            </p>
            <p>
              Your bench is ordered. If a starter doesn&apos;t play, the first eligible substitute
              replaces them automatically — but only if the swap keeps the formation legal.
            </p>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHead title="How points are scored" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-panel-2">
                  <th className="stat px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-chalk-dim">
                    Action
                  </th>
                  {["GKP", "DEF", "MID", "FWD"].map((p) => (
                    <th key={p} className="stat px-4 py-2.5 text-right text-[10px] uppercase tracking-wider text-chalk-dim">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORING.map((r) => (
                  <tr key={r.what} className="border-b border-line-soft last:border-b-0">
                    <td className="px-4 py-2 text-chalk-mid">{r.what}</td>
                    {[r.gkp, r.def, r.mid, r.fwd].map((v, i) => (
                      <td
                        key={i}
                        className={`stat px-4 py-2 text-right font-bold ${
                          v.startsWith("−") ? "text-strike" : v === "—" ? "text-chalk-dim" : "text-chalk"
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="border-flare">
          <PanelHead title="Defensive contributions — the rule most people miss" />
          <div className="flex flex-col gap-3 px-5 py-4 text-[15px] leading-relaxed text-chalk-mid">
            <p>
              <b className="text-chalk">Defenders</b> get 2 points for reaching{" "}
              <b className="text-chalk">10</b> combined clearances, blocks, interceptions and tackles
              in a match.
            </p>
            <p>
              <b className="text-chalk">Midfielders and forwards</b> get 2 points for reaching{" "}
              <b className="text-chalk">12</b> — the same four actions plus ball recoveries.
            </p>
            <p>
              It is <b className="text-chalk">capped at 2 points</b>. Doubling the threshold does not
              double the reward. This is why a busy, unglamorous defender can quietly out-score a
              more famous one, and it is modelled explicitly in our projections.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Transfers" />
          <div className="flex flex-col gap-3 px-5 py-4 text-[15px] leading-relaxed text-chalk-mid">
            <p>
              One free transfer per gameweek. Unused ones roll over and you can bank up to{" "}
              <b className="text-chalk">five</b>. Any transfer beyond your free ones costs{" "}
              <b className="text-strike">−4 points</b>.
            </p>
            <p>
              Player prices move with net transfers across the whole game. Selling for more than you
              paid earns you the profit, so an early buy into a rising player compounds over a
              season.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Chips — eight of them, four per half" />
          <div className="px-5 py-4">
            <p className="mb-4 text-[15px] leading-relaxed text-chalk-mid">
              You get one of each chip in the <b className="text-chalk">first half</b> of the season
              and one of each in the <b className="text-chalk">second</b>. First-half chips expire at
              the <b className="text-chalk">Gameweek 19 deadline</b> and do not carry over — so an
              unused Wildcard in January is simply lost.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHIPS.map((c) => (
                <div key={c.name} className="rounded-lg border border-line bg-panel-2 px-4 py-3">
                  <h3 className="display text-lg">{c.name}</h3>
                  <p className="mt-1 text-[14px] leading-snug text-chalk-mid">{c.what}</p>
                  <p className="mt-2 text-[13px] leading-snug text-chalk-dim">
                    <b className="text-chalk-mid">When:</b> {c.when}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Doubles, blanks and bonus" />
          <div className="flex flex-col gap-3 px-5 py-4 text-[15px] leading-relaxed text-chalk-mid">
            <p>
              A <b className="text-chalk">double gameweek</b> is when a club plays twice — its players
              score twice. A <b className="text-chalk">blank</b> is when a club has no fixture and its
              players score nothing. Both come from postponements and cup runs, so they appear
              during the season rather than being scheduled. The{" "}
              <a href="/fixtures" className="font-bold text-strike underline">fixture ticker</a> flags
              them as soon as they exist.
            </p>
            <p>
              <b className="text-chalk">Bonus points</b> give 3, 2 and 1 to the best performers in each
              match, ranked by a Bonus Points System that weighs goals, assists, saves, defensive
              actions and passing. Projected bonus now appears from 20 minutes into a match and is
              adjusted as it goes.
            </p>
            <p>
              Scores are <b className="text-chalk">final at 09:00 UK time</b> the day after a
              gameweek&apos;s last match, once the full match data has been reviewed — so late
              changes to bonus and defensive contributions are normal.
            </p>
          </div>
        </Panel>

        <Panel className="border-strike">
          <PanelHead title="What this site adds" />
          <div className="flex flex-col gap-3 px-5 py-4 text-[15px] leading-relaxed text-chalk-mid">
            <p>
              FPL publishes a fixture difficulty rating, but it is set in preseason and{" "}
              <b className="text-chalk">never updated</b>. A team that ships four goals on opening day
              keeps its July rating all season.
            </p>
            <p>
              Every projection here re-rates difficulty from actual results — measuring each
              club&apos;s attack and leakiness from goals scored and conceded, then blending that
              with the preseason rating according to how many matches have been played. Early on it
              leans on the prior; by October it is running on reality.
            </p>
            <p className="text-chalk-dim">
              Projections are a model. They are a better starting point than a gut feeling, and a
              worse one than watching the football.
            </p>
          </div>
        </Panel>
      </div>
    </main>
  );
}

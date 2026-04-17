import { useEffect, useState } from "react";
import type { Match, Player, Team } from "@/types/cricket";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  match: Match;
  teams: Map<string, Team>;
}

interface BatStat { player: Player; runs: number; balls: number; out: boolean; }
interface BowlStat { player: Player; balls: number; runs: number; wickets: number; }

export function Scorecard({ match, teams }: Props) {
  const [innings, setInnings] = useState<1 | 2>(match.current_innings as 1 | 2);
  const [data, setData] = useState<{ bat: BatStat[]; bowl: BowlStat[] } | null>(null);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from("players").select("*")
        .in("team_id", [match.team1_id, match.team2_id]);
      setPlayers(new Map((ps ?? []).map((p: Player) => [p.id, p])));
    })();
  }, [match.team1_id, match.team2_id]);

  useEffect(() => {
    (async () => {
      const { data: balls } = await supabase.from("balls").select("*")
        .eq("match_id", match.id).eq("innings", innings).order("ball_number");
      const bat = new Map<string, BatStat>();
      const bowl = new Map<string, BowlStat>();
      for (const b of (balls ?? [])) {
        const batter = players.get(b.batsman_id);
        const bowler = players.get(b.bowler_id);
        if (batter) {
          const s = bat.get(batter.id) ?? { player: batter, runs: 0, balls: 0, out: false };
          s.balls += 1;
          if (!b.is_wicket) s.runs += b.runs;
          if (b.is_wicket) s.out = true;
          bat.set(batter.id, s);
        }
        if (bowler) {
          const s = bowl.get(bowler.id) ?? { player: bowler, balls: 0, runs: 0, wickets: 0 };
          s.balls += 1;
          s.runs += b.runs;
          if (b.is_wicket) s.wickets += 1;
          bowl.set(bowler.id, s);
        }
      }
      setData({
        bat: Array.from(bat.values()).sort((a, b) => b.runs - a.runs),
        bowl: Array.from(bowl.values()).sort((a, b) => b.wickets - a.wickets || b.runs - a.runs),
      });
    })();
  }, [match.id, match.balls, innings, players]);

  const battingTeamId = innings === 1
    ? match.innings1_batting_team_id
    : (match.innings1_batting_team_id === match.team1_id ? match.team2_id : match.team1_id);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <InningsTab active={innings === 1} onClick={() => setInnings(1)} label="Innings 1" />
        {(match.current_innings >= 2 || match.status === "completed") && (
          <InningsTab active={innings === 2} onClick={() => setInnings(2)} label="Innings 2" />
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 bg-surface-elevated">
          <div className="text-sm font-semibold">{teams.get(battingTeamId ?? "")?.name ?? "—"} batting</div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Batter</th>
              <th className="text-right px-2 py-2 font-medium">R</th>
              <th className="text-right px-2 py-2 font-medium">B</th>
              <th className="text-right px-4 py-2 font-medium">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data?.bat ?? []).length === 0 && (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-4">No data yet.</td></tr>
            )}
            {(data?.bat ?? []).map(s => (
              <tr key={s.player.id}>
                <td className="px-4 py-2">
                  {s.player.name}{" "}
                  <span className="text-xs text-muted-foreground">{s.out ? "(out)" : "(not out)"}</span>
                </td>
                <td className="text-right px-2 py-2 tabular-nums font-semibold">{s.runs}</td>
                <td className="text-right px-2 py-2 tabular-nums">{s.balls}</td>
                <td className="text-right px-4 py-2 tabular-nums text-muted-foreground">
                  {s.balls ? ((s.runs / s.balls) * 100).toFixed(1) : "0.0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 bg-surface-elevated">
          <div className="text-sm font-semibold">Bowling</div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Bowler</th>
              <th className="text-right px-2 py-2 font-medium">O</th>
              <th className="text-right px-2 py-2 font-medium">R</th>
              <th className="text-right px-2 py-2 font-medium">W</th>
              <th className="text-right px-4 py-2 font-medium">Econ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data?.bowl ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted-foreground py-4">No data yet.</td></tr>
            )}
            {(data?.bowl ?? []).map(s => (
              <tr key={s.player.id}>
                <td className="px-4 py-2">{s.player.name}</td>
                <td className="text-right px-2 py-2 tabular-nums">{Math.floor(s.balls / 6)}.{s.balls % 6}</td>
                <td className="text-right px-2 py-2 tabular-nums">{s.runs}</td>
                <td className="text-right px-2 py-2 tabular-nums font-semibold">{s.wickets}</td>
                <td className="text-right px-4 py-2 tabular-nums text-muted-foreground">
                  {s.balls ? ((s.runs / s.balls) * 6).toFixed(2) : "0.00"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InningsTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

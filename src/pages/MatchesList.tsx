import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMatches, listTeams } from "@/services/cricket";
import type { Match, Team } from "@/types/cricket";

export default function MatchesList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());

  useEffect(() => {
    Promise.all([listMatches(), listTeams()]).then(([ms, ts]) => {
      setMatches(ms);
      setTeams(new Map(ts.map(t => [t.id, t])));
    });
  }, []);

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold">All Matches</h1>
        <p className="text-muted-foreground text-sm mt-1">Live, upcoming, and completed matches.</p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No matches yet. Start one from the home page.
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map(m => {
            const t1 = teams.get(m.team1_id);
            const t2 = teams.get(m.team2_id);
            return (
              <Link key={m.id} to={`/match/${m.id}`}
                className="block rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{t1?.name} vs {t2?.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {m.status === "in_progress" && `${m.score}/${m.wickets} (${Math.floor(m.balls / 6)}.${m.balls % 6} ov, innings ${m.current_innings})`}
                      {m.status === "completed" && m.winner_team_id && `${teams.get(m.winner_team_id)?.short_name} won by ${m.win_margin_text}`}
                      {m.status === "not_started" && "Not started"}
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    in_progress: { label: "Live", className: "bg-primary/20 text-primary" },
    completed: { label: "Result", className: "bg-secondary text-muted-foreground" },
    not_started: { label: "Upcoming", className: "bg-secondary text-muted-foreground" },
  };
  const { label, className } = map[status] ?? map.not_started;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

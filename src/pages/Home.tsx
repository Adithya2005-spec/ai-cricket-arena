import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { listTeams, listMatches, startMatch, listTournaments } from "@/services/cricket";
import type { Team, Match, Tournament } from "@/types/cricket";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Home() {
  const nav = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [t1, setT1] = useState<string>("");
  const [t2, setT2] = useState<string>("");
  const [aiCommentary, setAiCommentary] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([listTeams(), listMatches(), listTournaments()]).then(([ts, ms, trs]) => {
      setTeams(ts); setMatches(ms); setTournaments(trs);
      if (ts.length >= 2) { setT1(ts[0].id); setT2(ts[1].id); }
    }).catch(e => toast.error(e.message));
  }, []);

  const teamMap = new Map(teams.map(t => [t.id, t]));

  async function handleStart() {
    if (!t1 || !t2 || t1 === t2) { toast.error("Pick two different teams"); return; }
    setLoading(true);
    try {
      const m = await startMatch({ team1_id: t1, team2_id: t2, ai_commentary: aiCommentary });
      nav(`/match/${m.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const liveMatches = matches.filter(m => m.status === "in_progress");
  const recent = matches.filter(m => m.status === "completed").slice(0, 6);

  return (
    <div className="container py-8 space-y-10">
      {/* Hero */}
      <section className="rounded-3xl border border-border gradient-hero p-8 md:p-12 relative overflow-hidden shadow-card">
        <div className="absolute inset-0 gradient-pitch opacity-30 pointer-events-none" />
        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-semibold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" /> AI-powered cricket
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
            Live cricket, simulated <span className="text-primary">ball by ball</span>.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Realistic T20 match engine, dynamic commentary, and fully automated AI vs AI tournaments — all in your browser.
          </p>
        </div>
      </section>

      {/* Quick start */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-xl font-semibold mb-4">Start a match</h2>
        <div className="grid md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <TeamPicker teams={teams} value={t1} onChange={setT1} label="Team A" />
          <div className="text-muted-foreground text-center pb-3 hidden md:block">vs</div>
          <TeamPicker teams={teams} value={t2} onChange={setT2} label="Team B" />
          <Button onClick={handleStart} disabled={loading} size="lg" className="font-semibold">
            {loading ? "Starting…" : "Start Match"}
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Switch id="ai" checked={aiCommentary} onCheckedChange={setAiCommentary} />
          <Label htmlFor="ai" className="text-sm cursor-pointer">
            AI commentary <span className="text-muted-foreground">(slower, uses Lovable AI)</span>
          </Label>
        </div>
      </section>

      {/* Live & recent matches */}
      <section className="grid md:grid-cols-2 gap-6">
        <MatchList title="Live now" matches={liveMatches} teamMap={teamMap} emptyText="No live matches. Start one above." nav={nav} />
        <MatchList title="Recent results" matches={recent} teamMap={teamMap} emptyText="No completed matches yet." nav={nav} />
      </section>

      {/* Tournaments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Tournaments</h2>
          <Button variant="secondary" onClick={() => nav("/tournaments")}>View all</Button>
        </div>
        {tournaments.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            No tournaments yet. Head to the Tournaments page to launch a full AI vs AI league.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {tournaments.slice(0, 3).map(t => (
              <button key={t.id} onClick={() => nav(`/tournaments/${t.id}`)}
                className="text-left rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors p-4">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground capitalize mt-1">{t.status}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamPicker({ teams, value, onChange, label }: { teams: Team[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
      >
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  );
}

function MatchList({
  title, matches, teamMap, emptyText, nav,
}: {
  title: string; matches: Match[]; teamMap: Map<string, Team>; emptyText: string; nav: (p: string) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {matches.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">{emptyText}</div>
        )}
        {matches.map(m => {
          const t1 = teamMap.get(m.team1_id);
          const t2 = teamMap.get(m.team2_id);
          return (
            <button key={m.id} onClick={() => nav(`/match/${m.id}`)}
              className="w-full text-left rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">{t1?.short_name} vs {t2?.short_name}</div>
                  {m.status === "in_progress" && (
                    <div className="text-xs text-muted-foreground">
                      {m.score}/{m.wickets} ({Math.floor(m.balls / 6)}.{m.balls % 6} ov)
                    </div>
                  )}
                  {m.status === "completed" && m.winner_team_id && (
                    <div className="text-xs text-muted-foreground">
                      {teamMap.get(m.winner_team_id)?.short_name} won by {m.win_margin_text}
                    </div>
                  )}
                </div>
                {m.status === "in_progress" && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" /> Live
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  listTeams, getTournamentFixtures, getStandings, listTournaments,
  simulateTournament,
} from "@/services/cricket";
import type { Team, Fixture, Standing, Tournament } from "@/types/cricket";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function TournamentView() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const [trs, ts, fs, ss] = await Promise.all([
      listTournaments(), listTeams(), getTournamentFixtures(id), getStandings(id),
    ]);
    setTournament(trs.find(t => t.id === id) ?? null);
    setTeams(new Map(ts.map(t => [t.id, t])));
    setFixtures(fs);
    setStandings(ss);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime updates for fixtures + standings
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`tour-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "fixtures", filter: `tournament_id=eq.${id}` },
        () => refresh())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "standings", filter: `tournament_id=eq.${id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, refresh]);

  async function simulate(mode: "next" | "league" | "all") {
    if (!id) return;
    setBusy(true);
    try {
      await simulateTournament(id, mode);
      toast.success(mode === "next" ? "Match simulated." : "Tournament simulated.");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  if (!tournament) return <div className="container py-12 text-center text-muted-foreground">Loading…</div>;

  const leagueFx = fixtures.filter(f => f.round === "league");
  const playoffFx = fixtures.filter(f => f.round !== "league");
  const remainingLeague = leagueFx.filter(f => f.status === "scheduled").length;

  return (
    <div className="container py-6 space-y-5 max-w-5xl">
      <Link to="/tournaments" className="text-xs text-muted-foreground hover:text-foreground">← Back to tournaments</Link>

      <div className="rounded-2xl border border-border gradient-card shadow-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">{tournament.name}</h1>
            <div className="text-xs text-muted-foreground capitalize mt-1">Status: {tournament.status}</div>
            {tournament.winner_team_id && (
              <div className="mt-2 text-sm">
                🏆 Champion:{" "}
                <span className="font-semibold text-primary">{teams.get(tournament.winner_team_id)?.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tournament.status !== "completed" && (
              <>
                {remainingLeague > 0 && (
                  <Button onClick={() => simulate("next")} disabled={busy} variant="secondary">
                    Sim next match
                  </Button>
                )}
                <Button onClick={() => simulate("all")} disabled={busy} className="font-semibold">
                  {busy ? "Simulating…" : "Sim full tournament"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="standings">
        <TabsList>
          <TabsTrigger value="standings">Points Table</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="playoffs">Playoffs</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-4">
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-surface-elevated">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-2 py-3 font-medium">Team</th>
                  <th className="text-right px-2 py-3 font-medium">P</th>
                  <th className="text-right px-2 py-3 font-medium">W</th>
                  <th className="text-right px-2 py-3 font-medium">L</th>
                  <th className="text-right px-2 py-3 font-medium">Pts</th>
                  <th className="text-right px-4 py-3 font-medium">NRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {standings.map((s, i) => {
                  const team = teams.get(s.team_id);
                  const inTop4 = i < 4;
                  return (
                    <tr key={s.id} className={inTop4 ? "bg-primary/5" : ""}>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {i + 1}
                        {inTop4 && <span className="ml-1 text-primary text-[10px]">●</span>}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team?.color }} />
                          {team?.name}
                        </div>
                      </td>
                      <td className="text-right px-2 py-3 tabular-nums">{s.played}</td>
                      <td className="text-right px-2 py-3 tabular-nums">{s.wins}</td>
                      <td className="text-right px-2 py-3 tabular-nums">{s.losses}</td>
                      <td className="text-right px-2 py-3 tabular-nums font-semibold">{s.points}</td>
                      <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">
                        {s.nrr > 0 ? `+${s.nrr.toFixed(3)}` : s.nrr.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border">
              Top 4 (●) qualify for playoffs.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fixtures" className="mt-4 space-y-2">
          {leagueFx.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No fixtures.
            </div>
          )}
          {leagueFx.map(f => <FixtureRow key={f.id} fixture={f} teams={teams} />)}
        </TabsContent>

        <TabsContent value="playoffs" className="mt-4 space-y-2">
          {playoffFx.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              Playoffs unlock once the league stage is complete.
            </div>
          ) : (
            <>
              <PlayoffsBracket fixtures={playoffFx} teams={teams} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FixtureRow({ fixture, teams }: { fixture: Fixture; teams: Map<string, Team> }) {
  const t1 = teams.get(fixture.team1_id);
  const t2 = teams.get(fixture.team2_id);
  const winner = fixture.winner_team_id ? teams.get(fixture.winner_team_id) : null;
  const isCompleted = fixture.status === "completed";
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between">
      <div className="text-sm">
        <span className={isCompleted && winner?.id !== t1?.id ? "text-muted-foreground" : "font-semibold"}>{t1?.short_name}</span>
        <span className="text-muted-foreground mx-2">vs</span>
        <span className={isCompleted && winner?.id !== t2?.id ? "text-muted-foreground" : "font-semibold"}>{t2?.short_name}</span>
      </div>
      <div className="text-xs">
        {fixture.status === "scheduled" && <span className="text-muted-foreground">Scheduled</span>}
        {fixture.status === "in_progress" && fixture.match_id && (
          <Link to={`/match/${fixture.match_id}`} className="text-primary font-semibold">Watch live →</Link>
        )}
        {isCompleted && (
          <span className="text-muted-foreground">
            <span className="text-primary font-semibold">{winner?.short_name}</span> won
          </span>
        )}
      </div>
    </div>
  );
}

function PlayoffsBracket({ fixtures, teams }: { fixtures: Fixture[]; teams: Map<string, Team> }) {
  const byRound = (r: string) => fixtures.find(f => f.round === r);
  const q1 = byRound("qualifier1");
  const elim = byRound("eliminator");
  const q2 = byRound("qualifier2");
  const final = byRound("final");

  const Stage = ({ title, fx }: { title: string; fx?: Fixture }) => (
    <div className="rounded-xl border border-border bg-surface p-4 min-w-[180px]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {fx ? <FixtureMini fx={fx} teams={teams} /> : <div className="text-xs text-muted-foreground">Awaiting…</div>}
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-3">
      <div className="space-y-3">
        <Stage title="Qualifier 1" fx={q1} />
        <Stage title="Eliminator" fx={elim} />
      </div>
      <div className="self-center">
        <Stage title="Qualifier 2" fx={q2} />
      </div>
      <div className="self-center">
        <Stage title="🏆 Final" fx={final} />
      </div>
    </div>
  );
}

function FixtureMini({ fx, teams }: { fx: Fixture; teams: Map<string, Team> }) {
  const t1 = teams.get(fx.team1_id); const t2 = teams.get(fx.team2_id);
  const w = fx.winner_team_id;
  return (
    <div className="text-sm space-y-1">
      <div className={w === t1?.id ? "font-semibold text-primary" : ""}>{t1?.short_name}</div>
      <div className="text-[10px] text-muted-foreground">vs</div>
      <div className={w === t2?.id ? "font-semibold text-primary" : ""}>{t2?.short_name}</div>
    </div>
  );
}

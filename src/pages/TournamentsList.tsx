import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTournaments, startTournament } from "@/services/cricket";
import type { Tournament } from "@/types/cricket";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { listTournaments().then(setTournaments).catch(e => toast.error(e.message)); }, []);

  async function create() {
    setLoading(true);
    try {
      const t = await startTournament();
      setTournaments(prev => [t, ...prev]);
      toast.success("Tournament created with round-robin fixtures.");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground text-sm mt-1">Round-robin league + playoffs, simulated automatically.</p>
        </div>
        <Button onClick={create} disabled={loading} size="lg" className="font-semibold">
          {loading ? "Creating…" : "New Tournament"}
        </Button>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No tournaments yet. Click <span className="font-semibold text-foreground">New Tournament</span> to launch a full AI vs AI league with all 8 teams.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {tournaments.map(t => (
            <Link key={t.id} to={`/tournaments/${t.id}`}
              className="rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors p-5 block">
              <div className="font-semibold">{t.name}</div>
              <div className="flex items-center gap-2 mt-2">
                <StatusPill status={t.status} />
                <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: "bg-secondary text-muted-foreground",
    league: "bg-primary/20 text-primary",
    playoffs: "bg-accent/20 text-accent",
    completed: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

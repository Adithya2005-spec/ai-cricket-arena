import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMatch, listCommentary, listTeams, nextBall } from "@/services/cricket";
import type { Match, CommentaryEntry, Team } from "@/types/cricket";
import { MatchHeader } from "@/components/cricket/MatchHeader";
import { Last6Balls } from "@/components/cricket/Last6Balls";
import { CommentaryFeed } from "@/components/cricket/CommentaryFeed";
import { Scorecard } from "@/components/cricket/Scorecard";
import { WinProbability } from "@/components/cricket/WinProbability";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function MatchView() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [commentary, setCommentary] = useState<CommentaryEntry[]>([]);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [autoPlay, setAutoPlay] = useState(false);
  const [stepping, setStepping] = useState(false);
  const autoTimer = useRef<number | null>(null);

  // Initial load
  useEffect(() => {
    if (!id) return;
    Promise.all([getMatch(id), listCommentary(id), listTeams()]).then(([m, c, ts]) => {
      setMatch(m);
      setCommentary(c);
      setTeams(new Map(ts.map(t => [t.id, t])));
    });
  }, [id]);

  // Realtime subscriptions: match updates + new commentary (live across all viewers)
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`match-${id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` },
        (payload) => setMatch(payload.new as Match))
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "commentary", filter: `match_id=eq.${id}` },
        (payload) => setCommentary(prev => [payload.new as CommentaryEntry, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const handleNext = useCallback(async () => {
    if (!id || stepping) return;
    setStepping(true);
    try { await nextBall(id); }
    catch (e: any) { toast.error(e.message); setAutoPlay(false); }
    finally { setStepping(false); }
  }, [id, stepping]);

  // Auto-play loop
  useEffect(() => {
    if (!autoPlay) {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
      return;
    }
    if (match?.status === "completed") { setAutoPlay(false); return; }
    autoTimer.current = window.setTimeout(() => { handleNext(); }, 1200);
    return () => { if (autoTimer.current) window.clearTimeout(autoTimer.current); };
  }, [autoPlay, match?.balls, match?.status, handleNext]);

  if (!match) {
    return <div className="container py-12 text-center text-muted-foreground">Loading match…</div>;
  }

  return (
    <div className="container py-6 space-y-5 max-w-4xl">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>

      <MatchHeader match={match} teams={teams} />

      <Last6Balls commentary={commentary} />

      {match.status === "in_progress" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleNext} disabled={stepping || autoPlay} size="lg" className="font-semibold">
            {stepping ? "Bowling…" : "Next Ball"}
          </Button>
          <Button onClick={() => setAutoPlay(p => !p)} variant={autoPlay ? "destructive" : "secondary"} size="lg">
            {autoPlay ? "Pause auto-play" : "Auto-play"}
          </Button>
          {match.ai_commentary && (
            <span className="self-center text-xs text-muted-foreground">AI commentary on</span>
          )}
        </div>
      )}

      <WinProbability match={match} teams={teams} />

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="mt-4">
          <CommentaryFeed commentary={commentary} />
        </TabsContent>
        <TabsContent value="scorecard" className="mt-4">
          <Scorecard match={match} teams={teams} />
        </TabsContent>
        <TabsContent value="info" className="mt-4">
          <div className="rounded-xl border border-border bg-surface p-4 text-sm space-y-2">
            <div><span className="text-muted-foreground">Format:</span> T20 (20 overs / side)</div>
            <div><span className="text-muted-foreground">Match ID:</span> <code className="text-xs">{match.id.slice(0, 8)}</code></div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              💡 Share this URL — anyone opening it sees the same live match in realtime.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Thin wrapper around supabase client + edge function calls.
import { supabase } from "@/integrations/supabase/client";
import type { Match, CommentaryEntry, Team, Tournament, Fixture, Standing, Player } from "@/types/cricket";

export async function listTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw error;
  return data as Team[];
}

export async function listPlayers(teamId?: string): Promise<Player[]> {
  let q = supabase.from("players").select("*").order("batting_order");
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Player[];
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  return (data ?? null) as Match | null;
}

export async function listMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return data as Match[];
}

export async function listCommentary(matchId: string): Promise<CommentaryEntry[]> {
  const { data, error } = await supabase
    .from("commentary")
    .select("*")
    .eq("match_id", matchId)
    .order("ball_number", { ascending: false })
    .limit(120);
  if (error) throw error;
  return data as CommentaryEntry[];
}

export async function startMatch(opts: {
  team1_id: string; team2_id: string; ai_commentary?: boolean;
  tournament_id?: string; fixture_id?: string;
}): Promise<Match> {
  const { data, error } = await supabase.functions.invoke("start-match", { body: opts });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.match as Match;
}

export async function nextBall(matchId: string) {
  const { data, error } = await supabase.functions.invoke("next-ball", { body: { match_id: matchId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Tournament[];
}

export async function startTournament(name?: string): Promise<Tournament> {
  const { data, error } = await supabase.functions.invoke("start-tournament", { body: { name } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.tournament as Tournament;
}

export async function simulateTournament(tournamentId: string, mode: "all" | "league" | "playoffs" | "next" = "all") {
  const { data, error } = await supabase.functions.invoke("simulate-tournament", {
    body: { tournament_id: tournamentId, mode },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getTournamentFixtures(tournamentId: string): Promise<Fixture[]> {
  const { data, error } = await supabase.from("fixtures").select("*")
    .eq("tournament_id", tournamentId).order("scheduled_order");
  if (error) throw error;
  return data as Fixture[];
}

export async function getStandings(tournamentId: string): Promise<Standing[]> {
  const { data, error } = await supabase.from("standings").select("*")
    .eq("tournament_id", tournamentId)
    .order("points", { ascending: false })
    .order("nrr", { ascending: false });
  if (error) throw error;
  return data as Standing[];
}

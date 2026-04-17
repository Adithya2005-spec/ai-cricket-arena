// POST /functions/v1/start-match
// Body: { team1_id, team2_id, ai_commentary?: boolean, tournament_id?, fixture_id? }
// Initializes a new match: picks openers + first bowler, sets innings=1.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { team1_id, team2_id, ai_commentary = false, tournament_id, fixture_id } = body;
    if (!team1_id || !team2_id) {
      return new Response(JSON.stringify({ error: "team1_id and team2_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Toss: team1 bats first (deterministic, simpler UX)
    const battingTeamId = team1_id;
    const bowlingTeamId = team2_id;

    // Pick openers (batting_order 1, 2) and a strike bowler from bowling team
    const { data: batters } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", battingTeamId)
      .order("batting_order", { ascending: true })
      .limit(2);

    const { data: bowlers } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", bowlingTeamId)
      .in("role", ["bowler", "allrounder"])
      .order("bowling", { ascending: false })
      .limit(1);

    if (!batters || batters.length < 2 || !bowlers || bowlers.length < 1) {
      return new Response(JSON.stringify({ error: "Teams not properly seeded" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        team1_id, team2_id,
        tournament_id: tournament_id ?? null,
        fixture_id: fixture_id ?? null,
        current_innings: 1,
        status: "in_progress",
        batting_team_id: battingTeamId,
        bowling_team_id: bowlingTeamId,
        innings1_batting_team_id: battingTeamId,
        striker_id: batters[0].id,
        non_striker_id: batters[1].id,
        bowler_id: bowlers[0].id,
        ai_commentary,
      })
      .select()
      .single();

    if (error) throw error;

    if (fixture_id) {
      await supabase.from("fixtures").update({ status: "in_progress", match_id: match.id }).eq("id", fixture_id);
    }

    return new Response(JSON.stringify({ match }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("start-match error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

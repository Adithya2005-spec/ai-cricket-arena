// POST /functions/v1/start-tournament
// Body: { name?: string }
// Creates a tournament with all 8 teams, generates round-robin fixtures, initializes standings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name } = await req.json().catch(() => ({}));
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: teams } = await supabase.from("teams").select("*").order("name");
    if (!teams || teams.length < 4) {
      return new Response(JSON.stringify({ error: "Need at least 4 teams" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: t, error } = await supabase.from("tournaments").insert({
      name: name ?? `T20 League ${new Date().toLocaleDateString()}`,
      status: "league",
    }).select().single();
    if (error) throw error;

    // Round-robin: every pair plays once
    const fixtures: any[] = [];
    let order = 1;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        fixtures.push({
          tournament_id: t.id,
          round: "league",
          team1_id: teams[i].id,
          team2_id: teams[j].id,
          scheduled_order: order++,
        });
      }
    }
    await supabase.from("fixtures").insert(fixtures);

    // init standings rows
    const standings = teams.map((tm: any) => ({
      tournament_id: t.id, team_id: tm.id,
    }));
    await supabase.from("standings").insert(standings);

    return new Response(JSON.stringify({ tournament: t, fixtures: fixtures.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("start-tournament error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

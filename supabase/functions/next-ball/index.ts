// POST /functions/v1/next-ball
// Body: { match_id }
// Simulates one ball, updates match state, generates commentary.
// Handles strike rotation, end of over (new bowler), wickets (new batter),
// end of innings, target chase, and match completion + standings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import {
  simulateBall, outcomeRuns, isStrikeRotated, fallbackCommentary,
  overLabel, type PlayerLite, type BallContext,
} from "../_shared/engine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const TOTAL_OVERS = 20;
const TOTAL_BALLS = TOTAL_OVERS * 6;

async function aiCommentary(outcome: string, batsman: string, bowler: string, label: string, ctx: any) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an energetic T20 cricket commentator. Reply with ONE short sentence (max 18 words) for the ball. No stage directions, no quotes." },
          { role: "user", content: `Over ${label}. ${bowler} bowls to ${batsman}. Outcome: ${outcome}. Score ${ctx.score}/${ctx.wickets}. ${ctx.target ? `Chasing ${ctx.target}.` : ""}` },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ? `${label} — ${text}` : null;
  } catch (e) {
    console.error("AI commentary fallback:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { match_id } = await req.json();
    if (!match_id) {
      return new Response(JSON.stringify({ error: "match_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: match, error: mErr } = await supabase.from("matches").select("*").eq("id", match_id).single();
    if (mErr || !match) throw mErr ?? new Error("match not found");
    if (match.status !== "in_progress") {
      return new Response(JSON.stringify({ match, done: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load striker, non_striker, bowler
    const playerIds = [match.striker_id, match.non_striker_id, match.bowler_id].filter(Boolean);
    const { data: ps } = await supabase.from("players").select("*").in("id", playerIds);
    const players = new Map<string, PlayerLite>((ps ?? []).map((p: any) => [p.id, p]));
    const striker = players.get(match.striker_id);
    const nonStriker = players.get(match.non_striker_id);
    const bowler = players.get(match.bowler_id);
    if (!striker || !nonStriker || !bowler) throw new Error("missing players");

    const over = Math.floor(match.balls / 6);
    const ballInOver = match.balls % 6;
    const ctx: BallContext = {
      over, ballInOver, wickets: match.wickets,
      innings: match.current_innings as 1 | 2,
      target: match.target ?? undefined,
      currentScore: match.score,
      ballsRemaining: TOTAL_BALLS - match.balls,
    };

    // SIMULATE
    const outcome = simulateBall(striker, bowler, ctx);
    const runs = outcomeRuns(outcome);
    const isWicket = outcome === "W";
    const newScore = match.score + runs;
    const newWickets = match.wickets + (isWicket ? 1 : 0);
    const newBalls = match.balls + 1;
    const ballNumber = newBalls;
    const label = overLabel(over, ballInOver);

    // BALL LOG
    await supabase.from("balls").insert({
      match_id, innings: match.current_innings, ball_number: ballNumber,
      over_no: over, ball_in_over: ballInOver + 1,
      batsman_id: striker.id, bowler_id: bowler.id,
      outcome, runs, is_wicket: isWicket,
    });

    // COMMENTARY (AI if requested, fallback otherwise)
    let text: string | null = null;
    if (match.ai_commentary) {
      text = await aiCommentary(outcome, striker.name, bowler.name, label, {
        score: newScore, wickets: newWickets, target: match.target,
      });
    }
    if (!text) text = fallbackCommentary(outcome, striker.name, bowler.name, label);

    await supabase.from("commentary").insert({
      match_id, ball_number: ballNumber, over_ball_label: label,
      outcome, runs, is_wicket: isWicket, text,
    });

    // STATE TRANSITIONS
    let newStrikerId = striker.id;
    let newNonStrikerId = nonStriker.id;
    let newBowlerId = bowler.id;
    let endOfOver = (newBalls % 6 === 0);
    let inningsOver = false;
    let matchOver = false;
    let winnerTeamId: string | null = null;
    let winMarginText: string | null = null;

    // Wicket: bring next batter
    if (isWicket) {
      const { data: usedRows } = await supabase
        .from("balls")
        .select("batsman_id")
        .eq("match_id", match_id)
        .eq("innings", match.current_innings);
      const usedIds = new Set((usedRows ?? []).map((r: any) => r.batsman_id));
      usedIds.add(nonStriker.id); // not out batter still in
      const { data: nextBatters } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", match.batting_team_id)
        .order("batting_order", { ascending: true });
      const nextBatter = (nextBatters ?? []).find((p: any) => !usedIds.has(p.id));
      if (nextBatter) {
        newStrikerId = nextBatter.id;
      } else {
        // all out
        inningsOver = true;
      }
    } else if (isStrikeRotated(outcome)) {
      newStrikerId = nonStriker.id;
      newNonStrikerId = striker.id;
    }

    // End of over: swap strike (unless 1/3 already swapped) and pick new bowler
    if (endOfOver && !inningsOver) {
      // swap strike
      const tmp = newStrikerId;
      newStrikerId = newNonStrikerId;
      newNonStrikerId = tmp;
      // pick a different bowler from bowling team
      const { data: bowlerPool } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", match.bowling_team_id)
        .in("role", ["bowler", "allrounder"]);
      const candidates = (bowlerPool ?? []).filter((p: any) => p.id !== bowler.id);
      if (candidates.length > 0) {
        newBowlerId = candidates[Math.floor(Math.random() * candidates.length)].id;
      }
    }

    // All wickets? 10 wickets = innings over
    if (newWickets >= 10) inningsOver = true;
    if (newBalls >= TOTAL_BALLS) inningsOver = true;

    // Chase complete?
    if (match.current_innings === 2 && match.target && newScore >= match.target) {
      inningsOver = true;
      matchOver = true;
      winnerTeamId = match.batting_team_id;
      const wicketsLeft = 10 - newWickets;
      winMarginText = `${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}`;
    }

    // Update match
    const updates: any = {
      score: newScore, wickets: newWickets, balls: newBalls,
      striker_id: newStrikerId, non_striker_id: newNonStrikerId, bowler_id: newBowlerId,
    };

    if (inningsOver) {
      if (match.current_innings === 1) {
        // Switch innings
        updates.innings1_score = newScore;
        updates.innings1_wickets = newWickets;
        updates.innings1_balls = newBalls;
        updates.target = newScore + 1;
        updates.current_innings = 2;
        updates.score = 0;
        updates.wickets = 0;
        updates.balls = 0;
        updates.batting_team_id = match.bowling_team_id;
        updates.bowling_team_id = match.batting_team_id;
        // openers of new batting team
        const { data: ob } = await supabase.from("players").select("*")
          .eq("team_id", match.bowling_team_id).order("batting_order").limit(2);
        // first bowler of new bowling team
        const { data: bb } = await supabase.from("players").select("*")
          .eq("team_id", match.batting_team_id).in("role", ["bowler", "allrounder"])
          .order("bowling", { ascending: false }).limit(1);
        if (ob && ob.length >= 2) {
          updates.striker_id = ob[0].id;
          updates.non_striker_id = ob[1].id;
        }
        if (bb && bb.length >= 1) updates.bowler_id = bb[0].id;
        await supabase.from("commentary").insert({
          match_id, ball_number: ballNumber + 0.5, over_ball_label: "INN",
          outcome: "INN", runs: 0, is_wicket: false,
          text: `End of innings 1. Target: ${newScore + 1}.`,
        });
      } else if (matchOver || match.current_innings === 2) {
        // Innings 2 done — determine result
        if (!winnerTeamId) {
          if (newScore < (match.target ?? 0) - 1) {
            // bowling team won by runs
            winnerTeamId = match.bowling_team_id;
            winMarginText = `${(match.target ?? 0) - 1 - newScore} runs`;
          } else if (newScore === (match.target ?? 0) - 1) {
            // tie — give it to whoever lost fewer wickets, else team1
            winnerTeamId = match.team1_id;
            winMarginText = "tie (super-over skipped)";
          }
        }
        updates.status = "completed";
        updates.winner_team_id = winnerTeamId;
        updates.win_margin_text = winMarginText;
        matchOver = true;
        await supabase.from("commentary").insert({
          match_id, ball_number: ballNumber + 0.5, over_ball_label: "END",
          outcome: "END", runs: 0, is_wicket: false,
          text: `Match over. Winner decided by ${winMarginText ?? "result"}.`,
        });
      }
    }

    const { data: updated } = await supabase.from("matches").update(updates).eq("id", match_id).select().single();

    // If match completed and tied to a fixture/tournament, update standings
    if (matchOver && match.tournament_id) {
      const innings1Team = match.innings1_batting_team_id ?? match.team1_id;
      const innings2Team = match.bowling_team_id; // before switch — original bowling
      // We have: innings1_score/balls and innings2 (current updated.score/balls)
      const i1Score = updated?.innings1_score ?? newScore;
      const i1Balls = updated?.innings1_balls ?? newBalls;
      const i2Score = updated?.score ?? 0;
      const i2Balls = updated?.balls ?? 0;

      // Update both standings rows
      for (const teamId of [match.team1_id, match.team2_id]) {
        const isTeam1 = teamId === innings1Team;
        const teamScore = isTeam1 ? i1Score : i2Score;
        const teamBalls = isTeam1 ? i1Balls : i2Balls;
        const oppScore = isTeam1 ? i2Score : i1Score;
        const oppBalls = isTeam1 ? i2Balls : i1Balls;
        const won = winnerTeamId === teamId;

        const { data: row } = await supabase.from("standings").select("*")
          .eq("tournament_id", match.tournament_id).eq("team_id", teamId).maybeSingle();
        const prev = row ?? {
          played: 0, wins: 0, losses: 0, points: 0,
          runs_for: 0, balls_faced: 0, runs_against: 0, balls_bowled: 0,
        };
        const newRow = {
          tournament_id: match.tournament_id,
          team_id: teamId,
          played: prev.played + 1,
          wins: prev.wins + (won ? 1 : 0),
          losses: prev.losses + (won ? 0 : 1),
          points: prev.points + (won ? 2 : 0),
          runs_for: prev.runs_for + teamScore,
          balls_faced: prev.balls_faced + teamBalls,
          runs_against: prev.runs_against + oppScore,
          balls_bowled: prev.balls_bowled + oppBalls,
          nrr: 0,
        };
        const overs_for = newRow.balls_faced / 6;
        const overs_against = newRow.balls_bowled / 6;
        newRow.nrr = (overs_for > 0 && overs_against > 0)
          ? +(newRow.runs_for / overs_for - newRow.runs_against / overs_against).toFixed(3)
          : 0;
        if (row) {
          await supabase.from("standings").update(newRow).eq("id", row.id);
        } else {
          await supabase.from("standings").insert(newRow);
        }
      }

      if (match.fixture_id) {
        await supabase.from("fixtures").update({ status: "completed", winner_team_id: winnerTeamId }).eq("id", match.fixture_id);
      }
    }

    return new Response(JSON.stringify({ match: updated, outcome, text, matchOver }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("next-ball error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

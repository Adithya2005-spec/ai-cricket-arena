// POST /functions/v1/simulate-tournament
// Body: { tournament_id, mode?: "league" | "playoffs" | "all" | "next" }
// Simulates fixtures fast (in-memory full-match sim), updates standings, generates playoffs after league.
// Does NOT generate ball-by-ball commentary (this is the auto-tournament engine).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import {
  simulateBall, outcomeRuns, isStrikeRotated,
  type PlayerLite, type BallContext,
} from "../_shared/engine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOTAL_BALLS = 120;

interface SimResult {
  i1Score: number; i1Wickets: number; i1Balls: number;
  i2Score: number; i2Wickets: number; i2Balls: number;
  winner: "team1" | "team2";
  margin: string;
}

function pickBowler(pool: PlayerLite[], lastBowlerId: string | null): PlayerLite {
  const candidates = pool.filter(p => p.id !== lastBowlerId);
  const arr = candidates.length ? candidates : pool;
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulateFullMatch(
  team1Players: PlayerLite[],
  team2Players: PlayerLite[],
): SimResult {
  // Innings 1: team1 bats
  const sim = (batting: PlayerLite[], bowling: PlayerLite[], target?: number) => {
    const order = batting.slice().sort((a, b) => 0); // already in order from query
    let strikerIdx = 0, nonStrikerIdx = 1, nextBatter = 2;
    let score = 0, wickets = 0, balls = 0;
    const bowlerPool = bowling.filter(p => p.role !== "wk");
    let lastBowlerId: string | null = null;
    let bowler = pickBowler(bowlerPool, lastBowlerId);

    while (balls < TOTAL_BALLS && wickets < 10) {
      const over = Math.floor(balls / 6);
      const ballInOver = balls % 6;
      const ctx: BallContext = {
        over, ballInOver, wickets,
        innings: target ? 2 : 1,
        target,
        currentScore: score,
        ballsRemaining: TOTAL_BALLS - balls,
      };
      const outcome = simulateBall(order[strikerIdx], bowler, ctx);
      const runs = outcomeRuns(outcome);
      score += runs; balls += 1;
      if (outcome === "W") {
        wickets += 1;
        if (nextBatter < order.length) {
          strikerIdx = nextBatter; nextBatter += 1;
        } else { break; }
      } else if (isStrikeRotated(outcome)) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }
      if (balls % 6 === 0) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
        lastBowlerId = bowler.id;
        bowler = pickBowler(bowlerPool, lastBowlerId);
      }
      if (target && score >= target) break;
    }
    return { score, wickets, balls };
  };

  const inn1 = sim(team1Players, team2Players);
  const inn2 = sim(team2Players, team1Players, inn1.score + 1);

  let winner: "team1" | "team2";
  let margin: string;
  if (inn2.score >= inn1.score + 1) {
    winner = "team2";
    margin = `${10 - inn2.wickets} wicket${10 - inn2.wickets === 1 ? "" : "s"}`;
  } else {
    winner = "team1";
    margin = `${inn1.score - inn2.score} runs`;
  }

  return {
    i1Score: inn1.score, i1Wickets: inn1.wickets, i1Balls: inn1.balls,
    i2Score: inn2.score, i2Wickets: inn2.wickets, i2Balls: inn2.balls,
    winner, margin,
  };
}

async function applyResultToStandings(
  supabase: any, tournament_id: string,
  team1_id: string, team2_id: string,
  res: SimResult,
) {
  const apply = async (teamId: string, isTeam1: boolean) => {
    const teamScore = isTeam1 ? res.i1Score : res.i2Score;
    const teamBalls = isTeam1 ? res.i1Balls : res.i2Balls;
    const oppScore = isTeam1 ? res.i2Score : res.i1Score;
    const oppBalls = isTeam1 ? res.i2Balls : res.i1Balls;
    const won = (isTeam1 && res.winner === "team1") || (!isTeam1 && res.winner === "team2");

    const { data: row } = await supabase.from("standings").select("*")
      .eq("tournament_id", tournament_id).eq("team_id", teamId).maybeSingle();
    const prev = row ?? {
      played: 0, wins: 0, losses: 0, points: 0,
      runs_for: 0, balls_faced: 0, runs_against: 0, balls_bowled: 0,
    };
    const newRow = {
      tournament_id, team_id: teamId,
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
      ? +(newRow.runs_for / overs_for - newRow.runs_against / overs_against).toFixed(3) : 0;
    if (row) await supabase.from("standings").update(newRow).eq("id", row.id);
    else await supabase.from("standings").insert(newRow);
  };
  await apply(team1_id, true);
  await apply(team2_id, false);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tournament_id, mode = "all" } = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Cache players per team
    const playerCache = new Map<string, PlayerLite[]>();
    async function getTeamPlayers(teamId: string): Promise<PlayerLite[]> {
      if (playerCache.has(teamId)) return playerCache.get(teamId)!;
      const { data } = await supabase.from("players").select("*").eq("team_id", teamId).order("batting_order");
      playerCache.set(teamId, (data ?? []) as PlayerLite[]);
      return (data ?? []) as PlayerLite[];
    }

    const simFixture = async (fx: any) => {
      const t1p = await getTeamPlayers(fx.team1_id);
      const t2p = await getTeamPlayers(fx.team2_id);
      const res = simulateFullMatch(t1p, t2p);
      const winnerTeamId = res.winner === "team1" ? fx.team1_id : fx.team2_id;
      // Insert a completed match record (no commentary, no ball log — fast path)
      const { data: m } = await supabase.from("matches").insert({
        tournament_id, fixture_id: fx.id,
        team1_id: fx.team1_id, team2_id: fx.team2_id,
        current_innings: 2, target: res.i1Score + 1, status: "completed",
        batting_team_id: fx.team2_id, bowling_team_id: fx.team1_id,
        innings1_batting_team_id: fx.team1_id,
        innings1_score: res.i1Score, innings1_wickets: res.i1Wickets, innings1_balls: res.i1Balls,
        score: res.i2Score, wickets: res.i2Wickets, balls: res.i2Balls,
        winner_team_id: winnerTeamId, win_margin_text: res.margin,
      }).select().single();
      await supabase.from("fixtures").update({
        status: "completed", winner_team_id: winnerTeamId, match_id: m?.id ?? null,
      }).eq("id", fx.id);
      await applyResultToStandings(supabase, tournament_id, fx.team1_id, fx.team2_id, res);
    };

    // 1. Simulate all remaining LEAGUE fixtures
    if (mode === "all" || mode === "league" || mode === "next") {
      const { data: leagueFx } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "league").eq("status", "scheduled")
        .order("scheduled_order");
      const toSim = mode === "next" ? (leagueFx ?? []).slice(0, 1) : (leagueFx ?? []);
      for (const fx of toSim) await simFixture(fx);
    }

    // 2. If league fully done and no playoffs yet, generate playoffs
    if (mode === "all" || mode === "playoffs") {
      const { count: remainingLeague } = await supabase.from("fixtures").select("*", { count: "exact", head: true })
        .eq("tournament_id", tournament_id).eq("round", "league").eq("status", "scheduled");

      const { data: existingPlayoffs } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).neq("round", "league");

      if ((remainingLeague ?? 0) === 0 && (!existingPlayoffs || existingPlayoffs.length === 0)) {
        // Generate Q1, Eliminator
        const { data: standings } = await supabase.from("standings").select("*")
          .eq("tournament_id", tournament_id)
          .order("points", { ascending: false })
          .order("nrr", { ascending: false });
        const top4 = (standings ?? []).slice(0, 4);
        if (top4.length === 4) {
          await supabase.from("tournaments").update({ status: "playoffs" }).eq("id", tournament_id);
          await supabase.from("fixtures").insert([
            { tournament_id, round: "qualifier1", team1_id: top4[0].team_id, team2_id: top4[1].team_id, scheduled_order: 1000 },
            { tournament_id, round: "eliminator", team1_id: top4[2].team_id, team2_id: top4[3].team_id, scheduled_order: 1001 },
          ]);
        }
      }

      // Sim Q1 + Eliminator
      const { data: q1AndElim } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).in("round", ["qualifier1", "eliminator"]).eq("status", "scheduled");
      for (const fx of (q1AndElim ?? [])) await simFixture(fx);

      // After Q1 + Elim, if both done and no Q2/Final, generate
      const { data: q1Done } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "qualifier1").eq("status", "completed").maybeSingle();
      const { data: elimDone } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "eliminator").eq("status", "completed").maybeSingle();
      const { data: existingQ2 } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "qualifier2").maybeSingle();

      if (q1Done && elimDone && !existingQ2) {
        // Q2: loser of Q1 vs winner of Elim
        const q1LoserId = q1Done.winner_team_id === q1Done.team1_id ? q1Done.team2_id : q1Done.team1_id;
        await supabase.from("fixtures").insert({
          tournament_id, round: "qualifier2",
          team1_id: q1LoserId, team2_id: elimDone.winner_team_id, scheduled_order: 1002,
        });
      }

      const { data: q2Pending } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "qualifier2").eq("status", "scheduled").maybeSingle();
      if (q2Pending) await simFixture(q2Pending);

      const { data: q2Done } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "qualifier2").eq("status", "completed").maybeSingle();
      const { data: existingFinal } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "final").maybeSingle();
      if (q1Done && q2Done && !existingFinal) {
        await supabase.from("fixtures").insert({
          tournament_id, round: "final",
          team1_id: q1Done.winner_team_id, team2_id: q2Done.winner_team_id, scheduled_order: 1003,
        });
      }

      const { data: finalPending } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "final").eq("status", "scheduled").maybeSingle();
      if (finalPending) await simFixture(finalPending);

      const { data: finalDone } = await supabase.from("fixtures").select("*")
        .eq("tournament_id", tournament_id).eq("round", "final").eq("status", "completed").maybeSingle();
      if (finalDone) {
        await supabase.from("tournaments").update({
          status: "completed", winner_team_id: finalDone.winner_team_id,
        }).eq("id", tournament_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-tournament error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

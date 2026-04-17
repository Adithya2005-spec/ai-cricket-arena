// Cricket match engine — shared logic for all edge functions.
// Pure functions, no I/O. Importable from any function.

export type Outcome = "0" | "1" | "2" | "3" | "4" | "6" | "W";

export interface PlayerLite {
  id: string;
  name: string;
  batting: number;
  bowling: number;
  form: number;
  aggression: number;
  vs_spin: number;
  vs_pace: number;
  bowler_type: "pace" | "spin" | "none";
  role: string;
}

export interface BallContext {
  over: number;          // 0..19
  ballInOver: number;    // 0..5 (next ball index)
  wickets: number;
  innings: 1 | 2;
  target?: number;       // total to chase (innings 2)
  currentScore: number;
  ballsRemaining: number; // in this innings
}

// Phase weighting: powerplay (0-5), middle (6-14), death (15-19)
function phase(over: number): "pp" | "mid" | "death" {
  if (over < 6) return "pp";
  if (over < 15) return "mid";
  return "death";
}

/**
 * Core ball simulation.
 * Computes batter advantage vs bowler, adjusts for matchup + phase + pressure,
 * then samples a weighted outcome.
 */
export function simulateBall(
  batsman: PlayerLite,
  bowler: PlayerLite,
  ctx: BallContext,
  rng: () => number = Math.random,
): Outcome {
  // 1. base advantage: batter quality vs bowler quality (form-adjusted)
  const batRating = batsman.batting * 0.6 + batsman.form * 0.4;
  const bowlRating = bowler.bowling * 0.7 + bowler.form * 0.3;
  let advantage = batRating - bowlRating; // -100..100, usually -30..30

  // 2. matchup: vs_spin / vs_pace
  if (bowler.bowler_type === "spin") {
    advantage += (batsman.vs_spin - 65) * 0.3;
  } else if (bowler.bowler_type === "pace") {
    advantage += (batsman.vs_pace - 65) * 0.3;
  }

  // 3. phase modifier
  const ph = phase(ctx.over);
  let aggressionBoost = 0;
  if (ph === "pp") {
    aggressionBoost = 5; // fielding restrictions
  } else if (ph === "death") {
    aggressionBoost = (batsman.aggression - 60) * 0.35 + 8;
  } else {
    aggressionBoost = -2;
  }

  // 4. chase pressure (innings 2)
  if (ctx.innings === 2 && ctx.target !== undefined) {
    const need = ctx.target - ctx.currentScore;
    const reqRR = ctx.ballsRemaining > 0 ? (need / ctx.ballsRemaining) * 6 : 36;
    if (reqRR > 12) aggressionBoost += 6; // forced to swing
    if (reqRR > 15) aggressionBoost += 6;
  }

  // 5. wickets pressure
  if (ctx.wickets >= 7) aggressionBoost -= 6;

  // 6. Build outcome weights (base for an average matchup)
  // Distribution sums roughly to 100.
  const base: Record<Outcome, number> = {
    "0": 34, "1": 30, "2": 8, "3": 1, "4": 12, "6": 5, "W": 10,
  };

  // Skew based on advantage + aggression
  const a = advantage + aggressionBoost; // total signal

  // Positive a -> more boundaries, fewer wickets/dots
  // Negative a -> more dots and wickets
  const skew = Math.max(-25, Math.min(25, a));
  const weights: Record<Outcome, number> = {
    "0": Math.max(2, base["0"] - skew * 0.6),
    "1": base["1"] + skew * 0.05,
    "2": base["2"] + skew * 0.1,
    "3": base["3"],
    "4": Math.max(2, base["4"] + skew * 0.5),
    "6": Math.max(1, base["6"] + skew * 0.35),
    "W": Math.max(1.5, base["W"] - skew * 0.45),
  };

  // 7. Sample weighted
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  let r = rng() * total;
  for (const [k, v] of Object.entries(weights) as [Outcome, number][]) {
    r -= v;
    if (r <= 0) return k;
  }
  return "0";
}

export function outcomeRuns(o: Outcome): number {
  if (o === "W") return 0;
  return parseInt(o, 10);
}

export function isStrikeRotated(o: Outcome): boolean {
  if (o === "W") return false;
  const n = parseInt(o, 10);
  return n === 1 || n === 3;
}

export function fallbackCommentary(
  o: Outcome,
  batsman: string,
  bowler: string,
  overLabel: string,
): string {
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  switch (o) {
    case "0":
      return pick([
        `${overLabel} — ${bowler} keeps it tight, ${batsman} can't get it away. Dot ball.`,
        `${overLabel} — Defended back to the bowler. No run.`,
        `${overLabel} — Beaten! ${batsman} swings and misses.`,
      ]);
    case "1":
      return pick([
        `${overLabel} — Worked into the gap, ${batsman} jogs through for a single.`,
        `${overLabel} — Tucked away to leg, easy single.`,
      ]);
    case "2":
      return pick([
        `${overLabel} — Driven into the gap, they come back for two.`,
        `${overLabel} — Pushed wide of mid-on, two runs.`,
      ]);
    case "3":
      return `${overLabel} — Three runs! Great running between the wickets.`;
    case "4":
      return pick([
        `${overLabel} — FOUR! ${batsman} times it beautifully through the covers!`,
        `${overLabel} — Cracked away! That races to the boundary. FOUR runs.`,
        `${overLabel} — Glorious shot! All along the carpet for FOUR.`,
      ]);
    case "6":
      return pick([
        `${overLabel} — SIX! ${batsman} launches ${bowler} over long-on!`,
        `${overLabel} — Massive! Out of the ground. SIX runs!`,
        `${overLabel} — Picked the length early and dispatched. SIX!`,
      ]);
    case "W":
      return pick([
        `${overLabel} — OUT! Huge wicket! ${bowler} gets ${batsman}!`,
        `${overLabel} — GONE! ${batsman} departs. Massive blow.`,
        `${overLabel} — Castled! ${bowler} strikes!`,
      ]);
  }
}

export function overLabel(over: number, ballInOver: number): string {
  return `${over}.${ballInOver + 1}`;
}

import type { Match, Team } from "@/types/cricket";

interface Props {
  match: Match;
  teams: Map<string, Team>;
}

// Crude but useful win probability.
// Innings 1: based on projected score + team strengths.
// Innings 2: based on required RR vs available resources (balls + wickets).
export function WinProbability({ match, teams }: Props) {
  if (match.status !== "in_progress") return null;

  const t1 = teams.get(match.team1_id);
  const t2 = teams.get(match.team2_id);
  if (!t1 || !t2) return null;

  let p1: number; // probability team1 wins (0..1)

  if (match.current_innings === 1) {
    const projected = match.balls > 0 ? (match.score / match.balls) * 120 : 160;
    const strengthBias = (t1.strength - t2.strength) * 0.005;
    const battingFirstBias = match.batting_team_id === match.team1_id ? 0.02 : -0.02;
    // Higher projection -> better odds for batting team
    const projWeight = (projected - 160) * 0.0035;
    const battingTeamWinChance = 0.5 + projWeight + strengthBias * (match.batting_team_id === t1.id ? 1 : -1) + battingFirstBias;
    const battingTeamId = match.batting_team_id;
    p1 = battingTeamId === t1.id ? battingTeamWinChance : 1 - battingTeamWinChance;
  } else {
    const target = match.target ?? 0;
    const need = target - match.score;
    const ballsLeft = 120 - match.balls;
    const wktsLeft = 10 - match.wickets;
    if (need <= 0) {
      p1 = match.batting_team_id === t1.id ? 1 : 0;
    } else if (ballsLeft <= 0 || wktsLeft <= 0) {
      p1 = match.batting_team_id === t1.id ? 0 : 1;
    } else {
      const reqRR = (need / ballsLeft) * 6;
      // Expected sustainable RR ~ 8 + wickets_in_hand factor
      const sustainable = 7 + wktsLeft * 0.4;
      // Logistic-ish: closer reqRR is to sustainable, ~50%
      const diff = sustainable - reqRR; // positive = batting team favored
      const battingTeamWinChance = 1 / (1 + Math.exp(-diff * 0.4));
      p1 = match.batting_team_id === t1.id ? battingTeamWinChance : 1 - battingTeamWinChance;
    }
  }

  p1 = Math.max(0.02, Math.min(0.98, p1));
  const p2 = 1 - p1;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win Probability</div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full transition-all" style={{ width: `${p1 * 100}%`, backgroundColor: t1.color }} />
        <div className="h-full transition-all" style={{ width: `${p2 * 100}%`, backgroundColor: t2.color }} />
      </div>
      <div className="flex justify-between text-xs">
        <span><span className="font-semibold">{t1.short_name}</span> {Math.round(p1 * 100)}%</span>
        <span>{Math.round(p2 * 100)}% <span className="font-semibold">{t2.short_name}</span></span>
      </div>
    </div>
  );
}

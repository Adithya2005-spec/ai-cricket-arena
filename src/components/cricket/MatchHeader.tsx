import type { Match, Team } from "@/types/cricket";
import { cn } from "@/lib/utils";

interface Props {
  match: Match;
  teams: Map<string, Team>;
}

function oversFromBalls(b: number): string {
  return `${Math.floor(b / 6)}.${b % 6}`;
}

function runRate(score: number, balls: number) {
  if (balls === 0) return "0.00";
  return ((score / balls) * 6).toFixed(2);
}

// Cricbuzz-style match header: team names, score, overs, run rate, target.
export function MatchHeader({ match, teams }: Props) {
  const battingTeam = match.batting_team_id ? teams.get(match.batting_team_id) : null;
  const bowlingTeam = match.bowling_team_id ? teams.get(match.bowling_team_id) : null;
  const t1 = teams.get(match.team1_id);
  const t2 = teams.get(match.team2_id);

  const live = match.status === "in_progress";
  const target = match.target;
  const ballsRemaining = 120 - match.balls;
  const runsNeeded = target ? target - match.score : null;
  const reqRR = target && ballsRemaining > 0 ? ((runsNeeded! / ballsRemaining) * 6).toFixed(2) : null;

  return (
    <div className="rounded-2xl border border-border gradient-card shadow-card overflow-hidden">
      <div className="gradient-hero px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {live && (
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" /> Live
            </span>
          )}
          {match.status === "completed" && (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result</span>
          )}
          {match.status === "not_started" && (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</span>
          )}
          <span className="text-xs text-muted-foreground">T20</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Innings {match.current_innings} / 2
        </span>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className={cn(
              "flex items-center gap-2 mb-1",
              battingTeam?.id === t1?.id ? "" : "opacity-60",
            )}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t1?.color }} />
              <span className="font-semibold truncate">{t1?.name}</span>
            </div>
            <ScoreLine
              isCurrent={battingTeam?.id === t1?.id && match.status === "in_progress"}
              score={
                match.innings1_batting_team_id === t1?.id
                  ? (match.current_innings === 2 ? `${match.innings1_score}/${match.innings1_wickets}` : `${match.score}/${match.wickets}`)
                  : (match.current_innings === 2 ? `${match.score}/${match.wickets}` : "yet to bat")
              }
              overs={
                match.innings1_batting_team_id === t1?.id
                  ? (match.current_innings === 2 ? oversFromBalls(match.innings1_balls ?? 0) : oversFromBalls(match.balls))
                  : (match.current_innings === 2 ? oversFromBalls(match.balls) : "")
              }
            />
          </div>
          <div className="text-muted-foreground text-sm pt-2">vs</div>
          <div className="flex-1 min-w-0 text-right">
            <div className={cn(
              "flex items-center gap-2 mb-1 justify-end",
              battingTeam?.id === t2?.id ? "" : "opacity-60",
            )}>
              <span className="font-semibold truncate">{t2?.name}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t2?.color }} />
            </div>
            <ScoreLine
              align="right"
              isCurrent={battingTeam?.id === t2?.id && match.status === "in_progress"}
              score={
                match.innings1_batting_team_id === t2?.id
                  ? (match.current_innings === 2 ? `${match.innings1_score}/${match.innings1_wickets}` : `${match.score}/${match.wickets}`)
                  : (match.current_innings === 2 ? `${match.score}/${match.wickets}` : "yet to bat")
              }
              overs={
                match.innings1_batting_team_id === t2?.id
                  ? (match.current_innings === 2 ? oversFromBalls(match.innings1_balls ?? 0) : oversFromBalls(match.balls))
                  : (match.current_innings === 2 ? oversFromBalls(match.balls) : "")
              }
            />
          </div>
        </div>

        {match.status === "in_progress" && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-xs">
            <Stat label="CRR" value={runRate(match.score, match.balls)} />
            {target && reqRR && (
              <Stat label="REQ RR" value={reqRR} highlight />
            )}
            {target && (
              <Stat label="Target" value={`${target}`} />
            )}
            {!target && <Stat label="Overs" value={oversFromBalls(match.balls)} />}
          </div>
        )}

        {match.status === "completed" && match.winner_team_id && (
          <div className="text-center text-sm pt-3 border-t border-border">
            <span className="font-semibold text-primary">{teams.get(match.winner_team_id)?.name}</span>{" "}
            <span className="text-muted-foreground">won by</span>{" "}
            <span className="font-semibold">{match.win_margin_text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreLine({ score, overs, align, isCurrent }: { score: string; overs: string; align?: "right"; isCurrent?: boolean }) {
  return (
    <div className={cn("space-y-0.5", align === "right" && "text-right")}>
      <div className={cn("font-display text-3xl font-bold tabular-nums", isCurrent && "text-primary")}>{score}</div>
      {overs && <div className="text-xs text-muted-foreground tabular-nums">({overs} ov)</div>}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground uppercase text-[10px] tracking-wider">{label}</span>
      <span className={cn("font-semibold tabular-nums text-sm", highlight && "text-accent")}>{value}</span>
    </div>
  );
}

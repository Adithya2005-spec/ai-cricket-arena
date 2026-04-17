// Domain types shared across the cricket frontend.
export type Outcome = "0" | "1" | "2" | "3" | "4" | "6" | "W" | "INN" | "END";

export interface Team {
  id: string;
  name: string;
  short_name: string;
  color: string;
  strength: number;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  role: "batter" | "bowler" | "allrounder" | "wk";
  batting: number;
  bowling: number;
  form: number;
  bowler_type: "pace" | "spin" | "none";
  batting_order: number;
}

export interface Match {
  id: string;
  tournament_id: string | null;
  fixture_id: string | null;
  team1_id: string;
  team2_id: string;
  current_innings: number;
  target: number | null;
  status: "not_started" | "in_progress" | "completed";
  batting_team_id: string | null;
  bowling_team_id: string | null;
  score: number;
  wickets: number;
  balls: number;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  innings1_score: number | null;
  innings1_wickets: number | null;
  innings1_balls: number | null;
  innings1_batting_team_id: string | null;
  winner_team_id: string | null;
  win_margin_text: string | null;
  ai_commentary: boolean;
}

export interface CommentaryEntry {
  id: string;
  match_id: string;
  ball_number: number;
  over_ball_label: string;
  outcome: string;
  runs: number;
  is_wicket: boolean;
  text: string;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  status: "upcoming" | "league" | "playoffs" | "completed";
  winner_team_id: string | null;
  created_at: string;
}

export interface Fixture {
  id: string;
  tournament_id: string;
  round: "league" | "qualifier1" | "eliminator" | "qualifier2" | "final";
  team1_id: string;
  team2_id: string;
  match_id: string | null;
  status: "scheduled" | "in_progress" | "completed";
  scheduled_order: number;
  winner_team_id: string | null;
}

export interface Standing {
  id: string;
  tournament_id: string;
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  runs_for: number;
  balls_faced: number;
  runs_against: number;
  balls_bowled: number;
  nrr: number;
}

-- =========================================================
-- CRICKET PLATFORM SCHEMA
-- =========================================================

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  strength INT NOT NULL DEFAULT 75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('batter','bowler','allrounder','wk')),
  batting INT NOT NULL DEFAULT 50,
  bowling INT NOT NULL DEFAULT 50,
  form INT NOT NULL DEFAULT 70,
  aggression INT NOT NULL DEFAULT 60,
  vs_spin INT NOT NULL DEFAULT 60,
  vs_pace INT NOT NULL DEFAULT 60,
  bowler_type TEXT NOT NULL DEFAULT 'pace' CHECK (bowler_type IN ('pace','spin','none')),
  batting_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','league','playoffs','completed')),
  winner_team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  fixture_id UUID,
  team1_id UUID NOT NULL REFERENCES public.teams(id),
  team2_id UUID NOT NULL REFERENCES public.teams(id),
  current_innings INT NOT NULL DEFAULT 1,
  target INT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  batting_team_id UUID REFERENCES public.teams(id),
  bowling_team_id UUID REFERENCES public.teams(id),
  score INT NOT NULL DEFAULT 0,
  wickets INT NOT NULL DEFAULT 0,
  balls INT NOT NULL DEFAULT 0,
  striker_id UUID REFERENCES public.players(id),
  non_striker_id UUID REFERENCES public.players(id),
  bowler_id UUID REFERENCES public.players(id),
  innings1_score INT,
  innings1_wickets INT,
  innings1_balls INT,
  innings1_batting_team_id UUID REFERENCES public.teams(id),
  winner_team_id UUID REFERENCES public.teams(id),
  win_margin_text TEXT,
  ai_commentary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round TEXT NOT NULL DEFAULT 'league' CHECK (round IN ('league','qualifier1','eliminator','qualifier2','final')),
  team1_id UUID NOT NULL REFERENCES public.teams(id),
  team2_id UUID NOT NULL REFERENCES public.teams(id),
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed')),
  scheduled_order INT NOT NULL DEFAULT 0,
  winner_team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  played INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  runs_for INT NOT NULL DEFAULT 0,
  balls_faced INT NOT NULL DEFAULT 0,
  runs_against INT NOT NULL DEFAULT 0,
  balls_bowled INT NOT NULL DEFAULT 0,
  nrr NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(tournament_id, team_id)
);

CREATE TABLE public.commentary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  ball_number INT NOT NULL,
  over_ball_label TEXT NOT NULL,
  outcome TEXT NOT NULL,
  runs INT NOT NULL DEFAULT 0,
  is_wicket BOOLEAN NOT NULL DEFAULT false,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commentary_match ON public.commentary(match_id, ball_number DESC);

CREATE TABLE public.balls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings INT NOT NULL,
  ball_number INT NOT NULL,
  over_no INT NOT NULL,
  ball_in_over INT NOT NULL,
  batsman_id UUID REFERENCES public.players(id),
  bowler_id UUID REFERENCES public.players(id),
  outcome TEXT NOT NULL,
  runs INT NOT NULL DEFAULT 0,
  is_wicket BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_balls_match ON public.balls(match_id, ball_number);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS - public access (demo cricket platform, no auth)
-- =========================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balls ENABLE ROW LEVEL SECURITY;

-- Public read on everything
CREATE POLICY "public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "public read fixtures" ON public.fixtures FOR SELECT USING (true);
CREATE POLICY "public read standings" ON public.standings FOR SELECT USING (true);
CREATE POLICY "public read commentary" ON public.commentary FOR SELECT USING (true);
CREATE POLICY "public read balls" ON public.balls FOR SELECT USING (true);

-- Public write (demo). Edge functions use service-role anyway.
CREATE POLICY "public write teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write fixtures" ON public.fixtures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write standings" ON public.standings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write commentary" ON public.commentary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public write balls" ON public.balls FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commentary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.standings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;

-- =========================================================
-- SEED: 8 teams x 11 players
-- =========================================================
DO $$
DECLARE
  t_id UUID;
  team_def RECORD;
  player_def RECORD;
  ord INT;
BEGIN
  FOR team_def IN
    SELECT * FROM (VALUES
      ('Mumbai Mavericks',     'MUM', '#0ea5e9', 86),
      ('Delhi Dynamos',        'DEL', '#ef4444', 82),
      ('Chennai Chargers',     'CHE', '#eab308', 84),
      ('Bangalore Blasters',   'BAN', '#dc2626', 80),
      ('Kolkata Knights',      'KOL', '#7c3aed', 81),
      ('Hyderabad Hurricanes', 'HYD', '#f97316', 78),
      ('Punjab Panthers',      'PUN', '#e11d48', 77),
      ('Rajasthan Royals',     'RAJ', '#ec4899', 79)
    ) AS x(name, short_name, color, strength)
  LOOP
    INSERT INTO public.teams(name, short_name, color, strength)
    VALUES (team_def.name, team_def.short_name, team_def.color, team_def.strength)
    RETURNING id INTO t_id;

    ord := 1;
    FOR player_def IN
      SELECT * FROM (VALUES
        -- name, role, batting, bowling, vs_spin, vs_pace, btype, aggression
        ('Opener A',     'batter',     85, 30, 78, 82, 'none', 70),
        ('Opener B',     'batter',     82, 28, 80, 78, 'none', 65),
        ('No. 3',        'batter',     88, 35, 82, 85, 'none', 72),
        ('No. 4',        'batter',     80, 40, 75, 80, 'none', 78),
        ('Captain AR',   'allrounder', 78, 75, 76, 78, 'pace', 80),
        ('Finisher',     'batter',     76, 30, 72, 75, 'none', 88),
        ('WK Keeper',    'wk',         74, 20, 74, 72, 'none', 70),
        ('Spin AR',      'allrounder', 60, 80, 70, 70, 'spin', 65),
        ('Pace 1',       'bowler',     30, 88, 50, 50, 'pace', 50),
        ('Pace 2',       'bowler',     28, 86, 50, 50, 'pace', 50),
        ('Mystery Spin', 'bowler',     25, 90, 50, 50, 'spin', 50)
      ) AS p(name, role, batting, bowling, vs_spin, vs_pace, btype, aggression)
    LOOP
      INSERT INTO public.players(team_id, name, role, batting, bowling, form, aggression, vs_spin, vs_pace, bowler_type, batting_order)
      VALUES (
        t_id,
        team_def.short_name || ' ' || player_def.name,
        player_def.role,
        player_def.batting,
        player_def.bowling,
        60 + floor(random() * 30)::int,
        player_def.aggression,
        player_def.vs_spin,
        player_def.vs_pace,
        player_def.btype,
        ord
      );
      ord := ord + 1;
    END LOOP;
  END LOOP;
END $$;
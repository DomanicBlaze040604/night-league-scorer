-- Night League Scorer - Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE tournament_format AS ENUM ('ROUND_ROBIN', 'KNOCKOUT', 'ROUND_ROBIN_KNOCKOUT');
CREATE TYPE tournament_status AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'TOSS', 'LIVE', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED', 'NO_RESULT');
CREATE TYPE innings_status AS ENUM ('NOT_STARTED', 'LIVE', 'COMPLETED');
CREATE TYPE wicket_type AS ENUM ('BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_OUT', 'RETIRED_HURT');
CREATE TYPE extra_type AS ENUM ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE');
CREATE TYPE user_role AS ENUM ('ADMIN', 'SCORER', 'CAPTAIN', 'VIEWER');

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE tournaments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  format tournament_format DEFAULT 'ROUND_ROBIN_KNOCKOUT',
  status tournament_status DEFAULT 'UPCOMING',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  overs INTEGER DEFAULT 4,
  location TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#22c55e',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tournament_teams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  captain_id TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

CREATE TABLE players (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_no INTEGER,
  photo_url TEXT,
  role TEXT,
  batting_style TEXT,
  bowling_style TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  home_team_id TEXT NOT NULL REFERENCES teams(id),
  away_team_id TEXT NOT NULL REFERENCES teams(id),
  venue TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  overs INTEGER DEFAULT 4,
  status match_status DEFAULT 'SCHEDULED',
  toss_winner_id TEXT,
  toss_choice TEXT,
  winner_team_id TEXT REFERENCES teams(id),
  result_text TEXT,
  win_margin INTEGER,
  win_type TEXT,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE innings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  batting_team_id TEXT NOT NULL REFERENCES teams(id),
  innings_no INTEGER NOT NULL,
  status innings_status DEFAULT 'NOT_STARTED',
  total_runs INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_overs FLOAT DEFAULT 0,
  total_balls INTEGER DEFAULT 0,
  extras INTEGER DEFAULT 0,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  byes INTEGER DEFAULT 0,
  leg_byes INTEGER DEFAULT 0,
  target_runs INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, innings_no)
);

CREATE TABLE overs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  innings_id TEXT NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  over_no INTEGER NOT NULL,
  bowler_id TEXT REFERENCES players(id),
  runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  is_maiden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(innings_id, over_no)
);

CREATE TABLE balls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  innings_id TEXT NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  over_id TEXT NOT NULL REFERENCES overs(id) ON DELETE CASCADE,
  over_no INTEGER NOT NULL,
  ball_no INTEGER NOT NULL,
  total_ball_no INTEGER NOT NULL,
  batsman_id TEXT NOT NULL REFERENCES players(id),
  bowler_id TEXT NOT NULL REFERENCES players(id),
  fielder1_id TEXT REFERENCES players(id),
  runs INTEGER DEFAULT 0,
  extras INTEGER DEFAULT 0,
  extra_type extra_type,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type wicket_type,
  dismissed_batsman_id TEXT,
  is_boundary BOOLEAN DEFAULT false,
  is_six BOOLEAN DEFAULT false,
  is_legal_delivery BOOLEAN DEFAULT true,
  is_free_hit BOOLEAN DEFAULT false,
  commentary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE batting_innings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  innings_id TEXT NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id),
  runs INTEGER DEFAULT 0,
  balls INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  strike_rate FLOAT DEFAULT 0,
  is_out BOOLEAN DEFAULT false,
  wicket_type wicket_type,
  bowler_id TEXT,
  fielder_id TEXT,
  batting_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(innings_id, player_id)
);

CREATE TABLE bowling_spells (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  innings_id TEXT NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id),
  overs FLOAT DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  economy FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(innings_id, player_id)
);

CREATE TABLE partnerships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  innings_id TEXT NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  batsman1_id TEXT NOT NULL REFERENCES players(id),
  batsman2_id TEXT NOT NULL REFERENCES players(id),
  runs INTEGER DEFAULT 0,
  balls INTEGER DEFAULT 0,
  wicket_no INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE fall_of_wickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  innings_id TEXT NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  wicket_no INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  runs INTEGER NOT NULL,
  over_no FLOAT NOT NULL,
  wicket_type wicket_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE batting_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id TEXT,
  matches INTEGER DEFAULT 0,
  innings INTEGER DEFAULT 0,
  not_outs INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  balls INTEGER DEFAULT 0,
  high_score INTEGER DEFAULT 0,
  average FLOAT DEFAULT 0,
  strike_rate FLOAT DEFAULT 0,
  fifties INTEGER DEFAULT 0,
  hundreds INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  ducks INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

CREATE TABLE bowling_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id TEXT,
  matches INTEGER DEFAULT 0,
  innings INTEGER DEFAULT 0,
  overs FLOAT DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  best_figures_w INTEGER DEFAULT 0,
  best_figures_r INTEGER DEFAULT 0,
  average FLOAT DEFAULT 0,
  economy FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

CREATE TABLE fielding_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id TEXT,
  catches INTEGER DEFAULT 0,
  run_outs INTEGER DEFAULT 0,
  stumpings INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

CREATE TABLE points_table (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  tied INTEGER DEFAULT 0,
  no_result INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  runs_for INTEGER DEFAULT 0,
  overs_for FLOAT DEFAULT 0,
  runs_against INTEGER DEFAULT 0,
  overs_against FLOAT DEFAULT 0,
  nrr FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

CREATE TABLE awards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  value FLOAT DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, type)
);

CREATE TABLE commentary (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  over_no FLOAT NOT NULL,
  ball_no INTEGER NOT NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'BALL',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role user_role DEFAULT 'VIEWER',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_innings_match ON innings(match_id);
CREATE INDEX idx_balls_innings ON balls(innings_id);
CREATE INDEX idx_balls_over ON balls(over_id);
CREATE INDEX idx_overs_innings ON overs(innings_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_points_table_tournament ON points_table(tournament_id);
CREATE INDEX idx_batting_stats_tournament ON batting_stats(tournament_id);
CREATE INDEX idx_bowling_stats_tournament ON bowling_stats(tournament_id);
CREATE INDEX idx_commentary_match ON commentary(match_id);

-- ─── Updated At Trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_innings_updated BEFORE UPDATE ON innings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_batting_innings_updated BEFORE UPDATE ON batting_innings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bowling_spells_updated BEFORE UPDATE ON bowling_spells FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Enable Realtime ──────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE innings;
ALTER PUBLICATION supabase_realtime ADD TABLE balls;
ALTER PUBLICATION supabase_realtime ADD TABLE overs;
ALTER PUBLICATION supabase_realtime ADD TABLE batting_innings;
ALTER PUBLICATION supabase_realtime ADD TABLE bowling_spells;
ALTER PUBLICATION supabase_realtime ADD TABLE commentary;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE points_table;

-- Night Premier League - Seed Data
-- Run this AFTER the schema SQL

-- ─── Teams ───────────────────────────────────────────────────────────────────

INSERT INTO teams (id, name, short_name, primary_color) VALUES
('team_ruku', 'Ruku 11', 'RUK', '#22c55e'),
('team_iddress', 'Iddress 11', 'IDD', '#3b82f6'),
('team_ayyub', 'Ayyub 11', 'AYB', '#f59e0b'),
('team_rehan', 'Rehan 11', 'REH', '#ef4444');

-- ─── Tournament ───────────────────────────────────────────────────────────────

INSERT INTO tournaments (id, name, slug, description, format, status, start_date, overs, location) VALUES
('tournament_npl', 'Night Premier League', 'night-premier-league',
 'Local night cricket tournament with 4 teams in round robin format with a grand final.',
 'ROUND_ROBIN_KNOCKOUT', 'ACTIVE', '2026-05-09 22:00:00+05:30', 4, 'Local Ground');

-- ─── Tournament Teams ─────────────────────────────────────────────────────────

INSERT INTO tournament_teams (tournament_id, team_id) VALUES
('tournament_npl', 'team_ruku'),
('tournament_npl', 'team_iddress'),
('tournament_npl', 'team_ayyub'),
('tournament_npl', 'team_rehan');

-- ─── Players - Ruku 11 ───────────────────────────────────────────────────────

-- Captains (also players)
INSERT INTO players (id, team_id, name, jersey_no, role) VALUES
('p_ruku_0', 'team_ruku', 'Ruku', 10, 'CAPTAIN'),
('p_iddress_0', 'team_iddress', 'Iddress', 10, 'CAPTAIN'),
('p_ayyub_0', 'team_ayyub', 'Ayyub', 10, 'CAPTAIN'),
('p_rehan_0', 'team_rehan', 'Rehan', 10, 'CAPTAIN');

-- Ruku 11 players
INSERT INTO players (id, team_id, name, jersey_no) VALUES
('p_ruku_1', 'team_ruku', 'Sohail', 1),
('p_ruku_2', 'team_ruku', 'Mehboob Bhai', 2),
('p_ruku_3', 'team_ruku', 'Zuhair', 3),
('p_ruku_4', 'team_ruku', 'Hatim', 4),
('p_ruku_5', 'team_ruku', 'Mustafa Jr', 5),
('p_ruku_6', 'team_ruku', 'Irfan', 6),
('p_ruku_7', 'team_ruku', 'Shehbaz', 7),
('p_ruku_8', 'team_ruku', 'Ammar', 8),
('p_ruku_9', 'team_ruku', 'Toseef', 9);

-- ─── Players - Ayyub 11 ──────────────────────────────────────────────────────

INSERT INTO players (id, team_id, name, jersey_no) VALUES
('p_ayyub_1', 'team_ayyub', 'Mustafa', 1),
('p_ayyub_2', 'team_ayyub', 'Suleman', 2),
('p_ayyub_3', 'team_ayyub', 'Afzal Bhai', 3),
('p_ayyub_4', 'team_ayyub', 'Rizwan', 4),
('p_ayyub_5', 'team_ayyub', 'Asif', 5),
('p_ayyub_6', 'team_ayyub', 'Noor Bhai', 6),
('p_ayyub_7', 'team_ayyub', 'Afzal Bhai Mobile', 7),
('p_ayyub_8', 'team_ayyub', 'Nazir Bhai', 8),
('p_ayyub_9', 'team_ayyub', 'Dastagir', 9);

-- ─── Players - Rehan 11 ──────────────────────────────────────────────────────

INSERT INTO players (id, team_id, name, jersey_no) VALUES
('p_rehan_1', 'team_rehan', 'Sameer', 1),
('p_rehan_2', 'team_rehan', 'Sadik', 2),
('p_rehan_3', 'team_rehan', 'Nasir Bhai', 3),
('p_rehan_4', 'team_rehan', 'Adil', 4),
('p_rehan_5', 'team_rehan', 'Faraz', 5),
('p_rehan_6', 'team_rehan', 'Salim Bhai', 6),
('p_rehan_7', 'team_rehan', 'Sameer Bhai', 7),
('p_rehan_8', 'team_rehan', 'Atif', 8),
('p_rehan_9', 'team_rehan', 'Tanish', 9);

-- ─── Players - Iddress 11 ────────────────────────────────────────────────────

INSERT INTO players (id, team_id, name, jersey_no) VALUES
('p_iddress_1', 'team_iddress', 'Abdul Habib', 1),
('p_iddress_2', 'team_iddress', 'Fashu Bhai', 2),
('p_iddress_3', 'team_iddress', 'Aqib', 3),
('p_iddress_4', 'team_iddress', 'Arman', 4),
('p_iddress_5', 'team_iddress', 'Ajmir', 5),
('p_iddress_6', 'team_iddress', 'Faiz', 6),
('p_iddress_7', 'team_iddress', 'Waseem', 7),
('p_iddress_8', 'team_iddress', 'Ballu', 8),
('p_iddress_9', 'team_iddress', 'Rafiq', 9);

-- ─── Points Table (initial - all zeros) ──────────────────────────────────────

INSERT INTO points_table (tournament_id, team_id, played, won, lost, tied, no_result, points, nrr) VALUES
('tournament_npl', 'team_ruku', 0, 0, 0, 0, 0, 0, 0),
('tournament_npl', 'team_iddress', 0, 0, 0, 0, 0, 0, 0),
('tournament_npl', 'team_ayyub', 0, 0, 0, 0, 0, 0, 0),
('tournament_npl', 'team_rehan', 0, 0, 0, 0, 0, 0, 0);

-- ─── Fixtures ─────────────────────────────────────────────────────────────────

INSERT INTO matches (id, tournament_id, match_number, home_team_id, away_team_id, scheduled_at, overs, status, is_final) VALUES
('match_1', 'tournament_npl', 1, 'team_ruku', 'team_iddress', '2026-05-09 22:00:00+05:30', 4, 'SCHEDULED', false),
('match_2', 'tournament_npl', 2, 'team_ayyub', 'team_rehan', '2026-05-09 23:00:00+05:30', 4, 'SCHEDULED', false),
('match_3', 'tournament_npl', 3, 'team_ruku', 'team_ayyub', '2026-05-10 22:00:00+05:30', 4, 'SCHEDULED', false),
('match_4', 'tournament_npl', 4, 'team_iddress', 'team_rehan', '2026-05-10 23:00:00+05:30', 4, 'SCHEDULED', false),
('match_5', 'tournament_npl', 5, 'team_ruku', 'team_rehan', '2026-05-11 22:00:00+05:30', 4, 'SCHEDULED', false),
('match_6', 'tournament_npl', 6, 'team_iddress', 'team_ayyub', '2026-05-11 23:00:00+05:30', 4, 'SCHEDULED', false),
('match_7', 'tournament_npl', 7, 'team_iddress', 'team_ruku', '2026-05-12 22:00:00+05:30', 4, 'SCHEDULED', false),
('match_8', 'tournament_npl', 8, 'team_rehan', 'team_ayyub', '2026-05-12 23:00:00+05:30', 4, 'SCHEDULED', false),
('match_9', 'tournament_npl', 9, 'team_ayyub', 'team_ruku', '2026-05-13 22:00:00+05:30', 4, 'SCHEDULED', false),
('match_10', 'tournament_npl', 10, 'team_rehan', 'team_iddress', '2026-05-13 23:00:00+05:30', 4, 'SCHEDULED', false),
('match_11', 'tournament_npl', 11, 'team_rehan', 'team_ruku', '2026-05-14 22:00:00+05:30', 4, 'SCHEDULED', false),
('match_12', 'tournament_npl', 12, 'team_ayyub', 'team_iddress', '2026-05-14 23:00:00+05:30', 4, 'SCHEDULED', false),
('match_13', 'tournament_npl', 13, 'team_ruku', 'team_iddress', '2026-05-16 22:00:00+05:30', 4, 'SCHEDULED', true);

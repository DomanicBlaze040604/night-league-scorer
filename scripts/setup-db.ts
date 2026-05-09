/**
 * Night League Scorer - Database Setup Script
 *
 * This script creates all tables and seeds the Night Premier League data.
 * Run with: npx tsx scripts/setup-db.ts
 *
 * You can also paste supabase-schema.sql and supabase-seed.sql
 * directly into the Supabase SQL Editor.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://txlxlkjadrqyoqgjedeh.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bHhsa2phZHJxeW9xZ2plZGVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2MTY2MywiZXhwIjoyMDkzODM3NjYzfQ.gKO0xbDnf8Da7XHiSaEmnCJExD4AWEXePVOEuDDy8DY'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function checkTablesExist(): Promise<boolean> {
  const { error } = await supabase.from('tournaments').select('id').limit(1)
  return !error
}

async function seed() {
  console.log('🏏 Night League Scorer - Database Setup\n')

  // Check if tables already exist
  const tablesExist = await checkTablesExist()
  if (!tablesExist) {
    console.log('❌ Tables not found!')
    console.log('\n📋 Please run the schema SQL first:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/txlxlkjadrqyoqgjedeh/sql/new')
    console.log('   2. Paste the contents of: supabase-schema.sql')
    console.log('   3. Click "Run"')
    console.log('   4. Run this script again\n')
    process.exit(1)
  }

  console.log('✅ Tables found! Seeding data...\n')

  // ─── Teams ────────────────────────────────────────────────────────────────
  console.log('Creating teams...')
  const { error: teamsError } = await supabase.from('teams').upsert([
    { id: 'team_ruku', name: 'Ruku 11', short_name: 'RUK', primary_color: '#22c55e' },
    { id: 'team_iddress', name: 'Iddress 11', short_name: 'IDD', primary_color: '#3b82f6' },
    { id: 'team_ayyub', name: 'Ayyub 11', short_name: 'AYB', primary_color: '#f59e0b' },
    { id: 'team_rehan', name: 'Rehan 11', short_name: 'REH', primary_color: '#ef4444' },
  ], { onConflict: 'id' })
  if (teamsError) throw new Error('Teams: ' + teamsError.message)
  console.log('✅ Teams')

  // ─── Tournament ───────────────────────────────────────────────────────────
  const { error: tournamentError } = await supabase.from('tournaments').upsert({
    id: 'tournament_npl',
    name: 'Night Premier League',
    slug: 'night-premier-league',
    description: 'Local night cricket tournament. Round robin + Final.',
    format: 'ROUND_ROBIN_KNOCKOUT',
    status: 'ACTIVE',
    start_date: '2026-05-09T22:00:00+05:30',
    overs: 4,
    location: 'Local Ground',
  }, { onConflict: 'id' })
  if (tournamentError) throw new Error('Tournament: ' + tournamentError.message)
  console.log('✅ Tournament')

  // ─── Tournament Teams ─────────────────────────────────────────────────────
  const { error: ttError } = await supabase.from('tournament_teams').upsert([
    { id: 'tt_ruku', tournament_id: 'tournament_npl', team_id: 'team_ruku' },
    { id: 'tt_iddress', tournament_id: 'tournament_npl', team_id: 'team_iddress' },
    { id: 'tt_ayyub', tournament_id: 'tournament_npl', team_id: 'team_ayyub' },
    { id: 'tt_rehan', tournament_id: 'tournament_npl', team_id: 'team_rehan' },
  ], { onConflict: 'tournament_id,team_id' })
  if (ttError) throw new Error('TournamentTeams: ' + ttError.message)
  console.log('✅ Tournament teams')

  // ─── Players ──────────────────────────────────────────────────────────────
  const players = [
    // Captains (also players)
    { id: 'p_ruku_0', team_id: 'team_ruku', name: 'Ruku', jersey_no: 10, role: 'CAPTAIN' },
    { id: 'p_iddress_0', team_id: 'team_iddress', name: 'Iddress', jersey_no: 10, role: 'CAPTAIN' },
    { id: 'p_ayyub_0', team_id: 'team_ayyub', name: 'Ayyub', jersey_no: 10, role: 'CAPTAIN' },
    { id: 'p_rehan_0', team_id: 'team_rehan', name: 'Rehan', jersey_no: 10, role: 'CAPTAIN' },
    { id: 'p_ruku_1', team_id: 'team_ruku', name: 'Sohail', jersey_no: 1 },
    { id: 'p_ruku_2', team_id: 'team_ruku', name: 'Mehboob Bhai', jersey_no: 2 },
    { id: 'p_ruku_3', team_id: 'team_ruku', name: 'Zuhair', jersey_no: 3 },
    { id: 'p_ruku_4', team_id: 'team_ruku', name: 'Hatim', jersey_no: 4 },
    { id: 'p_ruku_5', team_id: 'team_ruku', name: 'Mustafa Jr', jersey_no: 5 },
    { id: 'p_ruku_6', team_id: 'team_ruku', name: 'Irfan', jersey_no: 6 },
    { id: 'p_ruku_7', team_id: 'team_ruku', name: 'Shehbaz', jersey_no: 7 },
    { id: 'p_ruku_8', team_id: 'team_ruku', name: 'Ammar', jersey_no: 8 },
    { id: 'p_ruku_9', team_id: 'team_ruku', name: 'Toseef', jersey_no: 9 },
    { id: 'p_ayyub_1', team_id: 'team_ayyub', name: 'Mustafa', jersey_no: 1 },
    { id: 'p_ayyub_2', team_id: 'team_ayyub', name: 'Suleman', jersey_no: 2 },
    { id: 'p_ayyub_3', team_id: 'team_ayyub', name: 'Afzal Bhai', jersey_no: 3 },
    { id: 'p_ayyub_4', team_id: 'team_ayyub', name: 'Rizwan', jersey_no: 4 },
    { id: 'p_ayyub_5', team_id: 'team_ayyub', name: 'Asif', jersey_no: 5 },
    { id: 'p_ayyub_6', team_id: 'team_ayyub', name: 'Noor Bhai', jersey_no: 6 },
    { id: 'p_ayyub_7', team_id: 'team_ayyub', name: 'Afzal Bhai Mobile', jersey_no: 7 },
    { id: 'p_ayyub_8', team_id: 'team_ayyub', name: 'Nazir Bhai', jersey_no: 8 },
    { id: 'p_ayyub_9', team_id: 'team_ayyub', name: 'Dastagir', jersey_no: 9 },
    { id: 'p_rehan_1', team_id: 'team_rehan', name: 'Sameer', jersey_no: 1 },
    { id: 'p_rehan_2', team_id: 'team_rehan', name: 'Sadik', jersey_no: 2 },
    { id: 'p_rehan_3', team_id: 'team_rehan', name: 'Nasir Bhai', jersey_no: 3 },
    { id: 'p_rehan_4', team_id: 'team_rehan', name: 'Adil', jersey_no: 4 },
    { id: 'p_rehan_5', team_id: 'team_rehan', name: 'Faraz', jersey_no: 5 },
    { id: 'p_rehan_6', team_id: 'team_rehan', name: 'Salim Bhai', jersey_no: 6 },
    { id: 'p_rehan_7', team_id: 'team_rehan', name: 'Sameer Bhai', jersey_no: 7 },
    { id: 'p_rehan_8', team_id: 'team_rehan', name: 'Atif', jersey_no: 8 },
    { id: 'p_rehan_9', team_id: 'team_rehan', name: 'Tanish', jersey_no: 9 },
    { id: 'p_iddress_1', team_id: 'team_iddress', name: 'Abdul Habib', jersey_no: 1 },
    { id: 'p_iddress_2', team_id: 'team_iddress', name: 'Fashu Bhai', jersey_no: 2 },
    { id: 'p_iddress_3', team_id: 'team_iddress', name: 'Aqib', jersey_no: 3 },
    { id: 'p_iddress_4', team_id: 'team_iddress', name: 'Arman', jersey_no: 4 },
    { id: 'p_iddress_5', team_id: 'team_iddress', name: 'Ajmir', jersey_no: 5 },
    { id: 'p_iddress_6', team_id: 'team_iddress', name: 'Faiz', jersey_no: 6 },
    { id: 'p_iddress_7', team_id: 'team_iddress', name: 'Waseem', jersey_no: 7 },
    { id: 'p_iddress_8', team_id: 'team_iddress', name: 'Ballu', jersey_no: 8 },
    { id: 'p_iddress_9', team_id: 'team_iddress', name: 'Rafiq', jersey_no: 9 },
  ]
  const { error: playersError } = await supabase.from('players').upsert(players, { onConflict: 'id' })
  if (playersError) throw new Error('Players: ' + playersError.message)
  console.log(`✅ ${players.length} players`)

  // ─── Points Table ─────────────────────────────────────────────────────────
  const { error: ptError } = await supabase.from('points_table').upsert([
    { id: 'pt_ruku', tournament_id: 'tournament_npl', team_id: 'team_ruku' },
    { id: 'pt_iddress', tournament_id: 'tournament_npl', team_id: 'team_iddress' },
    { id: 'pt_ayyub', tournament_id: 'tournament_npl', team_id: 'team_ayyub' },
    { id: 'pt_rehan', tournament_id: 'tournament_npl', team_id: 'team_rehan' },
  ], { onConflict: 'tournament_id,team_id' })
  if (ptError) throw new Error('PointsTable: ' + ptError.message)
  console.log('✅ Points table')

  // ─── Matches ──────────────────────────────────────────────────────────────
  const matches = [
    { id: 'match_1', tournament_id: 'tournament_npl', match_number: 1, home_team_id: 'team_ruku', away_team_id: 'team_iddress', scheduled_at: '2026-05-09T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_2', tournament_id: 'tournament_npl', match_number: 2, home_team_id: 'team_ayyub', away_team_id: 'team_rehan', scheduled_at: '2026-05-09T23:30:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_3', tournament_id: 'tournament_npl', match_number: 3, home_team_id: 'team_ruku', away_team_id: 'team_ayyub', scheduled_at: '2026-05-10T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_4', tournament_id: 'tournament_npl', match_number: 4, home_team_id: 'team_iddress', away_team_id: 'team_rehan', scheduled_at: '2026-05-10T23:30:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_5', tournament_id: 'tournament_npl', match_number: 5, home_team_id: 'team_ruku', away_team_id: 'team_rehan', scheduled_at: '2026-05-11T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_6', tournament_id: 'tournament_npl', match_number: 6, home_team_id: 'team_iddress', away_team_id: 'team_ayyub', scheduled_at: '2026-05-11T23:30:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_7', tournament_id: 'tournament_npl', match_number: 7, home_team_id: 'team_iddress', away_team_id: 'team_ruku', scheduled_at: '2026-05-12T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_8', tournament_id: 'tournament_npl', match_number: 8, home_team_id: 'team_rehan', away_team_id: 'team_ayyub', scheduled_at: '2026-05-12T23:30:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_9', tournament_id: 'tournament_npl', match_number: 9, home_team_id: 'team_ayyub', away_team_id: 'team_ruku', scheduled_at: '2026-05-13T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_10', tournament_id: 'tournament_npl', match_number: 10, home_team_id: 'team_rehan', away_team_id: 'team_iddress', scheduled_at: '2026-05-13T23:30:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_11', tournament_id: 'tournament_npl', match_number: 11, home_team_id: 'team_rehan', away_team_id: 'team_ruku', scheduled_at: '2026-05-14T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_12', tournament_id: 'tournament_npl', match_number: 12, home_team_id: 'team_ayyub', away_team_id: 'team_iddress', scheduled_at: '2026-05-14T23:30:00+05:30', overs: 4, status: 'SCHEDULED', is_final: false },
    { id: 'match_13', tournament_id: 'tournament_npl', match_number: 13, home_team_id: 'team_ruku', away_team_id: 'team_iddress', scheduled_at: '2026-05-16T22:00:00+05:30', overs: 4, status: 'SCHEDULED', is_final: true },
  ]
  const { error: matchesError } = await supabase.from('matches').upsert(matches, { onConflict: 'id' })
  if (matchesError) throw new Error('Matches: ' + matchesError.message)
  console.log(`✅ ${matches.length} fixtures`)

  console.log('\n🏆 Setup complete!\n')
  console.log('   Tournament: Night Premier League')
  console.log('   Teams: Ruku 11, Iddress 11, Ayyub 11, Rehan 11')
  console.log('   Players: 36 registered')
  console.log('   Fixtures: 12 league matches + 1 Final\n')
  console.log('Run: npm run dev')
  console.log('Open: http://localhost:3000\n')
}

seed().catch(err => {
  console.error('❌ Setup failed:', err.message)
  process.exit(1)
})

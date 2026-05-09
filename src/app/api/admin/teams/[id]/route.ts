import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const [{ data: team }, { data: matches }, { data: pts }, { data: batting }, { data: bowling }] = await Promise.all([
    supabase.from('teams').select('*, players(*)').eq('id', id).single(),
    supabase.from('matches').select(`
      *,
      home_team:teams!matches_home_team_id_fkey(id,name),
      away_team:teams!matches_away_team_id_fkey(id,name),
      innings(batting_team_id, total_runs, total_wickets, total_balls)
    `).or(`home_team_id.eq.${id},away_team_id.eq.${id}`).order('match_number'),
    supabase.from('points_table').select('*').eq('team_id', id).single(),
    supabase.from('batting_innings').select('player_id, runs, balls').eq('innings_id', 'x').limit(0), // placeholder
    supabase.from('bowling_spells').select('player_id, wickets').eq('innings_id', 'x').limit(0), // placeholder
  ])

  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get player stats from all innings for this team
  const { data: allBatting } = await supabase
    .from('batting_innings')
    .select('player_id, runs, balls')
    .in('player_id', (team.players || []).map((p: { id: string }) => p.id))

  const { data: allBowling } = await supabase
    .from('bowling_spells')
    .select('player_id, wickets')
    .in('player_id', (team.players || []).map((p: { id: string }) => p.id))

  const runsByPlayer: Record<string, number> = {}
  const wicketsByPlayer: Record<string, number> = {}

  for (const b of allBatting || []) {
    runsByPlayer[b.player_id] = (runsByPlayer[b.player_id] || 0) + b.runs
  }
  for (const b of allBowling || []) {
    wicketsByPlayer[b.player_id] = (wicketsByPlayer[b.player_id] || 0) + b.wickets
  }

  const players = (team.players || [])
    .sort((a: { jersey_no: number }, b: { jersey_no: number }) => a.jersey_no - b.jersey_no)
    .map((p: { id: string; name: string; jersey_no: number; role?: string }) => ({
      id: p.id,
      name: p.name,
      jerseyNo: p.jersey_no,
      role: p.role,
      runs: runsByPlayer[p.id] || 0,
      wickets: wicketsByPlayer[p.id] || 0,
    }))

  const formattedMatches = (matches || []).map((m: Record<string, unknown>) => ({
    id: m.id,
    matchNumber: m.match_number,
    status: m.status,
    isFinal: m.is_final,
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    resultText: m.result_text,
    homeTeam: m.home_team,
    awayTeam: m.away_team,
    innings: ((m.innings as unknown[]) || []).map((i: unknown) => {
      const inn = i as Record<string, unknown>
      return {
        battingTeamId: inn.batting_team_id,
        totalRuns: inn.total_runs,
        totalWickets: inn.total_wickets,
        totalBalls: inn.total_balls,
      }
    }),
  }))

  const points = pts ? {
    played: pts.played, won: pts.won, lost: pts.lost,
    tied: pts.tied, points: pts.points, nrr: pts.nrr,
  } : null

  return NextResponse.json({ data: { id: team.id, name: team.name, shortName: team.short_name, primaryColor: team.primary_color, players, matches: formattedMatches, points } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await req.json()

  const { error } = await supabase
    .from('teams')
    .update({
      name: body.name,
      short_name: body.shortName,
      primary_color: body.primaryColor,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

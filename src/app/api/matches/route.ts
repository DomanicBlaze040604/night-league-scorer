import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournamentId')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey (*),
      away_team:teams!matches_away_team_id_fkey (*),
      winner_team:teams!matches_winner_team_id_fkey (*),
      innings (*)
    `)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (tournamentId) query = query.eq('tournament_id', tournamentId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

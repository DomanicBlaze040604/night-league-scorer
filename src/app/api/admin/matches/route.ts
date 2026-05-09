import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST create a new match
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { tournamentId, homeTeamId, awayTeamId, scheduledAt, overs, isFinal } = body
  if (!tournamentId || !homeTeamId || !awayTeamId || !scheduledAt) {
    return NextResponse.json({ error: 'tournamentId, homeTeamId, awayTeamId, scheduledAt required' }, { status: 400 })
  }

  // Get next match number for this tournament
  const { data: existing } = await supabase
    .from('matches')
    .select('match_number')
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: false })
    .limit(1)

  const nextNo = ((existing?.[0]?.match_number) || 0) + 1

  const { data, error } = await supabase
    .from('matches')
    .insert({
      tournament_id: tournamentId,
      match_number: nextNo,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      overs: overs || 4,
      status: 'SCHEDULED',
      is_final: isFinal || false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

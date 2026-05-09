import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { matchId, tossWinnerId, tossChoice } = await request.json()

  // Update match with toss info
  const { data: match, error } = await supabase
    .from('matches')
    .update({
      toss_winner_id: tossWinnerId,
      toss_choice: tossChoice,
      status: 'LIVE',
    })
    .eq('id', matchId)
    .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Determine batting/bowling teams
  const battingTeamId = tossChoice === 'BAT' ? tossWinnerId
    : (match.home_team_id === tossWinnerId ? match.away_team_id : match.home_team_id)

  // Create innings 1
  const { data: innings, error: inningsError } = await supabase
    .from('innings')
    .insert({
      match_id: matchId,
      batting_team_id: battingTeamId,
      innings_no: 1,
      status: 'LIVE',
    })
    .select()
    .single()

  if (inningsError) {
    return NextResponse.json({ error: inningsError.message }, { status: 500 })
  }

  // Create first over
  const { data: over } = await supabase
    .from('overs')
    .insert({
      innings_id: innings.id,
      over_no: 1,
    })
    .select()
    .single()

  return NextResponse.json({ data: { match, innings, over } })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Start innings 2 / switch innings
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { matchId, innings1Id } = await request.json()

  // Get innings 1 data
  const { data: innings1 } = await supabase
    .from('innings')
    .select('*, match:matches(*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))')
    .eq('id', innings1Id)
    .single()

  if (!innings1) {
    return NextResponse.json({ error: 'Innings 1 not found' }, { status: 404 })
  }

  // Close innings 1
  await supabase
    .from('innings')
    .update({ status: 'COMPLETED' })
    .eq('id', innings1Id)

  // Update match to innings break
  await supabase
    .from('matches')
    .update({ status: 'INNINGS_BREAK' })
    .eq('id', matchId)

  // Determine innings 2 batting team
  const match = innings1.match
  const battingTeamId = innings1.batting_team_id === match.home_team_id
    ? match.away_team_id
    : match.home_team_id

  const target = innings1.total_runs + 1

  // Create innings 2
  const { data: innings2, error } = await supabase
    .from('innings')
    .insert({
      match_id: matchId,
      batting_team_id: battingTeamId,
      innings_no: 2,
      status: 'LIVE',
      target_runs: target,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update match to live
  await supabase
    .from('matches')
    .update({ status: 'LIVE' })
    .eq('id', matchId)

  // Create first over of innings 2
  const { data: over } = await supabase
    .from('overs')
    .insert({
      innings_id: innings2.id,
      over_no: 1,
    })
    .select()
    .single()

  return NextResponse.json({ data: { innings2, over, target } })
}

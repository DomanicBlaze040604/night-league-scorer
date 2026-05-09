import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { matchId, innings2Id } = await request.json()

  const { data: innings2, error: i2err } = await supabase
    .from('innings')
    .select('*, match:matches(*, home_team:teams!matches_home_team_id_fkey(id, name), away_team:teams!matches_away_team_id_fkey(id, name))')
    .eq('id', innings2Id)
    .single()

  if (!innings2 || i2err) {
    console.error('[result] innings2 not found', i2err)
    return NextResponse.json({ error: 'Innings 2 not found' }, { status: 404 })
  }

  const { data: innings1, error: i1err } = await supabase
    .from('innings')
    .select('*')
    .eq('match_id', matchId)
    .eq('innings_no', 1)
    .single()

  if (!innings1 || i1err) {
    console.error('[result] innings1 not found', i1err)
    return NextResponse.json({ error: 'Innings 1 not found' }, { status: 404 })
  }

  const match = innings2.match
  const chased = innings2.total_runs >= (innings1.total_runs + 1)

  const homeTeamName = (match.home_team as { name?: string })?.name || 'Home Team'
  const awayTeamName = (match.away_team as { name?: string })?.name || 'Away Team'
  const getTeamName = (teamId: string) =>
    teamId === match.home_team_id ? homeTeamName : teamId === match.away_team_id ? awayTeamName : 'Unknown'

  let winnerTeamId: string
  let resultText: string
  let winType: string
  let winMargin: number

  if (chased) {
    winnerTeamId = innings2.batting_team_id
    const wicketsLeft = 10 - innings2.total_wickets
    winType = 'WICKETS'
    winMargin = wicketsLeft
    resultText = `${getTeamName(innings2.batting_team_id)} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`
  } else {
    winnerTeamId = innings1.batting_team_id
    const runsWon = innings1.total_runs - innings2.total_runs
    winType = 'RUNS'
    winMargin = runsWon
    resultText = `${getTeamName(innings1.batting_team_id)} won by ${runsWon} run${runsWon !== 1 ? 's' : ''}`
  }

  // Close innings 2
  await supabase.from('innings').update({ status: 'COMPLETED' }).eq('id', innings2Id)

  // Update match result
  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'COMPLETED', winner_team_id: winnerTeamId, result_text: resultText, win_margin: winMargin, win_type: winType })
    .eq('id', matchId)
    .select()
    .single()

  if (error) {
    console.error('[result] match update failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update points table
  const ptError = await updatePointsTable(supabase, match.tournament_id, innings1, innings2, winnerTeamId)
  if (ptError) {
    console.error('[result] points table update failed:', ptError)
    // Don't fail the whole request — match is already saved
  }

  return NextResponse.json({ data: { match: data, resultText } })
}

async function updatePointsTable(
  supabase: ReturnType<typeof import('@/lib/supabase').createServerClient>,
  tournamentId: string,
  innings1: Record<string, unknown>,
  innings2: Record<string, unknown>,
  winnerTeamId: string
): Promise<string | null> {
  const team1Id = innings1.batting_team_id as string
  const team2Id = innings2.batting_team_id as string

  for (const teamId of [team1Id, team2Id]) {
    const isWinner = teamId === winnerTeamId
    const isTeam1 = teamId === team1Id

    const { data: existing, error: fetchErr } = await supabase
      .from('points_table')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId)
      .maybeSingle()

    if (fetchErr) return `fetch error for ${teamId}: ${fetchErr.message}`

    const runsFor = isTeam1 ? (innings1.total_runs as number || 0) : (innings2.total_runs as number || 0)
    const oversFor = isTeam1 ? (innings1.total_overs as number || 0) : (innings2.total_overs as number || 0)
    const runsAgainst = isTeam1 ? (innings2.total_runs as number || 0) : (innings1.total_runs as number || 0)
    const oversAgainst = isTeam1 ? (innings2.total_overs as number || 0) : (innings1.total_overs as number || 0)

    const newRunsFor = (existing?.runs_for || 0) + runsFor
    const newOversFor = (existing?.overs_for || 0) + oversFor
    const newRunsAgainst = (existing?.runs_against || 0) + runsAgainst
    const newOversAgainst = (existing?.overs_against || 0) + oversAgainst
    const nrr = newOversFor > 0 && newOversAgainst > 0
      ? (newRunsFor / newOversFor) - (newRunsAgainst / newOversAgainst)
      : 0

    if (existing) {
      const { error: updErr } = await supabase.from('points_table').update({
        played: existing.played + 1,
        won: existing.won + (isWinner ? 1 : 0),
        lost: existing.lost + (isWinner ? 0 : 1),
        points: existing.points + (isWinner ? 2 : 0),
        runs_for: newRunsFor,
        overs_for: newOversFor,
        runs_against: newRunsAgainst,
        overs_against: newOversAgainst,
        nrr,
      }).eq('id', existing.id)
      if (updErr) return `update error for ${teamId}: ${updErr.message}`
    } else {
      const { error: insErr } = await supabase.from('points_table').insert({
        tournament_id: tournamentId,
        team_id: teamId,
        played: 1,
        won: isWinner ? 1 : 0,
        lost: isWinner ? 0 : 1,
        points: isWinner ? 2 : 0,
        runs_for: runsFor,
        overs_for: oversFor,
        runs_against: runsAgainst,
        overs_against: oversAgainst,
        nrr,
      })
      if (insErr) return `insert error for ${teamId}: ${insErr.message}`
    }
  }
  return null
}

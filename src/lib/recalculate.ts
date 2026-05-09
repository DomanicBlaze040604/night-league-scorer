import { createServerClient } from '@/lib/supabase'

// Fully recalculates points_table for a tournament by resetting all rows to 0
// then replaying every COMPLETED non-final match from innings data.
export async function recalculateTournamentPoints(tournamentId: string): Promise<string | null> {
  const supabase = createServerClient()

  // Reset all rows to zero
  const { error: resetErr } = await supabase
    .from('points_table')
    .update({ played: 0, won: 0, lost: 0, tied: 0, no_result: 0, points: 0, runs_for: 0, overs_for: 0, runs_against: 0, overs_against: 0, nrr: 0 })
    .eq('tournament_id', tournamentId)

  if (resetErr) return `reset error: ${resetErr.message}`

  // Get all completed non-final matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, winner_team_id, is_final')
    .eq('tournament_id', tournamentId)
    .eq('status', 'COMPLETED')
    .eq('is_final', false)

  for (const match of matches || []) {
    if (!match.winner_team_id) continue

    const { data: innings } = await supabase
      .from('innings')
      .select('innings_no, batting_team_id, total_runs, total_overs')
      .eq('match_id', match.id)
      .order('innings_no')

    if (!innings || innings.length < 2) continue

    const i1 = innings[0]
    const i2 = innings[1]

    for (const { teamId, isWinner } of [
      { teamId: i1.batting_team_id as string, isWinner: i1.batting_team_id === match.winner_team_id },
      { teamId: i2.batting_team_id as string, isWinner: i2.batting_team_id === match.winner_team_id },
    ]) {
      const isTeam1 = teamId === i1.batting_team_id
      const runsFor = isTeam1 ? (i1.total_runs || 0) : (i2.total_runs || 0)
      const oversFor = isTeam1 ? (i1.total_overs || 0) : (i2.total_overs || 0)
      const runsAgainst = isTeam1 ? (i2.total_runs || 0) : (i1.total_runs || 0)
      const oversAgainst = isTeam1 ? (i2.total_overs || 0) : (i1.total_overs || 0)

      const { data: existing } = await supabase.from('points_table').select('*')
        .eq('tournament_id', tournamentId).eq('team_id', teamId).maybeSingle()

      const newRunsFor = (existing?.runs_for || 0) + runsFor
      const newOversFor = (existing?.overs_for || 0) + oversFor
      const newRunsAgainst = (existing?.runs_against || 0) + runsAgainst
      const newOversAgainst = (existing?.overs_against || 0) + oversAgainst
      const nrr = newOversFor > 0 && newOversAgainst > 0
        ? (newRunsFor / newOversFor) - (newRunsAgainst / newOversAgainst) : 0

      if (existing) {
        await supabase.from('points_table').update({
          played: existing.played + 1,
          won: existing.won + (isWinner ? 1 : 0),
          lost: existing.lost + (isWinner ? 0 : 1),
          points: existing.points + (isWinner ? 2 : 0),
          runs_for: newRunsFor, overs_for: newOversFor,
          runs_against: newRunsAgainst, overs_against: newOversAgainst, nrr,
        }).eq('id', existing.id)
      } else {
        await supabase.from('points_table').insert({
          tournament_id: tournamentId, team_id: teamId,
          played: 1, won: isWinner ? 1 : 0, lost: isWinner ? 0 : 1, points: isWinner ? 2 : 0,
          runs_for: runsFor, overs_for: oversFor,
          runs_against: runsAgainst, overs_against: oversAgainst, nrr,
        })
      }
    }
  }

  return null
}

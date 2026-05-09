import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { recalculateTournamentPoints } from '@/lib/recalculate'

// Admin: correct match result / status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.status !== undefined) update.status = body.status
  if (body.resultText !== undefined) update.result_text = body.resultText
  if (body.winnerTeamId !== undefined) update.winner_team_id = body.winnerTeamId
  if (body.winMargin !== undefined) update.win_margin = body.winMargin
  if (body.winType !== undefined) update.win_type = body.winType
  if (body.overs !== undefined) update.overs = body.overs
  if (body.isFinal !== undefined) update.is_final = body.isFinal
  if (body.scheduledAt !== undefined) update.scheduled_at = body.scheduledAt
  if (body.homeTeamId !== undefined) update.home_team_id = body.homeTeamId
  if (body.awayTeamId !== undefined) update.away_team_id = body.awayTeamId

  const { error } = await supabase.from('matches').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If marking as completed, also update points table if winnerTeamId is provided
  if (body.updatePoints && body.winnerTeamId) {
    const { data: match } = await supabase
      .from('matches')
      .select('tournament_id, home_team_id, away_team_id, is_final')
      .eq('id', id).single()

    if (match && !match.is_final) {
      const loserTeamId = body.winnerTeamId === match.home_team_id ? match.away_team_id : match.home_team_id

      for (const { teamId, isWinner } of [
        { teamId: body.winnerTeamId as string, isWinner: true },
        { teamId: loserTeamId as string, isWinner: false },
      ]) {
        const { data: existing } = await supabase.from('points_table').select('*')
          .eq('tournament_id', match.tournament_id).eq('team_id', teamId).single()

        if (existing) {
          await supabase.from('points_table').update({
            played: existing.played + 1,
            won: existing.won + (isWinner ? 1 : 0),
            lost: existing.lost + (isWinner ? 0 : 1),
            points: existing.points + (isWinner ? 2 : 0),
          }).eq('id', existing.id)
        } else {
          await supabase.from('points_table').insert({
            tournament_id: match.tournament_id,
            team_id: teamId,
            played: 1,
            won: isWinner ? 1 : 0,
            lost: isWinner ? 0 : 1,
            points: isWinner ? 2 : 0,
          })
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}

// Reset a match back to SCHEDULED (for re-scoring)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  // Delete all innings data for this match
  const { data: innings } = await supabase.from('innings').select('id').eq('match_id', id)
  for (const inn of innings || []) {
    const { data: overs } = await supabase.from('overs').select('id').eq('innings_id', inn.id)
    for (const over of overs || []) {
      await supabase.from('balls').delete().eq('over_id', over.id)
    }
    await supabase.from('overs').delete().eq('innings_id', inn.id)
    await supabase.from('batting_innings').delete().eq('innings_id', inn.id)
    await supabase.from('bowling_spells').delete().eq('innings_id', inn.id)
    await supabase.from('fall_of_wickets').delete().eq('innings_id', inn.id)
  }
  await supabase.from('innings').delete().eq('match_id', id)
  await supabase.from('commentary').delete().eq('match_id', id)

  // Get tournament_id BEFORE resetting match
  const { data: matchInfo } = await supabase
    .from('matches')
    .select('tournament_id')
    .eq('id', id)
    .single()

  await supabase.from('matches').update({
    status: 'SCHEDULED',
    toss_winner_id: null,
    toss_choice: null,
    winner_team_id: null,
    result_text: null,
    win_margin: null,
    win_type: null,
  }).eq('id', id)

  // Recalculate entire tournament points from scratch so this match's contribution is removed
  if (matchInfo?.tournament_id) {
    const err = await recalculateTournamentPoints(matchInfo.tournament_id)
    if (err) console.error('[reset] recalculate failed:', err)
  }

  return NextResponse.json({ success: true })
}

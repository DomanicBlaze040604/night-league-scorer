import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// DELETE /api/scoring/undo?ballId=xxx
// Reverses the last scored ball: deletes the ball record and rolls back
// innings totals, batting innings, and bowling spell stats.
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ballId = searchParams.get('ballId')
  if (!ballId) return NextResponse.json({ error: 'ballId required' }, { status: 400 })

  const supabase = createServerClient()

  // Fetch ball data before deleting
  const { data: ball, error: ballFetchErr } = await supabase
    .from('balls')
    .select('*')
    .eq('id', ballId)
    .single()

  if (!ball || ballFetchErr) {
    return NextResponse.json({ error: 'Ball not found' }, { status: 404 })
  }

  const isLegal = ball.is_legal_delivery
  const runsToReverse = (ball.runs || 0) + (ball.extras || 0)
  const isWicket = ball.is_wicket

  // Delete the ball
  await supabase.from('balls').delete().eq('id', ballId)

  // Reverse innings totals
  const { data: innings } = await supabase
    .from('innings')
    .select('total_runs, total_wickets, total_balls, total_overs, extras, wides, no_balls, byes, leg_byes')
    .eq('id', ball.innings_id)
    .single()

  if (innings) {
    const isWide = ball.extra_type === 'WIDE'
    const isNoBall = ball.extra_type === 'NO_BALL'
    const isBye = ball.extra_type === 'BYE'
    const isLegBye = ball.extra_type === 'LEG_BYE'

    const newTotalBalls = Math.max(0, innings.total_balls - (isLegal ? 1 : 0))
    const { error: innUpdErr } = await supabase.from('innings').update({
      total_runs: Math.max(0, innings.total_runs - runsToReverse),
      total_wickets: Math.max(0, innings.total_wickets - (isWicket ? 1 : 0)),
      total_balls: newTotalBalls,
      total_overs: newTotalBalls / 6,
      extras: Math.max(0, innings.extras - (ball.extras || 0)),
      wides: Math.max(0, innings.wides - (isWide ? (ball.extras || 0) : 0)),
      no_balls: Math.max(0, innings.no_balls - (isNoBall ? 1 : 0)),
      byes: Math.max(0, innings.byes - (isBye ? (ball.extras || 0) : 0)),
      leg_byes: Math.max(0, innings.leg_byes - (isLegBye ? (ball.extras || 0) : 0)),
    }).eq('id', ball.innings_id)
    if (innUpdErr) console.error('[undo] innings update error', innUpdErr)
  }

  // Reverse batting innings for the batsman
  const isWide = ball.extra_type === 'WIDE'
  const isByeOrLegBye = ball.extra_type === 'BYE' || ball.extra_type === 'LEG_BYE'
  const batRuns = (isByeOrLegBye || isWide) ? 0 : (ball.runs || 0)

  const { data: batInn } = await supabase
    .from('batting_innings')
    .select('*')
    .eq('innings_id', ball.innings_id)
    .eq('player_id', ball.batsman_id)
    .single()

  if (batInn) {
    await supabase.from('batting_innings').update({
      runs: Math.max(0, batInn.runs - batRuns),
      balls: Math.max(0, batInn.balls - (isWide ? 0 : 1)),
      fours: Math.max(0, batInn.fours - (batRuns === 4 ? 1 : 0)),
      sixes: Math.max(0, batInn.sixes - (batRuns === 6 ? 1 : 0)),
      is_out: isWicket && ball.dismissed_batsman_id === ball.batsman_id ? false : batInn.is_out,
    }).eq('innings_id', ball.innings_id).eq('player_id', ball.batsman_id)
  }

  // Reverse bowling spell for the bowler
  const { data: bowlSpell } = await supabase
    .from('bowling_spells')
    .select('*')
    .eq('innings_id', ball.innings_id)
    .eq('player_id', ball.bowler_id)
    .single()

  if (bowlSpell) {
    const newBowlerBalls = Math.max(0, Math.round(bowlSpell.overs * 6) - (isLegal ? 1 : 0))
    await supabase.from('bowling_spells').update({
      overs: newBowlerBalls / 6,
      runs: Math.max(0, bowlSpell.runs - runsToReverse),
      wickets: Math.max(0, bowlSpell.wickets - (isWicket && ball.extra_type !== 'NO_BALL' ? 1 : 0)),
      wides: Math.max(0, bowlSpell.wides - (isWide ? 1 : 0)),
      no_balls: Math.max(0, bowlSpell.no_balls - (ball.extra_type === 'NO_BALL' ? 1 : 0)),
      economy: newBowlerBalls > 0
        ? Math.max(0, bowlSpell.runs - runsToReverse) / (newBowlerBalls / 6)
        : 0,
    }).eq('innings_id', ball.innings_id).eq('player_id', ball.bowler_id)
  }

  // If it was a wicket, also remove the new batsman who came in (last batting_innings added)
  // and restore the dismissed batsman's is_out flag
  if (isWicket && ball.dismissed_batsman_id) {
    // Find the batting_innings record with the highest batting_order (the new batsman)
    const { data: allBatInnings } = await supabase
      .from('batting_innings')
      .select('id, player_id, batting_order, runs, balls')
      .eq('innings_id', ball.innings_id)
      .order('batting_order', { ascending: false })

    // The newest batsman (highest order) who has 0 balls AND isn't the dismissed batsman
    const newBatsmanRecord = allBatInnings?.find(
      bi => bi.player_id !== ball.dismissed_batsman_id && bi.balls === 0 && bi.runs === 0
    )
    if (newBatsmanRecord) {
      await supabase.from('batting_innings').delete().eq('id', newBatsmanRecord.id)
    }

    // Restore dismissed batsman as not out
    await supabase.from('batting_innings').update({ is_out: false, wicket_type: null, bowler_id: null })
      .eq('innings_id', ball.innings_id).eq('player_id', ball.dismissed_batsman_id)
  }

  return NextResponse.json({
    success: true,
    ball,
    undoneRuns: runsToReverse,
    undoneWicket: isWicket,
    wasLegal: isLegal,
  })
}

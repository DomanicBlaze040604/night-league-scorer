import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { BallInput } from '@/types/cricket'
import { generateCommentary, calcRunRate } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body: {
    inningsId: string
    matchId: string
    overId: string
    overNo: number
    ballNo: number
    totalBallNo: number
    batsmanId: string
    bowlerId: string
    ball: BallInput
    strikerId: string
    nonStrikerId: string
  } = await request.json()

  const { inningsId, matchId, overId, overNo, ballNo, totalBallNo, batsmanId, bowlerId, ball } = body

  const isWide = ball.isWide || false
  const isNoBall = ball.isNoBall || false
  const isBye = ball.isBye || false
  const isLegBye = ball.isLegBye || false
  const isWicket = ball.isWicket || false
  const isLegalDelivery = !isWide && !isNoBall

  // Calculate extras
  let extras = 0
  let extraType: string | null = null
  if (isWide) { extras = 1 + ball.runs; extraType = 'WIDE' }
  else if (isNoBall) { extras = 1; extraType = 'NO_BALL' }
  else if (isBye) { extras = ball.runs; extraType = 'BYE' }
  else if (isLegBye) { extras = ball.runs; extraType = 'LEG_BYE' }

  const batRuns = (isBye || isLegBye || isWide) ? 0 : ball.runs
  const totalRunsOnBall = ball.runs + (isWide ? 1 : 0) + (isNoBall ? 1 : 0)

  // Insert ball
  const { data: ballData, error: ballError } = await supabase
    .from('balls')
    .insert({
      innings_id: inningsId,
      over_id: overId,
      over_no: overNo,
      ball_no: ballNo,
      total_ball_no: totalBallNo,
      batsman_id: batsmanId,
      bowler_id: bowlerId,
      fielder1_id: ball.fielder1Id || null,
      runs: batRuns,
      extras,
      extra_type: extraType,
      is_wicket: isWicket,
      wicket_type: ball.wicketType || null,
      dismissed_batsman_id: ball.dismissedBatsmanId || null,
      is_boundary: batRuns === 4,
      is_six: batRuns === 6,
      is_legal_delivery: isLegalDelivery,
    })
    .select()
    .single()

  if (ballError) {
    return NextResponse.json({ error: ballError.message }, { status: 500 })
  }

  // Fetch current innings for update
  const { data: innings } = await supabase
    .from('innings')
    .select('*')
    .eq('id', inningsId)
    .single()

  if (!innings) {
    return NextResponse.json({ error: 'Innings not found' }, { status: 404 })
  }

  const newTotalRuns = innings.total_runs + totalRunsOnBall
  const newTotalWickets = innings.total_wickets + (isWicket ? 1 : 0)
  const newTotalBalls = innings.total_balls + (isLegalDelivery ? 1 : 0)
  const newExtras = innings.extras + extras
  const newWides = innings.wides + (isWide ? extras : 0)
  const newNoBalls = innings.no_balls + (isNoBall ? 1 : 0)
  const newByes = innings.byes + (isBye ? extras : 0)
  const newLegByes = innings.leg_byes + (isLegBye ? extras : 0)
  const newTotalOvers = newTotalBalls / 6

  // Update innings
  await supabase
    .from('innings')
    .update({
      total_runs: newTotalRuns,
      total_wickets: newTotalWickets,
      total_balls: newTotalBalls,
      total_overs: newTotalOvers,
      extras: newExtras,
      wides: newWides,
      no_balls: newNoBalls,
      byes: newByes,
      leg_byes: newLegByes,
    })
    .eq('id', inningsId)

  // Update over
  await supabase
    .from('overs')
    .update({
      runs: supabase.rpc('increment', { row_id: overId, amount: totalRunsOnBall }),
      wickets: supabase.rpc('increment', { row_id: overId, amount: isWicket ? 1 : 0 }),
    })
    .eq('id', overId)

  // Update batting innings
  const { data: batInnings } = await supabase
    .from('batting_innings')
    .select('*')
    .eq('innings_id', inningsId)
    .eq('player_id', batsmanId)
    .single()

  if (batInnings) {
    await supabase
      .from('batting_innings')
      .update({
        runs: batInnings.runs + batRuns,
        balls: batInnings.balls + (isWide ? 0 : 1),
        fours: batInnings.fours + (batRuns === 4 ? 1 : 0),
        sixes: batInnings.sixes + (batRuns === 6 ? 1 : 0),
        is_out: isWicket && ball.dismissedBatsmanId === batsmanId,
        wicket_type: (isWicket && ball.dismissedBatsmanId === batsmanId) ? ball.wicketType : batInnings.wicket_type,
        bowler_id: (isWicket && ball.dismissedBatsmanId === batsmanId) ? bowlerId : batInnings.bowler_id,
      })
      .eq('innings_id', inningsId)
      .eq('player_id', batsmanId)
  }

  // Update bowling spell
  const { data: bowlSpell } = await supabase
    .from('bowling_spells')
    .select('*')
    .eq('innings_id', inningsId)
    .eq('player_id', bowlerId)
    .single()

  if (bowlSpell) {
    const newBowlerBalls = bowlSpell.overs * 6 + (isLegalDelivery ? 1 : 0)
    await supabase
      .from('bowling_spells')
      .update({
        overs: newBowlerBalls / 6,
        runs: bowlSpell.runs + totalRunsOnBall,
        wickets: bowlSpell.wickets + (isWicket && ball.wicketType !== 'RUN_OUT' ? 1 : 0),
        wides: bowlSpell.wides + (isWide ? 1 : 0),
        no_balls: bowlSpell.no_balls + (isNoBall ? 1 : 0),
        economy: newBowlerBalls > 0 ? (bowlSpell.runs + totalRunsOnBall) / (newBowlerBalls / 6) : 0,
      })
      .eq('innings_id', inningsId)
      .eq('player_id', bowlerId)
  }

  // Add commentary
  await supabase.from('commentary').insert({
    match_id: matchId,
    over_no: overNo,
    ball_no: ballNo,
    text: ballData.commentary || `${overNo}.${ballNo}: ${totalRunsOnBall} runs`,
    type: isWicket ? 'WICKET' : batRuns === 4 || batRuns === 6 ? 'BOUNDARY' : 'BALL',
  })

  return NextResponse.json({
    data: {
      ball: ballData,
      inningsUpdate: {
        totalRuns: newTotalRuns,
        totalWickets: newTotalWickets,
        totalBalls: newTotalBalls,
        totalOvers: newTotalOvers,
      },
    },
  })
}

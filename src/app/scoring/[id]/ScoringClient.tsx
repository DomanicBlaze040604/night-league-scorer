'use client'

import { useState, useEffect, useCallback } from 'react'
import { Match, Innings, BattingInnings, BowlingSpell, Ball, Player, WicketType } from '@/types/cricket'
import { formatOvers, calcRunRate, calcRequiredRunRate, calcProjectedScore } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, CheckCircle, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoringState {
  currentInningsNo: number
  inningsId: string | null
  currentOverId: string | null
  currentOverNo: number
  currentBallNo: number
  totalBalls: number
  strikerId: string | null
  nonStrikerId: string | null
  currentBowlerId: string | null
  isFreeHit: boolean
}

interface LiveInnings {
  id: string
  totalRuns: number
  totalWickets: number
  totalBalls: number
  extras: number
  wides: number
  noBalls: number
  byes: number
  legByes: number
  targetRuns?: number
  battingTeamId: string
  battingInnings: BattingInnings[]
  bowlingSpells: BowlingSpell[]
  currentOver: Ball[]
}

// ─── Ball Dot Display ─────────────────────────────────────────────────────────

function BallDot({ ball, size = 'sm' }: { ball: Ball | null; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  if (!ball) return <div className={`${s} rounded-full bg-gray-800/50 border border-gray-700/30`} />

  let bg = 'bg-gray-700'
  let text = '·'

  if (ball.isWicket) { bg = 'bg-red-600'; text = 'W' }
  else if (ball.extraType === 'WIDE') { bg = 'bg-yellow-700'; text = 'Wd' }
  else if (ball.extraType === 'NO_BALL') { bg = 'bg-orange-700'; text = 'Nb' }
  else if (ball.isSix) { bg = 'bg-purple-700'; text = '6' }
  else if (ball.isBoundary) { bg = 'bg-green-700'; text = '4' }
  else if (ball.runs + ball.extras > 0) { bg = 'bg-blue-700'; text = String(ball.runs + ball.extras) }

  return (
    <div className={`${s} rounded-full ${bg} flex items-center justify-center font-bold text-white`}>
      {text}
    </div>
  )
}

// ─── Player Selector ──────────────────────────────────────────────────────────

function PlayerSelector({
  players,
  value,
  onChange,
  label,
  exclude = [],
}: {
  players: Player[]
  value: string | null
  onChange: (id: string) => void
  label: string
  exclude?: string[]
}) {
  const available = players.filter(p => !exclude.includes(p.id) || p.id === value)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-4 py-3 text-sm appearance-none"
        >
          <option value="">Select player...</option>
          {available.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
    </div>
  )
}

// ─── Main Scoring Client ──────────────────────────────────────────────────────

export function ScoringClient({ match }: { match: Match }) {
  const [state, setState] = useState<ScoringState>({
    currentInningsNo: 1,
    inningsId: null,
    currentOverId: null,
    currentOverNo: 1,
    currentBallNo: 1,
    totalBalls: 0,
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    isFreeHit: false,
  })

  const [liveInnings, setLiveInnings] = useState<LiveInnings | null>(null)
  const [tossWinnerId, setTossWinnerId] = useState<string | null>(null)
  const [tossChoice, setTossChoice] = useState<'BAT' | 'BOWL'>('BAT')
  const [phase, setPhase] = useState<'toss' | 'setup' | 'scoring' | 'innings_break' | 'result'>('toss')
  const [showWicketModal, setShowWicketModal] = useState(false)
  const [wicketType, setWicketType] = useState<WicketType>('BOWLED')
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [newBatsmanId, setNewBatsmanId] = useState<string | null>(null)
  const [fielder1Id, setFielder1Id] = useState<string | null>(null)
  const [pendingRuns, setPendingRuns] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastBalls, setLastBalls] = useState<Ball[]>([])
  const [lastBallId, setLastBallId] = useState<string | null>(null)
  // Holds innings-2 data captured from the API during handleInningsEnd so startInnings2 doesn't re-call
  const [innings2Ready, setInnings2Ready] = useState<{
    id: string; overId: string; target: number; battingTeamId: string
  } | null>(null)
  // Two-step extra scoring: null = normal, 'NO_BALL' | 'WIDE' = waiting for run selection
  const [pendingExtra, setPendingExtra] = useState<'NO_BALL' | 'WIDE' | null>(null)

  const homeTeam = match.homeTeam!
  const awayTeam = match.awayTeam!
  const allPlayers = [...(homeTeam.players || []), ...(awayTeam.players || [])]
  const matchOvers = match.overs || 4
  const totalMatchBalls = matchOvers * 6

  // Initialize from existing match state (handles page refresh mid-match)
  useEffect(() => {
    if (match.status === 'LIVE' || match.status === 'INNINGS_BREAK') {
      const existingInnings = match.innings || []
      const liveInn = existingInnings.find(i => i.status === 'LIVE')

      if (liveInn) {
        const hasBattingSetup = (liveInn.battingInnings || []).length > 0

        if (hasBattingSetup) {
          // Innings is in progress — restore scoring state
          const overs = liveInn.overs || []
          const lastOver = overs[overs.length - 1]
          const currentBalls = lastOver?.balls || []
          setLiveInnings({
            id: liveInn.id,
            totalRuns: liveInn.totalRuns,
            totalWickets: liveInn.totalWickets,
            totalBalls: liveInn.totalBalls,
            extras: liveInn.extras,
            wides: liveInn.wides,
            noBalls: liveInn.noBalls,
            byes: liveInn.byes,
            legByes: liveInn.legByes,
            targetRuns: liveInn.targetRuns,
            battingTeamId: liveInn.battingTeamId,
            battingInnings: liveInn.battingInnings || [],
            bowlingSpells: liveInn.bowlingSpells || [],
            currentOver: currentBalls,
          })
          setState(s => ({
            ...s,
            inningsId: liveInn.id,
            currentInningsNo: liveInn.inningsNo,
            currentOverId: lastOver?.id || null,
            currentOverNo: lastOver?.overNo || 1,
            currentBallNo: currentBalls.filter(b => b.isLegalDelivery).length + 1,
            totalBalls: liveInn.totalBalls,
          }))
          setPhase(match.status === 'INNINGS_BREAK' ? 'innings_break' : 'scoring')
        } else if (liveInn.inningsNo === 2) {
          // Innings 2 was created in DB but players not yet set up (page was refreshed)
          const firstOver = (liveInn.overs || [])[0]
          setInnings2Ready({
            id: liveInn.id,
            overId: firstOver?.id || '',
            target: liveInn.targetRuns || 0,
            battingTeamId: liveInn.battingTeamId,
          })
          setPhase('innings_break')
        }
      } else if (match.status === 'INNINGS_BREAK') {
        setPhase('innings_break')
      }
    } else if (match.status === 'COMPLETED') {
      setPhase('result')
    }
  }, [match])

  // Supabase realtime
  useEffect(() => {
    if (!state.inningsId) return
    const channel = supabase
      .channel(`innings:${state.inningsId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'innings',
        filter: `id=eq.${state.inningsId}`,
      }, payload => {
        setLiveInnings(prev => prev ? { ...prev, ...payload.new } : null)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [state.inningsId])

  // Handle toss
  const handleToss = async () => {
    if (!tossWinnerId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/scoring/toss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, tossWinnerId, tossChoice }),
      })
      const json = await res.json()
      if (json.data) {
        const { innings, over } = json.data
        const battingTeam = innings.batting_team_id === homeTeam.id ? homeTeam : awayTeam
        setLiveInnings({
          id: innings.id,
          totalRuns: 0, totalWickets: 0, totalBalls: 0,
          extras: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0,
          battingTeamId: innings.batting_team_id,
          battingInnings: [], bowlingSpells: [], currentOver: [],
        })
        setState(s => ({
          ...s,
          inningsId: innings.id,
          currentOverId: over.id,
          currentOverNo: 1,
          currentBallNo: 1,
          totalBalls: 0,
        }))
        setPhase('setup')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Setup initial batsmen and bowler
  const handleSetupComplete = async () => {
    if (!state.strikerId || !state.nonStrikerId || !state.currentBowlerId || !state.inningsId) return
    setIsSubmitting(true)
    try {
      const battingTeamId = liveInnings?.battingTeamId!
      const battingTeamPlayers = (battingTeamId === homeTeam.id ? homeTeam.players : awayTeam.players) || []
      const bowlingTeamPlayers = (battingTeamId === homeTeam.id ? awayTeam.players : homeTeam.players) || []

      // Insert batting innings for striker and non-striker
      await supabase.from('batting_innings').insert([
        { innings_id: state.inningsId, player_id: state.strikerId, batting_order: 1, runs: 0, balls: 0, fours: 0, sixes: 0 },
        { innings_id: state.inningsId, player_id: state.nonStrikerId, batting_order: 2, runs: 0, balls: 0, fours: 0, sixes: 0 },
      ])

      // Insert bowling spell
      await supabase.from('bowling_spells').insert({
        innings_id: state.inningsId,
        player_id: state.currentBowlerId,
        overs: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, no_balls: 0, economy: 0,
      })

      // Update over with bowler
      if (state.currentOverId) {
        await supabase.from('overs').update({ bowler_id: state.currentBowlerId }).eq('id', state.currentOverId)
      }

      setLiveInnings(prev => prev ? {
        ...prev,
        battingInnings: [
          { id: 'temp1', inningsId: state.inningsId!, playerId: state.strikerId!, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, battingOrder: 1, player: battingTeamPlayers.find(p => p.id === state.strikerId) },
          { id: 'temp2', inningsId: state.inningsId!, playerId: state.nonStrikerId!, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, battingOrder: 2, player: battingTeamPlayers.find(p => p.id === state.nonStrikerId) },
        ],
        bowlingSpells: [
          { id: 'temp3', inningsId: state.inningsId!, playerId: state.currentBowlerId!, overs: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, economy: 0, player: bowlingTeamPlayers.find(p => p.id === state.currentBowlerId) },
        ],
      } : null)

      setPhase('scoring')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Score a ball
  const scoreBall = useCallback(async (ballData: {
    runs: number
    isWide?: boolean
    isNoBall?: boolean
    isBye?: boolean
    isLegBye?: boolean
    isWicket?: boolean
    wicketType?: WicketType
    dismissedBatsmanId?: string
    fielder1Id?: string
  }) => {
    if (!state.inningsId || !state.currentOverId || !state.strikerId || !state.currentBowlerId || isSubmitting) return
    setIsSubmitting(true)

    const isLegal = !ballData.isWide && !ballData.isNoBall
    const ballNo = isLegal ? state.currentBallNo : state.currentBallNo
    const totalRuns = ballData.runs + (ballData.isWide ? 1 : 0) + (ballData.isNoBall ? 1 : 0)

    try {
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inningsId: state.inningsId,
          matchId: match.id,
          overId: state.currentOverId,
          overNo: state.currentOverNo,
          ballNo: isLegal ? state.currentBallNo : 0,
          totalBallNo: state.totalBalls + (isLegal ? 1 : 0),
          batsmanId: state.strikerId,
          bowlerId: state.currentBowlerId,
          strikerId: state.strikerId,
          nonStrikerId: state.nonStrikerId,
          ball: ballData,
        }),
      })
      const json = await res.json()
      if (!json.data) throw new Error(json.error)

      const { inningsUpdate } = json.data

      // Track last ball for undo (clears after next ball or over change)
      setLastBallId(json.data.ball?.id || null)

      // Update local live innings
      setLiveInnings(prev => {
        if (!prev) return null
        const newBalls = [...prev.currentOver, json.data.ball]
        const updatedBatInnings = prev.battingInnings.map(bi => {
          if (bi.playerId === state.strikerId) {
            const batRuns = (ballData.isBye || ballData.isLegBye || ballData.isWide) ? 0 : ballData.runs
            return {
              ...bi,
              runs: bi.runs + batRuns,
              balls: bi.balls + (ballData.isWide ? 0 : 1),
              fours: bi.fours + (batRuns === 4 ? 1 : 0),
              sixes: bi.sixes + (batRuns === 6 ? 1 : 0),
              isOut: !!ballData.isWicket && ballData.dismissedBatsmanId === state.strikerId,
            }
          }
          return bi
        })
        const updatedBowlSpells = prev.bowlingSpells.map(bs => {
          if (bs.playerId === state.currentBowlerId) {
            const newBalls = bs.overs * 6 + (isLegal ? 1 : 0)
            return {
              ...bs,
              overs: newBalls / 6,
              runs: bs.runs + totalRuns,
              wickets: bs.wickets + (ballData.isWicket && ballData.wicketType !== 'RUN_OUT' ? 1 : 0),
              wides: bs.wides + (ballData.isWide ? 1 : 0),
              noBalls: bs.noBalls + (ballData.isNoBall ? 1 : 0),
              economy: newBalls > 0 ? (bs.runs + totalRuns) / (newBalls / 6) : 0,
            }
          }
          return bs
        })
        return {
          ...prev,
          ...inningsUpdate,
          battingInnings: updatedBatInnings,
          bowlingSpells: updatedBowlSpells,
          currentOver: newBalls,
        }
      })

      const newTotalBalls = inningsUpdate.totalBalls
      const newLegalBallsInOver = (state.currentBallNo - 1) + (isLegal ? 1 : 0)
      const overComplete = isLegal && newLegalBallsInOver >= 6

      // Update state
      if (isLegal) {
        // Rotate strike on 1,3,5 runs or end of over
        const shouldRotate = ballData.runs % 2 === 1 || overComplete
        setState(s => ({
          ...s,
          totalBalls: newTotalBalls,
          currentBallNo: overComplete ? 1 : s.currentBallNo + 1,
          strikerId: shouldRotate ? s.nonStrikerId : s.strikerId,
          nonStrikerId: shouldRotate ? s.strikerId : s.nonStrikerId,
          isFreeHit: !!ballData.isNoBall,
        }))
      }

      // Check over end
      if (overComplete) {
        const nextOverNo = state.currentOverNo + 1
        if (nextOverNo > matchOvers) {
          // Innings end
          await handleInningsEnd()
          return
        }
        // Create next over
        const { data: newOver } = await supabase.from('overs').insert({
          innings_id: state.inningsId,
          over_no: nextOverNo,
        }).select().single()

        if (newOver) {
          setState(s => ({
            ...s,
            currentOverNo: nextOverNo,
            currentOverId: newOver.id,
            currentBallNo: 1,
            currentBowlerId: null, // Prompt for new bowler
          }))
          setLiveInnings(prev => prev ? { ...prev, currentOver: [] } : null)
          setLastBallId(null) // Can't undo across over boundary
        }
      }

      // Check innings end (all out)
      if (inningsUpdate.totalWickets >= 10 || (state.currentInningsNo === 2 && inningsUpdate.totalRuns >= (liveInnings?.targetRuns || 999))) {
        await handleInningsEnd()
        return
      }

      // Show wicket modal
      if (ballData.isWicket) {
        setShowWicketModal(true)
      }

    } catch (err) {
      console.error('Scoring error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [state, liveInnings, isSubmitting, match.id, matchOvers])

  const undoLastBall = useCallback(async () => {
    if (!lastBallId || isSubmitting) return
    if (!confirm('Undo last ball? This will reverse the runs/wicket scored.')) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/scoring/undo?ballId=${lastBallId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { alert(json.error || 'Undo failed'); return }

      const { undoneRuns, undoneWicket, wasLegal } = json

      // Reverse local innings state
      setLiveInnings(prev => {
        if (!prev) return null
        const newBalls = [...prev.currentOver]
        newBalls.pop() // Remove last ball from current over display
        const updatedBatInnings = prev.battingInnings.map(bi => {
          if (bi.playerId === state.strikerId) {
            const isWide = json.ball?.extra_type === 'WIDE'
            const isByeOrLegBye = json.ball?.extra_type === 'BYE' || json.ball?.extra_type === 'LEG_BYE'
            const batRuns = (isWide || isByeOrLegBye) ? 0 : (json.ball?.runs || 0)
            return {
              ...bi,
              runs: Math.max(0, bi.runs - batRuns),
              balls: Math.max(0, bi.balls - (isWide ? 0 : 1)),
              fours: Math.max(0, bi.fours - (batRuns === 4 ? 1 : 0)),
              sixes: Math.max(0, bi.sixes - (batRuns === 6 ? 1 : 0)),
            }
          }
          return bi
        }).filter(bi => {
          // Remove the new batsman who came in after the wicket (if wicket was undone)
          if (undoneWicket && bi.balls === 0 && bi.runs === 0 && bi.playerId !== state.strikerId) {
            return false
          }
          return true
        })
        const updatedBowlSpells = prev.bowlingSpells.map(bs => {
          if (bs.playerId === state.currentBowlerId) {
            const newBowlerBalls = Math.max(0, Math.round(bs.overs * 6) - (wasLegal ? 1 : 0))
            return {
              ...bs,
              overs: newBowlerBalls / 6,
              runs: Math.max(0, bs.runs - undoneRuns),
              wickets: Math.max(0, bs.wickets - (undoneWicket ? 1 : 0)),
            }
          }
          return bs
        })
        return {
          ...prev,
          totalRuns: Math.max(0, prev.totalRuns - undoneRuns),
          totalWickets: Math.max(0, prev.totalWickets - (undoneWicket ? 1 : 0)),
          totalBalls: Math.max(0, prev.totalBalls - (wasLegal ? 1 : 0)),
          battingInnings: updatedBatInnings,
          bowlingSpells: updatedBowlSpells,
          currentOver: newBalls,
        }
      })
      // Reverse ball number
      setState(s => ({
        ...s,
        currentBallNo: Math.max(1, s.currentBallNo - (wasLegal ? 1 : 0)),
        totalBalls: Math.max(0, s.totalBalls - (wasLegal ? 1 : 0)),
      }))
      setLastBallId(null)
    } catch (err) {
      console.error('Undo error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [lastBallId, isSubmitting, state.strikerId, state.currentBowlerId])

  const handleInningsEnd = async () => {
    if (state.currentInningsNo === 1) {
      setIsSubmitting(true)
      try {
        const res = await fetch('/api/scoring/innings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match.id, innings1Id: state.inningsId }),
        })
        const json = await res.json()
        if (json.data) {
          // Save innings-2 data so startInnings2 can use it without a second API call
          const { innings2, over, target } = json.data
          setInnings2Ready({
            id: innings2.id,
            overId: over.id,
            target,
            battingTeamId: innings2.batting_team_id,
          })
        }
      } finally {
        setIsSubmitting(false)
      }
      setPhase('innings_break')
    } else {
      setIsSubmitting(true)
      try {
        await fetch('/api/scoring/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match.id, innings2Id: state.inningsId }),
        })
      } finally {
        setIsSubmitting(false)
      }
      setPhase('result')
    }
  }

  const startInnings2 = () => {
    if (!innings2Ready) return
    setLiveInnings({
      id: innings2Ready.id,
      totalRuns: 0, totalWickets: 0, totalBalls: 0,
      extras: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0,
      targetRuns: innings2Ready.target,
      battingTeamId: innings2Ready.battingTeamId,
      battingInnings: [], bowlingSpells: [], currentOver: [],
    })
    setState(s => ({
      ...s,
      inningsId: innings2Ready.id,
      currentInningsNo: 2,
      currentOverId: innings2Ready.overId,
      currentOverNo: 1,
      currentBallNo: 1,
      totalBalls: 0,
      strikerId: null,
      nonStrikerId: null,
      currentBowlerId: null,
    }))
    setPhase('setup')
  }

  // ─── Batting team players ─────────────────────────────────────────────────

  const battingTeamId = liveInnings?.battingTeamId
  const battingTeam = battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const bowlingTeam = battingTeamId === homeTeam.id ? awayTeam : homeTeam
  const battingPlayers = battingTeam?.players || []
  const bowlingPlayers = bowlingTeam?.players || []
  const outPlayers = liveInnings?.battingInnings.filter(bi => bi.isOut).map(bi => bi.playerId) || []
  const inPlayBatsmanIds = [state.strikerId, state.nonStrikerId].filter(Boolean) as string[]
  const availableBatsmen = battingPlayers.filter(p => !outPlayers.includes(p.id) && !inPlayBatsmanIds.includes(p.id))

  const striker = liveInnings?.battingInnings.find(bi => bi.playerId === state.strikerId)
  const nonStriker = liveInnings?.battingInnings.find(bi => bi.playerId === state.nonStrikerId)
  const currentBowler = liveInnings?.bowlingSpells.find(bs => bs.playerId === state.currentBowlerId)

  const crr = calcRunRate(liveInnings?.totalRuns || 0, liveInnings?.totalBalls || 0)
  const target = liveInnings?.targetRuns
  const rrr = target ? calcRequiredRunRate(
    target - (liveInnings?.totalRuns || 0),
    totalMatchBalls - (liveInnings?.totalBalls || 0)
  ) : null
  const projected = calcProjectedScore(liveInnings?.totalRuns || 0, liveInnings?.totalBalls || 0, totalMatchBalls)

  // ─── Toss Phase ───────────────────────────────────────────────────────────

  if (phase === 'toss') {
    return (
      <div className="min-h-screen pb-24 md:pb-8 max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/match/${match.id}`} className="text-gray-500 hover:text-green-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-green-50">Toss</h1>
        </div>

        <div className="cricket-card p-5 mb-5">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🪙</div>
            <h2 className="text-xl font-bold text-green-50">{homeTeam.name} vs {awayTeam.name}</h2>
            <div className="text-sm text-gray-500 mt-1">{match.tournament?.name} • Match {match.matchNumber}</div>
          </div>

          <div className="mb-5">
            <div className="text-sm text-gray-400 mb-2">Toss won by:</div>
            <div className="grid grid-cols-2 gap-3">
              {[homeTeam, awayTeam].map(team => (
                <button
                  key={team.id}
                  onClick={() => setTossWinnerId(team.id)}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    tossWinnerId === team.id
                      ? 'border-green-500 bg-green-900/40 text-green-400'
                      : 'border-[#1a2e1a] bg-[#111b11] text-gray-400 hover:border-green-800'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-2">Chose to:</div>
            <div className="grid grid-cols-2 gap-3">
              {(['BAT', 'BOWL'] as const).map(choice => (
                <button
                  key={choice}
                  onClick={() => setTossChoice(choice)}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    tossChoice === choice
                      ? 'border-green-500 bg-green-900/40 text-green-400'
                      : 'border-[#1a2e1a] bg-[#111b11] text-gray-400 hover:border-green-800'
                  }`}
                >
                  {choice === 'BAT' ? '🏏 Bat First' : '⚾ Bowl First'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleToss}
            disabled={!tossWinnerId || isSubmitting}
            className="w-full bg-green-500 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Starting...' : 'Start Match'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Setup Phase (pick batsmen/bowler) ────────────────────────────────────

  if (phase === 'setup') {
    const isInnings2 = state.currentInningsNo === 2
    return (
      <div className="min-h-screen pb-24 md:pb-8 max-w-lg mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-green-50 mb-1">
          {isInnings2 ? 'Innings 2 Setup' : 'Opening Setup'}
        </h1>
        <div className="text-sm text-gray-500 mb-5">
          {battingTeam?.name} batting
          {target && ` • Target: ${target}`}
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <PlayerSelector
            players={battingPlayers}
            value={state.strikerId}
            onChange={id => setState(s => ({ ...s, strikerId: id }))}
            label="Opening Batsman (Striker)"
            exclude={[state.nonStrikerId].filter(Boolean) as string[]}
          />
          <PlayerSelector
            players={battingPlayers}
            value={state.nonStrikerId}
            onChange={id => setState(s => ({ ...s, nonStrikerId: id }))}
            label="Opening Batsman (Non-Striker)"
            exclude={[state.strikerId].filter(Boolean) as string[]}
          />
          <PlayerSelector
            players={bowlingPlayers}
            value={state.currentBowlerId}
            onChange={id => setState(s => ({ ...s, currentBowlerId: id }))}
            label="Opening Bowler"
          />
        </div>

        <button
          onClick={handleSetupComplete}
          disabled={!state.strikerId || !state.nonStrikerId || !state.currentBowlerId || isSubmitting}
          className="w-full bg-green-500 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-50"
        >
          Start Innings
        </button>
      </div>
    )
  }

  // ─── Innings Break Phase ──────────────────────────────────────────────────

  if (phase === 'innings_break') {
    const inn1Score = liveInnings?.totalRuns ?? 0
    const inn1Wkts = liveInnings?.totalWickets ?? 0
    const target = (innings2Ready?.target) ?? inn1Score + 1
    const ready = !!innings2Ready

    return (
      <div className="min-h-screen pb-24 flex flex-col items-center justify-center max-w-lg mx-auto px-4">
        <div className="cricket-card p-8 text-center w-full">
          <div className="text-5xl mb-4">🏏</div>
          <h2 className="text-2xl font-bold text-green-50 mb-2">Innings Break</h2>
          <div className="text-green-400 text-3xl font-bold mb-1">
            {inn1Score}/{inn1Wkts}
          </div>
          <div className="text-gray-500 mb-6">
            {battingTeam?.name} scored {inn1Score} in {matchOvers} overs
            <br />
            Target: <span className="text-green-400 font-bold">{target}</span>
          </div>
          {ready ? (
            <button
              onClick={startInnings2}
              className="w-full bg-green-500 text-black font-bold py-4 rounded-xl text-lg"
            >
              Start 2nd Innings
            </button>
          ) : (
            <div className="text-gray-500 text-sm animate-pulse">Setting up 2nd innings…</div>
          )}
        </div>
      </div>
    )
  }

  // ─── Result Phase ─────────────────────────────────────────────────────────

  if (phase === 'result') {
    return (
      <div className="min-h-screen pb-24 flex flex-col items-center justify-center max-w-lg mx-auto px-4">
        <div className="cricket-card p-8 text-center w-full">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold gradient-text mb-4">Match Complete!</h2>
          <Link href={`/match/${match.id}`} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl text-lg block">
            View Scorecard
          </Link>
        </div>
      </div>
    )
  }

  // ─── New Bowler Modal ─────────────────────────────────────────────────────

  if (!state.currentBowlerId && phase === 'scoring') {
    return (
      <div className="min-h-screen pb-24 max-w-lg mx-auto px-4 py-6">
        <h2 className="text-lg font-bold text-green-50 mb-4">Select New Bowler</h2>
        <div className="text-sm text-gray-500 mb-4">Over {state.currentOverNo} bowler:</div>
        <PlayerSelector
          players={bowlingPlayers}
          value={state.currentBowlerId}
          onChange={async (id) => {
            // Insert/update bowling spell
            const existing = liveInnings?.bowlingSpells.find(bs => bs.playerId === id)
            if (!existing) {
              await supabase.from('bowling_spells').insert({
                innings_id: state.inningsId,
                player_id: id,
                overs: 0, maidens: 0, runs: 0, wickets: 0, wides: 0, no_balls: 0, economy: 0,
              })
            }
            if (state.currentOverId) {
              await supabase.from('overs').update({ bowler_id: id }).eq('id', state.currentOverId)
            }
            setState(s => ({ ...s, currentBowlerId: id }))
          }}
          label="Select Bowler"
        />
      </div>
    )
  }

  // ─── Wicket Modal ─────────────────────────────────────────────────────────

  if (showWicketModal) {
    return (
      <div className="min-h-screen pb-24 max-w-lg mx-auto px-4 py-6">
        <h2 className="text-lg font-bold text-green-50 mb-1">Wicket!</h2>
        <div className="text-sm text-gray-500 mb-5">Select dismissal details</div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-2">Wicket Type</div>
            <div className="grid grid-cols-2 gap-2">
              {(['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_OUT'] as WicketType[]).map(wt => (
                <button
                  key={wt}
                  onClick={() => setWicketType(wt)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    wicketType === wt
                      ? 'border-red-500 bg-red-900/30 text-red-400'
                      : 'border-[#1a2e1a] bg-[#111b11] text-gray-400'
                  }`}
                >
                  {wt.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {(wicketType === 'CAUGHT' || wicketType === 'RUN_OUT' || wicketType === 'STUMPED') && (
            <PlayerSelector
              players={bowlingPlayers}
              value={fielder1Id}
              onChange={setFielder1Id}
              label="Fielder"
            />
          )}

          {wicketType === 'RUN_OUT' && (
            <PlayerSelector
              players={battingPlayers.filter(p => inPlayBatsmanIds.includes(p.id))}
              value={dismissedId}
              onChange={setDismissedId}
              label="Dismissed Batsman"
            />
          )}

          <PlayerSelector
            players={availableBatsmen}
            value={newBatsmanId}
            onChange={setNewBatsmanId}
            label="Next Batsman"
          />

          <button
            onClick={async () => {
              if (!newBatsmanId) return
              setIsSubmitting(true)
              try {
                // Insert batting innings for new batsman
                const nextOrder = (liveInnings?.battingInnings.length || 0) + 1
                await supabase.from('batting_innings').insert({
                  innings_id: state.inningsId,
                  player_id: newBatsmanId,
                  batting_order: nextOrder,
                  runs: 0, balls: 0, fours: 0, sixes: 0,
                })

                const actualDismissed = dismissedId || state.strikerId
                const newStriker = actualDismissed === state.strikerId ? newBatsmanId : state.strikerId
                const newNonStriker = actualDismissed === state.strikerId ? state.nonStrikerId : newBatsmanId

                setState(s => ({
                  ...s,
                  strikerId: newStriker,
                  nonStrikerId: newNonStriker,
                }))

                setLiveInnings(prev => prev ? {
                  ...prev,
                  battingInnings: [
                    ...prev.battingInnings,
                    {
                      id: 'new-' + newBatsmanId,
                      inningsId: state.inningsId!,
                      playerId: newBatsmanId,
                      runs: 0, balls: 0, fours: 0, sixes: 0,
                      strikeRate: 0, isOut: false, battingOrder: nextOrder,
                      player: battingPlayers.find(p => p.id === newBatsmanId),
                    }
                  ],
                } : null)

                setShowWicketModal(false)
                setNewBatsmanId(null)
                setDismissedId(null)
                setFielder1Id(null)
              } finally {
                setIsSubmitting(false)
              }
            }}
            disabled={!newBatsmanId || isSubmitting}
            className="w-full bg-green-500 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Scoring UI ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24 md:pb-8 max-w-lg mx-auto">
      {/* Sticky Score Header */}
      <div className="sticky top-0 z-20 bg-[#0a0f0a]/95 backdrop-blur border-b border-[#1a2e1a] px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <Link href={`/match/${match.id}`} className="text-gray-500 hover:text-green-400">
            <ArrowLeft size={18} />
          </Link>
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500">{battingTeam?.name} batting</div>
            <div className="text-3xl font-bold score-display text-green-400">
              {liveInnings?.totalRuns}/{liveInnings?.totalWickets}
            </div>
            <div className="text-xs text-gray-400">
              {formatOvers(liveInnings?.totalBalls || 0)} / {matchOvers} overs
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>CRR: <span className="text-green-400">{crr.toFixed(1)}</span></div>
            {rrr !== null && <div>RRR: <span className={rrr > 12 ? 'text-red-400' : 'text-yellow-400'}>{rrr === 999 ? '∞' : rrr.toFixed(1)}</span></div>}
          </div>
        </div>

        {/* Target equation */}
        {target && (
          <div className="text-center text-xs text-gray-400 mt-1">
            Need {target - (liveInnings?.totalRuns || 0)} from {totalMatchBalls - (liveInnings?.totalBalls || 0)} balls
          </div>
        )}

        {/* Current over balls */}
        <div className="flex items-center gap-1.5 justify-center mt-2">
          <span className="text-xs text-gray-600 mr-1">Over {state.currentOverNo}:</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <BallDot key={i} ball={liveInnings?.currentOver[i] || null} size="sm" />
          ))}
        </div>

        {state.isFreeHit && (
          <div className="text-center text-xs text-yellow-400 font-bold mt-1">⚡ FREE HIT</div>
        )}
      </div>

      {/* Batsmen & Bowler */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        <div className="cricket-card p-3">
          <div className="text-xs text-gray-500 mb-2">Batting</div>
          {striker && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-sm font-semibold text-green-50 truncate">{striker.player?.name}</span>
                <span className="text-xs text-gray-600">*</span>
              </div>
              <div className="text-sm font-bold text-green-400 score-display">
                {striker.runs} <span className="text-xs text-gray-500">({striker.balls}b)</span>
              </div>
              <div className="text-xs text-gray-600">{striker.fours}×4  {striker.sixes}×6  SR:{striker.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(0) : 0}</div>
            </div>
          )}
          {nonStriker && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                <span className="text-xs text-gray-400 truncate">{nonStriker.player?.name}</span>
              </div>
              <div className="text-sm font-semibold text-gray-300 score-display">
                {nonStriker.runs} <span className="text-xs text-gray-500">({nonStriker.balls}b)</span>
              </div>
            </div>
          )}
        </div>

        <div className="cricket-card p-3">
          <div className="text-xs text-gray-500 mb-2">Bowling</div>
          {currentBowler && (
            <div>
              <div className="text-sm font-semibold text-green-50 truncate mb-1">{currentBowler.player?.name}</div>
              <div className="text-xs text-gray-400">
                {formatOvers(Math.round(currentBowler.overs * 6))}-{currentBowler.maidens}-{currentBowler.runs}-{currentBowler.wickets}
              </div>
              <div className="text-xs text-gray-600">Econ: {currentBowler.economy.toFixed(1)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Buttons */}
      <div className="px-4 pb-4">
        {/* Pending extra indicator */}
        {pendingExtra && (
          <div className="flex items-center justify-between bg-orange-900/40 border border-orange-700 rounded-xl px-4 py-2.5 mb-3">
            <span className="text-orange-300 font-bold text-sm">
              {pendingExtra === 'NO_BALL' ? '⚡ No Ball — now select runs' : '↔ Wide — now select extras'}
            </span>
            <button
              onClick={() => setPendingExtra(null)}
              className="text-gray-400 text-xs underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Runs */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[0, 1, 2, 3].map(run => (
            <button
              key={run}
              onClick={() => {
                if (pendingExtra === 'NO_BALL') { scoreBall({ runs: run, isNoBall: true }); setPendingExtra(null) }
                else if (pendingExtra === 'WIDE') { scoreBall({ runs: run, isWide: true }); setPendingExtra(null) }
                else scoreBall({ runs: run })
              }}
              disabled={isSubmitting}
              className={`score-btn h-20 rounded-2xl border font-bold text-3xl transition-all active:scale-90 disabled:opacity-40 ${
                pendingExtra
                  ? 'bg-orange-900/30 border-orange-700 text-orange-200'
                  : run === 0
                    ? 'bg-[#111b11] border-green-900 text-green-700'
                    : 'bg-[#1a2e1a] border-green-800 text-green-300'
              }`}
            >
              {run === 0 ? '·' : run}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => {
              if (pendingExtra === 'NO_BALL') { scoreBall({ runs: 4, isNoBall: true }); setPendingExtra(null) }
              else if (pendingExtra === 'WIDE') { scoreBall({ runs: 4, isWide: true }); setPendingExtra(null) }
              else scoreBall({ runs: 4 })
            }}
            disabled={isSubmitting}
            className={`score-btn h-20 rounded-2xl border font-bold text-3xl transition-all active:scale-90 disabled:opacity-40 ${
              pendingExtra ? 'bg-orange-900/40 border-orange-600 text-orange-300' : 'bg-green-900/60 border border-green-600 text-green-300'
            }`}
          >
            4
          </button>
          <button
            onClick={() => {
              if (pendingExtra === 'NO_BALL') { scoreBall({ runs: 6, isNoBall: true }); setPendingExtra(null) }
              else if (pendingExtra === 'WIDE') { scoreBall({ runs: 6, isWide: true }); setPendingExtra(null) }
              else scoreBall({ runs: 6 })
            }}
            disabled={isSubmitting}
            className={`score-btn h-20 rounded-2xl border font-bold text-3xl transition-all active:scale-90 disabled:opacity-40 ${
              pendingExtra ? 'bg-orange-900/40 border-orange-600 text-orange-300' : 'bg-purple-900/60 border border-purple-600 text-purple-300'
            }`}
          >
            6
          </button>
        </div>

        {/* Extras Row — disabled while pendingExtra is set */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => setPendingExtra('WIDE')}
            disabled={isSubmitting || !!pendingExtra}
            className="score-btn h-14 rounded-xl bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-sm font-bold active:scale-90 disabled:opacity-40"
          >
            Wide
          </button>
          <button
            onClick={() => setPendingExtra('NO_BALL')}
            disabled={isSubmitting || !!pendingExtra}
            className="score-btn h-14 rounded-xl bg-orange-900/40 border border-orange-700 text-orange-300 text-sm font-bold active:scale-90 disabled:opacity-40"
          >
            No Ball
          </button>
          <button
            onClick={() => scoreBall({ runs: 1, isBye: true })}
            disabled={isSubmitting || !!pendingExtra}
            className="score-btn h-14 rounded-xl bg-[#1a2e1a] border border-green-900 text-gray-400 text-sm font-medium active:scale-90 disabled:opacity-40"
          >
            Bye
          </button>
          <button
            onClick={() => scoreBall({ runs: 1, isLegBye: true })}
            disabled={isSubmitting || !!pendingExtra}
            className="score-btn h-14 rounded-xl bg-[#1a2e1a] border border-green-900 text-gray-400 text-sm font-medium active:scale-90 disabled:opacity-40"
          >
            Leg Bye
          </button>
        </div>

        {/* Wicket */}
        <button
          onClick={() => {
            setPendingExtra(null)
            setWicketType('BOWLED')
            setDismissedId(state.strikerId)
            scoreBall({ runs: 0, isWicket: true, wicketType: 'BOWLED', dismissedBatsmanId: state.strikerId || undefined })
          }}
          disabled={isSubmitting || !!pendingExtra}
          className="score-btn w-full h-16 rounded-2xl bg-red-900/60 border border-red-600 text-red-300 font-bold text-xl active:scale-90 disabled:opacity-40 mb-3"
        >
          OUT! 🔴
        </button>

        {/* Undo Last Ball */}
        {lastBallId && (
          <button
            onClick={undoLastBall}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl border border-yellow-800 text-yellow-400 text-sm font-medium mb-2 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
          >
            <RotateCcw size={14} /> Undo Last Ball
          </button>
        )}

        {/* Innings End */}
        <button
          onClick={handleInningsEnd}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl border border-gray-700 text-gray-500 text-sm font-medium"
        >
          End Innings / Declare
        </button>
      </div>
    </div>
  )
}

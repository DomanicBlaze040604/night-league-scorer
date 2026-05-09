'use client'
import { useEffect, useState } from 'react'
import { Match, Innings, Ball } from '@/types/cricket'
import { supabase } from '@/lib/supabase'
import { formatOvers, calcRunRate, calcRequiredRunRate } from '@/lib/utils'

interface LiveScoreboardProps {
  match: Match
  initialInnings: Innings[]
}

function BallDot({ ball }: { ball: Ball }) {
  let bg = 'bg-gray-700'
  let label = '·'
  if (ball.isWicket) { bg = 'bg-red-600'; label = 'W' }
  else if (ball.extraType === 'WIDE') { bg = 'bg-yellow-700'; label = 'Wd' }
  else if (ball.extraType === 'NO_BALL') { bg = 'bg-orange-700'; label = 'Nb' }
  else if (ball.isSix) { bg = 'bg-purple-700'; label = '6' }
  else if (ball.isBoundary) { bg = 'bg-green-700'; label = '4' }
  else if (ball.runs + ball.extras > 0) { bg = 'bg-blue-700'; label = String(ball.runs + ball.extras) }
  return (
    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center text-xs font-bold text-white`}>
      {label}
    </div>
  )
}

export function LiveScoreboard({ match, initialInnings }: LiveScoreboardProps) {
  const [innings, setInnings] = useState<Innings[]>(initialInnings)

  useEffect(() => {
    const channel = supabase
      .channel(`live-match:${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'innings', filter: `match_id=eq.${match.id}` },
        (payload) => {
          setInnings(prev =>
            prev.map(inn => inn.id === payload.new.id ? { ...inn, ...payload.new } : inn)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [match.id])

  const inn1 = innings.find(i => i.inningsNo === 1)
  const inn2 = innings.find(i => i.inningsNo === 2)
  const liveInnings = innings.find(i => i.status === 'LIVE') ?? inn2 ?? inn1

  if (!liveInnings) {
    return (
      <div className="cricket-card p-6 text-center text-gray-500">
        Match has not started yet.
      </div>
    )
  }

  const target = liveInnings.targetRuns
  const crr = calcRunRate(liveInnings.totalRuns, liveInnings.totalBalls)
  const rrr = target && liveInnings.inningsNo === 2
    ? calcRequiredRunRate(target - liveInnings.totalRuns, match.overs * 6 - liveInnings.totalBalls)
    : null
  const runsNeeded = target ? target - liveInnings.totalRuns : null

  const battingTeam = liveInnings.battingTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam
  const bowlingTeam = liveInnings.battingTeamId === match.homeTeamId ? match.awayTeam : match.homeTeam

  // Get last 6 legal balls from current innings for display
  const recentBalls: Ball[] = (liveInnings.balls ?? [])
    .filter(b => b.isLegalDelivery)
    .slice(-6)

  return (
    <div className="space-y-4">
      {/* Live badge */}
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 live-dot" />
        <span className="text-red-400 text-sm font-semibold tracking-wide">LIVE</span>
      </div>

      {/* Main score */}
      <div className="cricket-card p-6 text-center neon-glow">
        <div className="text-sm text-gray-400 mb-1">{battingTeam?.name}</div>
        <div className="text-6xl font-bold score-display text-green-400 mb-1">
          {liveInnings.totalRuns}/{liveInnings.totalWickets}
        </div>
        <div className="text-gray-400">
          {formatOvers(liveInnings.totalBalls)} / {match.overs} overs
        </div>

        {/* CRR / RRR */}
        <div className="flex justify-center gap-6 mt-3 text-sm">
          <div>
            <span className="text-gray-500">CRR </span>
            <span className="text-green-400 font-bold">{crr.toFixed(2)}</span>
          </div>
          {rrr !== null && (
            <div>
              <span className="text-gray-500">RRR </span>
              <span className={`font-bold ${rrr > 12 ? 'text-red-400' : 'text-yellow-400'}`}>
                {rrr === 999 ? '∞' : rrr.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Target equation */}
      {runsNeeded !== null && runsNeeded > 0 && (
        <div className="cricket-card p-4 text-center">
          <span className="text-gray-400 text-sm">
            {battingTeam?.name} need{' '}
            <span className="text-green-400 font-bold text-lg">{runsNeeded}</span>
            {' '}more runs from{' '}
            <span className="text-green-400 font-bold">{match.overs * 6 - liveInnings.totalBalls}</span>
            {' '}balls to win
          </span>
        </div>
      )}

      {/* Inn 1 score (when in inn 2) */}
      {inn1 && inn2 && (
        <div className="cricket-card p-3 flex items-center justify-between text-sm">
          <span className="text-gray-400">{bowlingTeam?.name ?? 'Bowling team'} scored</span>
          <span className="font-bold text-green-50 score-display">
            {inn1.totalRuns}/{inn1.totalWickets}{' '}
            <span className="text-gray-500 font-normal text-xs">({formatOvers(inn1.totalBalls)} ov)</span>
          </span>
        </div>
      )}

      {/* Last 6 balls */}
      {recentBalls.length > 0 && (
        <div className="cricket-card p-4">
          <div className="text-xs text-gray-500 mb-2">Last {recentBalls.length} ball{recentBalls.length !== 1 ? 's' : ''}</div>
          <div className="flex gap-2 flex-wrap">
            {recentBalls.map((b, i) => <BallDot key={i} ball={b} />)}
          </div>
        </div>
      )}

      {/* Batting & Bowling mini stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current batsmen */}
        <div className="cricket-card p-3">
          <div className="text-xs text-gray-500 mb-2">Batting</div>
          {(liveInnings.battingInnings ?? [])
            .filter(bi => !bi.isOut)
            .slice(0, 2)
            .map(bi => (
              <div key={bi.id} className="mb-1.5">
                <div className="text-xs font-semibold text-green-50 truncate">{bi.player?.name}</div>
                <div className="text-xs text-gray-500 score-display">{bi.runs} ({bi.balls}b)</div>
              </div>
            ))
          }
        </div>

        {/* Current bowler */}
        <div className="cricket-card p-3">
          <div className="text-xs text-gray-500 mb-2">Bowling</div>
          {(liveInnings.bowlingSpells ?? [])
            .slice(-1)
            .map(bs => (
              <div key={bs.id}>
                <div className="text-xs font-semibold text-green-50 truncate">{bs.player?.name}</div>
                <div className="text-xs text-gray-500">
                  {formatOvers(Math.round(bs.overs * 6))}-{bs.maidens}-{bs.runs}-{bs.wickets}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Result */}
      {match.resultText && (
        <div className="cricket-card p-4 text-center border border-green-800/50">
          <div className="text-green-400 font-bold">{match.resultText}</div>
        </div>
      )}
    </div>
  )
}

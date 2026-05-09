'use client'
import { Innings, Ball } from '@/types/cricket'
import { formatOvers, calcRunRate, calcRequiredRunRate } from '@/lib/utils'

interface ScoreHeaderProps {
  innings: Innings
  targetRuns?: number
  matchOvers: number
  teamName: string
  currentOverBalls?: Ball[]
}

function BallDot({ ball }: { ball: Ball | null }) {
  if (!ball) return <div className="w-7 h-7 rounded-full bg-gray-800/50 border border-gray-700/30" />

  let bg = 'bg-gray-700'
  let label = '·'

  if (ball.isWicket) { bg = 'bg-red-600'; label = 'W' }
  else if (ball.extraType === 'WIDE') { bg = 'bg-yellow-700'; label = 'Wd' }
  else if (ball.extraType === 'NO_BALL') { bg = 'bg-orange-700'; label = 'Nb' }
  else if (ball.isSix) { bg = 'bg-purple-700'; label = '6' }
  else if (ball.isBoundary) { bg = 'bg-green-700'; label = '4' }
  else if (ball.runs + ball.extras > 0) { bg = 'bg-blue-700'; label = String(ball.runs + ball.extras) }

  return (
    <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center text-xs font-bold text-white`}>
      {label}
    </div>
  )
}

export function ScoreHeader({ innings, targetRuns, matchOvers, teamName, currentOverBalls = [] }: ScoreHeaderProps) {
  const totalMatchBalls = matchOvers * 6
  const crr = calcRunRate(innings.totalRuns, innings.totalBalls)
  const rrr = targetRuns
    ? calcRequiredRunRate(targetRuns - innings.totalRuns, totalMatchBalls - innings.totalBalls)
    : null
  const runsNeeded = targetRuns ? targetRuns - innings.totalRuns : null
  const ballsLeft = totalMatchBalls - innings.totalBalls

  return (
    <div className="sticky top-0 z-20 bg-[#0a0f0a]/95 backdrop-blur border-b border-[#1a2e1a] px-4 py-3">
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 text-center">
          <div className="text-xs text-gray-500 mb-0.5">{teamName}</div>
          <div className="text-4xl font-bold score-display text-green-400">
            {innings.totalRuns}/{innings.totalWickets}
          </div>
          <div className="text-xs text-gray-500">
            {formatOvers(innings.totalBalls)} / {matchOvers} overs
          </div>
        </div>
        <div className="text-right text-xs space-y-1">
          <div>CRR <span className="text-green-400 font-bold">{crr.toFixed(2)}</span></div>
          {rrr !== null && (
            <div>
              RRR{' '}
              <span className={`font-bold ${rrr > 12 ? 'text-red-400' : rrr > 8 ? 'text-yellow-400' : 'text-green-400'}`}>
                {rrr === 999 ? '∞' : rrr.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {runsNeeded !== null && ballsLeft >= 0 && (
        <div className="text-center text-xs text-gray-400 mb-2">
          Need <span className="text-green-400 font-bold">{runsNeeded}</span> from{' '}
          <span className="text-green-400 font-bold">{ballsLeft}</span> balls
        </div>
      )}

      <div className="flex items-center gap-1.5 justify-center">
        <span className="text-xs text-gray-600 mr-1">This over:</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <BallDot key={i} ball={currentOverBalls[i] ?? null} />
        ))}
      </div>
    </div>
  )
}

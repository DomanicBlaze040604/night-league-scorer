'use client'
import { BowlingSpell, Ball } from '@/types/cricket'
import { formatOvers } from '@/lib/utils'

interface BowlerDisplayProps {
  bowler: BowlingSpell | null
  currentOverBalls?: Ball[]
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
    <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center text-xs font-bold text-white`}>
      {label}
    </div>
  )
}

export function BowlerDisplay({ bowler, currentOverBalls = [] }: BowlerDisplayProps) {
  if (!bowler) {
    return (
      <div className="cricket-card p-3 text-center text-gray-600 text-sm">
        Select bowler
      </div>
    )
  }

  const overs = formatOvers(Math.round(bowler.overs * 6))

  return (
    <div className="cricket-card p-3">
      <div className="text-xs text-gray-500 mb-1">Bowling</div>
      <div className="font-medium text-green-50 text-sm truncate mb-1">
        {bowler.player?.name ?? 'Unknown'}
      </div>
      <div className="text-xs text-gray-400 mb-2">
        {overs}-{bowler.maidens}-{bowler.runs}-{bowler.wickets}
        <span className="ml-2 text-gray-600">Econ: {bowler.economy.toFixed(1)}</span>
      </div>
      {currentOverBalls.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {currentOverBalls.map((b, i) => <BallDot key={i} ball={b} />)}
        </div>
      )}
    </div>
  )
}

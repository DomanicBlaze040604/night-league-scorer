'use client'
import Link from 'next/link'
import { Match } from '@/types/cricket'
import { formatDateTime, formatOvers } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface MatchCardProps {
  match: Match
  compact?: boolean
}

const statusStyles: Record<string, string> = {
  LIVE: 'bg-red-900/40 text-red-400 border-red-800/50',
  COMPLETED: 'bg-gray-900/40 text-gray-400 border-gray-800/50',
  SCHEDULED: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  INNINGS_BREAK: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
  TOSS: 'bg-purple-900/40 text-purple-400 border-purple-800/50',
}

export function MatchCard({ match, compact }: MatchCardProps) {
  const inn1 = match.innings?.find(i => i.inningsNo === 1)
  const inn2 = match.innings?.find(i => i.inningsNo === 2)
  const isLive = match.status === 'LIVE' || match.status === 'INNINGS_BREAK'

  return (
    <Link
      href={`/match/${match.id}`}
      className="cricket-card p-4 hover:border-green-700 transition-all group block"
    >
      {/* Status + Meta row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusStyles[match.status] ?? statusStyles.SCHEDULED}`}>
            {match.status === 'LIVE' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
            )}
            {match.status.replace(/_/g, ' ')}
          </span>
          {match.isFinal && (
            <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-800/30 px-1.5 py-0.5 rounded font-semibold">
              FINAL
            </span>
          )}
          <span className="text-xs text-gray-600">M{match.matchNumber}</span>
        </div>
        {!compact && (
          <span className="text-xs text-gray-600">{formatDateTime(match.scheduledAt)}</span>
        )}
      </div>

      {/* Teams + Scores */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Team names */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm truncate max-w-[130px] ${match.winnerTeamId === match.homeTeamId ? 'text-green-400' : 'text-green-50'}`}>
              {match.homeTeam?.name}
            </span>
            <span className="text-gray-600 text-xs flex-shrink-0">vs</span>
            <span className={`font-semibold text-sm truncate max-w-[130px] ${match.winnerTeamId === match.awayTeamId ? 'text-green-400' : 'text-green-50'}`}>
              {match.awayTeam?.name}
            </span>
          </div>

          {/* Result */}
          {match.resultText && (
            <div className="text-xs text-green-400 font-medium">{match.resultText}</div>
          )}

          {/* Toss info for live */}
          {isLive && match.tossWinnerId && !match.resultText && (
            <div className="text-xs text-gray-600">
              {match.tossWinnerId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name}
              {' '}won toss, chose to {match.tossChoice?.toLowerCase()}
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="flex flex-col items-end gap-0.5 ml-3 text-xs font-mono flex-shrink-0">
          {inn1 && (
            <span className="text-green-50 font-semibold">
              {inn1.totalRuns}/{inn1.totalWickets}
              <span className="text-gray-500 font-normal ml-1">
                ({formatOvers(inn1.totalBalls)})
              </span>
            </span>
          )}
          {inn2 && (
            <span className="text-green-50 font-semibold">
              {inn2.totalRuns}/{inn2.totalWickets}
              <span className="text-gray-500 font-normal ml-1">
                ({formatOvers(inn2.totalBalls)})
              </span>
            </span>
          )}
          <ChevronRight
            size={14}
            className="text-gray-700 group-hover:text-green-400 transition-colors mt-1"
          />
        </div>
      </div>
    </Link>
  )
}

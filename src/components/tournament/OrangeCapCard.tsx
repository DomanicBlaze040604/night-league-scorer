'use client'
import { Player, Team } from '@/types/cricket'

interface LeaderboardEntry {
  player: Player
  team: Team
  value: number
  extra: string
}

interface OrangeCapCardProps {
  type: 'batting' | 'bowling'
  players: LeaderboardEntry[]
}

const medals = ['🥇', '🥈', '🥉']

export function OrangeCapCard({ type, players }: OrangeCapCardProps) {
  const isBatting = type === 'batting'
  const title = isBatting ? '🟠 Orange Cap' : '🟣 Purple Cap'
  const subtitle = isBatting ? 'Top Run Scorers' : 'Top Wicket Takers'
  const valueLabel = isBatting ? 'Runs' : 'Wkts'
  const accentColor = isBatting ? 'text-orange-400' : 'text-purple-400'
  const borderColor = isBatting ? 'border-orange-800/30' : 'border-purple-800/30'
  const bgColor = isBatting ? 'bg-orange-900/10' : 'bg-purple-900/10'

  if (players.length === 0) {
    return (
      <div className="cricket-card p-4 text-center text-gray-600 text-sm">
        <div className="text-2xl mb-2">{isBatting ? '🟠' : '🟣'}</div>
        No data yet
      </div>
    )
  }

  return (
    <div className={`cricket-card overflow-hidden border ${borderColor}`}>
      {/* Header */}
      <div className={`${bgColor} px-4 py-3 border-b border-[#1a2e1a]`}>
        <div className="font-bold text-green-50">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#1a2e1a]">
        {players.slice(0, 10).map((entry, i) => (
          <div
            key={entry.player.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-900/5 transition-colors"
          >
            {/* Rank */}
            <div className="w-6 text-center flex-shrink-0">
              {i < 3
                ? <span className="text-base">{medals[i]}</span>
                : <span className="text-xs text-gray-600 font-mono">{i + 1}</span>
              }
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center text-xs font-bold text-green-400 flex-shrink-0">
              {entry.player.name.charAt(0)}
            </div>

            {/* Name + Team */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-green-50 text-sm truncate">{entry.player.name}</div>
              <div className="text-xs text-gray-500 truncate">{entry.team.name}</div>
            </div>

            {/* Value + Extra */}
            <div className="text-right flex-shrink-0">
              <div className={`font-bold text-base score-display ${accentColor}`}>
                {Math.round(entry.value)}
              </div>
              <div className="text-xs text-gray-600">{entry.extra}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

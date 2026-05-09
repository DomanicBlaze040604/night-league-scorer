'use client'
import { PointsTableEntry } from '@/types/cricket'
import { formatNRR } from '@/lib/utils'

interface PointsTableProps {
  entries: PointsTableEntry[]
  showQualification?: boolean
}

export function PointsTableComponent({ entries, showQualification = true }: PointsTableProps) {
  const sorted = [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return b.nrr - a.nrr
  })

  if (sorted.length === 0) {
    return (
      <div className="cricket-card p-6 text-center text-gray-600 text-sm">
        No points table data yet.
      </div>
    )
  }

  return (
    <div className="cricket-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-green-900/20 text-xs text-gray-500 border-b border-[#1a2e1a]">
              <th className="text-left px-4 py-2.5 w-8">#</th>
              <th className="text-left px-4 py-2.5">Team</th>
              <th className="text-center px-3 py-2.5">P</th>
              <th className="text-center px-3 py-2.5">W</th>
              <th className="text-center px-3 py-2.5">L</th>
              <th className="text-center px-3 py-2.5">T</th>
              <th className="text-center px-3 py-2.5">NR</th>
              <th className="text-center px-3 py-2.5 text-green-400 font-bold">Pts</th>
              <th className="text-center px-3 py-2.5">NRR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => {
              const qualifies = i < 2
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-[#1a2e1a]/60 hover:bg-green-900/5 transition-colors ${
                    qualifies ? 'border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-green-50">{entry.team?.name}</td>
                  <td className="text-center px-3 py-3 text-gray-400">{entry.played}</td>
                  <td className="text-center px-3 py-3 text-green-400 font-medium">{entry.won}</td>
                  <td className="text-center px-3 py-3 text-red-400">{entry.lost}</td>
                  <td className="text-center px-3 py-3 text-gray-500">{entry.tied}</td>
                  <td className="text-center px-3 py-3 text-gray-500">{entry.noResult}</td>
                  <td className="text-center px-3 py-3 font-bold text-green-400 text-base">{entry.points}</td>
                  <td className={`text-center px-3 py-3 text-xs font-mono ${entry.nrr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatNRR(entry.nrr)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showQualification && sorted.length >= 2 && (
        <div className="px-4 py-2.5 border-t border-[#1a2e1a] flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-green-500 flex-shrink-0" />
          <span className="text-xs text-gray-500">Top 2 qualify for the Final</span>
        </div>
      )}
    </div>
  )
}

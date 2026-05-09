import { createServerClient } from '@/lib/supabase'
import { BarChart3 } from 'lucide-react'
import { formatNRR, transformKeys } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Points Table' }

interface PTEntry {
  id: string
  tournamentId: string
  teamId: string
  played: number
  won: number
  lost: number
  tied: number
  noResult: number
  points: number
  nrr: number
  team?: { name: string }
  tournament?: { name: string }
}

async function getData() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('points_table')
    .select('*, team:teams(*), tournament:tournaments(*)')
    .order('points', { ascending: false })
  return transformKeys<PTEntry[]>(data || [])
}

export default async function PointsTablePage() {
  const entries = await getData()

  // Group by tournament
  const byTournament: Record<string, { name: string; entries: PTEntry[] }> = {}
  for (const e of entries) {
    const tid = e.tournamentId
    if (!byTournament[tid]) byTournament[tid] = { name: e.tournament?.name || 'Tournament', entries: [] }
    byTournament[tid].entries.push(e)
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-green-50 mb-6 flex items-center gap-2">
          <BarChart3 size={24} className="text-green-400" />
          Points Table
        </h1>

        {Object.entries(byTournament).length === 0 && (
          <div className="text-center py-20">
            <BarChart3 size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No matches played yet.</p>
          </div>
        )}

        {Object.entries(byTournament).map(([tid, { name, entries: tEntries }]) => {
          const sorted = [...tEntries].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return b.nrr - a.nrr
          })
          return (
            <section key={tid} className="mb-8">
              <h2 className="text-sm font-semibold text-green-400 mb-3">{name}</h2>
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
                      {sorted.map((entry, i) => (
                        <tr
                          key={entry.id}
                          className={`border-b border-[#1a2e1a]/60 hover:bg-green-900/5 transition-colors ${
                            i < 2 ? 'border-l-2 border-l-green-500' : ''
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
                      ))}
                    </tbody>
                  </table>
                </div>
                {sorted.length >= 2 && (
                  <div className="px-4 py-2.5 border-t border-[#1a2e1a] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500">Top 2 qualify for the Final</span>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

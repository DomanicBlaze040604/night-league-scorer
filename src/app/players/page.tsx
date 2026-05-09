import { createServerClient } from '@/lib/supabase'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Players' }

async function getData() {
  const supabase = createServerClient()
  const [{ data: players }, { data: battingRows }, { data: bowlingRows }] = await Promise.all([
    supabase.from('players').select('id, name, role, jersey_no, team_id, teams(id, name)').eq('is_active', true).order('name'),
    // actual batting_innings columns: runs, balls, fours, sixes
    supabase.from('batting_innings').select('player_id, runs, balls, fours, sixes'),
    // actual bowling_spells columns: overs, runs, wickets, maidens
    supabase.from('bowling_spells').select('player_id, overs, runs, wickets, maidens'),
  ])

  // Aggregate batting stats per player
  const battingMap: Record<string, { runs: number; balls: number; fours: number; sixes: number; innings: number; highest: number }> = {}
  for (const row of battingRows || []) {
    const pid = row.player_id as string
    if (!battingMap[pid]) battingMap[pid] = { runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0, highest: 0 }
    battingMap[pid].runs += row.runs || 0
    battingMap[pid].balls += row.balls || 0
    battingMap[pid].fours += row.fours || 0
    battingMap[pid].sixes += row.sixes || 0
    battingMap[pid].innings += 1
    if ((row.runs || 0) > battingMap[pid].highest) battingMap[pid].highest = row.runs || 0
  }

  // Aggregate bowling stats per player
  const bowlingMap: Record<string, { wickets: number; runs: number; overs: number; maidens: number }> = {}
  for (const row of bowlingRows || []) {
    const pid = row.player_id as string
    if (!bowlingMap[pid]) bowlingMap[pid] = { wickets: 0, runs: 0, overs: 0, maidens: 0 }
    bowlingMap[pid].wickets += row.wickets || 0
    bowlingMap[pid].runs += row.runs || 0
    bowlingMap[pid].overs += row.overs || 0
    bowlingMap[pid].maidens += row.maidens || 0
  }

  return { players: players || [], battingMap, bowlingMap }
}

export default async function PlayersPage() {
  const { players, battingMap, bowlingMap } = await getData()

  // Group by team
  const teams: Record<string, { name: string; players: typeof players }> = {}
  for (const p of players) {
    const teamId = p.team_id as string
    const teamName = (p.teams as { name?: string })?.name || 'Unknown'
    if (!teams[teamId]) teams[teamId] = { name: teamName, players: [] }
    teams[teamId].players.push(p)
  }

  // Orange cap (most runs) and Purple cap (most wickets)
  let topBatsmanRuns = 0, topBatsmanName = ''
  let topBowlerWickets = 0, topBowlerName = ''

  for (const p of players) {
    const b = battingMap[p.id]
    if (b && b.runs > topBatsmanRuns) { topBatsmanRuns = b.runs; topBatsmanName = p.name }
    const bw = bowlingMap[p.id]
    if (bw && bw.wickets > topBowlerWickets) { topBowlerWickets = bw.wickets; topBowlerName = p.name }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-green-50 mb-6 flex items-center gap-2">
          <Users size={24} className="text-green-400" />
          Players
        </h1>

        {/* Awards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="cricket-card p-4">
            <div className="text-xs text-gray-500 mb-1">🟠 Orange Cap</div>
            <div className="font-bold text-green-50">{topBatsmanRuns > 0 ? topBatsmanName : 'TBD'}</div>
            {topBatsmanRuns > 0 && <div className="text-xs text-orange-400">{topBatsmanRuns} runs</div>}
          </div>
          <div className="cricket-card p-4">
            <div className="text-xs text-gray-500 mb-1">🟣 Purple Cap</div>
            <div className="font-bold text-green-50">{topBowlerWickets > 0 ? topBowlerName : 'TBD'}</div>
            {topBowlerWickets > 0 && <div className="text-xs text-purple-400">{topBowlerWickets} wickets</div>}
          </div>
        </div>

        {/* Players by team */}
        {Object.entries(teams).map(([teamId, { name, players: teamPlayers }]) => (
          <section key={teamId} className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3">{name}</h2>
            <div className="cricket-card overflow-hidden">
              {teamPlayers.map((player, i) => {
                const bs = battingMap[player.id]
                const bw = bowlingMap[player.id]
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between px-4 py-3 ${i < teamPlayers.length - 1 ? 'border-b border-[#1a2e1a]' : ''} hover:bg-green-900/10 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center text-green-400 text-xs font-bold">
                        {player.jersey_no || player.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-green-50 text-sm">{player.name}</div>
                        {player.role && <div className="text-xs text-gray-500">{player.role}</div>}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      {bs && bs.runs > 0 && <span className="text-orange-400">{bs.runs}R</span>}
                      {bw && bw.wickets > 0 && <span className="text-purple-400">{bw.wickets}W</span>}
                      {(!bs || bs.runs === 0) && (!bw || bw.wickets === 0) && <span className="text-gray-600">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {players.length === 0 && (
          <div className="text-center py-20">
            <Users size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">Players will appear after the tournament starts.</p>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Activity } from 'lucide-react'
import { formatOvers } from '@/lib/utils'

interface Player {
  id: string; name: string; jerseyNo: number; role?: string
  runs?: number; wickets?: number; balls?: number
}

interface Match {
  id: string; matchNumber: number; status: string; isFinal: boolean
  homeTeamId: string; awayTeamId: string; resultText?: string
  homeTeam: { name: string }; awayTeam: { name: string }
  innings: { battingTeamId: string; totalRuns: number; totalWickets: number; totalBalls: number }[]
}

interface TeamData {
  id: string; name: string; shortName: string; primaryColor: string
  players: Player[]
  matches: Match[]
  points: { played: number; won: number; lost: number; points: number; nrr: number }
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/teams/${id}`)
      .then(r => r.json())
      .then(d => { setTeam(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-green-400 animate-pulse">Loading…</div>
    </div>
  )
  if (!team) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Team not found.</div>
    </div>
  )

  const completedMatches = team.matches.filter(m => m.status === 'COMPLETED')
  const upcomingMatches = team.matches.filter(m => m.status === 'SCHEDULED')

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/tournaments" className="text-gray-500 hover:text-green-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="text-xs text-gray-500">{team.shortName}</div>
            <h1 className="text-2xl font-bold text-green-50">{team.name}</h1>
          </div>
        </div>

        {/* Stats */}
        {team.points && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Played', value: team.points.played, color: 'text-gray-400' },
              { label: 'Won', value: team.points.won, color: 'text-green-400' },
              { label: 'Lost', value: team.points.lost, color: 'text-red-400' },
              { label: 'Points', value: team.points.points, color: 'text-yellow-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="cricket-card p-3 text-center">
                <div className={`text-2xl font-bold score-display ${color}`}>{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Players */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
            <Users size={14} className="text-green-400" /> Squad ({team.players.length})
          </h2>
          <div className="cricket-card overflow-hidden">
            {team.players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 hover:bg-green-900/10 transition-colors ${i < team.players.length - 1 ? 'border-b border-[#1a2e1a]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center text-green-400 text-xs font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-green-50 text-sm flex items-center gap-2">
                      {p.name}
                      {p.role === 'CAPTAIN' && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">C</span>}
                    </div>
                    <div className="text-xs text-gray-500">#{p.jerseyNo}</div>
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  {(p.runs ?? 0) > 0 && <span className="text-orange-400 font-medium">{p.runs}R</span>}
                  {(p.wickets ?? 0) > 0 && <span className="text-purple-400 font-medium">{p.wickets}W</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Matches */}
        {completedMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-green-400" /> Results ({completedMatches.length})
            </h2>
            <div className="flex flex-col gap-2">
              {completedMatches.map(m => {
                const isHome = m.homeTeamId === id
                const opponent = isHome ? m.awayTeam : m.homeTeam
                const teamInn = m.innings.find(i => i.battingTeamId === id)
                const oppInn = m.innings.find(i => i.battingTeamId !== id)
                return (
                  <Link key={m.id} href={`/match/${m.id}`} className="cricket-card p-3 hover:border-green-700 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">vs {opponent?.name} • M{m.matchNumber}{m.isFinal ? ' FINAL' : ''}</div>
                        {m.resultText && <div className="text-xs text-green-400">{m.resultText}</div>}
                      </div>
                      <div className="text-xs font-mono text-right">
                        {teamInn && <div className="text-green-50">{teamInn.totalRuns}/{teamInn.totalWickets} <span className="text-gray-600">({formatOvers(teamInn.totalBalls)})</span></div>}
                        {oppInn && <div className="text-gray-400">{oppInn.totalRuns}/{oppInn.totalWickets} <span className="text-gray-600">({formatOvers(oppInn.totalBalls)})</span></div>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcomingMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3">Upcoming</h2>
            <div className="flex flex-col gap-2">
              {upcomingMatches.map(m => {
                const isHome = m.homeTeamId === id
                const opponent = isHome ? m.awayTeam : m.homeTeam
                return (
                  <Link key={m.id} href={`/match/${m.id}`} className="cricket-card p-3 hover:border-green-700 transition-all">
                    <div className="text-xs text-gray-500">M{m.matchNumber}{m.isFinal ? ' FINAL' : ''} • vs {opponent?.name}</div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Edit link */}
        <Link
          href={`/admin/teams/${id}`}
          className="w-full py-3 rounded-xl border border-green-800/50 text-green-400 text-sm font-medium text-center block hover:bg-green-900/20 transition-colors"
        >
          Edit Team / Players
        </Link>
      </div>
    </div>
  )
}

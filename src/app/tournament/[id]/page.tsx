import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Users, Activity, Calendar, BarChart3, ChevronRight } from 'lucide-react'
import { Tournament, Match, PointsTableEntry } from '@/types/cricket'
import { formatDate, formatNRR, transformKeys } from '@/lib/utils'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

async function getTournament(id: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_teams(*, team:teams(*, players(*))),
      matches(
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        winner_team:teams!matches_winner_team_id_fkey(*),
        innings(*)
      ),
      points_table(*, team:teams(*))
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return transformKeys<Tournament & { matches: Match[]; pointsTable: PointsTableEntry[] }>(data)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getTournament(id)
  return { title: t?.name || 'Tournament' }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    LIVE: 'bg-red-900/40 text-red-400 border-red-800/50',
    COMPLETED: 'bg-gray-900/40 text-gray-400 border-gray-800/50',
    SCHEDULED: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
    INNINGS_BREAK: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || styles.SCHEDULED}`}>
      {status === 'LIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 live-dot mr-1" />}
      {status}
    </span>
  )
}

export default async function TournamentPage({ params }: Props) {
  const { id } = await params
  const tournament = await getTournament(id)
  if (!tournament) notFound()

  const matches = tournament.matches || []
  const liveMatches = matches.filter(m => m.status === 'LIVE')
  const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED')
  const completedMatches = matches.filter(m => m.status === 'COMPLETED')
  const pointsTable = (tournament.pointsTable || []).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return b.nrr - a.nrr
  })
  const teams = ((tournament.tournamentTeams || []).map((tt: { team?: { name: string; id: string; players?: unknown[] } }) => tt.team).filter(Boolean)) as { name: string; id: string; players?: unknown[] }[]

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="cricket-card p-5 mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Tournament</div>
              <h1 className="text-2xl font-bold gradient-text">{tournament.name}</h1>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${
              tournament.status === 'ACTIVE' ? 'bg-green-900/40 text-green-400 border-green-800/50' :
              tournament.status === 'UPCOMING' ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' :
              'bg-gray-900/40 text-gray-400 border-gray-800/50'
            }`}>
              {tournament.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(tournament.startDate)}</span>
            <span className="flex items-center gap-1"><Users size={11} /> {teams.length} Teams</span>
            <span>{tournament.overs} Overs/Innings</span>
            <span>{tournament.format?.replace(/_/g, ' ')}</span>
            {tournament.location && <span>📍 {tournament.location}</span>}
          </div>
        </div>

        {/* Points Table */}
        {pointsTable.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-green-400" /> Points Table
            </h2>
            <div className="cricket-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="bg-green-900/20 text-xs text-gray-400">
                      <th className="text-left px-4 py-2.5 w-8">#</th>
                      <th className="text-left px-4 py-2.5">Team</th>
                      <th className="px-3 py-2.5 text-center">P</th>
                      <th className="px-3 py-2.5 text-center">W</th>
                      <th className="px-3 py-2.5 text-center">L</th>
                      <th className="px-3 py-2.5 text-center font-bold text-green-400">Pts</th>
                      <th className="px-3 py-2.5 text-center">NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsTable.map((entry, i) => (
                      <tr key={entry.id} className={`border-t border-[#1a2e1a] ${i < 2 ? 'border-l-2 border-l-green-500' : ''}`}>
                        <td className="px-4 py-3 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-green-50">{entry.team?.name}</td>
                        <td className="px-3 py-3 text-center text-gray-400">{entry.played}</td>
                        <td className="px-3 py-3 text-center text-green-400 font-medium">{entry.won}</td>
                        <td className="px-3 py-3 text-center text-red-400">{entry.lost}</td>
                        <td className="px-3 py-3 text-center font-bold text-green-400">{entry.points}</td>
                        <td className={`px-3 py-3 text-center text-xs ${entry.nrr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatNRR(entry.nrr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pointsTable.length >= 2 && (
                <div className="px-4 py-2 text-xs text-gray-600 border-t border-[#1a2e1a]">
                  🟢 Top 2 qualify for the Final
                </div>
              )}
            </div>
          </section>
        )}

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
              Live Matches
            </h2>
            <div className="flex flex-col gap-3">
              {liveMatches.map(m => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Fixtures */}
        {scheduledMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-green-400" />
              Fixtures ({scheduledMatches.length})
            </h2>
            <div className="flex flex-col gap-2">
              {scheduledMatches.map(m => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-green-400" />
              Results ({completedMatches.length})
            </h2>
            <div className="flex flex-col gap-2">
              {completedMatches.slice(0, 6).map(m => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          </section>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <Users size={14} className="text-green-400" />
              Teams
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {teams.map((team) => (
                <Link key={team.id} href={`/team/${team.id}`} className="cricket-card p-4 hover:border-green-700 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-green-50 text-sm">{team.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{team.players?.length || 0} players</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-green-400" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function MatchRow({ match }: { match: Match }) {
  const inn1 = match.innings?.find(i => i.inningsNo === 1)
  const inn2 = match.innings?.find(i => i.inningsNo === 2)

  return (
    <Link href={`/match/${match.id}`} className="cricket-card p-4 hover:border-green-700 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-gray-500">M{match.matchNumber}</span>
            {match.isFinal && <span className="text-xs bg-yellow-900/30 text-yellow-400 px-1.5 py-0.5 rounded">FINAL</span>}
            <StatusBadge status={match.status} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-semibold truncate ${match.winnerTeamId === match.homeTeamId ? 'text-green-400' : 'text-green-50'}`}>
              {match.homeTeam?.name}
            </span>
            <span className="text-gray-600 text-xs flex-shrink-0">vs</span>
            <span className={`font-semibold truncate ${match.winnerTeamId === match.awayTeamId ? 'text-green-400' : 'text-green-50'}`}>
              {match.awayTeam?.name}
            </span>
          </div>
          {match.resultText && (
            <div className="text-xs text-green-400 mt-1">{match.resultText}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 ml-3 text-xs font-mono">
          {inn1 && <span className="text-green-50">{inn1.totalRuns}/{inn1.totalWickets}</span>}
          {inn2 && <span className="text-green-50">{inn2.totalRuns}/{inn2.totalWickets}</span>}
          <ChevronRight size={14} className="text-gray-600 group-hover:text-green-400 mt-1" />
        </div>
      </div>
    </Link>
  )
}


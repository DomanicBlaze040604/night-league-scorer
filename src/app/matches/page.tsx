import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { Activity, ChevronRight, Calendar } from 'lucide-react'
import { Match } from '@/types/cricket'
import { formatDateTime, formatOvers, transformKeys } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Matches' }

async function getMatches() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      winner_team:teams!matches_winner_team_id_fkey(*),
      tournament:tournaments(*),
      innings(*)
    `)
    .order('scheduled_at', { ascending: true })
  return transformKeys<Match[]>(data || [])
}

function MatchCard({ match }: { match: Match }) {
  const inn1 = match.innings?.find(i => i.inningsNo === 1)
  const inn2 = match.innings?.find(i => i.inningsNo === 2)
  const statusStyles: Record<string, string> = {
    LIVE: 'bg-red-900/40 text-red-400 border-red-800/50',
    COMPLETED: 'bg-gray-900/40 text-gray-400 border-gray-800/50',
    SCHEDULED: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
    INNINGS_BREAK: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
  }

  return (
    <Link href={`/match/${match.id}`} className="cricket-card p-4 hover:border-green-700 transition-all group block">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">
            {match.tournament?.name} • M{match.matchNumber}
            {match.isFinal && ' • FINAL'}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusStyles[match.status] || statusStyles.SCHEDULED}`}>
            {match.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />}
            {match.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-xs text-gray-500">{formatDateTime(match.scheduledAt)}</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className={`font-semibold truncate max-w-[120px] ${match.winnerTeamId === match.homeTeamId ? 'text-green-400' : 'text-green-50'}`}>
              {match.homeTeam?.name}
            </span>
            <span className="text-gray-600 text-xs flex-shrink-0">vs</span>
            <span className={`font-semibold truncate max-w-[120px] ${match.winnerTeamId === match.awayTeamId ? 'text-green-400' : 'text-green-50'}`}>
              {match.awayTeam?.name}
            </span>
          </div>
          {match.resultText && (
            <div className="text-xs text-green-400">{match.resultText}</div>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5 ml-3 text-xs font-mono">
          {inn1 && (
            <span className="text-green-50">
              {inn1.totalRuns}/{inn1.totalWickets}
              <span className="text-gray-500 ml-1">({formatOvers(inn1.totalBalls)})</span>
            </span>
          )}
          {inn2 && (
            <span className="text-green-50">
              {inn2.totalRuns}/{inn2.totalWickets}
              <span className="text-gray-500 ml-1">({formatOvers(inn2.totalBalls)})</span>
            </span>
          )}
          <ChevronRight size={14} className="text-gray-600 group-hover:text-green-400 mt-1" />
        </div>
      </div>
    </Link>
  )
}

export default async function MatchesPage() {
  const matches = await getMatches()

  const live = matches.filter(m => m.status === 'LIVE')
  const scheduled = matches.filter(m => m.status === 'SCHEDULED')
  const completed = matches.filter(m => m.status === 'COMPLETED' || m.status === 'ABANDONED')

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-green-50 mb-6 flex items-center gap-2">
          <Activity size={24} className="text-green-400" />
          Matches
        </h1>

        {live.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 live-dot" /> Live Now
            </h2>
            <div className="flex flex-col gap-3">
              {live.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {scheduled.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-green-400" /> Upcoming ({scheduled.length})
            </h2>
            <div className="flex flex-col gap-3">
              {scheduled.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-green-50 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-green-400" /> Results ({completed.length})
            </h2>
            <div className="flex flex-col gap-3">
              {completed.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {matches.length === 0 && (
          <div className="text-center py-20">
            <Activity size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No matches yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Users, Calendar, ChevronRight } from 'lucide-react'
import { Tournament } from '@/types/cricket'
import { formatDate, transformKeys } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tournaments' }

async function getTournaments() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('tournaments')
    .select('*, tournament_teams(*, team:teams(*))')
    .order('created_at', { ascending: false })
  return transformKeys<Tournament[]>(data || [])
}

const statusStyles: Record<string, string> = {
  UPCOMING: 'bg-blue-900/40 text-blue-400 border-blue-800/50',
  ACTIVE: 'bg-green-900/40 text-green-400 border-green-800/50',
  COMPLETED: 'bg-gray-900/40 text-gray-400 border-gray-800/50',
  CANCELLED: 'bg-red-900/40 text-red-400 border-red-800/50',
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments()

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-green-50 flex items-center gap-2">
            <Trophy size={24} className="text-green-400" />
            Tournaments
          </h1>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No tournaments yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tournaments.map(t => {
              const teams = t.tournamentTeams?.map((tt: { team: { name: string } }) => tt.team) || []
              return (
                <Link
                  key={t.id}
                  href={`/tournament/${t.id}`}
                  className="cricket-card p-5 hover:border-green-700 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <h2 className="text-lg font-bold text-green-50 mb-1">{t.name}</h2>
                      {t.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyles[t.status] || statusStyles.UPCOMING}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(t.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {(t.tournamentTeams || []).length} teams
                    </span>
                    <span>{t.overs} overs</span>
                    <span>{t.format?.replace(/_/g, ' ')}</span>
                  </div>
                  {teams.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {teams.slice(0, 4).map((team: { id?: string; name: string }) => (
                        <span key={team.id || team.name} className="text-xs bg-green-900/20 text-green-500 border border-green-900/30 px-2 py-0.5 rounded-full">
                          {team.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-green-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

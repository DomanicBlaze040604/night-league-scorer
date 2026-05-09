import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { Settings, Users, Activity, Plus, Trophy } from 'lucide-react'
import { transformKeys } from '@/lib/utils'
import AdminActions from './AdminActions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const supabase = createServerClient()
  const [{ data: teamsRaw }, { data: matchesRaw }, { data: tournamentsRaw }] = await Promise.all([
    supabase.from('teams').select('id, name, short_name').order('name'),
    supabase.from('matches').select(`
      id, match_number, status, is_final, scheduled_at, overs,
      home_team:teams!matches_home_team_id_fkey(id, name),
      away_team:teams!matches_away_team_id_fkey(id, name),
      result_text
    `).order('match_number'),
    supabase.from('tournaments').select('id, name, slug, status, overs').order('created_at', { ascending: false }),
  ])

  const teams = transformKeys<{ id: string; name: string; shortName: string }[]>(teamsRaw || [])
  const matches = transformKeys<{
    id: string; matchNumber: number; status: string; isFinal: boolean
    scheduledAt: string; overs: number; resultText?: string
    homeTeam: { id: string; name: string }; awayTeam: { id: string; name: string }
  }[]>(matchesRaw || [])
  const tournaments = transformKeys<{ id: string; name: string; slug: string; status: string; overs: number }[]>(tournamentsRaw || [])

  const statusColor: Record<string, string> = {
    LIVE: 'text-red-400', COMPLETED: 'text-gray-400',
    SCHEDULED: 'text-blue-400', INNINGS_BREAK: 'text-yellow-400',
    TOSS: 'text-yellow-400', ABANDONED: 'text-gray-500', NO_RESULT: 'text-gray-500',
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-green-50 mb-6 flex items-center gap-2">
          <Settings size={24} className="text-green-400" />
          Admin Panel
        </h1>

        {/* Tournaments */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Trophy size={14} /> Tournaments
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2 mb-3">
            {tournaments.map(t => (
              <div key={t.id} className="cricket-card p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-green-50 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.status} · {t.overs} overs</div>
                </div>
              </div>
            ))}
          </div>
          {/* Tournament creation form (client component) */}
          <AdminActions teams={teams} tournaments={tournaments} />
        </section>

        {/* Teams */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Users size={14} /> Teams
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {teams.map(t => (
              <Link key={t.id} href={`/admin/teams/${t.id}`} className="cricket-card p-4 hover:border-green-700 transition-all">
                <div className="font-semibold text-green-50">{t.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.shortName} · Edit team & players</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Matches */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Activity size={14} /> Matches
            </h2>
            <Link href="/admin/matches/new" className="text-xs text-green-400 border border-green-800/50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-green-900/20">
              <Plus size={12} /> Add Match
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {matches.map(m => (
              <Link key={m.id} href={`/admin/matches/${m.id}`} className="cricket-card p-4 hover:border-green-700 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-500">M{m.matchNumber}</span>
                      {m.isFinal && <span className="text-xs text-yellow-400 bg-yellow-900/20 px-1.5 py-0.5 rounded">FINAL</span>}
                      <span className={`text-xs font-medium ${statusColor[m.status] || 'text-gray-400'}`}>{m.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-sm font-medium text-green-50 truncate">
                      {m.homeTeam?.name} vs {m.awayTeam?.name}
                    </div>
                    {m.resultText && <div className="text-xs text-green-400 mt-0.5 truncate">{m.resultText}</div>}
                  </div>
                  <div className="text-xs text-green-400 ml-3">Edit →</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

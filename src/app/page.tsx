import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { Trophy, Activity, Users, ChevronRight, Zap, Calendar } from 'lucide-react'
import { Match, Tournament } from '@/types/cricket'
import { transformKeys } from '@/lib/utils'

async function getData() {
  const supabase = createServerClient()

  const [{ data: tournaments }, { data: liveMatches }, { data: recentMatches }] = await Promise.all([
    supabase.from('tournaments').select('*, tournament_teams(*, team:teams(*))').eq('status', 'ACTIVE').limit(3),
    supabase.from('matches').select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      innings(*)
    `).eq('status', 'LIVE').limit(5),
    supabase.from('matches').select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      innings(*)
    `).eq('status', 'COMPLETED').order('updated_at', { ascending: false }).limit(5),
  ])

  return {
    tournaments: transformKeys<Tournament[]>(tournaments || []),
    liveMatches: transformKeys<Match[]>(liveMatches || []),
    recentMatches: transformKeys<Match[]>(recentMatches || []),
  }
}

function MatchScore({ match }: { match: Match }) {
  const innings = match.innings || []
  const inn1 = innings.find(i => i.inningsNo === 1)
  const inn2 = innings.find(i => i.inningsNo === 2)

  return (
    <div className="flex flex-col gap-1 text-right">
      {inn1 && (
        <div className="text-sm font-mono">
          <span className="text-green-400 font-bold">{inn1.totalRuns}/{inn1.totalWickets}</span>
          <span className="text-gray-500 ml-1 text-xs">({Math.floor(inn1.totalBalls / 6)}.{inn1.totalBalls % 6})</span>
        </div>
      )}
      {inn2 && (
        <div className="text-sm font-mono">
          <span className="text-green-400 font-bold">{inn2.totalRuns}/{inn2.totalWickets}</span>
          <span className="text-gray-500 ml-1 text-xs">({Math.floor(inn2.totalBalls / 6)}.{inn2.totalBalls % 6})</span>
        </div>
      )}
    </div>
  )
}

export default async function HomePage() {
  const { tournaments, liveMatches, recentMatches } = await getData()

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-8 pb-10 md:px-8 md:pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/30 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-800/50 rounded-full px-4 py-1.5 text-xs text-green-400 mb-4">
            <Zap size={12} />
            Live scoring for local cricket
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-3">
            <span className="gradient-text">Night League</span>
            <br />
            <span className="text-green-50">Scorer</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-8">
            Professional ball-by-ball cricket scoring, live analytics, and tournament management for your local league.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tournaments"
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 justify-center transition-all"
            >
              <Trophy size={18} />
              View Tournaments
            </Link>
            <Link
              href="/matches"
              className="bg-[#1a2e1a] hover:bg-[#243824] border border-green-800/50 text-green-400 font-medium px-6 py-3 rounded-xl flex items-center gap-2 justify-center transition-all"
            >
              <Activity size={18} />
              Live Matches
            </Link>
          </div>
        </div>
      </section>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section className="px-4 md:px-8 mb-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
            <h2 className="text-base font-semibold text-green-50">Live Now</h2>
          </div>
          <div className="flex flex-col gap-3">
            {liveMatches.map(match => (
              <Link key={match.id} href={`/match/${match.id}`} className="cricket-card p-4 hover:border-green-700 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-900/40 text-red-400 border border-red-800/50 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
                        LIVE
                      </span>
                      <span className="text-xs text-gray-500">Match {match.matchNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-green-50 truncate">{match.homeTeam?.name}</span>
                      <span className="text-gray-600 text-xs">vs</span>
                      <span className="font-semibold text-green-50 truncate">{match.awayTeam?.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MatchScore match={match} />
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-green-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats Cards */}
      <section className="px-4 md:px-8 mb-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: 'Tournaments', value: '1', color: 'text-yellow-400' },
            { icon: Activity, label: 'Live Matches', value: String(liveMatches.length), color: 'text-red-400' },
            { icon: Users, label: 'Teams', value: '4', color: 'text-blue-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="cricket-card p-4 text-center">
              <Icon size={20} className={`${color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-green-50">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Tournaments */}
      {tournaments.length > 0 && (
        <section className="px-4 md:px-8 mb-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-green-50 flex items-center gap-2">
              <Trophy size={16} className="text-green-400" />
              Tournaments
            </h2>
            <Link href="/tournaments" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {tournaments.map(t => (
              <Link key={t.id} href={`/tournament/${t.id}`} className="cricket-card p-4 hover:border-green-700 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-50 mb-1">{t.name}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{t.tournamentTeams?.length || 0} teams</span>
                      <span>•</span>
                      <span>{t.overs} overs</span>
                      <span>•</span>
                      <span>{t.format?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-900/40 text-green-400 border border-green-800/50 text-xs px-2 py-0.5 rounded-full">
                      {t.status}
                    </span>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-green-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {recentMatches.length > 0 && (
        <section className="px-4 md:px-8 mb-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-green-50 flex items-center gap-2">
              <Calendar size={16} className="text-green-400" />
              Recent Results
            </h2>
            <Link href="/matches" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              All matches <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentMatches.slice(0, 3).map(match => (
              <Link key={match.id} href={`/match/${match.id}`} className="cricket-card p-4 hover:border-green-700 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Match {match.matchNumber}</span>
                  <span className="bg-gray-900/40 text-gray-400 border border-gray-800/50 text-xs px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${match.winnerTeamId === match.homeTeamId ? 'text-green-400' : 'text-green-50'}`}>
                        {match.homeTeam?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${match.winnerTeamId === match.awayTeamId ? 'text-green-400' : 'text-green-50'}`}>
                        {match.awayTeam?.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MatchScore match={match} />
                  </div>
                </div>
                {match.resultText && (
                  <div className="mt-2 text-xs text-green-400 font-medium">{match.resultText}</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {tournaments.length === 0 && liveMatches.length === 0 && recentMatches.length === 0 && (
        <section className="px-4 md:px-8 max-w-4xl mx-auto text-center py-16">
          <div className="text-6xl mb-4">🏏</div>
          <h2 className="text-xl font-semibold text-green-50 mb-2">Ready to Score!</h2>
          <p className="text-gray-500 mb-6">The Night Premier League data is loading. Check back soon!</p>
          <Link href="/tournaments" className="bg-green-500 text-black font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2">
            <Trophy size={18} />
            Go to Tournaments
          </Link>
        </section>
      )}
    </div>
  )
}

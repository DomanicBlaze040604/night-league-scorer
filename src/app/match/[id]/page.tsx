import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { Match, Innings } from '@/types/cricket'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatDateTime, formatOvers, transformKeys } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

async function getMatch(id: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*, players(*)),
      away_team:teams!matches_away_team_id_fkey(*, players(*)),
      winner_team:teams!matches_winner_team_id_fkey(*),
      tournament:tournaments(*),
      innings(
        *,
        batting_team:teams(*),
        batting_innings(*, player:players(*)),
        bowling_spells(*, player:players(*)),
        fall_of_wickets(*),
        overs(*, balls(*, batsman:players!balls_batsman_id_fkey(*), bowler:players!balls_bowler_id_fkey(*)))
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return transformKeys<Match>(data)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) return { title: 'Match' }
  return { title: `${match.homeTeam?.name} vs ${match.awayTeam?.name}` }
}

function WicketDescription({ bi }: { bi: { isOut: boolean; wicketType?: string; bowlerId?: string; player?: { name: string } } }) {
  if (!bi.isOut) return <span className="text-green-400 text-xs">not out</span>
  const type = bi.wicketType || 'out'
  const labels: Record<string, string> = {
    BOWLED: 'b',
    CAUGHT: 'c ... b',
    LBW: 'lbw b',
    RUN_OUT: 'run out',
    STUMPED: 'st ... b',
    HIT_WICKET: 'hit wkt b',
    RETIRED_OUT: 'retired out',
  }
  return <span className="text-gray-500 text-xs">{labels[type] || type}</span>
}

function ScorecardInnings({ innings, teamName }: { innings: Innings; teamName: string }) {
  const batInnings = (innings.battingInnings || []).sort((a, b) => a.battingOrder - b.battingOrder)
  const bowlSpells = (innings.bowlingSpells || [])
  const fow = (innings.fallOfWickets || []).sort((a, b) => a.wicketNo - b.wicketNo)

  return (
    <div className="mb-6">
      <div className="bg-green-900/20 px-4 py-2.5 border-b border-[#1a2e1a]">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-green-50">{teamName}</h3>
          <div className="font-bold text-green-400 text-lg score-display">
            {innings.totalRuns}/{innings.totalWickets}
            <span className="text-sm text-gray-400 font-normal ml-2">
              ({formatOvers(innings.totalBalls)} ov)
            </span>
          </div>
        </div>
      </div>

      {/* Batting */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="text-gray-500 border-b border-[#1a2e1a]">
              <th className="text-left px-4 py-2">Batsman</th>
              <th className="text-center px-2 py-2 w-8">R</th>
              <th className="text-center px-2 py-2 w-8">B</th>
              <th className="text-center px-2 py-2 w-8">4s</th>
              <th className="text-center px-2 py-2 w-8">6s</th>
              <th className="text-center px-2 py-2 w-14">SR</th>
            </tr>
          </thead>
          <tbody>
            {batInnings.map(bi => (
              <tr key={bi.id} className="border-b border-[#1a2e1a]/50 hover:bg-green-900/10">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-green-50">{bi.player?.name}</div>
                  <WicketDescription bi={bi} />
                </td>
                <td className="text-center px-2 py-2.5 font-bold text-green-50">{bi.runs}</td>
                <td className="text-center px-2 py-2.5 text-gray-400">{bi.balls}</td>
                <td className="text-center px-2 py-2.5 text-green-400">{bi.fours}</td>
                <td className="text-center px-2 py-2.5 text-purple-400">{bi.sixes}</td>
                <td className="text-center px-2 py-2.5 text-gray-400">
                  {bi.balls > 0 ? ((bi.runs / bi.balls) * 100).toFixed(1) : '0.0'}
                </td>
              </tr>
            ))}
            {/* Extras */}
            <tr className="border-b border-[#1a2e1a]/50">
              <td className="px-4 py-2 text-gray-500 text-xs" colSpan={2}>
                Extras: {innings.extras}
                <span className="ml-1 text-gray-600">
                  (w {innings.wides}, nb {innings.noBalls}, b {innings.byes}, lb {innings.legByes})
                </span>
              </td>
              <td colSpan={4} />
            </tr>
            {/* Total */}
            <tr className="bg-green-900/10">
              <td className="px-4 py-2.5 font-bold text-green-50">Total</td>
              <td className="text-center px-2 py-2.5 font-bold text-green-400 text-sm">
                {innings.totalRuns}/{innings.totalWickets}
              </td>
              <td className="text-center text-gray-500 text-xs px-2 py-2.5" colSpan={4}>
                ({formatOvers(innings.totalBalls)} overs)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bowling */}
      {bowlSpells.length > 0 && (
        <div className="mt-3 overflow-x-auto border-t border-[#1a2e1a]">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="text-gray-500 border-b border-[#1a2e1a]">
                <th className="text-left px-4 py-2">Bowler</th>
                <th className="text-center px-2 py-2 w-10">O</th>
                <th className="text-center px-2 py-2 w-8">M</th>
                <th className="text-center px-2 py-2 w-8">R</th>
                <th className="text-center px-2 py-2 w-8">W</th>
                <th className="text-center px-2 py-2 w-14">Econ</th>
              </tr>
            </thead>
            <tbody>
              {bowlSpells.map(bs => (
                <tr key={bs.id} className="border-b border-[#1a2e1a]/50 hover:bg-green-900/10">
                  <td className="px-4 py-2.5 font-medium text-green-50">{bs.player?.name}</td>
                  <td className="text-center px-2 py-2.5 text-gray-400">{formatOvers(Math.round(bs.overs * 6))}</td>
                  <td className="text-center px-2 py-2.5 text-gray-400">{bs.maidens}</td>
                  <td className="text-center px-2 py-2.5 text-gray-400">{bs.runs}</td>
                  <td className="text-center px-2 py-2.5 font-bold text-green-400">{bs.wickets}</td>
                  <td className="text-center px-2 py-2.5 text-gray-400">{bs.economy.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fall of Wickets */}
      {fow.length > 0 && (
        <div className="px-4 py-3 border-t border-[#1a2e1a]">
          <div className="text-xs text-gray-500 mb-1.5">Fall of Wickets</div>
          <div className="flex flex-wrap gap-2">
            {fow.map(f => (
              <span key={f.id} className="text-xs bg-red-900/20 text-red-400 px-2 py-0.5 rounded">
                {f.runs}-{f.wicketNo} ({f.overNo.toFixed(1)})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()

  const innings = (match.innings || []).sort((a, b) => a.inningsNo - b.inningsNo)
  const isLive = match.status === 'LIVE' || match.status === 'INNINGS_BREAK'

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/" className="text-gray-500 hover:text-green-400 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500">{match.tournament?.name} • Match {match.matchNumber}</div>
            {match.isFinal && <span className="text-xs bg-yellow-900/30 text-yellow-400 px-1.5 py-0.5 rounded mr-2">FINAL</span>}
          </div>
          {isLive && (
            <Link
              href={`/scoring/${id}`}
              className="bg-green-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <Edit3 size={12} />
              Score
            </Link>
          )}
        </div>

        {/* Match Header Card */}
        <div className="cricket-card p-5 mb-5">
          {/* Status */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              match.status === 'LIVE' ? 'bg-red-900/40 text-red-400 border-red-800/50' :
              match.status === 'COMPLETED' ? 'bg-gray-900/40 text-gray-400 border-gray-800/50' :
              'bg-blue-900/40 text-blue-400 border-blue-800/50'
            }`}>
              {match.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />}
              {match.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-500">{formatDateTime(match.scheduledAt)}</span>
          </div>

          {/* Teams & Scores */}
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center md:text-left">
              <div className="font-bold text-green-50 text-lg mb-1">{match.homeTeam?.name}</div>
              {innings[0] && innings[0].battingTeamId === match.homeTeamId ? (
                <div className="score-display text-3xl font-bold text-green-400">
                  {innings[0].totalRuns}/{innings[0].totalWickets}
                  <div className="text-sm text-gray-500 font-normal">{formatOvers(innings[0].totalBalls)} ov</div>
                </div>
              ) : innings[1] && innings[1].battingTeamId === match.homeTeamId ? (
                <div className="score-display text-3xl font-bold text-green-400">
                  {innings[1].totalRuns}/{innings[1].totalWickets}
                  <div className="text-sm text-gray-500 font-normal">{formatOvers(innings[1].totalBalls)} ov</div>
                </div>
              ) : null}
            </div>

            <div className="mx-4 text-gray-600 font-bold">vs</div>

            {/* Away Team */}
            <div className="flex-1 text-center md:text-right">
              <div className="font-bold text-green-50 text-lg mb-1">{match.awayTeam?.name}</div>
              {innings[0] && innings[0].battingTeamId === match.awayTeamId ? (
                <div className="score-display text-3xl font-bold text-green-400">
                  {innings[0].totalRuns}/{innings[0].totalWickets}
                  <div className="text-sm text-gray-500 font-normal">{formatOvers(innings[0].totalBalls)} ov</div>
                </div>
              ) : innings[1] && innings[1].battingTeamId === match.awayTeamId ? (
                <div className="score-display text-3xl font-bold text-green-400">
                  {innings[1].totalRuns}/{innings[1].totalWickets}
                  <div className="text-sm text-gray-500 font-normal">{formatOvers(innings[1].totalBalls)} ov</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Result */}
          {match.resultText && (
            <div className="mt-4 pt-4 border-t border-[#1a2e1a] text-center">
              <div className="text-sm font-semibold text-green-400">{match.resultText}</div>
            </div>
          )}

          {/* Toss */}
          {match.tossWinnerId && (
            <div className="mt-3 text-xs text-gray-500 text-center">
              Toss: {match.tossWinnerId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name}
              {' '} won and chose to {match.tossChoice?.toLowerCase()}
            </div>
          )}
        </div>

        {/* Scorecards */}
        {innings.length > 0 && (
          <div className="cricket-card overflow-hidden mb-5">
            {innings.map(inn => {
              const team = inn.battingTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam
              return (
                <ScorecardInnings
                  key={inn.id}
                  innings={inn}
                  teamName={team?.name || 'Team'}
                />
              )
            })}
          </div>
        )}

        {/* Start Scoring Button */}
        {match.status === 'SCHEDULED' && (
          <Link
            href={`/scoring/${id}`}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-all"
          >
            <Edit3 size={20} />
            Start Scoring
          </Link>
        )}
      </div>
    </div>
  )
}

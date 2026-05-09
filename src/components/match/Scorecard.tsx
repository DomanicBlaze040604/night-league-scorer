'use client'
import { Innings, WicketType } from '@/types/cricket'
import { formatOvers } from '@/lib/utils'

interface ScorecardProps {
  innings: Innings
  teamName: string
}

const wicketLabels: Record<WicketType, string> = {
  BOWLED: 'b',
  CAUGHT: 'c & b',
  LBW: 'lbw b',
  RUN_OUT: 'run out',
  STUMPED: 'st b',
  HIT_WICKET: 'hit wkt b',
  RETIRED_OUT: 'retired out',
  RETIRED_HURT: 'retired hurt',
}

export function Scorecard({ innings, teamName }: ScorecardProps) {
  const batInnings = (innings.battingInnings ?? []).sort((a, b) => a.battingOrder - b.battingOrder)
  const bowlSpells = (innings.bowlingSpells ?? [])
  const fow = (innings.fallOfWickets ?? []).sort((a, b) => a.wicketNo - b.wicketNo)

  return (
    <div className="mb-2">
      {/* Header */}
      <div className="bg-green-900/20 px-4 py-3 border-b border-[#1a2e1a] flex items-center justify-between">
        <h3 className="font-bold text-green-50">{teamName} Innings</h3>
        <div className="font-bold text-green-400 text-xl score-display">
          {innings.totalRuns}/{innings.totalWickets}
          <span className="text-sm text-gray-400 font-normal ml-2">
            ({formatOvers(innings.totalBalls)} ov)
          </span>
        </div>
      </div>

      {/* Batting */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="text-gray-500 border-b border-[#1a2e1a] bg-[#0d1a0d]">
              <th className="text-left px-4 py-2">Batsman</th>
              <th className="px-2 py-2 text-center w-10">R</th>
              <th className="px-2 py-2 text-center w-10">B</th>
              <th className="px-2 py-2 text-center w-8">4s</th>
              <th className="px-2 py-2 text-center w-8">6s</th>
              <th className="px-2 py-2 text-center w-14">SR</th>
            </tr>
          </thead>
          <tbody>
            {batInnings.map(bi => (
              <tr key={bi.id} className="border-b border-[#1a2e1a]/50 hover:bg-green-900/5">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-green-50">{bi.player?.name}</div>
                  {bi.isOut
                    ? <div className="text-gray-600">{wicketLabels[bi.wicketType!] ?? 'out'}</div>
                    : <div className="text-green-500 text-xs">not out</div>
                  }
                </td>
                <td className="text-center px-2 py-2.5 font-bold text-green-50">{bi.runs}</td>
                <td className="text-center px-2 py-2.5 text-gray-400">{bi.balls}</td>
                <td className="text-center px-2 py-2.5 text-green-400">{bi.fours}</td>
                <td className="text-center px-2 py-2.5 text-purple-400">{bi.sixes}</td>
                <td className="text-center px-2 py-2.5 text-gray-400">
                  {bi.balls > 0 ? ((bi.runs / bi.balls) * 100).toFixed(1) : '-'}
                </td>
              </tr>
            ))}

            {/* Extras */}
            <tr className="border-b border-[#1a2e1a]/50 text-gray-500">
              <td className="px-4 py-2" colSpan={2}>
                Extras: {innings.extras}
                <span className="text-gray-600 ml-1 text-xs">
                  (w {innings.wides}, nb {innings.noBalls}, b {innings.byes}, lb {innings.legByes})
                </span>
              </td>
              <td colSpan={4} />
            </tr>

            {/* Total */}
            <tr className="bg-green-900/10 font-bold">
              <td className="px-4 py-3 text-green-50">Total</td>
              <td className="text-center px-2 py-3 text-green-400 text-sm">
                {innings.totalRuns}/{innings.totalWickets}
              </td>
              <td className="text-center px-2 py-3 text-gray-500 text-xs font-normal" colSpan={4}>
                ({formatOvers(innings.totalBalls)} overs, {innings.overs?.length ?? 0} ov bowled)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bowling */}
      {bowlSpells.length > 0 && (
        <div className="overflow-x-auto border-t border-[#1a2e1a]">
          <table className="w-full text-xs min-w-[380px]">
            <thead>
              <tr className="text-gray-500 border-b border-[#1a2e1a] bg-[#0d1a0d]">
                <th className="text-left px-4 py-2">Bowler</th>
                <th className="px-2 py-2 text-center w-10">O</th>
                <th className="px-2 py-2 text-center w-8">M</th>
                <th className="px-2 py-2 text-center w-8">R</th>
                <th className="px-2 py-2 text-center w-8">W</th>
                <th className="px-2 py-2 text-center w-14">Econ</th>
              </tr>
            </thead>
            <tbody>
              {bowlSpells.map(bs => (
                <tr key={bs.id} className="border-b border-[#1a2e1a]/50 hover:bg-green-900/5">
                  <td className="px-4 py-2.5 font-medium text-green-50">{bs.player?.name}</td>
                  <td className="text-center px-2 py-2.5 text-gray-400">
                    {formatOvers(Math.round(bs.overs * 6))}
                  </td>
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
          <div className="text-xs text-gray-500 mb-2">Fall of Wickets</div>
          <div className="flex flex-wrap gap-1.5">
            {fow.map(f => (
              <span key={f.id} className="text-xs bg-red-900/20 text-red-400 px-2 py-0.5 rounded">
                {f.runs}-{f.wicketNo} ({f.overNo.toFixed(1)} ov)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

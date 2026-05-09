'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, RotateCcw, ExternalLink, RefreshCw } from 'lucide-react'

interface Team { id: string; name: string }
interface Match {
  id: string; matchNumber: number; status: string; isFinal: boolean
  scheduledAt: string; overs: number; resultText?: string; winnerTeamId?: string
  homeTeam: Team; awayTeam: Team; homeTeamId: string; awayTeamId: string
  tossWinnerId?: string; tossChoice?: string; tournamentId?: string
}

export default function AdminMatchPage() {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<Match | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Editable fields
  const [status, setStatus] = useState('')
  const [resultText, setResultText] = useState('')
  const [winnerTeamId, setWinnerTeamId] = useState('')
  const [overs, setOvers] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')

  useEffect(() => {
    // Load match data from API
    fetch(`/api/matches/${id}`)
      .then(r => r.json())
      .then(d => {
        const raw = d.data
        if (!raw) return
        // API returns snake_case
        const m: Match = {
          id: raw.id,
          matchNumber: raw.match_number,
          status: raw.status,
          isFinal: raw.is_final,
          scheduledAt: raw.scheduled_at,
          overs: raw.overs,
          resultText: raw.result_text,
          winnerTeamId: raw.winner_team_id,
          homeTeamId: raw.home_team_id,
          awayTeamId: raw.away_team_id,
          homeTeam: raw.home_team,
          awayTeam: raw.away_team,
          tossWinnerId: raw.toss_winner_id,
          tossChoice: raw.toss_choice,
          tournamentId: raw.tournament_id,
        }
        setMatch(m)
        setStatus(m.status || 'SCHEDULED')
        setResultText(m.resultText || '')
        setWinnerTeamId(m.winnerTeamId || '')
        setOvers(String(m.overs || 4))
        setIsFinal(m.isFinal || false)
        setScheduledAt(m.scheduledAt ? m.scheduledAt.slice(0, 16) : '')
        setHomeTeamId(m.homeTeamId || '')
        setAwayTeamId(m.awayTeamId || '')
      })

    fetch('/api/admin/teams-list')
      .then(r => r.json())
      .then(d => setTeams(d.data || []))
  }, [id])

  const save = async () => {
    setSaving(true)
    const r = await fetch(`/api/admin/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        resultText: resultText || null,
        winnerTeamId: winnerTeamId || null,
        overs: Number(overs),
        isFinal,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        homeTeamId: homeTeamId || undefined,
        awayTeamId: awayTeamId || undefined,
        updatePoints: status === 'COMPLETED' && !!winnerTeamId,
      }),
    })
    setSaving(false)
    setMsg(r.ok ? '✓ Saved' : '✗ Failed — check console')
    setTimeout(() => setMsg(''), 3000)
  }

  const recalculate = async () => {
    if (!match?.tournamentId) return
    setSaving(true)
    const r = await fetch(`/api/admin/recalculate?tournamentId=${match.tournamentId}`, { method: 'POST' })
    setSaving(false)
    setMsg(r.ok ? '✓ Tournament points fully recalculated' : '✗ Failed — check console')
    setTimeout(() => setMsg(''), 3000)
  }

  const resetMatch = async () => {
    if (!confirm('Delete ALL scoring data for this match and reset to SCHEDULED?')) return
    setSaving(true)
    const r = await fetch(`/api/admin/matches/${id}`, { method: 'DELETE' })
    setSaving(false)
    if (r.ok) {
      setMsg('✓ Match reset to SCHEDULED')
      setStatus('SCHEDULED')
      setResultText('')
      setWinnerTeamId('')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  if (!match) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-green-400 animate-pulse">Loading…</div>
    </div>
  )

  const allTeams = teams.length > 0 ? teams : [match.homeTeam, match.awayTeam].filter(Boolean)

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/admin" className="text-gray-500 hover:text-green-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-green-50">Edit Match {match.matchNumber}</h1>
          <Link href={`/match/${id}`} className="ml-auto text-xs text-green-400 flex items-center gap-1">
            <ExternalLink size={12} /> View
          </Link>
        </div>

        {msg && <div className="cricket-card p-3 text-center text-sm mb-4 text-green-400">{msg}</div>}

        <div className="cricket-card p-5 flex flex-col gap-4 mb-4">
          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Home Team</label>
              <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)} className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm">
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Away Team</label>
              <select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)} className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm">
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Match Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm">
              {['SCHEDULED', 'TOSS', 'LIVE', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED', 'NO_RESULT'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Winner */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Winner (if completed)</label>
            <select value={winnerTeamId} onChange={e => setWinnerTeamId(e.target.value)} className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm">
              <option value="">— No winner / TBD —</option>
              <option value={homeTeamId}>{match.homeTeam?.name}</option>
              <option value={awayTeamId}>{match.awayTeam?.name}</option>
            </select>
          </div>

          {/* Result text */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Result Text</label>
            <input value={resultText} onChange={e => setResultText(e.target.value)} placeholder="e.g. Ruku 11 won by 5 wickets" className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          {/* Overs + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Overs</label>
              <input value={overs} onChange={e => setOvers(e.target.value)} type="number" min={1} max={50} className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Scheduled</label>
              <input value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} type="datetime-local" className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          {/* Is Final */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isFinal} onChange={e => setIsFinal(e.target.checked)} className="w-4 h-4 accent-green-500" />
            <span className="text-sm text-green-50">This is the Final match</span>
          </label>

          <button onClick={save} disabled={saving} className="w-full bg-green-500 text-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={14} /> Save Changes
          </button>
        </div>

        {/* Recalculate — show always if we have a tournamentId */}
        {match.tournamentId && (
          <div className="cricket-card p-4 border border-blue-900/40 mb-4">
            <div className="text-xs text-blue-400 font-semibold mb-2">Fix Points & Stats</div>
            <div className="text-xs text-gray-500 mb-3">Resets the entire tournament points table to 0 and replays all completed matches. Use after resetting a match.</div>
            <button onClick={recalculate} disabled={saving} className="w-full py-2.5 rounded-xl border border-blue-800 text-blue-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-900/20 disabled:opacity-50">
              <RefreshCw size={14} /> Recalculate Tournament Points
            </button>
          </div>
        )}

        {/* Danger zone */}
        <div className="cricket-card p-4 border border-red-900/40">
          <div className="text-xs text-red-400 font-semibold mb-2">Danger Zone</div>
          <div className="text-xs text-gray-500 mb-3">Reset match to SCHEDULED — deletes all balls, overs, innings, and commentary. Cannot be undone.</div>
          <button onClick={resetMatch} disabled={saving} className="w-full py-2.5 rounded-xl border border-red-800 text-red-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-900/20 disabled:opacity-50">
            <RotateCcw size={14} /> Reset Match
          </button>
        </div>
      </div>
    </div>
  )
}

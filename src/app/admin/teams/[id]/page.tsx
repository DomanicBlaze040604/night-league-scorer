'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, RotateCcw } from 'lucide-react'

interface Player { id: string; name: string; jerseyNo: number; role?: string }
interface Match { id: string; matchNumber: number; status: string; resultText?: string; homeTeam: { name: string }; awayTeam: { name: string }; homeTeamId: string; awayTeamId: string; isFinal: boolean }
interface Team { id: string; name: string; shortName: string; primaryColor: string; players: Player[]; matches: Match[] }

export default function AdminTeamPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [shortName, setShortName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Player edits
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [playerJersey, setPlayerJersey] = useState('')
  const [playerRole, setPlayerRole] = useState('')

  // Match correction
  const [editingMatch, setEditingMatch] = useState<string | null>(null)
  const [matchResultText, setMatchResultText] = useState('')
  const [matchWinnerId, setMatchWinnerId] = useState('')
  const [matchStatus, setMatchStatus] = useState('')

  useEffect(() => {
    fetch(`/api/admin/teams/${id}`)
      .then(r => r.json())
      .then(d => {
        setTeam(d.data)
        setTeamName(d.data?.name || '')
        setShortName(d.data?.shortName || '')
      })
  }, [id])

  const saveTeam = async () => {
    setSaving(true)
    const r = await fetch(`/api/admin/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, shortName }),
    })
    setSaving(false)
    setMsg(r.ok ? '✓ Team saved' : '✗ Failed')
    setTimeout(() => setMsg(''), 2000)
  }

  const savePlayer = async (playerId: string) => {
    setSaving(true)
    const r = await fetch(`/api/admin/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, jerseyNo: Number(playerJersey), role: playerRole || undefined }),
    })
    setSaving(false)
    if (r.ok) {
      setEditingPlayer(null)
      setTeam(prev => prev ? { ...prev, players: prev.players.map(p => p.id === playerId ? { ...p, name: playerName, jerseyNo: Number(playerJersey), role: playerRole || undefined } : p) } : prev)
      setMsg('✓ Player saved')
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const correctMatch = async (matchId: string) => {
    setSaving(true)
    const r = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: matchStatus || 'COMPLETED',
        resultText: matchResultText,
        winnerTeamId: matchWinnerId || undefined,
        updatePoints: true,
      }),
    })
    setSaving(false)
    if (r.ok) {
      setEditingMatch(null)
      setMsg('✓ Match updated')
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const resetMatch = async (matchId: string) => {
    if (!confirm('Reset this match to SCHEDULED and delete all scoring data?')) return
    setSaving(true)
    await fetch(`/api/admin/matches/${matchId}`, { method: 'DELETE' })
    setSaving(false)
    setMsg('✓ Match reset')
    setTimeout(() => setMsg(''), 2000)
    router.refresh()
  }

  if (!team) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-green-400 animate-pulse">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href={`/team/${id}`} className="text-gray-500 hover:text-green-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-green-50">Edit — {team.name}</h1>
        </div>

        {msg && <div className="cricket-card p-3 text-center text-green-400 text-sm mb-4">{msg}</div>}

        {/* Team details */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Team Details</h2>
          <div className="cricket-card p-4 flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Team Name</label>
              <input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Short Name (3 letters)</label>
              <input
                value={shortName}
                onChange={e => setShortName(e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                className="w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={saveTeam}
              disabled={saving}
              className="bg-green-500 text-black font-bold py-2.5 rounded-xl text-sm flex items-center gap-2 justify-center disabled:opacity-50"
            >
              <Save size={14} /> Save Team
            </button>
          </div>
        </section>

        {/* Players */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Players</h2>
          <div className="cricket-card overflow-hidden">
            {team.players.map((p, i) => (
              <div key={p.id} className={`px-4 py-3 ${i < team.players.length - 1 ? 'border-b border-[#1a2e1a]' : ''}`}>
                {editingPlayer === p.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          value={playerName}
                          onChange={e => setPlayerName(e.target.value)}
                          placeholder="Name"
                          className="w-full bg-[#0a0f0a] border border-green-800/50 text-green-50 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <input
                        value={playerJersey}
                        onChange={e => setPlayerJersey(e.target.value)}
                        placeholder="#Jersey"
                        type="number"
                        className="bg-[#0a0f0a] border border-green-800/50 text-green-50 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <select
                      value={playerRole}
                      onChange={e => setPlayerRole(e.target.value)}
                      className="bg-[#0a0f0a] border border-green-800/50 text-green-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">No special role</option>
                      <option value="CAPTAIN">Captain</option>
                      <option value="WICKETKEEPER">Wicketkeeper</option>
                      <option value="ALL_ROUNDER">All-Rounder</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => savePlayer(p.id)} disabled={saving} className="flex-1 bg-green-500 text-black font-bold py-2 rounded-lg text-xs disabled:opacity-50">Save</button>
                      <button onClick={() => setEditingPlayer(null)} className="flex-1 border border-gray-700 text-gray-400 py-2 rounded-lg text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-900/40 flex items-center justify-center text-green-400 text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-50">{p.name}</span>
                        {p.role === 'CAPTAIN' && <span className="ml-1 text-xs text-yellow-400">C</span>}
                        <div className="text-xs text-gray-500">#{p.jerseyNo}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPlayer(p.id)
                        setPlayerName(p.name)
                        setPlayerJersey(String(p.jerseyNo))
                        setPlayerRole(p.role || '')
                      }}
                      className="text-xs text-green-400 border border-green-800/50 px-3 py-1.5 rounded-lg hover:bg-green-900/20"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Match Results */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Match Results</h2>
          <div className="flex flex-col gap-2">
            {team.matches.map(m => (
              <div key={m.id} className="cricket-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs text-gray-500">M{m.matchNumber}{m.isFinal ? ' • FINAL' : ''}</div>
                    <div className="text-sm font-medium text-green-50">{m.homeTeam?.name} vs {m.awayTeam?.name}</div>
                    {m.resultText && <div className="text-xs text-green-400 mt-0.5">{m.resultText}</div>}
                  </div>
                  <div className="flex gap-2">
                    {m.status === 'COMPLETED' && (
                      <button
                        onClick={() => resetMatch(m.id)}
                        title="Reset match (delete scoring data)"
                        className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingMatch(editingMatch === m.id ? null : m.id)
                        setMatchResultText(m.resultText || '')
                        setMatchWinnerId('')
                        setMatchStatus(m.status)
                      }}
                      className="text-xs text-green-400 border border-green-800/50 px-2.5 py-1.5 rounded-lg"
                    >
                      {editingMatch === m.id ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                </div>

                {editingMatch === m.id && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#1a2e1a]">
                    <select
                      value={matchStatus}
                      onChange={e => setMatchStatus(e.target.value)}
                      className="bg-[#0a0f0a] border border-green-800/50 text-green-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="LIVE">Live</option>
                      <option value="INNINGS_BREAK">Innings Break</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ABANDONED">Abandoned</option>
                      <option value="NO_RESULT">No Result</option>
                    </select>
                    <select
                      value={matchWinnerId}
                      onChange={e => setMatchWinnerId(e.target.value)}
                      className="bg-[#0a0f0a] border border-green-800/50 text-green-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">— Winner (optional) —</option>
                      <option value={m.homeTeamId}>{m.homeTeam?.name}</option>
                      <option value={m.awayTeamId}>{m.awayTeam?.name}</option>
                    </select>
                    <input
                      value={matchResultText}
                      onChange={e => setMatchResultText(e.target.value)}
                      placeholder="Result text (e.g. Ruku 11 won by 5 wickets)"
                      className="bg-[#0a0f0a] border border-green-800/50 text-green-50 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => correctMatch(m.id)}
                      disabled={saving}
                      className="bg-green-500 text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      Update Match
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

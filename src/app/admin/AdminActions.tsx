'use client'
import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface Team { id: string; name: string; shortName: string }
interface Tournament { id: string; name: string; slug: string; status: string; overs: number }

export default function AdminActions({ teams, tournaments }: { teams: Team[]; tournaments: Tournament[] }) {
  const [showNewTournament, setShowNewTournament] = useState(false)
  const [showNewMatch, setShowNewMatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Tournament form
  const [tName, setTName] = useState('')
  const [tOvers, setTOvers] = useState('4')
  const [tDate, setTDate] = useState('')
  const [tTeams, setTTeams] = useState<string[]>([])

  // Match form
  const [mTournament, setMTournament] = useState(tournaments[0]?.id || '')
  const [mHome, setMHome] = useState('')
  const [mAway, setMAway] = useState('')
  const [mDate, setMDate] = useState('')
  const [mOvers, setMOvers] = useState('4')
  const [mFinal, setMFinal] = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const createTournament = async () => {
    if (!tName || !tDate) return flash('Fill in name and start date')
    setSaving(true)
    const r = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tName, overs: Number(tOvers), startDate: tDate, teamIds: tTeams }),
    })
    setSaving(false)
    if (r.ok) {
      flash('✓ Tournament created — refresh to see it')
      setTName(''); setTDate(''); setTTeams([]); setShowNewTournament(false)
    } else {
      const d = await r.json(); flash('✗ ' + (d.error || 'Failed'))
    }
  }

  const createMatch = async () => {
    if (!mTournament || !mHome || !mAway || !mDate) return flash('Fill in all match fields')
    if (mHome === mAway) return flash('Home and away teams must be different')
    setSaving(true)
    const r = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: mTournament, homeTeamId: mHome, awayTeamId: mAway,
        scheduledAt: mDate, overs: Number(mOvers), isFinal: mFinal,
      }),
    })
    setSaving(false)
    if (r.ok) {
      flash('✓ Match created — refresh to see it')
      setMHome(''); setMAway(''); setMDate(''); setMFinal(false); setShowNewMatch(false)
    } else {
      const d = await r.json(); flash('✗ ' + (d.error || 'Failed'))
    }
  }

  const toggleTeam = (id: string) =>
    setTTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const selectClass = 'w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm'
  const inputClass = 'w-full bg-[#1a2e1a] border border-green-800/50 text-green-50 rounded-xl px-3 py-2.5 text-sm'

  return (
    <div className="space-y-3">
      {msg && <div className="cricket-card p-3 text-center text-sm text-green-400">{msg}</div>}

      {/* New Tournament */}
      <div className="cricket-card overflow-hidden">
        <button
          onClick={() => setShowNewTournament(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-green-400 hover:bg-green-900/10"
        >
          <span className="flex items-center gap-2"><Plus size={14} /> Create New Tournament</span>
          {showNewTournament ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showNewTournament && (
          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#1a2e1a]">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tournament Name *</label>
                <input value={tName} onChange={e => setTName(e.target.value)} placeholder="Night Premier League 2" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Overs per innings</label>
                <input value={tOvers} onChange={e => setTOvers(e.target.value)} type="number" min={1} max={50} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Start Date *</label>
              <input value={tDate} onChange={e => setTDate(e.target.value)} type="datetime-local" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Participating Teams</label>
              <div className="grid grid-cols-2 gap-2">
                {teams.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={tTeams.includes(t.id)}
                      onChange={() => toggleTeam(t.id)}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-sm text-green-50">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={createTournament}
              disabled={saving}
              className="w-full bg-green-500 text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Tournament'}
            </button>
          </div>
        )}
      </div>

      {/* New Match (quick add) */}
      <div className="cricket-card overflow-hidden">
        <button
          onClick={() => setShowNewMatch(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-green-400 hover:bg-green-900/10"
        >
          <span className="flex items-center gap-2"><Plus size={14} /> Add Match (Quick)</span>
          {showNewMatch ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showNewMatch && (
          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#1a2e1a]">
            <div className="mt-3">
              <label className="text-xs text-gray-500 block mb-1">Tournament *</label>
              <select value={mTournament} onChange={e => setMTournament(e.target.value)} className={selectClass}>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Home Team *</label>
                <select value={mHome} onChange={e => setMHome(e.target.value)} className={selectClass}>
                  <option value="">Select…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Away Team *</label>
                <select value={mAway} onChange={e => setMAway(e.target.value)} className={selectClass}>
                  <option value="">Select…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date & Time *</label>
                <input value={mDate} onChange={e => setMDate(e.target.value)} type="datetime-local" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Overs</label>
                <input value={mOvers} onChange={e => setMOvers(e.target.value)} type="number" min={1} max={50} className={inputClass} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={mFinal} onChange={e => setMFinal(e.target.checked)} className="w-4 h-4 accent-green-500" />
              <span className="text-sm text-green-50">This is the Final match</span>
            </label>
            <button
              onClick={createMatch}
              disabled={saving}
              className="w-full bg-green-500 text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Match'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

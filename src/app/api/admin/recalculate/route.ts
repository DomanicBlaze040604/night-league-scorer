import { NextRequest, NextResponse } from 'next/server'
import { recalculateTournamentPoints } from '@/lib/recalculate'

// POST /api/admin/recalculate?tournamentId=xxx
// Resets points table to 0 and replays all completed matches in that tournament.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tournamentId = searchParams.get('tournamentId')
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  const err = await recalculateTournamentPoints(tournamentId)
  if (err) {
    console.error('[recalculate]', err)
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

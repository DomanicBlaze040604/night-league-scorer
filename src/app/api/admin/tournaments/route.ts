import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET all tournaments
export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, slug, status, start_date, overs')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

// POST create tournament
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { name, overs, startDate, teamIds } = body
  if (!name || !startDate) return NextResponse.json({ error: 'name and startDate required' }, { status: 400 })

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      name,
      slug,
      format: 'ROUND_ROBIN_KNOCKOUT',
      status: 'UPCOMING',
      start_date: new Date(startDate).toISOString(),
      overs: overs || 4,
    })
    .select()
    .single()

  if (tErr || !tournament) {
    return NextResponse.json({ error: tErr?.message || 'Failed to create tournament' }, { status: 500 })
  }

  // Add teams to tournament and create points_table rows
  if (teamIds?.length > 0) {
    await supabase.from('tournament_teams').insert(
      teamIds.map((teamId: string) => ({ tournament_id: tournament.id, team_id: teamId }))
    )
    await supabase.from('points_table').insert(
      teamIds.map((teamId: string) => ({
        tournament_id: tournament.id, team_id: teamId,
        played: 0, won: 0, lost: 0, tied: 0, no_result: 0, points: 0, nrr: 0,
      }))
    )
  }

  return NextResponse.json({ data: tournament })
}

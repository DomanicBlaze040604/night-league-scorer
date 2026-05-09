import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_teams (
        *,
        teams (
          *,
          players (*)
        )
      ),
      matches (
        *,
        home_team:teams!matches_home_team_id_fkey (*),
        away_team:teams!matches_away_team_id_fkey (*),
        winner_team:teams!matches_winner_team_id_fkey (*)
      ),
      points_table (
        *,
        teams (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('tournaments')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

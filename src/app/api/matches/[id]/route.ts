import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey (*, players(*)),
      away_team:teams!matches_away_team_id_fkey (*, players(*)),
      winner_team:teams!matches_winner_team_id_fkey (*),
      tournament:tournaments(*),
      innings (
        *,
        batting_team:teams (*),
        batting_innings (
          *,
          player:players (*)
        ),
        bowling_spells (
          *,
          player:players (*)
        ),
        partnerships (
          *,
          batsman1:players!partnerships_batsman1_id_fkey (*),
          batsman2:players!partnerships_batsman2_id_fkey (*)
        ),
        fall_of_wickets (*),
        overs (
          *,
          balls (
            *,
            batsman:players!balls_batsman_id_fkey (*),
            bowler:players!balls_bowler_id_fkey (*),
            fielder:players!balls_fielder1_id_fkey (*)
          )
        )
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
    .from('matches')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

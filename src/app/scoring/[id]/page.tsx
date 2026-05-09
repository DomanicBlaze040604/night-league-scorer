import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Match } from '@/types/cricket'
import { transformKeys } from '@/lib/utils'
import { ScoringClient } from './ScoringClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = { title: 'Live Scoring' }

async function getMatch(id: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*, players(*)),
      away_team:teams!matches_away_team_id_fkey(*, players(*)),
      tournament:tournaments(*),
      innings(
        *,
        batting_team:teams(*),
        batting_innings(*, player:players(*)),
        bowling_spells(*, player:players(*)),
        overs(*, balls(*))
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return transformKeys<Match>(data)
}

export default async function ScoringPage({ params }: Props) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()

  return <ScoringClient match={match} />
}

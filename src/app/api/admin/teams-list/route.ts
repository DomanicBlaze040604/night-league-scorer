import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data } = await supabase.from('teams').select('id, name, short_name').order('name')
  const teams = (data || []).map((t: { id: string; name: string; short_name: string }) => ({ id: t.id, name: t.name, shortName: t.short_name }))
  return NextResponse.json({ data: teams })
}

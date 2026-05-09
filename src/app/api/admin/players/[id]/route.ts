import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.jerseyNo !== undefined) update.jersey_no = body.jerseyNo
  if (body.role !== undefined) update.role = body.role
  if (body.isActive !== undefined) update.is_active = body.isActive

  const { error } = await supabase.from('players').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  const { error } = await supabase.from('players').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

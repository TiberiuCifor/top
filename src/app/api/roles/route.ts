import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service role client for all writes (bypasses RLS)
const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return user
}

// GET /api/roles — return all role configs
export async function GET() {
  try {
    const { data, error } = await adminDb
      .from('role_configs')
      .select('value, label, color')
      .order('created_at')
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/roles — create a new role config
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { value, label, color } = await request.json()
  if (!value?.trim() || !label?.trim() || !color) {
    return NextResponse.json({ error: 'value, label, and color are required' }, { status: 400 })
  }

  const { error } = await adminDb.from('role_configs').insert({ value, label, color })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

// PATCH /api/roles — update label/color for an existing role
export async function PATCH(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { value, label, color } = await request.json()
  if (!value) return NextResponse.json({ error: 'value is required' }, { status: 400 })

  const updates: Record<string, string> = {}
  if (label !== undefined) updates.label = label
  if (color !== undefined) updates.color = color

  const { error } = await adminDb.from('role_configs').update(updates).eq('value', value)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

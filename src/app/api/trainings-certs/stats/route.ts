import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Join employees with their stats
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        bamboo_id,
        photo_url,
        contract_type,
        practice_id,
        practice:practices(id, name),
        stats:employee_training_stats(
          trainings,
          certifications,
          goals,
          company_trainings,
          last_synced_at
        )
      `)
      .not('bamboo_id', 'is', null)
      .eq('status', 'Active')
      .order('full_name')

    if (error) throw error

    const employees = (data ?? []).map(emp => {
      const stats = Array.isArray(emp.stats) ? emp.stats[0] : emp.stats
      const practice = Array.isArray(emp.practice) ? emp.practice[0] : emp.practice
      return {
        id: emp.id,
        full_name: emp.full_name,
        bamboo_id: emp.bamboo_id,
        photo_url: emp.photo_url ?? null,
        contract_type: emp.contract_type ?? null,
        practice_id: emp.practice_id ?? null,
        practice_name: (practice as { name?: string } | null)?.name ?? null,
        trainings: stats?.trainings ?? null,
        certifications: stats?.certifications ?? null,
        goals: stats?.goals ?? null,
        company_trainings: stats?.company_trainings ?? null,
        last_synced_at: stats?.last_synced_at ?? null,
      }
    })

    // Last sync = most recent last_synced_at across all employees
    const timestamps = employees
      .map(e => e.last_synced_at)
      .filter(Boolean)
      .sort()
    const last_synced_at = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null

    return NextResponse.json({ employees, last_synced_at })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

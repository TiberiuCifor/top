import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function bambooAuth() {
  const key = process.env.BAMBOO_API_KEY
  const sub = process.env.BAMBOO_SUBDOMAIN
  if (!key || !sub) throw new Error('BambooHR not configured')
  return {
    base: `https://api.bamboohr.com/api/gateway.php/${sub}/v1`,
    auth: `Basic ${Buffer.from(`${key}:x`).toString('base64')}`,
  }
}

async function fetchSkills(base: string, auth: string, bambooId: string) {
  const r = await fetch(`${base}/employees/${bambooId}/tables/customSkillRepository/`, {
    headers: { Authorization: auth, Accept: 'application/json' },
    next: { revalidate: 0 },
  })
  if (!r.ok) return []
  const raw: Array<{ customSkills: string; customLevel: string }> = await r.json()
  return raw.map(s => ({
    skill: s.customSkills,
    level: parseInt(s.customLevel ?? '0', 10),
  }))
}

async function fetchSeniority(base: string, auth: string, bambooId: string): Promise<string> {
  const r = await fetch(`${base}/employees/${bambooId}?fields=customSeniority1`, {
    headers: { Authorization: auth, Accept: 'application/json' },
    next: { revalidate: 0 },
  })
  if (!r.ok) return ''
  const data = await r.json()
  return data.customSeniority1 ?? ''
}

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { base, auth } = bambooAuth()

      const today = new Date().toISOString().slice(0, 10)

      const [{ data: employees, error }, { data: benchAssignments }] = await Promise.all([
        supabaseAdmin
          .from('employees')
          .select('id, full_name, bamboo_id, practice_id, photo_url, contract_type, practice:practices(id, name)')
          .not('bamboo_id', 'is', null)
          .eq('status', 'Active')
          .order('full_name'),
        supabaseAdmin
          .from('assignments')
          .select('employee_id')
          .eq('project_id', '00000000-0000-0000-0000-000000000001')
          .eq('status', 'active')
          .lte('start_date', today)
          .or(`end_date.is.null,end_date.gte.${today}`),
      ])

      if (error) throw error

      const benchIds = new Set((benchAssignments ?? []).map(a => a.employee_id))

      const empList = employees ?? []
      const BATCH = 5
      const results: Array<{
        id: string; full_name: string; bamboo_id: string | null;
        practice_id: string | null; practice: unknown; photo_url: string | null;
        contract_type: string | null; seniority: string;
        skills: Array<{ skill: string; level: number }>; is_bench: boolean;
      }> = []
      for (let i = 0; i < empList.length; i += BATCH) {
        const batch = empList.slice(i, i + BATCH)
        const batchResults = await Promise.all(
          batch.map(async (emp) => {
            const [skills, seniority] = await Promise.all([
              fetchSkills(base, auth, emp.bamboo_id!),
              fetchSeniority(base, auth, emp.bamboo_id!),
            ])
            return {
              id: emp.id,
              full_name: emp.full_name,
              bamboo_id: emp.bamboo_id,
              practice_id: emp.practice_id,
              practice: emp.practice,
              photo_url: emp.photo_url,
              contract_type: emp.contract_type ?? null,
              seniority,
              skills,
              is_bench: benchIds.has(emp.id),
            }
          })
        )
        results.push(...batchResults)
        if (i + BATCH < empList.length) {
          await new Promise(r => setTimeout(r, 200))
        }
      }

    return NextResponse.json({ employees: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidDate } from '@/lib/training-utils'

// Training completion fields in BambooHR (individual date fields on employee records).
// A field with a non-null, non-zero date means the employee completed that training.
// Field IDs sourced from /v1/meta/fields - integer IDs with "- Completed" in the name.
const TRAINING_FIELD_IDS = [
  '4575','4576','4613','4532','4588','4587',
  '4524','4525','4519','4520','4529','4528',
  '4526','4527','4535','4536','4589','4582',
  '4585','4521','4522','4583','4584','4534',
  '4533','4574','4596','4530','4523','4581',
  '4580','4579','4577','4578','4616','4531',
]

function bambooAuth() {
  const key = process.env.BAMBOO_API_KEY
  const sub = process.env.BAMBOO_SUBDOMAIN
  if (!key || !sub) throw new Error('BambooHR not configured')
  return {
    base: `https://api.bamboohr.com/api/gateway.php/${sub}/v1`,
    auth: `Basic ${Buffer.from(`${key}:x`).toString('base64')}`,
    sub,
  }
}


async function fetchBulkTrainingReport(base: string, auth: string): Promise<Map<string, number>> {
  const body = JSON.stringify({ title: 'Training Summary', fields: TRAINING_FIELD_IDS })
  const res = await fetch(`${base}/reports/custom?format=json`, {
    method: 'POST',
    headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  if (!res.ok) return new Map()
  const data = await res.json()

  const map = new Map<string, number>()
  for (const emp of data.employees ?? []) {
    let count = 0
    for (const id of TRAINING_FIELD_IDS) {
      const val = emp[`${id}.0`] ?? emp[id]
      if (isValidDate(val)) count++
    }
    map.set(String(emp.id), count)
  }
  return map
}

async function fetchCertCount(base: string, auth: string, bambooId: string): Promise<number> {
  const res = await fetch(`${base}/employees/${bambooId}/tables/employeeCertifications/`, {
    headers: { Authorization: auth, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return 0
  const rows = await res.json()
  return Array.isArray(rows) ? rows.length : 0
}

async function fetchGoalCount(base: string, auth: string, bambooId: string): Promise<number> {
  const res = await fetch(`${base}/performance/employees/${bambooId}/goals`, {
    headers: { Authorization: auth, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return 0
  const data = await res.json()
  const list = Array.isArray(data) ? data : (data.goals ?? [])
  return list.length
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { base, auth } = bambooAuth()

    const [{ data: employees, error }, trainingMap] = await Promise.all([
      supabase
        .from('employees')
        .select('id, full_name, bamboo_id, photo_url, contract_type, practice_id, practice:practices(id, name)')
        .not('bamboo_id', 'is', null)
        .eq('status', 'Active')
        .order('full_name'),
      fetchBulkTrainingReport(base, auth),
    ])

    if (error) throw error
    const empList = employees ?? []

    // Fetch certs + goals per employee in large batches (10 in parallel)
    const BATCH = 10
    const results: Array<{
      id: string; full_name: string; bamboo_id: string; photo_url: string | null;
      contract_type: string | null; practice_id: string | null; practice_name: string | null;
      trainings: number; certifications: number; goals: number
    }> = []

    for (let i = 0; i < empList.length; i += BATCH) {
      const batch = empList.slice(i, i + BATCH)
      const batchResults = await Promise.all(
        batch.map(async (emp) => {
          const bambooId = emp.bamboo_id!
          const [certifications, goals] = await Promise.all([
            fetchCertCount(base, auth, bambooId),
            fetchGoalCount(base, auth, bambooId),
          ])
          const practice = emp.practice as { id: string; name: string } | null
          return {
            id: emp.id,
            full_name: emp.full_name,
            bamboo_id: bambooId,
            photo_url: emp.photo_url ?? null,
            contract_type: emp.contract_type ?? null,
            practice_id: emp.practice_id ?? null,
            practice_name: practice?.name ?? null,
            trainings: trainingMap.get(bambooId) ?? 0,
            certifications,
            goals,
          }
        })
      )
      results.push(...batchResults)
    }

    return NextResponse.json({ employees: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── BambooHR ──────────────────────────────────────────────────────────────────
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
  }
}

function isValidDate(d: string | null | undefined) {
  return d && d !== '0000-00-00' && d !== ''
}

// Returns map of bambooId → training count
async function fetchBulkTrainingReport(base: string, auth: string): Promise<Map<string, number>> {
  const body = JSON.stringify({ title: 'Training Sync', fields: TRAINING_FIELD_IDS })
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

// Returns map of bambooId → workEmail
async function fetchWorkEmails(base: string, auth: string): Promise<Map<string, string>> {
  const body = JSON.stringify({ title: 'Email Sync', fields: ['workEmail'] })
  const res = await fetch(`${base}/reports/custom?format=json`, {
    method: 'POST',
    headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  })
  if (!res.ok) return new Map()
  const data = await res.json()
  const map = new Map<string, string>()
  for (const emp of data.employees ?? []) {
    if (emp.workEmail) map.set(String(emp.id), emp.workEmail)
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

// ── KnowBe4 ───────────────────────────────────────────────────────────────────
const KB4_BASE = 'https://eu.api.knowbe4.com/v1'

// Returns map of lowercase email → enrollment count
async function fetchKb4EnrollmentCounts(): Promise<Map<string, number>> {
  const token = process.env.KNOWBE4_API_TOKEN
  if (!token) return new Map()
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  const map = new Map<string, number>()
  let page = 1
  while (true) {
    const res = await fetch(`${KB4_BASE}/training/enrollments?per_page=500&page=${page}`, {
      headers, cache: 'no-store',
    })
    if (!res.ok) break
    const batch: Array<{ user?: { email?: string } }> = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    for (const e of batch) {
      const email = e.user?.email?.toLowerCase()
      if (email) map.set(email, (map.get(email) ?? 0) + 1)
    }
    if (batch.length < 500) break
    page++
  }
  return map
}

// ── Main sync handler ─────────────────────────────────────────────────────────
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { base, auth } = bambooAuth()

    // Fetch employees + BambooHR bulk data + KnowBe4 all in parallel
    const [
      { data: employees, error: empError },
      trainingMap,
      emailMap,
      kb4Map,
    ] = await Promise.all([
      supabase
        .from('employees')
        .select('id, bamboo_id')
        .not('bamboo_id', 'is', null)
        .eq('status', 'Active'),
      fetchBulkTrainingReport(base, auth),
      fetchWorkEmails(base, auth),
      fetchKb4EnrollmentCounts(),
    ])

    if (empError) throw empError
    const empList = employees ?? []

    // Fetch certs + goals per employee in batches of 10
    const BATCH = 10
    const upsertRows: Array<{
      employee_id: string
      trainings: number
      certifications: number
      goals: number
      company_trainings: number
      last_synced_at: string
    }> = []

    const now = new Date().toISOString()

    for (let i = 0; i < empList.length; i += BATCH) {
      const batch = empList.slice(i, i + BATCH)
      const results = await Promise.all(
        batch.map(async emp => {
          const bambooId = emp.bamboo_id!
          const [certifications, goals] = await Promise.all([
            fetchCertCount(base, auth, bambooId),
            fetchGoalCount(base, auth, bambooId),
          ])
          const workEmail = emailMap.get(bambooId)?.toLowerCase() ?? ''
          return {
            employee_id: emp.id,
            trainings: trainingMap.get(bambooId) ?? 0,
            certifications,
            goals,
            company_trainings: workEmail ? (kb4Map.get(workEmail) ?? 0) : 0,
            last_synced_at: now,
          }
        })
      )
      upsertRows.push(...results)
    }

    // Upsert all rows
    const { error: upsertError } = await supabase
      .from('employee_training_stats')
      .upsert(upsertRows, { onConflict: 'employee_id' })

    if (upsertError) throw upsertError

    return NextResponse.json({ success: true, synced: upsertRows.length, synced_at: now })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

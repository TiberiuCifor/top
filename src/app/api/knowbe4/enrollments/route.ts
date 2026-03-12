import { NextResponse } from 'next/server'

const KB4_BASE = 'https://eu.api.knowbe4.com/v1'

function kb4Headers() {
  const token = process.env.KNOWBE4_API_TOKEN
  if (!token) throw new Error('KnowBe4 API token not configured')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function bambooAuth() {
  const key = process.env.BAMBOO_API_KEY
  const sub = process.env.BAMBOO_SUBDOMAIN
  if (!key || !sub) throw new Error('BambooHR not configured')
  return {
    base: `https://api.bamboohr.com/api/gateway.php/${sub}/v1`,
    auth: `Basic ${Buffer.from(`${key}:x`).toString('base64')}`,
  }
}

// Parse "N months", "N weeks", "N days" into milliseconds
function parseRelativeDuration(rel: string): number | null {
  const m = rel.trim().match(/^(\d+)\s+(day|week|month)s?$/i)
  if (!m) return null
  const n = parseInt(m[1])
  const unit = m[2].toLowerCase()
  if (unit === 'day') return n * 86400000
  if (unit === 'week') return n * 7 * 86400000
  if (unit === 'month') return n * 30 * 86400000
  return null
}

interface CampaignMeta {
  end_date: string | null
  relative_duration: string | null
}

export interface Kb4Enrollment {
  enrollment_id: number
  assignment_name: string
  module_name: string
  content_type: string
  status: string
  start_date: string | null
  completion_date: string | null
  enrollment_date: string | null
  due_date: string | null
  policy_acknowledged: boolean
  time_spent: number | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bambooId = searchParams.get('bambooId')
  if (!bambooId) {
    return NextResponse.json({ error: 'bambooId is required' }, { status: 400 })
  }

  try {
    const headers = kb4Headers()

    // Step 1: Get employee work email from BambooHR
    const { base, auth } = bambooAuth()
    const bambooRes = await fetch(`${base}/employees/${bambooId}?fields=workEmail`, {
      headers: { Authorization: auth, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!bambooRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch employee email from BambooHR' }, { status: 500 })
    }
    const bambooData = await bambooRes.json()
    const email: string = bambooData.workEmail
    if (!email) {
      return NextResponse.json({ enrollments: [], note: 'No work email found for employee' })
    }

    // Step 2: Find the KnowBe4 user by email + fetch campaigns in parallel
    const [usersRes, campaignsRes] = await Promise.all([
      fetch(`${KB4_BASE}/users?per_page=500&search=${encodeURIComponent(email)}`, { headers, cache: 'no-store' }),
      fetch(`${KB4_BASE}/training/campaigns?per_page=500`, { headers, cache: 'no-store' }),
    ])

    if (!usersRes.ok) {
      const text = await usersRes.text()
      return NextResponse.json({ error: `KnowBe4 users API returned ${usersRes.status}: ${text}` }, { status: 500 })
    }

    const users: Array<{ id: number; email: string }> = await usersRes.json()
    const matched = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!matched) {
      return NextResponse.json({ enrollments: [], note: `No KnowBe4 user found with email ${email}` })
    }

    // Build campaign map: name -> { end_date, relative_duration }
    const campaignMap = new Map<string, CampaignMeta>()
    if (campaignsRes.ok) {
      const campaigns: Array<{ name: string; end_date: string | null; relative_duration: string | null }> = await campaignsRes.json()
      for (const c of campaigns) {
        if (c.name) campaignMap.set(c.name, { end_date: c.end_date, relative_duration: c.relative_duration })
      }
    }

    // Step 3: Fetch training enrollments for that user (paginate if needed)
    type RawEnrollment = {
      enrollment_id: number
      campaign_name: string
      module_name: string
      content_type: string
      status: string
      start_date: string | null
      completion_date: string | null
      enrollment_date: string | null
      policy_acknowledged: boolean
      time_spent: number | null
    }
    const rawEnrollments: RawEnrollment[] = []
    let page = 1
    while (true) {
      const enrollRes = await fetch(
        `${KB4_BASE}/training/enrollments?user_id=${matched.id}&per_page=500&page=${page}`,
        { headers, cache: 'no-store' }
      )
      if (!enrollRes.ok) break
      const batch: RawEnrollment[] = await enrollRes.json()
      if (!Array.isArray(batch) || batch.length === 0) break
      rawEnrollments.push(...batch)
      if (batch.length < 500) break
      page++
    }

    // Step 4: Compute due_date from campaign data
    const enrollments: Kb4Enrollment[] = rawEnrollments.map(e => {
      let due_date: string | null = null
      const campaign = campaignMap.get(e.campaign_name)
      if (campaign) {
        if (campaign.end_date) {
          due_date = campaign.end_date
        } else if (campaign.relative_duration && e.enrollment_date) {
          const ms = parseRelativeDuration(campaign.relative_duration)
          if (ms !== null) {
            due_date = new Date(new Date(e.enrollment_date).getTime() + ms).toISOString()
          }
        }
      }
      return {
        enrollment_id: e.enrollment_id,
        assignment_name: e.campaign_name,
        module_name: e.module_name,
        content_type: e.content_type,
        status: e.status,
        start_date: e.start_date,
        completion_date: e.completion_date,
        enrollment_date: e.enrollment_date,
        due_date,
        policy_acknowledged: e.policy_acknowledged,
        time_spent: e.time_spent,
      }
    })

    // Sort: incomplete first (by due_date asc), then completed by completion_date desc
    enrollments.sort((a, b) => {
      const aComplete = a.status?.toLowerCase() === 'passed' || a.status?.toLowerCase() === 'completed'
      const bComplete = b.status?.toLowerCase() === 'passed' || b.status?.toLowerCase() === 'completed'
      if (!aComplete && bComplete) return -1
      if (aComplete && !bComplete) return 1
      const aDate = a.due_date ?? a.completion_date ?? ''
      const bDate = b.due_date ?? b.completion_date ?? ''
      return aDate.localeCompare(bDate)
    })

    return NextResponse.json({ enrollments, email })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

async function bambooFetch(path: string) {
  const subdomain = process.env.BAMBOO_SUBDOMAIN
  const apiKey = process.env.BAMBOO_API_KEY
  if (!subdomain || !apiKey) throw new Error('BambooHR not configured')
  const auth = Buffer.from(`${apiKey}:x`).toString('base64')
  const res = await fetch(
    `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/${path}`,
    { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`BambooHR error ${res.status}`)
  return res.json()
}

export async function GET(req: NextRequest) {
  const bambooId = req.nextUrl.searchParams.get('bambooId')
  const name = req.nextUrl.searchParams.get('name')

  if (!bambooId && !name) {
    return NextResponse.json({ error: 'Provide bambooId or name' }, { status: 400 })
  }

  try {
    let resolvedId = bambooId

    if (!resolvedId && name) {
      const dir = await bambooFetch('employees/directory')
      const employees: Array<{ id: string; displayName: string }> = dir.employees ?? []
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const needle = normalize(name)
      const match = employees.find(e => normalize(e.displayName) === needle)
      if (!match) return NextResponse.json({ error: 'Employee not found in BambooHR', name }, { status: 404 })
      resolvedId = match.id
    }

    const raw: Array<{
      id: number
      employeeId: number
      customSkills: string
      customLevel: string
      customComments1: string | null
    }> = await bambooFetch(`employees/${resolvedId}/tables/customSkillRepository/`)

    const skills = raw.map(r => ({
      id: r.id,
      skill: r.customSkills,
      level: parseInt(r.customLevel ?? '0', 10),
      comment: r.customComments1 ?? null,
    }))

    return NextResponse.json({ bambooId: resolvedId, skills })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

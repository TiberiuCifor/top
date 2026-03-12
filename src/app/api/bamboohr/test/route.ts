import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { apiKey, subdomain } = await req.json()
    const key = apiKey || process.env.BAMBOO_API_KEY
    const sub = subdomain || process.env.BAMBOO_SUBDOMAIN
    if (!key || !sub) {
      return NextResponse.json({ error: 'Missing BambooHR credentials' }, { status: 400 })
    }
    const auth = Buffer.from(`${key}:x`).toString('base64')
    const res = await fetch(`https://api.bamboohr.com/api/gateway.php/${sub}/v1/employees/directory`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `BambooHR returned ${res.status}: ${text}` }, { status: 400 })
    }
    const data = await res.json()
    const count = data?.employees?.length ?? 0
    return NextResponse.json({ success: true, employeeCount: count })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

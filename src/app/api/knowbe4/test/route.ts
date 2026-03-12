import { NextResponse } from 'next/server'

const KB4_BASE = 'https://eu.api.knowbe4.com/v1'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    const apiToken = token || process.env.KNOWBE4_API_TOKEN
    if (!apiToken) return NextResponse.json({ error: 'No token provided' }, { status: 400 })

    const res = await fetch(`${KB4_BASE}/users?per_page=1`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `KnowBe4 returned ${res.status}: ${text}` }, { status: 400 })
    }

    // Also fetch account info for a richer success message
    const accountRes = await fetch(`${KB4_BASE}/account`, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    })
    if (accountRes.ok) {
      const account = await accountRes.json()
      return NextResponse.json({ success: true, name: account.name, seats: account.current_risk_score_date ? undefined : account.number_of_seats })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

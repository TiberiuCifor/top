import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    const apiToken = token || process.env.WORKABLE_API_TOKEN
    if (!apiToken) return NextResponse.json({ error: 'No token provided' }, { status: 400 })

    const res = await fetch('https://www.workable.com/spi/v3/accounts', {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Workable returned ${res.status}: ${text}` }, { status: 400 })
    }

    const data = await res.json()
    const accounts: { name: string; subdomain: string }[] = data?.data ?? []
    return NextResponse.json({ success: true, accounts })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

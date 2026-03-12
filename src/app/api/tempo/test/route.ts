import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    const tempoToken = token || process.env.TEMPO_API_TOKEN
    if (!tempoToken) {
      return NextResponse.json({ error: 'Missing Tempo API token' }, { status: 400 })
    }
    const res = await fetch('https://api.tempo.io/4/worklogs?limit=1', {
      headers: { Authorization: `Bearer ${tempoToken}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Tempo returned ${res.status}: ${text}` }, { status: 400 })
    }
    const data = await res.json()
    return NextResponse.json({ success: true, total: data.metadata?.count ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

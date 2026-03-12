import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { baseUrl, email, token } = await req.json()
    const jiraBase = baseUrl || process.env.JIRA_BASE_URL
    const jiraEmail = email || process.env.JIRA_EMAIL
    const jiraToken = token || process.env.JIRA_API_TOKEN
    if (!jiraBase || !jiraEmail || !jiraToken) {
      return NextResponse.json({ error: 'Missing JIRA credentials' }, { status: 400 })
    }
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')
    const res = await fetch(`${jiraBase}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `JIRA returned ${res.status}: ${text}` }, { status: 400 })
    }
    const data = await res.json()
    return NextResponse.json({ success: true, displayName: data.displayName, email: data.emailAddress })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

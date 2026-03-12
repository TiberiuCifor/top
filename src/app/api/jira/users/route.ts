import { NextResponse } from 'next/server'

export async function GET() {
  const JIRA_BASE = process.env.JIRA_BASE_URL!
  const JIRA_EMAIL = process.env.JIRA_EMAIL!
  const JIRA_TOKEN = process.env.JIRA_API_TOKEN!
  const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
  try {
    const allUsers: any[] = []
    let startAt = 0
    const maxResults = 200

    while (true) {
      const res = await fetch(
        `${JIRA_BASE}/rest/api/3/users/search?maxResults=${maxResults}&startAt=${startAt}`,
        {
          headers: {
            'Authorization': `Basic ${AUTH}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        }
      )

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: err }, { status: res.status })
      }

      const batch: any[] = await res.json()
      if (!batch.length) break

      const active = batch.filter(
        (u) => u.accountType === 'atlassian' && u.active && u.displayName
      )
      allUsers.push(...active)

      if (batch.length < maxResults) break
      startAt += maxResults
    }

    const users = allUsers.map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress ?? null,
      avatarUrl: u.avatarUrls?.['24x24'] ?? null,
    }))

    users.sort((a, b) => a.displayName.localeCompare(b.displayName))

    return NextResponse.json({ users })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

export async function GET() {
  const JIRA_BASE = process.env.JIRA_BASE_URL!
  const JIRA_EMAIL = process.env.JIRA_EMAIL!
  const JIRA_TOKEN = process.env.JIRA_API_TOKEN!
  const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
  try {
    let allProjects: any[] = []
    let startAt = 0
    const maxResults = 100

    while (true) {
      const res = await fetch(
        `${JIRA_BASE}/rest/api/3/project/search?maxResults=${maxResults}&startAt=${startAt}&orderBy=name`,
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

      const data = await res.json()
      allProjects = allProjects.concat(data.values || [])

      if (data.isLast || allProjects.length >= data.total) break
      startAt += maxResults
    }

    const projects = allProjects.map((p: any) => ({
      key: p.key,
      name: p.name,
      id: p.id,
      avatarUrl: p.avatarUrls?.['24x24'] || null,
    }))

    return NextResponse.json({ projects })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

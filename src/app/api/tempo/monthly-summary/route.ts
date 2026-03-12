import { NextResponse } from 'next/server'

async function resolveIssueProjects(issueIds: number[], jiraBase: string, jiraAuth: string): Promise<Record<number, string>> {
  const map: Record<number, string> = {}
  const CHUNK = 100
  for (let i = 0; i < issueIds.length; i += CHUNK) {
    const chunk = issueIds.slice(i, i + CHUNK)
    const res = await fetch(`${jiraBase}/rest/api/3/issue/bulkfetch`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${jiraAuth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ issueIdsOrKeys: chunk.map(String), fields: ['project'] }),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      for (const issue of data.issues || []) {
        map[Number(issue.id)] = issue.fields?.project?.key || ''
      }
    }
  }
  return map
}

export async function GET(request: Request) {
  const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN!
  const JIRA_BASE = process.env.JIRA_BASE_URL!
  const JIRA_EMAIL = process.env.JIRA_EMAIL!
  const JIRA_TOKEN = process.env.JIRA_API_TOKEN!
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')

  if (!month) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
  }

  const [year, mon] = month.split('-').map(Number)
  const from = `${year}-${String(mon).padStart(2, '0')}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const to = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  try {
    const JIRA_AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
    let allWorklogs: any[] = []
    let nextUrl: string | null = `https://api.tempo.io/4/worklogs?from=${from}&to=${to}&limit=1000&offset=0`

    while (nextUrl) {
      const res: Response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${TEMPO_TOKEN}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          const err = await res.text()
          return NextResponse.json({ error: err }, { status: res.status })
        }
        const data: any = await res.json()
      allWorklogs = allWorklogs.concat(data.results || [])
      nextUrl = data.metadata?.next ?? null
    }

    const uniqueIssueIds = [...new Set(allWorklogs.map((w: any) => Number(w.issue.id)))]
        const issueProjectMap = await resolveIssueProjects(uniqueIssueIds, JIRA_BASE, JIRA_AUTH)

    const hoursByProject: Record<string, number> = {}
    for (const log of allWorklogs) {
      const projectKey = issueProjectMap[Number(log.issue.id)]
      if (!projectKey) continue
      hoursByProject[projectKey] = (hoursByProject[projectKey] || 0) + log.timeSpentSeconds / 3600
    }

    return NextResponse.json({ hoursByProject, from, to })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

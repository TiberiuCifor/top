import { NextResponse } from 'next/server'

function getJiraAuth(email: string, token: string) {
  return Buffer.from(`${email}:${token}`).toString('base64')
}

interface IssueInfo { projectKey: string; summary: string; key: string }

async function resolveIssueProjects(issueIds: number[], jiraBase: string, jiraAuth: string): Promise<Record<number, IssueInfo>> {
  const map: Record<number, IssueInfo> = {}
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
      body: JSON.stringify({ issueIdsOrKeys: chunk.map(String), fields: ['project', 'summary'] }),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      for (const issue of data.issues || []) {
        map[Number(issue.id)] = {
          projectKey: issue.fields?.project?.key || '',
          summary: issue.fields?.summary || '',
          key: issue.key || '',
        }
      }
    }
  }
  return map
}

async function resolveUsers(accountIds: string[], jiraBase: string, jiraAuth: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  await Promise.all(
    accountIds.map(async (id) => {
      try {
          const res = await fetch(`${jiraBase}/rest/api/3/user?accountId=${id}`, {
            headers: { Authorization: `Basic ${jiraAuth}`, Accept: 'application/json' },
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json()
          map[id] = data.displayName || id
        } else {
          map[id] = id
        }
      } catch {
        map[id] = id
      }
    })
  )
  return map
}

export async function GET(request: Request) {
  const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN!
  const JIRA_BASE = process.env.JIRA_BASE_URL!
  const JIRA_EMAIL = process.env.JIRA_EMAIL!
  const JIRA_TOKEN = process.env.JIRA_API_TOKEN!
  const jiraAuth = getJiraAuth(JIRA_EMAIL, JIRA_TOKEN)
  const { searchParams } = new URL(request.url)
  const projectKey = searchParams.get('projectKey')
  const projectKeys = searchParams.get('projectKeys')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const keys: string[] = projectKeys
    ? projectKeys.split(',').map(k => k.trim()).filter(Boolean)
    : projectKey
    ? [projectKey]
    : []

  if (keys.length === 0 || !from || !to) {
    return NextResponse.json({ error: 'projectKey(s), from, to are required' }, { status: 400 })
  }

  try {
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
        const results: any[] = data.results || []
        allWorklogs = allWorklogs.concat(results)
        nextUrl = data.metadata?.next ?? null
      }

    const uniqueIssueIds = [...new Set(allWorklogs.map((w: any) => Number(w.issue.id)))]
    const issueProjectMap = await resolveIssueProjects(uniqueIssueIds, JIRA_BASE, jiraAuth)

      const filtered = allWorklogs.filter(
        (w: any) => keys.includes(issueProjectMap[Number(w.issue.id)]?.projectKey)
      )

      const uniqueAccountIds = [...new Set(filtered.map((w: any) => w.author.accountId))]
      const userMap = await resolveUsers(uniqueAccountIds, JIRA_BASE, jiraAuth)

      type UserEntry = {
        displayName: string
        days: Record<string, number>
        byProject: Record<string, Record<string, number>>
        tasks: Record<string, Record<string, string[]>>
      }
      const byUser: Record<string, UserEntry> = {}
      for (const log of filtered) {
        const accountId = log.author.accountId
        const displayName = userMap[accountId] || accountId
        const date = log.startDate
        const hours = log.timeSpentSeconds / 3600
        const info = issueProjectMap[Number(log.issue.id)] || { projectKey: '', summary: '', key: '' }
        const proj = info.projectKey
        const taskLabel = info.key && info.summary ? `${info.key}: ${info.summary}` : info.key || info.summary || ''
        if (!byUser[accountId]) byUser[accountId] = { displayName, days: {}, byProject: {}, tasks: {} }
        byUser[accountId].days[date] = (byUser[accountId].days[date] || 0) + hours
        if (!byUser[accountId].byProject[proj]) byUser[accountId].byProject[proj] = {}
        byUser[accountId].byProject[proj][date] = (byUser[accountId].byProject[proj][date] || 0) + hours
        if (!byUser[accountId].tasks[proj]) byUser[accountId].tasks[proj] = {}
        if (!byUser[accountId].tasks[proj][date]) byUser[accountId].tasks[proj][date] = []
        if (taskLabel && !byUser[accountId].tasks[proj][date].includes(taskLabel)) {
          byUser[accountId].tasks[proj][date].push(taskLabel)
        }
      }

        return NextResponse.json({ byUser, total: filtered.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

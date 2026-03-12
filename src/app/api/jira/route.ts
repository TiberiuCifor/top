import { NextResponse } from 'next/server'

function extractTextFromADF(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  if (node.type === 'mention') return node.attrs?.text || ''
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromADF).join('')
  }
  return ''
}

export async function GET(request: Request) {
  const JIRA_BASE = process.env.JIRA_BASE_URL!
  const JIRA_EMAIL = process.env.JIRA_EMAIL!
  const JIRA_TOKEN = process.env.JIRA_API_TOKEN!
  const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
  const { searchParams } = new URL(request.url)
  const project = searchParams.get('project') || 'TP'
  const status = searchParams.get('status') || 'In Progress'

  try {
    const res = await fetch(`${JIRA_BASE}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
          jql: `project=${project} AND status="${status}" AND issuetype in (Task, Story) ORDER BY updated DESC`,
        maxResults: 100,
        fields: ['summary', 'assignee', 'status', 'comment', 'updated'],
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()

    const issues = (data.issues || []).map((issue: any) => {
      const comments: any[] = issue.fields.comment?.comments || []
      const lastComment = comments.length > 0 ? comments[comments.length - 1] : null

      let lastCommentText = ''
      let lastCommentAuthor = ''
      let lastCommentDate = ''

      if (lastComment) {
        lastCommentAuthor = lastComment.author?.displayName || ''
        lastCommentDate = lastComment.updated || lastComment.created || ''
        lastCommentText = extractTextFromADF(lastComment.body).trim()
      }

      return {
        key: issue.key,
        url: `${JIRA_BASE}/browse/${issue.key}`,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName || null,
        assigneeAvatar: issue.fields.assignee?.avatarUrls?.['24x24'] || null,
        status: issue.fields.status?.name || '',
        lastCommentText,
        lastCommentAuthor,
        lastCommentDate,
      }
    })

    return NextResponse.json({ issues, total: issues.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

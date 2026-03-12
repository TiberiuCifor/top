'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Loader2, MessageSquare, RefreshCw } from 'lucide-react'

interface JiraIssue {
  key: string
  url: string
  summary: string
  assignee: string | null
  assigneeAvatar: string | null
  status: string
  lastCommentText: string | null
  lastCommentAuthor: string | null
  lastCommentDate: string | null
}

function normalizeStatus(status: string) {
  const value = status.toLowerCase()
  if (value.includes('to do') || value === 'todo') return 'todo'
  if (value.includes('progress')) return 'inProgress'
  if (value.includes('block') || value.includes('hold')) return 'blocked'
  return 'other'
}

function formatCommentDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CommentTooltip({ issue, colors }: { issue: JiraIssue; colors: { dot: string } }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  if (!issue.lastCommentText) return null

  const truncated =
    issue.lastCommentText.length > 220
      ? issue.lastCommentText.slice(0, 220).trimEnd() + '…'
      : issue.lastCommentText

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Show last comment"
      >
        <MessageSquare className="w-3 h-3" />
        <span>Last comment</span>
      </button>

      {visible && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-lg border border-border bg-popover shadow-xl p-3 space-y-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            <span className="text-xs font-semibold text-foreground">
              {issue.lastCommentAuthor || 'Unknown'}
            </span>
            {issue.lastCommentDate && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {formatCommentDate(issue.lastCommentDate)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{truncated}</p>
        </div>
      )}
    </div>
  )
}

function Column({
  title,
  tone,
  issues,
  loading,
  emptyMessage,
}: {
  title: string
  tone: 'blue' | 'emerald' | 'amber'
  issues: JiraIssue[]
  loading: boolean
  emptyMessage: string
}) {
  const toneClasses = {
    blue: {
      pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
      border: 'border-blue-500/25',
      dot: 'bg-blue-500',
    },
    emerald: {
      pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      border: 'border-emerald-500/25',
      dot: 'bg-emerald-500',
    },
    amber: {
      pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      border: 'border-amber-500/25',
      dot: 'bg-amber-500',
    },
  }

  const colors = toneClasses[tone]

  return (
    <section className={`rounded-xl border bg-card ${colors.border} min-h-[420px] flex flex-col`}>
      <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={`text-xs font-semibold rounded-full border px-2 py-0.5 ${colors.pill}`}>
          {loading ? '...' : issues.length}
        </span>
      </div>

      <div className="p-3 flex-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tickets...
          </div>
        ) : issues.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <article
                key={issue.key}
                className="rounded-lg border border-border bg-background/70 p-3 hover:border-[#ea2775]/35 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />
                  <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-start gap-1.5 text-sm font-medium text-foreground hover:text-[#ea2775] transition-colors min-w-0"
                        >
                          <span className="leading-snug">{issue.summary}</span>
                          <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground group-hover:text-[#ea2775] transition-colors" />
                        </a>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {issue.assigneeAvatar ? (
                            <img
                              src={issue.assigneeAvatar}
                              alt={issue.assignee || 'Unassigned'}
                              title={issue.assignee || 'Unassigned'}
                              className="w-6 h-6 rounded-full shrink-0 ring-1 ring-border"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full shrink-0 bg-muted flex items-center justify-center ring-1 ring-border"
                              title={issue.assignee || 'Unassigned'}
                            >
                              <span className="text-[9px] font-semibold text-muted-foreground uppercase leading-none">
                                {issue.assignee ? issue.assignee[0] : '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {issue.assignee || <span className="italic">Unassigned</span>}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{issue.key}</div>
                      {issue.lastCommentText && (
                        <div className="mt-2">
                          <CommentTooltip issue={issue} colors={colors} />
                        </div>
                      )}
                    </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function PreSalesPage() {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')

  const fetchIssues = async () => {
    setLoading(true)
    setError(null)

    try {
      const [resTodo, resProgress, resBlocked] = await Promise.all([
        fetch('/api/jira?project=TP&status=To%20Do'),
        fetch('/api/jira?project=TP&status=In%20Progress'),
        fetch('/api/jira?project=TP&status=Blocked%2FOn%20Hold'),
      ])

      const [todoData, progressData, blockedData] = await Promise.all([
        resTodo.json(),
        resProgress.json(),
        resBlocked.json(),
      ])

      if (todoData.error) throw new Error(todoData.error)
      if (progressData.error) throw new Error(progressData.error)
      if (blockedData.error) throw new Error(blockedData.error)

      const allIssues = [
        ...(todoData.issues || []),
        ...(progressData.issues || []),
        ...(blockedData.issues || []),
      ] as JiraIssue[]

      const deduped = Array.from(new Map(allIssues.map(issue => [issue.key, issue])).values())
      setIssues(deduped)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [])

  const assignees = useMemo(() => {
    const names = issues
      .map(i => i.assignee)
      .filter((a): a is string => !!a)
    return Array.from(new Set(names)).sort()
  }, [issues])

  const filtered = useMemo(() => {
    if (!assigneeFilter) return issues
    return issues.filter(i => i.assignee === assigneeFilter)
  }, [issues, assigneeFilter])

  const grouped = useMemo(() => {
    return filtered.reduce(
      (acc, issue) => {
        const bucket = normalizeStatus(issue.status)
        if (bucket === 'todo') acc.todo.push(issue)
        else if (bucket === 'inProgress') acc.inProgress.push(issue)
        else if (bucket === 'blocked') acc.blocked.push(issue)
        return acc
      },
      {
        todo: [] as JiraIssue[],
        inProgress: [] as JiraIssue[],
        blocked: [] as JiraIssue[],
      }
    )
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Pre-Sales Updates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Three-lane opportunity board from JIRA</p>
        </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#ea2775]/50"
            >
              <option value="">All Assignees</option>
              {assignees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {assigneeFilter && (
              <button
                onClick={() => setAssigneeFilter('')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear
              </button>
            )}
            <div className="flex flex-col items-end gap-0.5">
              <button
                onClick={fetchIssues}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums whitespace-nowrap">
                Last sync {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load JIRA data: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Column
          title="New Opportunities"
          tone="blue"
          issues={grouped.todo}
          loading={loading}
          emptyMessage="No tickets in To Do."
        />
        <Column
          title="In Progress"
          tone="emerald"
          issues={grouped.inProgress}
          loading={loading}
          emptyMessage="No tickets in progress."
        />
        <Column
          title="Blocked"
          tone="amber"
          issues={grouped.blocked}
          loading={loading}
          emptyMessage="No blocked/on-hold tickets."
        />
      </div>
    </div>
  )
}

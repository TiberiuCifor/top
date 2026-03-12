'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, AlertTriangle, ChevronRight, Loader2, CircleDot } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface JiraIssue {
  key: string
  url: string
  summary: string
  assignee: string | null
  status: string
}

function useFetchIssues(status: string) {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/jira?project=TP&status=${encodeURIComponent(status)}`)
      .then(r => r.json())
      .then(d => setIssues(d.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }, [status])

  return { issues, loading }
}

export function PreSalesStatus() {
  const router = useRouter()
  const { issues: todo, loading: loadingTodo } = useFetchIssues('To Do')
  const { issues: inProgress, loading: loadingIn } = useFetchIssues('In Progress')
  const { issues: blocked, loading: loadingBlocked } = useFetchIssues('Blocked/On Hold')

  const loading = loadingTodo || loadingIn || loadingBlocked

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-muted">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">Pre-Sales Status</h3>
        </div>
        <button
          onClick={() => router.push('/projects-updates/pre-sales')}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-3 divide-x divide-border">
          <Section
            label="To Do"
            count={todo.length}
            accent="blue"
            issues={todo}
          />
          <Section
            label="In Progress"
            count={inProgress.length}
            accent="emerald"
            issues={inProgress}
          />
          <Section
            label="Blocked"
            count={blocked.length}
            accent="amber"
            issues={blocked}
          />
        </div>
      )}
    </div>
  )
}

function Section({
  label,
  count,
  accent,
  issues,
}: {
  label: string
  count: number
  accent: 'blue' | 'emerald' | 'amber'
  issues: JiraIssue[]
}) {
  const accentMap = {
    blue: {
      dot: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-700',
      icon: <CircleDot className="w-3.5 h-3.5" />,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    emerald: {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    amber: {
      dot: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-700',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      iconBg: 'bg-amber-50 text-amber-600',
    },
  }
  const a = accentMap[accent]

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-md ${a.iconBg}`}>{a.icon}</div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${a.badge}`}>
          {count}
        </span>
      </div>
      {issues.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <ul className="space-y-2.5">
          {issues.map(issue => (
            <li key={issue.key} className="flex items-start gap-2 group">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${a.dot}`} />
              <div className="min-w-0">
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground leading-snug group-hover:text-blue-500 transition-colors line-clamp-2 block"
                >
                  {issue.summary}
                </a>
                {issue.assignee && (
                  <span className="text-xs text-muted-foreground mt-0.5 block">
                    {issue.assignee}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

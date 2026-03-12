'use client'
import { useState, useEffect } from 'react'
import { Briefcase, RefreshCw, Users, MapPin, Building2, ExternalLink, ChevronDown } from 'lucide-react'

const STAGES = ['Applied', 'Assessment', 'HR Interview', 'Technical Interview', 'Hiring Manager', 'Offer']

const STAGE_COLORS: Record<string, string> = {
  'Applied':              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Assessment':           'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'HR Interview':         'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Technical Interview':  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Hiring Manager':       'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Offer':                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  internal:  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  closed:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400',
}

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  internal:  'Internal',
  closed:    'Closed',
}

type FilterValue = 'all' | 'published' | 'internal' | 'closed'

interface JobRow {
  shortcode: string
  title: string
  department: string
  location: string
  status: string
  stageCounts: Record<string, number>
  total: number
}

export default function HiringPipelinePage() {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filter, setFilter] = useState<FilterValue>('published')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workable/pipeline')
      if (!res.ok) throw new Error('Failed to load pipeline data')
      const data = await res.json()
      setJobs(data.jobs ?? [])
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  const totalByStage = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = filteredJobs.reduce((sum, j) => sum + (j.stageCounts[s] ?? 0), 0)
    return acc
  }, {})
  const grandTotal = filteredJobs.reduce((sum, j) => sum + j.total, 0)

  const filterOptions: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All Jobs' },
    { value: 'published', label: 'Published' },
    { value: 'internal', label: 'Internal' },
    { value: 'closed', label: 'Closed' },
  ]

  const selectedLabel = filterOptions.find(o => o.value === filter)?.label ?? 'All Jobs'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredJobs.length} open position{filteredJobs.length !== 1 ? 's' : ''} · {grandTotal} active candidate{grandTotal !== 1 ? 's' : ''}
            {lastUpdated && (
              <span className="ml-2 text-xs">· Last updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter combobox */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-accent transition-colors min-w-[130px] justify-between"
            >
              <span>{selectedLabel}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                {filterOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilter(opt.value); setDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent ${filter === opt.value ? 'text-foreground font-medium bg-muted/50' : 'text-muted-foreground'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map(stage => (
          <div key={stage} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground truncate">{stage}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalByStage[stage]}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading pipeline data from Workable…</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Location</th>
                  {STAGES.map(stage => (
                    <th key={stage} className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      {stage}
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => (
                  <tr key={job.shortcode} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground">{job.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[job.status] ?? STATUS_STYLES.published}`}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">{job.department || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">{job.location || '—'}</span>
                      </div>
                    </td>
                    {STAGES.map(stage => {
                      const count = job.stageCounts[stage] ?? 0
                      return (
                        <td key={stage} className="px-4 py-3 text-center">
                          {count > 0 ? (
                            <span className={`inline-flex items-center justify-center min-w-[28px] h-7 rounded-full text-xs font-semibold px-2 ${STAGE_COLORS[stage]}`}>
                              {count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {job.total}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://tecknoworks.workable.com/jobs/${job.shortcode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Open in Workable"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
                {filteredJobs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4 + STAGES.length + 2} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No jobs match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredJobs.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="px-4 py-3 font-semibold text-foreground" colSpan={4}>Total</td>
                    {STAGES.map(stage => (
                      <td key={stage} className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] h-7 rounded-full text-xs font-semibold px-2 ${STAGE_COLORS[stage]}`}>
                          {totalByStage[stage]}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-foreground">{grandTotal}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

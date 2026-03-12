'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { ArrowLeft, GraduationCap, Award, Target, Calendar, CheckCircle2, Clock, RefreshCw, AlertCircle, ShieldCheck, BookOpen } from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'
import { supabase } from '@/lib/supabase'

interface TrainingRow {
  name: string
  completionDate: string
}

interface CertRow {
  id?: string
  title?: string
  completionDate?: string
  certificationNumber?: string
  expirationDate?: string
  notes?: string
}

interface GoalRow {
  id?: string
  title?: string
  description?: string
  percentComplete?: number | string
  dueDate?: string
  status?: string
}

interface DetailData {
  trainings: TrainingRow[]
  certifications: CertRow[]
  goals: GoalRow[]
}

interface Kb4Enrollment {
  enrollment_id: number
  assignment_name: string
  module_name: string
  content_type: string
  status: string
  start_date: string | null
  completion_date: string | null
  due_date: string | null
}

function formatDate(d?: string) {
  if (!d || d === '0000-00-00') return null
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color =
    clamped === 100 ? 'bg-emerald-500' :
    clamped >= 70 ? 'bg-blue-500' :
    clamped >= 40 ? 'bg-amber-500' :
    'bg-rose-400'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right flex-shrink-0">{clamped}%</span>
    </div>
  )
}

function GoalStatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase()
  let cls = 'bg-muted text-muted-foreground'
  if (s === 'completed' || s === 'complete') cls = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  else if (s === 'in progress' || s === 'in_progress') cls = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
  else if (s === 'not started' || s === 'not_started') cls = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status ?? '—'}
    </span>
  )
}

function Kb4StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase()
  let cls = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400'
  let label = status ?? '—'
  if (s === 'passed' || s === 'completed') {
    cls = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    label = 'Completed'
  } else if (s === 'in_progress' || s === 'in progress') {
    cls = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    label = 'In Progress'
  } else if (s === 'not_started' || s === 'not started') {
    cls = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400'
    label = 'Not Started'
  } else if (s === 'failed') {
    cls = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    label = 'Failed'
  } else if (s === 'overdue') {
    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    label = 'Overdue'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function SectionHeader({ icon, label, count, color }: {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-border ${color}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon}
        <h3 className="font-semibold text-sm text-foreground">{label}</h3>
      </div>
      <span className="text-xs font-medium text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full border border-border/50">
        {count}
      </span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-center text-xs text-muted-foreground/60 italic">{message}</div>
  )
}

function EmployeeTrainingsDetailInner() {
  const router = useRouter()
  const routeParams = useParams()
  const searchParams = useSearchParams()
  const bambooId = searchParams.get('bambooId')
  const name = searchParams.get('name') ?? 'Employee'
  const employeeId = routeParams.employeeId as string

  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [kb4Enrollments, setKb4Enrollments] = useState<Kb4Enrollment[]>([])
  const [kb4Loading, setKb4Loading] = useState(true)
  const [kb4Note, setKb4Note] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) return
    supabase
      .from('employees')
      .select('photo_url')
      .eq('id', employeeId)
      .single()
      .then(({ data }) => {
        if (data?.photo_url) setPhotoUrl(data.photo_url)
      })
  }, [employeeId])

  async function load() {
    if (!bambooId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bamboohr/trainings-detail?bambooId=${bambooId}`)
      if (!res.ok) throw new Error('Failed to load employee details')
      const json = await res.json()
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [bambooId])

  async function loadKb4() {
    if (!bambooId) return
    setKb4Loading(true)
    setKb4Note(null)
    try {
      const res = await fetch(`/api/knowbe4/enrollments?bambooId=${bambooId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load KnowBe4 data')
      setKb4Enrollments(json.enrollments ?? [])
      if (json.note) setKb4Note(json.note)
    } catch {
      setKb4Enrollments([])
    } finally {
      setKb4Loading(false)
    }
  }

  useEffect(() => { loadKb4() }, [bambooId])

  const trainings = data?.trainings ?? []
  const certifications = data?.certifications ?? []
  const goals = data?.goals ?? []

  const isRefreshing = loading || kb4Loading

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <EmployeeAvatar name={name} photoUrl={photoUrl} size="md" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{name}</h2>
            <p className="text-xs text-muted-foreground">Training profile</p>
          </div>
        </div>
        <button
          onClick={() => { load(); loadKb4() }}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat chips */}
      {!loading && data && (
        <div className="flex flex-wrap gap-2">
          <StatChip icon={<GraduationCap className="w-3.5 h-3.5 text-blue-500" />} label="Trainings" value={trainings.length} bg="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" />
          <StatChip icon={<Award className="w-3.5 h-3.5 text-amber-500" />} label="Certifications" value={certifications.length} bg="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" />
          <StatChip icon={<Target className="w-3.5 h-3.5 text-emerald-500" />} label="Goals" value={goals.length} bg="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" />
          {!kb4Loading && (
            <StatChip icon={<ShieldCheck className="w-3.5 h-3.5 text-rose-500" />} label="Company Trainings" value={kb4Enrollments.length} bg="bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800" />
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* BambooHR section group */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading from BambooHR…</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Trainings + Certifications side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Trainings */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <SectionHeader
                icon={<GraduationCap className="w-4 h-4 text-blue-500" />}
                label="Trainings"
                count={trainings.length}
                color="bg-blue-50/50 dark:bg-blue-950/20"
              />
              {trainings.length === 0 ? (
                <EmptyState message="No training records found." />
              ) : (
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {trainings.map((t, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-foreground leading-snug">{t.name}</p>
                      </div>
                      {formatDate(t.completionDate) && (
                        <span className="text-[11px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                          {formatDate(t.completionDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <SectionHeader
                icon={<Award className="w-4 h-4 text-amber-500" />}
                label="Certifications"
                count={certifications.length}
                color="bg-amber-50/50 dark:bg-amber-950/20"
              />
              {certifications.length === 0 ? (
                <EmptyState message="No certification records found." />
              ) : (
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {certifications.map((c, i) => (
                    <div key={c.id ?? i} className="px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Award className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground leading-snug">{c.title || 'Unnamed Certification'}</p>
                            {c.certificationNumber && (
                              <p className="text-[11px] text-muted-foreground">№ {c.certificationNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          {c.completionDate && formatDate(c.completionDate) && (
                            <span className="text-[11px] text-muted-foreground">{formatDate(c.completionDate)}</span>
                          )}
                          {c.expirationDate && formatDate(c.expirationDate) && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400">Exp. {formatDate(c.expirationDate)}</span>
                          )}
                        </div>
                      </div>
                      {c.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 ml-6 line-clamp-1">{c.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Goals full-width */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <SectionHeader
              icon={<Target className="w-4 h-4 text-emerald-500" />}
              label="Goals"
              count={goals.length}
              color="bg-emerald-50/50 dark:bg-emerald-950/20"
            />
            {goals.length === 0 ? (
              <EmptyState message="No goals found." />
            ) : (
              <div className="divide-y divide-border">
                {goals.map((g, i) => {
                  const pct = typeof g.percentComplete === 'string'
                    ? parseFloat(g.percentComplete) || 0
                    : (g.percentComplete ?? 0)
                  return (
                    <div key={g.id ?? i} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Target className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">{g.title || 'Untitled Goal'}</p>
                            {g.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{g.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <GoalStatusBadge status={g.status} />
                          {g.dueDate && formatDate(g.dueDate) && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(g.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-6">
                        <ProgressBar pct={pct} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Divider with label */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          Security & Compliance
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Company Trainings — KnowBe4 — visually distinct */}
      <div className="rounded-xl overflow-hidden border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Company Trainings</h3>
            <p className="text-[11px] text-muted-foreground">KnowBe4 security awareness</p>
          </div>
          <div className="flex items-center gap-2">
            {kb4Loading ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <div className="w-3 h-3 border border-rose-400 border-t-transparent rounded-full animate-spin" />
                Loading…
              </span>
            ) : (
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                {kb4Enrollments.length} trainings
              </span>
            )}
          </div>
        </div>

        {kb4Loading ? (
          <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            Loading from KnowBe4…
          </div>
        ) : kb4Note && kb4Enrollments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{kb4Note}</div>
        ) : kb4Enrollments.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <BookOpen className="w-8 h-8 text-rose-200 dark:text-rose-900 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No training assignments found in KnowBe4.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-rose-200/70 dark:border-rose-900/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Training Name</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Due</th>
                </tr>
              </thead>
              <tbody>
                {kb4Enrollments.map((e, i) => (
                  <tr
                    key={e.enrollment_id ?? i}
                    className="border-b border-rose-100 dark:border-rose-900/30 last:border-0 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{e.module_name || e.assignment_name || '—'}</p>
                      {e.assignment_name && e.module_name && e.assignment_name !== e.module_name && (
                        <p className="text-muted-foreground mt-0.5">{e.assignment_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {e.content_type ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-100/70 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 capitalize border border-rose-200/50 dark:border-rose-800/50">
                          {e.content_type.replace(/_/g, ' ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Kb4StatusBadge status={e.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {e.due_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {formatDate(e.due_date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatChip({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${bg}`}>
      {icon}
      <span className="text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

export default function EmployeeTrainingsDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    }>
      <EmployeeTrainingsDetailInner />
    </Suspense>
  )
}

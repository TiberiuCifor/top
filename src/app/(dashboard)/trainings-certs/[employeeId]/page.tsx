'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { ArrowLeft, GraduationCap, Award, Target, Calendar, CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react'
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
    clamped === 100
      ? 'bg-emerald-500'
      : clamped >= 70
      ? 'bg-blue-500'
      : clamped >= 40
      ? 'bg-amber-500'
      : 'bg-rose-400'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-9 text-right flex-shrink-0">{clamped}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
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

  const trainings = data?.trainings ?? []
  const certifications = data?.certifications ?? []
  const goals = data?.goals ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex items-center gap-4">
        <EmployeeAvatar name={name} photoUrl={photoUrl} size="lg" />
        <div>
          <h2 className="text-xl font-bold text-foreground">{name}</h2>
          <p className="text-sm text-muted-foreground">Trainings, Certifications & Goals</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {!loading && data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trainings</p>
              <p className="text-xl font-bold text-foreground">{trainings.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Certifications</p>
              <p className="text-xl font-bold text-foreground">{certifications.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Goals</p>
              <p className="text-xl font-bold text-foreground">{goals.length}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading from BambooHR…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trainings section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground">Trainings</h3>
              <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {trainings.length}
              </span>
            </div>
            {trainings.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No training records found.</div>
            ) : (
              <div className="divide-y divide-border">
                {trainings.map((t, i) => (
                  <div key={i} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="font-medium text-foreground">{t.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(t.completionDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certifications section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-foreground">Certifications</h3>
              <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {certifications.length}
              </span>
            </div>
            {certifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No certification records found.</div>
            ) : (
              <div className="divide-y divide-border">
                {certifications.map((c, i) => (
                  <div key={c.id ?? i} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                        <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{c.title || 'Unnamed Certification'}</p>
                        {c.certificationNumber && (
                          <p className="text-xs text-muted-foreground mt-0.5">№ {c.certificationNumber}</p>
                        )}
                        {c.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {c.completionDate && formatDate(c.completionDate) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(c.completionDate)}
                        </div>
                      )}
                      {c.expirationDate && formatDate(c.expirationDate) && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          Exp. {formatDate(c.expirationDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goals section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground">Goals</h3>
              <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {goals.length}
              </span>
            </div>
            {goals.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No goals found.</div>
            ) : (
              <div className="divide-y divide-border">
                {goals.map((g, i) => {
                  const pct = typeof g.percentComplete === 'string'
                    ? parseFloat(g.percentComplete) || 0
                    : (g.percentComplete ?? 0)
                  return (
                    <div key={g.id ?? i} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                            <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{g.title || 'Untitled Goal'}</p>
                            {g.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{g.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <StatusBadge status={g.status} />
                          {g.dueDate && formatDate(g.dueDate) && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(g.dueDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-10">
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

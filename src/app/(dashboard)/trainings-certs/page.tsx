'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, GraduationCap, Award, Target, ChevronRight, Search, ChevronDown, ShieldCheck } from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface OutsideEmployee {
  bamboo_id: string
  full_name: string
  department: string | null
  job_title: string | null
  trainings: number
  certifications: number
  goals: number
  company_trainings: number
}

interface EmployeeRow {
  id: string
  full_name: string
  bamboo_id: string
  photo_url: string | null
  contract_type: string | null
  practice_id: string | null
  practice_name: string | null
  trainings: number | null
  certifications: number | null
  goals: number | null
  company_trainings: number | null
  last_synced_at: string | null
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never synced'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TrainingsCertsPage() {
  const router = useRouter()

  // ── Delivery state ──────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  // ── Outside state ───────────────────────────────────────────────────────────
  const [outsideEmployees, setOutsideEmployees] = useState<OutsideEmployee[]>([])
  const [outsideLoading, setOutsideLoading] = useState(false)
  const [outsideError, setOutsideError] = useState<string | null>(null)
  const outsideFetchedRef = useRef(false)

  // ── Tab & filter state ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<'delivery' | 'outside'>('delivery')
  const [search, setSearch] = useState('')
  const [practiceFilter, setPracticeFilter] = useState<string>('all')
  const [fteOnly, setFteOnly] = useState(false)
  const [practiceDropdownOpen, setPracticeDropdownOpen] = useState(false)

  // ── Data loaders ────────────────────────────────────────────────────────────
  async function loadStats(): Promise<boolean> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/trainings-certs/stats')
      if (!res.ok) throw new Error('Failed to load stats')
      const json = await res.json()
      const emps: EmployeeRow[] = json.employees ?? []
      setEmployees(emps)
      setLastSyncedAt(json.last_synced_at ?? null)
      return emps.some(e => e.trainings !== null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function runSync() {
    setSyncing(true)
    setSyncProgress('Fetching from BambooHR & KnowBe4…')
    setError(null)
    try {
      const res = await fetch('/api/trainings-certs/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Sync failed')
      setSyncProgress(`Synced ${json.synced} employees`)
      await loadStats()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
      setSyncProgress('')
    }
  }

  async function loadOutsideDelivery(force = false) {
    if (!force && outsideFetchedRef.current) return
    outsideFetchedRef.current = true
    setOutsideLoading(true)
    setOutsideError(null)
    try {
      const res = await fetch('/api/trainings-certs/outside-delivery')
      if (!res.ok) throw new Error('Failed to load outside delivery data')
      const json = await res.json()
      setOutsideEmployees(json.employees ?? [])
    } catch (e: unknown) {
      setOutsideError(e instanceof Error ? e.message : 'Unknown error')
      outsideFetchedRef.current = false // allow retry
    } finally {
      setOutsideLoading(false)
    }
  }

  useEffect(() => {
    loadStats().then(hasExistingData => {
      if (!hasExistingData) runSync()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trigger outside data fetch when tab is switched to 'outside'
  function handleTabChange(next: 'delivery' | 'outside') {
    setSearch('')
    setTab(next)
    if (next === 'outside') loadOutsideDelivery()
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const practices = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees) {
      if (e.practice_id && e.practice_name) map.set(e.practice_id, e.practice_name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  const filteredDelivery = useMemo(() => employees.filter(e => {
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (practiceFilter !== 'all' && e.practice_id !== practiceFilter) return false
    if (fteOnly && e.contract_type !== 'FTE') return false
    return true
  }), [employees, search, practiceFilter, fteOnly])

  const filteredOutside = useMemo(() => outsideEmployees.filter(e =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase())
  ), [outsideEmployees, search])

  // Summary totals — reactive to active tab
  const totals = useMemo(() => {
    if (tab === 'delivery') {
      return {
        trainings: filteredDelivery.reduce((s, e) => s + (e.trainings ?? 0), 0),
        certs: filteredDelivery.reduce((s, e) => s + (e.certifications ?? 0), 0),
        goals: filteredDelivery.reduce((s, e) => s + (e.goals ?? 0), 0),
        kb4: filteredDelivery.reduce((s, e) => s + (e.company_trainings ?? 0), 0),
      }
    }
    return {
      trainings: filteredOutside.reduce((s, e) => s + e.trainings, 0),
      certs: filteredOutside.reduce((s, e) => s + e.certifications, 0),
      goals: filteredOutside.reduce((s, e) => s + e.goals, 0),
      kb4: filteredOutside.reduce((s, e) => s + e.company_trainings, 0),
    }
  }, [tab, filteredDelivery, filteredOutside])

  const selectedPracticeName = practiceFilter === 'all'
    ? 'All Practices'
    : (practices.find(p => p.id === practiceFilter)?.name ?? 'All Practices')

  const hasDeliveryData = employees.some(e => e.trainings !== null)

  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground pt-1">
          {tab === 'delivery'
            ? `${filteredDelivery.length} employee${filteredDelivery.length !== 1 ? 's' : ''}${employees.length !== filteredDelivery.length ? ` (of ${employees.length})` : ''}`
            : outsideLoading
              ? 'Loading…'
              : `${filteredOutside.length} employee${filteredOutside.length !== 1 ? 's' : ''}${outsideEmployees.length !== filteredOutside.length ? ` (of ${outsideEmployees.length})` : ''}`
          }
        </p>
        <div className="flex flex-col items-end gap-1">
          {tab === 'delivery' ? (
            <>
              <button
                onClick={runSync}
                disabled={syncing || loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Refresh'}
              </button>
              <p className="text-[11px] text-muted-foreground/60 text-right">
                {syncing && syncProgress ? syncProgress : `Last sync: ${formatSyncTime(lastSyncedAt)}`}
              </p>
            </>
          ) : (
            <button
              onClick={() => loadOutsideDelivery(true)}
              disabled={outsideLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${outsideLoading ? 'animate-spin' : ''}`} />
              {outsideLoading ? 'Loading…' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trainings</p>
            <p className="text-xl font-bold text-foreground">{outsideLoading && tab === 'outside' ? '…' : totals.trainings}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Certifications</p>
            <p className="text-xl font-bold text-foreground">{outsideLoading && tab === 'outside' ? '…' : totals.certs}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Goals</p>
            <p className="text-xl font-bold text-foreground">{outsideLoading && tab === 'outside' ? '…' : totals.goals}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Company Trainings</p>
            <p className="text-xl font-bold text-foreground">{outsideLoading && tab === 'outside' ? '…' : totals.kb4}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit border border-border">
        <button
          onClick={() => handleTabChange('delivery')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'delivery'
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Delivery Department
        </button>
        <button
          onClick={() => handleTabChange('outside')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'outside'
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Outside Delivery
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employees…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea2775]/40 w-52"
          />
        </div>

        {tab === 'delivery' && (
          <>
            <div className="relative">
              <button
                onClick={() => setPracticeDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-accent transition-colors min-w-[160px] justify-between"
              >
                <span className="truncate">{selectedPracticeName}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${practiceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {practiceDropdownOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setPracticeFilter('all'); setPracticeDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent ${practiceFilter === 'all' ? 'font-medium text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                  >
                    All Practices
                  </button>
                  {practices.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPracticeFilter(p.id); setPracticeDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent ${practiceFilter === p.id ? 'font-medium text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setFteOnly(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                fteOnly
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fteOnly ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
              FTE only
            </button>
          </>
        )}
      </div>

      {/* Error banners */}
      {tab === 'delivery' && error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {tab === 'outside' && outsideError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {outsideError}
        </div>
      )}

      {/* ── DELIVERY TAB ──────────────────────────────────────────────────────── */}
      {tab === 'delivery' && (
        loading || (syncing && !hasDeliveryData) ? (
          <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              {syncing ? 'Syncing data from BambooHR & KnowBe4…' : 'Loading…'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Practice</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Trainings</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><Award className="w-3.5 h-3.5" />Certs</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><Target className="w-3.5 h-3.5" />Goals</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-rose-400" />Company</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDelivery.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size="sm" />
                          <div>
                            <span className="font-medium text-foreground">{emp.full_name}</span>
                            {emp.contract_type && (
                              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                emp.contract_type === 'FTE'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-[#ea2775]/10 text-[#ea2775]'
                              }`}>
                                {emp.contract_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{emp.practice_name ?? '—'}</td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.trainings} color="blue" /></td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.certifications} color="amber" /></td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.goals} color="emerald" /></td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.company_trainings} color="rose" /></td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => router.push(`/trainings-certs/${emp.id}?bambooId=${emp.bamboo_id}&name=${encodeURIComponent(emp.full_name)}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#ea2775] bg-[#ea2775]/10 hover:bg-[#ea2775]/20 transition-colors"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDelivery.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No employees match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── OUTSIDE DELIVERY TAB ─────────────────────────────────────────────── */}
      {tab === 'outside' && (
        outsideLoading ? (
          <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Fetching data from BambooHR & KnowBe4…</p>
            <p className="text-xs text-muted-foreground/60">This may take a moment</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Trainings</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><Award className="w-3.5 h-3.5" />Certs</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><Target className="w-3.5 h-3.5" />Goals</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-rose-400" />Company</div>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutside.map((emp, idx) => (
                    <tr
                      key={emp.bamboo_id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={emp.full_name} photoUrl={null} size="sm" />
                          <div>
                            <span className="font-medium text-foreground">{emp.full_name}</span>
                            {emp.job_title && (
                              <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{emp.department ?? '—'}</td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.trainings} color="blue" /></td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.certifications} color="amber" /></td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.goals} color="emerald" /></td>
                      <td className="px-4 py-3 text-center"><CountBadge value={emp.company_trainings} color="rose" /></td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => router.push(`/trainings-certs/${emp.bamboo_id}?bambooId=${emp.bamboo_id}&name=${encodeURIComponent(emp.full_name)}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#ea2775] bg-[#ea2775]/10 hover:bg-[#ea2775]/20 transition-colors"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOutside.length === 0 && !outsideLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        {outsideEmployees.length === 0 ? 'No outside-delivery employees found.' : 'No employees match the search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function CountBadge({ value, color }: { value: number | null; color: 'blue' | 'amber' | 'emerald' | 'rose' }) {
  if (value === null) return <span className="text-muted-foreground/30 text-xs">—</span>
  if (value === 0) return <span className="text-muted-foreground/40">—</span>
  const cls = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  }[color]
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] h-6 rounded-full text-xs font-semibold px-2 ${cls}`}>
      {value}
    </span>
  )
}

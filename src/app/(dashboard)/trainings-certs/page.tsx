'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, GraduationCap, Award, Target, ChevronRight, Search, ChevronDown } from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface EmployeeRow {
  id: string
  full_name: string
  bamboo_id: string
  photo_url: string | null
  contract_type: string | null
  practice_id: string | null
  practice_name: string | null
  trainings: number
  certifications: number
  goals: number
}

const CACHE_KEY = 'trainings_certs_cache_v2'
const CACHE_TTL_MS = 5 * 60 * 1000

function loadCache(): { data: EmployeeRow[]; ts: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function saveCache(data: EmployeeRow[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export default function TrainingsCertsPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [practiceFilter, setPracticeFilter] = useState<string>('all')
  const [fteOnly, setFteOnly] = useState(false)
  const [practiceDropdownOpen, setPracticeDropdownOpen] = useState(false)

  async function load(force = false) {
    if (!force) {
      const cached = loadCache()
      if (cached) {
        setEmployees(cached.data)
        setLastUpdated(new Date(cached.ts))
        setLoading(false)
        return
      }
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bamboohr/trainings-summary')
      if (!res.ok) throw new Error('Failed to load training data')
      const data = await res.json()
      const list: EmployeeRow[] = data.employees ?? []
      setEmployees(list)
      saveCache(list)
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Derive sorted, unique practices from the loaded data
  const practices = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees) {
      if (e.practice_id && e.practice_name) {
        map.set(e.practice_id, e.practice_name)
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  const filtered = useMemo(() => employees.filter(e => {
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (practiceFilter !== 'all' && e.practice_id !== practiceFilter) return false
    if (fteOnly && e.contract_type !== 'FTE') return false
    return true
  }), [employees, search, practiceFilter, fteOnly])

  const totalTrainings = filtered.reduce((s, e) => s + e.trainings, 0)
  const totalCerts = filtered.reduce((s, e) => s + e.certifications, 0)
  const totalGoals = filtered.reduce((s, e) => s + e.goals, 0)

  const selectedPracticeName = practiceFilter === 'all'
    ? 'All Practices'
    : (practices.find(p => p.id === practiceFilter)?.name ?? 'All Practices')

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          {employees.length !== filtered.length && ` (of ${employees.length})`}
          {lastUpdated && (
            <span className="ml-2 text-xs">· Last updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </p>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Trainings</p>
            <p className="text-2xl font-bold text-foreground">{totalTrainings}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Certifications</p>
            <p className="text-2xl font-bold text-foreground">{totalCerts}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Goals</p>
            <p className="text-2xl font-bold text-foreground">{totalGoals}</p>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Practice combobox */}
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

        {/* FTE toggle */}
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
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && employees.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading training data from BambooHR…</p>
          <p className="text-xs text-muted-foreground">This may take a moment for all employees</p>
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
                    <div className="flex items-center justify-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Trainings
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Certifications
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Goals
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => (
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
                            <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {emp.practice_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.trainings > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-full text-xs font-semibold px-2.5 bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {emp.trainings}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.certifications > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-full text-xs font-semibold px-2.5 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          {emp.certifications}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.goals > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-full text-xs font-semibold px-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {emp.goals}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
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
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No employees match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

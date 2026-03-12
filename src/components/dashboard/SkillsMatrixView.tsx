'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'
import { Search, RefreshCw, AlertCircle, Filter, Brain, Users, TableProperties, Layers, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SkillsModal } from '@/components/modals/SkillsModal'
import type { Employee } from '@/lib/types'

interface SkillEntry {
  skill: string
  level: number
}

interface EmployeeSkillRow {
  id: string
  full_name: string
  bamboo_id: string | null
  practice_id: string | null
  practice: { id: string; name: string } | null
  photo_url: string | null
  seniority: string
  contract_type: string | null
  skills: SkillEntry[]
  is_bench: boolean
}

const LEVEL_MAP: Record<number, 'Elementary' | 'Intermediate' | 'Advanced' | 'Expert'> = {
  1: 'Elementary',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
}

const LEVEL_COLUMNS = ['Elementary', 'Intermediate', 'Advanced', 'Expert'] as const
type LevelColumn = (typeof LEVEL_COLUMNS)[number]

const LEVEL_STYLES: Record<LevelColumn, { chip: string; header: string; dot: string; headerBg: string }> = {
  Elementary:   { chip: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', header: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', headerBg: 'bg-blue-50/50 dark:bg-blue-950/20' },
  Intermediate: { chip: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', header: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', headerBg: 'bg-amber-50/50 dark:bg-amber-950/20' },
  Advanced:     { chip: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800', header: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500', headerBg: 'bg-violet-50/50 dark:bg-violet-950/20' },
  Expert:       { chip: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', header: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', headerBg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
}

const PRACTICE_COLORS = [
  { block: 'border-l-2 border-violet-400 bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-400' },
  { block: 'border-l-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400' },
  { block: 'border-l-2 border-[#ea2775] bg-[#ea2775]/8', text: 'text-[#ea2775]', dot: 'bg-[#ea2775]' },
  { block: 'border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
  { block: 'border-l-2 border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-400' },
]

const CACHE_KEY = 'skills_matrix_cache_v7'
const CACHE_TTL_MS = 5 * 60 * 1000

function loadCache(): { data: EmployeeSkillRow[]; ts: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveCache(data: EmployeeSkillRow[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

const CHIPS_VISIBLE = 6

function SkillChips({ chips, col }: { chips: SkillEntry[]; col: LevelColumn }) {
  const [expanded, setExpanded] = useState(false)
  if (chips.length === 0) return <span className="text-xs text-muted-foreground/30">—</span>
  const shown = expanded ? chips : chips.slice(0, CHIPS_VISIBLE)
  const overflow = chips.length - CHIPS_VISIBLE
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s, idx) => (
        <span
          key={`${s.skill}-${idx}`}
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${LEVEL_STYLES[col].chip}`}
        >
          {s.skill}
        </span>
      ))}
      {!expanded && overflow > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted hover:text-foreground transition-colors"
        >
          +{overflow} more
        </button>
      )}
      {expanded && overflow > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted hover:text-foreground transition-colors"
        >
          show less
        </button>
      )}
    </div>
  )
}

export function SkillsMatrixView() {
  const [rows, setRows] = useState<EmployeeSkillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [practiceFilter, setPracticeFilter] = useState('all')
  const [nameSearch, setNameSearch] = useState('')
  const [skillSearch, setSkillSearch] = useState('')
  const [benchOnly, setBenchOnly] = useState(false)
  const [fteOnly, setFteOnly] = useState(false)
  const [seniorityFilter, setSeniorityFilter] = useState<string[]>([])
  const [skillsModalEmployee, setSkillsModalEmployee] = useState<Employee | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const fetchedRef = useRef(false)

  const fetchData = async (force = false) => {
    setLoading(true)
    setError(null)
    if (!force) {
      const cached = loadCache()
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setRows(cached.data)
        setLastSync(new Date(cached.ts))
        setLoading(false)
        return
      }
    }
    try {
      const res = await fetch('/api/bamboohr/skills-matrix')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setRows(json.employees)
      saveCache(json.employees)
      setLastSync(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchData()
  }, [])

  const practices = useMemo(() => {
    const seen = new Map<string, string>()
    rows.forEach(r => { if (r.practice) seen.set(r.practice.id, r.practice.name) })
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const seniorityOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach(r => { if (r.seniority) seen.add(r.seniority) })
    return Array.from(seen).sort()
  }, [rows])

  const practiceColorMap = useMemo(() => {
    const map = new Map<string, typeof PRACTICE_COLORS[number]>()
    practices.forEach(([id], i) => { map.set(id, PRACTICE_COLORS[i % PRACTICE_COLORS.length]) })
    return map
  }, [practices])

  const filtered = useMemo(() => {
    const needle = skillSearch.trim().toLowerCase()
    const nameLower = nameSearch.trim().toLowerCase()
    return rows.filter(row => {
      if (practiceFilter !== 'all' && row.practice_id !== practiceFilter) return false
      if (benchOnly && !row.is_bench) return false
      if (fteOnly && row.contract_type !== 'FTE') return false
      if (seniorityFilter.length > 0 && !seniorityFilter.includes(row.seniority)) return false
      if (nameLower && !row.full_name.toLowerCase().includes(nameLower)) return false
      if (needle && !row.skills.some(s => s.skill.toLowerCase().includes(needle))) return false
      return true
    })
  }, [rows, practiceFilter, nameSearch, skillSearch, benchOnly, fteOnly, seniorityFilter])

  const skillsForRow = (row: EmployeeSkillRow, col: LevelColumn) => {
    const needle = skillSearch.trim().toLowerCase()
    const seen = new Set<string>()
    return row.skills
      .filter(s => LEVEL_MAP[s.level] === col)
      .filter(s => !needle || s.skill.toLowerCase().includes(needle))
      .filter(s => { const k = s.skill.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
      .sort((a, b) => a.skill.localeCompare(b.skill))
  }

  const stats = useMemo(() => ({
    total: rows.length,
    bench: rows.filter(r => r.is_bench).length,
    fte: rows.filter(r => r.contract_type === 'FTE').length,
    ctr: rows.filter(r => r.contract_type === 'CTR').length,
  }), [rows])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-[#ea2775] border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading Skills Matrix</p>
          <p className="text-xs text-muted-foreground mt-1">Fetching data from BambooHR…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-rose-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Failed to load</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-[#ea2775]/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-[#ea2775]" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums leading-none">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Employees</p>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">FTE</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums leading-none">{stats.fte}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Full-Time</p>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-[#ea2775]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[#ea2775]">CTR</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums leading-none">{stats.ctr}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contractor</p>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
            <TableProperties className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums leading-none">{stats.bench}</p>
            <p className="text-xs text-muted-foreground mt-0.5">On Bench</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border/60 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-3 p-3">
              {/* Name search */}
              <div className="relative min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Employee name…"
                  value={nameSearch}
                  onChange={e => setNameSearch(e.target.value)}
                  className="pl-8 h-8 text-sm bg-muted/40 border-border/50 focus-visible:ring-1 focus-visible:ring-[#ea2775]/30 focus-visible:border-[#ea2775]/50"
                />
              </div>

              {/* Skill search */}
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search skills…"
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  className="pl-8 h-8 text-sm bg-muted/40 border-border/50 focus-visible:ring-1 focus-visible:ring-[#ea2775]/30 focus-visible:border-[#ea2775]/50"
                />
              </div>

            {/* Practice filter */}
            <Select value={practiceFilter} onValueChange={setPracticeFilter}>
              <SelectTrigger className="h-8 w-48 text-sm bg-muted/40 border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Practices" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Practices</SelectItem>
                {practices.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Seniority filter */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-all border ${
                  seniorityFilter.length > 0
                    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800'
                    : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                }`}>
                  <Filter className="w-3.5 h-3.5" />
                  Seniority
                  {seniorityFilter.length > 0 && (
                    <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums bg-violet-500 text-white">
                      {seniorityFilter.length}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seniority Levels</span>
                  {seniorityFilter.length > 0 && (
                    <button onClick={() => setSeniorityFilter([])} className="text-[11px] text-[#ea2775] hover:underline">Clear</button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {seniorityOptions.map(s => {
                    const active = seniorityFilter.includes(s)
                    return (
                      <button
                        key={s}
                        onClick={() => setSeniorityFilter(prev =>
                          active ? prev.filter(x => x !== s) : [...prev, s]
                        )}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          active
                            ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          active ? 'bg-violet-500 border-violet-500' : 'border-border'
                        }`}>
                          {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{s}</span>
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* FTE Only toggle */}
            <button
              onClick={() => setFteOnly(b => !b)}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-all border ${
                fteOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fteOnly ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              FTE Only
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums ${
                fteOnly ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {stats.fte}
              </span>
            </button>

            {/* Bench toggle */}
            <button
              onClick={() => setBenchOnly(b => !b)}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-all border ${
                benchOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${benchOnly ? 'bg-rose-500' : 'bg-muted-foreground/40'}`} />
              Bench Only
              {stats.bench > 0 && (
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums ${
                  benchOnly ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {stats.bench}
                </span>
              )}
            </button>

              <div className="ml-auto flex items-center gap-3">
                {/* Results count */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{filtered.length}</span> of {rows.length}
                </span>

                {/* Refresh + last sync */}
                <div className="flex flex-col items-end gap-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </Button>
                  {lastSync && (
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums whitespace-nowrap">
                      Last sync {lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
          </div>

        {/* Legend strip */}
        <div className="flex items-center gap-2 px-3 pb-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Skill levels:</span>
          {LEVEL_COLUMNS.map((col, i) => (
            <span key={col} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${LEVEL_STYLES[col].chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_STYLES[col].dot}`} />
              {col}
              <span className="opacity-60 font-normal">{['1–2', '3', '4', '5'][i]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[1080px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left pl-5 pr-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-52 bg-muted/30">
                Employee
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20 bg-muted/30">
                Type
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-40 bg-muted/30">
                Seniority
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-36 bg-muted/30">
                Practice
              </th>
              {LEVEL_COLUMNS.map(col => (
                <th key={col} className={`text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider ${LEVEL_STYLES[col].header} ${LEVEL_STYLES[col].headerBg}`}>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_STYLES[col].dot}`} />
                    {col}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Brain className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">No employees match your filters</p>
                    <button
                        onClick={() => { setNameSearch(''); setSkillSearch(''); setPracticeFilter('all'); setBenchOnly(false); setFteOnly(false); setSeniorityFilter([]) }}
                      className="text-xs text-[#ea2775] hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => {
                const practiceColor = row.practice_id ? practiceColorMap.get(row.practice_id) : undefined
                return (
                  <tr
                    key={row.id}
                    className={`group transition-colors hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                  >
                      {/* Employee */}
                      <td className="pl-5 pr-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar name={row.full_name} photoUrl={row.photo_url} size="sm" />
                          <div className="min-w-0">
                            <button
                              onClick={() => setSkillsModalEmployee({
                                id: row.id,
                                full_name: row.full_name,
                                bamboo_id: row.bamboo_id,
                                photo_url: row.photo_url,
                                practice_id: row.practice_id,
                                contract_type: (row.contract_type as 'FTE' | 'CTR') ?? 'FTE',
                                role_id: null,
                                squad_id: null,
                                practice_role: 'Member',
                                status: 'Active',
                                created_at: '',
                              })}
                              className="font-medium text-sm text-foreground truncate leading-snug hover:text-[#ea2775] hover:underline transition-colors text-left"
                            >
                              {row.full_name}
                            </button>
                            {row.is_bench && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                <span className="w-1 h-1 rounded-full bg-rose-500" />
                                Bench
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                    {/* Contract Type */}
                    <td className="px-3 py-3">
                      {row.contract_type ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                          row.contract_type === 'FTE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-[#ea2775]/10 text-[#ea2775]'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${row.contract_type === 'FTE' ? 'bg-emerald-500' : 'bg-[#ea2775]'}`} />
                          {row.contract_type}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Seniority */}
                    <td className="px-3 py-3">
                      {row.seniority ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                          {row.seniority}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                      {/* Practice */}
                      <td className="px-3 py-3">
                        {row.practice && practiceColor ? (
                          <div className={`inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-md text-[11px] font-semibold ${practiceColor.block} ${practiceColor.text}`}>
                            <Layers className="w-3 h-3 flex-shrink-0 opacity-70" />
                            {row.practice.name}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Skill columns */}
                      {LEVEL_COLUMNS.map(col => {
                        const chips = skillsForRow(row, col)
                        return (
                          <td key={col} className="px-3 py-3 align-top">
                            <SkillChips chips={chips} col={col} />
                          </td>
                        )
                      })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> of{' '}
            <span className="tabular-nums">{rows.length}</span> employees
          </p>
          <div className="flex items-center gap-3">
            {LEVEL_COLUMNS.map(col => (
              <span key={col} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${LEVEL_STYLES[col].dot}`} />
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      <SkillsModal
        open={!!skillsModalEmployee}
        onClose={() => setSkillsModalEmployee(null)}
        employee={skillsModalEmployee}
      />

    </div>
  )
}

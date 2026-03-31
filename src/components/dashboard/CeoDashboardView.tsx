'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { toast } from 'sonner'
import type { CeoDashboardEntry, CeoDashboardEntryInput, Project, Employee, Assignment } from '@/lib/types'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Minus, Plus, Save, X, Trash2,
  AlertTriangle, CheckCircle2, Users, Briefcase, Target,
  BarChart3, Activity, Calendar, ArrowUpRight, ArrowDownRight,
  Banknote, Receipt, Phone, ShieldAlert, Info, Pencil, Loader2, Eye
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface CeoDashboardViewProps {
  entries: CeoDashboardEntry[]
  projects: Project[]
  employees: Employee[]
  assignments: Assignment[]
  loading: boolean
  onCreateEntry: (input: CeoDashboardEntryInput) => Promise<{ data: CeoDashboardEntry | null; error: unknown }>
  onUpdateEntry: (id: string, input: Partial<CeoDashboardEntryInput>) => Promise<{ data: CeoDashboardEntry | null; error: unknown }>
  onDeleteEntry: (id: string) => Promise<{ error: unknown }>
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
}

function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const v = Math.round(value)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return formatCurrency(v)
}

function formatEuroNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
}

function EuroInput({
  defaultValue,
  onSave,
  className = 'w-[100px]'
}: {
  defaultValue: number | null | undefined
  onSave: (val: number) => void
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [rawValue, setRawValue] = useState(defaultValue?.toString() ?? '')
  const [displayValue, setDisplayValue] = useState(formatEuroNumber(defaultValue))

  useEffect(() => {
    if (!focused) {
      setDisplayValue(formatEuroNumber(defaultValue))
      setRawValue(defaultValue?.toString() ?? '')
    }
  }, [defaultValue, focused])

  return (
    <Input
      type={focused ? 'number' : 'text'}
      value={focused ? rawValue : displayValue}
      onChange={(e) => setRawValue(e.target.value)}
      onFocus={() => {
        setFocused(true)
        setRawValue(defaultValue?.toString() ?? '')
      }}
      onBlur={() => {
        setFocused(false)
        const val = Number(rawValue) || 0
        const rounded = Math.round(val)
        setDisplayValue(formatEuroNumber(rounded))
        if (rounded !== Math.round(defaultValue ?? 0)) {
          onSave(rounded)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLElement).blur()
        }
      }}
      className={className}
    />
  )
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(1)}%`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconBg,
  iconColor,
  inverse = false,
  status,
  statusTooltip,
}: {
  title: string
  value: string
  change?: number | null
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  inverse?: boolean
  status?: { label: string; ok: boolean } | null
  statusTooltip?: React.ReactNode
}) {
  const isGood = change !== null && change !== undefined
    ? (inverse ? change < 0 : change > 0)
    : null
  const isUp = change !== null && change !== undefined ? change > 0 : null
  const isNeutral = change === 0

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
            {change !== null && change !== undefined && (
              <div className="flex items-center gap-1.5 mt-2">
                {isNeutral ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Minus className="w-3 h-3" /> No change
                  </span>
                ) : (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {changeLabel || (typeof change === 'number' ? formatCurrency(Math.abs(change)) : '')}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">vs prev week</span>
              </div>
            )}
              {status && (
                <div className="relative group/status inline-flex">
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold cursor-help ${
                    status.ok
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {status.ok
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <AlertTriangle className="w-3 h-3" />}
                    {status.label}
                    {statusTooltip && <Info className="w-3 h-3 opacity-50" />}
                  </div>
                  {statusTooltip && (
                    <div className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/status:block">
                      <div className="bg-foreground text-white rounded-lg shadow-xl p-3 w-[240px] text-xs">
                        {statusTooltip}
                        <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-foreground rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const RAG_COLORS = ['#ef4444', '#f59e0b', '#22c55e']

export function CeoDashboardView({
  entries,
  projects,
  employees,
  assignments,
  loading,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry
}: CeoDashboardViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'tracker'>('dashboard')
  const [selectedWeekId, setSelectedWeekId] = useState<string>('')
    const [trackerPage, setTrackerPage] = useState(0)
    const TRACKER_PAGE_SIZE = 10
    const [trackerModalOpen, setTrackerModalOpen] = useState(false)
    const [trackerModalEntry, setTrackerModalEntry] = useState<CeoDashboardEntry | null>(null)
    const [viewModalOpen, setViewModalOpen] = useState(false)
    const [viewModalEntry, setViewModalEntry] = useState<CeoDashboardEntry | null>(null)
    const [trackerModalSaving, setTrackerModalSaving] = useState(false)
    const [trackerForm, setTrackerForm] = useState<Partial<CeoDashboardEntryInput>>({})
    const [pipelineLoading, setPipelineLoading] = useState(false)

  useEffect(() => {
    if (entries.length > 0 && !selectedWeekId) {
      setSelectedWeekId(entries[0].id)
    }
  }, [entries, selectedWeekId])

  const selectedEntry = useMemo(() => {
    return entries.find(e => e.id === selectedWeekId) || entries[0]
  }, [entries, selectedWeekId])

  const previousEntry = useMemo(() => {
    if (!selectedEntry) return null
    const currentIndex = entries.findIndex(e => e.id === selectedEntry.id)
    return currentIndex < entries.length - 1 ? entries[currentIndex + 1] : null
  }, [entries, selectedEntry])

  const fourWeekAvgCash = useMemo(() => {
    if (!selectedEntry) return null
    const currentIndex = entries.findIndex(e => e.id === selectedEntry.id)
    const relevantEntries = entries.slice(currentIndex, currentIndex + 4)
    if (relevantEntries.length === 0) return null
    const sum = relevantEntries.reduce((acc, e) => acc + (e.cash_eur || 0), 0)
    return sum / relevantEntries.length
  }, [entries, selectedEntry])

  const fourWeekAvgUtilization = useMemo(() => {
    if (!selectedEntry) return null
    const currentIndex = entries.findIndex(e => e.id === selectedEntry.id)
    const relevantEntries = entries.slice(currentIndex, currentIndex + 4)
    if (relevantEntries.length === 0) return null
    const validEntries = relevantEntries.filter(e => e.utilization_percent !== null)
    if (validEntries.length === 0) return null
    const sum = validEntries.reduce((acc, e) => acc + (e.utilization_percent || 0), 0)
    return sum / validEntries.length
  }, [entries, selectedEntry])

  const trendData = useMemo(() => {
    if (!selectedEntry) return []
    const currentIndex = entries.findIndex(e => e.id === selectedEntry.id)
    const slice = entries.slice(currentIndex, Math.min(currentIndex + 8, entries.length))
    return [...slice].reverse().map(e => ({
      week: formatShortDate(e.week_ended),
      cash: e.cash_eur,
      ar: e.total_ar_eur,
      ar60d: e.ar_over_60d_eur,
      pipeline: e.pipeline_total_eur ?? 0,
      weighted: e.pipeline_weighted_eur ?? 0,
      utilization: e.utilization_percent ?? 0,
      bench: e.bench_count ?? 0,
      discovery: e.discovery_calls ?? 0,
    }))
  }, [entries, selectedEntry])

  const ragPieData = useMemo(() => {
    if (!selectedEntry) return []
    return [
      { name: 'Red', value: selectedEntry.red_projects ?? 0 },
      { name: 'Amber', value: selectedEntry.amber_projects ?? 0 },
      { name: 'Green', value: selectedEntry.green_projects ?? 0 },
    ].filter(d => d.value > 0)
  }, [selectedEntry])

  const ragTotal = useMemo(() => {
    if (!selectedEntry) return 0
    return (selectedEntry.red_projects ?? 0) + (selectedEntry.amber_projects ?? 0) + (selectedEntry.green_projects ?? 0)
  }, [selectedEntry])

  const projectHealthStatus = useMemo<{ label: string; ok: boolean } | null>(() => {
    if (!selectedEntry) return null
    const red = selectedEntry.red_projects ?? 0
    const total = red + (selectedEntry.amber_projects ?? 0) + (selectedEntry.green_projects ?? 0)
    const redPercent = total > 0 ? (red / total) * 100 : 0
    if (redPercent > 15) return { label: 'Needs Attention', ok: false }
    const currentIndex = entries.findIndex(e => e.id === selectedEntry.id)
    if (currentIndex >= 0 && currentIndex + 2 < entries.length) {
      const prev1 = entries[currentIndex + 1]?.red_projects ?? 0
      const prev2 = entries[currentIndex + 2]?.red_projects ?? 0
      if (red > prev1 && prev1 > prev2) return { label: 'Needs Attention', ok: false }
    }
    return { label: 'On Track', ok: true }
  }, [selectedEntry, entries])

  const currentRagCounts = useMemo(() => {
    const activeProjects = projects.filter(p =>
      p.name.toLowerCase() !== 'bench' &&
      p.status === 'active' &&
      p.project_lead_id
    )
    const counts = { R: 0, A: 0, G: 0 }
    activeProjects.forEach(p => {
      const rag = p.latest_rag_status?.rag_score
      if (rag === 'R') counts.R++
      else if (rag === 'A') counts.A++
      else if (rag === 'G') counts.G++
    })
    return counts
  }, [projects])

  const currentBenchCount = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'Active' && e.contract_type === 'FTE')
    let benchCount = 0
    activeEmployees.forEach(emp => {
      const hasActiveBench = assignments.some(a =>
        a.employee_id === emp.id &&
        a.status === 'active' &&
        a.project?.name?.toLowerCase() === 'bench'
      )
      if (hasActiveBench) benchCount++
    })
    return benchCount
  }, [employees, assignments])

  const currentUtilization = useMemo(() => {
    const fteEmployees = employees.filter(e => e.status === 'Active' && e.contract_type === 'FTE')
    const totalFTE = fteEmployees.length
    if (totalFTE === 0) return null
    const onBench = currentBenchCount
    return ((totalFTE - onBench) / totalFTE) * 100
  }, [employees, currentBenchCount])

  const trackerTotalPages = Math.max(1, Math.ceil(entries.length / TRACKER_PAGE_SIZE))
  const paginatedEntries = useMemo(() => {
    const start = trackerPage * TRACKER_PAGE_SIZE
    return entries.slice(start, start + TRACKER_PAGE_SIZE)
  }, [entries, trackerPage, TRACKER_PAGE_SIZE])

  useEffect(() => {
    if (trackerPage >= trackerTotalPages) setTrackerPage(Math.max(0, trackerTotalPages - 1))
  }, [trackerPage, trackerTotalPages])

  const getNextMonday = useCallback(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    return nextMonday.toISOString().split('T')[0]
  }, [])

    const handleOpenAddModal = useCallback(async () => {
      setTrackerModalEntry(null)
      setTrackerForm({
        week_ended: getNextMonday(),
        cash_eur: 0,
        total_ar_eur: 0,
        ar_over_60d_eur: 0,
        ar_over_60d_percent: 0,
        red_projects: currentRagCounts.R,
        amber_projects: currentRagCounts.A,
        green_projects: currentRagCounts.G,
        utilization_percent: currentUtilization ? Number(currentUtilization.toFixed(2)) : null,
        bench_count: currentBenchCount,
        discovery_calls: null,
        pipeline_total_eur: null,
        pipeline_weighted_eur: null,
        opps_added: null,
        opps_won_eur: null,
        opps_lost: null,
        expected_closes_30d_eur: null,
        critical_open_roles: null,
        top_3_risks: null,
        notes: null,
      })
      setTrackerModalOpen(true)
      setPipelineLoading(true)
      try {
        const res = await fetch('/api/dynamics/opportunities')
        if (res.ok) {
          const data = await res.json()
          const opps: any[] = data.opportunities ?? []
          const won: any[] = data.wonLast7d ?? []
          const lost: any[] = data.lostLast7d ?? []
          const now = new Date()
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          const totalValue = opps.reduce((s, o) => s + (o.estimatedValue ?? 0), 0)
          const totalWeighted = opps.reduce((s, o) => s + (o.estimatedValue ?? 0) * ((o.closeProbability ?? 0) / 100), 0)
          const addedLast7d = opps.filter(o => new Date(o.createdOn) >= sevenDaysAgo).length
          const wonEur = won.reduce((s, o) => s + (o.estimatedValue ?? 0), 0)
          const lostCount = lost.length
          const weighted30d = opps
            .filter(o => o.closeDate && new Date(o.closeDate) >= now && new Date(o.closeDate) <= in30Days)
            .reduce((s, o) => s + (o.estimatedValue ?? 0) * ((o.closeProbability ?? 0) / 100), 0)
          setTrackerForm(prev => ({
            ...prev,
            pipeline_total_eur: totalValue || null,
            pipeline_weighted_eur: Math.round(totalWeighted) || null,
            opps_added: addedLast7d || null,
            opps_won_eur: wonEur || null,
            opps_lost: lostCount || null,
            expected_closes_30d_eur: Math.round(weighted30d) || null,
          }))
        }
      } catch { /* ignore, user can fill manually */ }
      finally { setPipelineLoading(false) }
    }, [getNextMonday, currentRagCounts, currentUtilization, currentBenchCount])

    const handleOpenEditModal = useCallback((entry: CeoDashboardEntry) => {
      setTrackerModalEntry(entry)
      setTrackerForm({
        week_ended: entry.week_ended,
        cash_eur: entry.cash_eur,
        total_ar_eur: entry.total_ar_eur,
        ar_over_60d_eur: entry.ar_over_60d_eur,
        ar_over_60d_percent: entry.ar_over_60d_percent,
        red_projects: entry.red_projects,
        amber_projects: entry.amber_projects,
        green_projects: entry.green_projects,
        utilization_percent: entry.utilization_percent,
        bench_count: entry.bench_count,
        discovery_calls: entry.discovery_calls,
        pipeline_total_eur: entry.pipeline_total_eur,
        pipeline_weighted_eur: entry.pipeline_weighted_eur,
        opps_added: entry.opps_added,
        opps_won_eur: entry.opps_won_eur,
        opps_lost: entry.opps_lost,
        expected_closes_30d_eur: entry.expected_closes_30d_eur,
        critical_open_roles: entry.critical_open_roles,
        top_3_risks: entry.top_3_risks,
        notes: entry.notes,
      })
      setTrackerModalOpen(true)
    }, [])

    const handleSaveTrackerModal = useCallback(async () => {
      if (!trackerForm.week_ended || !trackerForm.cash_eur || !trackerForm.total_ar_eur || trackerForm.ar_over_60d_eur === undefined) {
        toast.error('Please fill in all required fields (Week, Cash, Total AR, AR >60d)')
        return
      }

      const arPercent = (trackerForm.total_ar_eur ?? 0) > 0
        ? ((trackerForm.ar_over_60d_eur ?? 0) / (trackerForm.total_ar_eur ?? 1)) * 100
        : 0

      setTrackerModalSaving(true)
      try {
        if (trackerModalEntry) {
          const updateData: Partial<CeoDashboardEntryInput> = {
            ...trackerForm,
            ar_over_60d_percent: Number(arPercent.toFixed(2)),
          }
          const { error } = await onUpdateEntry(trackerModalEntry.id, updateData)
          if (error) { toast.error('Failed to update entry'); return }
          toast.success('Entry updated')
        } else {
          const entryToSave: CeoDashboardEntryInput = {
            week_ended: trackerForm.week_ended!,
            cash_eur: trackerForm.cash_eur!,
            total_ar_eur: trackerForm.total_ar_eur!,
            ar_over_60d_eur: trackerForm.ar_over_60d_eur!,
            ar_over_60d_percent: Number(arPercent.toFixed(2)),
            red_projects: trackerForm.red_projects ?? currentRagCounts.R,
            amber_projects: trackerForm.amber_projects ?? currentRagCounts.A,
            green_projects: trackerForm.green_projects ?? currentRagCounts.G,
            discovery_calls: trackerForm.discovery_calls ?? null,
            pipeline_total_eur: trackerForm.pipeline_total_eur ?? null,
            pipeline_weighted_eur: trackerForm.pipeline_weighted_eur ?? null,
            opps_added: trackerForm.opps_added ?? null,
            opps_won_eur: trackerForm.opps_won_eur ?? null,
            opps_lost: trackerForm.opps_lost ?? null,
            expected_closes_30d_eur: trackerForm.expected_closes_30d_eur ?? null,
            utilization_percent: trackerForm.utilization_percent ?? (currentUtilization ? Number(currentUtilization.toFixed(2)) : null),
            bench_count: trackerForm.bench_count ?? currentBenchCount,
            critical_open_roles: trackerForm.critical_open_roles ?? null,
            top_3_risks: trackerForm.top_3_risks ?? null,
            notes: trackerForm.notes ?? null,
          }
          const { error } = await onCreateEntry(entryToSave)
          if (error) { toast.error('Failed to create entry'); return }
          toast.success('Entry created')
        }
        setTrackerModalOpen(false)
      } finally {
        setTrackerModalSaving(false)
      }
    }, [trackerForm, trackerModalEntry, currentRagCounts, currentUtilization, currentBenchCount, onCreateEntry, onUpdateEntry])

  const handleDeleteEntry = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    const { error } = await onDeleteEntry(id)
    if (error) {
      toast.error('Failed to delete entry')
    } else {
      toast.success('Entry deleted')
    }
  }, [onDeleteEntry])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const cashChartConfig = {
    cash: { label: 'Cash Balance', color: '#3b82f6' },
  }
  const arChartConfig = {
    ar: { label: 'Total AR', color: '#8b5cf6' },
    ar60d: { label: 'AR >60d', color: '#ef4444' },
  }
  const pipelineChartConfig = {
    pipeline: { label: 'Pipeline Total', color: '#10b981' },
    weighted: { label: 'Weighted', color: '#06b6d4' },
  }
  const utilizationChartConfig = {
    utilization: { label: 'Utilization %', color: '#f59e0b' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CEO Dashboard</h1>
          <p className="text-muted-foreground text-sm">Weekly performance metrics and KPIs</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'dashboard' | 'tracker')}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tracker" className="gap-2">
            <Calendar className="w-4 h-4" />
            Weekly Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Week Selector */}
          <div className="flex items-center gap-3">
            <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {entries.map(entry => (
                  <SelectItem key={entry.id} value={entry.id}>
                    Week {formatDate(entry.week_ended)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {previousEntry && (
              <span className="text-xs text-muted-foreground">
                Comparing to: {formatDate(previousEntry.week_ended)}
              </span>
            )}
          </div>

          {selectedEntry && (
            <>
              {/* KPI Cards Row */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                      title="Cash Balance"
                      value={formatCurrency(selectedEntry.cash_eur)}
                      change={previousEntry ? selectedEntry.cash_eur - previousEntry.cash_eur : null}
                      icon={Banknote}
                      iconBg="bg-[#ea2775]/15"
                      iconColor="text-[#ea2775]"
                      status={selectedEntry.cash_eur != null
                        ? { label: selectedEntry.cash_eur >= 200000 ? 'On Track' : 'Needs Attention', ok: selectedEntry.cash_eur >= 200000 }
                        : null}
                      statusTooltip={
                        <>
                          <p className="font-semibold mb-2 text-muted-foreground">Cash Balance Thresholds</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                              <span className="text-red-300 font-medium">Needs Attention</span>
                              <span className="ml-auto text-muted-foreground">&lt; €200K</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-emerald-300 font-medium">On Track</span>
                              <span className="ml-auto text-muted-foreground">&ge; €200K</span>
                            </div>
                          </div>
                          <div className="border-t border-border mt-2 pt-2">
                            <p className="text-muted-foreground">Current: <span className={`font-semibold ${(selectedEntry.cash_eur ?? 0) >= 200000 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(selectedEntry.cash_eur)}</span></p>
                          </div>
                        </>
                      }
                    />
                <KpiCard
                    title="Total AR"
                    value={formatCurrency(selectedEntry.total_ar_eur)}
                    change={previousEntry ? selectedEntry.total_ar_eur - previousEntry.total_ar_eur : null}
                    icon={Receipt}
                    iconBg="bg-violet-100"
                    iconColor="text-violet-600"
                    inverse
                  />
                <KpiCard
                  title="Utilization Rate"
                  value={formatPercent(selectedEntry.utilization_percent)}
                  change={previousEntry && selectedEntry.utilization_percent !== null && previousEntry.utilization_percent !== null
                    ? selectedEntry.utilization_percent - previousEntry.utilization_percent
                    : null}
                  changeLabel={previousEntry && selectedEntry.utilization_percent !== null && previousEntry.utilization_percent !== null
                    ? `${Math.abs(selectedEntry.utilization_percent - previousEntry.utilization_percent).toFixed(1)}pp`
                    : undefined}
                  icon={Users}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                />
                <KpiCard
                  title="Pipeline Weighted"
                  value={formatCurrency(selectedEntry.pipeline_weighted_eur)}
                  change={previousEntry && selectedEntry.pipeline_weighted_eur !== null && previousEntry.pipeline_weighted_eur !== null
                    ? selectedEntry.pipeline_weighted_eur - previousEntry.pipeline_weighted_eur
                    : null}
                  icon={Target}
                  iconBg="bg-emerald-100"
                  iconColor="text-emerald-600"
                />
              </div>

              {/* Charts Row 1: Cash & AR */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-[#ea2775]" />
                      Cash Trend
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">4-week avg: {formatCurrency(fourWeekAvgCash)}</p>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={cashChartConfig} className="h-[220px] w-full">
                      <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactCurrency(v)} width={50} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Area type="monotone" dataKey="cash" stroke="#3b82f6" strokeWidth={2} fill="url(#cashGrad)" />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-violet-600" />
                            Accounts Receivable
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            AR &gt;60d: {formatCurrency(selectedEntry.ar_over_60d_eur)} ({formatPercent(selectedEntry.ar_over_60d_percent)})
                          </p>
                        </div>
                        {(() => {
                            const pct = selectedEntry.ar_over_60d_percent ?? 0
                            const status = pct > 25 ? { label: 'Red', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' }
                              : pct >= 15 ? { label: 'Amber', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
                              : { label: 'Green', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200' }
                            return (
                              <div className="relative group">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-help ${status.bg} ${status.text}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                                  {status.label}
                                  <Info className="w-3 h-3 opacity-50" />
                                </div>
                                <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover:block">
                                  <div className="bg-foreground text-white rounded-lg shadow-xl p-3 w-[220px] text-xs">
                                    <p className="font-semibold mb-2 text-muted-foreground">AR &gt;60d Status Thresholds</p>
                                    <p className="text-xs text-muted-foreground mb-2">% of Total AR that is overdue &gt;60 days</p>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                        <span className="text-red-300 font-medium">Red</span>
                                        <span className="ml-auto text-muted-foreground">&gt; 25%</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                        <span className="text-amber-300 font-medium">Amber</span>
                                        <span className="ml-auto text-muted-foreground">15 - 25%</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                                        <span className="text-green-300 font-medium">Green</span>
                                        <span className="ml-auto text-muted-foreground">&lt; 15%</span>
                                      </div>
                                    </div>
                                    <div className="border-t border-border mt-2 pt-2">
                                      <p className="text-muted-foreground">Current: <span className={`font-semibold ${pct > 25 ? 'text-red-400' : pct >= 15 ? 'text-amber-400' : 'text-green-400'}`}>{pct.toFixed(1)}%</span></p>
                                    </div>
                                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-foreground rotate-45" />
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                      </div>
                    </CardHeader>
                  <CardContent>
                    <ChartContainer config={arChartConfig} className="h-[220px] w-full">
                      <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactCurrency(v)} width={50} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Bar dataKey="ar" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Bar dataKey="ar60d" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2: Pipeline & Utilization + RAG */}
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-600" />
                          Pipeline Trend
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Total should be 3-4x quarterly revenue target</p>
                        {trendData.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Values from ({trendData[trendData.length - 1].week}) &rarr; Pipeline Total: <span className="font-semibold text-foreground">{formatCurrency(trendData[trendData.length - 1].pipeline)}</span> | Weighted: <span className="font-semibold text-foreground">{formatCurrency(trendData[trendData.length - 1].weighted)}</span>
                          </p>
                        )}
                      </CardHeader>
                  <CardContent>
                    <ChartContainer config={pipelineChartConfig} className="h-[220px] w-full">
                      <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactCurrency(v)} width={50} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Line type="monotone" dataKey="pipeline" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="weighted" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                            Project Health
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{ragTotal} total projects</p>
                        </div>
                          {projectHealthStatus && (
                            <div className="relative group/ph">
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-help ${
                                projectHealthStatus.ok
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {projectHealthStatus.ok
                                  ? <CheckCircle2 className="w-3 h-3" />
                                  : <AlertTriangle className="w-3 h-3" />}
                                {projectHealthStatus.label}
                                <Info className="w-3 h-3 opacity-50" />
                              </div>
                              <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover/ph:block">
                                <div className="bg-foreground text-white rounded-lg shadow-xl p-3 w-[260px] text-xs">
                                  <p className="font-semibold mb-2 text-muted-foreground">Project Health Thresholds</p>
                                  <p className="text-xs text-muted-foreground mb-2">Flags &quot;Needs Attention&quot; when:</p>
                                  <div className="space-y-1.5">
                                    <div className="flex items-start gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground">Red Projects &gt;15% of Total Projects</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground">Increasing value of Red Projects 2+ weeks</span>
                                    </div>
                                  </div>
                                  <div className="border-t border-border mt-2 pt-2">
                                    <p className="text-muted-foreground">Current: <span className="text-white font-semibold">{selectedEntry.red_projects ?? 0}</span> red of <span className="text-white font-semibold">{ragTotal}</span> total ({ragTotal > 0 ? ((selectedEntry.red_projects ?? 0) / ragTotal * 100).toFixed(1) : '0'}%)</p>
                                  </div>
                                  <div className="absolute -top-1.5 right-4 w-3 h-3 bg-foreground rotate-45" />
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="h-[140px] w-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ragPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            dataKey="value"
                            strokeWidth={2}
                            stroke="#fff"
                          >
                            {ragPieData.map((entry, index) => {
                              const colorMap: Record<string, string> = { Red: '#ef4444', Amber: '#f59e0b', Green: '#22c55e' }
                              return <Cell key={entry.name} fill={colorMap[entry.name] || '#ccc'} />
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-2">
                      {[
                        { label: 'Red', value: selectedEntry.red_projects, prev: previousEntry?.red_projects, color: 'bg-red-500', text: 'text-red-600' },
                        { label: 'Amber', value: selectedEntry.amber_projects, prev: previousEntry?.amber_projects, color: 'bg-amber-500', text: 'text-amber-600' },
                        { label: 'Green', value: selectedEntry.green_projects, prev: previousEntry?.green_projects, color: 'bg-green-500', text: 'text-green-600' },
                      ].map(item => {
                        const diff = item.prev != null && item.value != null ? item.value - item.prev : null
                        return (
                          <div key={item.label} className="text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                              <span className="text-lg font-bold">{item.value ?? '-'}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            {diff !== null && diff !== 0 && (
                              <p className={`text-[10px] font-medium ${diff > 0 ? item.text : 'text-green-600'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Utilization & Bench + Sales Pulse */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-600" />
                      Utilization & Bench
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">4-week avg utilization: {formatPercent(fourWeekAvgUtilization)}</p>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={utilizationChartConfig} className="h-[200px] w-full">
                      <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(1)}%`} />}
                        />
                        <Area type="monotone" dataKey="utilization" stroke="#f59e0b" strokeWidth={2} fill="url(#utilGrad)" />
                      </AreaChart>
                    </ChartContainer>
                    <div className="flex items-center justify-between mt-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Bench:</span>
                        <span className="text-lg font-bold">{selectedEntry.bench_count ?? '-'}</span>
                        {previousEntry && selectedEntry.bench_count !== null && previousEntry.bench_count !== null && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              selectedEntry.bench_count - previousEntry.bench_count > 0
                                ? 'text-red-600 border-red-200 bg-red-50'
                                : selectedEntry.bench_count - previousEntry.bench_count < 0
                                  ? 'text-green-600 border-green-200 bg-green-50'
                                  : ''
                            }`}
                          >
                            {selectedEntry.bench_count - previousEntry.bench_count > 0 ? '+' : ''}
                            {selectedEntry.bench_count - previousEntry.bench_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Phone className="w-4 h-4 text-cyan-600" />
                        Sales Pulse
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Target: 20-30/week to generate &euro;5-6M new business</p>
                    </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Discovery Calls</p>
                        <p className="text-xl font-bold">{selectedEntry.discovery_calls ?? '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Pipeline Total</p>
                        <p className="text-xl font-bold">{formatCurrency(selectedEntry.pipeline_total_eur)}</p>
                        {previousEntry && selectedEntry.pipeline_total_eur !== null && previousEntry.pipeline_total_eur !== null && (
                          <p className={`text-xs font-medium ${selectedEntry.pipeline_total_eur >= previousEntry.pipeline_total_eur ? 'text-emerald-600' : 'text-red-500'}`}>
                            {selectedEntry.pipeline_total_eur >= previousEntry.pipeline_total_eur ? '+' : ''}{formatCurrency(selectedEntry.pipeline_total_eur - previousEntry.pipeline_total_eur)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Opps Added</p>
                        <p className="text-xl font-bold">{selectedEntry.opps_added ?? '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Opps Won</p>
                        <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedEntry.opps_won_eur)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Opps Lost</p>
                        <p className="text-xl font-bold text-red-500">{selectedEntry.opps_lost ?? '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Expected Closes (30d)</p>
                        <p className="text-xl font-bold">{formatCurrency(selectedEntry.expected_closes_30d_eur)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risks & Critical Roles */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-red-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      Top 3 Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEntry.top_3_risks ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEntry.top_3_risks}</div>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">No risks reported this week</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-amber-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Critical Open Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEntry.critical_open_roles ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEntry.critical_open_roles}</div>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">No critical open roles reported</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="tracker" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Weekly Data Tracker</h2>
                <p className="text-sm text-muted-foreground">{entries.length} weekly entries recorded</p>
              </div>
              <Button onClick={handleOpenAddModal} className="gap-2 bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm">
                <Plus className="w-4 h-4" />
                Add New Update
              </Button>
            </div>

            <Card className="border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b">
                      <TableHead className="min-w-[80px] sticky left-0 bg-muted/50 z-10">Actions</TableHead>
                      <TableHead className="min-w-[110px]">Week</TableHead>
                      <TableHead className="min-w-[100px] text-right">Cash</TableHead>
                      <TableHead className="min-w-[100px] text-right">Total AR</TableHead>
                      <TableHead className="min-w-[100px] text-right">AR &gt;60d</TableHead>
                      <TableHead className="min-w-[70px] text-right">AR %</TableHead>
                      <TableHead className="min-w-[50px] text-center">R</TableHead>
                      <TableHead className="min-w-[50px] text-center">A</TableHead>
                      <TableHead className="min-w-[50px] text-center">G</TableHead>
                      <TableHead className="min-w-[70px] text-center">Calls</TableHead>
                      <TableHead className="min-w-[100px] text-right">Pipeline</TableHead>
                      <TableHead className="min-w-[100px] text-right">Weighted</TableHead>
                      <TableHead className="min-w-[70px] text-center">+Opps</TableHead>
                      <TableHead className="min-w-[100px] text-right">Won</TableHead>
                      <TableHead className="min-w-[70px] text-center">Lost</TableHead>
                      <TableHead className="min-w-[100px] text-right">Closes 30d</TableHead>
                      <TableHead className="min-w-[70px] text-right">Util %</TableHead>
                        <TableHead className="min-w-[60px] text-center">Bench</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={20} className="h-32 text-center text-muted-foreground">
                          No entries yet. Click &quot;Add New Update&quot; to get started.
                        </TableCell>
                      </TableRow>
                    )}
                    {paginatedEntries.map((entry) => {
                      const fullIdx = entries.findIndex(e => e.id === entry.id)
                      const prev = fullIdx < entries.length - 1 ? entries[fullIdx + 1] : null
                      const cashDiff = prev ? entry.cash_eur - prev.cash_eur : null
                      return (
                        <TableRow key={entry.id} className="hover:bg-muted/30 group">
                            <TableCell className="sticky left-0 bg-background z-10 group-hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-0.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setViewModalEntry(entry); setViewModalOpen(true) }}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-[#ea2775] hover:bg-[#ea2775]/10"
                                  title="View"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditModal(entry)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-[#ea2775] hover:bg-[#ea2775]/10"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          <TableCell className="font-medium text-sm whitespace-nowrap">
                            {formatDate(entry.week_ended)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            <div>{formatCurrency(entry.cash_eur)}</div>
                            {cashDiff !== null && cashDiff !== 0 && (
                              <div className={`text-[10px] font-medium ${cashDiff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {cashDiff > 0 ? '+' : ''}{formatCurrency(cashDiff)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatCurrency(entry.total_ar_eur)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatCurrency(entry.ar_over_60d_eur)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {entry.ar_over_60d_percent != null ? (
                              <span className={
                                entry.ar_over_60d_percent > 25 ? 'text-red-600 font-semibold' :
                                entry.ar_over_60d_percent >= 15 ? 'text-amber-600 font-medium' :
                                'text-emerald-600'
                              }>
                                {entry.ar_over_60d_percent.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1.5">
                              {entry.red_projects ?? '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-1.5">
                              {entry.amber_projects ?? '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5">
                              {entry.green_projects ?? '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{entry.discovery_calls ?? '-'}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatCurrency(entry.pipeline_total_eur)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatCurrency(entry.pipeline_weighted_eur)}</TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{entry.opps_added ?? '-'}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-emerald-600 font-medium">{formatCurrency(entry.opps_won_eur)}</TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{entry.opps_lost ?? '-'}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatCurrency(entry.expected_closes_30d_eur)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatPercent(entry.utilization_percent)}</TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{entry.bench_count ?? '-'}</TableCell>
                          </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              </Card>

              {/* Pagination */}
              {entries.length > TRACKER_PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {trackerPage * TRACKER_PAGE_SIZE + 1}–{Math.min((trackerPage + 1) * TRACKER_PAGE_SIZE, entries.length)} of {entries.length} entries
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackerPage(0)}
                      disabled={trackerPage === 0}
                      className="h-8 px-2.5 text-xs"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackerPage(p => Math.max(0, p - 1))}
                      disabled={trackerPage === 0}
                      className="h-8 px-2.5 text-xs"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: trackerTotalPages }, (_, i) => i)
                      .filter(i => i === 0 || i === trackerTotalPages - 1 || Math.abs(i - trackerPage) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
                        if (idx > 0 && arr[idx - 1] !== undefined && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                        acc.push(i)
                        return acc
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-1 text-muted-foreground text-xs">...</span>
                        ) : (
                          <Button
                            key={item}
                            variant={trackerPage === item ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTrackerPage(item as number)}
                            className={`h-8 w-8 p-0 text-xs ${trackerPage === item ? 'bg-[#ea2775] hover:bg-[#d01e65] text-white' : ''}`}
                          >
                            {(item as number) + 1}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackerPage(p => Math.min(trackerTotalPages - 1, p + 1))}
                      disabled={trackerPage >= trackerTotalPages - 1}
                      className="h-8 px-2.5 text-xs"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackerPage(trackerTotalPages - 1)}
                      disabled={trackerPage >= trackerTotalPages - 1}
                      className="h-8 px-2.5 text-xs"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
        </Tabs>

        {/* Tracker Add/Edit Modal */}
        <Dialog open={trackerModalOpen} onOpenChange={setTrackerModalOpen}>
          <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden rounded-xl border-border max-h-[90vh] flex flex-col">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#ea2775] via-[#c01560] to-[#9b0f4d] px-6 py-5 shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg font-semibold">
                      {trackerModalEntry ? 'Edit Weekly Update' : 'New Weekly Update'}
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-white/60 text-xs mt-0.5">
                    {trackerModalEntry
                      ? `Editing week of ${formatDate(trackerModalEntry.week_ended)}`
                      : 'Record this week\'s financial and operational metrics'}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Week Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Week Ended <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={trackerForm.week_ended || ''}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, week_ended: e.target.value }))}
                  className="h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg w-[180px]"
                />
              </div>

              {/* Financial Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#ea2775]/15">
                    <Banknote className="w-3.5 h-3.5 text-[#ea2775]" />
                  </div>
                  <h3 className="text-sm font-semibold">Financial</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cash Balance *</Label>
                    <Input
                      type="number"
                      value={trackerForm.cash_eur ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, cash_eur: e.target.value ? Number(e.target.value) : 0 }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Total AR *</Label>
                    <Input
                      type="number"
                      value={trackerForm.total_ar_eur ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, total_ar_eur: e.target.value ? Number(e.target.value) : 0 }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">AR &gt;60d *</Label>
                    <Input
                      type="number"
                      value={trackerForm.ar_over_60d_eur ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, ar_over_60d_eur: e.target.value ? Number(e.target.value) : 0 }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>
                {(trackerForm.total_ar_eur ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    AR &gt;60d %: <span className="font-medium text-foreground">{(((trackerForm.ar_over_60d_eur ?? 0) / (trackerForm.total_ar_eur ?? 1)) * 100).toFixed(1)}%</span>
                  </p>
                )}
              </div>

              {/* Project Health */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100">
                    <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Project Health (RAG)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-red-600 font-medium">Red Projects</Label>
                    <Input
                      type="number"
                      value={trackerForm.red_projects ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, red_projects: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-red-50/50 border-red-200 focus-visible:ring-1 focus-visible:ring-red-500/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-amber-600 font-medium">Amber Projects</Label>
                    <Input
                      type="number"
                      value={trackerForm.amber_projects ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, amber_projects: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-amber-50/50 border-amber-200 focus-visible:ring-1 focus-visible:ring-amber-500/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-green-600 font-medium">Green Projects</Label>
                    <Input
                      type="number"
                      value={trackerForm.green_projects ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, green_projects: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-green-50/50 border-green-200 focus-visible:ring-1 focus-visible:ring-green-500/50 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Sales Pipeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100">
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Sales & Pipeline</h3>
                  {pipelineLoading && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading from Dynamics…
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Discovery Calls</Label>
                    <Input
                      type="number"
                      value={trackerForm.discovery_calls ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, discovery_calls: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Pipeline Total</Label>
                    <EuroInput
                      defaultValue={trackerForm.pipeline_total_eur}
                      onSave={(val) => setTrackerForm(prev => ({ ...prev, pipeline_total_eur: val }))}
                      className="h-9 w-full bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Pipeline Weighted</Label>
                    <EuroInput
                      defaultValue={trackerForm.pipeline_weighted_eur}
                      onSave={(val) => setTrackerForm(prev => ({ ...prev, pipeline_weighted_eur: val }))}
                      className="h-9 w-full bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Opps Added</Label>
                    <Input
                      type="number"
                      value={trackerForm.opps_added ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, opps_added: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Opps Won (EUR)</Label>
                    <EuroInput
                      defaultValue={trackerForm.opps_won_eur}
                      onSave={(val) => setTrackerForm(prev => ({ ...prev, opps_won_eur: val }))}
                      className="h-9 w-full bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Opps Lost</Label>
                    <Input
                      type="number"
                      value={trackerForm.opps_lost ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, opps_lost: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Expected Closes (30d)</Label>
                  <EuroInput
                    defaultValue={trackerForm.expected_closes_30d_eur}
                    onSave={(val) => setTrackerForm(prev => ({ ...prev, expected_closes_30d_eur: val }))}
                    className="h-9 w-1/3 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                  />
                </div>
              </div>

              {/* Team */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Team</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Utilization %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={trackerForm.utilization_percent ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, utilization_percent: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Bench Count</Label>
                    <Input
                      type="number"
                      value={trackerForm.bench_count ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, bench_count: e.target.value ? Number(e.target.value) : null }))}
                      className="h-9 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-100">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Risks & Notes</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Critical Open Roles</Label>
                    <Textarea
                      value={trackerForm.critical_open_roles ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, critical_open_roles: e.target.value || null }))}
                      className="min-h-[70px] bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg text-sm"
                      placeholder="List critical open roles..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Top 3 Risks</Label>
                    <Textarea
                      value={trackerForm.top_3_risks ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, top_3_risks: e.target.value || null }))}
                      className="min-h-[70px] bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg text-sm"
                      placeholder="List top risks..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea
                      value={trackerForm.notes ?? ''}
                      onChange={(e) => setTrackerForm(prev => ({ ...prev, notes: e.target.value || null }))}
                      className="min-h-[70px] bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-[#ea2775]/50 rounded-lg text-sm"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setTrackerModalOpen(false)} className="rounded-lg h-9 px-4 text-sm">
                Cancel
              </Button>
              <Button
                onClick={handleSaveTrackerModal}
                disabled={trackerModalSaving}
                className="bg-[#ea2775] hover:bg-[#d01e65] text-white rounded-lg h-9 px-5 text-sm shadow-sm min-w-[120px]"
              >
                {trackerModalSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {trackerModalEntry ? 'Update' : 'Create Entry'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View-Only Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden rounded-xl border-border max-h-[90vh] flex flex-col">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 px-6 py-5 shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg font-semibold">
                      Weekly Update Details
                    </DialogTitle>
                  </DialogHeader>
                  {viewModalEntry && (
                    <p className="text-white/60 text-xs mt-0.5">
                      Week ended {formatDate(viewModalEntry.week_ended)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {viewModalEntry && (
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Financial */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#ea2775]/15">
                      <Banknote className="w-3.5 h-3.5 text-[#ea2775]" />
                    </div>
                    <h3 className="text-sm font-semibold">Financial</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Cash Balance</p>
                      <p className="text-sm font-semibold mt-0.5">{formatCurrency(viewModalEntry.cash_eur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total AR</p>
                      <p className="text-sm font-semibold mt-0.5">{formatCurrency(viewModalEntry.total_ar_eur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AR &gt;60d</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {formatCurrency(viewModalEntry.ar_over_60d_eur)}
                        {viewModalEntry.ar_over_60d_percent != null && (
                          <span className={`ml-1.5 text-xs ${
                            viewModalEntry.ar_over_60d_percent > 25 ? 'text-red-600' :
                            viewModalEntry.ar_over_60d_percent >= 15 ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            ({viewModalEntry.ar_over_60d_percent.toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project Health */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold">Project Health (RAG)</h3>
                  </div>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1 text-sm">
                      Red: {viewModalEntry.red_projects ?? '-'}
                    </Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1 text-sm">
                      Amber: {viewModalEntry.amber_projects ?? '-'}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 text-sm">
                      Green: {viewModalEntry.green_projects ?? '-'}
                    </Badge>
                  </div>
                </div>

                {/* Sales & Pipeline */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold">Sales & Pipeline</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Discovery Calls</p>
                      <p className="text-sm font-semibold mt-0.5">{viewModalEntry.discovery_calls ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pipeline Total</p>
                      <p className="text-sm font-semibold mt-0.5">{formatCurrency(viewModalEntry.pipeline_total_eur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pipeline Weighted</p>
                      <p className="text-sm font-semibold mt-0.5">{formatCurrency(viewModalEntry.pipeline_weighted_eur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Opps Added</p>
                      <p className="text-sm font-semibold mt-0.5">{viewModalEntry.opps_added ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Opps Won</p>
                      <p className="text-sm font-semibold mt-0.5 text-emerald-600">{formatCurrency(viewModalEntry.opps_won_eur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Opps Lost</p>
                      <p className="text-sm font-semibold mt-0.5">{viewModalEntry.opps_lost ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Closes (30d)</p>
                      <p className="text-sm font-semibold mt-0.5">{formatCurrency(viewModalEntry.expected_closes_30d_eur)}</p>
                    </div>
                  </div>
                </div>

                {/* Team */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold">Team</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Utilization</p>
                      <p className="text-sm font-semibold mt-0.5">{formatPercent(viewModalEntry.utilization_percent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bench Count</p>
                      <p className="text-sm font-semibold mt-0.5">{viewModalEntry.bench_count ?? '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Risks & Notes */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-100">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <h3 className="text-sm font-semibold">Risks & Notes</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Critical Open Roles</p>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        {viewModalEntry.critical_open_roles ? (
                          <p className="whitespace-pre-wrap">{viewModalEntry.critical_open_roles}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No critical open roles reported</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Top 3 Risks</p>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        {viewModalEntry.top_3_risks ? (
                          <p className="whitespace-pre-wrap">{viewModalEntry.top_3_risks}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No risks reported</p>
                        )}
                      </div>
                    </div>
                    {viewModalEntry.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <div className="bg-muted/30 rounded-lg p-3 text-sm">
                          <p className="whitespace-pre-wrap">{viewModalEntry.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setViewModalOpen(false)} className="rounded-lg h-9 px-4 text-sm">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

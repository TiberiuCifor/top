'use client'

import { useMemo } from 'react'
import { PreSalesStatus } from './PreSalesStatus'
import type { Assignment, Employee, Project, Client, Practice, Reminder, User } from '@/lib/types'
import type { Tab } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  Users, Briefcase, Building2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, UserCheck, UserMinus,
  UserPlus, Activity, Layers, BarChart3, ExternalLink,
  ArrowUpRight, ArrowRight, ChevronRight, Bell
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

interface OverviewDashboardV2Props {
  assignments: Assignment[]
  employees: Employee[]
  projects: Project[]
  clients: Client[]
  practices: Practice[]
  reminders: Reminder[]
  currentUser: User | null
  onNavigate: (tab: Tab) => void
  onAllocationClick?: (group: 'Below 100%' | '100%' | 'Above 100%') => void
  onRagClick?: (status: 'G' | 'A' | 'R' | 'noStatus') => void
  onBenchClick?: () => void
}

export function OverviewDashboardV2({
  assignments,
  employees,
  projects,
  clients,
  practices,
  reminders,
  currentUser,
  onNavigate,
  onAllocationClick,
  onRagClick,
  onBenchClick
}: OverviewDashboardV2Props) {
    const userReminders = useMemo(() => {
      if (!currentUser) return []
      return reminders.filter(r => r.owner_id === currentUser.id && r.status === 'New')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [reminders, currentUser])

    const latestReminder = userReminders[0] ?? null

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'Active')
    const activeProjects = projects.filter(p => p.name.toLowerCase() !== 'bench' && p.status === 'active')
    const projectsWithLead = activeProjects.filter(p => p.project_lead_id)

    const fteCount = activeEmployees.filter(e => e.contract_type === 'FTE').length
    const ctrCount = activeEmployees.filter(e => e.contract_type === 'CTR').length

    const allActiveAssignments = assignments.filter(a => a.status === 'active')
    const nonBenchAssignments = allActiveAssignments.filter(a => a.project?.name.toLowerCase() !== 'bench')
    const benchAssignments = allActiveAssignments.filter(a => a.project?.name.toLowerCase() === 'bench')

    const employeeAllocations = new Map<string, number>()
    allActiveAssignments.forEach(a => {
      const current = employeeAllocations.get(a.employee_id) || 0
      employeeAllocations.set(a.employee_id, current + a.allocation_percentage)
    })

    let underAllocated = 0
    let fullyAllocated = 0
    let overAllocated = 0

    activeEmployees.forEach(emp => {
      const allocation = employeeAllocations.get(emp.id) || 0
      if (allocation < 100) underAllocated++
      else if (allocation === 100) fullyAllocated++
      else overAllocated++
    })

    const ragCounts = { R: 0, A: 0, G: 0, none: 0, total: projectsWithLead.length }
    projectsWithLead.forEach(p => {
      const rag = p.latest_rag_status?.rag_score
      if (rag === 'R') ragCounts.R++
      else if (rag === 'A') ragCounts.A++
      else if (rag === 'G') ragCounts.G++
      else ragCounts.none++
    })

    const practiceStats = practices.map(practice => {
      const practiceEmployees = activeEmployees.filter(e => e.practice_id === practice.id)
      return {
        name: practice.name,
        count: practiceEmployees.length,
        fte: practiceEmployees.filter(e => e.contract_type === 'FTE').length,
        ctr: practiceEmployees.filter(e => e.contract_type === 'CTR').length
      }
    }).filter(p => p.count > 0).sort((a, b) => b.count - a.count)

    const projectsByClient = new Map<string, number>()
    activeProjects.forEach(p => {
      const clientName = p.client?.name || 'Unknown'
      projectsByClient.set(clientName, (projectsByClient.get(clientName) || 0) + 1)
    })
    const topClients = Array.from(projectsByClient.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const endingSoon = activeProjects.filter(p => {
      if (!p.end_date) return false
      const endDate = new Date(p.end_date)
      const today = new Date()
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilEnd >= 0 && daysUntilEnd <= 30
    }).length

    return {
      totalProjects: activeProjects.length,
      totalEmployees: activeEmployees.length,
      totalClients: clients.length,
      fteCount,
      ctrCount,
      billableEmployees: new Set(nonBenchAssignments.map(a => a.employee_id)).size,
      benchEmployees: benchAssignments.length,
      underAllocated,
      fullyAllocated,
      overAllocated,
      ragCounts,
      practiceStats,
      topClients,
      endingSoon,
      totalPractices: practices.length
    }
  }, [employees, projects, clients, assignments, practices])

  const allocationData = [
    { name: 'Under', value: stats.underAllocated, color: '#f97316' },
    { name: 'Full', value: stats.fullyAllocated, color: '#10b981' },
    { name: 'Over', value: stats.overAllocated, color: '#ef4444' },
  ]

  const ragData = [
    { name: 'Green', value: stats.ragCounts.G, color: '#22c55e' },
    { name: 'Amber', value: stats.ragCounts.A, color: '#f59e0b' },
    { name: 'Red', value: stats.ragCounts.R, color: '#ef4444' },
    ...(stats.ragCounts.none > 0 ? [{ name: 'None', value: stats.ragCounts.none, color: '#94a3b8' }] : []),
  ]

  const utilizationRate = stats.totalEmployees > 0
    ? Math.round((stats.billableEmployees / stats.totalEmployees) * 100)
    : 0

    return (
      <div className="space-y-6">
        {/* Reminders Banner */}
        {latestReminder && (
          <div className="bg-[#ea2775]/10 border border-[#ea2775]/20 rounded-lg p-1.5 flex items-center gap-3 text-sm shadow-sm min-w-0">
            <div className="flex items-center gap-2 px-2 border-r border-[#ea2775]/30 shrink-0">
              <Bell className="w-4 h-4 text-[#ea2775]" />
              <span className="font-bold text-foreground whitespace-nowrap">
                New Reminders ({userReminders.length})
              </span>
            </div>
            <span className="font-semibold text-[10px] bg-card px-1.5 py-0.5 rounded border border-[#ea2775]/20 shrink-0 shadow-sm text-[#ea2775]">
              {new Date(latestReminder.date).toLocaleDateString()}
            </span>
            <span className="text-[#ea2775] font-medium flex-1 truncate min-w-0">
              {latestReminder.description}
            </span>
            <Badge variant={latestReminder.priority === 'High' ? 'destructive' : 'outline'} className="h-4 text-[9px] px-1 uppercase leading-none border-[#ea2775]/30 bg-card/50 text-[#ea2775] shrink-0">
              {latestReminder.priority}
            </Badge>
            <button
              onClick={() => onNavigate('reminders')}
              className="px-2 py-1 text-xs font-semibold text-[#ea2775] hover:text-foreground hover:bg-[#ea2775]/15 rounded transition-colors flex items-center gap-1 shrink-0"
            >
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
        {/* Hero KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiTile
            label="Active Projects"
            value={stats.totalProjects}
            sub={`${stats.endingSoon} ending soon`}
            icon={<Briefcase className="w-5 h-5" />}
            accent="blue"
            onClick={() => onNavigate('projects')}
          />
          <KpiTile
            label="Total Employees"
            value={stats.totalEmployees}
            sub={`${stats.fteCount} FTE / ${stats.ctrCount} CTR`}
            icon={<Users className="w-5 h-5" />}
            accent="emerald"
            onClick={() => onNavigate('employees')}
          />
          <KpiTile
            label="Clients"
            value={stats.totalClients}
            sub={stats.topClients.length > 0 ? `Top: ${stats.topClients[0][0]}` : 'No active clients'}
            icon={<Building2 className="w-5 h-5" />}
            accent="violet"
            onClick={() => onNavigate('clients')}
          />
          <KpiTile
            label="Utilization"
            value={`${utilizationRate}%`}
            sub={`${stats.billableEmployees} billable`}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="teal"
          />
          <KpiTile
            label="Practices"
            value={stats.totalPractices}
            sub={stats.practiceStats.length > 0 ? `Largest: ${stats.practiceStats[0].name}` : 'None'}
            icon={<Layers className="w-5 h-5" />}
            accent="amber"
            onClick={() => onNavigate('practices')}
          />
        </div>

        {/* Workforce Summary - Second Row */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-muted">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Workforce Summary</h3>
            </div>
            <button
              onClick={() => onNavigate('employees')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.billableEmployees}</p>
                <p className="text-xs text-muted-foreground">Billable</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.benchEmployees}</p>
                <p className="text-xs text-muted-foreground">On Bench</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#ea2775]/10 text-[#ea2775] shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.fteCount}</p>
                <p className="text-xs text-muted-foreground">FTE</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.ctrCount}</p>
                <p className="text-xs text-muted-foreground">Contractors</p>
              </div>
            </div>
          </div>
        </div>

          {/* Pre-Sales Status */}
          <PreSalesStatus />

          {/* Main Content: 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Allocation + Bench/Ending */}
        <div className="lg:col-span-7 space-y-6">
          {/* Allocation Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">Employee Allocation</h3>
              </div>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Details <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-6">
                {/* Donut Chart */}
                <div className="w-[140px] h-[140px] shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-foreground">{stats.totalEmployees}</span>
                    <span className="text-[10px] text-muted-foreground">total</span>
                  </div>
                </div>

                {/* Allocation Breakdown */}
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <AllocationTile
                    label="Under-allocated"
                    count={stats.underAllocated}
                    total={stats.totalEmployees}
                    color="orange"
                    icon={<UserMinus className="w-4 h-4" />}
                    onClick={() => onAllocationClick?.('Below 100%')}
                  />
                  <AllocationTile
                    label="Fully Allocated"
                    count={stats.fullyAllocated}
                    total={stats.totalEmployees}
                    color="emerald"
                    icon={<UserCheck className="w-4 h-4" />}
                    onClick={() => onAllocationClick?.('100%')}
                  />
                  <AllocationTile
                    label="Over-allocated"
                    count={stats.overAllocated}
                    total={stats.totalEmployees}
                    color="red"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={() => onAllocationClick?.('Above 100%')}
                  />
                </div>
              </div>

            {/* Stacked bar with percentages */}
                <div className="mt-5">
                  <div className="h-7 rounded-lg overflow-hidden bg-muted flex">
                    {(() => {
                      const total = stats.totalEmployees || 1
                      const segments = [
                        { value: stats.underAllocated, bg: 'bg-orange-500', label: 'Under' },
                        { value: stats.fullyAllocated, bg: 'bg-emerald-500', label: 'Full' },
                        { value: stats.overAllocated, bg: 'bg-red-500', label: 'Over' },
                      ].filter(s => s.value > 0)
                      return segments.map((seg) => {
                        const pct = Math.round((seg.value / total) * 100)
                        return (
                          <div
                            key={seg.label}
                            className={`${seg.bg} h-full transition-all flex items-center justify-center`}
                            style={{ width: `${(seg.value / total) * 100}%` }}
                          >
                            {pct >= 8 && (
                              <span className="text-[11px] font-semibold text-white drop-shadow-sm">
                                {pct}%
                              </span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-5 mt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                      <span className="text-xs text-muted-foreground">Under-allocated</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Fully Allocated</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                      <span className="text-xs text-muted-foreground">Over-allocated</span>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          {/* Bench + Ending Soon Row */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-card rounded-xl border border-border shadow-sm p-5 cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
              onClick={() => onBenchClick?.()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">On Bench</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.benchEmployees}</p>
              <p className="text-xs text-muted-foreground mt-1">Available for staffing</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#ea2775]/10 text-[#ea2775]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Ending Soon</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.endingSoon}</p>
              <p className="text-xs text-muted-foreground mt-1">Projects within 30 days</p>
            </div>
          </div>

          {/* Practices */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">Employees by Practice</h3>
              </div>
              <button
                onClick={() => onNavigate('practices')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Details <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5">
              {stats.practiceStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No practices configured</p>
              ) : (
                <div className="space-y-3">
                  {stats.practiceStats.map((practice, idx) => {
                    const pct = stats.totalEmployees > 0 ? (practice.count / stats.totalEmployees) * 100 : 0
                    return (
                      <div key={practice.name} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-foreground text-white flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-sm text-foreground">{practice.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{practice.fte} FTE</span>
                            <span>{practice.ctr} CTR</span>
                            <span className="font-semibold text-foreground">{practice.count}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-800 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Right Column: RAG + Clients */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* RAG Status */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">Project Health</h3>
              </div>
              <button
                onClick={() => onNavigate('rag-updates')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                RAG Updates <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-5 mb-5">
                  {/* RAG Donut */}
                <div className="w-[120px] h-[120px] shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ragData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {ragData.map((entry, index) => (
                          <Cell key={`rag-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{stats.ragCounts.total}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">projects</span>
                  </div>
                </div>

                {/* RAG Counts */}
                <div className="flex-1 space-y-2">
                  <RagRow
                    label="On Track"
                    letter="G"
                    count={stats.ragCounts.G}
                    total={stats.ragCounts.total}
                    bg="bg-emerald-500"
                    onClick={() => onRagClick?.('G')}
                  />
                  <RagRow
                    label="Attention"
                    letter="A"
                    count={stats.ragCounts.A}
                    total={stats.ragCounts.total}
                    bg="bg-amber-500"
                    onClick={() => onRagClick?.('A')}
                  />
                  <RagRow
                    label="At Risk"
                    letter="R"
                    count={stats.ragCounts.R}
                    total={stats.ragCounts.total}
                    bg="bg-red-500"
                    onClick={() => onRagClick?.('R')}
                  />
                  {stats.ragCounts.none > 0 && (
                    <RagRow
                      label="No Status"
                      letter="-"
                      count={stats.ragCounts.none}
                      total={stats.ragCounts.total}
                      bg="bg-muted-foreground"
                      onClick={() => onRagClick?.('noStatus')}
                    />
                  )}
                </div>
              </div>
            </div>
            </div>

              {/* Top Clients */}
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-muted">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">Top Clients</h3>
                  </div>
                  <button
                    onClick={() => onNavigate('clients')}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    All Clients <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {stats.topClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No active projects</p>
                  ) : (
                    stats.topClients.map(([client, count], idx) => {
                      const pct = stats.totalProjects > 0 ? (count / stats.totalProjects) * 100 : 0
                      return (
                        <div key={client} className="flex items-center gap-3.5 px-5 py-3 hover:bg-background transition-colors">
                          <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client}</p>
                            <div className="h-1.5 rounded-full overflow-hidden bg-muted mt-1.5">
                              <div
                                className="h-full rounded-full bg-violet-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                            {count}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
                </div>
              </div>

              </div>
          </div>
        )
}


function KpiTile({
  label,
  value,
  sub,
  icon,
  accent,
  onClick,
}: {
  label: string
  value: number | string
  sub: string
  icon: React.ReactNode
  accent: 'blue' | 'emerald' | 'violet' | 'amber' | 'teal'
  onClick?: () => void
}) {
  const accentMap = {
    blue: { bg: 'bg-[#ea2775]/10', iconBg: 'bg-[#ea2775]/15', iconColor: 'text-[#ea2775]', valueTxt: 'text-[#ea2775]', border: 'hover:border-[#ea2775]/50' },
    emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueTxt: 'text-emerald-700', border: 'hover:border-emerald-300' },
    violet: { bg: 'bg-violet-50', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', valueTxt: 'text-violet-700', border: 'hover:border-violet-300' },
    amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', valueTxt: 'text-amber-700', border: 'hover:border-amber-300' },
    teal: { bg: 'bg-teal-50', iconBg: 'bg-teal-100', iconColor: 'text-teal-600', valueTxt: 'text-teal-700', border: 'hover:border-teal-300' },
  }
  const a = accentMap[accent]

  return (
    <div
      className={`bg-card rounded-xl border border-border shadow-sm p-4 ${onClick ? `cursor-pointer ${a.border} hover:shadow-md` : ''} transition-all`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${a.iconBg} ${a.iconColor}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${a.valueTxt}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
    </div>
  )
}


function AllocationTile({
  label,
  count,
  total,
  color,
  icon,
  onClick,
}: {
  label: string
  count: number
  total: number
  color: 'orange' | 'emerald' | 'red'
  icon: React.ReactNode
  onClick?: () => void
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const colorMap = {
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', hover: 'hover:bg-orange-100 hover:border-orange-300' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', hover: 'hover:bg-emerald-100 hover:border-emerald-300' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', hover: 'hover:bg-red-100 hover:border-red-300' },
  }
  const c = colorMap[color]

  return (
    <div
      className={`${c.bg} ${c.border} border rounded-lg p-3 text-center cursor-pointer ${c.hover} transition-all`}
      onClick={onClick}
    >
      <div className={`flex items-center justify-center mb-1 ${c.text}`}>
        {icon}
      </div>
      <p className={`text-xl font-bold ${c.text}`}>{count}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% of total</p>
      <p className={`text-[10px] font-medium ${c.text} mt-0.5`}>{label}</p>
    </div>
  )
}


function RagRow({
  label,
  letter,
  count,
  total,
  bg,
  onClick,
}: {
  label: string
  letter: string
  count: number
  total: number
  bg: string
  onClick?: () => void
}) {
  const pct = total > 0 ? (count / total) * 100 : 0

  return (
    <div
      className="flex items-center gap-2.5 cursor-pointer group hover:bg-background rounded-lg px-2 py-1.5 -mx-2 transition-colors"
      onClick={onClick}
    >
      <span className={`w-6 h-6 ${bg} rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
        {letter}
      </span>
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
        <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-foreground w-6 text-right tabular-nums">{count}</span>
    </div>
  )
}

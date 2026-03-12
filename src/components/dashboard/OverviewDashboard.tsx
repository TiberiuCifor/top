'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Assignment, Employee, Project, Client, Practice, Reminder, User } from '@/lib/types'
import { 
  Users, Briefcase, Building2, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, Clock, UserCheck, UserMinus, 
  UserPlus, Activity, Layers, BarChart3, ExternalLink, Bell
} from 'lucide-react'
import type { Tab } from '@/lib/types'

interface OverviewDashboardProps {
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

export function OverviewDashboard({ 
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
}: OverviewDashboardProps) {
    const userReminders = useMemo(() => {
    if (!currentUser) return []
    return reminders.filter(r => r.owner_id === currentUser.id && r.status === 'New')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [reminders, currentUser])

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


  return (
    <div className="space-y-6">
      {userReminders.length > 0 && (
        <div className="bg-[#ea2775]/10 border border-[#ea2775]/20 rounded-lg p-1.5 flex items-center gap-3 text-sm shadow-sm">
          <div className="flex items-center gap-2 px-2 border-r border-[#ea2775]/30 shrink-0">
            <Bell className="w-4 h-4 text-[#ea2775]" />
            <span className="font-bold text-foreground whitespace-nowrap">
              New Reminders ({userReminders.length})
            </span>
          </div>
          <div className="flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-8 whitespace-nowrap">
              {userReminders.map(r => (
                <div key={r.id} className="flex items-center gap-3 text-[#ea2775]">
                  <span className="font-semibold text-[10px] bg-card px-1.5 py-0.5 rounded border border-[#ea2775]/20 shrink-0 shadow-sm">
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                    <span className="font-medium">{r.description}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={r.priority === 'High' ? 'destructive' : 'outline'} className="h-4 text-[9px] px-1 uppercase leading-none border-[#ea2775]/30 bg-card/50 text-[#ea2775]">
                      {r.priority}
                    </Badge>
                    <span className="text-[10px] opacity-60 italic">Assigned to me</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => onNavigate('reminders')}
            className="px-2 py-1 text-xs font-semibold text-[#ea2775] hover:text-foreground hover:bg-[#ea2775]/15 rounded transition-colors flex items-center gap-1 shrink-0 ml-auto"
          >
            View All <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="bg-gradient-to-br from-[#ea2775]/10 to-[#ea2775]/5 border-[#ea2775]/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate('projects')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-[#ea2775]">{stats.totalProjects}</p>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.endingSoon} ending within 30 days</p>
              </div>
              <div className="p-3 bg-[#ea2775]/100/15 rounded-xl">
                <Briefcase className="w-6 h-6 text-[#ea2775]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate('employees')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-emerald-700">{stats.totalEmployees}</p>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.fteCount} FTE + {stats.ctrCount} CTR</p>
              </div>
              <div className="p-3 bg-emerald-500/15 rounded-xl">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate('clients')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-violet-700">{stats.totalClients}</p>
                <p className="text-sm font-medium text-muted-foreground">Clients</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.topClients.length > 0 ? `Top: ${stats.topClients[0][0]}` : 'No active clients'}</p>
              </div>
              <div className="p-3 bg-violet-500/15 rounded-xl">
                <Building2 className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate('practices')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-700">{stats.totalPractices}</p>
                <p className="text-sm font-medium text-muted-foreground">Practices</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.practiceStats.length > 0 ? `Largest: ${stats.practiceStats[0].name}` : 'No practices'}</p>
              </div>
              <div className="p-3 bg-amber-500/15 rounded-xl">
                <Layers className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Employee Allocation Overview
                </CardTitle>
                <button 
                  onClick={() => onNavigate('employees')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  Click for more <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div 
                className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200 cursor-pointer hover:shadow-md transition-all hover:bg-orange-100"
                onClick={() => onAllocationClick?.('Below 100%')}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserMinus className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-600">{stats.underAllocated}</p>
                <p className="text-sm text-muted-foreground">&lt;100% Allocated</p>
                <p className="text-xs text-orange-600 mt-1">Available capacity</p>
              </div>
              <div 
                className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer hover:shadow-md transition-all hover:bg-emerald-100"
                onClick={() => onAllocationClick?.('100%')}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-3xl font-bold text-emerald-600">{stats.fullyAllocated}</p>
                <p className="text-sm text-muted-foreground">100% Allocated</p>
                <p className="text-xs text-emerald-600 mt-1">Fully utilized</p>
              </div>
              <div 
                className="text-center p-4 bg-red-50 rounded-xl border border-red-200 cursor-pointer hover:shadow-md transition-all hover:bg-red-100"
                onClick={() => onAllocationClick?.('Above 100%')}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserPlus className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-600">{stats.overAllocated}</p>
                <p className="text-sm text-muted-foreground">&gt;100% Allocated</p>
                <p className="text-xs text-red-600 mt-1">Over-allocated</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Allocation Distribution</span>
                <span className="font-medium">{stats.totalEmployees} employees</span>
              </div>
              <div className="h-6 rounded-full overflow-hidden bg-gray-100 flex">
                {stats.underAllocated > 0 && (
                  <div 
                    className="bg-orange-500 h-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ width: `${(stats.underAllocated / stats.totalEmployees) * 100}%` }}
                  >
                    {stats.underAllocated > 2 && `${Math.round((stats.underAllocated / stats.totalEmployees) * 100)}%`}
                  </div>
                )}
                {stats.fullyAllocated > 0 && (
                  <div 
                    className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ width: `${(stats.fullyAllocated / stats.totalEmployees) * 100}%` }}
                  >
                    {stats.fullyAllocated > 2 && `${Math.round((stats.fullyAllocated / stats.totalEmployees) * 100)}%`}
                  </div>
                )}
                {stats.overAllocated > 0 && (
                  <div 
                    className="bg-red-500 h-full flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ width: `${(stats.overAllocated / stats.totalEmployees) * 100}%` }}
                  >
                    {stats.overAllocated > 2 && `${Math.round((stats.overAllocated / stats.totalEmployees) * 100)}%`}
                  </div>
                )}
              </div>
              <div className="flex gap-4 justify-center text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  Under-allocated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Fully allocated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Over-allocated
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

          <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-primary" />
                    RAG Status Summary
                  </CardTitle>
                  <button 
                    onClick={() => onNavigate('rag-updates')}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    Click for more <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </CardHeader>
            <CardContent>
                <div className="space-y-3">
                  <div 
                    className="flex items-center gap-3 bg-foreground rounded-xl px-4 py-2 shadow-md cursor-pointer hover:bg-accent transition-all"
                    onClick={() => onRagClick?.('noStatus')}
                  >
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Projects</span>
                    <span className="text-xl font-bold text-white ml-auto">{stats.ragCounts.total}</span>
                  </div>
                  
                  <div 
                    className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl px-4 py-2 shadow-md shadow-emerald-500/20 cursor-pointer hover:scale-[1.02] transition-all"
                    onClick={() => onRagClick?.('G')}
                  >
                    <div className="w-5 h-5 bg-card/20 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">G</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">On Track</span>
                    <span className="text-xl font-bold text-white ml-auto">{stats.ragCounts.G}</span>
                  </div>

                  <div 
                    className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl px-4 py-2 shadow-md shadow-amber-500/20 cursor-pointer hover:scale-[1.02] transition-all"
                    onClick={() => onRagClick?.('A')}
                  >
                    <div className="w-5 h-5 bg-card/20 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">A</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider">Attention</span>
                    <span className="text-xl font-bold text-white ml-auto">{stats.ragCounts.A}</span>
                  </div>

                  <div 
                    className="flex items-center gap-3 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl px-4 py-2 shadow-md shadow-rose-500/20 cursor-pointer hover:scale-[1.02] transition-all"
                    onClick={() => onRagClick?.('R')}
                  >
                    <div className="w-5 h-5 bg-card/20 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">R</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-100 uppercase tracking-wider">At Risk</span>
                    <span className="text-xl font-bold text-white ml-auto">{stats.ragCounts.R}</span>
                  </div>

                  {stats.ragCounts.none > 0 && (
                    <div 
                      className="flex items-center gap-3 bg-gradient-to-r from-slate-400 to-slate-500 rounded-xl px-4 py-2 shadow-md cursor-pointer hover:scale-[1.02] transition-all"
                      onClick={() => onRagClick?.('noStatus')}
                    >
                      <div className="w-5 h-5 bg-card/20 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold text-[10px]">-</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No Status</span>
                      <span className="text-xl font-bold text-white ml-auto">{stats.ragCounts.none}</span>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="w-5 h-5 text-primary" />
                  Employees by Practice
                </CardTitle>
                <button 
                  onClick={() => onNavigate('practices')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  Click for more <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
          <CardContent>
            {stats.practiceStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No practices configured</p>
            ) : (
              <div className="space-y-3">
                {stats.practiceStats.map((practice, idx) => (
                  <div key={practice.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{practice.name}</span>
                        <span className="text-sm text-muted-foreground">{practice.count} employees</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex">
                        <div 
                          className="bg-primary h-full"
                          style={{ width: `${(practice.count / stats.totalEmployees) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{practice.fte} FTE</span>
                        <span>{practice.ctr} CTR</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                  Projects by Client
                </CardTitle>
                <button 
                  onClick={() => onNavigate('projects')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  Click for more <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
          <CardContent>
            {stats.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active projects</p>
            ) : (
              <div className="space-y-3">
                {stats.topClients.map(([client, count], idx) => (
                  <div key={client} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-sm font-bold text-violet-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{client}</span>
                        <Badge variant="secondary">{count} project{count !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                        <div 
                          className="bg-violet-500 h-full"
                          style={{ width: `${(count / stats.totalProjects) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-500/5 border-teal-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-500/15 rounded-xl">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700">{stats.billableEmployees}</p>
                <p className="text-sm text-muted-foreground">Billable Employees</p>
                <p className="text-xs text-teal-600">On active projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onBenchClick?.()}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/15 rounded-xl">
                <TrendingDown className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-700">{stats.benchEmployees}</p>
                <p className="text-sm text-muted-foreground">On Bench</p>
                <p className="text-xs text-rose-600">Available for projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#ea2775]/10 to-[#ea2775]/5 border-[#ea2775]/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#ea2775]/100/15 rounded-xl">
                <Clock className="w-6 h-6 text-[#ea2775]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#ea2775]">{stats.endingSoon}</p>
                <p className="text-sm text-muted-foreground">Ending Soon</p>
                <p className="text-xs text-[#ea2775]">Within 30 days</p>
              </div>
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    )
  }



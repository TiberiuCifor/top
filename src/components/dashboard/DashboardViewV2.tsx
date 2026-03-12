'use client'

import { useState, useMemo, Fragment, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Assignment, Employee, Project, Client } from '@/lib/types'
import { Users, Briefcase, CalendarDays, LayoutGrid, GanttChart, MessageSquare, ChevronRight, UserCheck, TrendingDown } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAllEmployeeUpdates } from '@/hooks/useEmployeeUpdates'
import { EmployeeUpdateModal } from '@/components/modals/EmployeeUpdateModal'

interface DashboardViewV2Props {
  assignments: Assignment[]
  employees: Employee[]
  projects: Project[]
  clients: Client[]
  onEditAssignment: (assignment: Assignment) => void
}

export function DashboardViewV2({ assignments, employees, projects, clients, onEditAssignment }: DashboardViewV2Props) {
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('grid')
  const [groupBy, setGroupBy] = useState<'projects' | 'employees'>('projects')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'billable' | 'bench'>('billable')
  const [showOnlyFTE, setShowOnlyFTE] = useState<boolean>(false)
  const [updateModal, setUpdateModal] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })
  
  const { updatesByEmployee, loading: updatesLoading, fetchUpdates } = useAllEmployeeUpdates()

  const billableAssignments = useMemo(() => assignments.filter(a => a.project?.name.toLowerCase() !== 'bench' && a.status === 'active' && a.project?.status === 'active' && a.employee?.status === 'Active'), [assignments])
  const benchAssignments = useMemo(() => assignments.filter(a => a.project?.name.toLowerCase() === 'bench' && a.status === 'active' && a.employee?.status === 'Active'), [assignments])

  const filteredAssignments = useMemo(() => {
    const baseAssignments = activeTab === 'billable' ? billableAssignments : benchAssignments
    return baseAssignments.filter(a => {
      if (filterEmployee !== 'all' && a.employee_id !== filterEmployee) return false
      if (filterProject !== 'all' && a.project_id !== filterProject) return false
      if (activeTab === 'bench' && showOnlyFTE && a.employee?.contract_type !== 'FTE') return false
      return true
    })
  }, [activeTab, billableAssignments, benchAssignments, filterEmployee, filterProject, showOnlyFTE])

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'Active')
    const fteCount = activeEmployees.filter(e => e.contract_type === 'FTE').length
    const ctrCount = activeEmployees.filter(e => e.contract_type === 'CTR').length
    
    const benchAssignments = assignments.filter(a => a.project?.name.toLowerCase() === 'bench' && a.status === 'active' && a.employee?.status === 'Active')
    const benchEmployeeIds = new Set(benchAssignments.map(a => a.employee_id))
    
    const benchFteCount = benchAssignments.filter(a => a.employee?.contract_type === 'FTE').length
    const benchCtrCount = benchAssignments.filter(a => a.employee?.contract_type === 'CTR').length
    
    const billableEmployeeIds = new Set(
      assignments
        .filter(a => a.project?.name.toLowerCase() !== 'bench' && a.status === 'active' && a.project?.status === 'active' && a.employee?.status === 'Active')
        .map(a => a.employee_id)
    )
    
    const nonBenchProjects = projects.filter(p => p.name.toLowerCase() !== 'bench' && p.status === 'active')
  
    return {
      totalProjects: nonBenchProjects.length,
      totalEmployees: activeEmployees.length,
      fteCount,
      ctrCount,
      billableEmployees: billableEmployeeIds.size,
      benchEmployees: benchEmployeeIds.size,
      benchFteCount,
      benchCtrCount,
    }
  }, [employees, projects, assignments])

  const sharedProps = {
    groupBy, setGroupBy, filterEmployee, setFilterEmployee, filterProject, setFilterProject,
    viewMode, setViewMode, employees, projects, updatesByEmployee, setUpdateModal,
    activeTab, setActiveTab, showOnlyFTE, setShowOnlyFTE,
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPI Strip - V2 Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</span>
              <div className="p-1.5 rounded-lg bg-[#ea2775]/15 text-[#ea2775]">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#ea2775]">{stats.totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Active projects</p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Employees</span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.totalEmployees}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.fteCount} FTE / {stats.ctrCount} CTR</p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Billable</span>
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-600">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-teal-700">{stats.billableEmployees}</p>
            <p className="text-xs text-muted-foreground mt-1">Allocated to projects</p>
          </div>
          <div
            className="bg-card rounded-xl border border-border shadow-sm p-4 cursor-pointer hover:border-rose-300 hover:shadow-md transition-all"
            onClick={() => setActiveTab('bench')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bench</span>
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-700">{stats.benchEmployees}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.benchFteCount} FTE, {stats.benchCtrCount} CTR</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'billable' | 'bench')}>
            <TabsContent value="billable" className="mt-0">
              {viewMode === 'timeline' ? (
                <TimelineViewV2 assignments={filteredAssignments} onEdit={onEditAssignment} {...sharedProps} />
              ) : (
                <GridViewV2 assignments={filteredAssignments} onEdit={onEditAssignment} {...sharedProps} />
              )}
            </TabsContent>
            <TabsContent value="bench" className="mt-0">
              {viewMode === 'timeline' ? (
                <TimelineViewV2 assignments={filteredAssignments} onEdit={onEditAssignment} {...sharedProps} />
              ) : (
                <GridViewV2 assignments={filteredAssignments} onEdit={onEditAssignment} {...sharedProps} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <EmployeeUpdateModal
        open={updateModal.open}
        onClose={() => setUpdateModal({ open: false, employee: null })}
        employee={updateModal.employee}
        onUpdateAdded={() => { fetchUpdates() }}
      />
    </>
  )
}

interface ViewProps {
  assignments: Assignment[]
  onEdit: (a: Assignment) => void
  groupBy: 'projects' | 'employees'
  setGroupBy: (value: 'projects' | 'employees') => void
  filterEmployee: string
  setFilterEmployee: (value: string) => void
  filterProject: string
  setFilterProject: (value: string) => void
  viewMode: 'timeline' | 'grid'
  setViewMode: (value: 'timeline' | 'grid') => void
  employees: Employee[]
  projects: Project[]
  updatesByEmployee: Map<string, { count: number; lastUpdateAt: string | null }>
  setUpdateModal: React.Dispatch<React.SetStateAction<{ open: boolean; employee: Employee | null }>>
  activeTab: 'billable' | 'bench'
  setActiveTab: (value: 'billable' | 'bench') => void
  showOnlyFTE: boolean
  setShowOnlyFTE: (value: boolean) => void
}

function ToolbarV2({ assignments, groupBy, setGroupBy, filterEmployee, setFilterEmployee, filterProject, setFilterProject, viewMode, setViewMode, employees, projects, activeTab, setActiveTab, showOnlyFTE, setShowOnlyFTE, timeScale, setTimeScale, icon, label, toggleAllProjects, toggleAllEmployees, expandedProjects, expandedEmployees, projectGroupsLength, employeeGroupsLength }: ViewProps & { timeScale: string; setTimeScale: (v: 'days' | 'weeks' | 'months') => void; icon: React.ReactNode; label: string; toggleAllProjects?: () => void; toggleAllEmployees?: () => void; expandedProjects?: Set<string>; expandedEmployees?: Set<string>; projectGroupsLength?: number; employeeGroupsLength?: number }) {
  const isBenchTab = assignments.length > 0 && assignments.every(a => a.project?.name.toLowerCase() === 'bench')
  const benchStats = isBenchTab
    ? {
        fteCount: assignments.filter(a => a.employee?.contract_type === 'FTE').length,
        ctrCount: assignments.filter(a => a.employee?.contract_type === 'CTR').length,
      }
    : { fteCount: 0, ctrCount: 0 }

  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30 flex-wrap">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-foreground">
          {isBenchTab ? `Bench | ${assignments.length} (${benchStats.fteCount} FTE, ${benchStats.ctrCount} CTR)` : label}
        </span>
      </div>
      <div className="h-5 w-px bg-border mx-1" />
      <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'projects' | 'employees')}>
        <SelectTrigger className="h-8 w-[130px] text-xs border-border/60 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="projects">By Projects</SelectItem>
          <SelectItem value="employees">By Employees</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterEmployee} onValueChange={setFilterEmployee}>
        <SelectTrigger className="h-8 w-[140px] text-xs border-border/60 bg-background">
          <SelectValue placeholder="All Employees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Employees</SelectItem>
          {employees.map(emp => (
            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterProject} onValueChange={setFilterProject}>
        <SelectTrigger className="h-8 w-[140px] text-xs border-border/60 bg-background">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map(proj => (
            <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="h-5 w-px bg-border mx-1" />
      <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('timeline')}
          className={`h-7 px-3 text-xs rounded-md ${viewMode === 'timeline' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <GanttChart className="w-3 h-3 mr-1" />
          Timeline
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className={`h-7 px-3 text-xs rounded-md ${viewMode === 'grid' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutGrid className="w-3 h-3 mr-1" />
          Grid
        </Button>
      </div>
      {viewMode === 'grid' && toggleAllProjects && toggleAllEmployees && (
        <>
          <div className="h-5 w-px bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={groupBy === 'projects' ? toggleAllProjects : toggleAllEmployees}
            className="h-7 px-3 text-xs border-border/60"
          >
            {groupBy === 'projects'
              ? ((expandedProjects?.size ?? 0) === (projectGroupsLength ?? 0) ? 'Collapse All' : 'Expand All')
              : ((expandedEmployees?.size ?? 0) === (employeeGroupsLength ?? 0) ? 'Collapse All' : 'Expand All')
            }
          </Button>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'billable' | 'bench')} className="w-auto">
          <TabsList className="h-8 bg-muted">
            <TabsTrigger value="billable" className="h-7 px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Billable Projects</TabsTrigger>
            <TabsTrigger value="bench" className="h-7 px-3 text-xs data-[state=active]:bg-foreground data-[state=active]:text-background">Bench</TabsTrigger>
          </TabsList>
        </Tabs>
        {activeTab === 'bench' && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2 px-2 py-1 bg-background rounded-md border border-border/50">
              <Switch id={`show-only-fte-v2-${viewMode}`} checked={showOnlyFTE} onCheckedChange={setShowOnlyFTE} />
              <Label htmlFor={`show-only-fte-v2-${viewMode}`} className="text-xs font-medium cursor-pointer">Only FTE</Label>
            </div>
          </>
        )}
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
          {(['days', 'weeks', 'months'] as const).map(scale => (
            <Button
              key={scale}
              variant={timeScale === scale ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeScale(scale)}
              className={`h-7 px-3 text-xs font-medium rounded-md capitalize ${timeScale === scale ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {scale}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineViewV2(props: ViewProps) {
  const { assignments, onEdit, groupBy, employees, projects } = props
  const [timeScale, setTimeScale] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const didAutoScrollRef = useRef(false)
  const lastScaleRef = useRef(timeScale)

  const projectGroups = useMemo(() => {
    const groups = new Map<string, { project: Project, assignments: Assignment[] }>()
    assignments.forEach((assignment) => {
      if (!assignment.project) return
      const projectId = assignment.project_id ?? assignment.project.id
      const existing = groups.get(projectId)
      if (existing) { existing.assignments.push(assignment) }
      else { groups.set(projectId, { project: assignment.project, assignments: [assignment] }) }
    })
    return Array.from(groups.values()).sort((a, b) => {
      if (a.project.name === 'Bench') return 1
      if (b.project.name === 'Bench') return -1
      const clientA = a.project.client?.name || ''
      const clientB = b.project.client?.name || ''
      if (clientA !== clientB) return clientA.localeCompare(clientB)
      return a.project.name.localeCompare(b.project.name)
    })
  }, [assignments])

  const employeeGroups = useMemo(() => {
    const groups = new Map<string, { employee: Employee, assignments: Assignment[] }>()
    assignments.forEach((assignment) => {
      if (!assignment.employee) return
      const employeeId = assignment.employee_id ?? assignment.employee.id
      const existing = groups.get(employeeId)
      if (existing) { existing.assignments.push(assignment) }
      else { groups.set(employeeId, { employee: assignment.employee, assignments: [assignment] }) }
    })
    return Array.from(groups.values()).sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name))
  }, [assignments])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneMonthAgo = new Date(today)
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const displayStartDate = oneMonthAgo
  const minDate = new Date(displayStartDate)

  const maxDate = assignments.length > 0
    ? new Date(Math.max(...assignments.map(a => {
        if (a.end_date) return new Date(a.end_date).getTime()
        return new Date(new Date(a.start_date).getFullYear(), 11, 31).getTime()
      })))
    : new Date()
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

  const getTimelineMarkers = () => {
    const markers: { label: string, position: number, isMonthLabel?: boolean, day?: number, weekNum?: number }[] = []
    const current = new Date(minDate)
    if (timeScale === 'days') {
      let lastMonth = ''
      while (current <= maxDate) {
        const dayOffset = Math.ceil((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
        const currentMonth = current.toLocaleDateString('en', { month: 'short', year: 'numeric' })
        if (currentMonth !== lastMonth) {
          markers.push({ label: currentMonth, position: (dayOffset / totalDays) * 100, isMonthLabel: true })
          lastMonth = currentMonth
        }
        markers.push({ label: current.getDate().toString(), position: (dayOffset / totalDays) * 100, day: current.getDate() })
        current.setDate(current.getDate() + 1)
      }
    } else if (timeScale === 'weeks') {
      let lastMonth = ''
      let weekOfMonth = 1
      current.setDate(current.getDate() - current.getDay())
      while (current <= maxDate) {
        const dayOffset = Math.ceil((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
        const currentMonth = current.toLocaleDateString('en', { month: 'short', year: 'numeric' })
        if (currentMonth !== lastMonth) {
          markers.push({ label: currentMonth, position: (dayOffset / totalDays) * 100, isMonthLabel: true })
          lastMonth = currentMonth
          weekOfMonth = 1
        }
        markers.push({ label: `W${weekOfMonth}`, position: (dayOffset / totalDays) * 100, weekNum: weekOfMonth })
        weekOfMonth++
        current.setDate(current.getDate() + 7)
      }
    } else {
      current.setDate(1)
      while (current <= maxDate) {
        const dayOffset = Math.ceil((current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
        markers.push({ label: current.toLocaleDateString('en', { month: 'short', year: 'numeric' }), position: (dayOffset / totalDays) * 100 })
        current.setMonth(current.getMonth() + 1)
      }
    }
    return markers
  }

  const markers = getTimelineMarkers()

  useEffect(() => {
    if (lastScaleRef.current !== timeScale) { didAutoScrollRef.current = false; lastScaleRef.current = timeScale }
    if (didAutoScrollRef.current) return
    const el = scrollContainerRef.current
    if (!el) return
    const displayStartOffsetDays = Math.ceil((displayStartDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    const rawPercent = totalDays > 0 ? displayStartOffsetDays / totalDays : 0
    const scrollPercent = Math.min(1, Math.max(0, rawPercent))
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    el.scrollLeft = maxScrollLeft * scrollPercent
    didAutoScrollRef.current = true
  }, [displayStartDate, minDate, timeScale, totalDays])

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No assignments found</p>
      </div>
    )
  }

  const toggleProject = (projectId: string) => {
    const n = new Set(expandedProjects)
    n.has(projectId) ? n.delete(projectId) : n.add(projectId)
    setExpandedProjects(n)
  }
  const toggleEmployee = (employeeId: string) => {
    const n = new Set(expandedEmployees)
    n.has(employeeId) ? n.delete(employeeId) : n.add(employeeId)
    setExpandedEmployees(n)
  }

  const getBarColor = (assignment: Assignment) => {
    const isBench = assignment.project?.name === 'Bench'
    if (isBench) {
      return assignment.allocation_percentage < 100
        ? 'bg-rose-200 text-rose-800 border-rose-300'
        : 'bg-rose-500 text-white border-rose-600'
    }
    if (assignment.allocation_percentage === 100) return 'bg-emerald-500 text-white border-emerald-600'
    return 'bg-[#ea2775]/100 text-white border-[#ea2775]'
  }

  return (
    <div>
      <ToolbarV2
        {...props}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        icon={<GanttChart className="w-4 h-4 text-muted-foreground" />}
        label="Timeline View"
      />
      <div className="overflow-auto max-h-[calc(100vh-340px)]">
        <div className="flex relative min-w-max">
          {/* Left sidebar */}
          <div className="sticky left-0 z-30 bg-card border-r border-border w-[320px] flex-shrink-0">
            <div className="p-4">
              <div className="h-16 mb-8" />
              <div>
                {groupBy === 'projects' ? (
                  projectGroups.map(({ project, assignments }) => {
                    const isBench = project.name.toLowerCase() === 'bench'
                    const isExpanded = expandedProjects.has(project.id)
                    return (
                      <div key={project.id} className="mb-3">
                        {!isBench && (
                          <div
                            className="h-[76px] px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors border border-border/60 rounded-lg bg-background mb-3"
                            onClick={() => toggleProject(project.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate text-foreground">{project.name} {project.client?.name && <span className="text-muted-foreground font-normal">({project.client.name})</span>}</p>
                                <p className="text-xs text-muted-foreground">{assignments.length} resource{assignments.length !== 1 ? 's' : ''}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {project.start_date && project.end_date
                                    ? `${new Date(project.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                    : project.start_date
                                      ? `From ${new Date(project.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                      : 'No dates set'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {(isBench || isExpanded) && (
                          <div className={!isBench ? 'border border-border/40 rounded-lg bg-muted/20 p-2' : ''}>
                            {assignments.map(assignment => (
                              <div
                                key={assignment.id}
                                className="h-[56px] cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors mb-1"
                                onClick={() => onEdit(assignment)}
                              >
                                <div className="pl-6 flex flex-col justify-center h-full">
                                  <p className="text-xs font-medium truncate text-foreground">
                                    {assignment.employee?.full_name} <span className="text-muted-foreground">({assignment.employee?.contract_type})</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {assignment.project?.name.toLowerCase() === 'bench'
                                      ? (assignment.role_on_project && assignment.role_on_project.toLowerCase() !== 'bench' ? assignment.role_on_project : (assignment.employee?.role_data?.name || assignment.employee?.role || 'Team Member'))
                                      : (assignment.role_on_project || assignment.employee?.role || 'Team Member')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  employeeGroups.map(({ employee, assignments }) => {
                    const isExpanded = expandedEmployees.has(employee.id)
                    return (
                      <div key={employee.id} className="mb-3">
                        <div
                          className="h-[76px] px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors border border-border/60 rounded-lg bg-background mb-3"
                          onClick={() => toggleEmployee(employee.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate text-foreground">{employee.full_name} <span className="text-muted-foreground font-normal">({employee.contract_type})</span></p>
                              <p className="text-xs text-muted-foreground">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <>
                            {assignments.map(assignment => (
                              <div
                                key={assignment.id}
                                className="h-[56px] cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors mb-1"
                                onClick={() => onEdit(assignment)}
                              >
                                <div className="pl-6 flex flex-col justify-center h-full">
                                  <p className="text-xs font-medium truncate text-foreground">
                                    {assignment.project?.name.toLowerCase() === 'bench'
                                      ? (assignment.role_on_project && assignment.role_on_project.toLowerCase() !== 'bench' ? assignment.role_on_project : (employee.role_data?.name || employee.role || 'Team Member'))
                                      : `${assignment.project?.name}${assignment.project?.client?.name ? ` (${assignment.project.client.name})` : ''}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Timeline area */}
          <div ref={scrollContainerRef} className="flex-1">
            <div style={{ minWidth: `${Math.max(1200, markers.filter(m => !m.isMonthLabel).length * (timeScale === 'days' ? 40 : timeScale === 'weeks' ? 60 : 150))}px` }} className="p-4">
              <div className="relative mb-8 h-16 border-b border-border">
                {markers.filter(m => m.isMonthLabel).map((marker, i) => (
                  <div key={`month-${i}`} className="absolute top-0 h-6" style={{ left: `${marker.position}%` }}>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{marker.label}</span>
                  </div>
                ))}
                {markers.filter(m => !m.isMonthLabel).map((marker, i) => (
                  <div key={`day-${i}`} className="absolute top-8 h-8 border-l border-border/40" style={{ left: `${marker.position}%` }}>
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground whitespace-nowrap">{marker.label}</span>
                  </div>
                ))}
              </div>

              <div>
                {groupBy === 'projects' ? (
                  projectGroups.map(({ project, assignments }) => {
                    const isBench = project.name.toLowerCase() === 'bench'
                    const isExpanded = expandedProjects.has(project.id)
                    return (
                      <div key={project.id} className="mb-3">
                        {!isBench && <div className="h-[76px] flex items-center mb-3" />}
                        {(isBench || isExpanded) && (
                          <div className={!isBench ? 'border border-border/40 rounded-lg bg-muted/20 p-2' : ''}>
                            {assignments.map(assignment => {
                              const assignmentStart = new Date(assignment.start_date); assignmentStart.setHours(0, 0, 0, 0)
                              const assignmentEnd = assignment.end_date ? new Date(assignment.end_date) : new Date(assignmentStart); assignmentEnd.setHours(0, 0, 0, 0)
                              const startOffset = Math.max(0, Math.ceil((assignmentStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
                              const duration = assignment.end_date ? Math.max(1, Math.ceil((assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1) : 7
                              const leftPercent = (startOffset / totalDays) * 100
                              const widthPercent = Math.max((duration / totalDays) * 100, 2)
                              return (
                                <div key={assignment.id} className="h-[56px] relative cursor-pointer mb-1" onClick={() => onEdit(assignment)}>
                                  <div className="relative h-full flex items-center">
                                    <div
                                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md px-2 flex items-center gap-2 text-xs font-medium ${getBarColor(assignment)} border shadow-sm`}
                                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '80px' }}
                                    >
                                      <span className="truncate flex-1">
                                        {new Date(assignment.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })} - {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Ongoing'}
                                      </span>
                                      <Badge variant="secondary" className="text-xs h-5 px-1.5 font-medium bg-white/20 text-inherit border-0">{assignment.allocation_percentage}%</Badge>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  employeeGroups.map(({ employee, assignments }) => {
                    const isExpanded = expandedEmployees.has(employee.id)
                    return (
                      <div key={employee.id} className="mb-3">
                        <div className="h-[76px] flex items-center mb-3" />
                        {isExpanded && (
                          <>
                            {assignments.map(assignment => {
                              const assignmentStart = new Date(assignment.start_date); assignmentStart.setHours(0, 0, 0, 0)
                              const assignmentEnd = assignment.end_date ? new Date(assignment.end_date) : new Date(assignmentStart); assignmentEnd.setHours(0, 0, 0, 0)
                              const startOffset = Math.max(0, Math.ceil((assignmentStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
                              const duration = assignment.end_date ? Math.max(1, Math.ceil((assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1) : 7
                              const leftPercent = (startOffset / totalDays) * 100
                              const widthPercent = Math.max((duration / totalDays) * 100, 2)
                              return (
                                <div key={assignment.id} className="h-[56px] relative cursor-pointer mb-1" onClick={() => onEdit(assignment)}>
                                  <div className="relative h-full flex items-center">
                                    <div
                                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md px-2 flex items-center gap-2 text-xs font-medium ${getBarColor(assignment)} border shadow-sm`}
                                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '80px' }}
                                    >
                                      <span className="truncate flex-1">
                                        {new Date(assignment.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })} - {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Ongoing'}
                                      </span>
                                      <Badge variant="secondary" className="text-xs h-5 px-1.5 font-medium bg-white/20 text-inherit border-0">{assignment.allocation_percentage}%</Badge>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GridViewV2(props: ViewProps) {
  const { assignments, onEdit, groupBy, employees, projects, updatesByEmployee, setUpdateModal } = props
  const [timeScale, setTimeScale] = useState<'days' | 'weeks' | 'months'>('days')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const didAutoScrollRef = useRef(false)
  const lastScaleRef = useRef(timeScale)

  const projectGroups = useMemo(() => {
    const groups = new Map<string, { project: Project, assignments: Assignment[] }>()
    assignments.forEach((assignment) => {
      if (!assignment.project) return
      const projectId = assignment.project_id ?? assignment.project.id
      const existing = groups.get(projectId)
      if (existing) { existing.assignments.push(assignment) }
      else { groups.set(projectId, { project: assignment.project, assignments: [assignment] }) }
    })
    return Array.from(groups.values()).sort((a, b) => {
      if (a.project.name === 'Bench') return 1
      if (b.project.name === 'Bench') return -1
      const clientA = a.project.client?.name || ''
      const clientB = b.project.client?.name || ''
      if (clientA !== clientB) return clientA.localeCompare(clientB)
      return a.project.name.localeCompare(b.project.name)
    })
  }, [assignments])

  const employeeGroups = useMemo(() => {
    const groups = new Map<string, { employee: Employee, assignments: Assignment[] }>()
    assignments.forEach((assignment) => {
      if (!assignment.employee) return
      const employeeId = assignment.employee_id ?? assignment.employee.id
      const existing = groups.get(employeeId)
      if (existing) { existing.assignments.push(assignment) }
      else { groups.set(employeeId, { employee: assignment.employee, assignments: [assignment] }) }
    })
    return Array.from(groups.values()).sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name))
  }, [assignments])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneMonthAgo = new Date(today)
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const displayStartDate = oneMonthAgo
  const minDate = new Date(displayStartDate)

  const maxDate = assignments.length > 0
    ? new Date(Math.max(...assignments.map(a => {
        if (a.end_date) return new Date(a.end_date).getTime()
        return new Date(new Date(a.start_date).getFullYear(), 11, 31).getTime()
      })))
    : new Date()
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

  const getTimeColumns = () => {
    const columns: { label: string, date: Date, isWeekend?: boolean, monthLabel?: string, isMonthStart?: boolean, weekNum?: number, yearLabel?: string, isYearStart?: boolean }[] = []
    const current = new Date(minDate)
    if (timeScale === 'days') {
      let lastMonth = ''
      while (current <= maxDate) {
        const dayOfWeek = current.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        if (!isWeekend) {
          const currentMonth = current.toLocaleDateString('en', { month: 'long', year: 'numeric' })
          const isMonthStart = currentMonth !== lastMonth
          columns.push({ label: current.getDate().toString(), date: new Date(current), monthLabel: isMonthStart ? currentMonth : undefined, isMonthStart })
          if (isMonthStart) lastMonth = currentMonth
        }
        current.setDate(current.getDate() + 1)
      }
    } else if (timeScale === 'weeks') {
      let lastMonth = ''
      let weekOfMonth = 1
      current.setDate(current.getDate() - current.getDay())
      while (current <= maxDate) {
        const currentMonth = current.toLocaleDateString('en', { month: 'long', year: 'numeric' })
        const isMonthStart = currentMonth !== lastMonth
        if (isMonthStart) { lastMonth = currentMonth; weekOfMonth = 1 }
        columns.push({ label: `W${weekOfMonth}`, date: new Date(current), monthLabel: isMonthStart ? currentMonth : undefined, isMonthStart, weekNum: weekOfMonth })
        weekOfMonth++
        current.setDate(current.getDate() + 7)
      }
    } else {
      let lastYear = ''
      current.setDate(1)
      while (current <= maxDate) {
        const currentYear = current.getFullYear().toString()
        const isYearStart = currentYear !== lastYear
        columns.push({ label: current.toLocaleDateString('en', { month: 'short' }), date: new Date(current), yearLabel: isYearStart ? currentYear : undefined, isYearStart })
        if (isYearStart) lastYear = currentYear
        current.setMonth(current.getMonth() + 1)
      }
    }
    return columns
  }

  const columns = getTimeColumns()

  useEffect(() => {
    if (lastScaleRef.current !== timeScale) { didAutoScrollRef.current = false; lastScaleRef.current = timeScale }
    if (didAutoScrollRef.current) return
    const el = tableScrollRef.current
    if (!el) return
    const displayIndex = columns.findIndex((col) => {
      const d = new Date(col.date); d.setHours(0, 0, 0, 0)
      return d.getTime() >= displayStartDate.getTime()
    })
    const index = displayIndex === -1 ? 0 : displayIndex
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    const percent = columns.length > 1 ? index / (columns.length - 1) : 0
    el.scrollLeft = maxScrollLeft * percent
    didAutoScrollRef.current = true
  }, [columns, displayStartDate, timeScale])

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No assignments found</p>
      </div>
    )
  }

  const isDateInAssignment = (date: Date, assignment: Assignment) => {
    const start = new Date(assignment.start_date); start.setHours(0, 0, 0, 0)
    const end = assignment.end_date ? new Date(assignment.end_date) : new Date(new Date(assignment.start_date).getFullYear(), 11, 31)
    end.setHours(23, 59, 59, 999)
    if (timeScale === 'days') {
      const checkDate = new Date(date); checkDate.setHours(0, 0, 0, 0)
      return checkDate >= start && checkDate <= end
    } else if (timeScale === 'weeks') {
      const weekEnd = new Date(date); weekEnd.setDate(weekEnd.getDate() + 6)
      return (date <= end && weekEnd >= start)
    } else {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      return (date <= end && monthEnd >= start)
    }
  }

  const toggleProject = (id: string) => { const n = new Set(expandedProjects); n.has(id) ? n.delete(id) : n.add(id); setExpandedProjects(n) }
  const toggleEmployee = (id: string) => { const n = new Set(expandedEmployees); n.has(id) ? n.delete(id) : n.add(id); setExpandedEmployees(n) }
  const toggleAllProjects = () => { expandedProjects.size === projectGroups.length ? setExpandedProjects(new Set()) : setExpandedProjects(new Set(projectGroups.map(g => g.project.id))) }
  const toggleAllEmployees = () => { expandedEmployees.size === employeeGroups.length ? setExpandedEmployees(new Set()) : setExpandedEmployees(new Set(employeeGroups.map(g => g.employee.id))) }

  const getCellColor = (isAllocated: boolean, isBench: boolean, pct: number) => {
    if (!isAllocated) return ''
    if (isBench) return pct < 100 ? 'bg-rose-100 dark:bg-rose-950/40' : 'bg-rose-400 dark:bg-rose-600'
    if (pct === 100) return 'bg-emerald-400 dark:bg-emerald-600'
    return 'bg-[#ea2775] dark:bg-[#ea2775]'
  }

  const getCellTextColor = (isBench: boolean, pct: number) => {
    if (isBench && pct < 100) return 'text-rose-700 dark:text-rose-300'
    return 'text-white'
  }

  const buildGroupHeader = (timeScale: string, columns: { monthLabel?: string; yearLabel?: string }[]) => {
    if (timeScale === 'days' || timeScale === 'weeks') {
      const monthGroups: { month: string, colspan: number }[] = []
      let currentGroup = { month: '', colspan: 0 }
      columns.forEach((col: { monthLabel?: string }) => {
        if (col.monthLabel) {
          if (currentGroup.colspan > 0) monthGroups.push({ ...currentGroup })
          currentGroup = { month: col.monthLabel, colspan: 1 }
        } else { currentGroup.colspan++ }
      })
      if (currentGroup.colspan > 0) monthGroups.push(currentGroup)
      return monthGroups.map((group, i) => (
        <th key={i} colSpan={group.colspan} className="p-2 text-xs font-bold border-b border-r border-border text-center bg-[#ea2775]/10/60 dark:bg-[#ea2775]/10 text-[#ea2775]">{group.month}</th>
      ))
    } else {
      const yearGroups: { year: string, colspan: number }[] = []
      let currentGroup = { year: '', colspan: 0 }
      columns.forEach((col: { yearLabel?: string }) => {
        if (col.yearLabel) {
          if (currentGroup.colspan > 0) yearGroups.push({ ...currentGroup })
          currentGroup = { year: col.yearLabel, colspan: 1 }
        } else { currentGroup.colspan++ }
      })
      if (currentGroup.colspan > 0) yearGroups.push(currentGroup)
      return yearGroups.map((group, i) => (
        <th key={i} colSpan={group.colspan} className="p-2 text-xs font-bold border-b border-r border-border text-center bg-[#ea2775]/10/60 dark:bg-[#ea2775]/10 text-[#ea2775]">{group.year}</th>
      ))
    }
  }

  return (
    <div>
      <ToolbarV2
        {...props}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        icon={<LayoutGrid className="w-4 h-4 text-muted-foreground" />}
        label="Grid View"
        toggleAllProjects={toggleAllProjects}
        toggleAllEmployees={toggleAllEmployees}
        expandedProjects={expandedProjects}
        expandedEmployees={expandedEmployees}
        projectGroupsLength={projectGroups.length}
        employeeGroupsLength={employeeGroups.length}
      />
      <div ref={tableScrollRef} className="overflow-x-auto overflow-y-auto relative max-h-[calc(100vh-340px)]" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'stable' }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30" style={{ position: 'sticky' }}>
            <tr>
              <th className="sticky left-0 p-3 text-left font-semibold border-b border-r border-border min-w-[280px] bg-card z-40" />
              {buildGroupHeader(timeScale, columns)}
            </tr>
            <tr>
              <th className="sticky left-0 p-3 text-left text-xs font-semibold border-b border-r border-border min-w-[310px] bg-card text-foreground z-40">Project / Employee</th>
              {columns.map((col, i) => (
                <th key={i} className={`p-2 text-xs font-medium border-b border-r border-border ${timeScale === 'days' ? 'min-w-[40px]' : 'min-w-[60px]'} text-center text-muted-foreground bg-card`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupBy === 'projects' ? (
              projectGroups.map(({ project, assignments }) => {
                const isBench = project.name.toLowerCase() === 'bench'
                const isExpanded = expandedProjects.has(project.id)
                return (
                  <Fragment key={project.id}>
                    {!isBench && (
                      <tr
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => toggleProject(project.id)}
                      >
                        <td className="sticky left-0 p-3 border-b border-border bg-muted/50 z-20 min-w-[310px]">
                          <div className="flex items-center gap-2">
                            <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </span>
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {project.name} | <span className="text-[#ea2775] font-medium">{project.client?.name || 'No Client'}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">{assignments.length} resource{assignments.length !== 1 ? 's' : ''} | {project.start_date ? new Date(project.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Start Date'} - {project.end_date ? new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</p>
                            </div>
                          </div>
                        </td>
                        {columns.map((_, i) => (
                          <td key={i} className="p-0 border-b border-r border-border bg-muted/50" />
                        ))}
                      </tr>
                    )}
                    {(isBench || isExpanded) && assignments.map(assignment => {
                      const isBenchA = assignment.project?.name === 'Bench'
                      const updateInfo = assignment.employee ? updatesByEmployee.get(assignment.employee.id) : null
                      const hasUpdates = !!updateInfo && updateInfo.count > 0
                      const isRecent = updateInfo?.lastUpdateAt ? ((new Date().getTime() - new Date(updateInfo.lastUpdateAt).getTime()) < 24 * 60 * 60 * 1000) : false
                      return (
                        <tr key={assignment.id} className="hover:bg-muted/30 transition-colors">
                          <td className="sticky left-0 p-3 border-b border-r border-border min-w-[340px] bg-card z-20">
                            <div className="flex items-center gap-2">
                              <div className="w-7 flex-shrink-0 flex items-center justify-center">
                                {hasUpdates && (
                                  <button onClick={(e) => { e.stopPropagation(); setUpdateModal({ open: true, employee: assignment.employee ?? null }) }}>
                                    <MessageSquare className={`w-4 h-4 ${isRecent ? 'text-rose-500 fill-rose-500/20' : 'text-[#ea2775] fill-[#ea2775]/20'}`} />
                                  </button>
                                )}
                              </div>
                              <div className="flex-1">
                                <button onClick={(e) => { e.stopPropagation(); setUpdateModal({ open: true, employee: assignment.employee ?? null }) }} className="text-left w-full hover:underline">
                                  <p className="font-medium text-sm text-foreground">
                                    {assignment.employee?.full_name} <span className="text-muted-foreground">({assignment.employee?.contract_type})</span> <Badge variant="outline" className="text-xs ml-1 border-border">{assignment.allocation_percentage}%</Badge>
                                  </p>
                                </button>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.project?.name.toLowerCase() === 'bench'
                                    ? (assignment.role_on_project && assignment.role_on_project.toLowerCase() !== 'bench' ? assignment.role_on_project : (assignment.employee?.role_data?.name || assignment.employee?.role || 'Team Member'))
                                    : (assignment.role_on_project || assignment.employee?.role_data?.name || assignment.employee?.role || 'Team Member')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(assignment.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })} - {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : `Dec 31, ${new Date(assignment.start_date).getFullYear()}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          {columns.map((col, i) => {
                            const isAllocated = isDateInAssignment(col.date, assignment)
                            return (
                              <td
                                key={i}
                                className={`p-0 border-b border-r border-border cursor-pointer transition-colors ${getCellColor(isAllocated, isBenchA, assignment.allocation_percentage)}`}
                                onClick={(e) => { e.stopPropagation(); onEdit(assignment) }}
                              >
                                <div className="w-full h-full min-h-[80px] flex items-center justify-center">
                                  {isAllocated && (
                                    <span className={`text-xs font-semibold ${getCellTextColor(isBenchA, assignment.allocation_percentage)}`}>
                                      {assignment.allocation_percentage}%
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })
            ) : (
              employeeGroups.map(({ employee, assignments }) => {
                const isExpanded = expandedEmployees.has(employee.id)
                return (
                  <Fragment key={employee.id}>
                    <tr
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggleEmployee(employee.id)}
                    >
                      <td className="sticky left-0 p-3 border-b border-border bg-muted/50 z-20 min-w-[310px]">
                        <div className="flex items-center gap-2">
                          <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </span>
                          {(() => {
                            const updateInfo = updatesByEmployee.get(employee.id)
                            const hasUpdates = !!updateInfo && updateInfo.count > 0
                            const isRecent = updateInfo?.lastUpdateAt ? ((new Date().getTime() - new Date(updateInfo.lastUpdateAt).getTime()) < 24 * 60 * 60 * 1000) : false
                            return hasUpdates ? (
                              <button onClick={(e) => { e.stopPropagation(); setUpdateModal({ open: true, employee }) }} className="flex-shrink-0">
                                <MessageSquare className={`w-4 h-4 ${isRecent ? 'text-rose-500 fill-rose-500/20' : 'text-[#ea2775] fill-[#ea2775]/20'}`} />
                              </button>
                            ) : null
                          })()}
                          <button onClick={(e) => { e.stopPropagation(); setUpdateModal({ open: true, employee }) }} className="text-left flex-1 hover:underline">
                            <p className="font-semibold text-sm text-foreground">{employee.full_name} <span className="text-muted-foreground font-normal">({employee.contract_type})</span></p>
                            <p className="text-xs text-muted-foreground">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
                          </button>
                        </div>
                      </td>
                      {columns.map((_, i) => (
                        <td key={i} className="p-0 border-b border-r border-border bg-muted/50" />
                      ))}
                    </tr>
                    {isExpanded && assignments.map(assignment => {
                      const isBench = assignment.project?.name === 'Bench'
                      return (
                        <tr key={assignment.id} className="hover:bg-muted/30 transition-colors">
                          <td className="sticky left-0 p-3 border-b border-r border-border pl-12 min-w-[310px] bg-card z-20">
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {assignment.project?.name.toLowerCase() === 'bench'
                                  ? (assignment.role_on_project && assignment.role_on_project.toLowerCase() !== 'bench' ? assignment.role_on_project : (employee.role_data?.name || employee.role || 'Team Member'))
                                  : `${assignment.project?.name}${assignment.project?.client?.name ? ` (${assignment.project.client.name})` : ''}`} <Badge variant="outline" className="text-xs ml-1 border-border">{assignment.allocation_percentage}%</Badge>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(assignment.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })} - {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : `Dec 31, ${new Date(assignment.start_date).getFullYear()}`}
                              </p>
                            </div>
                          </td>
                          {columns.map((col, i) => {
                            const isAllocated = isDateInAssignment(col.date, assignment)
                            return (
                              <td
                                key={i}
                                className={`p-0 border-b border-r border-border cursor-pointer transition-colors ${getCellColor(isAllocated, isBench, assignment.allocation_percentage)}`}
                                onClick={(e) => { e.stopPropagation(); onEdit(assignment) }}
                              >
                                <div className="w-full h-full min-h-[80px] flex items-center justify-center">
                                  {isAllocated && (
                                    <span className={`text-xs font-semibold ${getCellTextColor(isBench, assignment.allocation_percentage)}`}>
                                      {assignment.allocation_percentage}%
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

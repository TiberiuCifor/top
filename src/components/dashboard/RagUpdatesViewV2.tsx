'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import type { Project, Client, Employee, ProjectRagStatus } from '@/lib/types'
import {
  Plus, Briefcase, Building2, Calendar, Activity, ArrowUp, ArrowDown,
  Users, ChevronDown, ChevronRight, AlertTriangle, Trophy, MessageSquare,
  Star, ListChecks, ShieldAlert, CheckCircle2, CircleDot, Filter, User
} from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface RagUpdatesViewV2Props {
  projects: Project[]
  clients: Client[]
  employees?: Employee[]
  loading: boolean
  onViewStatus: (project: Project) => void
  initialStatusFilter?: StatusFilter
  onClearInitialFilter?: () => void
  groupByLead?: boolean
  onGroupByLeadChange?: (value: boolean) => void
  expandedLeads?: string[]
  onExpandedLeadsChange?: (leads: string[]) => void
}

const ragColors = {
  R: 'bg-rose-500 hover:bg-rose-600',
  A: 'bg-amber-500 hover:bg-amber-600',
  G: 'bg-emerald-500 hover:bg-emerald-600',
}

const scoreColors = (score: number) => {
  const colors = [
    'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
    'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    'text-lime-600 bg-lime-50 border-lime-200 dark:bg-lime-950/40 dark:text-lime-400 dark:border-lime-800',
    'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  ]
  return colors[score - 1] || 'text-muted-foreground bg-background border-border'
}

function RagStatusHoverContent({ status, projectName }: { status: ProjectRagStatus; projectName: string }) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  return (
    <div className="w-[420px] p-0">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{projectName}</p>
            <p className="text-xs text-muted-foreground">Updated {formatDate(status.created_at)}</p>
          </div>
          <Badge className={`${ragColors[status.rag_score as keyof typeof ragColors]} text-white px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm`}>
            {status.rag_score === 'R' ? 'At Risk' : status.rag_score === 'A' ? 'Attention' : 'On Track'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-4">
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${scoreColors(status.team_score)}`}>
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold">Team: {status.team_score}/5</span>
          </div>
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${scoreColors(status.client_score)}`}>
            <Star className="w-4 h-4" />
            <span className="text-xs font-bold">Client: {status.client_score}/5</span>
          </div>
        </div>

        {status.important_updates && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#ea2775]">
              <MessageSquare className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Updates</Label>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{status.important_updates}</p>
          </div>
        )}

        {status.concerns_risks && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Risks & Blockers</Label>
            </div>
            <p className="text-sm text-rose-700 dark:text-rose-400 line-clamp-2">{status.concerns_risks}</p>
          </div>
        )}

        {status.important_achievements && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Trophy className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Achievements</Label>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{status.important_achievements}</p>
          </div>
        )}

        {status.action_items && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <ListChecks className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Action Items</Label>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{status.action_items}</p>
          </div>
        )}
      </div>
    </div>
  )
}

type StatusFilter = 'all' | 'G' | 'A' | 'R' | 'noStatus'

export function RagUpdatesViewV2({
  projects,
  clients,
  employees = [],
  loading,
  onViewStatus,
  initialStatusFilter,
  onClearInitialFilter,
  groupByLead: propsGroupByLead,
  onGroupByLeadChange,
  expandedLeads: propsExpandedLeads,
  onExpandedLeadsChange
}: RagUpdatesViewV2Props) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter || 'all')

  const [internalGroupByLead, setInternalGroupByLead] = useState(false)
  const [internalExpandedLeads, setInternalExpandedLeads] = useState<Set<string>>(new Set())

  const groupByLead = propsGroupByLead !== undefined ? propsGroupByLead : internalGroupByLead
  const expandedLeads = useMemo(() =>
    propsExpandedLeads !== undefined ? new Set(propsExpandedLeads) : internalExpandedLeads,
    [propsExpandedLeads, internalExpandedLeads]
  )

  const setGroupByLead = (val: boolean) => {
    if (onGroupByLeadChange) onGroupByLeadChange(val)
    else setInternalGroupByLead(val)
  }

  const setExpandedLeads = (val: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (onExpandedLeadsChange) {
      const nextSet = typeof val === 'function' ? val(expandedLeads) : val
      onExpandedLeadsChange(Array.from(nextSet))
    } else {
      setInternalExpandedLeads(typeof val === 'function' ? val : val)
    }
  }

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
    if (onClearInitialFilter) {
      onClearInitialFilter()
    }
  }

  const projectsWithLead = useMemo(() =>
    projects.filter(p => p.project_lead_id && p.status === 'active' && p.name !== 'Bench'),
    [projects]
  )

  const projectLeads = useMemo(() => {
    const leadsMap = new Map<string, { id: string; name: string }>()
    projectsWithLead.forEach(p => {
      if (p.project_lead_id && p.project_lead) {
        leadsMap.set(p.project_lead_id, { id: p.project_lead_id, name: p.project_lead.full_name })
      }
    })
    return Array.from(leadsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [projectsWithLead])

  const filteredProjects = useMemo(() => {
    let filtered = selectedLeadId === 'all' ? projectsWithLead : projectsWithLead.filter(p => p.project_lead_id === selectedLeadId)

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        const rag = p.latest_rag_status?.rag_score
        if (statusFilter === 'noStatus') return !rag
        return rag === statusFilter
      })
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.latest_rag_status?.created_at ? new Date(a.latest_rag_status.created_at).getTime() : 0
      const dateB = b.latest_rag_status?.created_at ? new Date(b.latest_rag_status.created_at).getTime() : 0
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [projectsWithLead, selectedLeadId, sortOrder, statusFilter])

  const projectsByLead = useMemo(() => {
    const grouped = new Map<string, { lead: { id: string; name: string; photo_url?: string | null }; projects: Project[] }>()
    filteredProjects.forEach(p => {
      if (p.project_lead_id && p.project_lead) {
        const existing = grouped.get(p.project_lead_id)
        if (existing) {
          existing.projects.push(p)
        } else {
          grouped.set(p.project_lead_id, {
            lead: { id: p.project_lead_id, name: p.project_lead.full_name, photo_url: p.project_lead.photo_url },
            projects: [p]
          })
        }
      }
    })
    return Array.from(grouped.values()).sort((a, b) => a.lead.name.localeCompare(b.lead.name))
  }, [filteredProjects])

  const toggleLeadExpanded = (leadId: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const expandAll = () => setExpandedLeads(new Set(projectsByLead.map(g => g.lead.id)))
  const collapseAll = () => setExpandedLeads(new Set())

  const ragSummary = useMemo(() => {
    const baseFiltered = selectedLeadId === 'all' ? projectsWithLead : projectsWithLead.filter(p => p.project_lead_id === selectedLeadId)
    const summary = { total: baseFiltered.length, green: 0, amber: 0, red: 0, noStatus: 0 }
    baseFiltered.forEach(p => {
      const rag = p.latest_rag_status?.rag_score
      if (rag === 'G') summary.green++
      else if (rag === 'A') summary.amber++
      else if (rag === 'R') summary.red++
      else summary.noStatus++
    })
    return summary
  }, [projectsWithLead, selectedLeadId])

  const toggleSortOrder = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground">Loading projects...</span>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  const renderProjectRow = (project: Project, compact?: boolean) => (
    <tr
      key={project.id}
      className="group cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors"
      onClick={() => onViewStatus(project)}
    >
      <td className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}>
        <div className="flex items-center gap-2 p-1 rounded-lg transition-all group-hover:bg-muted/60">
          {project.latest_rag_status ? (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className={`px-1.5 py-0.5 rounded border ${scoreColors(project.latest_rag_status.team_score)}`}>
                      {project.latest_rag_status.team_score}
                    </span>
                    <span className="text-muted-foreground/40">-</span>
                    <span className={`px-1.5 py-0.5 rounded border ${scoreColors(project.latest_rag_status.client_score)}`}>
                      {project.latest_rag_status.client_score}
                    </span>
                  </div>
                  <Badge className={`${ragColors[project.latest_rag_status.rag_score as keyof typeof ragColors]} text-white min-w-[28px] h-7 p-0 flex items-center justify-center text-xs font-bold shadow-sm rounded-lg`}>
                    {project.latest_rag_status.rag_score}
                  </Badge>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="p-0 w-auto" align="start">
                <RagStatusHoverContent status={project.latest_rag_status} projectName={project.name} />
              </HoverCardContent>
            </HoverCard>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-[#ea2775] dark:group-hover:text-[#ea2775] transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">Add Status</span>
            </div>
          )}
        </div>
      </td>
      <td className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}>
        <span className="text-xs text-muted-foreground">
          {project.latest_rag_status
            ? formatDate(project.latest_rag_status.created_at)
            : <span className="text-muted-foreground/40 italic">No updates</span>
          }
        </span>
      </td>
      <td className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0">
            <Briefcase className="w-3.5 h-3.5 text-white" />
          </div>
            <p className="text-sm font-semibold text-foreground group-hover:text-[#ea2775] dark:group-hover:text-[#ea2775] transition-colors">
              {project.name}
            </p>
        </div>
      </td>
      <td className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}>
        {project.client ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#ea2775]/10 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-[#ea2775]" />
            </div>
            <span className="text-sm font-medium text-foreground">{project.client.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/40">--</span>
        )}
      </td>
      {!compact && (
        <td className="px-4 py-3">
          {project.project_lead ? (
            <div className="flex items-center gap-2">
              <EmployeeAvatar name={project.project_lead.full_name} photoUrl={project.project_lead.photo_url} size="sm" />
              <span className="text-sm font-medium text-foreground">{project.project_lead.full_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/40">--</span>
          )}
        </td>
      )}
    </tr>
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Projects', value: ragSummary.total, icon: Briefcase, color: 'violet', filterVal: 'all' as StatusFilter },
          { label: 'On Track', value: ragSummary.green, icon: CheckCircle2, color: 'emerald', filterVal: 'G' as StatusFilter },
          { label: 'Attention', value: ragSummary.amber, icon: CircleDot, color: 'amber', filterVal: 'A' as StatusFilter },
          { label: 'At Risk', value: ragSummary.red, icon: ShieldAlert, color: 'rose', filterVal: 'R' as StatusFilter },
          { label: 'No Status', value: ragSummary.noStatus, icon: Activity, color: 'slate', filterVal: 'noStatus' as StatusFilter },
        ].filter(kpi => kpi.filterVal !== 'noStatus' || kpi.value > 0).map((kpi) => {
          const colorMap: Record<string, { bg: string; icon: string; value: string; ring: string; activeBg: string }> = {
            violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-500', value: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500', activeBg: 'bg-violet-100 dark:bg-violet-950/50' },
            emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-500', value: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500', activeBg: 'bg-emerald-100 dark:bg-emerald-950/50' },
            amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-500', value: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-500', activeBg: 'bg-amber-100 dark:bg-amber-950/50' },
            rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', icon: 'text-rose-500', value: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500', activeBg: 'bg-rose-100 dark:bg-rose-950/50' },
            slate: { bg: 'bg-slate-50 dark:bg-slate-950/30', icon: 'text-slate-500', value: 'text-slate-700 dark:text-slate-300', ring: 'ring-slate-500', activeBg: 'bg-slate-100 dark:bg-slate-950/50' },
          }
          const c = colorMap[kpi.color]
          const Icon = kpi.icon
          const isActive = statusFilter === kpi.filterVal
          return (
            <button
              key={kpi.label}
              onClick={() => handleStatusFilterChange(isActive && kpi.filterVal !== 'all' ? 'all' : kpi.filterVal)}
              className={`bg-card rounded-xl border p-4 transition-all hover:shadow-md text-left ${
                isActive ? `border-2 ${c.ring} ring-1 ${c.ring} ${c.activeBg}` : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.icon}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold tracking-tight ${c.value}`}>{kpi.value}</p>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
                if (onGroupByLeadChange) {
                  onGroupByLeadChange(!groupByLead)
                } else {
                  setInternalGroupByLead(!groupByLead)
                  if (!groupByLead) collapseAll()
                }
              }}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              groupByLead
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Group by Lead
          </button>

          {groupByLead && (
            <div className="flex items-center gap-1.5">
              <button onClick={expandAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                Expand All
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                Collapse All
              </button>
            </div>
          )}

          <div className="w-px h-6 bg-border" />

          <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Project Leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Project Leads</SelectItem>
              {projectLeads.map(lead => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => handleStatusFilterChange('all')} className="text-xs h-8">
              Clear filter
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filteredProjects.length}</span> projects
          </span>
        </div>
      </div>

      {/* Content */}
      {filteredProjects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-5">
              <Activity className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {selectedLeadId === 'all'
                ? 'Projects need to have a Project Lead assigned to appear here.'
                : 'No projects found for this Project Lead.'}
            </p>
          </div>
        </div>
      ) : groupByLead ? (
        <div className="space-y-3">
          {projectsByLead.map(group => {
            const isExpanded = expandedLeads.has(group.lead.id)
            const groupRag = { green: 0, amber: 0, red: 0, noStatus: 0 }
            group.projects.forEach(p => {
              const rag = p.latest_rag_status?.rag_score
              if (rag === 'G') groupRag.green++
              else if (rag === 'A') groupRag.amber++
              else if (rag === 'R') groupRag.red++
              else groupRag.noStatus++
            })

            return (
              <Collapsible key={group.lead.id} open={isExpanded} onOpenChange={() => toggleLeadExpanded(group.lead.id)}>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/40 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <EmployeeAvatar name={group.lead.name} photoUrl={group.lead.photo_url} size="md" />
                        <span className="text-sm font-bold text-foreground">{group.lead.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold text-muted-foreground bg-muted rounded-full">
                          {group.projects.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {groupRag.green > 0 && (
                          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{groupRag.green}</span>
                          </div>
                        )}
                        {groupRag.amber > 0 && (
                          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{groupRag.amber}</span>
                          </div>
                        )}
                        {groupRag.red > 0 && (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">{groupRag.red}</span>
                          </div>
                        )}
                        {groupRag.noStatus > 0 && (
                          <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            <span className="text-[11px] font-semibold text-muted-foreground">{groupRag.noStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-t border-b border-border/50 bg-muted/20">
                            <th className="w-[140px] text-left px-3 py-2">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3 h-3" /> RAG Status
                              </span>
                            </th>
                            <th className="w-[140px] text-left px-3 py-2">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> Last Updated
                              </span>
                            </th>
                            <th className="w-[35%] text-left px-3 py-2">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3" /> Project
                              </span>
                            </th>
                            <th className="text-left px-3 py-2">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 className="w-3 h-3" /> Client
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.projects.map(p => renderProjectRow(p, true))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-380px)]">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-20">
                <tr className="border-b border-border">
                  <th className="w-[150px] text-left px-4 py-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> RAG Status
                    </span>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button
                      onClick={toggleSortOrder}
                      className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Last Updated
                      {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Project
                    </span>
                  </th>
                  <th className="text-left px-4 py-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Client
                    </span>
                  </th>
                  <th className="text-left px-4 py-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Project Lead
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(p => renderProjectRow(p))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredProjects.length}</span> of {projectsWithLead.length} projects
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

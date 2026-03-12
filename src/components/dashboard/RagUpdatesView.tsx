'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import type { Project, Client, Employee, ProjectRagStatus } from '@/lib/types'
import { Plus, Briefcase, Building2, Calendar, User, Activity, ArrowUp, ArrowDown, Users, ChevronDown, ChevronRight, MessageSquare, AlertTriangle, Trophy, Star, ListChecks } from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface RagUpdatesViewProps {
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
    'text-rose-600 bg-rose-50 border-rose-100',
    'text-orange-600 bg-orange-50 border-orange-100',
    'text-amber-600 bg-amber-50 border-amber-100',
    'text-lime-600 bg-lime-50 border-lime-100',
    'text-emerald-600 bg-emerald-50 border-emerald-100',
  ]
  return colors[score - 1] || 'text-muted-foreground bg-background border-border'
}

const ragTextColors = {
  R: 'text-rose-700 bg-rose-50 border-rose-100',
  A: 'text-amber-700 bg-amber-50 border-amber-100',
  G: 'text-emerald-700 bg-emerald-50 border-emerald-100',
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
      <div className="p-4 border-b border-border bg-background/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{projectName}</p>
            <p className="text-xs text-muted-foreground">Updated {formatDate(status.created_at)}</p>
          </div>
          <Badge className={`${ragColors[status.rag_score as keyof typeof ragColors]} text-white px-3 py-1.5 text-xs font-bold rounded-lg`}>
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
            <div className="flex items-center gap-1.5 text-primary">
              <MessageSquare className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Updates</Label>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{status.important_updates}</p>
          </div>
        )}

        {status.concerns_risks && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Risks & Blockers</Label>
            </div>
            <p className="text-sm text-rose-700 line-clamp-2">{status.concerns_risks}</p>
          </div>
        )}

        {status.important_achievements && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Trophy className="w-3.5 h-3.5" />
              <Label className="text-[10px] font-bold uppercase tracking-wider">Achievements</Label>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{status.important_achievements}</p>
          </div>
        )}

        {status.action_items && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-600">
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

export function RagUpdatesView({ 
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
}: RagUpdatesViewProps) {
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

  // Handle manual filter change
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
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedLeads(new Set(projectsByLead.map(g => g.lead.id)))
  }

  const collapseAll = () => {
    setExpandedLeads(new Set())
  }

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

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading projects...</div>
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">RAG Updates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage project health status for all projects with assigned leads ({filteredProjects.length} projects)
            </p>
          </div>
          </div>

        <div className="flex flex-wrap items-center gap-3">
            <div 
              className={`flex items-center gap-2 bg-foreground rounded-xl px-4 py-2.5 shadow-md cursor-pointer transition-all hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`}
              onClick={() => handleStatusFilterChange('all')}
            >
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
              <span className="text-2xl font-bold text-white">{ragSummary.total}</span>
            </div>
            
            <div 
              className={`flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl px-4 py-2.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all hover:scale-105 ${statusFilter === 'G' ? 'ring-2 ring-offset-2 ring-emerald-500' : ''}`}
              onClick={() => handleStatusFilterChange(statusFilter === 'G' ? 'all' : 'G')}
            >
              <div className="w-6 h-6 bg-card/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">G</span>
              </div>
              <span className="text-2xl font-bold text-white">{ragSummary.green}</span>
              <span className="text-xs font-medium text-emerald-100">On Track</span>
            </div>

            <div 
              className={`flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl px-4 py-2.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all hover:scale-105 ${statusFilter === 'A' ? 'ring-2 ring-offset-2 ring-amber-500' : ''}`}
              onClick={() => handleStatusFilterChange(statusFilter === 'A' ? 'all' : 'A')}
            >
              <div className="w-6 h-6 bg-card/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="text-2xl font-bold text-white">{ragSummary.amber}</span>
              <span className="text-xs font-medium text-amber-100">Attention</span>
            </div>

            <div 
              className={`flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl px-4 py-2.5 shadow-md shadow-rose-500/20 cursor-pointer transition-all hover:scale-105 ${statusFilter === 'R' ? 'ring-2 ring-offset-2 ring-rose-500' : ''}`}
              onClick={() => handleStatusFilterChange(statusFilter === 'R' ? 'all' : 'R')}
            >
              <div className="w-6 h-6 bg-card/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-2xl font-bold text-white">{ragSummary.red}</span>
              <span className="text-xs font-medium text-rose-100">At Risk</span>
            </div>

            {ragSummary.noStatus > 0 && (
              <div 
                className={`flex items-center gap-2 bg-gradient-to-r from-slate-400 to-slate-500 rounded-xl px-4 py-2.5 shadow-md cursor-pointer transition-all hover:scale-105 ${statusFilter === 'noStatus' ? 'ring-2 ring-offset-2 ring-slate-500' : ''}`}
                onClick={() => handleStatusFilterChange(statusFilter === 'noStatus' ? 'all' : 'noStatus')}
              >
                <div className="w-6 h-6 bg-card/20 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">-</span>
                </div>
                <span className="text-2xl font-bold text-white">{ragSummary.noStatus}</span>
                <span className="text-xs font-medium text-muted-foreground">No Status</span>
              </div>
            )}
          </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant={groupByLead ? "default" : "outline"}
              size="sm"
              onClick={() => {
                  setGroupByLead(!groupByLead)
                  if (!groupByLead) collapseAll()
                }}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Grouped by Project Lead
            </Button>
            {groupByLead && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            )}
            <div className="w-[200px]">
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="bg-card border-border shadow-sm focus:ring-primary/20 h-9">
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
          </div>
            {statusFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => handleStatusFilterChange('all')}>
                Clear filter
              </Button>
            )}
        </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedLeadId === 'all' 
                ? 'Projects need to have a Project Lead assigned to appear here'
                : 'No projects found for this Project Lead'}
            </p>
          </CardContent>
        </Card>
      ) : groupByLead ? (
          <div className="space-y-3">
            {projectsByLead.map(group => {
              const isExpanded = expandedLeads.has(group.lead.id)
              const groupRagSummary = { green: 0, amber: 0, red: 0, noStatus: 0 }
              group.projects.forEach(p => {
                const rag = p.latest_rag_status?.rag_score
                if (rag === 'G') groupRagSummary.green++
                else if (rag === 'A') groupRagSummary.amber++
                else if (rag === 'R') groupRagSummary.red++
                else groupRagSummary.noStatus++
              })
              
              return (
                <Collapsible key={group.lead.id} open={isExpanded} onOpenChange={() => toggleLeadExpanded(group.lead.id)}>
                  <Card className="border border-border rounded-xl shadow-sm overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between py-2 px-3 bg-background hover:bg-muted cursor-pointer transition-colors">
                          <div className="flex items-center gap-2.5">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                              <EmployeeAvatar name={group.lead.name} photoUrl={group.lead.photo_url} size="sm" shape="circle" />
                            <span className="text-sm font-semibold text-foreground">{group.lead.name}</span>
                            <span className="text-xs text-muted-foreground">({group.projects.length})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {groupRagSummary.green > 0 && (
                              <div className="flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[11px] font-semibold text-emerald-700">{groupRagSummary.green}</span>
                              </div>
                            )}
                            {groupRagSummary.amber > 0 && (
                              <div className="flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                <span className="text-[11px] font-semibold text-amber-700">{groupRagSummary.amber}</span>
                              </div>
                            )}
                            {groupRagSummary.red > 0 && (
                              <div className="flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                <span className="text-[11px] font-semibold text-rose-700">{groupRagSummary.red}</span>
                              </div>
                            )}
                            {groupRagSummary.noStatus > 0 && (
                              <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                                <span className="text-[11px] font-semibold text-muted-foreground">{groupRagSummary.noStatus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                          <Table className="table-fixed w-full">
                            <TableHeader className="bg-background/50">
                              <TableRow className="hover:bg-transparent border-border h-8">
                                <TableHead className="w-[140px] font-bold uppercase tracking-widest text-[10px] text-muted-foreground h-8 py-0">
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-3 h-3" />
                                    RAG Status
                                  </div>
                                </TableHead>
                                <TableHead className="w-[140px] font-bold uppercase tracking-widest text-[10px] text-muted-foreground h-8 py-0">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Last Updated
                                  </div>
                                </TableHead>
                                <TableHead className="w-[35%] font-bold uppercase tracking-widest text-[10px] text-muted-foreground h-8 py-0">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="w-3 h-3" />
                                    Project
                                  </div>
                                </TableHead>
                                <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground h-8 py-0">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3" />
                                    Client
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                          <TableBody>
                            {group.projects.map(project => (
                              <TableRow 
                                key={project.id} 
                                className="group cursor-pointer hover:bg-background/50 transition-colors border-border"
                                onClick={() => onViewStatus(project)}
                              >
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-2 p-1 rounded-lg transition-all group-hover:bg-muted">
                                    {project.latest_rag_status ? (
                                      <HoverCard openDelay={200} closeDelay={100}>
                                        <HoverCardTrigger asChild>
                                          <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1 text-xs font-bold">
                                              <span className={`px-1 py-0.5 rounded border ${scoreColors(project.latest_rag_status.team_score)}`}>
                                                {project.latest_rag_status.team_score}
                                              </span>
                                              <span className="text-muted-foreground/50">-</span>
                                              <span className={`px-1 py-0.5 rounded border ${scoreColors(project.latest_rag_status.client_score)}`}>
                                                {project.latest_rag_status.client_score}
                                              </span>
                                            </div>
                                            <Badge className={`${ragColors[project.latest_rag_status.rag_score as keyof typeof ragColors]} text-white min-w-[24px] h-6 p-0 flex items-center justify-center text-[10px] font-bold shadow-sm rounded-lg`}>
                                              {project.latest_rag_status.rag_score}
                                            </Badge>
                                          </div>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="p-0 w-auto" align="start">
                                          <RagStatusHoverContent status={project.latest_rag_status} projectName={project.name} />
                                        </HoverCardContent>
                                      </HoverCard>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">Add Status</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <span className="text-xs text-muted-foreground">
                                    {project.latest_rag_status 
                                      ? formatDate(project.latest_rag_status.created_at)
                                      : <span className="text-muted-foreground italic">No updates</span>
                                    }
                                  </span>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {project.name}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  {project.client ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                                        <Building2 className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                      <span className="text-sm font-medium text-foreground">{project.client.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        ) : (
        <Card className="border border-border rounded-xl shadow-sm overflow-hidden">
          <Table>
<TableHeader className="bg-background/80">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[140px] font-bold uppercase tracking-widest text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" />
                      RAG Status
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={toggleSortOrder}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Last Updated
                      {sortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      Project
                    </div>
                  </TableHead>
                  <TableHead className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" />
                      Client
                    </div>
                  </TableHead>
                  <TableHead className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Project Lead
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
<TableBody>
                  {filteredProjects.map(project => (
                    <TableRow 
                      key={project.id} 
                      className="group cursor-pointer hover:bg-background/50 transition-colors border-border"
                      onClick={() => onViewStatus(project)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 p-1.5 rounded-lg transition-all group-hover:bg-muted">
                          {project.latest_rag_status ? (
                            <HoverCard openDelay={200} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1 text-sm font-bold">
                                    <span className={`px-1.5 py-0.5 rounded border ${scoreColors(project.latest_rag_status.team_score)}`}>
                                      {project.latest_rag_status.team_score}
                                    </span>
                                    <span className="text-muted-foreground/50">-</span>
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
                            <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                              <Plus className="w-4 h-4" />
                              <span className="text-sm font-medium">Add Status</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {project.latest_rag_status 
                          ? formatDate(project.latest_rag_status.created_at)
                          : <span className="text-muted-foreground italic">No updates</span>
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.client ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-foreground">{project.client.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.project_lead ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="font-medium text-foreground">{project.project_lead.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

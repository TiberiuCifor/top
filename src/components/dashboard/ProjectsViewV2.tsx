'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Project, Client } from '@/lib/types'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Briefcase, Calendar,
  Building2, Info, FileCheck, FileText, ArrowUpDown, Grid3X3, List,
  CheckCircle2, Clock, PauseCircle, Users, UserCheck, SquareCode, Timer,
} from 'lucide-react'

interface ProjectsViewV2Props {
  projects: Project[]
  clients: Client[]
  loading: boolean
  readonly?: boolean
  onAdd: () => void
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewStatus: (project: Project) => void
}

type ViewMode = 'table' | 'grid'
type SortKey = 'name' | 'client' | 'status' | 'start_date'
type StatusFilter = 'all' | 'active' | 'planning' | 'on_hold' | 'completed' | 'cancelled'

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  planning: { label: 'Planning', dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400' },
  active: { label: 'Active', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  on_hold: { label: 'On Hold', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' },
  completed: { label: 'Completed', dot: 'bg-[#ea2775]/100', bg: 'bg-[#ea2775]/10', text: 'text-[#ea2775]' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400' },
}

export function ProjectsViewV2({ projects, clients, loading, readonly = false, onAdd, onEdit, onDelete, onViewStatus }: ProjectsViewV2Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [leadFilter, setLeadFilter] = useState<string>('all')

  const stats = useMemo(() => {
    const nonBench = projects.filter(p => p.name !== 'Bench')
    const active = nonBench.filter(p => p.status === 'active').length
    const planning = nonBench.filter(p => p.status === 'planning').length
    const onHold = nonBench.filter(p => p.status === 'on_hold').length
    const withLead = nonBench.filter(p => !!p.project_lead_id).length
    return { total: nonBench.length, active, planning, onHold, withLead }
  }, [projects])

  const filtered = useMemo(() => {
    let list = projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.client?.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      const matchesClient = clientFilter === 'all' || p.client_id === clientFilter
      const matchesLead = leadFilter === 'all' ||
        (leadFilter === 'yes' ? !!p.project_lead_id : !p.project_lead_id)
      return matchesSearch && matchesStatus && matchesClient && matchesLead
    })

    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'client') cmp = (a.client?.name || '').localeCompare(b.client?.name || '')
      else if (sortKey === 'status') cmp = (a.status || '').localeCompare(b.status || '')
      else if (sortKey === 'start_date') cmp = (a.start_date || '').localeCompare(b.start_date || '')
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [projects, search, statusFilter, clientFilter, leadFilter, sortKey, sortAsc])

  const regularProjects = filtered.filter(p => p.name !== 'Bench')
  const benchProjects = filtered.filter(p => p.name === 'Bench')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading projects...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Projects" value={stats.total} icon={<Briefcase className="w-5 h-5" />} accent="violet" />
        <KpiCard label="Active" value={stats.active} icon={<CheckCircle2 className="w-5 h-5" />} accent="emerald" />
        <KpiCard label="Planning" value={stats.planning} icon={<Clock className="w-5 h-5" />} accent="amber" />
        <KpiCard label="On Hold" value={stats.onHold} icon={<PauseCircle className="w-5 h-5" />} accent="rose" />
        <KpiCard label="With Lead" value={stats.withLead} icon={<UserCheck className="w-5 h-5" />} accent="blue" />
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, client, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-[#ea2775]/40 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter pills */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
              {(['all', 'active', 'planning', 'on_hold'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === s
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Client filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-1 focus:ring-[#ea2775]/40"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Lead filter */}
            <select
              value={leadFilter}
              onChange={(e) => setLeadFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-1 focus:ring-[#ea2775]/40"
            >
              <option value="all">Lead: All</option>
              <option value="yes">Has Lead</option>
              <option value="no">No Lead</option>
            </select>

            <div className="w-px h-6 bg-border" />

            {/* View mode toggle */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'table' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {!readonly && (
              <>
                <div className="w-px h-6 bg-border" />
                <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Project
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-4">
              <Briefcase className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">
              {search || statusFilter !== 'all' || clientFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first project'}
            </p>
            {!search && statusFilter === 'all' && clientFilter === 'all' && !readonly && (
              <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Project
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <>
          {regularProjects.length > 0 && (
            <ProjectSection
              title={`Projects (${regularProjects.length})`}
              projects={regularProjects}
              sortKey={sortKey}
              sortAsc={sortAsc}
              toggleSort={toggleSort}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewStatus={onViewStatus}
              onViewHours={(p) => router.push(`/projects/${p.id}/logged-hours`)}
              readonly={readonly}
            />
          )}
          {benchProjects.length > 0 && (
            <ProjectSection
              title={`Bench (${benchProjects.length})`}
              projects={benchProjects}
              sortKey={sortKey}
              sortAsc={sortAsc}
              toggleSort={toggleSort}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewStatus={onViewStatus}
              onViewHours={(p) => router.push(`/projects/${p.id}/logged-hours`)}
              readonly={readonly}
              muted
            />
          )}
        </>
      ) : (
        <>
          {regularProjects.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects ({regularProjects.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {regularProjects.map(project => (
                  <ProjectCard key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} onViewStatus={onViewStatus} readonly={readonly} />
                ))}
              </div>
            </div>
          )}
          {benchProjects.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bench ({benchProjects.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {benchProjects.map(project => (
                  <ProjectCard key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} onViewStatus={onViewStatus} readonly={readonly} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProjectSection({ title, projects, sortKey, sortAsc, toggleSort, onEdit, onDelete, onViewStatus, onViewHours, readonly, muted }: {
  title: string
  projects: Project[]
  sortKey: SortKey
  sortAsc: boolean
  toggleSort: (key: SortKey) => void
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewStatus: (project: Project) => void
  onViewHours: (project: Project) => void
  readonly?: boolean
  muted?: boolean
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className={`bg-card rounded-xl border border-border shadow-sm overflow-hidden ${muted ? 'opacity-75' : ''}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-[44px] px-3 py-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SOW</span>
              </th>
              <th className="w-[44px] px-3 py-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JIRA</span>
              </th>
              <th className="w-[44px] px-3 py-3 text-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</span>
              </th>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  Project
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort('client')} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  Client
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort('start_date')} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  Timeline
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stakeholder(s)</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Lead</span>
              </th>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  Status
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {!readonly && <th className="w-[50px] px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map(project => (
              <ProjectRow key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} onViewStatus={onViewStatus} onViewHours={onViewHours} readonly={readonly} />
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

function ProjectRow({ project, onEdit, onDelete, onViewStatus, onViewHours, readonly }: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewStatus: (project: Project) => void
  onViewHours: (project: Project) => void
  readonly?: boolean
}) {
  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="px-3 py-3.5 text-center">
        {project.sow_signed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={project.sow_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => !project.sow_url && e.preventDefault()}
                >
                  <FileCheck className="w-4.5 h-4.5 text-emerald-500 mx-auto cursor-pointer" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                {project.sow_url ? 'SOW Signed - Click to view' : 'SOW Signed'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <FileText className="w-4.5 h-4.5 text-muted-foreground/40 mx-auto" />
        )}
      </td>
      <td className="px-3 py-3.5 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {project.jira_project_key ? (
                <a
                  href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://tecknoworks.atlassian.net'}/jira/software/c/projects/${project.jira_project_key}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SquareCode className="w-4.5 h-4.5 text-emerald-500 mx-auto cursor-pointer hover:text-emerald-400 transition-colors" />
                </a>
              ) : (
                <SquareCode className="w-4.5 h-4.5 text-muted-foreground/30 mx-auto" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {project.jira_project_key
                ? `JIRA: ${project.jira_project_key} — Click to open`
                : 'No JIRA project linked'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
      <td className="px-3 py-3.5 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => project.jira_project_key && onViewHours(project)}
                className={project.jira_project_key ? 'cursor-pointer' : 'cursor-default'}
                disabled={!project.jira_project_key}
              >
                <Timer className={`w-4.5 h-4.5 mx-auto ${project.jira_project_key ? 'text-emerald-500 hover:text-emerald-400 transition-colors' : 'text-muted-foreground/30'}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {project.jira_project_key ? 'View logged hours' : 'No JIRA project linked'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={`font-semibold text-foreground truncate ${!readonly ? 'cursor-pointer hover:text-[#ea2775] transition-colors' : ''}`}
                onClick={() => !readonly && onEdit(project)}
              >
                {project.name}
              </p>
              {project.important_updates && project.important_updates.trim() !== '' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Info className="w-4 h-4 text-[#ea2775] cursor-help shrink-0" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px] p-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs border-b border-background/20 pb-1">Important Updates</p>
                        <p className="whitespace-pre-wrap">{project.important_updates}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        {project.client ? (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">{project.client.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
            {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString()}`}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground truncate max-w-[150px]" title={
          project.project_stakeholders?.length
            ? project.project_stakeholders.map(s => s.name).join(', ')
            : project.stakeholders || ''
        }>
          {project.project_stakeholders?.length
            ? project.project_stakeholders.map(s => s.name).join(', ')
            : project.stakeholders || <span className="text-muted-foreground/50">—</span>}
        </p>
      </td>
      <td className="px-4 py-3.5">
        {project.project_lead ? (
          <span className={`text-sm font-medium ${project.project_lead.status === 'Inactive' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {project.project_lead.full_name}
            {project.project_lead.status === 'Inactive' && ' (Inactive)'}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={project.status} />
      </td>
      {!readonly && (
        <td className="px-4 py-3.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(project)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(project.id)} className="text-destructive gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  )
}

function ProjectCard({ project, onEdit, onDelete, onViewStatus, readonly }: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewStatus: (project: Project) => void
  readonly?: boolean
}) {
  return (
    <div className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0">
            <Briefcase className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`font-semibold text-foreground leading-tight truncate ${!readonly ? 'cursor-pointer hover:text-[#ea2775] transition-colors' : ''}`}
                onClick={() => !readonly && onEdit(project)}
              >
                {project.name}
              </h3>
              {project.important_updates && project.important_updates.trim() !== '' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Info className="w-3.5 h-3.5 text-[#ea2775] cursor-help shrink-0" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] p-3">
                      <p className="whitespace-pre-wrap text-sm">{project.important_updates}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
        {!readonly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(project)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(project.id)} className="text-destructive gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {project.client && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{project.client.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
            {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString()}`}
          </span>
        </div>
        {project.project_lead && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className={project.project_lead.status === 'Inactive' ? 'line-through' : ''}>
              {project.project_lead.full_name}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <StatusBadge status={project.status} />
        <div className="flex items-center gap-2">
          {project.sow_signed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                </TooltipTrigger>
                <TooltipContent>SOW Signed</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FileText className="w-4 h-4 text-muted-foreground/40" />
                </TooltipTrigger>
                <TooltipContent>SOW Not Signed</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {project.jira_project_key ? (
                  <a
                    href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://tecknoworks.atlassian.net'}/jira/software/c/projects/${project.jira_project_key}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SquareCode className="w-4 h-4 text-emerald-500 cursor-pointer hover:text-emerald-400 transition-colors" />
                  </a>
                ) : (
                  <SquareCode className="w-4 h-4 text-muted-foreground/30" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {project.jira_project_key
                  ? `JIRA: ${project.jira_project_key} — Click to open`
                  : 'No JIRA project linked'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {project.project_stakeholders && project.project_stakeholders.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {project.project_stakeholders.length} stakeholder{project.project_stakeholders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, accent }: {
  label: string
  value: number
  icon: React.ReactNode
  accent: 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'
}) {
  const accentMap = {
    violet: { iconBg: 'bg-violet-100 dark:bg-violet-950/40', iconColor: 'text-violet-600 dark:text-violet-400', valueTxt: 'text-violet-700 dark:text-violet-300' },
    emerald: { iconBg: 'bg-emerald-100 dark:bg-emerald-950/40', iconColor: 'text-emerald-600 dark:text-emerald-400', valueTxt: 'text-emerald-700 dark:text-emerald-300' },
    amber: { iconBg: 'bg-amber-100 dark:bg-amber-950/40', iconColor: 'text-amber-600 dark:text-amber-400', valueTxt: 'text-amber-700 dark:text-amber-300' },
    rose: { iconBg: 'bg-rose-100 dark:bg-rose-950/40', iconColor: 'text-rose-600 dark:text-rose-400', valueTxt: 'text-rose-700 dark:text-rose-300' },
    blue: { iconBg: 'bg-[#ea2775]/15 dark:bg-[#ea2775]/10', iconColor: 'text-[#ea2775]', valueTxt: 'text-[#ea2775]' },
  }
  const a = accentMap[accent]

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${a.iconBg} ${a.iconColor}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${a.valueTxt}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  const cfg = statusConfig[status || 'planning'] || statusConfig.planning
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search, SquareCode, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { Client, Project } from '@/lib/types'

type WorkloadFilterOption = {
  value: string
  label: string
}

interface WorkloadViewProps {
  projects: Project[]
  clients: Client[]
  loading: boolean
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  planning: { label: 'Planning', dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400' },
  active: { label: 'Active', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  on_hold: { label: 'On Hold', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' },
  completed: { label: 'Completed', dot: 'bg-[#ea2775]', bg: 'bg-[#ea2775]/10', text: 'text-[#ea2775]' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400' },
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

function WorkloadCombobox({
  allLabel,
  value,
  onChange,
  options,
}: {
  allLabel: string
  value: string
  onChange: (val: string) => void
  options: WorkloadFilterOption[]
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-[220px] justify-between border-border bg-muted/40 text-xs font-medium"
        >
          <span className="truncate">{selected?.label ?? allLabel}</span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${allLabel.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={allLabel}
                onSelect={() => {
                  onChange('all')
                  setOpen(false)
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === 'all' ? 'opacity-100' : 'opacity-0')} />
                {allLabel}
              </CommandItem>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string) {
  const [year, mon] = monthKey.split('-').map(Number)
  return new Date(year, mon - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

export function WorkloadView({ projects, clients, loading }: WorkloadViewProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [leadFilter, setLeadFilter] = useState('all')

  const [selectedMonth, setSelectedMonth] = useState<string>(() => toMonthKey(new Date()))
  const [hoursByProject, setHoursByProject] = useState<Record<string, number>>({})
  const [hoursLoading, setHoursLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const fetchMonthlySummary = useCallback(async (month: string) => {
    setHoursLoading(true)
    setHoursByProject({})
    try {
      const res = await fetch(`/api/tempo/monthly-summary?month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setHoursByProject(data.hoursByProject || {})
        setLastSync(new Date())
      }
    } finally {
      setHoursLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMonthlySummary(selectedMonth)
  }, [selectedMonth, fetchMonthlySummary])

  const prevMonth = () => {
    const [year, mon] = selectedMonth.split('-').map(Number)
    const d = new Date(year, mon - 2, 1)
    setSelectedMonth(toMonthKey(d))
  }

  const nextMonth = () => {
    const [year, mon] = selectedMonth.split('-').map(Number)
    const d = new Date(year, mon, 1)
    const now = new Date()
    if (d <= now) setSelectedMonth(toMonthKey(d))
  }

  const isCurrentMonth = selectedMonth === toMonthKey(new Date())

  const clientOptions = useMemo<WorkloadFilterOption[]>(() => {
    return clients
      .map(client => ({ value: client.id, label: client.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [clients])

  const leadOptions = useMemo<WorkloadFilterOption[]>(() => {
    const byId = new Map<string, string>()
    for (const project of projects) {
      if (project.project_lead_id && project.project_lead?.full_name) {
        byId.set(project.project_lead_id, project.project_lead.full_name)
      }
    }
    return Array.from(byId.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [projects])

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return projects
      .filter(project => project.status?.toLowerCase() === 'active')
      .filter(project => project.name.trim().toLowerCase() !== 'bench')
      .filter(project => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          project.name.toLowerCase().includes(normalizedSearch) ||
          project.client?.name?.toLowerCase().includes(normalizedSearch) ||
          project.jira_project_key?.toLowerCase().includes(normalizedSearch)
        const matchesClient = clientFilter === 'all' || project.client_id === clientFilter
        const matchesLead = leadFilter === 'all' || project.project_lead_id === leadFilter
        return matchesSearch && matchesClient && matchesLead
      })
  }, [projects, search, clientFilter, leadFilter])

  const navigateToHours = (project: Project) => {
    if (!project.jira_project_key) return
    router.push(`/projects/${project.id}/logged-hours`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading workload...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by project, client, or JIRA key..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-[#ea2775]/40 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <WorkloadCombobox
              allLabel="All Clients"
              value={clientFilter}
              onChange={setClientFilter}
              options={clientOptions}
            />
            <WorkloadCombobox
              allLabel="All Project Leads"
              value={leadFilter}
              onChange={setLeadFilter}
              options={leadOptions}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-muted-foreground">
          Displaying {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
              {formatMonthLabel(selectedMonth)}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isCurrentMonth
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => fetchMonthlySummary(selectedMonth)}
              disabled={hoursLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${hoursLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {lastSync && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums whitespace-nowrap">
                Last sync {lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-muted/30 mb-4">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Try adjusting search or filters.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-[64px] px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jira</span>
                </th>
                <th className="w-[64px] px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project</span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Lead</span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                </th>
                  <th className="text-right px-4 py-3 w-[100px]">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {formatMonthLabel(selectedMonth).split(' ')[0]} Hours
                    </span>
                  </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
                {filteredProjects.map((project, idx) => {
                  const key = project.jira_project_key
                  const hrs = key ? hoursByProject[key] : undefined

                  return (
                    <tr key={project.id} className={cn('transition-colors hover:bg-[#ea2775]/5', idx % 2 === 0 ? 'bg-card' : 'bg-muted/10')}>
                    <td className="px-3 py-3.5 text-center">
                      {project.jira_project_key ? (
                        <a
                          href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://tecknoworks.atlassian.net'}/jira/software/c/projects/${project.jira_project_key}/issues`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <SquareCode className="w-4.5 h-4.5 text-emerald-500 mx-auto cursor-pointer hover:text-emerald-400 transition-colors" />
                        </a>
                      ) : (
                        <SquareCode className="w-4.5 h-4.5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button
                        onClick={() => navigateToHours(project)}
                        className={project.jira_project_key ? 'cursor-pointer' : 'cursor-default'}
                        disabled={!project.jira_project_key}
                      >
                        <Timer className={`w-4.5 h-4.5 mx-auto ${project.jira_project_key ? 'text-emerald-500 hover:text-emerald-400 transition-colors' : 'text-muted-foreground/30'}`} />
                      </button>
                    </td>
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <button
                          onClick={() => navigateToHours(project)}
                          disabled={!project.jira_project_key}
                          className={cn(
                            'text-sm font-medium text-left w-full truncate block',
                            project.jira_project_key
                              ? 'text-foreground/90 hover:text-[#ea2775] transition-colors cursor-pointer'
                              : 'text-muted-foreground cursor-default'
                          )}
                        >
                          {project.name}
                        </button>
                      </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-muted-foreground">{project.client?.name || '—'}</span>
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
                      <td className="px-4 py-3.5 text-right">
                        {hoursLoading ? (
                          <span className="inline-block w-12 h-4 bg-muted/60 rounded animate-pulse" />
                        ) : hrs !== undefined ? (
                          <span className="text-sm font-semibold text-[#ea2775] tabular-nums">
                            {Math.round(hrs)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/40">—</span>
                        )}
                      </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

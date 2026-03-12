'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Client, Project } from '@/lib/types'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Building2,
  Mail, Phone, Factory, CheckCircle2, XCircle, Briefcase,
  ArrowUpDown, LayoutGrid, LayoutList, ArrowUp, ArrowDown,
  ExternalLink,
} from 'lucide-react'

interface ClientsViewV2Props {
  clients: Client[]
  projects: Project[]
  loading: boolean
  onAdd: () => void
  onEdit: (client: Client) => void
  onDelete: (id: string) => void
}

type ViewMode = 'table' | 'grid'
type SortKey = 'name' | 'industry' | 'status' | 'projects'
type StatusFilter = 'all' | 'active' | 'inactive'

export function ClientsViewV2({ clients, projects, loading, onAdd, onEdit, onDelete }: ClientsViewV2Props) {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const projectCountMap = useMemo(() => {
    const map = new Map<string, number>()
    projects.filter(p => p.status === 'active' && p.client_id).forEach(p => {
      map.set(p.client_id!, (map.get(p.client_id!) || 0) + 1)
    })
    return map
  }, [projects])

  const stats = useMemo(() => {
    const active = clients.filter(c => c.status === 'active').length
    const inactive = clients.filter(c => c.status !== 'active').length
    const withProjects = clients.filter(c => (projectCountMap.get(c.id) || 0) > 0).length
    return { total: clients.length, active, inactive, withProjects }
  }, [clients, projectCountMap])

  const filtered = useMemo(() => {
    let list = clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_email?.toLowerCase().includes(search.toLowerCase())
    )
    if (statusFilter !== 'all') {
      list = list.filter(c => statusFilter === 'active' ? c.status === 'active' : c.status !== 'active')
    }
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'industry') cmp = (a.industry || '').localeCompare(b.industry || '')
      else if (sortKey === 'status') cmp = (a.status || '').localeCompare(b.status || '')
      else if (sortKey === 'projects') cmp = (projectCountMap.get(a.id) || 0) - (projectCountMap.get(b.id) || 0)
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [clients, search, statusFilter, sortKey, sortAsc, projectCountMap])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground">Loading clients...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats.total, icon: Building2, color: 'violet', onClick: () => setStatusFilter('all') },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'emerald', onClick: () => setStatusFilter('active') },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'rose', onClick: () => setStatusFilter('inactive') },
          { label: 'With Projects', value: stats.withProjects, icon: Briefcase, color: 'blue', onClick: undefined },
        ].map((kpi) => {
          const colorMap: Record<string, { bg: string; icon: string; value: string; ring: string }> = {
            violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-500', value: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500/20' },
            emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-500', value: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/20' },
            rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', icon: 'text-rose-500', value: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500/20' },
            blue: { bg: 'bg-[#ea2775]/10', icon: 'text-[#ea2775]', value: 'text-[#ea2775]', ring: 'ring-[#ea2775]/20' },
          }
          const c = colorMap[kpi.color]
          const Icon = kpi.icon
          return (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className={`text-left bg-card rounded-xl border border-border p-4 transition-all hover:shadow-md ${kpi.onClick ? 'cursor-pointer hover:ring-2 ' + c.ring : 'cursor-default'}`}
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
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card border-border rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status pills */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                  statusFilter === s
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* View toggle */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-border" />

          <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm h-8">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-5">
              <Building2 className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No clients found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by adding your first client.'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Client
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                      Client <SortIcon column="name" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('industry')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                      Industry <SortIcon column="industry" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</span>
                  </th>
                  <th className="text-center px-5 py-3">
                    <button onClick={() => toggleSort('projects')} className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mx-auto">
                      Projects <SortIcon column="projects" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                      Status <SortIcon column="status" />
                    </button>
                  </th>
                  <th className="w-[52px] px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, index) => {
                  const projCount = projectCountMap.get(client.id) || 0
                  return (
                    <tr
                      key={client.id}
                      className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0">
                            <span className="text-white text-xs font-bold leading-none">
                              {client.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => onEdit(client)}
                              className="font-semibold text-sm text-foreground hover:text-[#ea2775] dark:hover:text-[#ea2775] transition-colors truncate block"
                            >
                              {client.name}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {client.industry ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Factory className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                            {client.industry}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/40">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {client.contact_email && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                              <span className="truncate max-w-[180px]">{client.contact_email}</span>
                            </span>
                          )}
                          {client.contact_phone && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                              {client.contact_phone}
                            </span>
                          )}
                          {!client.contact_email && !client.contact_phone && (
                            <span className="text-sm text-muted-foreground/40">--</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {projCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-[#ea2775]/10 text-[#ea2775] dark:bg-[#ea2775]/10 dark:text-[#ea2775]">
                            {projCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-3 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => onEdit(client)} className="gap-2 text-xs">
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-destructive gap-2 text-xs">
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of {clients.length} clients
            </span>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((client) => {
              const projCount = projectCountMap.get(client.id) || 0
              return (
                <motion.div
                  key={client.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="group bg-card rounded-xl border border-border hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all relative overflow-hidden"
                >
                  {/* Top accent */}
                  <div className={`h-1 w-full ${client.status === 'active' ? 'bg-gradient-to-r from-[#ea2775] to-[#c01560]' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0">
                          <span className="text-white text-sm font-bold leading-none">
                            {client.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                            {client.name}
                          </h3>
                          {client.industry && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                              <Factory className="w-3 h-3 shrink-0" />
                              {client.industry}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1 -mt-1">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => onEdit(client)} className="gap-2 text-xs">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-destructive gap-2 text-xs">
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {client.contact_email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{client.contact_email}</span>
                        </div>
                      )}
                      {client.contact_phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                          <span>{client.contact_phone}</span>
                        </div>
                      )}
                      {!client.contact_email && !client.contact_phone && (
                        <div className="text-xs text-muted-foreground/40 italic">No contact info</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/60">
                      <StatusBadge status={client.status} />
                      <div className="flex items-center gap-1.5">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          projCount > 0 ? 'bg-[#ea2775]/10 text-[#ea2775] dark:bg-[#ea2775]/10 dark:text-[#ea2775]' : 'text-muted-foreground/50'
                        }`}>
                          <Briefcase className="w-3 h-3" />
                          {projCount} project{projCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  const isActive = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full transition-colors ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

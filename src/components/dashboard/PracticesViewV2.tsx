'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Employee, Practice, Assignment, Squad } from '@/lib/types'
import {
  Search, Filter, Users, Settings2, Briefcase, Plus, Pencil, Trash2,
  ChevronsUpDown, ChevronsDownUp, LayoutGrid, Layers, UserCheck, Shield, ChevronRight
} from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface PracticesViewV2Props {
  employees: Employee[]
  practices: Practice[]
  squads: Squad[]
  assignments: Assignment[]
  loading: boolean
  onAdd: () => void
  onEdit: (practice: Practice) => void
  onDelete: (id: string) => void
  onAddSquad: (practiceId: string) => void
  onEditSquad: (squad: Squad) => void
  onDeleteSquad: (id: string) => void
}

const practiceColors = [
  { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800/50', icon: 'bg-gradient-to-br from-violet-500 to-violet-600', dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', light: 'bg-violet-500/10' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', light: 'bg-emerald-500/10' },
  { bg: 'bg-[#ea2775]/10', border: 'border-[#ea2775]/30 dark:border-[#ea2775]/30/50', icon: 'bg-gradient-to-br from-[#ea2775] to-[#c01560]', dot: 'bg-[#ea2775]/100', text: 'text-[#ea2775]', badge: 'bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775]', light: 'bg-[#ea2775]/100/10' },
  { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/50', icon: 'bg-gradient-to-br from-rose-500 to-rose-600', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', light: 'bg-rose-500/10' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/50', icon: 'bg-gradient-to-br from-amber-500 to-amber-600', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', light: 'bg-amber-500/10' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800/50', icon: 'bg-gradient-to-br from-cyan-500 to-cyan-600', dot: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-400', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', light: 'bg-cyan-500/10' },
]

export function PracticesViewV2({
  employees,
  practices,
  squads,
  assignments,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onAddSquad,
  onEditSquad,
  onDeleteSquad
}: PracticesViewV2Props) {
  const [search, setSearch] = useState('')
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>('all')
  const [showBenchOnly, setShowBenchOnly] = useState(false)
  const [showOnlyFTE, setShowOnlyFTE] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [groupBySquads, setGroupBySquads] = useState(false)

  const toggleAll = () => {
    if (expandedItems.length > 0) {
      setExpandedItems([])
    } else {
      setExpandedItems(groupedByPractice.map(([gid]) => gid))
    }
  }

  const employeeProjectsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    assignments.forEach((assignment) => {
      if (!assignment.employee_id || !assignment.project?.name) return
      if (assignment.status !== 'active') return
      const existing = map.get(assignment.employee_id) || []
      if (!existing.includes(assignment.project.name)) {
        map.set(assignment.employee_id, [...existing, assignment.project.name])
      }
    })
    return map
  }, [assignments])

  const employeeAllocationMap = useMemo(() => {
    const map = new Map<string, number>()
    assignments.forEach((assignment) => {
      if (!assignment.employee_id || assignment.status !== 'active') return
      const current = map.get(assignment.employee_id) || 0
      map.set(assignment.employee_id, current + assignment.allocation_percentage)
    })
    return map
  }, [assignments])

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const roleName = e.role_data?.name || e.role || ''
      const projects = (employeeProjectsMap.get(e.id) || [])
      const projectsString = projects.join(' ').toLowerCase()

      const matchesSearch = (
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        roleName.toLowerCase().includes(search.toLowerCase()) ||
        projectsString.includes(search.toLowerCase())
      )

      const matchesPractice = selectedPracticeId === 'all' || e.practice_id === selectedPracticeId
      const matchesBench = !showBenchOnly || projects.some(p => p.toLowerCase() === 'bench')
      const matchesFTE = !showOnlyFTE || e.contract_type === 'FTE'
      const matchesActive = e.status === 'Active'

      return matchesSearch && matchesPractice && matchesBench && matchesFTE && matchesActive
    })
  }, [employees, search, selectedPracticeId, showBenchOnly, showOnlyFTE, employeeProjectsMap])

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'Active')
    const benchEmployees = activeEmployees.filter(e => {
      const projects = employeeProjectsMap.get(e.id) || []
      return projects.some(p => p.toLowerCase() === 'bench')
    })

    const practiceStats = practices.map((p, i) => ({
      id: p.id,
      name: p.name,
      count: activeEmployees.filter(e => e.practice_id === p.id).length,
      color: practiceColors[i % practiceColors.length]
    }))

    return {
      total: activeEmployees.length,
      fte: activeEmployees.filter(e => e.contract_type === 'FTE').length,
      ctr: activeEmployees.filter(e => e.contract_type === 'CTR').length,
      benchSize: benchEmployees.length,
      practices: practiceStats
    }
  }, [employees, practices, employeeProjectsMap])

  const groupedByPractice = useMemo(() => {
    const groups: Record<string, { practice: Practice | null; employees: Employee[] }> = {}
    practices.forEach(p => {
      groups[p.id] = { practice: p, employees: [] }
    })
    groups['unassigned'] = { practice: null, employees: [] }

    filteredEmployees.forEach(e => {
      const gid = e.practice_id || 'unassigned'
      if (groups[gid]) {
        groups[gid].employees.push(e)
      } else if (gid === 'unassigned') {
        groups['unassigned'].employees.push(e)
      }
    })

    return Object.entries(groups)
      .filter(([_, data]) => data.employees.length > 0 || (selectedPracticeId === 'all' && data.practice !== null))
      .sort(([_, a], [__, b]) => (a.practice?.name || 'Z').localeCompare(b.practice?.name || 'Z'))
  }, [filteredEmployees, practices, selectedPracticeId])

  const getPracticeColor = (practiceId: string | null) => {
    if (!practiceId) return practiceColors[practiceColors.length - 1]
    const idx = practices.findIndex(p => p.id === practiceId)
    return practiceColors[idx >= 0 ? idx % practiceColors.length : 0]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground">Loading practices...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.practices.map(p => {
          const isSelected = selectedPracticeId === p.id
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPracticeId(isSelected ? 'all' : p.id)}
              className={`relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-200 ${
                isSelected
                  ? `${p.color.bg} ${p.color.border} ring-2 ring-offset-1 ring-${p.color.dot.replace('bg-', '')}/40`
                  : 'bg-card border-border hover:border-border/80 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? p.color.text : 'text-muted-foreground'}`}>
                    {p.name}
                  </p>
                  <h3 className="text-3xl font-bold mt-1.5 tabular-nums">{p.count}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">team members</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${p.color.icon} flex items-center justify-center shadow-lg`}>
                  <Layers className="w-6 h-6 text-white" />
                </div>
              </div>
              {isSelected && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${p.color.icon}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Stats Bar + Manage Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm bg-card px-5 py-2.5 rounded-xl border border-border/60 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-violet-500" />
            <span className="font-semibold text-foreground">{stats.total}</span>
            <span className="text-muted-foreground">Total</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{stats.fte}</span>
            <span className="text-muted-foreground">FTE</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ea2775]/100" />
            <span className="font-semibold text-[#ea2775] tabular-nums">{stats.ctr}</span>
            <span className="text-muted-foreground">CTR</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{stats.benchSize}</span>
            <span className="text-muted-foreground">Bench</span>
          </div>
        </div>

        <Button
          variant={showManagement ? "default" : "outline"}
          size="sm"
          onClick={() => setShowManagement(!showManagement)}
          className={showManagement
            ? 'bg-gradient-to-r from-[#ea2775] to-[#c01560] hover:from-[#d01e65] hover:to-[#a8114e] text-white border-0 shadow-md'
            : 'hover:border-violet-300 hover:text-violet-700 dark:hover:text-violet-400'
          }
        >
          <Settings2 className="w-4 h-4 mr-2" />
          {showManagement ? 'Hide Management' : 'Manage Practices'}
        </Button>
      </div>

      {/* Management Panel */}
      {showManagement && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-b from-violet-50/50 to-transparent dark:from-violet-950/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-600 via-[#c01560] to-[#ea2775]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Settings2 className="w-4 h-4 text-white" />
                </div>
                Practice Management
              </h3>
              <Button
                size="sm"
                onClick={onAdd}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Practice
              </Button>
            </div>
          </div>
          <div className="p-4">
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Practice Name</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Headcount</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Lead</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Squads</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {practices.map((practice, pi) => {
                    const count = employees.filter(e => e.practice_id === practice.id && e.status === 'Active').length
                    const lead = employees.find(e => e.practice_id === practice.id && e.practice_role === 'Lead')
                    const practiceSquads = squads.filter(s => s.practice_id === practice.id)
                    const color = practiceColors[pi % practiceColors.length]

                    return (
                      <React.Fragment key={practice.id}>
                        <TableRow className={`${color.bg} border-b border-border/30 hover:opacity-90 transition-opacity`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${color.icon} flex items-center justify-center shadow-sm`}>
                                <Layers className="w-4.5 h-4.5 text-white" />
                              </div>
                              <span className="font-bold text-base">{practice.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${color.badge}`}>
                              <Users className="w-3 h-3" />
                              {count}
                            </span>
                          </TableCell>
                            <TableCell>
                              {lead ? (
                                <div className="flex items-center gap-2">
                                  <EmployeeAvatar name={lead.full_name} photoUrl={lead.photo_url} size="sm" />
                                  <span className="text-sm font-semibold">{lead.full_name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground/60 italic">No Lead assigned</span>
                              )}
                            </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-muted-foreground">{practiceSquads.length} squads</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border-border/50"
                                onClick={() => onAddSquad(practice.id)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Squad
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/60 dark:hover:bg-white/10" onClick={() => onEdit(practice)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-100/60 dark:hover:bg-rose-900/30" onClick={() => onDelete(practice.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {practiceSquads.map((squad) => (
                          <TableRow key={squad.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="pl-14">
                              <div className="flex items-center gap-2 text-sm">
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                                <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                                <span className="font-medium">{squad.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground">
                                {employees.filter(e => e.squad_id === squad.id && e.status === 'Active').length} members
                              </span>
                            </TableCell>
                            <TableCell>
                              {squad.squad_lead_id ? (
                                  <div className="flex items-center gap-2">
                                    <EmployeeAvatar name={employees.find(e => e.id === squad.squad_lead_id)?.full_name ?? ''} photoUrl={employees.find(e => e.id === squad.squad_lead_id)?.photo_url} size="xs" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {employees.find(e => e.id === squad.squad_lead_id)?.full_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50 italic">No Squad Lead</span>
                                )}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => onEditSquad(squad)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-100/60 dark:hover:bg-rose-900/30" onClick={() => onDeleteSquad(squad.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees, roles, projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/30 border-border/50 focus:bg-background focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="w-48">
            <Select value={selectedPracticeId} onValueChange={setSelectedPracticeId}>
              <SelectTrigger className="h-9 bg-muted/30 border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Filter by Practice" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Practices</SelectItem>
                {practices.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectItem value="unassigned">No Practice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 border-l border-border pl-4">
            <button
              onClick={() => setGroupBySquads(!groupBySquads)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                groupBySquads
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Squads View
            </button>
            <button
              onClick={() => setShowBenchOnly(!showBenchOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showBenchOnly
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Bench
            </button>
            <button
              onClick={() => setShowOnlyFTE(!showOnlyFTE)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showOnlyFTE
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              FTE Only
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
          >
            {expandedItems.length > 0 ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5" />
                Collapse
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5" />
                Expand
              </>
            )}
          </button>
          <div className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/30 rounded-lg border border-border/50">
            <span className="font-bold text-foreground tabular-nums">{filteredEmployees.length}</span>
            <span className="ml-1">of {employees.filter(e => e.status === 'Active').length}</span>
          </div>
        </div>
      </div>

      {/* Accordion View */}
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={setExpandedItems}
        className="space-y-3"
      >
        {groupedByPractice.map(([gid, data]) => {
          const practiceSquads = squads.filter(s => s.practice_id === gid)
          const unassignedEmployees = data.employees.filter(e => {
            const isUnassigned = !e.squad_id
            const isLead = e.practice_role === 'Lead' || e.practice_role === 'Squad Lead' || squads.some(s => s.squad_lead_id === e.id)
            return isUnassigned && !isLead
          })
          const color = getPracticeColor(data.practice?.id || null)

          return (
            <AccordionItem key={gid} value={gid} className="border rounded-xl px-0 overflow-hidden bg-card shadow-sm border-border/60">
              <AccordionTrigger className="px-6 py-4 hover:bg-muted/20 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${data.practice ? color.icon : 'bg-gradient-to-br from-gray-400 to-gray-500'} flex items-center justify-center shadow-sm`}>
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-base font-bold">{data.practice?.name || 'No Practice Assigned'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${data.practice ? color.badge : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <Users className="w-2.5 h-2.5" />
                        {data.employees.length} employees
                      </span>
                      {practiceSquads.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                          {practiceSquads.length} squads
                        </span>
                      )}
                    </div>
                  </div>
                  {data.employees.find(e => e.practice_role === 'Lead') && (
                      <div className="flex items-center gap-2 ml-4 px-3 py-1.5 bg-card border border-border/60 rounded-lg shadow-sm">
                        <EmployeeAvatar name={data.employees.find(e => e.practice_role === 'Lead')?.full_name ?? ''} photoUrl={data.employees.find(e => e.practice_role === 'Lead')?.photo_url} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Lead</span>
                          <span className="text-xs font-bold">{data.employees.find(e => e.practice_role === 'Lead')?.full_name}</span>
                        </div>
                      </div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0">
                {groupBySquads ? (
                  <div className="p-6">
                    {practiceSquads.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {practiceSquads.map(squad => {
                          const members = data.employees.filter(e => e.squad_id === squad.id && e.id !== squad.squad_lead_id && e.practice_role !== 'Squad Lead')
                          const lead = data.employees.find(e => e.id === squad.squad_lead_id || (e.squad_id === squad.id && e.practice_role === 'Squad Lead'))

                          return (
                            <div key={squad.id} className="flex flex-col rounded-xl border border-border/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-card">
                              {/* Squad Header */}
                              <div className={`px-4 py-3 border-b border-border/40 ${color.bg}`}>
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-sm truncate">{squad.name}</h4>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${color.badge}`}>
                                    {data.employees.filter(e => e.squad_id === squad.id).length}
                                  </span>
                                </div>
                              </div>

                              {/* Squad Lead Section */}
                              <div className="p-4 border-b border-border/30 bg-muted/20">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-2.5 block">Squad Lead</span>
                                  {lead ? (
                                    <div className="flex items-center gap-3 group">
                                      <div className="relative">
                                        <EmployeeAvatar name={lead.full_name} photoUrl={lead.photo_url} size="lg" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-card rounded-full" />
                                      </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-sm leading-tight truncate">{lead.full_name}</span>
                                      <span className={`text-[10px] font-semibold mt-0.5 uppercase tracking-wide ${color.text}`}>Squad Lead</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 opacity-50">
                                    <div className="w-11 h-11 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center">
                                      <Users className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs italic font-medium text-muted-foreground">No Lead assigned</span>
                                  </div>
                                )}
                              </div>

                              {/* Members List */}
                              <div className="p-4 space-y-2.5 flex-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] block">Team Members</span>
                                {members.length > 0 ? (
                                  <div className="space-y-2">
                                      {members.map(member => (
                                        <div key={member.id} className="flex items-center gap-2.5 group/member">
                                          <EmployeeAvatar name={member.full_name} photoUrl={member.photo_url} size="md" />
                                          <div className="flex flex-col min-w-0">
                                          <span className="font-semibold text-sm leading-none truncate group-hover/member:text-violet-700 dark:group-hover/member:text-violet-400 transition-colors">{member.full_name}</span>
                                          <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                            {member.role_data?.name || member.role || 'Member'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <p className="text-[10px] text-muted-foreground italic">No additional members</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {unassignedEmployees.length > 0 && (
                      <div className={practiceSquads.length > 0 ? "mt-10 border-t border-border/50 pt-8" : ""}>
                        <div className="flex items-center justify-between mb-5">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="w-8 h-px bg-border" />
                            Employees without Squads
                            <div className="w-8 h-px bg-border" />
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground border border-border/50">
                            {unassignedEmployees.length} Unassigned
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {unassignedEmployees.map(e => (
                              <div key={e.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all group">
                                <EmployeeAvatar name={e.full_name} photoUrl={e.photo_url} size="md" />
                                <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold truncate">{e.full_name}</span>
                                <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {e.role_data?.name || e.role || 'Member'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {practiceSquads.length === 0 && unassignedEmployees.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                          <Users className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">No squads or employees in this practice.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/20">
                          <th className="pl-6 pr-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employee</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Practice Role</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contract</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Allocation</th>
                          <th className="pr-6 pl-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.employees.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                  <Users className="w-5 h-5 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm text-muted-foreground">No employees found in this practice.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          data.employees.map(employee => {
                            const roleName = employee.role_data?.name || employee.role || '-'
                            const projects = employeeProjectsMap.get(employee.id) || []
                            const totalAllocation = employeeAllocationMap.get(employee.id) || 0

                            const allocColor = totalAllocation > 100 ? 'rose' : totalAllocation === 100 ? 'emerald' : 'amber'
                            const allocBarColor = totalAllocation > 100 ? 'bg-rose-500' : totalAllocation === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                            const allocTextColor = totalAllocation > 100 ? 'text-rose-700 dark:text-rose-400' : totalAllocation === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'

                            return (
                              <tr key={employee.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                                  <td className="pl-6 pr-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <EmployeeAvatar name={employee.full_name} photoUrl={employee.photo_url} size="md" />
                                      <span className="font-semibold text-sm">{employee.full_name}</span>
                                    </div>
                                  </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Briefcase className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                                    <span className="truncate">{roleName}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {employee.practice_role === 'Lead' ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${color.badge}`}>
                                      <Shield className="w-3 h-3" />
                                      Lead
                                    </span>
                                  ) : employee.practice_role === 'Squad Lead' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775]">
                                      <UserCheck className="w-3 h-3" />
                                      Squad Lead
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted text-muted-foreground">
                                      {employee.practice_role || 'Member'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                    employee.contract_type === 'FTE'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-[#ea2775]/10 text-[#ea2775] dark:bg-[#ea2775]/10 dark:text-[#ea2775]'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${employee.contract_type === 'FTE' ? 'bg-emerald-500' : 'bg-[#ea2775]/100'}`} />
                                    {employee.contract_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${allocBarColor} rounded-full transition-all`}
                                        style={{ width: `${Math.min(totalAllocation, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-bold tabular-nums ${allocTextColor}`}>{totalAllocation}%</span>
                                  </div>
                                </td>
                                <td className="pr-6 pl-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {projects.length > 0 ? projects.map(p => (
                                      <span key={p} className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                        p.toLowerCase() === 'bench'
                                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                          : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'
                                      }`}>
                                        {p}
                                      </span>
                                    )) : <span className="text-muted-foreground/50 text-xs italic">Unassigned</span>}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card rounded-xl border border-border/60 shadow-sm">
        <span className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground tabular-nums">{filteredEmployees.length}</span> of{' '}
          <span className="font-semibold tabular-nums">{employees.filter(e => e.status === 'Active').length}</span> active employees across{' '}
          <span className="font-semibold tabular-nums">{practices.length}</span> practices
        </span>
        <div className="flex items-center gap-2">
          {practices.map((p, i) => {
            const c = practiceColors[i % practiceColors.length]
            const count = employees.filter(e => e.practice_id === p.id && e.status === 'Active').length
            return (
              <span key={p.id} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {p.name}: {count}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Employee, Role, Assignment, Project, AssignmentInput } from '@/lib/types'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, User, Briefcase, ExternalLink,
  Filter, Layers, ChevronDown, ChevronRight, FolderKanban, MessageSquare,
  CalendarPlus, History, Users, UserCheck, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Star,
  CalendarDays, Clock,
} from 'lucide-react'
import { SkillsModal } from '@/components/modals/SkillsModal'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'
import { useAllEmployeeUpdates } from '@/hooks/useEmployeeUpdates'
import { EmployeeUpdateModal } from '@/components/modals/EmployeeUpdateModal'
import { AssignmentModal } from '@/components/modals/AssignmentModal'
import { ProjectHistoryModal } from '@/components/modals/ProjectHistoryModal'

interface EmployeesViewV2Props {
  employees: Employee[]
  roles: Role[]
  assignments: Assignment[]
  projects: Project[]
  loading: boolean
  rolesLoading: boolean
  onAdd: () => void
  onEdit: (employee: Employee) => void
  onDelete: (id: string) => void
  onAddRole: () => void
  onEditRole: (role: Role) => void
  onDeleteRole: (id: string) => void
  onSaveAssignment: (data: AssignmentInput, assignmentId?: string) => Promise<void>
  onDeleteAssignment?: (id: string) => void
  initialGroupBy?: GroupingMode
  initialExpandedGroup?: string
  initialShowBenchOnly?: boolean
  onClearInitialFilter?: () => void
}

type GroupingMode = 'none' | 'allocation' | 'projects' | 'practice'
type SortKey = 'name' | 'role' | 'contract' | 'allocation'

export function EmployeesViewV2({
  employees,
  roles,
  assignments,
  projects,
  loading,
  rolesLoading,
  onAdd,
  onEdit,
  onDelete,
  onAddRole,
  onEditRole,
  onDeleteRole,
  onSaveAssignment,
  onDeleteAssignment,
  initialGroupBy,
  initialExpandedGroup,
  initialShowBenchOnly,
  onClearInitialFilter
}: EmployeesViewV2Props) {
  const [search, setSearch] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<GroupingMode>('none')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [showMultiProjectOnly, setShowMultiProjectOnly] = useState(false)
  const [showBenchOnly, setShowBenchOnly] = useState(false)
  const [showOnlyFTE, setShowOnlyFTE] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    if (initialGroupBy || initialShowBenchOnly) {
      if (initialGroupBy) {
        setGroupBy(initialGroupBy)
        if (initialExpandedGroup) {
          setExpandedGroups(new Set([initialExpandedGroup]))
        }
      }
      if (initialShowBenchOnly) {
        setShowBenchOnly(true)
      }
      onClearInitialFilter?.()
    }
  }, [initialGroupBy, initialExpandedGroup, initialShowBenchOnly, onClearInitialFilter])

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [updateModal, setUpdateModal] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; employeeId: string | null; assignment: Assignment | null }>({ open: false, employeeId: null, assignment: null })
  const [historyModal, setHistoryModal] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })
  const [skillsModal, setSkillsModal] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })

  const { updatesByEmployee, fetchUpdates } = useAllEmployeeUpdates()

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const employeeProjectsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    assignments.forEach((assignment) => {
      if (!assignment.employee_id || !assignment.project?.name || assignment.status !== 'active') return
      const existing = map.get(assignment.employee_id) || []
      if (!existing.includes(assignment.project.name)) {
        map.set(assignment.employee_id, [...existing, assignment.project.name])
      }
    })
    return map
  }, [assignments])

  const employeeAllocationMap = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const map = new Map<string, number>()
    assignments.forEach((assignment) => {
      if (!assignment.employee_id || assignment.status !== 'active') return
      if (assignment.project?.name?.toLowerCase() === 'bench') return
      const start = new Date(assignment.start_date)
      start.setHours(0, 0, 0, 0)
      if (start > today) return  // not started yet
      if (assignment.end_date) {
        const end = new Date(assignment.end_date)
        end.setHours(23, 59, 59, 999)
        if (end < today) return  // already ended
      }
      const current = map.get(assignment.employee_id) || 0
      map.set(assignment.employee_id, current + assignment.allocation_percentage)
    })
    return map
  }, [assignments])

  const stats = useMemo(() => {
    const activeEmps = employees.filter(e => e.status === 'Active')
    const benchEmployees = activeEmps.filter(e => {
      const p = employeeProjectsMap.get(e.id) || []
      return p.some(pr => pr.toLowerCase() === 'bench')
    })

    return {
      total: activeEmps.length,
      fte: activeEmps.filter(e => e.contract_type === 'FTE').length,
      ctr: activeEmps.filter(e => e.contract_type === 'CTR').length,
      benchSize: benchEmployees.length
    }
  }, [employees, employeeProjectsMap])

  const filteredEmployees = useMemo(() => {
    let list = employees.filter(e => {
      const roleName = e.role_data?.name || e.role || ''
      const prjs = (employeeProjectsMap.get(e.id) || [])
      const projectsString = prjs.join(' ').toLowerCase()

      const matchesSearch = (
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        roleName.toLowerCase().includes(search.toLowerCase()) ||
        e.contract_type.toLowerCase().includes(search.toLowerCase()) ||
        projectsString.includes(search.toLowerCase())
      )

      const matchesRole = selectedRoleId === 'all' || e.role_id === selectedRoleId
      const matchesMultiProject = !showMultiProjectOnly || prjs.length >= 2
      const matchesBench = !showBenchOnly || prjs.some(p => p.toLowerCase() === 'bench')
      const matchesFTE = !showOnlyFTE || e.contract_type === 'FTE'
      const matchesStatus = showActiveOnly ? e.status === 'Active' : e.status === 'Inactive'

      return matchesSearch && matchesRole && matchesMultiProject && matchesBench && matchesFTE && matchesStatus
    })

    if (groupBy === 'none') {
      list.sort((a, b) => {
        let cmp = 0
        if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name)
        else if (sortKey === 'role') cmp = (a.role_data?.name || a.role || '').localeCompare(b.role_data?.name || b.role || '')
        else if (sortKey === 'contract') cmp = a.contract_type.localeCompare(b.contract_type)
        else if (sortKey === 'allocation') cmp = (employeeAllocationMap.get(a.id) || 0) - (employeeAllocationMap.get(b.id) || 0)
        return sortAsc ? cmp : -cmp
      })
    }

    return list
  }, [employees, search, selectedRoleId, showMultiProjectOnly, showBenchOnly, showOnlyFTE, showActiveOnly, employeeProjectsMap, employeeAllocationMap, groupBy, sortKey, sortAsc])

  const groupedEmployees = useMemo(() => {
    if (groupBy === 'none') return null

    if (groupBy === 'allocation') {
      const groups = {
        'Above 100%': [] as Employee[],
        '100%': [] as Employee[],
        'Below 100%': [] as Employee[]
      }
      filteredEmployees.forEach(e => {
        const allocation = employeeAllocationMap.get(e.id) || 0
        if (allocation > 100) groups['Above 100%'].push(e)
        else if (allocation === 100) groups['100%'].push(e)
        else groups['Below 100%'].push(e)
      })
      return Object.entries(groups).map(([label, emps]) => ({
        id: label,
        label,
        employees: emps,
        color: label === 'Above 100%' ? 'rose' : label === '100%' ? 'emerald' : 'amber',
      })).filter(g => g.employees.length > 0)
    }

    if (groupBy === 'projects') {
      const map = new Map<string, Employee[]>()
      const unassigned: Employee[] = []
      filteredEmployees.forEach(e => {
        const prjs = employeeProjectsMap.get(e.id) || []
        if (prjs.length === 0) {
          unassigned.push(e)
        } else {
          prjs.forEach(projectName => {
            const existing = map.get(projectName) || []
            if (!existing.find(emp => emp.id === e.id)) {
              map.set(projectName, [...existing, e])
            }
          })
        }
      })
      const sortedEntries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
      const benchIndex = sortedEntries.findIndex(([name]) => name.toLowerCase() === 'bench')
      if (benchIndex > -1) {
        const benchGroup = sortedEntries.splice(benchIndex, 1)[0]
        sortedEntries.unshift(benchGroup)
      }
      const result = sortedEntries.map(([projectName, emps]) => {
        const isBench = projectName.toLowerCase() === 'bench'
        return {
          id: `project-${projectName}`,
          label: projectName,
          employees: emps,
          color: isBench ? 'rose' : 'blue',
        }
      })
      if (unassigned.length > 0) {
        result.push({ id: 'unassigned-group', label: 'Unassigned', employees: unassigned, color: 'gray' })
      }
      return result
    }

    if (groupBy === 'practice') {
      const map = new Map<string, Employee[]>()
      const unassigned: Employee[] = []
      filteredEmployees.forEach(e => {
        const practiceName = e.practice?.name
        if (!practiceName) {
          unassigned.push(e)
        } else {
          const existing = map.get(practiceName) || []
          map.set(practiceName, [...existing, e])
        }
      })
      const sortedEntries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
      const result = sortedEntries.map(([practiceName, emps]) => ({
        id: `practice-${practiceName}`,
        label: practiceName,
        employees: emps,
        color: 'violet',
      }))
      if (unassigned.length > 0) {
        result.push({ id: 'unassigned-practice-group', label: 'No Practice', employees: unassigned, color: 'gray' })
      }
      return result
    }

    return null
  }, [filteredEmployees, groupBy, employeeAllocationMap, employeeProjectsMap])

  const expandAll = () => {
    if (!groupedEmployees) return
    setExpandedGroups(new Set(groupedEmployees.map(g => g.id)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  const groupColorMap: Record<string, { dot: string; text: string; bg: string; badge: string }> = {
    rose: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    blue: { dot: 'bg-[#ea2775]/100', text: 'text-[#ea2775]', bg: 'bg-[#ea2775]/10', badge: 'bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775]' },
    violet: { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    gray: { dot: 'bg-gray-400', text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/30', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground">Loading employees...</span>
        </div>
      </div>
    )
  }

  const renderEmployeeRow = (employee: Employee) => {
    const roleName = employee.role_data?.name || employee.role
    const prjs = employeeProjectsMap.get(employee.id) || []
    const displayProjs = prjs
    const totalAllocation = employeeAllocationMap.get(employee.id) || 0
    const updateInfo = updatesByEmployee.get(employee.id)
    const hasUpdates = !!updateInfo && updateInfo.count > 0
    const isRecent = updateInfo?.lastUpdateAt ? (
      (new Date().getTime() - new Date(updateInfo.lastUpdateAt).getTime()) < 24 * 60 * 60 * 1000
    ) : false

    const allocColor = totalAllocation > 100 ? 'rose' : totalAllocation === 100 ? 'emerald' : 'amber'
    const allocBarColor = totalAllocation > 100 ? 'bg-rose-500' : totalAllocation === 100 ? 'bg-emerald-500' : 'bg-amber-500'
    const allocTextColor = totalAllocation > 100 ? 'text-rose-700 dark:text-rose-400' : totalAllocation === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'

    return (
      <tr key={employee.id} className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
        <td className="px-4 py-3 w-[40px]">
          {hasUpdates && (
            <button
              onClick={() => setUpdateModal({ open: true, employee })}
              className="hover:opacity-70 transition-opacity"
            >
              <MessageSquare className={`w-4 h-4 ${isRecent ? 'text-rose-500 fill-rose-500/20' : 'text-violet-500 fill-violet-500/20'}`} />
            </button>
          )}
        </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <EmployeeAvatar name={employee.full_name} photoUrl={employee.photo_url} size="md" />
              <button
              onClick={() => setUpdateModal({ open: true, employee })}
              className="font-semibold text-sm text-foreground hover:text-[#ea2775] dark:hover:text-[#ea2775] transition-colors truncate text-left"
            >
              {employee.full_name}
            </button>
          </div>
        </td>
        <td className="px-4 py-3">
          {roleName ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{roleName}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/40">--</span>
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
          <div className="flex items-center gap-2.5">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${allocBarColor} rounded-full transition-all`}
                style={{ width: `${Math.min(totalAllocation, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums ${allocTextColor}`}>{totalAllocation}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {displayProjs.length ? (
            <div className="flex flex-col gap-1">
              {displayProjs.map((projectName) => {
                const employeeAssignment = assignments.find(
                  a => a.employee_id === employee.id && a.project?.name === projectName && a.status === 'active'
                )
                const isBench = projectName.toLowerCase() === 'bench'
                const dateLabel = isBench ? 'since' : 'ends'
                const dateValue = isBench
                  ? (employeeAssignment?.start_date ? new Date(employeeAssignment.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null)
                  : (employeeAssignment?.end_date ? new Date(employeeAssignment.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null)
                return (
                  <button
                    key={projectName}
                    onClick={() => {
                      if (employeeAssignment) {
                        setAssignmentModal({ open: true, employeeId: null, assignment: employeeAssignment })
                      }
                    }}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border transition-colors w-fit text-left ${
                      isBench
                        ? 'bg-rose-50 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800/60 dark:hover:bg-rose-950/70'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800/60 dark:hover:bg-blue-950/70'
                    }`}
                  >
                    <span className={`text-[11px] font-semibold leading-tight flex items-center gap-1 ${isBench ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400'}`}>
                      {projectName}
                      {!isBench && employeeAssignment && employeeAssignment.allocation_percentage < 100 && (
                        <span className="text-[10px] font-bold opacity-80">· {employeeAssignment.allocation_percentage}%</span>
                      )}
                    </span>
                    {dateValue && (
                      <span className={`flex items-center gap-1 text-[10px] font-medium leading-tight ${isBench ? 'text-rose-500/80 dark:text-rose-500' : 'text-blue-500/80 dark:text-blue-500'}`}>
                        {isBench
                          ? <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                          : <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
                        }
                        {dateLabel} {dateValue}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/40">--</span>
          )}
        </td>
        <td className="px-4 py-3">
          {updateInfo?.lastUpdateAt ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground truncate max-w-[280px] cursor-default text-left">
                  <span className="font-semibold text-foreground/80">
                    [{new Date(updateInfo.lastUpdateAt).toLocaleString('en-US', { month: 'short' })}-{new Date(updateInfo.lastUpdateAt).getDate().toString().padStart(2, '0')}]
                  </span>{' '}
                  <span className="font-medium text-foreground/60">
                    {updateInfo.lastUpdateBy || 'System'}:
                  </span>{' '}
                  {updateInfo.lastUpdateText}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[400px] break-words">
                <p className="text-sm">
                  <span className="font-bold">
                    [{new Date(updateInfo.lastUpdateAt).toLocaleString('en-US', { month: 'short' })}-{new Date(updateInfo.lastUpdateAt).getDate().toString().padStart(2, '0')}] {updateInfo.lastUpdateBy || 'System'}:
                  </span>{' '}
                  {updateInfo.lastUpdateText}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </td>
        <td className="px-3 py-3 w-[52px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setAssignmentModal({ open: true, employeeId: employee.id, assignment: null })} className="gap-2 text-xs">
                <CalendarPlus className="w-3.5 h-3.5" />
                Assign to Project
              </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHistoryModal({ open: true, employee })} className="gap-2 text-xs">
                  <History className="w-3.5 h-3.5" />
                  Projects History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSkillsModal({ open: true, employee })} className="gap-2 text-xs">
                  <Star className="w-3.5 h-3.5" />
                  Skill Repository
                </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(employee)} className="gap-2 text-xs">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(employee.id)} className="text-destructive gap-2 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tecknoworkers', value: stats.total, icon: Users, color: 'violet' },
            { label: 'FTE', value: stats.fte, icon: UserCheck, color: 'emerald' },
            { label: 'CTR', value: stats.ctr, icon: Briefcase, color: 'blue' },
            { label: 'Bench', value: stats.benchSize, icon: TrendingDown, color: 'rose' },
          ].map((kpi) => {
            const colorMap: Record<string, { bg: string; icon: string; value: string; ring: string }> = {
              violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-500', value: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500/20' },
              emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-500', value: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/20' },
              blue: { bg: 'bg-[#ea2775]/10', icon: 'text-[#ea2775]', value: 'text-[#ea2775]', ring: 'ring-[#ea2775]/20' },
              rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', icon: 'text-rose-500', value: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500/20' },
            }
            const c = colorMap[kpi.color]
            const Icon = kpi.icon
            return (
              <div
                key={kpi.label}
                className="bg-card rounded-xl border border-border p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground tracking-wide">{kpi.label}</span>
                  <div className={`p-2 rounded-lg ${c.bg}`}>
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold tracking-tight ${c.value}`}>{kpi.value}</p>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-card border-border rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role filter */}
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-[160px] h-9 text-xs bg-card">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status toggle */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setShowActiveOnly(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  showActiveOnly ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setShowActiveOnly(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  !showActiveOnly ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Inactive
              </button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Buttons */}
            <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm h-8">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Employee
            </Button>
            <Link href="/roles">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                Manage Roles
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter chips row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-1.5 shadow-sm">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Group:</span>
            {([
              { key: 'allocation' as GroupingMode, label: 'Allocation', icon: Layers },
              { key: 'projects' as GroupingMode, label: 'Projects', icon: FolderKanban },
              { key: 'practice' as GroupingMode, label: 'Practice', icon: Layers },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  const next = groupBy === key ? 'none' : key
                  setGroupBy(next)
                  if (next !== 'none') expandAll()
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  groupBy === key
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-1.5 shadow-sm">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filter:</span>
            {([
              { state: showMultiProjectOnly, setter: setShowMultiProjectOnly, label: '> 1 Project' },
              { state: showBenchOnly, setter: setShowBenchOnly, label: 'Bench' },
              { state: showOnlyFTE, setter: setShowOnlyFTE, label: 'Only FTE' },
            ]).map(({ state, setter, label }) => (
              <button
                key={label}
                onClick={() => setter(!state)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  state
                    ? 'bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Filter className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {groupBy !== 'none' && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button onClick={expandAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                Expand All
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {filteredEmployees.length === 0 ? (
          <div className="bg-card rounded-xl border border-border">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-5">
                <User className="w-10 h-10 text-violet-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No employees found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {search || selectedRoleId !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by adding your first employee.'}
              </p>
              {!search && selectedRoleId === 'all' && (
                <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Employee
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-20">
                  <tr className="border-b border-border">
                    <th className="w-[40px] px-4 py-3" />
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        Employee <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('role')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        Role <SortIcon column="role" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('contract')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        Type <SortIcon column="contract" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('allocation')} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        Allocation <SortIcon column="allocation" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Project(s)</span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Latest Updates</span>
                    </th>
                    <th className="w-[52px] px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {groupBy !== 'none' && groupedEmployees ? (
                    groupedEmployees.map((group) => {
                      const gc = groupColorMap[group.color] || groupColorMap.gray
                      return (
                        <React.Fragment key={group.id}>
                          <tr
                            className={`${gc.bg} hover:opacity-90 cursor-pointer select-none transition-all`}
                            onClick={() => toggleGroup(group.id)}
                          >
                            <td colSpan={7} className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-5 h-5 text-muted-foreground/70">
                                  {expandedGroups.has(group.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </div>
                                <span className={`w-2 h-2 rounded-full ${gc.dot}`} />
                                <span className={`font-bold text-sm ${gc.text}`}>{group.label}</span>
                                <span className={`inline-flex items-center px-1.5 py-0 h-5 text-[10px] font-bold rounded-full ${gc.badge}`}>
                                  {group.employees.length}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3" />
                          </tr>
                          {expandedGroups.has(group.id) && group.employees.map(renderEmployeeRow)}
                        </React.Fragment>
                      )
                    })
                  ) : (
                    filteredEmployees.map(renderEmployeeRow)
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredEmployees.length}</span> of {employees.length} employees
              </span>
            </div>
          </div>
        )}
      </div>

      <EmployeeUpdateModal
        open={updateModal.open}
        onClose={() => setUpdateModal({ open: false, employee: null })}
        employee={updateModal.employee}
        onUpdateAdded={() => {
          fetchUpdates()
        }}
      />
      <AssignmentModal
        open={assignmentModal.open}
        onClose={() => setAssignmentModal({ open: false, employeeId: null, assignment: null })}
        onSave={(data) => onSaveAssignment(data, assignmentModal.assignment?.id)}
        onDelete={onDeleteAssignment}
        assignment={assignmentModal.assignment}
        employees={employees}
        projects={projects}
        preselectedEmployeeId={assignmentModal.employeeId}
      />
        <ProjectHistoryModal
          open={historyModal.open}
          onClose={() => setHistoryModal({ open: false, employee: null })}
          employee={historyModal.employee}
          currentAssignments={assignments.filter(a => a.employee_id === historyModal.employee?.id)}
        />
        <SkillsModal
          open={skillsModal.open}
          onClose={() => setSkillsModal({ open: false, employee: null })}
          employee={skillsModal.employee}
        />
    </>
  )
}

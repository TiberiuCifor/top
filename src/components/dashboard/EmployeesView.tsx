'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { Employee, Role, Assignment, Project, AssignmentInput } from '@/lib/types'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, User, Briefcase, ExternalLink, Filter, Layers, ChevronDown, ChevronRight, Maximize2, Minimize2, FolderKanban, MessageSquare, CalendarPlus, History } from 'lucide-react'
import { useAllEmployeeUpdates } from '@/hooks/useEmployeeUpdates'
import { EmployeeUpdateModal } from '@/components/modals/EmployeeUpdateModal'
import { AssignmentModal } from '@/components/modals/AssignmentModal'
import { ProjectHistoryModal } from '@/components/modals/ProjectHistoryModal'

interface EmployeesViewProps {
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
  onSaveAssignment: (data: AssignmentInput) => Promise<void>
  onDeleteAssignment?: (id: string) => void
  initialGroupBy?: GroupingMode
  initialExpandedGroup?: string
  initialShowBenchOnly?: boolean
  onClearInitialFilter?: () => void
}

type GroupingMode = 'none' | 'allocation' | 'projects' | 'practice'

export function EmployeesView({ 
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
}: EmployeesViewProps) {
    const [search, setSearch] = useState('')
    const [selectedRoleId, setSelectedRoleId] = useState<string>('all')
    const [groupBy, setGroupBy] = useState<GroupingMode>('none')
  
    const [showActiveOnly, setShowActiveOnly] = useState(true)
    const [showMultiProjectOnly, setShowMultiProjectOnly] = useState(false)

  const [showBenchOnly, setShowBenchOnly] = useState(false)
  const [showOnlyFTE, setShowOnlyFTE] = useState(false)

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

  useEffect(() => {
    // Reset any state needed when filters change
  }, [search, selectedRoleId, showMultiProjectOnly, showBenchOnly, showOnlyFTE, groupBy])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [updateModal, setUpdateModal] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; employeeId: string | null; assignment: Assignment | null }>({ open: false, employeeId: null, assignment: null })
  const [historyModal, setHistoryModal] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })
  
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
    const map = new Map<string, number>()
    assignments.forEach((assignment) => {
      if (!assignment.employee_id || assignment.status !== 'active') return
      const current = map.get(assignment.employee_id) || 0
      map.set(assignment.employee_id, current + assignment.allocation_percentage)
    })
    return map
  }, [assignments])

  const stats = useMemo(() => {
    const benchEmployees = employees.filter(e => {
      const projects = employeeProjectsMap.get(e.id) || []
      return projects.some(p => p.toLowerCase() === 'bench')
    })
    
    return {
      total: employees.length,
      fte: employees.filter(e => e.contract_type === 'FTE').length,
      ctr: employees.filter(e => e.contract_type === 'CTR').length,
      benchSize: benchEmployees.length
    }
  }, [employees, employeeProjectsMap])

    const filteredEmployees = employees.filter(e => {
      const roleName = e.role_data?.name || e.role || ''
      const projects = (employeeProjectsMap.get(e.id) || [])
      const projectsString = projects.join(' ').toLowerCase()

      const matchesSearch = (
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        roleName.toLowerCase().includes(search.toLowerCase()) ||
        e.contract_type.toLowerCase().includes(search.toLowerCase()) ||
        projectsString.includes(search.toLowerCase())
      )

      const matchesRole = selectedRoleId === 'all' || e.role_id === selectedRoleId
      const matchesMultiProject = !showMultiProjectOnly || projects.length >= 2
      const matchesBench = !showBenchOnly || projects.some(p => p.toLowerCase() === 'bench')
      const matchesFTE = !showOnlyFTE || e.contract_type === 'FTE'
      const matchesStatus = showActiveOnly ? e.status === 'Active' : e.status === 'Inactive'

      return matchesSearch && matchesRole && matchesMultiProject && matchesBench && matchesFTE && matchesStatus
    })


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

      return Object.entries(groups).map(([label, employees]) => ({
        id: label,
        label,
        employees,
        color: label === 'Above 100%' ? 'bg-red-500' : label === '100%' ? 'bg-green-500' : 'bg-orange-500',
        textColor: label === 'Above 100%' ? 'text-red-600' : label === '100%' ? 'text-green-600' : 'text-orange-600'
      })).filter(g => g.employees.length > 0)
    }

    if (groupBy === 'projects') {
      const map = new Map<string, Employee[]>()
      const unassigned: Employee[] = []

      filteredEmployees.forEach(e => {
        const projects = employeeProjectsMap.get(e.id) || []
        if (projects.length === 0) {
          unassigned.push(e)
        } else {
          projects.forEach(projectName => {
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

      const result = sortedEntries.map(([projectName, employees]) => {
        const isBench = projectName.toLowerCase() === 'bench'
        return {
          id: `project-${projectName}`,
          label: projectName,
          employees,
          color: isBench ? 'bg-red-500' : 'bg-[#ea2775]/100',
          textColor: isBench ? 'text-red-600' : 'text-[#ea2775]'
        }
      })

      if (unassigned.length > 0) {
        result.push({
          id: 'unassigned-group',
          label: 'Unassigned',
          employees: unassigned,
          color: 'bg-muted-foreground',
          textColor: 'text-muted-foreground'
        })
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
      
      const result = sortedEntries.map(([practiceName, employees]) => ({
        id: `practice-${practiceName}`,
        label: practiceName,
        employees,
        color: 'bg-purple-500',
        textColor: 'text-purple-600'
      }))

      if (unassigned.length > 0) {
        result.push({
          id: 'unassigned-practice-group',
          label: 'No Practice',
          employees: unassigned,
          color: 'bg-muted-foreground',
          textColor: 'text-muted-foreground'
        })
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading employees...</div>
  }

  const renderEmployeeRow = (employee: Employee) => {
    const roleName = employee.role_data?.name || employee.role
    const projects = employeeProjectsMap.get(employee.id) || []
    const totalAllocation = employeeAllocationMap.get(employee.id) || 0
    const updateInfo = updatesByEmployee.get(employee.id)
    const hasUpdates = !!updateInfo && updateInfo.count > 0
    const isRecent = updateInfo?.lastUpdateAt ? (
      (new Date().getTime() - new Date(updateInfo.lastUpdateAt).getTime()) < 24 * 60 * 60 * 1000
    ) : false

    let allocationColor = 'bg-orange-500'
    if (totalAllocation === 100) allocationColor = 'bg-green-500'
    else if (totalAllocation > 100) allocationColor = 'bg-red-500'

    return (
      <TableRow key={employee.id} className="group">
        <TableCell className="w-[50px]">
          <div className="flex items-center justify-center">
            {hasUpdates && (
              <button
                onClick={() => setUpdateModal({ open: true, employee })}
                className="hover:opacity-70 transition-opacity"
              >
                <MessageSquare className={`w-4 h-4 ${isRecent ? 'text-red-500 fill-red-500/20' : 'text-primary fill-primary/20'}`} />
              </button>
            )}
          </div>
        </TableCell>
        <TableCell className="w-[310px]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary">
                {employee.full_name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="min-w-0">
              <button
                onClick={() => setUpdateModal({ open: true, employee })}
                className="font-medium whitespace-nowrap overflow-hidden text-ellipsis hover:underline text-left"
              >
                {employee.full_name}
              </button>
            </div>
          </div>
        </TableCell>
        <TableCell className="w-[210px]">
          {roleName ? (
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">{roleName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="w-[180px]">
          <Badge variant="outline" className="whitespace-nowrap">{employee.contract_type}</Badge>
        </TableCell>
        <TableCell className="w-[120px]">
          <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${allocationColor} rounded-full`} 
                style={{ width: `${Math.min(totalAllocation, 100)}%` }} 
              />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">{totalAllocation}%</span>
          </div>
        </TableCell>
        <TableCell>
            {projects.length ? (
              <div className="flex flex-wrap gap-1">
                {projects.map((projectName) => {
                    const employeeAssignment = assignments.find(
                      a => a.employee_id === employee.id && a.project?.name === projectName && a.status === 'active'
                    )
                  return (
                    <Badge 
                      key={projectName} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => {
                        if (employeeAssignment) {
                          setAssignmentModal({ open: true, employeeId: null, assignment: employeeAssignment })
                        }
                      }}
                    >
                      {projectName}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        <TableCell className="w-[30%]">
          {updateInfo?.lastUpdateAt ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground truncate w-full cursor-default text-left">
                  <span className="font-medium text-foreground">
                    [{new Date(updateInfo.lastUpdateAt).toLocaleString('en-US', { month: 'short' })}-{new Date(updateInfo.lastUpdateAt).getDate().toString().padStart(2, '0')}]
                  </span>{' '}
                  <span className="font-semibold text-foreground/80">
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
        </TableCell>
        <TableCell className="w-[50px] sticky right-0 bg-card group-hover:bg-background border-l z-10 transition-colors shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.05)]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAssignmentModal({ open: true, employeeId: employee.id, assignment: null })}>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Assign to Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHistoryModal({ open: true, employee })}>
                  <History className="w-4 h-4 mr-2" />
                  Projects History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(employee)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(employee.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>

          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg border border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">Total Tecknoworkers:</span>
              <span>{stats.total}</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-green-600">FTE:</span>
              <span className="text-green-600 font-medium">{stats.fte}</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#ea2775]">CTR:</span>
              <span className="text-[#ea2775] font-medium">{stats.ctr}</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-red-600">Bench:</span>
              <span className="text-red-600 font-medium">{stats.benchSize}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-6 px-4 py-2 bg-card rounded-md border border-border shadow-sm">

              <div className="flex items-center gap-2">
                <Switch
                  id="group-by-allocation"
                  checked={groupBy === 'allocation'}
                  onCheckedChange={(checked) => {
                    setGroupBy(checked ? 'allocation' : 'none')
                    if (checked) expandAll()
                  }}
                />
                <Label htmlFor="group-by-allocation" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Layers className="w-3.5 h-3.5" />
                  Group by Allocation
                </Label>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <Switch
                  id="group-by-projects"
                  checked={groupBy === 'projects'}
                  onCheckedChange={(checked) => {
                    setGroupBy(checked ? 'projects' : 'none')
                    if (checked) expandAll()
                  }}
                />
                  <Label htmlFor="group-by-projects" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                    <FolderKanban className="w-3.5 h-3.5" />
                    Group by Projects
                  </Label>
                </div>
                <div className="flex items-center gap-2 border-l pl-6">
                  <Switch
                    id="group-by-practice"
                    checked={groupBy === 'practice'}
                    onCheckedChange={(checked) => {
                      setGroupBy(checked ? 'practice' : 'none')
                      if (checked) expandAll()
                    }}
                  />
                  <Label htmlFor="group-by-practice" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                    <Layers className="w-3.5 h-3.5" />
                    Group by Practice
                  </Label>
                </div>
                <div className="flex items-center gap-2 border-l pl-6">
                <Switch
                  id="show-multi-project"
                  checked={showMultiProjectOnly}
                  onCheckedChange={setShowMultiProjectOnly}
                />
                <Label htmlFor="show-multi-project" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Filter className="w-3.5 h-3.5" />
                  Show {"\u003E"} 1 project
                </Label>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <Switch
                  id="show-bench"
                  checked={showBenchOnly}
                  onCheckedChange={setShowBenchOnly}
                />
                <Label htmlFor="show-bench" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Filter className="w-3.5 h-3.5" />
                  See Bench
                </Label>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <Switch
                  id="show-only-fte"
                  checked={showOnlyFTE}
                  onCheckedChange={setShowOnlyFTE}
                />
                <Label htmlFor="show-only-fte" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Filter className="w-3.5 h-3.5" />
                  Only FTE
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-1.5 shadow-sm mr-2">
              <Switch
                id="show-active-only"
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
              />
              <Label htmlFor="show-active-only" className="text-sm font-medium cursor-pointer">
                Active employees
              </Label>
            </div>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
            <Link href="/roles">
              <Button variant="outline">
                <Briefcase className="w-4 h-4 mr-2" />
                Manage Roles
                <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No employees found</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first employee</p>
              <Button onClick={onAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-1">
              <span className="font-semibold">Showing:</span>
              <span className="font-medium">{filteredEmployees.length}</span>
              {groupBy !== 'none' && (
                <div className="flex items-center ml-2">
                  <span className="text-muted-foreground/50 mr-2">{"\u003E\u003E\u003E"}</span>
                  <button 
                    onClick={expandAll}
                    className="text-xs hover:text-primary hover:underline transition-colors"
                  >
                    Expand All
                  </button>
                  <span className="mx-2 text-muted-foreground/30 text-[10px]">|</span>
                  <button 
                    onClick={collapseAll}
                    className="text-xs hover:text-primary hover:underline transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>
            <Card>
              <div className="overflow-auto max-h-[calc(100vh-320px)]">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contract Type</TableHead>
                          <TableHead>Allocation</TableHead>
                          <TableHead>Project(s)</TableHead>
                            <TableHead className="w-[30%]">Latest Updates</TableHead>
                            <TableHead className="w-[50px] sticky right-0 bg-card border-l z-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupBy !== 'none' && groupedEmployees ? (
                        groupedEmployees.map((group) => (
                          <React.Fragment key={group.id}>
                              <TableRow 
                                className="bg-muted/50 hover:bg-muted/60 cursor-pointer select-none transition-colors"
                                onClick={() => toggleGroup(group.id)}
                              >
                                <TableCell colSpan={7} className="py-2.5 px-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className="flex items-center justify-center w-5 h-5 text-muted-foreground/70">
                                        {expandedGroups.has(group.id) ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${group.color}`} />
                                        <span className={`font-bold ${group.textColor}`}>{group.label}</span>
                                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-[10px] font-bold">
                                          {group.employees.length}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="sticky right-0 bg-muted/50 border-l z-10" />
                              </TableRow>
                          {expandedGroups.has(group.id) && group.employees.map(renderEmployeeRow)}
                        </React.Fragment>
                      ))
                    ) : (
                      filteredEmployees.map(renderEmployeeRow)
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
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
          onSave={onSaveAssignment}
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
      </>
    )
  }


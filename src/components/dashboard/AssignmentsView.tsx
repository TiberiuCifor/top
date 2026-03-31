'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { Assignment, Project } from '@/lib/types'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, CalendarDays, User, Briefcase } from 'lucide-react'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface AssignmentsViewProps {
  assignments: Assignment[]
  projects: Project[]
  loading: boolean
  onAdd: () => void
  onEdit: (assignment: Assignment) => void
  onDelete: (id: string) => void
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  completed: 'bg-[#ea2775]/100',
  cancelled: 'bg-background0',
}

  export function AssignmentsView({ assignments, projects, loading, onAdd, onEdit, onDelete }: AssignmentsViewProps) {
    const [search, setSearch] = useState('')
    const [projectFilter, setProjectFilter] = useState<string>('all')
    const [employeeFilter, setEmployeeFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [onlyFTEs, setOnlyFTEs] = useState(false)
    const [underAllocated, setUnderAllocated] = useState(false)
    const [activePage, setActivePage] = useState(1)
    const [otherPage, setOtherPage] = useState(1)
    const itemsPerPage = 15

    useEffect(() => {
      setActivePage(1)
      setOtherPage(1)
    }, [search, projectFilter, employeeFilter, statusFilter, onlyFTEs, underAllocated])

  const availableProjects = useMemo(() => {
    const projectSet = new Set<string>()
    assignments.forEach(a => {
      if (a.project?.id && a.project?.name) {
        projectSet.add(a.project.id)
      }
    })
    return projects.filter(p => projectSet.has(p.id))
  }, [assignments, projects])

  const availableEmployees = useMemo(() => {
    const employeeMap = new Map<string, { id: string; full_name: string }>()
    assignments.forEach(a => {
      if (a.employee?.id && a.employee?.full_name && a.employee?.status === 'Active') {
        employeeMap.set(a.employee.id, { id: a.employee.id, full_name: a.employee.full_name })
      }
    })
    return Array.from(employeeMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [assignments])

  const filteredAssignments = assignments.filter(a => {
    if (a.employee?.status !== 'Active') return false

    const matchesSearch = a.employee?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.project?.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role_on_project?.toLowerCase().includes(search.toLowerCase())

    const matchesProject = projectFilter === 'all' || a.project_id === projectFilter
    const matchesEmployee = employeeFilter === 'all' || a.employee_id === employeeFilter
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    const matchesFTE = !onlyFTEs || a.employee?.contract_type === 'FTE'
    const matchesUnderAllocated = !underAllocated || a.allocation_percentage < 100

    return matchesSearch && matchesProject && matchesEmployee && matchesStatus && matchesFTE && matchesUnderAllocated
  })

  const activeAssignments = useMemo(() => 
    filteredAssignments.filter(a => a.status === 'active'),
    [filteredAssignments]
  )

    const otherAssignments = useMemo(() => 
      filteredAssignments.filter(a => a.status !== 'active'),
      [filteredAssignments]
    )
  
    const renderAssignmentsTable = (items: Assignment[], title: string, currentPage: number, setCurrentPage: (page: number) => void) => {
      if (items.length === 0) return null
  
      const totalPages = Math.ceil(items.length / itemsPerPage)
      const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

      return (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold px-1">{title}</h3>
          <Card>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Employee</TableHead>
                  <TableHead className="w-[20%]">Project</TableHead>
                  <TableHead className="w-[15%]">Role</TableHead>
                  <TableHead className="w-[15%]">Timeline</TableHead>
                  <TableHead className="w-[18%]">Allocation</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map(assignment => (
                  <TableRow key={assignment.id}>
                      <TableCell className="truncate">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <EmployeeAvatar name={assignment.employee?.full_name ?? ''} photoUrl={assignment.employee?.photo_url} size="sm" />
                          <span className="font-medium truncate">{assignment.employee?.full_name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="truncate">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{assignment.project?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="truncate text-muted-foreground">
                      <span className="truncate block">
                        {assignment.project?.name.toLowerCase() === 'bench' 
                          ? (assignment.role_on_project && assignment.role_on_project.toLowerCase() !== 'bench' ? assignment.role_on_project : (assignment.employee?.role_data?.name || assignment.employee?.role || 'Team Member')) 
                          : (assignment.role_on_project || '-')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(assignment.start_date).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">
                          {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : 'Ongoing'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${assignment.allocation_percentage}%` }} />
                        </div>
                        <span className="text-sm font-medium">{assignment.allocation_percentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[assignment.status]} text-white`}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(assignment)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(assignment.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, items.length)}</span> of <span className="font-medium">{items.length}</span> assignments
              </div>
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) setCurrentPage(currentPage - 1)
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            href="#" 
                            isActive={currentPage === page}
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(page)
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )
    }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading assignments...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {availableProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {availableEmployees.map(employee => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="only-ftes" checked={onlyFTEs} onCheckedChange={setOnlyFTEs} />
            <Label htmlFor="only-ftes" className="text-sm cursor-pointer">Only FTEs</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="under-allocated" checked={underAllocated} onCheckedChange={setUnderAllocated} />
            <Label htmlFor="under-allocated" className="text-sm cursor-pointer">Allocation &lt; 100%</Label>
          </div>
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No assignments found</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first assignment</p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Assignment
            </Button>
          </CardContent>
        </Card>
        ) : (
          <>
            {renderAssignmentsTable(activeAssignments, "Active Assignments", activePage, setActivePage)}
            {renderAssignmentsTable(otherAssignments, "Completed & Cancelled Assignments", otherPage, setOtherPage)}
          </>
        )}
    </div>
  )
}

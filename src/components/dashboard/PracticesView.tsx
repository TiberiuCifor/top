'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Employee, Practice, Assignment, Squad } from '@/lib/types'
import { Search, Filter, Users, Settings2, Briefcase, Plus, Pencil, Trash2, ChevronsUpDown, ChevronsDownUp, LayoutGrid, List } from 'lucide-react'

interface PracticesViewProps {
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

export function PracticesView({
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
}: PracticesViewProps) {
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
      const practiceName = e.practice?.name || 'No Practice'

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
  
      const practiceStats = practices.map(p => ({
        name: p.name,
        count: activeEmployees.filter(e => e.practice_id === p.id).length
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
    
    // Initialize groups for all practices
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading practices...</div>
  }

  return (
    <div className="space-y-6">
      {/* Top Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.practices.map(p => (
          <Card key={p.name} className="bg-primary/5 border-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{p.name} Practice</p>
                  <h3 className="text-2xl font-bold mt-1">{p.count}</h3>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Stats Bar */}
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

        <Button 
          variant={showManagement ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowManagement(!showManagement)}
        >
          <Settings2 className="w-4 h-4 mr-2" />
          {showManagement ? 'Hide Management' : 'Manage Practices'}
        </Button>
      </div>

      {showManagement && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Practice Management
              </h3>
              <Button size="sm" onClick={onAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Practice
              </Button>
            </div>
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Practice Name</TableHead>
                    <TableHead>Headcount</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {practices.map((practice) => {
                      const count = employees.filter(e => e.practice_id === practice.id).length
                      const lead = employees.find(e => e.practice_id === practice.id && e.practice_role === 'Lead')
                      const practiceSquads = squads.filter(s => s.practice_id === practice.id)
                      
                      return (
                        <React.Fragment key={practice.id}>
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-bold text-base">{practice.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{count} Employees</Badge>
                            </TableCell>
                            <TableCell>
                              {lead ? (
                                <span className="text-sm font-medium">{lead.full_name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">No Lead assigned</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" className="h-8" onClick={() => onAddSquad(practice.id)}>
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Squad
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(practice)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(practice.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {practiceSquads.map((squad) => (
                            <TableRow key={squad.id} className="hover:bg-muted/10">
                              <TableCell className="pl-12">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                  {squad.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {employees.filter(e => e.squad_id === squad.id).length} Members
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {squad.squad_lead_id ? (
                                  <span className="text-xs text-muted-foreground">
                                    Lead: {employees.find(e => e.id === squad.squad_lead_id)?.full_name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No Squad Lead</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditSquad(squad)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteSquad(squad.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
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
          </CardContent>
        </Card>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-48">
            <Select value={selectedPracticeId} onValueChange={setSelectedPracticeId}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Practice" />
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

            <div className="flex items-center gap-6 border-l pl-6">
              <div className="flex items-center gap-2">
                <Switch 
                  id="group-by-squads" 
                  checked={groupBySquads} 
                  onCheckedChange={setGroupBySquads} 
                />
                <Label htmlFor="group-by-squads" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5" /> Group by Squads
                </Label>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <Switch id="view-bench" checked={showBenchOnly} onCheckedChange={setShowBenchOnly} />
                <Label htmlFor="view-bench" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> See Bench
                </Label>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <Switch id="view-fte" checked={showOnlyFTE} onCheckedChange={setShowOnlyFTE} />
                <Label htmlFor="view-fte" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Only FTE
                </Label>
              </div>
            </div>

        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="h-9 gap-2"
          >
            {expandedItems.length > 0 ? (
              <>
                <ChevronsDownUp className="w-4 h-4" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-4 h-4" />
                Expand All
              </>
            )}
          </Button>
          <div className="text-sm text-muted-foreground whitespace-nowrap px-4 py-1.5 bg-muted/50 rounded-full border">
            <span className="font-semibold text-foreground">Showing:</span> {filteredEmployees.length}
          </div>
        </div>
      </div>

      {/* Accordion View */}
      <Accordion 
        type="multiple" 
        value={expandedItems} 
        onValueChange={setExpandedItems} 
        className="space-y-4"
      >
        {groupedByPractice.map(([gid, data]) => {
            const practiceSquads = squads.filter(s => s.practice_id === gid)
            const unassignedEmployees = data.employees.filter(e => {
              const isUnassigned = !e.squad_id;
              const isLead = e.practice_role === 'Lead' || e.practice_role === 'Squad Lead' || squads.some(s => s.squad_lead_id === e.id);
              return isUnassigned && !isLead;
            })
          
          return (
            <AccordionItem key={gid} value={gid} className="border rounded-xl px-0 overflow-hidden bg-card shadow-sm">
              <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 transition-colors [&[data-state=open]]:border-b">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${data.practice ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span className="text-lg font-bold">{data.practice?.name || 'No Practice Assigned'}</span>
                  <Badge variant="secondary" className="ml-2">
                    {data.employees.length} Employees
                  </Badge>
                  {data.employees.find(e => e.practice_role === 'Lead') && (
                    <div className="flex items-center gap-1.5 ml-4 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead:</span>
                      <span className="text-sm font-bold text-primary">{data.employees.find(e => e.practice_role === 'Lead')?.full_name}</span>
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
                                <div key={squad.id} className="flex flex-col bg-background/40 rounded-2xl border border-border/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                  {/* Squad Header */}
                                  <div className="bg-card px-4 py-3 border-b border-border/60">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-bold text-base text-foreground tracking-tight truncate">{squad.name}</h4>
                                      <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-none font-bold text-[10px] px-1.5 h-4.5">
                                        {data.employees.filter(e => e.squad_id === squad.id).length}
                                      </Badge>
                                    </div>
                                  </div>
  
                                  {/* Squad Lead Section */}
                                  <div className="p-4 border-b border-border/40 bg-card/50">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-2.5 block">Squad Lead</span>
                                    {lead ? (
                                      <div className="flex items-center gap-3 group">
                                        <div className="relative">
                                          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-base font-black text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 duration-300">
                                            {lead.full_name.split(' ').map(n => n[0]).join('')}
                                          </div>
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" title="Active" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-bold text-sm text-foreground leading-tight truncate">{lead.full_name}</span>
                                          <span className="text-[10px] font-medium text-primary mt-0.5 uppercase tracking-wide">Squad Lead</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 opacity-50 grayscale">
                                        <div className="w-12 h-12 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                                          <Users className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <span className="text-xs italic font-medium text-muted-foreground">No Lead assigned</span>
                                      </div>
                                    )}
                                  </div>
  
                                  {/* Members List */}
                                  <div className="p-4 space-y-3 flex-1">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-1 block">Team Members</span>
                                    {members.length > 0 ? (
                                      <div className="space-y-3">
                                        {members.map(member => (
                                          <div key={member.id} className="flex items-center gap-2.5 group/member">
                                            <div className="w-9 h-9 shrink-0 rounded-lg bg-card flex items-center justify-center text-xs font-bold text-muted-foreground border border-border shadow-sm group-hover/member:border-primary/30 group-hover/member:shadow-md transition-all">
                                              {member.full_name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <span className="font-bold text-sm text-foreground leading-none group-hover/member:text-primary transition-colors truncate">{member.full_name}</span>
                                              <span className="text-[11px] text-muted-foreground mt-1 font-medium truncate">
                                                {member.role_data?.name || member.role || 'Member'}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-4">
                                        <p className="text-[10px] text-muted-foreground font-medium italic">No additional members</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                      {unassignedEmployees.length > 0 && (
                        <div className={practiceSquads.length > 0 ? "mt-12 border-t border-border pt-8" : ""}>
                           <div className="flex items-center justify-between mb-6">
                             <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                               <div className="w-8 h-px bg-muted" />
                               Employees without Squads
                               <div className="w-8 h-px bg-muted" />
                             </h4>
                             <Badge variant="outline" className="text-muted-foreground font-bold border-border">
                               {unassignedEmployees.length} Unassigned
                             </Badge>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                             {unassignedEmployees.map(e => (
                               <div key={e.id} className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md hover:border-border transition-all group">
                                 <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-xs font-bold text-muted-foreground border border-border group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                   {e.full_name.split(' ').map(n => n[0]).join('')}
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                   <span className="text-sm font-bold text-foreground truncate">{e.full_name}</span>
                                   <span className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                                     {e.role_data?.name || e.role || 'Member'}
                                   </span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}

                    
                    {practiceSquads.length === 0 && unassignedEmployees.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground italic">
                        No squads or employees in this practice.
                      </div>
                    )}
                  </div>
                ) : (
                <Table>

                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="pl-6">Employee Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Practice Role</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead className="pr-6">Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No employees found in this practice.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.employees.map(employee => {
                      const roleName = employee.role_data?.name || employee.role || '-'
                      const projects = employeeProjectsMap.get(employee.id) || []
                      const totalAllocation = employeeAllocationMap.get(employee.id) || 0
                      
                      let allocationColor = 'bg-orange-500'
                      if (totalAllocation === 100) allocationColor = 'bg-green-500'
                      else if (totalAllocation > 100) allocationColor = 'bg-red-500'

                      return (
                        <TableRow key={employee.id} className="group hover:bg-muted/10">
                          <TableCell className="pl-6 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {employee.full_name.split(' ').map(n => n[0]).join('')}
                              </div>
                              {employee.full_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span className="text-sm">{roleName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.practice_role === 'Lead' ? 'default' : 'outline'} className="rounded-md">
                              {employee.practice_role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium">{employee.contract_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${allocationColor} rounded-full`} 
                                  style={{ width: `${Math.min(totalAllocation, 100)}%` }} 
                                />
                              </div>
                              <span className="text-xs font-bold">{totalAllocation}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-6">
                            <div className="flex flex-wrap gap-1">
                              {projects.length > 0 ? projects.map(p => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 border-primary/20">
                                  {p}
                                </Badge>
                              )) : <span className="text-muted-foreground text-xs italic">Unassigned</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
                </Table>
              )}
            </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

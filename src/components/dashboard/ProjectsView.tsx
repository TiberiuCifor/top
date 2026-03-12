'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Project, Client } from '@/lib/types'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Briefcase, Calendar, Building2, Info, FileCheck, FileText } from 'lucide-react'

interface ProjectsViewProps {
  projects: Project[]
  clients: Client[]
  loading: boolean
  onAdd: () => void
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewStatus: (project: Project) => void
}

const statusColors: Record<string, string> = {
  planning: 'bg-background0',
  active: 'bg-emerald-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-[#ea2775]/100',
  cancelled: 'bg-red-500',
}

export function ProjectsView({ projects, clients, loading, onAdd, onEdit, onDelete, onViewStatus }: ProjectsViewProps) {
  const [search, setSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [hasLeadFilter, setHasLeadFilter] = useState<string>('all')

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(search.toLowerCase())
    const matchesClient = selectedClientId === 'all' || p.client_id === selectedClientId
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus
    const matchesLead = hasLeadFilter === 'all' || 
      (hasLeadFilter === 'yes' ? !!p.project_lead_id : !p.project_lead_id)

    return matchesSearch && matchesClient && matchesStatus && matchesLead
  })

  const regularProjects = filteredProjects.filter(p => p.name !== 'Bench')
  const benchProjects = filteredProjects.filter(p => p.name === 'Bench')

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading projects...</div>
  }

  const ProjectTable = ({ projectsList }: { projectsList: Project[] }) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">SOW</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Stakeholder(s)</TableHead>
            <TableHead>Project Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projectsList.map(project => (
            <TableRow key={project.id} className="hover:bg-muted/50">
              <TableCell className="text-center">
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
                          <FileCheck className="w-5 h-5 text-emerald-500 mx-auto cursor-pointer" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        {project.sow_url ? 'SOW Signed - Click to view' : 'SOW Signed'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground mx-auto" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p 
                        className="font-medium cursor-pointer hover:text-primary hover:underline transition-colors"
                        onClick={() => onEdit(project)}
                      >
                        {project.name}
                      </p>
                        {project.important_updates && project.important_updates.trim() !== '' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Info className="w-4 h-4 text-[#ea2775] cursor-help" />
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
                    {project.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{project.description}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {project.client ? (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{project.client.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                    {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm truncate max-w-[150px]" title={
                  project.project_stakeholders?.length 
                    ? project.project_stakeholders.map(s => s.name).join(', ') 
                    : project.stakeholders || ''
                }>
                  {project.project_stakeholders?.length 
                    ? project.project_stakeholders.map(s => s.name).join(', ') 
                    : project.stakeholders || <span className="text-muted-foreground">-</span>}
                </p>
              </TableCell>
                <TableCell>
                  {project.project_lead ? (
                    <span className={`text-sm font-medium ${project.project_lead.status === 'Inactive' ? 'text-muted-foreground line-through' : ''}`}>
                      {project.project_lead.full_name}
                      {project.project_lead.status === 'Inactive' && ' (Inactive)'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>

              <TableCell>
                <Badge className={`${project.status ? statusColors[project.status] : 'bg-background0'} text-white`}>
                  {project.status?.replace('_', ' ') || 'N/A'}
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
                    <DropdownMenuItem onClick={() => onEdit(project)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(project.id)} className="text-destructive">
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
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4 w-full max-w-3xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-[180px]">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            <div className="w-[180px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.keys(statusColors).map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={hasLeadFilter} onValueChange={setHasLeadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Has Project Lead?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Has Lead: All</SelectItem>
                  <SelectItem value="yes">Has Lead: Yes</SelectItem>
                  <SelectItem value="no">Has Lead: No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No projects found</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first project</p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </CardContent>
        </Card>
      ) : (
          <>
            {regularProjects.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active & Planned Projects ({regularProjects.length})</h3>
                <Card>
                  <ProjectTable projectsList={regularProjects} />
                </Card>
              </div>
            )}

            {benchProjects.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bench ({benchProjects.length})</h3>
                <Card className="bg-background/50">
                  <ProjectTable projectsList={benchProjects} />
                </Card>
              </div>
            )}
          </>
      )}
    </div>
  )
}

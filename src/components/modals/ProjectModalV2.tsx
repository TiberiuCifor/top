'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Copy, Trash2, Check, X, Pencil, Briefcase, Loader2, Save, Calendar, DollarSign, Link2, FileText, Search, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useProjectStakeholders } from '@/hooks/useResourceData'
import type { Project, ProjectInput, Client, ProjectStakeholder, ProjectStakeholderInput, Employee } from '@/lib/types'

interface JiraProject {
  key: string
  name: string
  id: string
  avatarUrl: string | null
}

interface ProjectModalV2Props {
  open: boolean
  onClose: () => void
  onSave: (data: ProjectInput) => Promise<void>
  project?: Project | null
  clients: Client[]
  employees: Employee[]
}

const inputClass = 'h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all'
const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider'

export function ProjectModalV2({ open, onClose, onSave, project, clients, employees }: ProjectModalV2Props) {
  const [loading, setLoading] = useState(false)
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
  const [jiraSearch, setJiraSearch] = useState('')
  const [jiraOpen, setJiraOpen] = useState(false)
  const jiraDropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<ProjectInput>({
    name: '',
    description: null,
    client_id: null,
    project_lead_id: null,
    status: 'planning',
    start_date: null,
    end_date: null,
    budget: null,
    priority: 'medium',
    stakeholders: null,
    important_updates: null,
    sow_signed: false,
    sow_url: null,
    jira_project_key: null,
  })

  const { stakeholders, createStakeholder, updateStakeholder, deleteStakeholder } = useProjectStakeholders(project?.id || null)
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false)
  const [editingStakeholderId, setEditingStakeholderId] = useState<string | null>(null)
  const [stakeholderFormData, setStakeholderFormData] = useState<ProjectStakeholderInput>({
    project_id: project?.id || '',
    name: '',
    email: '',
    position: '',
  })

  useEffect(() => {
    fetch('/api/jira/projects')
      .then(r => r.json())
      .then(d => { if (d.projects) setJiraProjects(d.projects) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jiraDropdownRef.current && !jiraDropdownRef.current.contains(e.target as Node)) {
        setJiraOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description ?? null,
        client_id: project.client_id,
        project_lead_id: project.project_lead_id ?? null,
        status: project.status ?? 'planning',
        start_date: project.start_date,
        end_date: project.end_date,
        budget: project.budget ?? null,
        priority: project.priority ?? 'medium',
        stakeholders: project.stakeholders ?? null,
        important_updates: project.important_updates ?? null,
        sow_signed: project.sow_signed ?? false,
        sow_url: project.sow_url ?? null,
        jira_project_key: project.jira_project_key ?? null,
      })
    } else {
      setFormData({
        name: '',
        description: null,
        client_id: null,
        project_lead_id: null,
        status: 'planning',
        start_date: null,
        end_date: null,
        budget: null,
        priority: 'medium',
        stakeholders: null,
        important_updates: null,
        sow_signed: false,
        sow_url: null,
        jira_project_key: null,
      })
    }
  }, [project, open])

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    toast.success('Email copied to clipboard')
  }

  const handleAddStakeholder = async () => {
    if (!project?.id) return
    if (!stakeholderFormData.name) {
      toast.error('Name is mandatory')
      return
    }
    const { error } = await createStakeholder({ ...stakeholderFormData, project_id: project.id })
    if (error) toast.error('Failed to add stakeholder')
    else {
      toast.success('Stakeholder added')
      setIsAddingStakeholder(false)
      setStakeholderFormData({ project_id: project.id, name: '', email: '', position: '' })
    }
  }

  const handleUpdateStakeholder = async (id: string) => {
    if (!stakeholderFormData.name) {
      toast.error('Name is mandatory')
      return
    }
    const { error } = await updateStakeholder(id, stakeholderFormData)
    if (error) toast.error('Failed to update stakeholder')
    else {
      toast.success('Stakeholder updated')
      setEditingStakeholderId(null)
      setStakeholderFormData({ project_id: project?.id || '', name: '', email: '', position: '' })
    }
  }

  const startEditingStakeholder = (s: ProjectStakeholder) => {
    setEditingStakeholderId(s.id)
    setStakeholderFormData({
      project_id: s.project_id,
      name: s.name,
      email: s.email || '',
      position: s.position || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 gap-0 overflow-hidden rounded-xl border-border max-h-[90vh] flex flex-col">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5 shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">
                  {project ? 'Edit Project' : 'New Project'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-white/60 text-xs mt-0.5">
                {project ? 'Update project details below' : 'Fill in the details to add a new project'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* General Information */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">General Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className={labelClass}>
                    Project Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter project name"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client" className={labelClass}>Client</Label>
                  <Select value={formData.client_id || 'none'} onValueChange={(v) => setFormData({ ...formData, client_id: v === 'none' ? null : v })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project_lead" className={labelClass}>Project Lead</Label>
                  <Select
                    value={formData.project_lead_id || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, project_lead_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select project lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No lead selected</SelectItem>
                      {employees
                        .filter(e => e.status === 'Active' || e.id === formData.project_lead_id)
                        .map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status" className={labelClass}>Status</Label>
                  <Select value={formData.status || 'planning'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 'planning', label: 'Planning', dot: 'bg-yellow-500' },
                        { value: 'active', label: 'Active', dot: 'bg-emerald-500' },
                        { value: 'on_hold', label: 'On Hold', dot: 'bg-amber-500' },
                        { value: 'completed', label: 'Completed', dot: 'bg-[#ea2775]/100' },
                        { value: 'canceled', label: 'Canceled', dot: 'bg-red-500' },
                      ].map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                            {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className={labelClass}>Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                  rows={2}
                  placeholder="Brief project description..."
                  className="bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all resize-none"
                />
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* Timeline & Budget */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Timeline & Budget</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className={labelClass}>Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date || ''}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_date" className={labelClass}>End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="budget" className={labelClass}>Budget</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget || ''}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="0.00"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* SOW */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">SOW Info</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <Switch
                    id="sow_signed"
                    checked={formData.sow_signed}
                    onCheckedChange={(checked) => setFormData({ ...formData, sow_signed: checked })}
                  />
                  <Label htmlFor="sow_signed" className="text-sm font-medium cursor-pointer">SOW Signed</Label>
                </div>
                {formData.sow_signed && (
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="sow_url" className={labelClass}>SOW URL</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <Input
                        id="sow_url"
                        value={formData.sow_url || ''}
                        onChange={(e) => setFormData({ ...formData, sow_url: e.target.value || null })}
                        placeholder="https://..."
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

              <div className="h-px bg-border" />

              {/* JIRA Project */}
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">JIRA Project</h3>
                <div className="space-y-1.5" ref={jiraDropdownRef}>
                  <Label className={labelClass}>Linked JIRA Project</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setJiraOpen(v => !v); setJiraSearch('') }}
                      className="w-full h-10 flex items-center justify-between px-3 bg-muted/30 border border-border rounded-lg text-sm hover:border-violet-500/50 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    >
                      <span className={formData.jira_project_key ? 'text-foreground' : 'text-muted-foreground'}>
                        {formData.jira_project_key
                          ? (() => {
                              const p = jiraProjects.find(p => p.key === formData.jira_project_key)
                              return p ? `${p.key} — ${p.name}` : formData.jira_project_key
                            })()
                          : 'Select JIRA project...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${jiraOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {jiraOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Search JIRA projects..."
                              value={jiraSearch}
                              onChange={e => setJiraSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-sm text-left text-muted-foreground hover:bg-muted/50 transition-colors"
                            onClick={() => { setFormData({ ...formData, jira_project_key: null }); setJiraOpen(false) }}
                          >
                            No JIRA project
                          </button>
                          {jiraProjects
                            .filter(p => {
                              const q = jiraSearch.toLowerCase()
                              return !q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
                            })
                            .map(p => (
                              <button
                                key={p.key}
                                type="button"
                                className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 hover:bg-muted/50 transition-colors ${formData.jira_project_key === p.key ? 'bg-violet-50/50 dark:bg-violet-950/20 text-violet-600' : ''}`}
                                onClick={() => { setFormData({ ...formData, jira_project_key: p.key }); setJiraOpen(false) }}
                              >
                                {p.avatarUrl && (
                                  <img src={p.avatarUrl} alt="" className="w-4 h-4 rounded-sm shrink-0" />
                                )}
                                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{p.key}</span>
                                <span className="truncate">{p.name}</span>
                                {formData.jira_project_key === p.key && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                              </button>
                            ))}
                          {jiraProjects.filter(p => {
                            const q = jiraSearch.toLowerCase()
                            return !q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
                          }).length === 0 && (
                            <div className="px-3 py-4 text-sm text-center text-muted-foreground">No projects found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Stakeholders */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Stakeholders</h3>
                {project && !isAddingStakeholder && !editingStakeholderId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingStakeholder(true)}
                    className="h-7 px-2.5 text-xs rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              {!project ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                  <FileText className="w-4 h-4 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Save the project first to manage stakeholders.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name *</th>
                        <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                        <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
                        <th className="w-20 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(isAddingStakeholder || editingStakeholderId) && (
                        <tr className="bg-violet-50/50 dark:bg-violet-950/20">
                          <td className="px-3 py-2">
                            <Input
                              size={1}
                              className="h-8 bg-background rounded-md"
                              placeholder="Name"
                              value={stakeholderFormData.name}
                              onChange={(e) => setStakeholderFormData({ ...stakeholderFormData, name: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size={1}
                              className="h-8 bg-background rounded-md"
                              placeholder="Email"
                              value={stakeholderFormData.email || ''}
                              onChange={(e) => setStakeholderFormData({ ...stakeholderFormData, email: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size={1}
                              className="h-8 bg-background rounded-md"
                              placeholder="Position"
                              value={stakeholderFormData.position || ''}
                              onChange={(e) => setStakeholderFormData({ ...stakeholderFormData, position: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => editingStakeholderId ? handleUpdateStakeholder(editingStakeholderId) : handleAddStakeholder()}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setIsAddingStakeholder(false)
                                  setEditingStakeholderId(null)
                                  setStakeholderFormData({ project_id: project.id, name: '', email: '', position: '' })
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {stakeholders.length === 0 && !isAddingStakeholder && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No stakeholders added yet.
                          </td>
                        </tr>
                      )}
                      {stakeholders.map((s) => (
                        editingStakeholderId !== s.id && (
                          <tr key={s.id} className="group hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-foreground">{s.name}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground truncate max-w-[150px]">{s.email || '—'}</span>
                                {s.email && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCopyEmail(s.email!)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{s.position || '—'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEditingStakeholder(s)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm('Delete this stakeholder?')) {
                                      deleteStakeholder(s.id)
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="h-px bg-border" />

            {/* Important Updates */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Important Updates</h3>
              <Textarea
                id="important_updates"
                value={formData.important_updates || ''}
                onChange={(e) => setFormData({ ...formData, important_updates: e.target.value || null })}
                placeholder="Add important updates for the project..."
                rows={3}
                className="bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all resize-none"
              />
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name}
              className="bg-[#ea2775] hover:bg-[#d01e65] text-white rounded-lg h-9 px-5 text-sm shadow-sm min-w-[110px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {project ? 'Update' : 'Add Project'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, Copy, Trash2, Check, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useProjectStakeholders } from '@/hooks/useResourceData'
import type { Project, ProjectInput, Client, ProjectStakeholder, ProjectStakeholderInput, Employee } from '@/lib/types'

interface ProjectModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: ProjectInput) => Promise<void>
  project?: Project | null
  clients: Client[]
  employees: Employee[]
}

export function ProjectModal({ open, onClose, onSave, project, clients, employees }: ProjectModalProps) {
  const [loading, setLoading] = useState(false)
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Add Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">General Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="client">Client</Label>
                    <Select value={formData.client_id || 'none'} onValueChange={(v) => setFormData({ ...formData, client_id: v === 'none' ? null : v })}>
                      <SelectTrigger>
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
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="project_lead">Project Lead</Label>
                  <Select 
                    value={formData.project_lead_id || 'none'} 
                    onValueChange={(v) => setFormData({ ...formData, project_lead_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger>
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
              </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                rows={2}
              />
            </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status || 'planning'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget || ''}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Project budget"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Stakeholder(s) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stakeholder(s)</h3>
                {project && !isAddingStakeholder && !editingStakeholderId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddingStakeholder(true)}
                    className="h-8 px-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Stakeholder
                  </Button>
                )}
              </div>

              {!project ? (
                <p className="text-sm text-muted-foreground italic">Save the project first to manage stakeholders.</p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Name *</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">Position</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(isAddingStakeholder || editingStakeholderId) && (
                        <tr className="bg-muted/30">
                          <td className="p-2">
                            <Input 
                              size={1}
                              className="h-8"
                              placeholder="Name"
                              value={stakeholderFormData.name}
                              onChange={(e) => setStakeholderFormData({ ...stakeholderFormData, name: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <Input 
                              size={1}
                              className="h-8"
                              placeholder="Email"
                              value={stakeholderFormData.email || ''}
                              onChange={(e) => setStakeholderFormData({ ...stakeholderFormData, email: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <Input 
                              size={1}
                              className="h-8"
                              placeholder="Position"
                              value={stakeholderFormData.position || ''}
                              onChange={(e) => setStakeholderFormData({ ...stakeholderFormData, position: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Button 
                                type="button" 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-green-600"
                                onClick={() => editingStakeholderId ? handleUpdateStakeholder(editingStakeholderId) : handleAddStakeholder()}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                type="button" 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-destructive"
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
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">No stakeholders added yet.</td>
                        </tr>
                      )}
                      {stakeholders.map((s) => (
                        editingStakeholderId !== s.id && (
                          <tr key={s.id} className="hover:bg-muted/20 group">
                            <td className="p-2 font-medium">{s.name}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[150px]">{s.email || '-'}</span>
                                {s.email && (
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={() => handleCopyEmail(s.email!)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-muted-foreground">{s.position || '-'}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
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
                                  className="h-7 w-7 text-destructive"
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
            </div>

            <Separator />


          {/* Timeline Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Timeline Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* SOW Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">SOW Info</h3>
            <div className="flex items-center gap-8">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="sow_signed" 
                  checked={formData.sow_signed} 
                  onCheckedChange={(checked) => setFormData({ ...formData, sow_signed: checked })}
                />
                <Label htmlFor="sow_signed">SOW Signed?</Label>
              </div>
              {formData.sow_signed && (
                <div className="flex-1 space-y-2">
                  <Label htmlFor="sow_url">SOW URL</Label>
                  <Input
                    id="sow_url"
                    value={formData.sow_url || ''}
                    onChange={(e) => setFormData({ ...formData, sow_url: e.target.value || null })}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Important Updates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Important Updates</h3>
            <div className="space-y-2">
              <Label htmlFor="important_updates">Updates</Label>
              <Textarea
                id="important_updates"
                value={formData.important_updates || ''}
                onChange={(e) => setFormData({ ...formData, important_updates: e.target.value || null })}
                placeholder="Add some updates for the project..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

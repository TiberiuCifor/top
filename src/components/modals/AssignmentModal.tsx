'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Trash2, CalendarPlus, Loader2, Save, Calendar, User, Briefcase, FolderKanban } from 'lucide-react'
import type { Assignment, AssignmentInput, Employee, Project } from '@/lib/types'

const inputClass = 'h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all'
const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider'

interface AssignmentModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: AssignmentInput) => Promise<void>
  onDelete?: (id: string) => void
  assignment?: Assignment | null
  employees: Employee[]
  projects: Project[]
  preselectedEmployeeId?: string | null
}

export function AssignmentModal({ open, onClose, onSave, onDelete, assignment, employees, projects, preselectedEmployeeId }: AssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AssignmentInput>({
    project_id: '',
    employee_id: '',
    role_on_project: null,
    allocation_percentage: 100,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    status: 'active',
  })

  useEffect(() => {
    if (assignment) {
      setFormData({
        project_id: assignment.project_id,
        employee_id: assignment.employee_id,
        role_on_project: assignment.role_on_project,
        allocation_percentage: assignment.allocation_percentage,
        start_date: assignment.start_date,
        end_date: assignment.end_date,
        status: assignment.status,
      })
    } else {
      setFormData({
        project_id: '',
        employee_id: preselectedEmployeeId || '',
        role_on_project: null,
        allocation_percentage: 100,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        status: 'active',
      })
    }
  }, [assignment, open, preselectedEmployeeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const dataToSave = { ...formData }
      if (!dataToSave.end_date && dataToSave.start_date) {
        const startYear = new Date(dataToSave.start_date).getFullYear()
        dataToSave.end_date = `${startYear}-12-31`
      }
      await onSave(dataToSave)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const allocColor = formData.allocation_percentage > 100 ? 'text-rose-600' : formData.allocation_percentage === 100 ? 'text-emerald-600' : 'text-amber-600'

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-xl border-border max-h-[90vh] flex flex-col">
          {/* Gradient Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5 shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                <CalendarPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogHeader>
                  <DialogTitle className="text-white text-lg font-semibold">
                    {assignment ? 'Edit Assignment' : 'Assign to Project'}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-white/60 text-xs mt-0.5">
                  {assignment ? 'Update assignment details below' : 'Assign an employee to a project'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Employee & Project */}
              <div className="space-y-1.5">
                <Label htmlFor="employee" className={labelClass}>
                  Employee <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
                  <Select value={formData.employee_id || ''} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                    <SelectTrigger className={`${inputClass} pl-10`}>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter(e => e.status === 'Active' || e.id === formData.employee_id)
                        .map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project" className={labelClass}>
                  Project <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
                  <Select value={formData.project_id || ''} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                    <SelectTrigger className={`${inputClass} pl-10`}>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role_on_project" className={labelClass}>Role on Project</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    id="role_on_project"
                    value={formData.role_on_project || ''}
                    onChange={(e) => setFormData({ ...formData, role_on_project: e.target.value || null })}
                    placeholder="e.g., Lead Developer, Designer"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className={labelClass}>
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`${inputClass} pl-10`}
                      required
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
              </div>

              {/* Allocation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className={labelClass}>Allocation</Label>
                  <span className={`text-sm font-bold tabular-nums ${allocColor}`}>
                    {formData.allocation_percentage}%
                  </span>
                </div>
                <Slider
                  value={[formData.allocation_percentage]}
                  onValueChange={([v]) => setFormData({ ...formData, allocation_percentage: v })}
                  min={0}
                  max={100}
                  step={5}
                  className="py-1"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className={labelClass}>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as AssignmentInput['status'] })}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ea2775]/100" />
                        Completed
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Cancelled
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10 shrink-0">
              {assignment && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-9 px-3 text-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-sm">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.employee_id || !formData.project_id || !formData.start_date}
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
                      {assignment ? 'Update' : 'Assign'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (assignment && onDelete) {
                  onDelete(assignment.id)
                  setDeleteDialogOpen(false)
                  onClose()
                }
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

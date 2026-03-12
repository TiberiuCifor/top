'use client'

import React, { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar, Briefcase, History, Clock, Building2, User } from 'lucide-react'
import { useEmployeeProjectHistory } from '@/hooks/useResourceData'
import type { Employee, Assignment } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'

function calculatePeriod(startDate: string, endDate: string | null) {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()

  const totalDays = differenceInDays(end, start)
  const months = totalDays / 30.44

  if (months < 1) {
    return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`
  }

  return `${months.toFixed(1)} ${months.toFixed(1) === '1.0' ? 'month' : 'months'}`
}

interface ProjectHistoryModalProps {
  open: boolean
  onClose: () => void
  employee: Employee | null
  currentAssignments: Assignment[]
}

export function ProjectHistoryModal({ open, onClose, employee, currentAssignments }: ProjectHistoryModalProps) {
  const { history, loading } = useEmployeeProjectHistory(employee?.id || null)

  const { currentProjects, pastProjects } = useMemo(() => {
    const current = history.filter(h => h.status === 'active')
    const past = history
      .filter(h => h.status === 'completed' || h.status === 'canceled')
      .sort((a, b) => {
        if (!a.end_date) return -1
        if (!b.end_date) return 1
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      })

    return { currentProjects: current, pastProjects: past }
  }, [history])

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] w-full p-0 gap-0 overflow-hidden rounded-xl border-border max-h-[90vh] flex flex-col">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5 shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">
                  Project History
                </DialogTitle>
              </DialogHeader>
              <p className="text-white/60 text-xs mt-0.5">
                {employee.full_name} — all project assignments
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
                  <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-sm text-muted-foreground">Loading history...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Current Projects */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Current Projects</h3>
                  <span className="inline-flex items-center px-1.5 h-5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {currentProjects.length}
                  </span>
                </div>
                {currentProjects.length > 0 ? (
                  <ProjectTable projects={currentProjects} variant="current" />
                ) : (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-dashed border-border">
                    <Briefcase className="w-4 h-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No active projects at the moment.</p>
                  </div>
                )}
              </section>

              {/* Past Projects */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Past Projects</h3>
                  <span className="inline-flex items-center px-1.5 h-5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {pastProjects.length}
                  </span>
                </div>
                {pastProjects.length > 0 ? (
                  <ProjectTable projects={pastProjects} variant="past" />
                ) : (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-dashed border-border">
                    <History className="w-4 h-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No past projects recorded.</p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-muted/10 shrink-0">
          <Button variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProjectTable({ projects, variant }: { projects: any[]; variant: 'current' | 'past' }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Project</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocation</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start Date</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">End Date</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => {
            const alloc = project.allocation_percentage || 0
            const allocColor = alloc > 100 ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' :
              alloc === 100 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' :
              'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'

            return (
              <tr key={project.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="font-medium text-foreground">{project.client_name || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="font-medium text-foreground">{project.project_name || 'Unknown Project'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {project.role_on_project || '—'}
                </td>
                <td className="px-4 py-3">
                  {project.allocation_percentage ? (
                    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full ${allocColor}`}>
                      {project.allocation_percentage}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="text-sm">{format(new Date(project.start_date), 'MMM dd, yyyy')}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="text-sm">{project.end_date ? format(new Date(project.end_date), 'MMM dd, yyyy') : 'Ongoing'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {calculatePeriod(project.start_date, project.end_date)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

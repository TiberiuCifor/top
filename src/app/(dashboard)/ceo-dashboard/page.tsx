'use client'
import { useEmployees, useProjects, useAssignments, useCeoDashboard } from '@/hooks/useResourceData'
import { useDashboard } from '@/contexts/DashboardContext'
import { CeoDashboardView } from '@/components/dashboard/CeoDashboardView'

export default function CeoDashboardPage() {
  const { isLeadership } = useDashboard()
  const { employees } = useEmployees()
  const { projects } = useProjects()
  const { assignments } = useAssignments()
  const { entries, loading, createEntry, updateEntry, deleteEntry } = useCeoDashboard()

  if (!isLeadership) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Access denied</div>
  }

  return (
    <CeoDashboardView
      entries={entries}
      projects={projects}
      employees={employees}
      assignments={assignments}
      loading={loading}
      onCreateEntry={createEntry}
      onUpdateEntry={updateEntry}
      onDeleteEntry={deleteEntry}
    />
  )
}

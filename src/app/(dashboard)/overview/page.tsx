'use client'
import { useRouter } from 'next/navigation'
import { useClients, useEmployees, useProjects, useAssignments, usePractices, useReminders } from '@/hooks/useResourceData'
import { OverviewDashboardV2 } from '@/components/dashboard/OverviewDashboardV2'
import { useDashboard } from '@/contexts/DashboardContext'

export default function OverviewPage() {
  const { currentUser } = useDashboard()
  const router = useRouter()
  const { clients } = useClients()
  const { employees } = useEmployees()
  const { projects } = useProjects()
  const { assignments } = useAssignments()
  const { practices } = usePractices()
  const { reminders } = useReminders()

  const onNavigate = (tab: string) => {
    const routeMap: Record<string, string> = {
      overview: '/overview',
      dashboard: '/allocations',
      clients: '/clients',
      projects: '/projects',
      employees: '/employees',
      assignments: '/assignments',
      practices: '/practices',
        'rag-updates': '/projects-updates/rag-updates',
      reminders: '/reminders',
      'ceo-dashboard': '/ceo-dashboard',
    }
    router.push(routeMap[tab] || `/${tab}`)
  }

  return (
    <OverviewDashboardV2
      assignments={assignments}
      employees={employees}
      projects={projects}
      clients={clients}
      practices={practices}
      reminders={reminders}
      currentUser={currentUser}
      onNavigate={onNavigate}
      onAllocationClick={(group) => {
        router.push(`/employees?groupBy=allocation&expandedGroup=${encodeURIComponent(group)}`)
      }}
      onRagClick={(status) => {
        router.push(`/projects-updates/rag-updates?status=${status}`)
      }}
      onBenchClick={() => {
        router.push('/employees?bench=true')
      }}
    />
  )
}

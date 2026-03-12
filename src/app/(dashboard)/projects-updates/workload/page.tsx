'use client'

import { useClients, useProjects } from '@/hooks/useResourceData'
import { WorkloadView } from '@/components/dashboard/WorkloadView'

export default function WorkloadPage() {
  const { projects, loading } = useProjects()
  const { clients } = useClients()

  return (
    <WorkloadView
      projects={projects}
      clients={clients}
      loading={loading}
    />
  )
}

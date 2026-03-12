'use client'
import { useRouter, useParams } from 'next/navigation'
import { useProjects } from '@/hooks/useResourceData'
import { ProjectStatusView } from '@/components/dashboard/ProjectStatusView'

export default function ProjectStatusPage() {
  const router = useRouter()
  const params = useParams()
  const { projects, fetchProjects } = useProjects()
  const project = projects.find(p => p.id === params.id)

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading project...</div>
  }

  return (
    <ProjectStatusView
      project={project}
      onBack={() => {
        fetchProjects()
        router.back()
      }}
    />
  )
}

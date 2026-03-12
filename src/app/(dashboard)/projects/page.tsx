'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useClients, useProjects, useEmployees } from '@/hooks/useResourceData'
import { ProjectsViewV2 } from '@/components/dashboard/ProjectsViewV2'
import { ProjectModalV2 } from '@/components/modals/ProjectModalV2'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useDashboard } from '@/contexts/DashboardContext'
import type { Project, ProjectInput } from '@/lib/types'

export default function ProjectsPage() {
  const router = useRouter()
  const { isProjectLead } = useDashboard()
  const { clients } = useClients()
  const { employees } = useEmployees()
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects()
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })

  const handleSaveProject = async (data: ProjectInput) => {
    if (projectModal.project) {
      const { error } = await updateProject(projectModal.project.id, data)
      if (error) toast.error('Failed to update project')
      else toast.success('Project updated successfully')
    } else {
      const { error } = await createProject(data)
      if (error) toast.error('Failed to create project')
      else toast.success('Project created successfully')
    }
  }

  const handleConfirmDelete = async () => {
    const { error } = await deleteProject(deleteDialog.id)
    if (error) toast.error('Failed to delete project')
    else toast.success('Project deleted successfully')
    setDeleteDialog({ open: false, id: '', name: '' })
  }

  return (
    <>
        <ProjectsViewV2
          projects={projects}
          clients={clients}
          loading={loading}
          readonly={isProjectLead}
          onAdd={() => setProjectModal({ open: true, project: null })}
          onEdit={(p) => setProjectModal({ open: true, project: p })}
          onDelete={(id) => {
          const project = projects.find(p => p.id === id)
          setDeleteDialog({ open: true, id, name: project?.name || '' })
        }}
        onViewStatus={(p) => {
          router.push(`/project-status/${p.id}`)
        }}
      />
      <ProjectModalV2
        open={projectModal.open}
        onClose={() => setProjectModal({ open: false })}
        onSave={handleSaveProject}
        project={projectModal.project}
        clients={clients}
        employees={employees}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAssignments, useProjects, useEmployees } from '@/hooks/useResourceData'
import { AssignmentsView } from '@/components/dashboard/AssignmentsView'
import { AssignmentModal } from '@/components/modals/AssignmentModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Assignment, AssignmentInput } from '@/lib/types'

export default function AssignmentsPage() {
  const { assignments, loading, createAssignment, updateAssignment, deleteAssignment } = useAssignments()
  const { projects } = useProjects()
  const { employees } = useEmployees()
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; assignment?: Assignment | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })

  const handleSaveAssignment = async (data: AssignmentInput) => {
    if (assignmentModal.assignment) {
      const { error } = await updateAssignment(assignmentModal.assignment.id, data)
      if (error) toast.error('Failed to update assignment')
      else toast.success('Assignment updated successfully')
    } else {
      const { error } = await createAssignment(data)
      if (error) toast.error('Failed to create assignment')
      else toast.success('Assignment created successfully')
    }
  }

  const handleConfirmDelete = async () => {
    const { error } = await deleteAssignment(deleteDialog.id)
    if (error) toast.error('Failed to delete assignment')
    else toast.success('Assignment deleted successfully')
    setDeleteDialog({ open: false, id: '', name: '' })
  }

  return (
    <>
      <AssignmentsView
        assignments={assignments}
        projects={projects}
        loading={loading}
        onAdd={() => setAssignmentModal({ open: true, assignment: null })}
        onEdit={(a) => setAssignmentModal({ open: true, assignment: a })}
        onDelete={(id) => {
          const assignment = assignments.find(a => a.id === id)
          setDeleteDialog({ open: true, id, name: `${assignment?.employee?.full_name} - ${assignment?.project?.name}` })
        }}
      />
      <AssignmentModal
        open={assignmentModal.open}
        onClose={() => setAssignmentModal({ open: false })}
        onSave={handleSaveAssignment}
        onDelete={async (id) => {
          const { error } = await deleteAssignment(id)
          if (error) toast.error('Failed to delete assignment')
          else toast.success('Assignment deleted successfully')
        }}
        assignment={assignmentModal.assignment}
        employees={employees}
        projects={projects}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assignment?</AlertDialogTitle>
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

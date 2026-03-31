'use client'
import { useState } from 'react'
import { useClients, useEmployees, useProjects, useAssignments } from '@/hooks/useResourceData'
import { DashboardViewV2 } from '@/components/dashboard/DashboardViewV2'
import { AssignmentModal } from '@/components/modals/AssignmentModal'
import { toast } from 'sonner'
import type { Assignment, AssignmentInput } from '@/lib/types'

export default function AllocationsPage() {
  const { clients } = useClients()
  const { employees } = useEmployees()
  const { projects } = useProjects()
  const { assignments, updateAssignment, deleteAssignment } = useAssignments()
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; assignment?: Assignment | null }>({ open: false })

  const handleSaveAssignment = async (data: AssignmentInput) => {
    if (assignmentModal.assignment) {
      const { error } = await updateAssignment(assignmentModal.assignment.id, data)
      if (error) toast.error('Failed to update assignment')
      else toast.success('Assignment updated successfully')
    }
  }

  return (
    <div>
      <DashboardViewV2
        assignments={assignments}
        employees={employees}
        projects={projects}
        clients={clients}
        onEditAssignment={(a) => setAssignmentModal({ open: true, assignment: a })}
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
    </div>
  )
}

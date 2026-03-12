'use client'
import { useState } from 'react'
import { useClients, useEmployees, useProjects, useAssignments } from '@/hooks/useResourceData'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { DashboardViewV2 } from '@/components/dashboard/DashboardViewV2'
import { AssignmentModal } from '@/components/modals/AssignmentModal'
import { toast } from 'sonner'
import type { Assignment, AssignmentInput } from '@/lib/types'

export default function AllocationsPage() {
  const [allocationsV2, setAllocationsV2] = useState(true)
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
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setAllocationsV2(!allocationsV2)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-border hover:bg-muted"
        >
          Switch to {allocationsV2 ? 'old' : 'new'} version
        </button>
      </div>
      {allocationsV2 ? (
        <DashboardViewV2
          assignments={assignments}
          employees={employees}
          projects={projects}
          clients={clients}
          onEditAssignment={(a) => setAssignmentModal({ open: true, assignment: a })}
        />
      ) : (
        <DashboardView
          assignments={assignments}
          employees={employees}
          projects={projects}
          clients={clients}
          onEditAssignment={(a) => setAssignmentModal({ open: true, assignment: a })}
        />
      )}
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

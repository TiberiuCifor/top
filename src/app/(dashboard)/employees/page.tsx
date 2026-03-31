'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useEmployees, useRoles, useAssignments, useProjects } from '@/hooks/useResourceData'
import { EmployeesViewV2 } from '@/components/dashboard/EmployeesViewV2'
import { EmployeeModal } from '@/components/modals/EmployeeModal'
import { RoleModal } from '@/components/modals/RoleModal'
import { usePractices, useSquads } from '@/hooks/useResourceData'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Employee, EmployeeInput, Role, RoleInput, AssignmentInput } from '@/lib/types'

function EmployeesPageInner() {
  const searchParams = useSearchParams()
  const { employees, loading, createEmployee, updateEmployee, deleteEmployee, fetchEmployees } = useEmployees()
  const { roles, loading: rolesLoading, createRole, updateRole, deleteRole, fetchRoles } = useRoles()
  const { assignments, createAssignment, updateAssignment, deleteAssignment } = useAssignments()
  const { projects } = useProjects()
  const { practices } = usePractices()
  const { squads } = useSquads()

  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; employee?: Employee | null }>({ open: false })
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: Role | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: '', id: '', name: '' })

  const [initialFilterCleared, setInitialFilterCleared] = useState(false)

  const initialGroupBy = !initialFilterCleared && searchParams.get('groupBy') === 'allocation' ? 'allocation' as const : undefined
  const initialExpandedGroup = !initialFilterCleared ? searchParams.get('expandedGroup') || undefined : undefined
  const initialShowBenchOnly = !initialFilterCleared ? searchParams.get('bench') === 'true' : undefined

  const handleSaveEmployee = async (data: EmployeeInput) => {
    if (employeeModal.employee) {
      const { error } = await updateEmployee(employeeModal.employee.id, data)
      if (error) toast.error('Failed to update employee')
      else toast.success('Employee updated successfully')
    } else {
      const { error } = await createEmployee(data)
      if (error) toast.error('Failed to create employee')
      else toast.success('Employee created successfully')
    }
  }

  const handleSaveRole = async (data: RoleInput) => {
    if (roleModal.role) {
      const { error } = await updateRole(roleModal.role.id, data)
      if (error) toast.error('Failed to update role')
      else {
        toast.success('Role updated successfully')
        fetchEmployees()
      }
    } else {
      const { error } = await createRole(data)
      if (error) toast.error('Failed to create role')
      else toast.success('Role created successfully')
    }
  }

  const handleSaveAssignment = async (data: AssignmentInput, assignmentId?: string) => {
    if (assignmentId) {
      const { error } = await updateAssignment(assignmentId, data)
      if (error) toast.error('Failed to update assignment')
      else toast.success('Assignment updated successfully')
    } else {
      const { error } = await createAssignment(data)
      if (error) toast.error('Failed to create assignment')
      else toast.success('Assignment created successfully')
    }
  }

  const handleConfirmDelete = async () => {
    const { type, id } = deleteDialog
    let error = null
    if (type === 'employee') {
      const result = await deleteEmployee(id)
      error = result.error
    } else if (type === 'role') {
      const result = await deleteRole(id)
      error = result.error
      if (!error) fetchEmployees()
    }
    if (error) toast.error(`Failed to delete ${type}`)
    else toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`)
    setDeleteDialog({ open: false, type: '', id: '', name: '' })
  }

  const sharedProps = {
    employees,
    roles,
    assignments,
    projects,
    loading,
    rolesLoading,
    onAdd: () => setEmployeeModal({ open: true, employee: null }),
    onEdit: (e: Employee) => setEmployeeModal({ open: true, employee: e }),
    onDelete: (id: string) => {
      const employee = employees.find(e => e.id === id)
      setDeleteDialog({ open: true, type: 'employee', id, name: employee?.full_name || '' })
    },
    onAddRole: () => setRoleModal({ open: true, role: null }),
    onEditRole: (role: Role) => setRoleModal({ open: true, role }),
    onDeleteRole: (id: string) => {
      const role = roles.find(r => r.id === id)
      setDeleteDialog({ open: true, type: 'role', id, name: role?.name || '' })
    },
    onSaveAssignment: handleSaveAssignment,
    onDeleteAssignment: async (id: string) => {
      const { error } = await deleteAssignment(id)
      if (error) toast.error('Failed to delete assignment')
      else toast.success('Assignment deleted successfully')
    },
    initialGroupBy,
    initialExpandedGroup,
    initialShowBenchOnly,
    onClearInitialFilter: () => setInitialFilterCleared(true),
  }

  return (
    <>
        <EmployeesViewV2 {...sharedProps} />
      <EmployeeModal
        open={employeeModal.open}
        onClose={() => setEmployeeModal({ open: false })}
        onSave={handleSaveEmployee}
        employee={employeeModal.employee}
        roles={roles}
        practices={practices}
        squads={squads}
      />
      <RoleModal
        open={roleModal.open}
        onClose={() => setRoleModal({ open: false, role: null })}
        onSave={handleSaveRole}
        role={roleModal.role}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: '', id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type}?</AlertDialogTitle>
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

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesPageInner />
    </Suspense>
  )
}

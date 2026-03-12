'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useLists } from '@/hooks/useResourceData'
import { useEmployees } from '@/hooks/useResourceData'
import { ListsView } from '@/components/dashboard/ListsView'
import { ListModal } from '@/components/modals/ListModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useDashboard } from '@/contexts/DashboardContext'
import type { EmployeeList, EmployeeListInput } from '@/lib/types'

export default function ListsPage() {
  const { currentUser } = useDashboard()
  const { lists, loading, createList, updateList, deleteList } = useLists()
  const { employees } = useEmployees()

  const [modal, setModal] = useState<{ open: boolean; list?: EmployeeList | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; list?: EmployeeList }>({ open: false })

  const handleSave = async (input: EmployeeListInput, employeeIds: string[]) => {
    if (modal.list) {
      const { error } = await updateList(modal.list.id, input, employeeIds)
      if (error) toast.error('Failed to update list')
      else toast.success('List updated')
    } else {
      const { error } = await createList(input, employeeIds)
      if (error) toast.error('Failed to create list')
      else toast.success('List created')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog.list) return
    const { error } = await deleteList(deleteDialog.list.id)
    if (error) toast.error('Failed to delete list')
    else toast.success('List deleted')
    setDeleteDialog({ open: false })
  }

  return (
    <>
      <ListsView
        lists={lists}
        employees={employees}
        loading={loading}
        currentUserId={currentUser?.id ?? null}
        onAdd={() => setModal({ open: true, list: null })}
        onEdit={list => setModal({ open: true, list })}
        onDelete={list => setDeleteDialog({ open: true, list })}
      />

      <ListModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        onSave={handleSave}
        list={modal.list}
        employees={employees}
        currentUserId={currentUser?.id ?? null}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={open => !open && setDeleteDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete list?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.list?.name}&quot;? This will also remove all members and comments.
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

'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useReminders, useUsers } from '@/hooks/useResourceData'
import { useDashboard } from '@/contexts/DashboardContext'
import { RemindersView } from '@/components/dashboard/RemindersView'
import { ReminderModal } from '@/components/modals/ReminderModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Reminder, ReminderInput } from '@/lib/types'

export default function RemindersPage() {
  const { currentUser } = useDashboard()
  const { reminders, loading, createReminder, updateReminder, deleteReminder } = useReminders()
  const { users } = useUsers()
  const [reminderModal, setReminderModal] = useState<{ open: boolean; reminder?: Reminder | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })

  const handleSaveReminder = async (data: ReminderInput) => {
    if (reminderModal.reminder) {
      const { error } = await updateReminder(reminderModal.reminder.id, data)
      if (error) toast.error('Failed to update reminder')
      else toast.success('Reminder updated successfully')
    } else {
      const { error } = await createReminder(data)
      if (error) toast.error('Failed to create reminder')
      else toast.success('Reminder created successfully')
    }
  }

  const handleReminderStatusChange = async (id: string, status: 'New' | 'In Progress' | 'Done') => {
    const { error } = await updateReminder(id, { status })
    if (error) toast.error('Failed to update reminder status')
    else toast.success('Status updated')
  }

  const handleConfirmDelete = async () => {
    const { error } = await deleteReminder(deleteDialog.id)
    if (error) toast.error('Failed to delete reminder')
    else toast.success('Reminder deleted successfully')
    setDeleteDialog({ open: false, id: '', name: '' })
  }

  return (
    <>
      <RemindersView
        reminders={reminders}
        users={users}
        currentUserId={currentUser?.id || null}
        loading={loading}
        onAdd={() => setReminderModal({ open: true, reminder: null })}
        onEdit={(r) => setReminderModal({ open: true, reminder: r })}
        onDelete={(id) => {
          const reminder = reminders.find(r => r.id === id)
          setDeleteDialog({ open: true, id, name: reminder?.description.substring(0, 30) + '...' || '' })
        }}
        onStatusChange={handleReminderStatusChange}
      />
      <ReminderModal
        open={reminderModal.open}
        onClose={() => setReminderModal({ open: false, reminder: null })}
        onSave={handleSaveReminder}
        reminder={reminderModal.reminder}
        users={users}
        currentUserId={currentUser?.id || null}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
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

'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmployees, usePractices, useSquads, useAssignments, useRoles } from '@/hooks/useResourceData'
import { PracticesViewV2 } from '@/components/dashboard/PracticesViewV2'
import { PracticeModal } from '@/components/modals/PracticeModal'
import { SquadModal } from '@/components/modals/SquadModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Practice, PracticeInput, Squad, SquadInput } from '@/lib/types'

export default function PracticesPage() {
  const { employees, updateEmployee } = useEmployees()
  const { roles } = useRoles()
  const { practices, loading, createPractice, updatePractice, deletePractice } = usePractices()
  const { squads, createSquad, updateSquad, deleteSquad } = useSquads()
  const { assignments } = useAssignments()

  const [practiceModal, setPracticeModal] = useState<{ open: boolean; practice?: Practice | null }>({ open: false })
  const [squadModal, setSquadModal] = useState<{ open: boolean; squad?: Squad | null; practiceId?: string }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: '', id: '', name: '' })

  const handleSavePractice = async (data: PracticeInput) => {
    if (practiceModal.practice) {
      const { error } = await updatePractice(practiceModal.practice.id, data)
      if (error) toast.error('Failed to update practice')
      else toast.success('Practice updated successfully')
    } else {
      const { error } = await createPractice(data)
      if (error) toast.error('Failed to create practice')
      else toast.success('Practice created successfully')
    }
  }

  const handleSaveSquad = async (data: SquadInput) => {
    let result;
    if (squadModal.squad) {
      result = await updateSquad(squadModal.squad.id, data)
      if (result.error) toast.error('Failed to update squad')
      else toast.success('Squad updated successfully')
    } else {
      result = await createSquad(data)
      if (result.error) toast.error('Failed to create squad')
      else toast.success('Squad created successfully')
    }

    if (!result.error && data.squad_lead_id) {
      const squadLeadRole = roles.find(r => r.name === 'Squad Lead')
      if (squadLeadRole) {
        await updateEmployee(data.squad_lead_id, {
          practice_role: 'Squad Lead',
          role_id: squadLeadRole.id
        })
      }
    }
  }

  const handleConfirmDelete = async () => {
    const { type, id } = deleteDialog
    let error = null
    if (type === 'practice') {
      const result = await deletePractice(id)
      error = result.error
    } else if (type === 'squad') {
      const result = await deleteSquad(id)
      error = result.error
    }
    if (error) toast.error(`Failed to delete ${type}`)
    else toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`)
    setDeleteDialog({ open: false, type: '', id: '', name: '' })
  }

  const sharedProps = {
    employees,
    practices,
    squads,
    assignments,
    loading,
    onAdd: () => setPracticeModal({ open: true, practice: null }),
    onEdit: (p: Practice) => setPracticeModal({ open: true, practice: p }),
    onDelete: (id: string) => {
      const practice = practices.find(p => p.id === id)
      setDeleteDialog({ open: true, type: 'practice', id, name: practice?.name || '' })
    },
    onAddSquad: (practiceId: string) => setSquadModal({ open: true, squad: null, practiceId }),
    onEditSquad: (squad: Squad) => setSquadModal({ open: true, squad }),
    onDeleteSquad: (id: string) => {
      const squad = squads.find(s => s.id === id)
      setDeleteDialog({ open: true, type: 'squad', id, name: squad?.name || '' })
    },
  }

  return (
      <>
        <PracticesViewV2 {...sharedProps} />
      <PracticeModal
        open={practiceModal.open}
        onClose={() => setPracticeModal({ open: false, practice: null })}
        onSave={handleSavePractice}
        practice={practiceModal.practice}
      />
      <SquadModal
        open={squadModal.open}
        onClose={() => setSquadModal({ open: false, squad: null })}
        onSave={handleSaveSquad}
        squad={squadModal.squad}
        practiceId={squadModal.practiceId}
        employees={employees}
        practices={practices}
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

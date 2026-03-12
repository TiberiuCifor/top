'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useClients, useProjects } from '@/hooks/useResourceData'
import { ClientsViewV2 } from '@/components/dashboard/ClientsViewV2'
import { ClientModalV2 } from '@/components/modals/ClientModalV2'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Client, ClientInput } from '@/lib/types'

export default function ClientsPage() {
  const { clients, loading, createClient: createClientData, updateClient, deleteClient } = useClients()
  const { projects } = useProjects()
  const [clientModal, setClientModal] = useState<{ open: boolean; client?: Client | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })

  const handleSaveClient = async (data: ClientInput) => {
    if (clientModal.client) {
      const { error } = await updateClient(clientModal.client.id, data)
      if (error) toast.error('Failed to update client')
      else toast.success('Client updated successfully')
    } else {
      const { error } = await createClientData(data)
      if (error) toast.error('Failed to create client')
      else toast.success('Client created successfully')
    }
  }

  const handleConfirmDelete = async () => {
    const { error } = await deleteClient(deleteDialog.id)
    if (error) toast.error('Failed to delete client')
    else toast.success('Client deleted successfully')
    setDeleteDialog({ open: false, id: '', name: '' })
  }

  return (
    <>
      <ClientsViewV2
        clients={clients}
        projects={projects}
        loading={loading}
        onAdd={() => setClientModal({ open: true, client: null })}
        onEdit={(c) => setClientModal({ open: true, client: c })}
        onDelete={(id) => {
          const client = clients.find(c => c.id === id)
          setDeleteDialog({ open: true, id, name: client?.name || '' })
        }}
      />
      <ClientModalV2
        open={clientModal.open}
        onClose={() => setClientModal({ open: false })}
        onSave={handleSaveClient}
        client={clientModal.client}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
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

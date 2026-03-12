'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useRoles } from '@/hooks/useResourceData'
import { RoleModal } from '@/components/modals/RoleModal'
import type { Role, RoleInput } from '@/lib/types'
import { ArrowLeft, Plus, Search, MoreHorizontal, Pencil, Trash2, Layers, Briefcase } from 'lucide-react'

export default function RolesPage() {
  const router = useRouter()
  const { roles, loading: rolesLoading, createRole, updateRole, deleteRole } = useRoles()
  const [search, setSearch] = useState('')
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: Role | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(search.toLowerCase()) ||
    (role.description?.toLowerCase() || '').includes(search.toLowerCase())
  )

  const handleSaveRole = async (data: RoleInput) => {
    if (roleModal.role) {
      const { error } = await updateRole(roleModal.role.id, data)
      if (error) toast.error('Failed to update role')
      else toast.success('Role updated successfully')
    } else {
      const { error } = await createRole(data)
      if (error) toast.error('Failed to create role')
      else toast.success('Role created successfully')
    }
  }

  const handleConfirmDelete = async () => {
    const { id } = deleteDialog
    const { error } = await deleteRole(id)
    if (error) toast.error('Failed to delete role')
    else toast.success('Role deleted successfully')
    setDeleteDialog({ open: false, id: '', name: '' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#ea2775] to-[#c01560] shadow-sm">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Manage Roles</h1>
                <p className="text-xs text-muted-foreground">Define roles for your team members</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 lg:px-8 py-6">
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-card border-border rounded-lg text-sm"
              />
            </div>
            <Button
              onClick={() => setRoleModal({ open: true, role: null })}
              size="sm"
              className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm h-8"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Role
            </Button>
          </div>

          {/* Content */}
          {rolesLoading ? (
            <div className="bg-card rounded-xl border border-border">
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
                    <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="text-sm text-muted-foreground">Loading roles...</span>
                </div>
              </div>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="bg-card rounded-xl border border-border">
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-5">
                  <Briefcase className="w-10 h-10 text-violet-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No roles found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {search ? 'Try adjusting your search.' : 'Get started by adding your first role.'}
                </p>
                {!search && (
                  <Button
                    onClick={() => setRoleModal({ open: true, role: null })}
                    size="sm"
                    className="bg-[#ea2775] hover:bg-[#d01e65] text-white"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Role
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                    </th>
                    <th className="w-[52px] px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center shadow-sm shrink-0">
                            <Layers className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-semibold text-sm text-foreground">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{role.description || '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setRoleModal({ open: true, role })} className="gap-2 text-xs">
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog({ open: true, id: role.id, name: role.name })}
                              className="text-destructive gap-2 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{filteredRoles.length}</span> of {roles.length} roles
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <RoleModal
        open={roleModal.open}
        onClose={() => setRoleModal({ open: false, role: null })}
        onSave={handleSaveRole}
        role={roleModal.role}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.name}&quot;? This action cannot be undone. Employees with this role will have their role set to null.
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
    </div>
  )
}

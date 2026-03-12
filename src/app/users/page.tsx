'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { UserModal } from '@/components/modals/UserModal'
import { SetPasswordModal } from '@/components/modals/SetPasswordModal'
import { ArrowLeft, Users as UsersIcon, Plus, Pencil, Trash2, Shield, User as UserIcon, KeyRound, LogOut, Settings, ChevronDown, Briefcase, TrendingUp, Crown, Star, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type * as Types from '@/lib/types'

export default function UsersPage() {
  const [users, setUsers] = useState<Types.User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Types.User | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [userModal, setUserModal] = useState<{ open: boolean; user?: Types.User | null }>({ open: false })
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/auth/login')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (data) {
      setCurrentUser(data)
      if (data.role !== 'admin') {
        toast.error('Access denied: Admin only')
        router.push('/')
      }
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to fetch users')
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleSaveUser = async (data: Types.UserInput & { password?: string }) => {
    if (userModal.user) {
      // Update existing user
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userModal.user.id)

      if (error) {
        toast.error('Failed to update user')
        throw error
      }
      toast.success('User updated successfully')
      } else {
        // Create new user
          try {
            // First create user in Supabase Auth using service role
            const response = await fetch('/api/users/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: data.email,
                password: data.password,
                full_name: data.full_name,
                role: data.role,
              }),
            })

          const result = await response.json()

          if (!response.ok) {
            toast.error(result.error || 'Failed to create user')
            throw new Error(result.error)
          }

          toast.success('User created successfully')
        } catch (error) {
          throw error
        }
      }
    fetchUsers()
  }

  const handleSetPassword = async (newPassword: string) => {
    const { userId } = passwordModal

    try {
      const response = await fetch('/api/users/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword }),
      })

      if (!response.ok) {
        toast.error('Failed to set password')
        throw new Error('Failed to set password')
      }

      toast.success('Password updated successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to set password')
      throw error
    }
  }

  const handleDeleteUser = async () => {
    const { id } = deleteDialog

    if (id === currentUser?.id) {
      toast.error('Cannot delete your own account')
      setDeleteDialog({ open: false, id: '', name: '' })
      return
    }

    try {
      // Call API to delete user from both auth and users table
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })

      if (!response.ok) {
        toast.error('Failed to delete user')
        return
      }

      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
    setDeleteDialog({ open: false, id: '', name: '' })
  }

  const filteredUsers = roleFilter === 'all' 
    ? users 
    : users.filter(user => user.role === roleFilter)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage system users and permissions</p>
            </div>
            <div className="flex items-center gap-3">
              {currentUser && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-auto p-2 hover:bg-accent flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          Hello, <span className="font-medium text-foreground">{currentUser.full_name}</span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Account Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/auth/change-password')}>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Change Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button onClick={() => setUserModal({ open: true, user: null })}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                All Users ({filteredUsers.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">IT Support</SelectItem>
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="practice_lead">Practice Lead</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : user.role === 'project_lead' ? (
                            <Briefcase className="w-4 h-4 text-emerald-600" />
                          ) : user.role === 'sales' ? (
                            <TrendingUp className="w-4 h-4 text-[#ea2775]" />
                          ) : user.role === 'practice_lead' ? (
                            <Star className="w-4 h-4 text-amber-600" />
                          ) : user.role === 'leadership' ? (
                            <Crown className="w-4 h-4 text-purple-600" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="capitalize">{user.role === 'project_lead' ? 'Project Lead' : user.role === 'practice_lead' ? 'Practice Lead' : user.role === 'user' ? 'IT Support' : user.role}</span>
                        </div>
                      </TableCell>
                    <TableCell>
                      {user.must_change_password ? (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Must change password
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUserModal({ open: true, user })}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPasswordModal({ open: true, userId: user.id, userName: user.full_name })
                            }
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({ open: true, id: user.id, name: user.full_name })
                            }
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

        <UserModal
          open={userModal.open}
          onClose={() => setUserModal({ open: false })}
          onSave={handleSaveUser}
          user={userModal.user}
        />

        <SetPasswordModal
          open={passwordModal.open}
          onClose={() => setPasswordModal({ open: false, userId: '', userName: '' })}
          onSave={handleSetPassword}
          userName={passwordModal.userName}
        />

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteDialog.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-white hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}

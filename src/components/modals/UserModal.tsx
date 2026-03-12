'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User, UserInput } from '@/lib/types'

interface UserModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: UserInput) => Promise<void>
  user?: User | null
}

export function UserModal({ open, onClose, onSave, user }: UserModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'user' | 'project_lead' | 'sales' | 'practice_lead' | 'leadership'>('user')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      setEmail(user.email)
      setRole(user.role)
      setPassword('')
    } else {
      setFullName('')
      setEmail('')
      setPassword('')
      setRole('user')
    }
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        full_name: fullName,
        email,
        role,
        password: !user ? password : undefined,
        must_change_password: !user,
      })
      onClose()
    } catch (error) {
      // Error handling done in parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogDescription>
            {user ? 'Update user details' : 'Add a new user to the system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@company.com"
                required
              />
            </div>
              {!user && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    required={!user}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
<Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'user' | 'project_lead' | 'sales' | 'practice_lead' | 'leadership')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : user ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

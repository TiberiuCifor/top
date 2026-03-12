'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers } from 'lucide-react'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      const { data: userData } = await supabase
        .from('users')
        .select('email, must_change_password')
        .eq('id', user.id)
        .single()

      if (userData) {
        setEmail(userData.email)
        setMustChangePassword(userData.must_change_password || false)
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      // First verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      })

      if (signInError) {
        toast.error('Old password is incorrect')
        setLoading(false)
        return
      }

      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (authError) {
        toast.error('Failed to update password')
        setLoading(false)
        return
      }

      // Update user's must_change_password flag
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        toast.error('Failed to update user settings')
        setLoading(false)
        return
      }

      toast.success('Password updated successfully')
      router.push('/')
    } catch (error) {
      toast.error('An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shadow-md">
                <Layers className="w-8 h-8" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Change Password</CardTitle>
              <CardDescription>
                {mustChangePassword 
                  ? 'You must change your password before continuing' 
                  : 'Update your account password'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Old Password</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
              {!mustChangePassword && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => router.push('/')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
            </form>
          </CardContent>
      </Card>
    </div>
  )
}

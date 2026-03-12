'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useEmployeeUpdates } from '@/hooks/useEmployeeUpdates'
import { createClient } from '@/lib/supabase/client'
import type { Employee, User } from '@/lib/types'
import { MessageSquare, Trash2, UserCircle, Send, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface EmployeeUpdateModalProps {
  open: boolean
  onClose: () => void
  employee: Employee | null
  onUpdateAdded?: () => void
}

export function EmployeeUpdateModal({ open, onClose, employee, onUpdateAdded }: EmployeeUpdateModalProps) {
  const [newUpdate, setNewUpdate] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { updates, loading, createUpdate, deleteUpdate } = useEmployeeUpdates(employee?.id)
  const supabase = createClient()

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        if (userData) {
          setCurrentUser(userData)
        }
      }
    }
    fetchCurrentUser()
  }, [supabase])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || !newUpdate.trim()) return

    const { error } = await createUpdate({
      employee_id: employee.id,
      update_text: newUpdate.trim(),
      created_by: currentUser?.full_name || null
    })

    if (error) {
      toast.error('Failed to add update')
    } else {
      toast.success('Update added successfully')
      setNewUpdate('')
      onUpdateAdded?.()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await deleteUpdate(id)
    if (error) {
      toast.error('Failed to delete update')
    } else {
      toast.success('Update deleted')
      onUpdateAdded?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              Updates for {employee?.full_name}
            </DialogTitle>
            {employee && (
              <p className="text-violet-100 text-sm mt-1">
                {updates.length} update{updates.length !== 1 ? 's' : ''} recorded
              </p>
            )}
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-3 mb-6">
            <div className="relative">
              <Textarea
                placeholder="Add a comment or update..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                rows={3}
                className="resize-none bg-card border-border focus:border-violet-400 focus:ring-violet-400/20 rounded-lg pr-4"
              />
            </div>
            <Button
              type="submit"
              disabled={!newUpdate.trim()}
              className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm"
              size="sm"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Add Update
            </Button>
          </form>

          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Previous Updates</h3>
              {updates.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 rounded-full">
                  {updates.length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-violet-200 dark:border-violet-800 rounded-full" />
                      <div className="absolute inset-0 w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <span className="text-xs text-muted-foreground">Loading updates...</span>
                  </div>
                </div>
              ) : updates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 mb-3">
                    <MessageSquare className="w-6 h-6 text-violet-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">No updates yet</p>
                </div>
              ) : (
                updates.map((update) => (
                  <div key={update.id} className="group bg-card border border-border rounded-xl p-4 hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <p className="text-sm flex-1 whitespace-pre-wrap break-words text-foreground leading-relaxed">{update.update_text}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(update.id)}
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/50">
                      {update.created_by && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">{update.created_by.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground/80">{update.created_by}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {update.created_by && '· '}
                        {new Date(update.created_at).toLocaleString('en', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

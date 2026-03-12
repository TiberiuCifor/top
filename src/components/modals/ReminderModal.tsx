'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Reminder, ReminderInput, User } from '@/lib/types'
import { Building2, Briefcase, Users, Layers, HelpCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface ReminderModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: ReminderInput) => Promise<void>
  reminder?: Reminder | null
  users: User[]
  currentUserId: string | null
}

export function ReminderModal({ open, onClose, onSave, reminder, users, currentUserId }: ReminderModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ReminderInput>({
    date: new Date().toISOString().split('T')[0],
    topic: 'Other',
    description: '',
    owner_id: currentUserId,
    priority: 'Medium',
    status: 'New',
  })

  useEffect(() => {
    if (reminder) {
      setFormData({
        date: reminder.date,
        topic: reminder.topic,
        description: reminder.description,
        owner_id: reminder.owner_id,
        priority: reminder.priority,
        status: reminder.status,
      })
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        topic: 'Other',
        description: '',
        owner_id: currentUserId,
        priority: 'Medium',
        status: 'New',
      })
    }
  }, [reminder, open, currentUserId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{reminder ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Select 
                value={formData.topic} 
                onValueChange={(v) => setFormData({ ...formData, topic: v as ReminderInput['topic'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clients">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#ea2775]" />
                      Clients
                    </div>
                  </SelectItem>
                  <SelectItem value="Projects">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      Projects
                    </div>
                  </SelectItem>
                  <SelectItem value="Employees">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      Employees
                    </div>
                  </SelectItem>
                  <SelectItem value="Practices">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-orange-600" />
                      Practices
                    </div>
                  </SelectItem>
                  <SelectItem value="Other">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-600" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v as ReminderInput['priority'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="Low">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#ea2775]" />
                      Low
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner *</Label>
            <Select 
              value={formData.owner_id || ''} 
              onValueChange={(v) => setFormData({ ...formData, owner_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter the reminder details..."
              className="min-h-[150px] resize-y"
              required
            />
          </div>

          {reminder && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v as ReminderInput['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.description || !formData.owner_id}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

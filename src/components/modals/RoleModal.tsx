'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Role, RoleInput } from '@/lib/types'
import { Layers, Loader2, Save } from 'lucide-react'

const inputClass = 'h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all'
const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider'

interface RoleModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: RoleInput) => Promise<void>
  role?: Role | null
}

export function RoleModal({ open, onClose, onSave, role }: RoleModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<RoleInput>({ name: '', description: null })

  useEffect(() => {
    if (role) {
      setFormData({ name: role.name, description: role.description })
    } else {
      setFormData({ name: '', description: null })
    }
  }, [role, open])

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
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-xl border-border">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">
                  {role ? 'Edit Role' : 'New Role'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-white/60 text-xs mt-0.5">
                {role ? 'Update role details below' : 'Define a new role for your team'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className={labelClass}>
              Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter role name"
                className={`${inputClass} pl-10`}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className={labelClass}>Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              rows={3}
              placeholder="Brief description of this role..."
              className="bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="bg-[#ea2775] hover:bg-[#d01e65] text-white rounded-lg h-9 px-5 text-sm shadow-sm min-w-[110px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {role ? 'Update' : 'Add Role'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

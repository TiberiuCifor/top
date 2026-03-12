'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layers } from 'lucide-react'
import type { Practice, PracticeInput } from '@/lib/types'

interface PracticeModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: PracticeInput) => Promise<void>
  practice?: Practice | null
}

export function PracticeModal({ open, onClose, onSave, practice }: PracticeModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PracticeInput>({
    name: '',
  })

  useEffect(() => {
    if (practice) {
      setFormData({
        name: practice.name,
      })
    } else {
      setFormData({
        name: '',
      })
    }
  }, [practice, open])

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
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-border/60 shadow-xl">
        <div className="bg-gradient-to-r from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{practice ? 'Edit Practice' : 'Add Practice'}</h2>
              <p className="text-sm text-white/70">
                {practice ? 'Update practice details' : 'Create a new practice area'}
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice Name *</Label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Data, AI, Software Engineering"
                className="pl-9 h-10 bg-muted/30 border-border/50 focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border/60">Cancel</Button>
            <Button
              type="submit"
              disabled={loading || !formData.name}
              className="bg-gradient-to-r from-[#ea2775] to-[#c01560] hover:from-[#d01e65] hover:to-[#a8114e] text-white border-0 shadow-md"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

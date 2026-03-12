'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutGrid, Layers, UserCheck } from 'lucide-react'
import type { Squad, SquadInput, Employee, Practice } from '@/lib/types'

interface SquadModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: SquadInput) => Promise<void>
  squad?: Squad | null
  practiceId?: string
  employees: Employee[]
  practices: Practice[]
}

export function SquadModal({ open, onClose, onSave, squad, practiceId, employees, practices }: SquadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<SquadInput>({
    name: '',
    practice_id: '',
    squad_lead_id: null,
  })

  useEffect(() => {
    if (squad) {
      setFormData({
        name: squad.name,
        practice_id: squad.practice_id,
        squad_lead_id: squad.squad_lead_id,
      })
    } else {
      setFormData({
        name: '',
        practice_id: practiceId || (practices[0]?.id ?? ''),
        squad_lead_id: null,
      })
    }
  }, [squad, practiceId, open, practices])

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

  const practiceEmployees = employees.filter(e =>
    e.practice_id === formData.practice_id &&
    (e.status === 'Active' || e.id === formData.squad_lead_id)
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-border/60 shadow-xl">
        <div className="bg-gradient-to-r from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{squad ? 'Edit Squad' : 'Add Squad'}</h2>
              <p className="text-sm text-white/70">
                {squad ? 'Update squad configuration' : 'Create a new squad within a practice'}
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="practice" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice *</Label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
              <Select
                value={formData.practice_id}
                onValueChange={(v) => setFormData({ ...formData, practice_id: v })}
                disabled={!!practiceId}
              >
                <SelectTrigger className="pl-9 h-10 bg-muted/30 border-border/50 focus:border-violet-400 dark:focus:border-violet-500 transition-colors">
                  <SelectValue placeholder="Select practice" />
                </SelectTrigger>
                <SelectContent>
                  {practices.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Squad Name *</Label>
            <div className="relative">
              <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Frontend Team, AI Research"
                className="pl-9 h-10 bg-muted/30 border-border/50 focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="squad_lead" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Squad Lead</Label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
              <Select
                value={formData.squad_lead_id ?? 'none'}
                onValueChange={(v) => setFormData({ ...formData, squad_lead_id: v === 'none' ? null : v })}
              >
                <SelectTrigger className="pl-9 h-10 bg-muted/30 border-border/50 focus:border-violet-400 dark:focus:border-violet-500 transition-colors">
                  <SelectValue placeholder="Select squad lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {practiceEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border/60">Cancel</Button>
            <Button
              type="submit"
              disabled={loading || !formData.name || !formData.practice_id}
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

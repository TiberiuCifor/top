'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Client, ClientInput } from '@/lib/types'
import { Building2, Mail, Phone, Factory, Loader2, Save, X } from 'lucide-react'

interface ClientModalV2Props {
  open: boolean
  onClose: () => void
  onSave: (data: ClientInput) => Promise<void>
  client?: Client | null
}

export function ClientModalV2({ open, onClose, onSave, client }: ClientModalV2Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ClientInput>({
    name: '',
    industry: null,
    contact_email: null,
    contact_phone: null,
    status: 'active',
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        industry: client.industry,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone,
        status: client.status,
      })
    } else {
      setFormData({
        name: '',
        industry: null,
        contact_email: null,
        contact_phone: null,
        status: 'active',
      })
    }
  }, [client, open])

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
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-xl border-border">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">
                  {client ? 'Edit Client' : 'New Client'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-white/60 text-xs mt-0.5">
                {client ? 'Update client details below' : 'Fill in the details to add a new client'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter client name"
                className="pl-10 h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all"
                required
              />
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <Label htmlFor="industry" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Industry
            </Label>
            <div className="relative">
              <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                id="industry"
                value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value || null })}
                placeholder="e.g. Technology, Finance, Healthcare"
                className="pl-10 h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all"
              />
            </div>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value || null })}
                  placeholder="email@company.com"
                  className="pl-10 h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  id="contact_phone"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value || null })}
                  placeholder="+1 234 567 890"
                  className="pl-10 h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </Label>
            <Select value={formData.status || 'active'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="h-10 bg-muted/30 border-border focus:ring-1 focus:ring-violet-500/50 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Inactive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name}
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
                  {client ? 'Update' : 'Add Client'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

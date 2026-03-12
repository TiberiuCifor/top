'use client'

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectRagStatus, ProjectRagStatusInput } from "@/lib/types"
import { Calendar, UserCheck, Trophy, TriangleAlert, ListChecks, MessageSquare, Save, Trash2, Users, Star, Info } from "lucide-react"
import { format } from 'date-fns'

interface ProjectStatusDetailModalProps {
  open: boolean
  onClose: () => void
  status: ProjectRagStatus | null
  onSave?: (id: string, data: Partial<ProjectRagStatusInput>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const ragColors = {
  R: 'bg-rose-500 hover:bg-rose-600',
  A: 'bg-amber-500 hover:bg-amber-600',
  G: 'bg-emerald-500 hover:bg-emerald-600',
}

const scoreColors = (score: number) => {
  const colors = [
    'text-rose-600 bg-rose-50 border-rose-100',
    'text-orange-600 bg-orange-50 border-orange-100',
    'text-amber-600 bg-amber-50 border-amber-100',
    'text-lime-600 bg-lime-50 border-lime-100',
    'text-emerald-600 bg-emerald-50 border-emerald-100',
  ]
  const val = Math.max(1, Math.min(5, Math.floor(score || 1)))
  return colors[val - 1] || 'text-muted-foreground bg-background border-border'
}

export function ProjectStatusDetailModal({ open, onClose, status, onSave, onDelete }: ProjectStatusDetailModalProps) {
  const [formData, setFormData] = useState<Partial<ProjectRagStatusInput>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status) {
      setFormData({
        team_score: status.team_score,
        client_score: status.client_score,
        rag_score: status.rag_score,
        important_updates: status.important_updates || '',
        important_achievements: status.important_achievements || '',
        top_performers: status.top_performers || '',
        concerns_risks: status.concerns_risks || '',
        action_items: status.action_items || '',
      })
    }
  }, [status])

  if (!status) return null

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy')
    } catch (e) {
      return 'Invalid Date'
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    await onSave(status.id, formData)
    setIsSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[1400px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl gap-0 bg-card">
        <DialogHeader className="p-6 md:p-8 bg-card border-b border-border shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-muted p-4 rounded-2xl border border-border shadow-sm">
                <Calendar className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">Status Update Details</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium mt-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  Logged on {formatDate(status.created_at)}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center bg-background border border-border rounded-2xl p-2 px-5 shadow-inner gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Team</span>
                  <Select 
                    value={formData.team_score?.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, team_score: parseInt(v) })}
                  >
                    <SelectTrigger className={`h-8 w-16 font-bold text-base border-none focus:ring-0 bg-transparent ${scoreColors(formData.team_score || 0).split(' ')[0]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <SelectItem key={s} value={s.toString()} className="font-bold">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-px h-8 bg-muted" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Client</span>
                  <Select 
                    value={formData.client_score?.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, client_score: parseInt(v) })}
                  >
                    <SelectTrigger className={`h-8 w-16 font-bold text-base border-none focus:ring-0 bg-transparent ${scoreColors(formData.client_score || 0).split(' ')[0]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <SelectItem key={s} value={s.toString()} className="font-bold">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Select 
                value={formData.rag_score} 
                onValueChange={(v) => setFormData({ ...formData, rag_score: v as 'R' | 'A' | 'G' })}
              >
                <SelectTrigger className={`${ragColors[formData.rag_score as 'R' | 'A' | 'G'] || ''} text-white w-48 h-14 px-6 text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200 rounded-2xl border-none transition-all hover:scale-[1.02]`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="G" className="font-bold text-emerald-600">Green (Healthy)</SelectItem>
                  <SelectItem value="A" className="font-bold text-amber-600">Amber (At Risk)</SelectItem>
                  <SelectItem value="R" className="font-bold text-rose-600">Red (Critical)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>
  
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10 space-y-10 max-w-[1300px] mx-auto">
            {/* Top Row: Primary Updates and Risks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="bg-primary/10 p-2.5 rounded-xl">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Important Updates</Label>
                </div>
                <Textarea 
                  className="min-h-[220px] bg-card border-border rounded-2xl p-6 text-[15px] leading-relaxed font-medium text-foreground shadow-sm focus:ring-primary/20 transition-all"
                    value={formData.important_updates ?? ''}
                  onChange={(e) => setFormData({ ...formData, important_updates: e.target.value })}
                  placeholder="Describe recent project developments..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    <TriangleAlert className="w-5 h-5 text-rose-600" />
                  </div>
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Risks & Concerns</Label>
                </div>
                <Textarea 
                  className="min-h-[220px] bg-rose-50/10 border-rose-100 rounded-2xl p-6 text-[15px] leading-relaxed font-medium text-foreground/80 shadow-sm focus:ring-rose-200 transition-all"
                    value={formData.concerns_risks ?? ''}
                  onChange={(e) => setFormData({ ...formData, concerns_risks: e.target.value })}
                  placeholder="Detail any red flags or blockers..."
                />
              </div>
            </div>

            {/* Bottom Row: Wins, Actions, People */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                  </div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Achievements</Label>
                </div>
                <Textarea 
                  className="min-h-[160px] bg-card border-border rounded-2xl p-5 text-sm font-medium text-muted-foreground shadow-sm"
                    value={formData.important_achievements ?? ''}
                  onChange={(e) => setFormData({ ...formData, important_achievements: e.target.value })}
                  placeholder="Wins this period?"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
                    <ListChecks className="w-4 h-4 text-amber-600" />
                  </div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action Items</Label>
                </div>
                <Textarea 
                  className="min-h-[160px] bg-card border-border rounded-2xl p-5 text-sm font-medium text-muted-foreground shadow-sm"
                    value={formData.action_items ?? ''}
                  onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                  placeholder="Immediate next steps..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="bg-[#ea2775]/10 p-2 rounded-xl border border-[#ea2775]/20">
                    <Users className="w-4 h-4 text-[#ea2775]" />
                  </div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recognition</Label>
                </div>
                <Textarea 
                  className="min-h-[160px] bg-card border-border rounded-2xl p-5 text-sm font-medium text-muted-foreground shadow-sm"
                    value={formData.top_performers ?? ''}
                  onChange={(e) => setFormData({ ...formData, top_performers: e.target.value })}
                  placeholder="Top performers?"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 md:p-8 bg-card border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 sm:justify-between">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            {onDelete && (
              <Button 
                onClick={() => onDelete(status.id)} 
                variant="ghost" 
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold uppercase tracking-widest text-[10px] h-11 px-5 rounded-xl gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove Entry
              </Button>
            )}
            <div className="hidden md:flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Modified entries will update project history logs</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
            <Button onClick={onClose} variant="ghost" className="px-8 h-12 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-muted transition-colors">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-10 h-12 font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 rounded-xl gap-2 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

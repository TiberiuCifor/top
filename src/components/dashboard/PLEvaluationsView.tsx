'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'
import type { Employee, PLEvaluation, PLEvaluationInput } from '@/lib/types'
import { Plus, MoreHorizontal, Pencil, Trash2, Users, ClipboardList, X, ChevronRight } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

type Score = 'G' | 'Y' | 'R'

const DIMENSIONS = [
  {
    key: 'dim1',
    label: 'People Development',
    shortLabel: 'People Dev',
    color: 'violet',
    description: 'Growth plans, SL coaching and team development',
  },
  {
    key: 'dim2',
    label: 'Technical Standards',
    shortLabel: 'Tech Std',
    color: 'blue',
    description: 'Projects following practice standards without exceptions',
  },
  {
    key: 'dim3',
    label: 'Practice Health',
    shortLabel: 'Pract. Health',
    color: 'emerald',
    description: 'Attrition, engagement, and team wellness',
  },
  {
    key: 'dim4',
    label: 'Pre-Sales',
    shortLabel: 'Pre-Sales',
    color: 'amber',
    description: 'Scoping calls, proposal reviews, client sessions',
  },
  {
    key: 'dim5',
    label: 'Content & AI',
    shortLabel: 'Content & AI',
    color: 'rose',
    description: 'Content production and AI development exploration',
  },
] as const

function ScoreBadge({ score, compact = false }: { score: Score | null; compact?: boolean }) {
  if (!score) return <span className="text-muted-foreground/40 text-xs">—</span>
  const cfg: Record<Score, string> = {
    G: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Y: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    R: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  }
  const dotColor: Record<Score, string> = { G: 'bg-emerald-500', Y: 'bg-amber-500', R: 'bg-rose-500' }
  const label: Record<Score, string> = { G: 'Green', Y: 'Yellow', R: 'Red' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${cfg[score]} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}>
      <span className={`rounded-full flex-shrink-0 ${dotColor[score]} ${compact ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5'}`} />
      {label[score]}
    </span>
  )
}

function ScoreSelector({ value, onChange }: { value: Score | null; onChange: (v: Score) => void }) {
  const options: { score: Score; label: string; active: string; inactive: string }[] = [
    { score: 'G', label: 'Green', active: 'bg-emerald-500 text-white shadow-sm', inactive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50' },
    { score: 'Y', label: 'Yellow', active: 'bg-amber-500 text-white shadow-sm', inactive: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50' },
    { score: 'R', label: 'Red', active: 'bg-rose-500 text-white shadow-sm', inactive: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50' },
  ]
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt.score}
          type="button"
          onClick={() => onChange(opt.score)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${value === opt.score ? opt.active : opt.inactive}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface FormState {
  practice_lead_id: string
  month: string
  dim1_score: Score | null
  dim1_evidence: string
  dim1_growth_plan_current: string
  dim1_growth_plan_total: string
  dim1_sl_work: string
  dim2_score: Score | null
  dim2_evidence: string
  dim2_projects_compliant: string
  dim2_projects_total: string
  dim3_score: Score | null
  dim3_evidence: string
  dim3_attrition_concerns: string
  dim4_score: Score | null
  dim4_evidence: string
  dim4_scoping_calls: string
  dim4_proposal_reviews: string
  dim4_client_sessions: string
  dim5_score: Score | null
  dim5_evidence: string
  dim5_content: string
  dim5_ai_development: string
  overall_notes: string
}

function emptyForm(month: string, leadId = ''): FormState {
  return {
    practice_lead_id: leadId,
    month,
    dim1_score: null, dim1_evidence: '', dim1_growth_plan_current: '', dim1_growth_plan_total: '', dim1_sl_work: '',
    dim2_score: null, dim2_evidence: '', dim2_projects_compliant: '', dim2_projects_total: '',
    dim3_score: null, dim3_evidence: '', dim3_attrition_concerns: '',
    dim4_score: null, dim4_evidence: '', dim4_scoping_calls: '', dim4_proposal_reviews: '', dim4_client_sessions: '',
    dim5_score: null, dim5_evidence: '', dim5_content: '', dim5_ai_development: '',
    overall_notes: '',
  }
}

function evalToForm(ev: PLEvaluation): FormState {
  return {
    practice_lead_id: ev.practice_lead_id,
    month: ev.month.slice(0, 7), // YYYY-MM
    dim1_score: ev.dim1_score,
    dim1_evidence: ev.dim1_evidence || '',
    dim1_growth_plan_current: ev.dim1_growth_plan_current?.toString() || '',
    dim1_growth_plan_total: ev.dim1_growth_plan_total?.toString() || '',
    dim1_sl_work: ev.dim1_sl_work || '',
    dim2_score: ev.dim2_score,
    dim2_evidence: ev.dim2_evidence || '',
    dim2_projects_compliant: ev.dim2_projects_compliant?.toString() || '',
    dim2_projects_total: ev.dim2_projects_total?.toString() || '',
    dim3_score: ev.dim3_score,
    dim3_evidence: ev.dim3_evidence || '',
    dim3_attrition_concerns: ev.dim3_attrition_concerns || '',
    dim4_score: ev.dim4_score,
    dim4_evidence: ev.dim4_evidence || '',
    dim4_scoping_calls: ev.dim4_scoping_calls?.toString() || '',
    dim4_proposal_reviews: ev.dim4_proposal_reviews?.toString() || '',
    dim4_client_sessions: ev.dim4_client_sessions?.toString() || '',
    dim5_score: ev.dim5_score,
    dim5_evidence: ev.dim5_evidence || '',
    dim5_content: ev.dim5_content || '',
    dim5_ai_development: ev.dim5_ai_development || '',
    overall_notes: ev.overall_notes || '',
  }
}

function formToInput(f: FormState): PLEvaluationInput {
  const monthDate = f.month + '-01'
  return {
    practice_lead_id: f.practice_lead_id,
    month: monthDate,
    dim1_score: f.dim1_score,
    dim1_evidence: f.dim1_evidence || null,
    dim1_growth_plan_current: f.dim1_growth_plan_current ? Number(f.dim1_growth_plan_current) : null,
    dim1_growth_plan_total: f.dim1_growth_plan_total ? Number(f.dim1_growth_plan_total) : null,
    dim1_sl_work: f.dim1_sl_work || null,
    dim2_score: f.dim2_score,
    dim2_evidence: f.dim2_evidence || null,
    dim2_projects_compliant: f.dim2_projects_compliant ? Number(f.dim2_projects_compliant) : null,
    dim2_projects_total: f.dim2_projects_total ? Number(f.dim2_projects_total) : null,
    dim3_score: f.dim3_score,
    dim3_evidence: f.dim3_evidence || null,
    dim3_attrition_concerns: f.dim3_attrition_concerns || null,
    dim4_score: f.dim4_score,
    dim4_evidence: f.dim4_evidence || null,
    dim4_scoping_calls: f.dim4_scoping_calls ? Number(f.dim4_scoping_calls) : null,
    dim4_proposal_reviews: f.dim4_proposal_reviews ? Number(f.dim4_proposal_reviews) : null,
    dim4_client_sessions: f.dim4_client_sessions ? Number(f.dim4_client_sessions) : null,
    dim5_score: f.dim5_score,
    dim5_evidence: f.dim5_evidence || null,
    dim5_content: f.dim5_content || null,
    dim5_ai_development: f.dim5_ai_development || null,
    overall_notes: f.overall_notes || null,
    created_by: null,
  }
}

interface EvalModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: PLEvaluationInput) => Promise<void>
  evaluation: PLEvaluation | null
  practiceLead: Employee | null // pre-selected lead
  month: string // YYYY-MM pre-selected
  practiceLeds: Employee[]
}

function EvalModal({ open, onClose, onSave, evaluation, practiceLead, month, practiceLeds }: EvalModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    evaluation ? evalToForm(evaluation) : emptyForm(month, practiceLead?.id || '')
  )
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<number>(0)

  React.useEffect(() => {
    if (open) {
      setForm(evaluation ? evalToForm(evaluation) : emptyForm(month, practiceLead?.id || ''))
      setActiveSection(0)
    }
  }, [open, evaluation, month, practiceLead])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.practice_lead_id || !form.month) return
    setSaving(true)
    try {
      await onSave(formToInput(form))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    {
      title: '1. People Development',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">100% growth plans current. Bi-weekly 1:1s with Squad Leads with documented development goals.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label>
            <ScoreSelector value={form.dim1_score} onChange={v => set('dim1_score', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label>
            <Textarea value={form.dim1_evidence} onChange={e => set('dim1_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence for this score..." />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">How many engineers have a current growth plan?</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.dim1_growth_plan_current} onChange={e => set('dim1_growth_plan_current', e.target.value)} className="w-24 text-sm h-9" placeholder="Current" />
              <span className="text-muted-foreground text-sm">/</span>
              <Input type="number" min="0" value={form.dim1_growth_plan_total} onChange={e => set('dim1_growth_plan_total', e.target.value)} className="w-24 text-sm h-9" placeholder="Total" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">What did you work on with each SL this month?</Label>
            <Textarea value={form.dim1_sl_work} onChange={e => set('dim1_sl_work', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe SL coaching activities..." />
          </div>
        </div>
      ),
    },
    {
      title: '2. Technical Standards',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">All active projects follow practice standards. No critical architecture decisions without PL review.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label>
            <ScoreSelector value={form.dim2_score} onChange={v => set('dim2_score', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label>
            <Textarea value={form.dim2_evidence} onChange={e => set('dim2_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence for this score..." />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">How many projects followed practice standards without exceptions?</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.dim2_projects_compliant} onChange={e => set('dim2_projects_compliant', e.target.value)} className="w-24 text-sm h-9" placeholder="Compliant" />
              <span className="text-muted-foreground text-sm">/</span>
              <Input type="number" min="0" value={form.dim2_projects_total} onChange={e => set('dim2_projects_total', e.target.value)} className="w-24 text-sm h-9" placeholder="Total" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '3. Practice Health',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Voluntary attrition &lt;10%. eNPS at or above company avg. No surprise departures. Concerns surfaced proactively.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label>
            <ScoreSelector value={form.dim3_score} onChange={v => set('dim3_score', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label>
            <Textarea value={form.dim3_evidence} onChange={e => set('dim3_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence for this score..." />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Any attrition or engagement concerns this month? Details:</Label>
            <Textarea value={form.dim3_attrition_concerns} onChange={e => set('dim3_attrition_concerns', e.target.value)} rows={2} className="text-sm resize-none" placeholder="List any concerns or write 'None'..." />
          </div>
        </div>
      ),
    },
    {
      title: '4. Pre-Sales Contribution',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Contributed to 1+ scoping call, proposal review, or client technical session this month.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label>
            <ScoreSelector value={form.dim4_score} onChange={v => set('dim4_score', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label>
            <Textarea value={form.dim4_evidence} onChange={e => set('dim4_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence for this score..." />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Pre-sales activities this month</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">Scoping calls</Label>
                <Input type="number" min="0" value={form.dim4_scoping_calls} onChange={e => set('dim4_scoping_calls', e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">Proposal reviews</Label>
                <Input type="number" min="0" value={form.dim4_proposal_reviews} onChange={e => set('dim4_proposal_reviews', e.target.value)} className="text-sm h-9" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block">Client sessions</Label>
                <Input type="number" min="0" value={form.dim4_client_sessions} onChange={e => set('dim4_client_sessions', e.target.value)} className="text-sm h-9" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '5. Content & AI Fluency',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Practice produced 1+ piece of content (post, talk, case study input). PL explored or applied 1+ relevant AI development.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label>
            <ScoreSelector value={form.dim5_score} onChange={v => set('dim5_score', v)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label>
            <Textarea value={form.dim5_evidence} onChange={e => set('dim5_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence for this score..." />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">What content did your practice produce this month?</Label>
            <Textarea value={form.dim5_content} onChange={e => set('dim5_content', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Blog posts, talks, documentation, etc..." />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">What AI development did you explore?</Label>
            <Textarea value={form.dim5_ai_development} onChange={e => set('dim5_ai_development', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Tools, experiments, learnings..." />
          </div>
        </div>
      ),
    },
  ]

  const isNew = !evaluation

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add' : 'Edit'} Practice Lead Evaluation</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-5 py-2">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Practice Lead</Label>
                {isNew ? (
                  <Select value={form.practice_lead_id} onValueChange={v => set('practice_lead_id', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select practice lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {practiceLeds.map(pl => (
                        <SelectItem key={pl.id} value={pl.id}>{pl.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/50 border border-border">
                    <EmployeeAvatar name={evaluation?.practice_lead?.full_name || ''} photoUrl={evaluation?.practice_lead?.photo_url} size="sm" />
                    <span className="text-sm font-medium">{evaluation?.practice_lead?.full_name}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Month</Label>
                {isNew ? (
                  <Input
                    type="month"
                    value={form.month}
                    onChange={e => set('month', e.target.value)}
                    className="h-9 text-sm"
                  />
                ) : (
                  <div className="flex items-center h-9 px-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-sm font-medium">
                      {new Date(form.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dimension sections */}
            <div className="space-y-2">
              {sections.map((section, idx) => (
                <div key={idx} className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setActiveSection(activeSection === idx ? -1 : idx)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${activeSection === idx ? 'bg-violet-50 dark:bg-violet-950/30' : 'bg-card hover:bg-muted/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${activeSection === idx ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}>
                        {section.title}
                      </span>
                      {/* Show current score chip in collapsed state */}
                      {activeSection !== idx && (() => {
                        const scoreKey = `dim${idx + 1}_score` as keyof FormState
                        const score = form[scoreKey] as Score | null
                        return score ? <ScoreBadge score={score} /> : null
                      })()}
                    </div>
                    <svg className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === idx ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {activeSection === idx && (
                    <div className="px-4 pb-4 pt-3 border-t border-border bg-card">
                      {section.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overall notes */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Overall Notes</Label>
              <Textarea
                value={form.overall_notes}
                onChange={e => set('overall_notes', e.target.value)}
                rows={2}
                className="text-sm resize-none"
                placeholder="Any additional notes or context for this month's evaluation..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.practice_lead_id || !form.month}
            className="bg-[#ea2775] hover:bg-[#d01e65] text-white"
          >
            {saving ? 'Saving...' : isNew ? 'Add Monthly Checkin' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail view ───
const DIM_COLORS: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  dim1: { bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-800/50', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-500' },
  dim2: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800/50', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  dim3: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/50', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  dim4: { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/50', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  dim5: { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800/50', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-500' },
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  )
}

interface EvalDetailViewProps {
  open: boolean
  evaluation: PLEvaluation | null
  practiceLed: Employee | null
  onClose: () => void
  onEdit: () => void
  readOnly?: boolean
}

function EvalDetailView({ open, evaluation: ev, practiceLed: pl, onClose, onEdit, readOnly = false }: EvalDetailViewProps) {
  if (!ev) return null

  const monthLabel = new Date(ev.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  const dimDetails: { dim: typeof DIMENSIONS[number]; score: Score | null; goodLooksLike: string; fields: { label: string; value: string | number | null | undefined }[] }[] = [
    {
      dim: DIMENSIONS[0],
      score: ev.dim1_score,
      goodLooksLike: '100% growth plans current. Bi-weekly 1:1s with Squad Leads with documented development goals.',
      fields: [
        { label: 'Evidence', value: ev.dim1_evidence },
        { label: 'Growth plans', value: (ev.dim1_growth_plan_current != null && ev.dim1_growth_plan_total != null) ? `${ev.dim1_growth_plan_current} / ${ev.dim1_growth_plan_total} engineers` : ev.dim1_growth_plan_current != null ? `${ev.dim1_growth_plan_current} engineers` : null },
        { label: 'SL work this month', value: ev.dim1_sl_work },
      ],
    },
    {
      dim: DIMENSIONS[1],
      score: ev.dim2_score,
      goodLooksLike: 'All active projects follow practice standards. No critical architecture decisions without PL review.',
      fields: [
        { label: 'Evidence', value: ev.dim2_evidence },
        { label: 'Projects following standards', value: (ev.dim2_projects_compliant != null && ev.dim2_projects_total != null) ? `${ev.dim2_projects_compliant} / ${ev.dim2_projects_total} projects` : ev.dim2_projects_compliant != null ? `${ev.dim2_projects_compliant} projects` : null },
      ],
    },
    {
      dim: DIMENSIONS[2],
      score: ev.dim3_score,
      goodLooksLike: 'Voluntary attrition <10%. eNPS at or above company avg. No surprise departures. Concerns surfaced proactively.',
      fields: [
        { label: 'Evidence', value: ev.dim3_evidence },
        { label: 'Attrition / engagement concerns', value: ev.dim3_attrition_concerns },
      ],
    },
    {
      dim: DIMENSIONS[3],
      score: ev.dim4_score,
      goodLooksLike: 'Contributed to 1+ scoping call, proposal review, or client technical session this month.',
      fields: [
        { label: 'Evidence', value: ev.dim4_evidence },
        { label: 'Scoping calls', value: ev.dim4_scoping_calls },
        { label: 'Proposal reviews', value: ev.dim4_proposal_reviews },
        { label: 'Client sessions', value: ev.dim4_client_sessions },
      ],
    },
    {
      dim: DIMENSIONS[4],
      score: ev.dim5_score,
      goodLooksLike: 'Practice produced 1+ piece of content (post, talk, case study input). PL explored or applied 1+ relevant AI development.',
      fields: [
        { label: 'Evidence', value: ev.dim5_evidence },
        { label: 'Content produced', value: ev.dim5_content },
        { label: 'AI development explored', value: ev.dim5_ai_development },
      ],
    },
  ]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent showCloseButton={false} className="!max-w-none w-[92vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            {pl && <EmployeeAvatar name={pl.full_name} photoUrl={pl.photo_url} size="lg" />}
            <div>
              <h2 className="text-lg font-bold text-foreground">{pl?.full_name ?? 'Practice Lead'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {pl?.practice?.name && (
                  <span className="text-sm text-muted-foreground">{pl.practice.name}</span>
                )}
                {pl?.practice?.name && <span className="text-muted-foreground/40">·</span>}
                <span className="text-sm font-semibold text-[#ea2775]">{monthLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={onEdit} className="h-8 gap-1.5 text-xs">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Score summary strip — no scroll, wraps if needed */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 px-6 py-3 bg-muted/30 border-b border-border">
          {DIMENSIONS.map(d => {
            const scoreKey = `${d.key}_score` as keyof PLEvaluation
            const score = ev[scoreKey] as Score | null
            return (
              <div key={d.key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${DIM_COLORS[d.key].dot}`} />
                <span className="text-xs text-muted-foreground">{d.shortLabel}</span>
                <ScoreBadge score={score} />
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {dimDetails.map(({ dim, score, goodLooksLike, fields }) => {
            const colors = DIM_COLORS[dim.key]
            const hasContent = fields.some(f => f.value != null && f.value !== '')
            return (
              <div key={dim.key} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                {/* Dimension header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-semibold text-foreground">{dim.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— {dim.description}</span>
                  </div>
                  <ScoreBadge score={score} />
                </div>
                {/* What Good Looks Like */}
                <div className="px-4 pt-3 pb-0">
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">What Good Looks Like</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">{goodLooksLike}</p>
                  </div>
                </div>
                {/* Fields */}
                {hasContent ? (
                  <div className="px-4 py-3 space-y-3">
                    {fields.map(f => <DetailField key={f.label} label={f.label} value={f.value} />)}
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground italic">No details recorded for this dimension.</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Overall notes */}
          {ev.overall_notes && (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ev.overall_notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Month helpers ───
function getMonthStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ─── Main view ───
interface PLEvaluationsViewProps {
  evaluations: PLEvaluation[]
  loading: boolean
  practiceLeds: Employee[]
  readOnly?: boolean
  onAdd: (input: PLEvaluationInput) => Promise<void>
  onUpdate: (id: string, input: PLEvaluationInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function PLEvaluationsView({
  evaluations,
  loading,
  practiceLeds,
  readOnly = false,
  onAdd,
  onUpdate,
  onDelete,
}: PLEvaluationsViewProps) {
  const { currentUser } = useDashboard()
  const [filterLeadId, setFilterLeadId] = useState<string>('__all__')
  const [filterMonth, setFilterMonth] = useState<string>('__all__')
  const [modal, setModal] = useState<{ open: boolean; evaluation: PLEvaluation | null; leadId: string | null }>({
    open: false, evaluation: null, leadId: null,
  })
  const [detailView, setDetailView] = useState<PLEvaluation | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  })
  const [deleting, setDeleting] = useState(false)

  // All distinct months across all evaluations for the month filter
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(evaluations.map(e => e.month.slice(0, 7)))).sort((a, b) => b.localeCompare(a))
    return months
  }, [evaluations])

  const filteredEvals = useMemo(() => {
    let list = [...evaluations]
    if (filterLeadId !== '__all__') list = list.filter(e => e.practice_lead_id === filterLeadId)
    if (filterMonth !== '__all__') list = list.filter(e => e.month.slice(0, 7) === filterMonth)
    return list.sort((a, b) => b.month.localeCompare(a.month))
  }, [evaluations, filterLeadId, filterMonth])

  const scoreCount = useMemo(() => {
    const counts: Record<Score, number> = { G: 0, Y: 0, R: 0 }
    filteredEvals.forEach(e => {
      const scores: (Score | null)[] = [e.dim1_score, e.dim2_score, e.dim3_score, e.dim4_score, e.dim5_score]
      scores.forEach(s => { if (s) counts[s]++ })
    })
    return counts
  }, [filteredEvals])

  const handleSave = async (input: PLEvaluationInput) => {
    if (modal.evaluation) {
      await onUpdate(modal.evaluation.id, input)
    } else {
      await onAdd(input)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await onDelete(deleteConfirm.id)
      setDeleteConfirm({ open: false, id: '', name: '' })
    } finally {
      setDeleting(false)
    }
  }

  // For "Add Monthly Checkin" default month — use current month
  const currentMonth = getMonthStr(new Date())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading evaluations...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Practice Leads', value: practiceLeds.length, colorClass: 'text-violet-700 dark:text-violet-300', bgClass: 'bg-violet-50 dark:bg-violet-950/30', iconClass: 'text-violet-500' },
            { label: 'Total evaluations', value: filteredEvals.length, colorClass: 'text-[#ea2775]', bgClass: 'bg-[#ea2775]/10', iconClass: 'text-[#ea2775]' },
            { label: 'Green scores', value: scoreCount.G, colorClass: 'text-emerald-700 dark:text-emerald-300', bgClass: 'bg-emerald-50 dark:bg-emerald-950/30', iconClass: 'text-emerald-500' },
            { label: 'Red scores', value: scoreCount.R, colorClass: 'text-rose-700 dark:text-rose-300', bgClass: 'bg-rose-50 dark:bg-rose-950/30', iconClass: 'text-rose-500' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bgClass}`}>
                  <ClipboardList className={`w-4 h-4 ${kpi.iconClass}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold tracking-tight ${kpi.colorClass}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* PL filter — hidden in readOnly (already locked to one PL) */}
          {!readOnly && (
            <Select value={filterLeadId} onValueChange={setFilterLeadId}>
              <SelectTrigger className="h-9 w-[220px] text-sm bg-card">
                <SelectValue placeholder="All Practice Leads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Practice Leads</SelectItem>
                {practiceLeds.map(pl => (
                  <SelectItem key={pl.id} value={pl.id}>{pl.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month filter */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 w-[180px] text-sm bg-card">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Months</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {!readOnly && (
            <Button
              onClick={() => setModal({ open: true, evaluation: null, leadId: filterLeadId !== '__all__' ? filterLeadId : null })}
              size="sm"
              className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Monthly Checkin
            </Button>
          )}
        </div>

        {/* Table */}
        {practiceLeds.length === 0 ? (
          <div className="bg-card rounded-xl border border-border">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-5">
                <Users className="w-10 h-10 text-violet-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No Practice Leads found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Practice Leads are employees with the &quot;Lead&quot; practice role.
              </p>
            </div>
          </div>
        ) : filteredEvals.length === 0 ? (
          <div className="bg-card rounded-xl border border-border">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-2xl bg-muted mb-4">
                <ClipboardList className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">No evaluations yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                {filterLeadId !== '__all__' ? 'No evaluations found for this practice lead.' : 'No monthly cards available yet.'}
              </p>
              {!readOnly && (
                <Button
                  onClick={() => setModal({ open: true, evaluation: null, leadId: filterLeadId !== '__all__' ? filterLeadId : null })}
                  size="sm"
                  className="bg-[#ea2775] hover:bg-[#d01e65] text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Monthly Checkin
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-20">
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-3 w-[120px]">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Month</span>
                    </th>
                    <th className="text-left px-3 py-3 w-[170px]">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Practice Lead</span>
                    </th>
                    {DIMENSIONS.map(d => (
                      <th key={d.key} className="text-left px-3 py-3 w-[80px]">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{d.shortLabel}</span>
                      </th>
                    ))}
                    <th className="text-left px-3 py-3 w-[130px]">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reviewer</span>
                    </th>
                    <th className="text-left px-3 py-3 w-[110px]">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date Added</span>
                    </th>
                    <th className="text-left px-3 py-3 w-[160px]">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notes</span>
                    </th>
                    {!readOnly && <th className="w-[44px] px-2 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {filteredEvals.map(ev => {
                    const pl = ev.practice_lead || practiceLeds.find(p => p.id === ev.practice_lead_id)
                    return (
                      <tr
                        key={ev.id}
                        className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        {/* Month — clickable */}
                        <td className="px-3 py-2.5 w-[120px]">
                          <button
                            onClick={() => setDetailView(ev)}
                            className="flex items-center gap-0.5 text-sm font-semibold text-[#ea2775] hover:text-[#d01e65] hover:underline underline-offset-2 transition-colors group/month whitespace-nowrap"
                          >
                            {new Date(ev.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover/month:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        {/* Practice Lead */}
                        <td className="px-3 py-2.5 w-[170px]">
                          {pl ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <EmployeeAvatar name={pl.full_name} photoUrl={pl.photo_url} size="sm" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{pl.full_name}</p>
                                {pl.practice?.name && (
                                  <p className="text-[11px] text-muted-foreground truncate">{pl.practice.name}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        {/* 5 dimension scores */}
                        {DIMENSIONS.map(d => {
                          const scoreKey = `${d.key}_score` as keyof PLEvaluation
                          return (
                            <td key={d.key} className="px-3 py-2.5 w-[80px]">
                              <ScoreBadge score={ev[scoreKey] as Score | null} compact />
                            </td>
                          )
                        })}
                        {/* Reviewer */}
                        <td className="px-3 py-2.5 w-[130px]">
                          <span className="text-xs text-foreground truncate block">
                            {ev.created_by_user?.full_name || currentUser?.full_name || '—'}
                          </span>
                        </td>
                        {/* Date Added */}
                        <td className="px-3 py-2.5 w-[110px]">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        {/* Notes */}
                        <td className="px-3 py-2.5 w-[160px] max-w-[160px]">
                          {ev.overall_notes ? (
                            <span className="text-xs text-muted-foreground truncate block">{ev.overall_notes}</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>
                        {/* Actions */}
                        {!readOnly && (
                          <td className="px-2 py-2.5 w-[44px]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => setModal({ open: true, evaluation: ev, leadId: null })}
                                  className="gap-2 text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirm({ open: true, id: ev.id, name: pl?.full_name || 'this evaluation' })}
                                  className="text-destructive gap-2 text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{filteredEvals.length}</span> evaluation{filteredEvals.length !== 1 ? 's' : ''}
                {filterLeadId !== '__all__' && ' for selected practice lead'}
              </span>
            </div>
          </div>
        )}
      </div>

      <EvalDetailView
        open={!!detailView}
        evaluation={detailView}
        practiceLed={detailView ? (detailView.practice_lead || practiceLeds.find(p => p.id === detailView.practice_lead_id) || null) : null}
        onClose={() => setDetailView(null)}
        readOnly={readOnly}
        onEdit={() => {
          const ev = detailView
          setDetailView(null)
          setModal({ open: true, evaluation: ev, leadId: null })
        }}
      />

      <EvalModal
        open={modal.open}
        onClose={() => setModal({ open: false, evaluation: null, leadId: null })}
        onSave={handleSave}
        evaluation={modal.evaluation}
        practiceLead={modal.leadId ? practiceLeds.find(pl => pl.id === modal.leadId) || null : null}
        month={currentMonth}
        practiceLeds={practiceLeds}
      />

      {/* Delete confirm */}
      {deleteConfirm.open && (
        <Dialog open={deleteConfirm.open} onOpenChange={v => !v && setDeleteConfirm({ open: false, id: '', name: '' })}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Evaluation?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the evaluation for <span className="font-semibold text-foreground">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: '', name: '' })} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

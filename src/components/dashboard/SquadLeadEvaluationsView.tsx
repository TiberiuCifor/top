'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'
import type { Employee, SquadLeadEvaluation, SquadLeadEvaluationInput } from '@/lib/types'
import { Plus, MoreHorizontal, Pencil, Trash2, Users, ClipboardList, X, ChevronRight } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

type Score = 'G' | 'Y' | 'R'

const DIMENSIONS = [
  { key: 'dim1', label: '1:1 Quality', shortLabel: '1:1 Quality', description: 'Bi-weekly 1:1s with development topics, not just status' },
  { key: 'dim2', label: 'Growth Plans', shortLabel: 'Growth Plans', description: '100% of squad has documented growth plan' },
  { key: 'dim3', label: 'Engagement & Early Warning', shortLabel: 'Engagement', description: 'Zero surprise departures, concerns surfaced proactively' },
  { key: 'dim4', label: 'Standards & Coaching', shortLabel: 'Standards', description: 'Squad follows practice standards, capability gaps coached' },
  { key: 'dim5', label: 'Content & AI Development', shortLabel: 'Content & AI', description: 'Content contributions and AI skill development' },
] as const

const DIM_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  dim1: { bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-800/50', dot: 'bg-violet-500' },
  dim2: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500' },
  dim3: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  dim4: { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' },
  dim5: { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800/50', dot: 'bg-rose-500' },
}

function ScoreBadge({ score, compact = false }: { score: Score | null; compact?: boolean }) {
  if (!score) return <span className="text-muted-foreground/40 text-xs">—</span>
  const cfg: Record<Score, string> = {
    G: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Y: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    R: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  }
  const dot: Record<Score, string> = { G: 'bg-emerald-500', Y: 'bg-amber-500', R: 'bg-rose-500' }
  const label: Record<Score, string> = { G: 'Green', Y: 'Yellow', R: 'Red' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${cfg[score]} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[score]}`} />
      {label[score]}
    </span>
  )
}

function ScoreSelector({ value, onChange }: { value: Score | null; onChange: (v: Score) => void }) {
  const opts: { score: Score; active: string; inactive: string }[] = [
    { score: 'G', active: 'bg-emerald-500 text-white shadow-sm', inactive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100' },
    { score: 'Y', active: 'bg-amber-500 text-white shadow-sm', inactive: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100' },
    { score: 'R', active: 'bg-rose-500 text-white shadow-sm', inactive: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100' },
  ]
  const labels: Record<Score, string> = { G: 'Green', Y: 'Yellow', R: 'Red' }
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button key={o.score} type="button" onClick={() => onChange(o.score)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${value === o.score ? o.active : o.inactive}`}>
          {labels[o.score]}
        </button>
      ))}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  )
}

// ─── Form ───
interface FormState {
  squad_lead_id: string; month: string
  dim1_score: Score | null; dim1_evidence: string; dim1_ones_held: string; dim1_ones_planned: string; dim1_development_percent: string
  dim2_score: Score | null; dim2_evidence: string; dim2_growth_plan_current: string; dim2_growth_plan_total: string
  dim3_score: Score | null; dim3_evidence: string; dim3_engagement_concerns: string; dim3_high_potential: string
  dim4_score: Score | null; dim4_evidence: string; dim4_technical_gaps: string
  dim5_score: Score | null; dim5_evidence: string; dim5_content: string; dim5_ai_skills: string
  overall_notes: string
}

function emptyForm(month: string, leadId = ''): FormState {
  return {
    squad_lead_id: leadId, month,
    dim1_score: null, dim1_evidence: '', dim1_ones_held: '', dim1_ones_planned: '', dim1_development_percent: '',
    dim2_score: null, dim2_evidence: '', dim2_growth_plan_current: '', dim2_growth_plan_total: '',
    dim3_score: null, dim3_evidence: '', dim3_engagement_concerns: '', dim3_high_potential: '',
    dim4_score: null, dim4_evidence: '', dim4_technical_gaps: '',
    dim5_score: null, dim5_evidence: '', dim5_content: '', dim5_ai_skills: '',
    overall_notes: '',
  }
}

function evalToForm(ev: SquadLeadEvaluation): FormState {
  return {
    squad_lead_id: ev.squad_lead_id, month: ev.month.slice(0, 7),
    dim1_score: ev.dim1_score, dim1_evidence: ev.dim1_evidence || '', dim1_ones_held: ev.dim1_ones_held?.toString() || '', dim1_ones_planned: ev.dim1_ones_planned?.toString() || '', dim1_development_percent: ev.dim1_development_percent?.toString() || '',
    dim2_score: ev.dim2_score, dim2_evidence: ev.dim2_evidence || '', dim2_growth_plan_current: ev.dim2_growth_plan_current?.toString() || '', dim2_growth_plan_total: ev.dim2_growth_plan_total?.toString() || '',
    dim3_score: ev.dim3_score, dim3_evidence: ev.dim3_evidence || '', dim3_engagement_concerns: ev.dim3_engagement_concerns || '', dim3_high_potential: ev.dim3_high_potential || '',
    dim4_score: ev.dim4_score, dim4_evidence: ev.dim4_evidence || '', dim4_technical_gaps: ev.dim4_technical_gaps || '',
    dim5_score: ev.dim5_score, dim5_evidence: ev.dim5_evidence || '', dim5_content: ev.dim5_content || '', dim5_ai_skills: ev.dim5_ai_skills || '',
    overall_notes: ev.overall_notes || '',
  }
}

function formToInput(f: FormState): SquadLeadEvaluationInput {
  return {
    squad_lead_id: f.squad_lead_id, month: f.month + '-01',
    dim1_score: f.dim1_score, dim1_evidence: f.dim1_evidence || null, dim1_ones_held: f.dim1_ones_held ? Number(f.dim1_ones_held) : null, dim1_ones_planned: f.dim1_ones_planned ? Number(f.dim1_ones_planned) : null, dim1_development_percent: f.dim1_development_percent ? Number(f.dim1_development_percent) : null,
    dim2_score: f.dim2_score, dim2_evidence: f.dim2_evidence || null, dim2_growth_plan_current: f.dim2_growth_plan_current ? Number(f.dim2_growth_plan_current) : null, dim2_growth_plan_total: f.dim2_growth_plan_total ? Number(f.dim2_growth_plan_total) : null,
    dim3_score: f.dim3_score, dim3_evidence: f.dim3_evidence || null, dim3_engagement_concerns: f.dim3_engagement_concerns || null, dim3_high_potential: f.dim3_high_potential || null,
    dim4_score: f.dim4_score, dim4_evidence: f.dim4_evidence || null, dim4_technical_gaps: f.dim4_technical_gaps || null,
    dim5_score: f.dim5_score, dim5_evidence: f.dim5_evidence || null, dim5_content: f.dim5_content || null, dim5_ai_skills: f.dim5_ai_skills || null,
    overall_notes: f.overall_notes || null, created_by: null,
  }
}

// ─── Modal ───
function EvalModal({ open, onClose, onSave, evaluation, leadId, month, leads }: {
  open: boolean; onClose: () => void; onSave: (i: SquadLeadEvaluationInput) => Promise<void>
  evaluation: SquadLeadEvaluation | null; leadId: string | null; month: string; leads: Employee[]
}) {
  const [form, setForm] = useState<FormState>(() => evaluation ? evalToForm(evaluation) : emptyForm(month, leadId || ''))
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState(0)

  React.useEffect(() => {
    if (open) { setForm(evaluation ? evalToForm(evaluation) : emptyForm(month, leadId || '')); setActiveSection(0) }
  }, [open, evaluation, month, leadId])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))
  const handleSave = async () => {
    if (!form.squad_lead_id || !form.month) return
    setSaving(true)
    try { await onSave(formToInput(form)); onClose() } finally { setSaving(false) }
  }
  const isNew = !evaluation

  const sections = [
    {
      title: '1. 1:1 Quality',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Bi-weekly 1:1 with every direct report. Conversations include development and wellbeing, not just status.</p>
          </div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label><ScoreSelector value={form.dim1_score} onChange={v => set('dim1_score', v)} /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label><Textarea value={form.dim1_evidence} onChange={e => set('dim1_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">1:1s held vs. planned</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.dim1_ones_held} onChange={e => set('dim1_ones_held', e.target.value)} className="w-24 text-sm h-9" placeholder="Held" />
              <span className="text-muted-foreground text-sm">/</span>
              <Input type="number" min="0" value={form.dim1_ones_planned} onChange={e => set('dim1_ones_planned', e.target.value)} className="w-24 text-sm h-9" placeholder="Planned" />
            </div>
          </div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">% of 1:1s that included development topics</Label><Input type="number" min="0" max="100" value={form.dim1_development_percent} onChange={e => set('dim1_development_percent', e.target.value)} className="w-32 text-sm h-9" placeholder="e.g. 80" /></div>
        </div>
      ),
    },
    {
      title: '2. Growth Plans',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">100% of squad has a documented growth plan updated in last 6 months. 80%+ can articulate their next step.</p>
          </div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label><ScoreSelector value={form.dim2_score} onChange={v => set('dim2_score', v)} /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label><Textarea value={form.dim2_evidence} onChange={e => set('dim2_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Squad members with current growth plans</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.dim2_growth_plan_current} onChange={e => set('dim2_growth_plan_current', e.target.value)} className="w-24 text-sm h-9" placeholder="Current" />
              <span className="text-muted-foreground text-sm">/</span>
              <Input type="number" min="0" value={form.dim2_growth_plan_total} onChange={e => set('dim2_growth_plan_total', e.target.value)} className="w-24 text-sm h-9" placeholder="Total" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '3. Engagement & Early Warning',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Zero surprise departures. Concerns surfaced to PL proactively. 1+ high-potential identified.</p>
          </div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label><ScoreSelector value={form.dim3_score} onChange={v => set('dim3_score', v)} /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label><Textarea value={form.dim3_evidence} onChange={e => set('dim3_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Engagement concerns surfaced this month</Label><Textarea value={form.dim3_engagement_concerns} onChange={e => set('dim3_engagement_concerns', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe concerns or write 'None'..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">High-potential identified</Label><Textarea value={form.dim3_high_potential} onChange={e => set('dim3_high_potential', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Name and reason..." /></div>
        </div>
      ),
    },
    {
      title: '4. Standards & Coaching',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Squad follows practice standards. Capability gaps coached, not just flagged.</p>
          </div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label><ScoreSelector value={form.dim4_score} onChange={v => set('dim4_score', v)} /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label><Textarea value={form.dim4_evidence} onChange={e => set('dim4_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Technical gaps observed and how you coached them</Label><Textarea value={form.dim4_technical_gaps} onChange={e => set('dim4_technical_gaps', e.target.value)} rows={3} className="text-sm resize-none" placeholder="Describe gaps and coaching approach..." /></div>
        </div>
      ),
    },
    {
      title: '5. Content & AI Development',
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">What Good Looks Like</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">1+ squad member contributed or reshared content. Squad developing AI-relevant skills.</p>
          </div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score</Label><ScoreSelector value={form.dim5_score} onChange={v => set('dim5_score', v)} /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Supporting Notes</Label><Textarea value={form.dim5_evidence} onChange={e => set('dim5_evidence', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Describe evidence..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Content produced by squad this month</Label><Textarea value={form.dim5_content} onChange={e => set('dim5_content', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Blog posts, talks, contributions..." /></div>
          <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">AI skills being developed in the squad</Label><Textarea value={form.dim5_ai_skills} onChange={e => set('dim5_ai_skills', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Tools, experiments, certifications..." /></div>
        </div>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{isNew ? 'Add' : 'Edit'} Squad Lead Evaluation</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Squad Lead</Label>
                {isNew ? (
                  <Select value={form.squad_lead_id} onValueChange={v => set('squad_lead_id', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select squad lead..." /></SelectTrigger>
                    <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/50 border border-border">
                    <EmployeeAvatar name={evaluation?.squad_lead?.full_name || ''} photoUrl={evaluation?.squad_lead?.photo_url} size="sm" />
                    <span className="text-sm font-medium">{evaluation?.squad_lead?.full_name}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Month</Label>
                {isNew ? (
                  <Input type="month" value={form.month} onChange={e => set('month', e.target.value)} className="h-9 text-sm" />
                ) : (
                  <div className="flex items-center h-9 px-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-sm font-medium">{new Date(form.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {sections.map((s, idx) => (
                <div key={idx} className="border border-border rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setActiveSection(activeSection === idx ? -1 : idx)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${activeSection === idx ? 'bg-violet-50 dark:bg-violet-950/30' : 'bg-card hover:bg-muted/40'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${activeSection === idx ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}>{s.title}</span>
                      {activeSection !== idx && (() => { const score = form[`dim${idx + 1}_score` as keyof FormState] as Score | null; return score ? <ScoreBadge score={score} /> : null })()}
                    </div>
                    <svg className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === idx ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {activeSection === idx && <div className="px-4 pb-4 pt-3 border-t border-border bg-card">{s.content}</div>}
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Overall Notes</Label>
              <Textarea value={form.overall_notes} onChange={e => set('overall_notes', e.target.value)} rows={2} className="text-sm resize-none" placeholder="Any additional context..." />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.squad_lead_id || !form.month} className="bg-[#ea2775] hover:bg-[#d01e65] text-white">
            {saving ? 'Saving...' : isNew ? 'Add Monthly Checkin' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail View ───
function EvalDetailView({ open, evaluation: ev, lead: pl, onClose, onEdit }: {
  open: boolean; evaluation: SquadLeadEvaluation | null; lead: Employee | null; onClose: () => void; onEdit: () => void
}) {
  if (!ev) return null
  const monthLabel = new Date(ev.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  const dimDetails = [
    { dim: DIMENSIONS[0], score: ev.dim1_score, goodLooksLike: 'Bi-weekly 1:1 with every direct report. Conversations include development and wellbeing, not just status.', fields: [
      { label: 'Evidence', value: ev.dim1_evidence },
      { label: '1:1s held / planned', value: (ev.dim1_ones_held != null && ev.dim1_ones_planned != null) ? `${ev.dim1_ones_held} / ${ev.dim1_ones_planned}` : null },
      { label: '% with development topics', value: ev.dim1_development_percent != null ? `${ev.dim1_development_percent}%` : null },
    ]},
    { dim: DIMENSIONS[1], score: ev.dim2_score, goodLooksLike: '100% of squad has a documented growth plan updated in last 6 months. 80%+ can articulate their next step.', fields: [
      { label: 'Evidence', value: ev.dim2_evidence },
      { label: 'Growth plans current / total', value: (ev.dim2_growth_plan_current != null && ev.dim2_growth_plan_total != null) ? `${ev.dim2_growth_plan_current} / ${ev.dim2_growth_plan_total}` : null },
    ]},
    { dim: DIMENSIONS[2], score: ev.dim3_score, goodLooksLike: 'Zero surprise departures. Concerns surfaced to PL proactively. 1+ high-potential identified.', fields: [
      { label: 'Evidence', value: ev.dim3_evidence },
      { label: 'Engagement concerns', value: ev.dim3_engagement_concerns },
      { label: 'High-potential identified', value: ev.dim3_high_potential },
    ]},
    { dim: DIMENSIONS[3], score: ev.dim4_score, goodLooksLike: 'Squad follows practice standards. Capability gaps coached, not just flagged.', fields: [
      { label: 'Evidence', value: ev.dim4_evidence },
      { label: 'Technical gaps & coaching', value: ev.dim4_technical_gaps },
    ]},
    { dim: DIMENSIONS[4], score: ev.dim5_score, goodLooksLike: '1+ squad member contributed or reshared content. Squad developing AI-relevant skills.', fields: [
      { label: 'Evidence', value: ev.dim5_evidence },
      { label: 'Content produced', value: ev.dim5_content },
      { label: 'AI skills developed', value: ev.dim5_ai_skills },
    ]},
  ]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent showCloseButton={false} className="!max-w-none w-[92vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            {pl && <EmployeeAvatar name={pl.full_name} photoUrl={pl.photo_url} size="lg" />}
            <div>
              <h2 className="text-lg font-bold text-foreground">{pl?.full_name ?? 'Squad Lead'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {pl?.squad?.name && <span className="text-sm text-muted-foreground">{pl.squad.name}</span>}
                {pl?.squad?.name && <span className="text-muted-foreground/40">·</span>}
                {pl?.practice?.name && <span className="text-sm text-muted-foreground">{pl.practice.name}</span>}
                {pl?.practice?.name && <span className="text-muted-foreground/40">·</span>}
                <span className="text-sm font-semibold text-[#ea2775]">{monthLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} className="h-8 gap-1.5 text-xs"><Pencil className="w-3.5 h-3.5" />Edit</Button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 px-6 py-3 bg-muted/30 border-b border-border">
          {DIMENSIONS.map(d => {
            const score = ev[`${d.key}_score` as keyof SquadLeadEvaluation] as Score | null
            return (
              <div key={d.key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${DIM_COLORS[d.key].dot}`} />
                <span className="text-xs text-muted-foreground">{d.shortLabel}</span>
                <ScoreBadge score={score} />
              </div>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {dimDetails.map(({ dim, score, goodLooksLike, fields }) => {
            const c = DIM_COLORS[dim.key]
            const hasContent = fields.some(f => f.value != null && f.value !== '')
            return (
              <div key={dim.key} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-sm font-semibold text-foreground">{dim.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">— {dim.description}</span>
                  </div>
                  <ScoreBadge score={score} />
                </div>
                <div className="px-4 pt-3 pb-0">
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">What Good Looks Like</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">{goodLooksLike}</p>
                  </div>
                </div>
                {hasContent ? (
                  <div className="px-4 py-3 space-y-3">{fields.map(f => <DetailField key={f.label} label={f.label} value={f.value} />)}</div>
                ) : (
                  <div className="px-4 py-3"><p className="text-xs text-muted-foreground italic">No details recorded for this dimension.</p></div>
                )}
              </div>
            )
          })}
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

// ─── Helpers ───
function getMonthStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

// ─── Main View ───
interface SquadLeadEvaluationsViewProps {
  evaluations: SquadLeadEvaluation[]
  loading: boolean
  leads: Employee[]
  onAdd: (input: SquadLeadEvaluationInput) => Promise<void>
  onUpdate: (id: string, input: SquadLeadEvaluationInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function SquadLeadEvaluationsView({ evaluations, loading, leads, onAdd, onUpdate, onDelete }: SquadLeadEvaluationsViewProps) {
  const { currentUser } = useDashboard()
  const [filterLeadId, setFilterLeadId] = useState('__all__')
  const [filterMonth, setFilterMonth] = useState('__all__')
  const [modal, setModal] = useState<{ open: boolean; evaluation: SquadLeadEvaluation | null; leadId: string | null }>({ open: false, evaluation: null, leadId: null })
  const [detailView, setDetailView] = useState<SquadLeadEvaluation | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })
  const [deleting, setDeleting] = useState(false)

  const availableMonths = useMemo(() =>
    Array.from(new Set(evaluations.map(e => e.month.slice(0, 7)))).sort((a, b) => b.localeCompare(a))
  , [evaluations])

  const filtered = useMemo(() => {
    let list = [...evaluations]
    if (filterLeadId !== '__all__') list = list.filter(e => e.squad_lead_id === filterLeadId)
    if (filterMonth !== '__all__') list = list.filter(e => e.month.slice(0, 7) === filterMonth)
    return list.sort((a, b) => b.month.localeCompare(a.month))
  }, [evaluations, filterLeadId, filterMonth])

  const scoreCount = useMemo(() => {
    const c: Record<Score, number> = { G: 0, Y: 0, R: 0 }
    filtered.forEach(e => [e.dim1_score, e.dim2_score, e.dim3_score, e.dim4_score, e.dim5_score].forEach(s => { if (s) c[s]++ }))
    return c
  }, [filtered])

  const handleSave = async (input: SquadLeadEvaluationInput) => {
    if (modal.evaluation) await onUpdate(modal.evaluation.id, input)
    else await onAdd(input)
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try { await onDelete(deleteConfirm.id); setDeleteConfirm({ open: false, id: '', name: '' }) } finally { setDeleting(false) }
  }

  const currentMonth = getMonthStr(new Date())

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading evaluations...</span>
      </div>
    </div>
  )

  return (
    <>
      <div className="space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Squad Leads', value: leads.length, colorClass: 'text-violet-700 dark:text-violet-300', bgClass: 'bg-violet-50 dark:bg-violet-950/30' },
            { label: 'Total evaluations', value: filtered.length, colorClass: 'text-[#ea2775]', bgClass: 'bg-[#ea2775]/10' },
            { label: 'Green scores', value: scoreCount.G, colorClass: 'text-emerald-700 dark:text-emerald-300', bgClass: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Red scores', value: scoreCount.R, colorClass: 'text-rose-700 dark:text-rose-300', bgClass: 'bg-rose-50 dark:bg-rose-950/30' },
          ].map(k => (
            <div key={k.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">{k.label}</span>
                <div className={`p-2 rounded-lg ${k.bgClass}`}><ClipboardList className="w-4 h-4 text-current opacity-60" /></div>
              </div>
              <p className={`text-3xl font-bold tracking-tight ${k.colorClass}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterLeadId} onValueChange={setFilterLeadId}>
            <SelectTrigger className="h-9 w-[220px] text-sm bg-card"><SelectValue placeholder="All Squad Leads" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Squad Leads</SelectItem>
              {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 w-[180px] text-sm bg-card"><SelectValue placeholder="All Months" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Months</SelectItem>
              {availableMonths.map(m => <SelectItem key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button onClick={() => setModal({ open: true, evaluation: null, leadId: filterLeadId !== '__all__' ? filterLeadId : null })} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm h-9">
            <Plus className="w-4 h-4 mr-1.5" />Add Monthly Checkin
          </Button>
        </div>

        {/* Table */}
        {leads.length === 0 ? (
          <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 mb-5"><Users className="w-10 h-10 text-violet-500" /></div>
            <h3 className="text-base font-semibold text-foreground mb-1">No Squad Leads found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Squad Leads are employees with the &quot;Squad Lead&quot; practice role.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-muted mb-4"><ClipboardList className="w-8 h-8 text-muted-foreground" /></div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No evaluations yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">Start by adding the first monthly evaluation.</p>
            <Button onClick={() => setModal({ open: true, evaluation: null, leadId: null })} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white"><Plus className="w-4 h-4 mr-1.5" />Add Monthly Checkin</Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-20">
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-3 w-[120px]"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Month</span></th>
                    <th className="text-left px-3 py-3 w-[170px]"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Squad Lead</span></th>
                    {DIMENSIONS.map(d => <th key={d.key} className="text-left px-3 py-3 w-[80px]"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{d.shortLabel}</span></th>)}
                    <th className="text-left px-3 py-3 w-[130px]"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reviewer</span></th>
                    <th className="text-left px-3 py-3 w-[110px]"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date Added</span></th>
                    <th className="text-left px-3 py-3 w-[160px]"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notes</span></th>
                    <th className="w-[44px] px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => {
                    const sl = ev.squad_lead || leads.find(l => l.id === ev.squad_lead_id)
                    return (
                      <tr key={ev.id} className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <button onClick={() => setDetailView(ev)} className="flex items-center gap-0.5 text-sm font-semibold text-[#ea2775] hover:text-[#d01e65] hover:underline underline-offset-2 transition-colors group/month whitespace-nowrap">
                            {new Date(ev.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover/month:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          {sl ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <EmployeeAvatar name={sl.full_name} photoUrl={sl.photo_url} size="sm" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{sl.full_name}</p>
                                {sl.squad?.name && <p className="text-[11px] text-muted-foreground truncate">{sl.squad.name}</p>}
                              </div>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        {DIMENSIONS.map(d => <td key={d.key} className="px-3 py-2.5 w-[80px]"><ScoreBadge score={ev[`${d.key}_score` as keyof SquadLeadEvaluation] as Score | null} compact /></td>)}
                        <td className="px-3 py-2.5 w-[130px]">
                          <span className="text-xs text-foreground truncate block">{ev.created_by_user?.full_name || currentUser?.full_name || '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 w-[110px]">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(ev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </td>
                        <td className="px-3 py-2.5 w-[160px] max-w-[160px]">
                          {ev.overall_notes ? <span className="text-xs text-muted-foreground truncate block">{ev.overall_notes}</span> : <span className="text-muted-foreground/40 text-xs">—</span>}
                        </td>
                        <td className="px-2 py-2.5 w-[44px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setModal({ open: true, evaluation: ev, leadId: null })} className="gap-2 text-xs"><Pencil className="w-3.5 h-3.5" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, id: ev.id, name: sl?.full_name || 'this evaluation' })} className="text-destructive gap-2 text-xs"><Trash2 className="w-3.5 h-3.5" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{filtered.length}</span> evaluation{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      <EvalDetailView open={!!detailView} evaluation={detailView} lead={detailView ? (detailView.squad_lead || leads.find(l => l.id === detailView.squad_lead_id) || null) : null}
        onClose={() => setDetailView(null)} onEdit={() => { const ev = detailView; setDetailView(null); setModal({ open: true, evaluation: ev, leadId: null }) }} />

      <EvalModal open={modal.open} onClose={() => setModal({ open: false, evaluation: null, leadId: null })} onSave={handleSave}
        evaluation={modal.evaluation} leadId={modal.leadId} month={currentMonth} leads={leads} />

      {deleteConfirm.open && (
        <Dialog open={deleteConfirm.open} onOpenChange={v => !v && setDeleteConfirm({ open: false, id: '', name: '' })}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Evaluation?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to delete the evaluation for <span className="font-semibold text-foreground">{deleteConfirm.name}</span>?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: '', name: '' })} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

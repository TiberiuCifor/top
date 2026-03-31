'use client'
import { useState, useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  RefreshCw, TrendingUp, Calendar, User, Building2,
  ExternalLink, X, Phone, Globe, Mail, MessageSquare, CheckSquare,
  PhoneCall, CalendarCheck, FileText, Clock, Flame, Snowflake, Thermometer,
  ChevronRight, Target, Search, GitCommitHorizontal, PlusCircle, BarChart2,
  ChevronDown, Check
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MiniOpp { id: string; name: string; estimatedValue: number }

interface Opportunity {
  id: string
  name: string
  stage: string
  account: string | null
  estimatedValue: number
  estimatedValueFormatted: string | null
  currency: string | null
  closeDate: string | null
  description: string | null
  owner: string | null
  createdOn: string
  confidenceLevel: number | null
  closeProbability: number | null
  rating: string | null
}

interface OppDetail extends Opportunity {
  modifiedOn: string | null
  status: string | null
  accountPhone: string | null
  accountWebsite: string | null
  contact: string | null
  contactEmail: string | null
  contactPhone: string | null
  weightedValue: number | null
  forecastCategory: string | null
  commercialOwner: string | null
  techResponsible: string | null
  businessType: string | null
  newBusiness: string | null
  opportunityAge: number | null
  activities: Activity[]
  notes: Note[]
  timeline: TimelinePost[]
}

interface TimelinePost {
  id: string
  createdOn: string
  createdBy: string | null
  source: string | null
  summary: string
  icon: string
  isSystemPost: boolean
}

interface Activity {
  id: string
  type: string
  subject: string
  description: string | null
  createdOn: string
  owner: string | null
  status: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  direction: string | null
}

interface Note {
  id: string
  subject: string | null
  text: string | null
  createdBy: string | null
  createdOn: string
}

const STAGES = [
  { key: '1-New',           label: 'New',          dot: 'bg-slate-400',    header: 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700',    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300' },
  { key: '2-Qualification', label: 'Qualification', dot: 'bg-blue-500',    header: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { key: '3-Estimastion',   label: 'Estimation',   dot: 'bg-violet-500',   header: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { key: '4-Proposal',      label: 'Proposal',     dot: 'bg-amber-500',    header: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { key: '5-Legal',         label: 'Legal',        dot: 'bg-emerald-500',  header: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 70 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
              : pct >= 40 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${color}`}>
      <Target className="w-3 h-3" />
      {pct}%
    </div>
  )
}

function RatingIcon({ rating }: { rating: string | null }) {
  if (!rating) return null
  if (rating === 'Hot') return <Flame className="w-3.5 h-3.5 text-red-500" title="Hot" />
  if (rating === 'Cold') return <Snowflake className="w-3.5 h-3.5 text-blue-400" title="Cold" />
  return <Thermometer className="w-3.5 h-3.5 text-amber-500" title="Warm" />
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'email': return <Mail className="w-4 h-4 text-blue-500" />
    case 'task': return <CheckSquare className="w-4 h-4 text-violet-500" />
    case 'phonecall': return <PhoneCall className="w-4 h-4 text-green-500" />
    case 'appointment': return <CalendarCheck className="w-4 h-4 text-amber-500" />
    default: return <FileText className="w-4 h-4 text-muted-foreground" />
  }
}

function TimelineIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'create': return <PlusCircle className="w-4 h-4 text-emerald-500" />
    case 'update': return <BarChart2 className="w-4 h-4 text-blue-500" />
    case 'stage': return <GitCommitHorizontal className="w-4 h-4 text-violet-500" />
    case 'comment': return <MessageSquare className="w-4 h-4 text-amber-500" />
    default: return <GitCommitHorizontal className="w-4 h-4 text-muted-foreground" />
  }
}

function ActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No activities recorded</div>
  }
  return (
    <div className="p-6 space-y-3">
      {activities.map(act => (
        <div key={act.id} className="bg-muted/30 rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
              <ActivityIcon type={act.type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{act.subject}</p>
                {act.status && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">{act.status}</span>
                )}
              </div>
              {act.description && (
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed whitespace-pre-wrap line-clamp-4">{act.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {act.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" />{act.owner}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(act.createdOn)}</span>
                {act.direction && <span className="capitalize">{act.direction}</span>}
                {act.scheduledEnd && (
                  <span className={`flex items-center gap-1 ${isOverdue(act.scheduledEnd) ? 'text-red-500' : ''}`}>
                    <Calendar className="w-3 h-3" />Due {formatDate(act.scheduledEnd)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OpportunityCard({ opp, onClick }: { opp: Opportunity; onClick: () => void }) {
  const overdue = isOverdue(opp.closeDate)

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#ea2775]/40 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 group-hover:text-[#ea2775] transition-colors">
          {opp.name}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          <RatingIcon rating={opp.rating} />
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {opp.account && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
          <Building2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate font-medium">{opp.account}</span>
        </div>
      )}

      {/* Value + Confidence */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 text-[#ea2775] font-bold text-sm">
          {opp.estimatedValueFormatted
            ? opp.estimatedValueFormatted.replace(/\.\d+$/, '')
            : `€${opp.estimatedValue.toLocaleString()}`}
        </div>
        <ConfidenceBadge value={opp.confidenceLevel} />
      </div>

      {/* Close date + probability */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {opp.closeDate ? (
          <div className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
            overdue ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-muted text-muted-foreground'
          }`}>
            <Calendar className="w-3 h-3" />
            {formatDate(opp.closeDate)}
          </div>
        ) : <div />}
        {opp.closeProbability !== null && (
          <span className="text-xs text-muted-foreground">{opp.closeProbability}% prob.</span>
        )}
      </div>

      {opp.owner && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-[#ea2775]/15 flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 text-[#ea2775]" />
          </div>
          <span className="truncate">{opp.owner}</span>
        </div>
      )}
    </div>
  )
}

function StatTooltip({ items, sym }: { items: MiniOpp[]; sym: string }) {
  if (items.length === 0) return null
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 hidden group-hover:block pointer-events-none">
      {/* Arrow */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-border" />
      <div className="bg-popover border border-border rounded-xl shadow-xl p-3 min-w-[280px] max-w-[360px]">
        <div className="space-y-1.5">
          {items.map(o => (
            <div key={o.id} className="flex items-center justify-between gap-3">
              <span className="text-xs text-foreground truncate flex-1">{o.name}</span>
              <span className="text-xs font-semibold text-[#ea2775] flex-shrink-0 tabular-nums">
                {o.estimatedValue >= 1_000_000
                  ? `${sym}${(o.estimatedValue / 1_000_000).toFixed(1)}M`
                  : o.estimatedValue >= 1_000
                  ? `${sym}${(o.estimatedValue / 1_000).toFixed(0)}K`
                  : `${sym}${o.estimatedValue.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StageColumn({ stage, opportunities, onCardClick, fmtV }: {
  stage: typeof STAGES[0]
  opportunities: Opportunity[]
  onCardClick: (opp: Opportunity) => void
  fmtV: (v: number) => string
}) {
  const total = opportunities.reduce((sum, o) => sum + o.estimatedValue, 0)
  const weighted = opportunities.reduce((sum, o) => sum + o.estimatedValue * (o.closeProbability ?? 0) / 100, 0)

  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      <div className={`rounded-xl border px-4 py-3 mb-3 ${stage.header}`}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stage.dot} flex-shrink-0`} />
            <span className="text-sm font-semibold text-foreground">{stage.label}</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
            {opportunities.length}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Total</span>
            <span className="text-sm font-bold text-foreground">{fmtV(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Weighted</span>
            <span className="text-sm font-semibold text-[#ea2775]">{fmtV(weighted)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-310px)] pr-0.5">
        {opportunities.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground">No opportunities</p>
          </div>
        ) : (
          opportunities.map(opp => (
            <OpportunityCard key={opp.id} opp={opp} onClick={() => onCardClick(opp)} />
          ))
        )}
      </div>
    </div>
  )
}

function DetailDrawer({ oppId, onClose }: { oppId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<OppDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'notes' | 'timeline'>('overview')

  useEffect(() => {
    setLoading(true)
    setError(null)
    setDetail(null)
    setActiveTab('overview')
    fetch(`/api/dynamics/opportunities/${oppId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setDetail(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [oppId])

  const stage = STAGES.find(s => s.key === detail?.stage)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] max-w-full bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-5 w-56 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {stage && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.badge}`}>{stage.label}</span>}
                  {detail?.rating && (
                    <div className="flex items-center gap-1">
                      <RatingIcon rating={detail.rating} />
                      <span className="text-xs text-muted-foreground">{detail.rating}</span>
                    </div>
                  )}
                  {detail?.forecastCategory && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{detail.forecastCategory}</span>
                  )}
                </div>
                <h2 className="text-base font-bold text-foreground leading-snug">{detail?.name}</h2>
                {detail?.account && <p className="text-sm text-muted-foreground mt-0.5">{detail.account}</p>}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {detail && (
              <a
                href={`https://tecknoworks.crm4.dynamics.com/main.aspx?pagetype=entityrecord&etn=opportunity&id=${detail.id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Dynamics</span>
              </a>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading details…</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        ) : detail ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border px-6 flex-shrink-0 overflow-x-auto">
              {(['overview', 'activities', 'notes', 'timeline'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${
                    activeTab === tab ? 'border-[#ea2775] text-[#ea2775]' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                  {tab === 'activities' && detail.activities.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{detail.activities.length}</span>
                  )}
                  {tab === 'notes' && detail.notes.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{detail.notes.length}</span>
                  )}
                  {tab === 'timeline' && detail.timeline.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{detail.timeline.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  {/* Key metrics grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                      <p className="text-lg font-bold text-[#ea2775]">{detail.estimatedValueFormatted ?? `€${detail.estimatedValue.toLocaleString()}`}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Weighted Value</p>
                      <p className="text-lg font-bold text-foreground">
                        {detail.weightedValue ? `€${detail.weightedValue.toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-2">Confidence Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${(detail.confidenceLevel ?? 0) >= 70 ? 'bg-emerald-500' : (detail.confidenceLevel ?? 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, detail.confidenceLevel ?? 0)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground w-8 text-right">{detail.confidenceLevel ?? 0}%</span>
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-2">Close Probability</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full bg-[#ea2775]" style={{ width: `${detail.closeProbability ?? 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-foreground w-8 text-right">{detail.closeProbability ?? 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
                    <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                      {[
                        { label: 'Close Date', value: formatDate(detail.closeDate), highlight: isOverdue(detail.closeDate) },
                        { label: 'Stage', value: stage?.label || detail.stage },
                        { label: 'Status', value: detail.status },
                        { label: 'Rating', value: detail.rating },
                        { label: 'Business Type', value: detail.businessType },
                        { label: 'New Business', value: detail.newBusiness },
                        { label: 'Opportunity Age', value: detail.opportunityAge !== null ? `${detail.opportunityAge} days` : null },
                        { label: 'Created', value: formatDate(detail.createdOn) },
                        { label: 'Last Modified', value: formatDateTime(detail.modifiedOn) },
                      ].filter(r => r.value).map(row => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card">
                          <span className="text-xs text-muted-foreground">{row.label}</span>
                          <span className={`text-xs font-medium ${row.highlight ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* People */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">People</h3>
                    <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                      {[
                        { label: 'Owner', value: detail.owner, icon: <User className="w-3.5 h-3.5" /> },
                        { label: 'Commercial Owner', value: detail.commercialOwner, icon: <User className="w-3.5 h-3.5" /> },
                        { label: 'Tech Responsible', value: detail.techResponsible, icon: <User className="w-3.5 h-3.5" /> },
                        { label: 'Contact', value: detail.contact, icon: <User className="w-3.5 h-3.5" /> },
                        { label: 'Contact Email', value: detail.contactEmail, icon: <Mail className="w-3.5 h-3.5" /> },
                        { label: 'Contact Phone', value: detail.contactPhone, icon: <Phone className="w-3.5 h-3.5" /> },
                      ].filter(r => r.value).map(row => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card gap-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {row.icon}
                            <span className="text-xs">{row.label}</span>
                          </div>
                          <span className="text-xs font-medium text-foreground truncate max-w-[220px]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Account */}
                  {(detail.account || detail.accountPhone || detail.accountWebsite) && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
                      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                        {[
                          { label: 'Company', value: detail.account, icon: <Building2 className="w-3.5 h-3.5" /> },
                          { label: 'Phone', value: detail.accountPhone, icon: <Phone className="w-3.5 h-3.5" /> },
                          { label: 'Website', value: detail.accountWebsite, icon: <Globe className="w-3.5 h-3.5" /> },
                        ].filter(r => r.value).map(row => (
                          <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-card gap-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {row.icon}
                              <span className="text-xs">{row.label}</span>
                            </div>
                            <span className="text-xs font-medium text-foreground truncate max-w-[220px]">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {detail.description && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</h3>
                      <div className="bg-muted/30 rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap border border-border">
                        {detail.description}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITIES TAB */}
              {activeTab === 'activities' && (
                <ActivityList activities={detail.activities} />
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="p-6">
                  {detail.notes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">No notes recorded</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-4">
                        {detail.notes.map(note => (
                          <div key={note.id} className="flex gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 z-10">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0 bg-muted/30 rounded-xl border border-border p-4">
                              {note.subject && <p className="text-sm font-semibold text-foreground mb-1">{note.subject}</p>}
                              {note.text && <p className="text-xs text-muted-foreground mb-2 leading-relaxed whitespace-pre-wrap">{note.text}</p>}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                {note.createdBy && <span className="flex items-center gap-1"><User className="w-3 h-3" />{note.createdBy}</span>}
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(note.createdOn)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TIMELINE TAB */}
              {activeTab === 'timeline' && (
                <div className="p-6">
                  {detail.timeline.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">No timeline entries</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-3">
                        {detail.timeline.map(post => (
                          <div key={post.id} className="flex gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 z-10">
                              <TimelineIcon icon={post.icon} />
                            </div>
                            <div className="flex-1 min-w-0 py-2">
                              <p className="text-sm text-foreground leading-snug">{post.summary}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                {post.createdBy && !post.isSystemPost && (
                                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.createdBy}</span>
                                )}
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(post.createdOn)}</span>
                                {post.source && <span className="capitalize text-muted-foreground/60">{post.source}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

export default function SalesPipelinePage() {
  const { isLeadership, isSales, isPracticeLead } = useDashboard()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCloses30d, setFilterCloses30d] = useState(false)
  const [filterOwner, setFilterOwner] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [wonLast7d, setWonLast7d] = useState<MiniOpp[]>([])
  const [lostLast7d, setLostLast7d] = useState<MiniOpp[]>([])

  if (!isLeadership && !isSales && !isPracticeLead) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Access denied</div>
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dynamics/opportunities')
      if (!res.ok) throw new Error('Failed to load pipeline data')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOpportunities(data.opportunities ?? [])
      setWonLast7d(data.wonLast7d ?? [])
      setLostLast7d(data.lostLast7d ?? [])
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const owners = Array.from(new Set(opportunities.map(o => o.owner).filter(Boolean))).sort() as string[]
  const companies = Array.from(new Set(opportunities.map(o => o.account).filter(Boolean))).sort() as string[]

  const filtered = (() => {
    let result = search.trim()
      ? opportunities.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
      : opportunities
    if (filterCloses30d) {
      result = result.filter(o => o.closeDate && new Date(o.closeDate) >= now && new Date(o.closeDate) <= in30Days)
    }
    if (filterOwner) {
      result = result.filter(o => o.owner === filterOwner)
    }
    if (filterCompany) {
      result = result.filter(o => o.account === filterCompany)
    }
    return result
  })()

  const byStage = STAGES.reduce<Record<string, Opportunity[]>>((acc, s) => {
    acc[s.key] = filtered.filter(o => o.stage === s.key)
    return acc
  }, {})

  const totalValue = filtered.reduce((sum, o) => sum + o.estimatedValue, 0)
  const totalWeighted = filtered.reduce((sum, o) => sum + o.estimatedValue * (o.closeProbability ?? 0) / 100, 0)
  const totalCount = filtered.length
  const weighted30d = filtered
    .filter(o => o.closeDate && new Date(o.closeDate) >= now && new Date(o.closeDate) <= in30Days)
    .reduce((sum, o) => sum + o.estimatedValue * (o.closeProbability ?? 0) / 100, 0)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const addedLast7d = opportunities.filter(o => new Date(o.createdOn) >= sevenDaysAgo).length
  const sym = opportunities[0]?.estimatedValueFormatted?.replace(/[\d,.\s]/g, '').trim() || '€'
  const fmtTotal = (val: number) =>
    val >= 1_000_000 ? `${sym}${(val / 1_000_000).toFixed(1)}M`
    : val >= 1_000 ? `${sym}${(val / 1_000).toFixed(0)}K`
    : `${sym}${val.toLocaleString()}`

  return (
    <div className="space-y-6 min-h-0">
      {/* Header */}
      <div className="flex items-stretch gap-4 flex-wrap">
        {/* Stats bar */}
        <div className="flex items-stretch gap-0 bg-card border border-border rounded-xl shadow-sm flex-shrink-0">
          <div className="px-5 py-3 flex flex-col justify-center border-r border-border">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Opportunities</p>
            <p className="text-2xl font-bold text-foreground leading-none">
              {totalCount}
              {search && <span className="text-sm font-normal text-muted-foreground ml-1">/ {opportunities.length}</span>}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">open</p>
          </div>
          <div className="px-5 py-3 flex flex-col justify-center border-r border-border bg-[#ea2775]/5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Total Value</p>
            <p className="text-2xl font-bold text-[#ea2775] leading-none">{fmtTotal(totalValue)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">estimated</p>
          </div>
          <div className="px-5 py-3 flex flex-col justify-center bg-emerald-50/60 dark:bg-emerald-950/20 border-r border-border">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Weighted Value</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{fmtTotal(totalWeighted)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">by probability</p>
          </div>
          <div className="px-5 py-3 flex flex-col justify-center bg-amber-50/60 dark:bg-amber-950/20">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Expected Closes (30d)</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-none">{fmtTotal(weighted30d)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">next 30 days</p>
          </div>
          <div className="relative group px-5 py-3 flex flex-col justify-center border-l border-border cursor-default">
            <StatTooltip items={opportunities.filter(o => new Date(o.createdOn) >= sevenDaysAgo)} sym={sym} />
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Opps Added (7d)</p>
            <p className="text-2xl font-bold text-foreground leading-none">{addedLast7d}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">new</p>
          </div>
          <div className="relative group px-5 py-3 flex flex-col justify-center border-l border-border bg-emerald-50/40 dark:bg-emerald-950/20 cursor-default">
            <StatTooltip items={wonLast7d} sym={sym} />
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Opps Won (7d)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
              {wonLast7d.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">closed won</p>
          </div>
          <div className="relative group px-5 py-3 flex flex-col justify-center border-l border-border bg-red-50/40 dark:bg-red-950/20 cursor-default">
            <StatTooltip items={lostLast7d} sym={sym} />
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Opps Lost (7d)</p>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400 leading-none">
              {lostLast7d.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">lost</p>
          </div>
          {lastUpdated && (
            <div className="px-4 py-3 flex flex-col justify-center border-l border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Updated</p>
              <p className="text-sm font-semibold text-foreground leading-none">{lastUpdated.toLocaleTimeString()}</p>
            </div>
          )}
        </div>

        {/* Pipeline Value Distribution — same height as stats bar */}
        {totalCount > 0 && (
          <div className="flex-1 bg-card border border-border rounded-xl shadow-sm px-5 py-3 flex flex-col justify-center min-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Pipeline Value Distribution</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {STAGES.map(stage => {
                const val = (byStage[stage.key] || []).reduce((sum, o) => sum + o.estimatedValue, 0)
                const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
                if (pct === 0) return null
                return <div key={stage.key} className={`${stage.dot}`} style={{ width: `${pct}%` }} title={`${stage.label}: ${fmtTotal(val)} (${pct.toFixed(0)}%)`} />
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {STAGES.map(stage => {
                const val = (byStage[stage.key] || []).reduce((sum, o) => sum + o.estimatedValue, 0)
                const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
                if (pct === 0) return null
                return (
                  <div key={stage.key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-xs text-muted-foreground">{stage.label} {pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Expected close checkbox */}
        <button
          onClick={() => setFilterCloses30d(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none text-sm font-medium ${
            filterCloses30d
              ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-300'
              : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-border/80'
          }`}
        >
          <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
            filterCloses30d
              ? 'bg-amber-500 border-amber-500'
              : 'border-border bg-background'
          }`}>
            {filterCloses30d && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
          </span>
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">Expected close in the next 30 days</span>
        </button>

        {/* Owner filter */}
        <Select value={filterOwner || '__all__'} onValueChange={v => setFilterOwner(v === '__all__' ? '' : v)}>
          <SelectTrigger className={`h-9 w-auto min-w-[150px] gap-1.5 text-sm border rounded-lg bg-card transition-all ${
            filterOwner
              ? 'border-[#ea2775]/60 text-foreground shadow-sm ring-1 ring-[#ea2775]/20'
              : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted'
          }`}>
            <User className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              <span className="text-muted-foreground">All Owners</span>
            </SelectItem>
            {owners.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Company filter */}
        <Select value={filterCompany || '__all__'} onValueChange={v => setFilterCompany(v === '__all__' ? '' : v)}>
          <SelectTrigger className={`h-9 w-auto min-w-[160px] gap-1.5 text-sm border rounded-lg bg-card transition-all ${
            filterCompany
              ? 'border-[#ea2775]/60 text-foreground shadow-sm ring-1 ring-[#ea2775]/20'
              : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted'
          }`}>
            <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              <span className="text-muted-foreground">All Companies</span>
            </SelectItem>
            {companies.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search opportunities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60 w-56 transition-colors"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Kanban board */}
      {loading && opportunities.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading opportunities from Dynamics 365…</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <StageColumn
              key={stage.key}
              stage={stage}
              opportunities={byStage[stage.key] || []}
              onCardClick={opp => setSelectedOppId(opp.id)}
              fmtV={fmtTotal}
            />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedOppId && (
        <DetailDrawer oppId={selectedOppId} onClose={() => setSelectedOppId(null)} />
      )}
    </div>
  )
}

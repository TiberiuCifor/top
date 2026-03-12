'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ProjectStatusDetailModal } from '@/components/modals/ProjectStatusDetailModal'
import { useProjectRagStatuses } from '@/hooks/useResourceData'
import type { Project, ProjectRagStatus, ProjectRagStatusInput } from '@/lib/types'
import { ArrowLeft, Plus, History, LayoutDashboard, Send, CircleAlert, MessageSquare, Trophy, AlertTriangle, ListChecks, Users, Star, ChevronRight, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ProjectStatusViewProps {
  project: Project
  onBack: () => void
}

const ragColors = {
  R: 'bg-rose-500 hover:bg-rose-600',
  A: 'bg-amber-500 hover:bg-amber-600',
  G: 'bg-emerald-500 hover:bg-emerald-600',
}

const ragTextColors = {
  R: 'text-rose-700 bg-rose-50 border-rose-100',
  A: 'text-amber-700 bg-amber-50 border-amber-100',
  G: 'text-emerald-700 bg-emerald-50 border-emerald-100',
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

export function ProjectStatusView({ project, onBack }: ProjectStatusViewProps) {
  const { statuses, loading, createStatus, updateStatus, deleteStatus } = useProjectRagStatuses(project.id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ProjectRagStatus | null>(null)
  const [formData, setFormData] = useState<Partial<ProjectRagStatusInput>>({
    team_score: 5,
    client_score: 5,
    rag_score: 'G',
    important_updates: '',
    important_achievements: '',
    top_performers: '',
    concerns_risks: '',
    action_items: '',
  })

  const latestStatus = statuses[0]

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch (e) {
      return 'Invalid Date'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.team_score || !formData.client_score || !formData.rag_score) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    const { error } = await createStatus({
      project_id: project.id,
      team_score: formData.team_score,
      client_score: formData.client_score,
      rag_score: formData.rag_score as 'R' | 'A' | 'G',
      important_updates: formData.important_updates || '',
      important_achievements: formData.important_achievements || '',
      top_performers: formData.top_performers || '',
      concerns_risks: formData.concerns_risks || '',
      action_items: formData.action_items || '',
    })

    if (error) {
      toast.error('Failed to add status update')
    } else {
      toast.success('Status update added successfully')
      setFormData({
        team_score: 5,
        client_score: 5,
        rag_score: 'G',
        important_updates: '',
        important_achievements: '',
        top_performers: '',
        concerns_risks: '',
        action_items: '',
      })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="bg-card min-h-[calc(100vh-140px)] rounded-[2.5rem] shadow-sm border border-border p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl h-12 w-12 hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </Button>
          <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h2>
              </div>
            <p className="text-muted-foreground font-medium mt-1">Manage RAG Status, Health Sentiment & Performance History</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end px-4 border-r border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Updates</span>
            <span className="text-xl font-bold text-foreground">{statuses.length}</span>
          </div>
          <div className="flex flex-col items-end px-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Update</span>
            <span className="text-xl font-bold text-foreground">{latestStatus ? formatDate(latestStatus.created_at) : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Row 1: Latest Pulse (Accordion) */}
        <Accordion type="single" collapsible defaultValue="latest-pulse" className="w-full">
            <AccordionItem value="latest-pulse" className="border-none">
            <AccordionTrigger className="hover:no-underline p-0 flex-row-reverse gap-4 [&[data-state=open]>div>header]:rounded-b-none">
              <div className="w-full">
                <header className="w-full bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between py-4 px-6 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                        <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-foreground">Latest Pulse</h3>
                        <p className="text-xs text-muted-foreground font-medium">Current project health and sentiment snapshot</p>
                      </div>
                    </div>
                    
                    {latestStatus && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scoreColors(latestStatus.team_score)}`}>
                          <Users className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Team: {latestStatus.team_score}/5</span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scoreColors(latestStatus.client_score)}`}>
                          <Star className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Client: {latestStatus.client_score}/5</span>
                        </div>
                        <Badge className={`${ragColors[latestStatus.rag_score] || ''} text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-sm border-none`}>
                          {latestStatus.rag_score === 'R' ? 'Critical Status' : latestStatus.rag_score === 'A' ? 'At Risk' : 'Healthy Status'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </header>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-0">
              <Card className="border border-border rounded-2xl shadow-xl shadow-slate-200/40 bg-card overflow-hidden">
                <CardContent className="p-0">
                  {latestStatus ? (
                    <div className="divide-y divide-border">
                      <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Main Sentiment Scores */}
                        <div className="lg:col-span-4 p-8 bg-background/50 border-r border-border">
                          <h4 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
                            <CircleAlert className="w-4 h-4 text-primary" />
                            Sentiment Breakdown
                          </h4>
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Team Satisfaction</Label>
                                <span className={`text-lg font-bold ${scoreColors(latestStatus.team_score).split(' ')[0]}`}>{latestStatus.team_score}/5</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${ragColors[latestStatus.team_score >= 4 ? 'G' : latestStatus.team_score >= 3 ? 'A' : 'R']}`} style={{ width: `${(latestStatus.team_score / 5) * 100}%` }} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Client Feedback</Label>
                                <span className={`text-lg font-bold ${scoreColors(latestStatus.client_score).split(' ')[0]}`}>{latestStatus.client_score}/5</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${ragColors[latestStatus.client_score >= 4 ? 'G' : latestStatus.client_score >= 3 ? 'A' : 'R']}`} style={{ width: `${(latestStatus.client_score / 5) * 100}%` }} />
                              </div>
                            </div>
                            <div className={`mt-8 p-4 rounded-2xl border ${ragTextColors[latestStatus.rag_score]}`}>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Overall Health Rating</p>
                              <p className="text-xl font-bold">{latestStatus.rag_score === 'R' ? 'Critical Attention Required' : latestStatus.rag_score === 'A' ? 'Monitor Closely' : 'All systems normal'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Notes */}
                        <div className="lg:col-span-8 p-8 space-y-8 bg-card">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-primary">
                                <MessageSquare className="w-5 h-5" />
                                <Label className="text-xs font-bold uppercase tracking-widest">Crucial Updates</Label>
                              </div>
                              <div className="bg-background/50 p-4 rounded-2xl border border-border min-h-[100px]">
                                <p className="text-foreground leading-relaxed text-[15px] whitespace-pre-wrap">
                                  {latestStatus.important_updates || "No major updates recorded for this period."}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-rose-600">
                                <AlertTriangle className="w-5 h-5" />
                                <Label className="text-xs font-bold uppercase tracking-widest">Active Risks & Blockers</Label>
                              </div>
                              <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100 min-h-[100px]">
                                <p className="text-rose-900/80 leading-relaxed text-[15px] whitespace-pre-wrap">
                                  {latestStatus.concerns_risks || "No active risks or blockers identified."}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-emerald-600">
                                <Trophy className="w-4 h-4" />
                                <Label className="text-[10px] font-bold uppercase tracking-widest">Key Wins</Label>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{latestStatus.important_achievements || "None specified."}</p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-amber-600">
                                <ListChecks className="w-4 h-4" />
                                <Label className="text-[10px] font-bold uppercase tracking-widest">Action Items</Label>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{latestStatus.action_items || "None specified."}</p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-[#ea2775]">
                                <Users className="w-4 h-4" />
                                <Label className="text-[10px] font-bold uppercase tracking-widest">Recognition</Label>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{latestStatus.top_performers || "None specified."}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <div className="bg-background w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                        <CircleAlert className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-foreground font-bold text-xl">No Status History Found</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto mt-2">There are currently no RAG status updates for this project. Use the form below to record the first pulse.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Row 2: Log Status Entry (Accordion) */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="log-status" className="border-none">
            <AccordionTrigger className="hover:no-underline p-0 flex-row-reverse gap-4 [&[data-state=open]>div>header]:rounded-b-none">
              <div className="w-full">
                <header className="w-full bg-card border border-primary/20 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <div className="flex items-center justify-between py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/5 p-2.5 rounded-xl border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-foreground">New Status Entry</h3>
                        <p className="text-xs text-muted-foreground font-medium">Capture current project velocity and health</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                      Expand Form <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </header>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <Card className="border border-primary/20 rounded-2xl shadow-xl shadow-primary/5 bg-card overflow-hidden">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="team_score" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Team Sentiment (1-5)</Label>
                        <Select 
                          value={formData.team_score?.toString()} 
                          onValueChange={(v) => setFormData({ ...formData, team_score: parseInt(v) })}
                        >
                          <SelectTrigger id="team_score" className="h-14 font-bold border-border rounded-xl focus:ring-primary/20 hover:border-primary/30 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <SelectItem key={s} value={s.toString()} className="font-bold py-3">{s} - {s === 5 ? 'Excellent' : s === 4 ? 'Very Good' : s === 3 ? 'Good' : s === 2 ? 'Needs Attention' : 'Poor'}</SelectItem>
                              ))}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="client_score" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Client Satisfaction (1-5)</Label>
                        <Select 
                          value={formData.client_score?.toString()} 
                          onValueChange={(v) => setFormData({ ...formData, client_score: parseInt(v) })}
                        >
                          <SelectTrigger id="client_score" className="h-14 font-bold border-border rounded-xl focus:ring-primary/20 hover:border-primary/30 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <SelectItem key={s} value={s.toString()} className="font-bold py-3">{s} - {s === 5 ? 'Excellent' : s === 4 ? 'Very Good' : s === 3 ? 'Good' : s === 2 ? 'Needs Attention' : 'Critical'}</SelectItem>
                              ))}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="rag_score" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Overall Project Health</Label>
                        <Select 
                          value={formData.rag_score} 
                          onValueChange={(v) => setFormData({ ...formData, rag_score: v as any })}
                        >
                          <SelectTrigger id="rag_score" className="h-14 font-bold border-border rounded-xl focus:ring-primary/20 hover:border-primary/30 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="G" className="font-bold text-emerald-600 py-3">Green (Healthy / On Track)</SelectItem>
                            <SelectItem value="A" className="font-bold text-amber-600 py-3">Amber (At Risk / Needs Review)</SelectItem>
                            <SelectItem value="R" className="font-bold text-rose-600 py-3">Red (Critical / Blocked)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="important_updates" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Crucial Status Updates</Label>
                        <Textarea 
                          id="important_updates" 
                          placeholder="Highlight key project developments, phase changes, or major milestones hit..."
                          value={formData.important_updates ?? ''}
                          onChange={(e) => setFormData({ ...formData, important_updates: e.target.value })}
                          className="min-h-[160px] border-border rounded-2xl focus:ring-primary/20 bg-background/20 hover:bg-card transition-all text-[15px] p-5"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="concerns_risks" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Risks, Concerns & Blockers</Label>
                        <Textarea 
                          id="concerns_risks" 
                          placeholder="Identify any potential threats, resource constraints, or technical blockers..."
                          value={formData.concerns_risks ?? ''}
                          onChange={(e) => setFormData({ ...formData, concerns_risks: e.target.value })}
                          className="min-h-[160px] border-border rounded-2xl focus:ring-rose-100 bg-rose-50/10 hover:bg-card transition-all text-[15px] p-5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="important_achievements" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Key Achievements</Label>
                        <Textarea 
                          id="important_achievements" 
                          placeholder="Recent wins?"
                          value={formData.important_achievements ?? ''}
                          onChange={(e) => setFormData({ ...formData, important_achievements: e.target.value })}
                          className="min-h-[120px] border-border rounded-2xl focus:ring-emerald-100 bg-emerald-50/10 transition-all text-sm p-4"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="action_items" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Critical Action Items</Label>
                        <Textarea 
                          id="action_items" 
                          placeholder="Immediate next steps..."
                          value={formData.action_items ?? ''}
                          onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                          className="min-h-[120px] border-border rounded-2xl focus:ring-amber-100 bg-amber-50/10 transition-all text-sm p-4"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="top_performers" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Top Performers / Kudos</Label>
                        <Textarea 
                          id="top_performers" 
                          placeholder="Who stood out?"
                          value={formData.top_performers ?? ''}
                          onChange={(e) => setFormData({ ...formData, top_performers: e.target.value })}
                          className="min-h-[120px] border-border rounded-2xl focus:ring-[#ea2775]/20 bg-[#ea2775]/10 transition-all text-sm p-4"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="w-full lg:w-[300px] h-14 text-base font-bold uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl transition-all hover:translate-y-[-2px] active:translate-y-[0px]" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting update..." : (
                          <>
                            <Send className="w-5 h-5 mr-3" />
                            Post Status Update
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Row 3: Activity History (Full Width) */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="bg-muted p-2 rounded-xl">
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Historical Activity</h3>
                <p className="text-xs text-muted-foreground font-medium">Complete record of project health over time</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-border text-muted-foreground font-bold px-3 py-1">
                {statuses.length} Logs Archived
              </Badge>
            </div>
          </div>
          
          <Card className="border border-border rounded-2xl shadow-sm overflow-hidden bg-card">
            <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-background/80">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-[180px] text-center font-bold uppercase tracking-widest text-[11px] text-muted-foreground h-14">
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            Date Logged
                          </div>
                        </TableHead>
                      <TableHead className="w-[100px] text-center font-bold uppercase tracking-widest text-[11px] text-muted-foreground">Team Score</TableHead>
                      <TableHead className="w-[100px] text-center font-bold uppercase tracking-widest text-[11px] text-muted-foreground">Client Score</TableHead>
                      <TableHead className="w-[100px] text-center font-bold uppercase tracking-widest text-[11px] text-muted-foreground">RAG Status</TableHead>
                      <TableHead className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">Updates Summary</TableHead>
                      <TableHead className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">Action Items</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="font-medium">Loading history...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : statuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-medium">
                        No historical status updates found for this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statuses.map((status) => (
                      <TableRow 
                        key={status.id} 
                        className="group cursor-pointer hover:bg-background/50 transition-colors border-border"
                        onClick={() => setSelectedStatus(status)}
                      >
                        <TableCell className="font-bold text-foreground py-5 text-center">
                            {formatDate(status.created_at)}
                          </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${scoreColors(status.team_score)}`}>
                            {status.team_score}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${scoreColors(status.client_score)}`}>
                            {status.client_score}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${ragColors[status.rag_score] || ''} text-white px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-lg border-none`}>
                            {status.rag_score === 'R' ? 'Red' : status.rag_score === 'A' ? 'Amber' : 'Green'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                              {status.important_updates || status.concerns_risks || status.important_achievements || <span className="text-muted-foreground italic">No notes provided</span>}
                            </p>
                            {(status.important_updates && (status.concerns_risks || status.important_achievements)) && (
                              <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">Multiple categories recorded</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm font-medium text-amber-700 line-clamp-2 leading-relaxed">
                              {status.action_items || <span className="text-muted-foreground italic">No action items</span>}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      <ProjectStatusDetailModal 
        open={!!selectedStatus} 
        onClose={() => setSelectedStatus(null)} 
        status={selectedStatus} 
        onSave={async (id, data) => {
          const { error } = await updateStatus(id, data)
          if (error) toast.error('Failed to update status')
          else toast.success('Status updated successfully')
        }}
        onDelete={async (id) => {
          const { error } = await deleteStatus(id)
          if (error) toast.error('Failed to delete status')
          else {
            toast.success('Status deleted successfully')
            setSelectedStatus(null)
          }
        }}
      />
    </div>
  )
}

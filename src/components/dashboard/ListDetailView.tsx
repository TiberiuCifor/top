'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Briefcase, Send, Trash2, MessageSquare, Users, Pencil, FolderOpen, Check, X, ThumbsUp } from 'lucide-react'
import type { EmployeeListComment, EmployeeList, Assignment } from '@/lib/types'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface ListDetailViewProps {
  list: EmployeeList
  assignments: Assignment[]
  comments: EmployeeListComment[]
  commentsLoading: boolean
  currentUserId: string | null
  currentUserName: string | null
  onEdit: () => void
  onAddComment: (text: string) => Promise<void>
  onDeleteComment: (id: string) => Promise<void>
  onUpdateMemberDetails: (memberId: string, details: string) => Promise<void>
  onToggleReaction: (commentId: string, emoji: string) => Promise<void>
  employees: { id: string; full_name: string; photo_url?: string | null }[]
}

function InlineDetailsCell({ memberId, initialValue, onSave }: {
  memberId: string
  initialValue: string | null
  onSave: (memberId: string, value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setValue(initialValue ?? '')
  }, [initialValue, editing])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const handleSave = useCallback(async () => {
    setSaving(true)
    await onSave(memberId, value)
    setSaving(false)
    setEditing(false)
  }, [memberId, value, onSave])

  const handleCancel = () => {
    setValue(initialValue ?? '')
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') handleCancel()
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Add details..."
          className="w-full text-xs rounded-md border border-[#ea2775] bg-background px-2 py-1.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[#ea2775] min-w-[160px]"
          disabled={saving}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ea2775] text-white hover:bg-[#d01e65] disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-border text-muted-foreground hover:bg-muted"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="group relative cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors min-h-[32px] min-w-[120px]"
      title="Click to edit"
    >
      {value ? (
        <span className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{value}</span>
      ) : (
        <span className="text-xs text-muted-foreground/40 italic">Click to add details...</span>
      )}
      <Pencil className="w-3 h-3 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground" />
    </div>
  )
}

function CommentInput({
  value,
  onChange,
  onSubmit,
  submitting,
  employees,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  employees: { id: string; full_name: string; photo_url?: string | null }[]
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const suggestions = mentionQuery !== null
    ? employees.filter(e => e.full_name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : []

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    onChange(v)
    const pos = e.target.selectionStart ?? v.length
    const before = v.slice(0, pos)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionStart(pos - match[0].length)
      setSelectedIdx(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (emp: { id: string; full_name: string }) => {
    const before = value.slice(0, mentionStart)
    const after = value.slice(textareaRef.current?.selectionStart ?? mentionStart + (mentionQuery?.length ?? 0) + 1)
    const inserted = `@${emp.full_name} `
    const next = before + inserted + after
    onChange(next)
    setMentionQuery(null)
    setTimeout(() => {
      textareaRef.current?.focus()
      const pos = before.length + inserted.length
      textareaRef.current?.setSelectionRange(pos, pos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(suggestions[selectedIdx]); return }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit(e as any)
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-3 border-t border-border flex flex-col gap-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (Ctrl+Enter to send, @ to mention)"
          className="text-xs resize-none min-h-[60px] max-h-24"
          disabled={submitting}
        />
        {mentionQuery !== null && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full mb-1 left-0 z-50 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {suggestions.map((emp, idx) => (
              <button
                key={emp.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); insertMention(emp) }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${idx === selectedIdx ? 'bg-[#ea2775]/10 text-[#ea2775]' : 'hover:bg-muted text-foreground'}`}
              >
                <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size="xs" shape="circle" />
                {emp.full_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        type="submit"
        size="sm"
        className="h-7 text-xs bg-[#ea2775] hover:bg-[#d01e65] text-white self-end"
        disabled={!value.trim() || submitting}
      >
        <Send className="w-3 h-3 mr-1.5" />
        {submitting ? 'Sending...' : 'Send'}
      </Button>
    </form>
  )
}

export function ListDetailView({
  list,
  assignments,
  comments,
  commentsLoading,
  currentUserId,
  currentUserName,
  onEdit,
  onAddComment,
  onDeleteComment,
  onUpdateMemberDetails,
  onToggleReaction,
  employees,
}: ListDetailViewProps) {
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fteOnly, setFteOnly] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      await onAddComment(commentText.trim())
      setCommentText('')
    } finally {
      setSubmitting(false)
    }
  }

  const allMembers = list.members ?? []
  const members = fteOnly ? allMembers.filter(m => m.employee?.contract_type === 'FTE') : allMembers

  const getActiveAssignment = (employeeId: string) => {
    const active = assignments
      .filter(a => a.employee_id === employeeId && a.status === 'active')
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    return active[0] ?? null
  }

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/lists">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{list.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                list.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${list.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {list.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{list.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-shrink-0 h-8 text-xs">
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit List
        </Button>
      </div>

      {/* Main body: 75% table + 25% comments */}
      <div className="flex gap-4 items-start">
        {/* Employees table — 75% */}
        <div className="flex-[3] min-w-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Employees</span>
                <span className="ml-1 inline-flex items-center px-1.5 py-0 h-5 text-[10px] font-bold rounded-full bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775]">
                  {members.length}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <div
                      onClick={() => setFteOnly(v => !v)}
                      className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${fteOnly ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${fteOnly ? 'translate-x-3' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">Show only FTEs</span>
                  </label>
                </div>
              </div>

            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-3 rounded-2xl bg-muted mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No employees in this list yet.</p>
                <button onClick={onEdit} className="mt-2 text-xs text-[#ea2775] hover:underline">
                  Edit list to add employees
                </button>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-320px)]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contract</th>
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Practice</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Assignment</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => {
                      const emp = member.employee
                      if (!emp) return null
                      return (
                          <tr key={member.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size="md" />
                                  <span className="text-sm font-semibold text-foreground">{emp.full_name}</span>
                                </div>
                              </td>
                            <td className="px-4 py-3">
                              {emp.role_data?.name ? (
                                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/60" />
                                  {emp.role_data.name}
                                </span>
                              ) : <span className="text-sm text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                emp.contract_type === 'FTE'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-[#ea2775]/10 text-[#ea2775] dark:bg-[#ea2775]/10 dark:text-[#ea2775]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${emp.contract_type === 'FTE' ? 'bg-emerald-500' : 'bg-[#ea2775]/100'}`} />
                                {emp.contract_type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground">
                                {emp.practice?.name ?? <span className="opacity-40">—</span>}
                              </span>
                            </td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const a = getActiveAssignment(emp.id)
                                  if (!a) return <span className="text-sm text-muted-foreground/40">—</span>
                                  const endDate = a.end_date
                                    ? new Date(a.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    : null
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/60" />
                                      <span className="text-sm text-foreground font-medium">{a.project?.name ?? 'Unknown'}</span>
                                      {endDate && (
                                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                          | ending {endDate}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </td>
                              <td className="px-2 py-2 min-w-[180px] max-w-[280px]">
                                <InlineDetailsCell
                                  memberId={member.id}
                                  initialValue={member.details ?? null}
                                  onSave={onUpdateMemberDetails}
                                />
                              </td>
                          </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Comments panel — 25% */}
        <div className="flex-1 min-w-0 flex flex-col bg-card rounded-xl border border-border overflow-hidden" style={{ minWidth: '240px', maxWidth: '320px' }}>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Comments</span>
            {comments.length > 0 && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0 h-5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground">
                {comments.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-380px)] min-h-[200px]">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
              </div>
            ) : (
              comments.map(comment => {
                const isOwn = comment.created_by === currentUserId
                const authorName = comment.created_by_user?.full_name ?? 'Unknown'
                const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                const date = new Date(comment.created_at)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                const thumbsUpUsers: string[] = comment.reactions?.['👍'] ?? []
                const iThumbsUp = currentUserId ? thumbsUpUsers.includes(currentUserId) : false

                return (
                  <div key={comment.id} className="flex gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ea2775] to-[#c01560] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-foreground truncate">{authorName}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{dateStr} {timeStr}</span>
                        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                          {currentUserId && (
                            <button
                              onClick={() => onToggleReaction(comment.id, '👍')}
                              title={iThumbsUp ? 'Remove acknowledgement' : 'Acknowledge'}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted ${iThumbsUp ? '!opacity-100' : ''}`}
                            >
                              <ThumbsUp className={`w-3 h-3 ${iThumbsUp ? 'text-[#ea2775] fill-[#ea2775]' : 'text-muted-foreground'}`} />
                            </button>
                          )}
                          {isOwn && (
                            <button
                              onClick={() => onDeleteComment(comment.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-foreground/80 break-words leading-relaxed">{comment.comment_text}</p>
                      {thumbsUpUsers.length > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            onClick={() => currentUserId && onToggleReaction(comment.id, '👍')}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                              iThumbsUp
                                ? 'bg-[#ea2775]/10 border-[#ea2775]/30 text-[#ea2775]'
                                : 'bg-muted/50 border-border text-muted-foreground hover:border-[#ea2775]/30 hover:text-[#ea2775]'
                            }`}
                          >
                            <ThumbsUp className={`w-2.5 h-2.5 ${iThumbsUp ? 'fill-[#ea2775]' : ''}`} />
                            {thumbsUpUsers.length}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          <CommentInput
            value={commentText}
            onChange={setCommentText}
            onSubmit={handleSubmitComment}
            submitting={submitting}
            employees={employees}
          />
        </div>
      </div>
    </div>
  )
}

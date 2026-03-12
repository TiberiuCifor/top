'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Employee } from '@/lib/types'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

interface Skill {
  id: number
  skill: string
  level: number
  comment: string | null
}

interface SkillsModalProps {
  open: boolean
  onClose: () => void
  employee: Employee | null
}

const LEVEL_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Beginner',     color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-slate-400' },
  2: { label: 'Elementary',   color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-400' },
  3: { label: 'Intermediate', color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-400' },
  4: { label: 'Advanced',     color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500' },
  5: { label: 'Expert',       color: 'text-[#ea2775]',                       bg: 'bg-[#ea2775]' },
}

function LevelDots({ level }: { level: number }) {
  const meta = LEVEL_LABELS[level] ?? LEVEL_LABELS[1]
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${i < level ? meta.bg : 'bg-muted-foreground/20'}`}
        />
      ))}
    </div>
  )
}

export function SkillsModal({ open, onClose, employee }: SkillsModalProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !employee) return
    setLoading(true)
    setError(null)
    setSkills([])

    const params = new URLSearchParams()
    if ((employee as Employee & { bamboo_id?: string }).bamboo_id) {
      params.set('bambooId', (employee as Employee & { bamboo_id?: string }).bamboo_id!)
    } else {
      params.set('name', employee.full_name)
    }

    fetch(`/api/bamboohr/skills?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setSkills(d.skills ?? [])
      })
      .catch(() => setError('Failed to load skills'))
      .finally(() => setLoading(false))
  }, [open, employee])

  const grouped = skills.reduce<Record<number, Skill[]>>((acc, s) => {
    ;(acc[s.level] = acc[s.level] || []).push(s)
    return acc
  }, {})
  const sortedLevels = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {employee && <EmployeeAvatar name={employee.full_name} photoUrl={employee.photo_url} size="md" />}
            <span>{employee?.full_name}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground pt-0.5">Skill Repository — from BambooHR</p>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-2 border-[#ea2775]/20 rounded-full" />
              <div className="absolute inset-0 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-3">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            {error.includes('not found') && (
              <p className="text-xs text-rose-500/70 mt-1">
                Tip: Set a <strong>bamboo_id</strong> on this employee to link them directly.
              </p>
            )}
          </div>
        )}

        {!loading && !error && skills.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No skills recorded in BambooHR yet.
          </div>
        )}

        {!loading && !error && skills.length > 0 && (
          <div className="space-y-5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{skills.length} skill{skills.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-3">
                {[5, 4, 3].map(l => {
                  const m = LEVEL_LABELS[l]
                  const count = (grouped[l] ?? []).length
                  if (!count) return null
                  return (
                    <span key={l} className={`text-[11px] font-medium ${m.color}`}>
                      {count} {m.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {sortedLevels.map(level => {
              const meta = LEVEL_LABELS[level] ?? LEVEL_LABELS[1]
              return (
                <div key={level}>
                  <div className="flex items-center gap-2 mb-2">
                    <LevelDots level={level} />
                    <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-muted-foreground/50">({grouped[level].length})</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {grouped[level].map(skill => (
                      <div
                        key={skill.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                        {skill.comment && (
                          <span className="text-xs text-muted-foreground text-right max-w-[200px] shrink-0 leading-relaxed">
                            {skill.comment}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

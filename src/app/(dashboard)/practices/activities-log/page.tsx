'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, RefreshCw, FileSpreadsheet, FileText, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const PRACTICES = [
  { key: 'PD',  label: 'Practice-Data',                color: 'text-blue-400',   bg: 'bg-blue-500/15',   accent: [59, 130, 246]  },
  { key: 'PA',  label: 'Practice-AI',                  color: 'text-purple-400', bg: 'bg-purple-500/15', accent: [168, 85, 247]  },
  { key: 'PSE', label: 'Practice-Software-Engineering', color: 'text-green-400',  bg: 'bg-green-500/15',  accent: [34, 197, 94]   },
] as const

type PracticeKey = typeof PRACTICES[number]['key']

interface DayData { [date: string]: number }

interface UserRow {
  accountId: string
  name: string
  days: DayData
  total: number
  byProject: Record<string, DayData>
  tasks: Record<string, Record<string, string[]>>
}

function pad(n: number) { return String(n).padStart(2, '0') }
function formatHours(h: number) {
  if (h === 0) return ''
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}
function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getDayLabel(year: number, month: number, day: number) {
  return new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'short' })
}
function isWeekend(year: number, month: number, day: number) {
  const dow = new Date(year, month, day).getDay()
  return dow === 0 || dow === 6
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface PracticeTableProps {
  practice: typeof PRACTICES[number]
  rows: UserRow[]
  year: number
  month: number
  days: number[]
}

function PracticeTable({ practice, rows, year, month, days }: PracticeTableProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null)

  const practiceRows = rows
    .map(row => {
      const projectDays = row.byProject[practice.key] || {}
      const total = Object.values(projectDays).reduce((s, v) => s + v, 0)
      return { ...row, days: projectDays, total }
    })
    .filter(row => row.total > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const todayStr = new Date().toISOString().slice(0, 10)

  const dayTotals: Record<number, number> = {}
  for (const row of practiceRows) {
    for (const d of days) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
      dayTotals[d] = (dayTotals[d] || 0) + (row.days[dateStr] || 0)
    }
  }
  const grandTotal = practiceRows.reduce((s, r) => s + r.total, 0)

    return (
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className={`px-4 py-3 border-b border-border flex items-center gap-3`}>
          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-bold tracking-wide ${practice.bg} ${practice.color}`}>
            {practice.key}
          </span>
          <span className="text-sm font-semibold text-foreground">{practice.label}</span>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {practiceRows.length} contributor{practiceRows.length !== 1 ? 's' : ''} · {formatHours(grandTotal) || '0'} h
          </span>
        </div>

        {practiceRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hours logged for {MONTH_NAMES[month]} {year}
          </div>
        ) : (
          <div className="overflow-x-auto relative" onMouseLeave={() => setTooltip(null)}>
            {tooltip && (
              <div
                className="fixed z-[9999] pointer-events-none bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-xs text-foreground max-w-xs"
                style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
              >
                {tooltip.lines.map((line, i) => (
                  <div key={i} className="whitespace-nowrap py-0.5 leading-relaxed">{line}</div>
                ))}
              </div>
            )}
          <table className="w-full text-[11px] border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '120px' }} />
              <col style={{ width: '44px' }} />
            </colgroup>
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="sticky left-0 z-10 bg-muted/40 text-left px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide truncate w-[120px] max-w-[120px]">
                  User
                </th>
                <th className="px-1 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap w-[44px]">
                  Total
                </th>
                {days.map(d => {
                  const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
                  const weekend = isWeekend(year, month, d)
                  const today = todayStr === dateStr
                  return (
                    <th
                      key={d}
                      className={`px-0.5 py-2.5 text-center font-semibold whitespace-nowrap w-[28px]
                        ${weekend ? 'bg-muted/60 text-muted-foreground/50' : 'text-muted-foreground'}
                        ${today ? 'ring-1 ring-inset ring-[#ea2775]/40' : ''}`}
                    >
                      <div className="text-[9px] font-normal">{getDayLabel(year, month, d)}</div>
                      <div className="text-[10px]">{d}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {practiceRows.map((row, ri) => (
                <tr key={row.accountId} className={`${ri % 2 === 0 ? '' : 'bg-muted/20'} hover:bg-muted/30 transition-colors`}>
                  <td className="sticky left-0 z-10 bg-inherit px-2 py-2 font-medium text-foreground truncate border-r border-border/50 max-w-[120px]">
                    {row.name}
                  </td>
                  <td className={`px-1 py-2 text-right font-semibold border-r border-border/50 ${practice.color}`}>
                    {row.total > 0 ? formatHours(row.total) : '—'}
                  </td>
                    {days.map(d => {
                      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
                      const h = row.days[dateStr] || 0
                      const weekend = isWeekend(year, month, d)
                      const today = todayStr === dateStr
                      const taskList = row.tasks?.[practice.key]?.[dateStr] || []
                      return (
                        <td
                          key={d}
                          onMouseEnter={h > 0 && taskList.length > 0 ? (e) => {
                            const r = (e.target as HTMLElement).getBoundingClientRect()
                            setTooltip({ x: r.right, y: r.top + r.height / 2, lines: taskList })
                          } : undefined}
                          onMouseLeave={h > 0 && taskList.length > 0 ? () => setTooltip(null) : undefined}
                          className={`px-0.5 py-2 text-center tabular-nums
                            ${h > 0 ? `${practice.bg} ${practice.color} font-semibold cursor-help` : weekend ? 'bg-muted/40' : 'cursor-default'}
                            ${today ? 'ring-1 ring-inset ring-[#ea2775]/30' : ''}
                            ${h === 0 && !weekend ? 'text-muted-foreground/30' : ''}
                          `}
                        >
                          {formatHours(h)}
                        </td>
                      )
                    })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 border-t-2 border-border font-semibold">
                <td className="sticky left-0 z-10 bg-muted/50 px-2 py-2 text-foreground border-r border-border/50 truncate max-w-[120px]">
                  Total
                </td>
                <td className={`px-1 py-2 text-right border-r border-border/50 ${practice.color}`}>
                  {grandTotal > 0 ? formatHours(grandTotal) : '—'}
                </td>
                {days.map(d => {
                  const h = dayTotals[d] || 0
                  const weekend = isWeekend(year, month, d)
                  const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
                  const today = todayStr === dateStr
                  return (
                    <td
                      key={d}
                      className={`px-0.5 py-2 text-center tabular-nums
                        ${weekend ? 'bg-muted/60' : ''}
                        ${today ? 'ring-1 ring-inset ring-[#ea2775]/40' : ''}
                        ${h > 0 ? 'text-foreground' : 'text-muted-foreground/30'}
                      `}
                    >
                      {formatHours(h)}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export default function PracticesActivitiesLogPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedKeys, setSelectedKeys] = useState<PracticeKey[]>(['PD', 'PA', 'PSE'])
  const [comboOpen, setComboOpen] = useState(false)

  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    supabase.from('employees').select('jira_user_id, bamboo_id')
  }, [])

  const fetchData = useCallback(async () => {
    if (selectedKeys.length === 0) { setRows([]); return }
    setLoading(true)
    setError(null)
    const from = `${year}-${pad(month + 1)}-01`
    const daysInMonthCount = getDaysInMonth(year, month)
    const to = `${year}-${pad(month + 1)}-${pad(daysInMonthCount)}`

    try {
      const res = await fetch(
        `/api/tempo/worklogs?projectKeys=${selectedKeys.join(',')}&from=${from}&to=${to}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')

      const byUser: Record<string, { displayName: string; days: Record<string, number>; byProject: Record<string, Record<string, number>>; tasks: Record<string, Record<string, string[]>> }> = data.byUser || {}

        const built: UserRow[] = Object.entries(byUser).map(([accountId, { displayName, days, byProject, tasks }]) => ({
          accountId,
          name: displayName,
          days,
          total: Object.values(days).reduce((s, v) => s + v, 0),
          byProject: byProject || {},
          tasks: tasks || {},
        })).sort((a, b) => a.name.localeCompare(b.name))

      setRows(built)
      setLastSync(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [year, month, selectedKeys])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const togglePractice = (key: PracticeKey) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const visiblePractices = PRACTICES.filter(p => selectedKeys.includes(p.key))

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const wb = utils.book_new()

    for (const practice of visiblePractices) {
      const practiceRows = rows
        .map(row => {
          const projectDays = row.byProject[practice.key] || {}
          const total = Object.values(projectDays).reduce((s, v) => s + v, 0)
          return { ...row, days: projectDays, total }
        })
        .filter(row => row.total > 0)
        .sort((a, b) => a.name.localeCompare(b.name))

      const headers = ['User', 'Total', ...days.map(d => `${d} ${getDayLabel(year, month, d)}`)]
      const dataRows = practiceRows.map(row => [
        row.name,
        row.total || '',
        ...days.map(d => {
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
          return row.days[dateStr] || ''
        }),
      ])
      const dayTotals: Record<number, number> = {}
      for (const row of practiceRows) {
        for (const d of days) {
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
          dayTotals[d] = (dayTotals[d] || 0) + (row.days[dateStr] || 0)
        }
      }
      const grandTotal = practiceRows.reduce((s, r) => s + r.total, 0)
      const totalsRow = ['TOTAL', grandTotal || '', ...days.map(d => dayTotals[d] || '')]
      const ws = utils.aoa_to_sheet([headers, ...dataRows, totalsRow])
      utils.book_append_sheet(wb, ws, practice.key)
    }

    writeFile(wb, `practices-activities-${MONTH_NAMES[month]}-${year}.xlsx`)
  }

  const exportPdf = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
    let startY = 46

    for (let pi = 0; pi < visiblePractices.length; pi++) {
      const practice = visiblePractices[pi]
      const practiceRows = rows
        .map(row => {
          const projectDays = row.byProject[practice.key] || {}
          const total = Object.values(projectDays).reduce((s, v) => s + v, 0)
          return { ...row, days: projectDays, total }
        })
        .filter(row => row.total > 0)
        .sort((a, b) => a.name.localeCompare(b.name))

      if (pi === 0) {
        doc.setFontSize(12)
        doc.text(`Practices Activities Log — ${MONTH_NAMES[month]} ${year}`, 40, 32)
      } else {
        doc.addPage()
        startY = 46
      }

      doc.setFontSize(10)
      doc.text(`${practice.key} · ${practice.label}`, 40, startY - 8)

      const dayTotals: Record<number, number> = {}
      for (const row of practiceRows) {
        for (const d of days) {
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
          dayTotals[d] = (dayTotals[d] || 0) + (row.days[dateStr] || 0)
        }
      }
      const grandTotal = practiceRows.reduce((s, r) => s + r.total, 0)

      const head = ['User', 'Total', ...days.map(d => String(d))]
      const body = practiceRows.map(row => [
        row.name,
        row.total > 0 ? String(Number.isInteger(row.total) ? row.total : row.total.toFixed(1)) : '',
        ...days.map(d => {
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
          const h = row.days[dateStr]
          return h ? String(Number.isInteger(h) ? h : h.toFixed(1)) : ''
        }),
      ])
      const totalsRow = [
        'TOTAL',
        grandTotal > 0 ? String(Number.isInteger(grandTotal) ? grandTotal : grandTotal.toFixed(1)) : '',
        ...days.map(d => dayTotals[d] ? String(Number.isInteger(dayTotals[d]) ? dayTotals[d] : dayTotals[d].toFixed(1)) : ''),
      ]

      autoTable(doc, {
        head: [head],
        body: [...body, totalsRow],
        startY,
        styles: { fontSize: 6, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 40], fontSize: 6, halign: 'center' },
        columnStyles: { 0: { cellWidth: 90 } },
        didParseCell: (data) => {
          const isTotalsRow = data.section === 'body' && data.row.index === body.length
          if (isTotalsRow) {
            data.cell.styles.fillColor = [40, 40, 55]
            data.cell.styles.fontStyle = 'bold'
            return
          }
          if (data.section === 'body' && data.column.index > 1) {
            const colDay = data.column.index - 1
            if (isWeekend(year, month, colDay)) data.cell.styles.fillColor = [40, 40, 50]
          }
        },
      })
    }

    doc.save(`practices-activities-${MONTH_NAMES[month]}-${year}.pdf`)
  }

  const comboLabel = selectedKeys.length === 3
    ? 'All Practices'
    : selectedKeys.length === 0
    ? 'No Practice selected'
    : selectedKeys.join(', ')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#ea2775]" />
            Activities Log
          </h1>
          <p className="text-sm text-muted-foreground">Hours logged in Tempo across Practice projects</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-base font-semibold text-foreground min-w-[140px] text-center">
              {MONTH_NAMES[month]} {year}
            </h2>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <button
              onClick={() => setComboOpen(o => !o)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-accent transition-colors min-w-[200px] justify-between"
            >
              <span className="truncate">{comboLabel}</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
            {comboOpen && (
              <div className="absolute top-full mt-1 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[240px]">
                {PRACTICES.map(p => {
                  const selected = selectedKeys.includes(p.key)
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePractice(p.key)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#ea2775] border-[#ea2775]' : 'border-border'}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>{p.key}</span>
                      <span className="text-muted-foreground truncate">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={fetchData} disabled={loading}
              className="h-7 text-xs gap-1.5 text-muted-foreground"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {lastSync && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                Last sync {lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="sm"
              onClick={exportExcel} disabled={rows.length === 0}
              className="h-7 text-xs gap-1.5 text-green-500 hover:text-green-400 hover:bg-green-500/10"
              title="Export to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={exportPdf} disabled={rows.length === 0}
              className="h-7 text-xs gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="Export to PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {comboOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setComboOpen(false)} />
      )}

      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm flex items-center justify-center h-40 gap-3">
          <div className="w-6 h-6 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading hours...</span>
        </div>
      ) : error ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-destructive text-sm">{error}</div>
      ) : selectedKeys.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-muted-foreground text-sm">
          Select at least one practice to view data
        </div>
      ) : (
        <div className="space-y-6">
          {visiblePractices.map(practice => (
            <PracticeTable
              key={practice.key}
              practice={practice}
              rows={rows}
              year={year}
              month={month}
              days={days}
            />
          ))}
        </div>
      )}
    </div>
  )
}

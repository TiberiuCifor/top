'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, ArrowLeft, Clock, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DayData {
  [date: string]: number
}

interface UserRow {
  accountId: string
  name: string
  days: DayData
  total: number
  expected: number
  pto: number
  uto: number
  ml: number
  sl: number
  ptoDays: string[]
  utoDays: string[]
  mlDays: string[]
  slDays: string[]
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatHours(h: number) {
  if (h === 0) return ''
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getDayLabel(year: number, month: number, day: number) {
  const d = new Date(year, month, day)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function isWeekend(year: number, month: number, day: number) {
  const dow = new Date(year, month, day).getDay()
  return dow === 0 || dow === 6
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const LEAVE_TYPES = [
  { key: 'pto', label: 'PTO', fullLabel: 'PTO — Paid Time Off (Annual Leave)', color: 'text-red-400', bg: 'bg-red-500/15', cellLabel: 'PTO' },
  { key: 'uto', label: 'UTO', fullLabel: 'UTO — Unpaid Time Off', color: 'text-orange-400', bg: 'bg-orange-500/15', cellLabel: 'UTO' },
  { key: 'ml',  label: 'ML',  fullLabel: 'ML — Medical Leave',    color: 'text-blue-400',   bg: 'bg-blue-500/15',   cellLabel: 'ML'  },
  { key: 'sl',  label: 'SL',  fullLabel: 'SL — Special Leave',    color: 'text-purple-400', bg: 'bg-purple-500/15', cellLabel: 'SL'  },
] as const

type LeaveKey = typeof LEAVE_TYPES[number]['key']

export default function LoggedHoursPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [projectName, setProjectName] = useState('')
  const [jiraKey, setJiraKey] = useState<string | null>(null)
  const [loadingProject, setLoadingProject] = useState(true)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [rows, setRows] = useState<UserRow[]>([])
  const [employees, setEmployees] = useState<{ id: string; jira_user_id: string | null; bamboo_id: string | null; full_name: string }[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    supabase
      .from('projects')
      .select('name, jira_project_key')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Project not found')
        } else {
          setProjectName(data.name)
          setJiraKey(data.jira_project_key)
        }
        setLoadingProject(false)
      })

    supabase
      .from('employees')
      .select('id, full_name, jira_user_id, bamboo_id')
      .then(({ data }) => setEmployees(data || []))
  }, [id])

  useEffect(() => {
    if (!jiraKey) return
    supabase
      .from('projects')
      .select('id')
      .eq('jira_project_key', jiraKey)
      .then(({ data: siblings }) => {
        const projectIds = (siblings || []).map((p: { id: string }) => p.id)
        if (projectIds.length === 0) return
        supabase
          .from('assignments')
          .select('employee_id, allocation_percentage, start_date, end_date')
          .in('project_id', projectIds)
          .then(({ data }) => setAssignments(data || []))
      })
  }, [jiraKey])

  const fetchData = useCallback(async () => {
    if (!jiraKey) return
    setLoadingData(true)
    setError(null)
    const from = `${year}-${pad(month + 1)}-01`
    const daysInMonthCount = getDaysInMonth(year, month)
    const to = `${year}-${pad(month + 1)}-${pad(daysInMonthCount)}`

    try {
      const res = await fetch(`/api/tempo/worklogs?projectKey=${jiraKey}&from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')

      const byUser: Record<string, { displayName: string; days: Record<string, number> }> = data.byUser || {}

      const accountIds = Object.keys(byUser)
      const employeeByAccountId: Record<string, typeof employees[0]> = {}
      for (const accountId of accountIds) {
        const emp = employees.find(e => e.jira_user_id === accountId)
        if (emp) employeeByAccountId[accountId] = emp
      }

      const bambooIds = accountIds
        .map(aid => employeeByAccountId[aid]?.bamboo_id)
        .filter(Boolean) as string[]

      let ptoDaysByBambooId: Record<string, string[]> = {}
      let utoDaysByBambooId: Record<string, string[]> = {}
      let mlDaysByBambooId: Record<string, string[]> = {}
      let slDaysByBambooId: Record<string, string[]> = {}

      if (bambooIds.length > 0) {
        const leaveRes = await fetch(
          `/api/bamboohr/time-off?from=${from}&to=${to}&bambooIds=${bambooIds.join(',')}`
        )
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json()
          ptoDaysByBambooId = leaveData.ptoDays || {}
          utoDaysByBambooId = leaveData.utoDays || {}
          mlDaysByBambooId  = leaveData.mlDays  || {}
          slDaysByBambooId  = leaveData.slDays  || {}
        }
      }

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month, daysInMonthCount)

      const built: UserRow[] = Object.entries(byUser).map(([accountId, { displayName, days }]) => {
        const total = Object.values(days).reduce((s, v) => s + v, 0)
        const employee = employeeByAccountId[accountId]

        let expectedHours = 0
        if (employee) {
          const userAssignments = assignments.filter(a => a.employee_id === employee.id)
          for (const assignment of userAssignments) {
            if (!assignment.start_date) continue
            const [ay, am, ad] = assignment.start_date.split('-').map(Number)
            const aStart = new Date(ay, am - 1, ad)

            let aEnd = monthEnd
            if (assignment.end_date) {
              const [ey, em, ed] = assignment.end_date.split('-').map(Number)
              aEnd = new Date(ey, em - 1, ed)
            }

            const rangeStart = aStart > monthStart ? aStart : monthStart
            const rangeEnd = aEnd < monthEnd ? aEnd : monthEnd

            if (rangeStart <= rangeEnd) {
              let workingDays = 0
              const temp = new Date(rangeStart)
              while (temp <= rangeEnd) {
                const dow = temp.getDay()
                if (dow !== 0 && dow !== 6) workingDays++
                temp.setDate(temp.getDate() + 1)
              }
              expectedHours += workingDays * 8 * (assignment.allocation_percentage / 100)
            }
          }
        }

        const bambooId = employee?.bamboo_id
        const ptoDatesArr: string[] = bambooId ? (ptoDaysByBambooId[bambooId] || []) : []
        const utoDatesArr: string[] = bambooId ? (utoDaysByBambooId[bambooId] || []) : []
        const mlDatesArr:  string[] = bambooId ? (mlDaysByBambooId[bambooId]  || []) : []
        const slDatesArr:  string[] = bambooId ? (slDaysByBambooId[bambooId]  || []) : []

        return {
          accountId,
          name: displayName,
          days,
          total,
          expected: expectedHours,
          pto: ptoDatesArr.length * 8,
          uto: utoDatesArr.length * 8,
          ml:  mlDatesArr.length  * 8,
          sl:  slDatesArr.length  * 8,
          ptoDays: ptoDatesArr,
          utoDays: utoDatesArr,
          mlDays:  mlDatesArr,
          slDays:  slDatesArr,
        }
      }).sort((a, b) => a.name.localeCompare(b.name))

      setRows(built)
      setLastSync(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingData(false)
    }
  }, [jiraKey, year, month, employees, assignments])

  useEffect(() => {
    if (!loadingProject && jiraKey && employees.length > 0) fetchData()
  }, [loadingProject, jiraKey, fetchData, employees])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const visLeave = LEAVE_TYPES.filter(lt => rows.some(r => r[lt.key as LeaveKey] > 0))
    const headers = [
      'User', 'Expected', 'Logged',
      ...visLeave.map(lt => lt.label),
      ...days.map(d => `${d} ${getDayLabel(year, month, d)}`),
    ]
    const dataRows = rows.map(row => {
      const leaveCols = visLeave.map(lt => row[lt.key as LeaveKey] || 0)
      const dayCols = days.map(d => {
        const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
        const lt = getCellLeaveType(row, dateStr)
        return lt ? lt.toUpperCase() : (row.days[dateStr] || '')
      })
      return [row.name, row.expected || 0, row.total || 0, ...leaveCols, ...dayCols]
    })
    const grandLeaveCols = visLeave.map(lt =>
      lt.key === 'pto' ? grandPto : lt.key === 'uto' ? grandUto : lt.key === 'ml' ? grandMl : grandSl
    )
    const grandDayCols = days.map(d => dayTotals[d] || '')
    const totalsRow = ['TOTAL', grandExpected || 0, grandTotal || 0, ...grandLeaveCols, ...grandDayCols]
    const ws = utils.aoa_to_sheet([headers, ...dataRows, totalsRow])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, `${MONTH_NAMES[month]} ${year}`)
    writeFile(wb, `logged-hours-${projectName}-${MONTH_NAMES[month]}-${year}.xlsx`)
  }

  const exportPdf = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
    doc.setFontSize(12)
    doc.text(`Logged Hours — ${projectName} — ${MONTH_NAMES[month]} ${year}`, 40, 32)
    const visLeave = LEAVE_TYPES.filter(lt => rows.some(r => r[lt.key as LeaveKey] > 0))
    const head = [
      'User', 'Exp', 'Logged',
      ...visLeave.map(lt => lt.label),
      ...days.map(d => String(d)),
    ]
    const body = rows.map(row => {
      const leaveCols = visLeave.map(lt => {
        const v = row[lt.key as LeaveKey]
        return v > 0 ? String(v) : ''
      })
      const dayCols = days.map(d => {
        const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
        const lt = getCellLeaveType(row, dateStr)
        return lt ? lt.toUpperCase() : (row.days[dateStr] ? String(row.days[dateStr]) : '')
      })
      return [
        row.name,
        row.expected > 0 ? String(row.expected) : '',
        row.total > 0 ? String(row.total) : '',
        ...leaveCols,
        ...dayCols,
      ]
    })
    const grandLeaveCols = visLeave.map(lt =>
      lt.key === 'pto' ? (grandPto > 0 ? String(grandPto) : '') :
      lt.key === 'uto' ? (grandUto > 0 ? String(grandUto) : '') :
      lt.key === 'ml'  ? (grandMl  > 0 ? String(grandMl)  : '') :
                         (grandSl  > 0 ? String(grandSl)  : '')
    )
    const totalsRow = [
      'TOTAL',
      grandExpected > 0 ? String(grandExpected) : '',
      grandTotal > 0 ? String(grandTotal) : '',
      ...grandLeaveCols,
      ...days.map(d => dayTotals[d] ? String(dayTotals[d]) : ''),
    ]
    autoTable(doc, {
      head: [head],
      body: [...body, totalsRow],
      startY: 46,
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 40], fontSize: 6, halign: 'center' },
      columnStyles: { 0: { cellWidth: 80 } },
      didParseCell: (data) => {
        const isTotalsRow = data.section === 'body' && data.row.index === body.length
        if (isTotalsRow) {
          data.cell.styles.fillColor = [40, 40, 55]
          data.cell.styles.fontStyle = 'bold'
          return
        }
        if (data.section === 'body' && data.column.index > 2 + visLeave.length) {
          const colDay = data.column.index - 3 - visLeave.length + 1
          if (isWeekend(year, month, colDay)) {
            data.cell.styles.fillColor = [40, 40, 50]
          }
        }
      },
    })
    doc.save(`logged-hours-${projectName}-${MONTH_NAMES[month]}-${year}.pdf`)
  }

  const dayTotals: Record<number, number> = {}
  for (const row of rows) {
    for (const day of days) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
      dayTotals[day] = (dayTotals[day] || 0) + (row.days[dateStr] || 0)
    }
  }
  const grandTotal    = rows.reduce((s, r) => s + r.total, 0)
  const grandExpected = rows.reduce((s, r) => s + r.expected, 0)
  const grandPto      = rows.reduce((s, r) => s + r.pto, 0)
  const grandUto      = rows.reduce((s, r) => s + r.uto, 0)
  const grandMl       = rows.reduce((s, r) => s + r.ml, 0)
  const grandSl       = rows.reduce((s, r) => s + r.sl, 0)

    const grandAllLeave = grandPto + grandUto + grandMl + grandSl
    const hasUtoData = rows.some(r => r.uto > 0)
    const hasMlData  = rows.some(r => r.ml  > 0)
    const hasSlData  = rows.some(r => r.sl  > 0)
    const visibleLeaveTypes = LEAVE_TYPES.filter(lt => {
      if (lt.key === 'uto') return hasUtoData
      if (lt.key === 'ml')  return hasMlData
      if (lt.key === 'sl')  return hasSlData
      return true
    })

  function getCellLeaveType(row: UserRow, dateStr: string): LeaveKey | null {
    if (row.ptoDays.includes(dateStr)) return 'pto'
    if (row.utoDays.includes(dateStr)) return 'uto'
    if (row.mlDays.includes(dateStr))  return 'ml'
    if (row.slDays.includes(dateStr))  return 'sl'
    return null
  }

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!jiraKey) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No JIRA project linked to <strong>{projectName}</strong>.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#ea2775]" />
            Logged Hours — {projectName}
          </h1>
          <p className="text-sm text-muted-foreground">JIRA project: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{jiraKey}</span></p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base font-semibold text-foreground">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={loadingData}
                className="h-7 text-xs gap-1.5 text-muted-foreground"
              >
                <RefreshCw className={`w-3 h-3 ${loadingData ? 'animate-spin' : ''}`} />
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
                variant="ghost"
                size="sm"
                onClick={exportExcel}
                disabled={rows.length === 0}
                className="h-7 text-xs gap-1.5 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                title="Export to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportPdf}
                disabled={rows.length === 0}
                className="h-7 text-xs gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Export to PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </Button>
            </div>
          </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loadingData ? (
          <div className="flex items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading hours...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No hours logged for {MONTH_NAMES[month]} {year}</div>
        ) : (
          <>
            <div>
                <table className="w-full text-[11px] border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '40px' }} />
                    <col style={{ width: '44px' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="sticky left-0 z-10 bg-muted/40 text-left px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide truncate w-[120px] max-w-[120px]">
                        User
                      </th>
                      <th className="px-1 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap w-[40px]">
                        Exp
                      </th>
                      <th className="px-1 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap w-[44px]">
                        Logged
                      </th>
                    {visibleLeaveTypes.map(lt => (
                      <th key={lt.key} className={`px-1.5 py-2.5 font-semibold uppercase tracking-wide text-right whitespace-nowrap w-[40px] ${lt.color}`}>
                        {lt.label}
                      </th>
                    ))}
                    {days.map(d => {
                      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
                      const weekend = isWeekend(year, month, d)
                      const today = new Date().toISOString().slice(0, 10) === dateStr
                      return (
                        <th
                          key={d}
                          className={`px-0.5 py-2.5 text-center font-semibold whitespace-nowrap w-[28px] ${weekend ? 'bg-muted/60 text-muted-foreground/50' : 'text-muted-foreground'} ${today ? 'ring-1 ring-inset ring-[#ea2775]/40' : ''}`}
                        >
                          <div className="text-[9px] font-normal">{getDayLabel(year, month, d)}</div>
                          <div className="text-[10px]">{d}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, ri) => {
                    const totalLeave = row.pto + row.uto + row.ml + row.sl
                    return (
                      <tr key={row.accountId} className={`${ri % 2 === 0 ? '' : 'bg-muted/20'} hover:bg-muted/30 transition-colors`}>
                          <td className="sticky left-0 z-10 bg-inherit px-2 py-2 font-medium text-foreground truncate border-r border-border/50 max-w-[120px]">
                            {row.name}
                          </td>
                          <td className="px-1 py-2 text-right font-semibold text-foreground border-r border-border/50">
                          {row.expected > 0 ? (Number.isInteger(row.expected) ? String(row.expected) : row.expected.toFixed(1)) : '—'}
                        </td>
                        <td className={`px-1.5 py-2 text-right font-semibold border-r border-border/50 ${
                          row.expected > 0
                            ? (row.total + totalLeave >= row.expected ? 'text-green-500' : 'text-red-500')
                            : 'text-foreground'
                        }`}>
                          {row.total > 0 ? (Number.isInteger(row.total) ? String(row.total) : row.total.toFixed(1)) : '—'}
                        </td>
                        {visibleLeaveTypes.map(lt => {
                          const val = row[lt.key as LeaveKey]
                          return (
                            <td key={lt.key} className={`px-1.5 py-2 text-right font-semibold border-r border-border/50 ${lt.color}`}>
                              {val > 0 ? String(val) : '—'}
                            </td>
                          )
                        })}
                        {days.map(d => {
                          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
                          const h = row.days[dateStr] || 0
                          const weekend = isWeekend(year, month, d)
                          const leaveType = getCellLeaveType(row, dateStr)
                          const lt = leaveType ? LEAVE_TYPES.find(x => x.key === leaveType)! : null
                          const today = new Date().toISOString().slice(0, 10) === dateStr
                          return (
                            <td
                              key={d}
                              className={`px-0.5 py-2 text-center tabular-nums
                                ${lt ? `${lt.bg} ${lt.color} font-semibold` : weekend ? 'bg-muted/40' : ''}
                                ${today ? 'ring-1 ring-inset ring-[#ea2775]/30' : ''}
                                ${!lt && h > 0 ? 'font-medium text-foreground' : ''}
                                ${!lt && h === 0 && !weekend ? 'text-muted-foreground/30' : ''}
                              `}
                            >
                              {lt ? <span className="text-[8px] font-bold tracking-wide">{lt.cellLabel}</span> : formatHours(h)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 border-t-2 border-border font-semibold">
                      <td className="sticky left-0 z-10 bg-muted/50 px-2 py-2 text-foreground border-r border-border/50 truncate max-w-[120px]">
                        Total
                      </td>
                    <td className="px-1.5 py-2 text-right text-foreground border-r border-border/50">
                      {grandExpected > 0 ? (Number.isInteger(grandExpected) ? String(grandExpected) : grandExpected.toFixed(1)) : '—'}
                    </td>
                    <td className={`px-1.5 py-2 text-right border-r border-border/50 ${
                      grandExpected > 0
                        ? (grandTotal + grandAllLeave >= grandExpected ? 'text-green-500' : 'text-red-500')
                        : 'text-foreground'
                    }`}>
                      {grandTotal > 0 ? (Number.isInteger(grandTotal) ? String(grandTotal) : grandTotal.toFixed(1)) : '—'}
                    </td>
                    {visibleLeaveTypes.map(lt => {
                      const val = lt.key === 'pto' ? grandPto : lt.key === 'uto' ? grandUto : lt.key === 'ml' ? grandMl : grandSl
                      return (
                        <td key={lt.key} className={`px-1.5 py-2 text-right border-r border-border/50 ${lt.color}`}>
                          {val > 0 ? String(val) : '—'}
                        </td>
                      )
                    })}
                    {days.map(d => {
                      const h = dayTotals[d] || 0
                      const weekend = isWeekend(year, month, d)
                      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
                      const today = new Date().toISOString().slice(0, 10) === dateStr
                      return (
                        <td
                          key={d}
                          className={`px-0.5 py-2 text-center tabular-nums ${weekend ? 'bg-muted/60' : ''} ${today ? 'ring-1 ring-inset ring-[#ea2775]/40' : ''} ${h > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}
                        >
                          {formatHours(h)}
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-border/50 flex flex-wrap gap-4">
              {visibleLeaveTypes.map(lt => (
                <div key={lt.key} className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-8 h-5 rounded text-[9px] font-bold tracking-wide ${lt.bg} ${lt.color}`}>
                    {lt.cellLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{lt.fullLabel}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

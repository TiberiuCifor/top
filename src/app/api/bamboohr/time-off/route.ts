import { NextResponse } from 'next/server'
import { bambooFetch } from '@/lib/bamboohr'

type TypedDays = Record<string, Set<string>>

function addDays(map: TypedDays, bambooId: string, dates: Record<string, string>, from: Date, to: Date) {
  for (const [dateStr] of Object.entries(dates)) {
    const d = new Date(dateStr)
    if (d < from || d > to) continue
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue
    if (!map[bambooId]) map[bambooId] = new Set()
    map[bambooId].add(dateStr)
  }
}

function toSortedArrays(map: TypedDays): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [id, set] of Object.entries(map)) {
    result[id] = Array.from(set).sort()
  }
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const bambooIdsParam = searchParams.get('bambooIds')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  try {
    const data = await bambooFetch(`/time_off/requests/?start=${from}&end=${to}&status=approved`)
    const entries: any[] = Array.isArray(data) ? data : []

    const allowedIds = bambooIdsParam
      ? new Set(bambooIdsParam.split(',').map(s => s.trim()))
      : null

    const rangeFrom = new Date(from)
    const rangeTo = new Date(to)

    const ptoDays: TypedDays = {}
    const utoDays: TypedDays = {}
    const mlDays: TypedDays = {}
    const slDays: TypedDays = {}

    for (const entry of entries) {
      const bambooId = String(entry.employeeId)
      if (allowedIds && !allowedIds.has(bambooId)) continue

      const typeName: string = entry.type?.name ?? ''
      const dates: Record<string, string> = entry.dates ?? {}

      if (typeName === 'Annual Leave') {
        addDays(ptoDays, bambooId, dates, rangeFrom, rangeTo)
      } else if (typeName === 'Unpaid Leave') {
        addDays(utoDays, bambooId, dates, rangeFrom, rangeTo)
      } else if (typeName === 'Medical Leave') {
        addDays(mlDays, bambooId, dates, rangeFrom, rangeTo)
      } else if (typeName === 'Special Leave') {
        addDays(slDays, bambooId, dates, rangeFrom, rangeTo)
      }
    }

    return NextResponse.json({
      ptoDays: toSortedArrays(ptoDays),
      utoDays: toSortedArrays(utoDays),
      mlDays: toSortedArrays(mlDays),
      slDays: toSortedArrays(slDays),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { bambooFetch } from '@/lib/bamboohr'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const data = await bambooFetch(`/time_off/whos_out/?start=${today}&end=${today}`)
    const out = (Array.isArray(data) ? data : []).map((entry: any) => ({
      id: entry.id,
      employeeId: entry.employeeId,
      name: entry.name,
      type: entry.type,
      start: entry.start,
      end: entry.end,
    }))
    return NextResponse.json({ out, date: today })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

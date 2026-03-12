'use client'

import { useEffect, useState } from 'react'
import { CalendarOff } from 'lucide-react'

interface OutEntry {
  id: number
  employeeId: number
  name: string
  type: string
  start: string
  end: string
}

export function WhosOut() {
  const [out, setOut] = useState<OutEntry[]>([])
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bamboohr/whos-out')
      .then(r => r.json())
      .then(d => {
        setOut(d.out || [])
        setDate(d.date || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <CalendarOff className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Who&apos;s Out</h3>
            {formattedDate && <p className="text-[11px] text-muted-foreground">{formattedDate}</p>}
          </div>
        </div>
        {!loading && (
          <span className="text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
            {out.length} {out.length === 1 ? 'person' : 'people'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : out.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Everyone is in today</p>
      ) : (
        <ul className="space-y-1.5">
          {out.map(entry => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {entry.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-foreground truncate">{entry.name}</span>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                {entry.start === entry.end ? entry.start : `${entry.start} → ${entry.end}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

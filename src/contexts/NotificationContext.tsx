'use client'
import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface NotificationContextValue {
  newRemindersCount: number
  benchCount: number
  setNewRemindersCount: (count: number) => void
  setBenchCount: (count: number) => void
  refreshCounts: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

interface NotificationProviderProps {
  children: ReactNode
  userId?: string
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [newRemindersCount, setNewRemindersCount] = useState(0)
  const [benchCount, setBenchCount] = useState(0)
  const initRef = useRef(false)

  const refreshCounts = useCallback(async () => {
    if (!userId) return

    const [benchResult, remindersResult] = await Promise.allSettled([
      supabase
        .from('assignments')
        .select('employee_id, project:projects!inner(name), employee:employees!inner(status)')
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`),
      supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'New')
        .eq('owner_id', userId),
    ])

    if (benchResult.status === 'fulfilled' && benchResult.value.data) {
      const benchEmployeeIds = new Set(
        benchResult.value.data
          .filter((a: any) => a.project?.name?.toLowerCase() === 'bench' && a.employee?.status !== 'Inactive')
          .map((a: any) => a.employee_id)
      )
      setBenchCount(benchEmployeeIds.size)
    }

    if (remindersResult.status === 'fulfilled') {
      setNewRemindersCount(remindersResult.value.count ?? 0)
    }
  }, [userId])

  useEffect(() => {
    if (initRef.current || !userId) return
    initRef.current = true
    refreshCounts()
  }, [userId, refreshCounts])

  const value = useMemo(() => ({
    newRemindersCount,
    benchCount,
    setNewRemindersCount,
    setBenchCount,
    refreshCounts
  }), [newRemindersCount, benchCount, refreshCounts])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { prefetchCoreData, resetPrefetch } from '@/hooks/useResourceData'
import type { User } from '@/lib/types'

interface DashboardContextValue {
  currentUser: User | null
  isProjectLead: boolean
  isItSupport: boolean
  isLeadership: boolean
  isSales: boolean
  isPracticeLead: boolean
  newRemindersCount: number
  benchCount: number
  ready: boolean
  handleLogout: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [benchCount, setBenchCount] = useState(0)
  const [newRemindersCount, setNewRemindersCount] = useState(0)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
    useEffect(() => {
      let cancelled = false
      let unsubscribe: (() => void) | null = null

      const loadUser = async (userId: string) => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

          if (cancelled) return

          if (userData) {
            setCurrentUser(userData)
          }

                if (userData?.role === 'project_lead') {
                  if (!cancelled) {
                    setReady(true)
                    const currentPath = window.location.pathname
                    const allowedPaths = ['/projects-updates']
                    if (!allowedPaths.some(p => currentPath.startsWith(p))) {
                      routerRef.current.push('/projects-updates/rag-updates')
                    }
                  }
                  return
                }

                if (userData?.role === 'user') {
                  if (!cancelled) {
                    setReady(true)
                    const currentPath = window.location.pathname
                    const allowedPaths = ['/trainings-certs', '/auth']
                    if (!allowedPaths.some(p => currentPath.startsWith(p))) {
                      routerRef.current.push('/trainings-certs')
                    }
                  }
                  return
                }


          const [, benchResult, remindersResult] = await Promise.allSettled([
            prefetchCoreData(),
            supabase
              .from('assignments')
              .select('employee_id, project:projects!inner(name), employee:employees!inner(status)')
              .eq('status', 'active'),
            supabase
              .from('reminders')
              .select('id', { count: 'exact' })
              .eq('status', 'New')
              .eq('owner_id', userId),
          ])

          if (cancelled) return

          if (benchResult.status === 'fulfilled' && benchResult.value.data) {
            const benchEmployeeIds = new Set(
              benchResult.value.data
                .filter((a: any) => a.project?.name?.toLowerCase() === 'bench' && a.employee?.status === 'Active')
                .map((a: any) => a.employee_id)
            )
            setBenchCount(benchEmployeeIds.size)
          }

          if (remindersResult.status === 'fulfilled') {
            setNewRemindersCount(remindersResult.value.count ?? 0)
          }
        } catch {
          // data fetch failed, still show the UI
        } finally {
          if (!cancelled) setReady(true)
        }
      }

      const init = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        if (session?.user) {
          await loadUser(session.user.id)
        } else {
          routerRef.current.push('/auth/login')
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
          if (cancelled) return
          if (event === 'SIGNED_OUT') {
            routerRef.current.push('/auth/login')
          } else if (event === 'SIGNED_IN' && authSession?.user && !session) {
            subscription.unsubscribe()
            await loadUser(authSession.user.id)
          }
        })
        unsubscribe = () => subscription.unsubscribe()
      }

      init()

      return () => {
        cancelled = true
        unsubscribe?.()
      }
    }, [])

  const handleLogout = useCallback(async () => {
    resetPrefetch()
    await supabase.auth.signOut()
    routerRef.current.push('/auth/login')
  }, [])

  const isProjectLead = currentUser?.role === 'project_lead'
  const isItSupport = currentUser?.role === 'user'
  const isLeadership = currentUser?.role === 'leadership' || currentUser?.role === 'admin'
  const isSales = currentUser?.role === 'sales'
  const isPracticeLead = currentUser?.role === 'practice_lead'

  const value = useMemo(() => ({
    currentUser,
    isProjectLead,
    isItSupport,
    isLeadership,
    isSales,
    isPracticeLead,
    newRemindersCount,
    benchCount,
    ready,
    handleLogout,
  }), [currentUser, isProjectLead, isItSupport, isLeadership, isSales, isPracticeLead, newRemindersCount, benchCount, ready, handleLogout])

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}

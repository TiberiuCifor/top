'use client'
import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

interface AuthContextValue {
  currentUser: User | null
  isProjectLead: boolean
  isLeadership: boolean
  handleLogout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  onUserLoaded?: (user: User | null) => void
}

export function AuthProvider({ children, onUserLoaded }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    let cancelled = false

    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (cancelled) return

        if (authError || !user) {
          routerRef.current.push('/auth/login')
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        if (userData) {
          setCurrentUser(userData)
          onUserLoaded?.(userData)
        }

        if (userData?.role === 'project_lead') {
            routerRef.current.replace('/projects-updates/rag-updates')
        }
      } catch {
        // auth failed, middleware will handle redirect
      }
    }

    init()
    return () => { cancelled = true }
  }, [onUserLoaded])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    routerRef.current.push('/auth/login')
  }, [])

  const isProjectLead = currentUser?.role === 'project_lead'
  const isLeadership = currentUser?.role === 'leadership' || currentUser?.role === 'admin'

  const value = useMemo(() => ({
    currentUser,
    isProjectLead,
    isLeadership,
    handleLogout
  }), [currentUser, isProjectLead, isLeadership, handleLogout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

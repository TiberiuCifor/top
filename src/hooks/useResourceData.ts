'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, Employee, Project, Assignment, AssignmentNote, ClientInput, EmployeeInput, ProjectInput, AssignmentInput, AssignmentNoteInput, Role, RoleInput, Practice, PracticeInput, Squad, SquadInput, EmployeeProjectHistory, ProjectStakeholder, ProjectStakeholderInput, Reminder, ReminderInput, User, ProjectRagStatus, ProjectRagStatusInput, CeoDashboardEntry, CeoDashboardEntryInput, EmployeeList, EmployeeListInput, EmployeeListMember, EmployeeListComment, EmployeeListCommentInput } from '@/lib/types'

const PRACTICE_SELECT = '*, squads(*)'
const SQUAD_SELECT = '*, practice:practices(*), squad_lead:employees!squads_squad_lead_id_fkey(*)'
const EMPLOYEE_SELECT = '*, role_data:roles(*), practice:practices(*), squad:squads!employees_squad_id_fkey(*)'
const PROJECT_SELECT = '*, client:clients(*), project_lead:employees(*), project_stakeholders(*), project_rag_status(*)'
const ASSIGNMENT_SELECT = '*, project:projects(*, client:clients(*)), employee:employees(*, role_data:roles(*), practice:practices(*))'
const HISTORY_SELECT = '*, project:projects(*)'
const REMINDER_SELECT = '*, owner:users(*)'

// ─── Cache layer ───
// Data is NEVER deleted on read. `isFresh` controls whether we re-fetch.
const CACHE_FRESH_MS = 30_000

interface CacheEntry<T> { data: T; timestamp: number }
const cache = new Map<string, CacheEntry<any>>()
const inflight = new Map<string, Promise<any>>()

function getCached<T>(key: string): T | null {
  return cache.get(key)?.data ?? null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

function isFresh(key: string): boolean {
  const e = cache.get(key)
  return !!e && Date.now() - e.timestamp < CACHE_FRESH_MS
}

function invalidateCache(key: string): void {
  cache.delete(key)
}

async function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

function dataEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

// ─── Prefetch ───
let prefetchStarted = false
let prefetchPromise: Promise<void> | null = null

export function prefetchCoreData(): Promise<void> {
  if (prefetchStarted && prefetchPromise) return prefetchPromise
  prefetchStarted = true

  const queries: { key: string; fn: () => Promise<any> }[] = [
    { key: 'practices', fn: async () => { const { data } = await supabase.from('practices').select(PRACTICE_SELECT).order('name'); return data || [] } },
    { key: 'squads', fn: async () => { const { data } = await supabase.from('squads').select(SQUAD_SELECT).order('name'); return data || [] } },
    { key: 'clients', fn: async () => { const { data } = await supabase.from('clients').select('*').order('name'); return data || [] } },
    { key: 'roles', fn: async () => { const { data } = await supabase.from('roles').select('*').order('name'); return data || [] } },
    { key: 'employees', fn: async () => { const { data } = await supabase.from('employees').select(EMPLOYEE_SELECT).order('full_name'); return data || [] } },
    { key: 'projects', fn: async () => {
      const { data } = await supabase.from('projects').select(PROJECT_SELECT).order('name')
      if (!data) return []
      return data.map((p: any) => ({
        ...p,
        latest_rag_status: p.project_rag_status?.length > 0
          ? p.project_rag_status.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : undefined
      }))
    }},
    { key: 'assignments', fn: async () => { const { data } = await supabase.from('assignments').select(ASSIGNMENT_SELECT).order('start_date'); return data || [] } },
    { key: 'reminders', fn: async () => { const { data } = await supabase.from('reminders').select(REMINDER_SELECT).order('updated_at', { ascending: false }); return data || [] } },
  ]

  const promises: Promise<void>[] = []
  for (const { key, fn } of queries) {
    if (isFresh(key)) continue
    promises.push(dedup(key, fn).then(result => setCache(key, result)).catch(() => {}))
  }

  prefetchPromise = Promise.all(promises).then(() => {})
  return prefetchPromise
}

export function resetPrefetch() {
  prefetchStarted = false
}

// ─── Generic hook factory ───
// Rules:
//  1. If cache has data (even stale), start with that data and loading=false → no flicker
//  2. Only show loading=true when cache is completely empty
//  3. After fetch, only setState if data actually changed (prevents double-render)
//  4. initRef prevents StrictMode double-fire

function useResource<T>(key: string, fetchFn: () => Promise<T[]>) {
  const cached = getCached<T[]>(key)
  const [data, setData] = useState<T[]>(cached || [])
  const [loading, setLoading] = useState(!cached)
  const initRef = useRef(false)

  const doFetch = useCallback(async () => {
    const hadData = !!getCached(key)
    if (!hadData) setLoading(true)

    const result = await dedup(key, fetchFn)
    setCache(key, result)
    setData(prev => dataEqual(prev, result) ? prev : result)
    setLoading(false)
  }, [key, fetchFn])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    // If cache has fresh data, just sync state from cache (in case component re-mounted)
    const cached = getCached<T[]>(key)
    if (cached) {
      setData(prev => dataEqual(prev, cached) ? prev : cached)
      setLoading(false)
      if (isFresh(key)) return // truly fresh, no refetch needed
    }

    // Stale or empty → fetch (but data already shows stale content if available)
    doFetch()
  }, [key, doFetch])

  return { data, loading, doFetch, setData, setLoading }
}

// ─── Hooks ───

export function useEmployeeProjectHistory(employeeId: string | null) {
  const [history, setHistory] = useState<EmployeeProjectHistory[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('employee_project_history')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching project history:', error)
      setHistory([])
    } else {
      setHistory(data || [])
    }
    setLoading(false)
  }, [employeeId])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  return useMemo(() => ({ 
    history, loading, fetchHistory 
  }), [history, loading, fetchHistory])
}

export function usePractices() {
  const fetchFn = useCallback(async () => {
    const { data } = await supabase.from('practices').select(PRACTICE_SELECT).order('name')
    return data || []
  }, [])

  const { data: practices, loading, doFetch: fetchPractices, setData: setPractices } = useResource<Practice>('practices', fetchFn)

  const createPractice = useCallback(async (input: PracticeInput) => {
    const { data, error } = await supabase.from('practices').insert(input).select(PRACTICE_SELECT).single()
    if (!error && data) {
      const updated = [...practices, data].sort((a, b) => a.name.localeCompare(b.name))
      setPractices(updated)
      setCache('practices', updated)
    }
    return { data, error }
  }, [practices, setPractices])

  const updatePractice = useCallback(async (id: string, input: Partial<PracticeInput>) => {
    const { data, error } = await supabase.from('practices').update(input).eq('id', id).select(PRACTICE_SELECT).single()
    if (!error && data) {
      const updated = practices.map(p => p.id === id ? data : p)
      setPractices(updated)
      setCache('practices', updated)
    }
    return { data, error }
  }, [practices, setPractices])

  const deletePractice = useCallback(async (id: string) => {
    const { error } = await supabase.from('practices').delete().eq('id', id)
    if (!error) {
      const updated = practices.filter(p => p.id !== id)
      setPractices(updated)
      setCache('practices', updated)
    }
    return { error }
  }, [practices, setPractices])

  return useMemo(() => ({ 
    practices, loading, fetchPractices, createPractice, updatePractice, deletePractice 
  }), [practices, loading, fetchPractices, createPractice, updatePractice, deletePractice])
}

export function useSquads() {
  const fetchFn = useCallback(async () => {
    const { data, error } = await supabase.from('squads').select(SQUAD_SELECT).order('name')
    if (error) { console.error('Error fetching squads:', error); return [] }
    return data || []
  }, [])

  const { data: squads, loading, doFetch: fetchSquads, setData: setSquads } = useResource<Squad>('squads', fetchFn)

  const createSquad = useCallback(async (input: SquadInput) => {
    const { data, error } = await supabase.from('squads').insert(input).select(SQUAD_SELECT).single()
    if (!error && data) {
      const updated = [...squads, data].sort((a, b) => a.name.localeCompare(b.name))
      setSquads(updated)
      setCache('squads', updated)
    }
    return { data, error }
  }, [squads, setSquads])

  const updateSquad = useCallback(async (id: string, input: Partial<SquadInput>) => {
    const { data, error } = await supabase.from('squads').update(input).eq('id', id).select(SQUAD_SELECT).single()
    if (!error && data) {
      const updated = squads.map(s => s.id === id ? data : s)
      setSquads(updated)
      setCache('squads', updated)
    }
    return { data, error }
  }, [squads, setSquads])

  const deleteSquad = useCallback(async (id: string) => {
    const { error } = await supabase.from('squads').delete().eq('id', id)
    if (!error) {
      const updated = squads.filter(s => s.id !== id)
      setSquads(updated)
      setCache('squads', updated)
    }
    return { error }
  }, [squads, setSquads])

  return useMemo(() => ({ 
    squads, loading, fetchSquads, createSquad, updateSquad, deleteSquad 
  }), [squads, loading, fetchSquads, createSquad, updateSquad, deleteSquad])
}

export function useClients() {
  const fetchFn = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    return data || []
  }, [])

  const { data: clients, loading, doFetch: fetchClients, setData: setClients } = useResource<Client>('clients', fetchFn)

  const createClient = useCallback(async (input: ClientInput) => {
    const { data, error } = await supabase.from('clients').insert(input).select().single()
    if (!error && data) {
      const updated = [...clients, data].sort((a, b) => a.name.localeCompare(b.name))
      setClients(updated)
      setCache('clients', updated)
    }
    return { data, error }
  }, [clients, setClients])

  const updateClient = useCallback(async (id: string, input: Partial<ClientInput>) => {
    const { data, error } = await supabase.from('clients').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (!error && data) {
      const updated = clients.map(c => c.id === id ? data : c)
      setClients(updated)
      setCache('clients', updated)
    }
    return { data, error }
  }, [clients, setClients])

  const deleteClient = useCallback(async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) {
      const updated = clients.filter(c => c.id !== id)
      setClients(updated)
      setCache('clients', updated)
    }
    return { error }
  }, [clients, setClients])

  return useMemo(() => ({ 
    clients, loading, fetchClients, createClient, updateClient, deleteClient 
  }), [clients, loading, fetchClients, createClient, updateClient, deleteClient])
}

export function useRoles() {
  const fetchFn = useCallback(async () => {
    const { data } = await supabase.from('roles').select('*').order('name')
    return data || []
  }, [])

  const { data: roles, loading, doFetch: fetchRoles, setData: setRoles } = useResource<Role>('roles', fetchFn)

  const createRole = useCallback(async (input: RoleInput) => {
    const { data, error } = await supabase.from('roles').insert(input).select().single()
    if (!error && data) {
      const updated = [...roles, data].sort((a, b) => a.name.localeCompare(b.name))
      setRoles(updated)
      setCache('roles', updated)
    }
    return { data, error }
  }, [roles, setRoles])

  const updateRole = useCallback(async (id: string, input: Partial<RoleInput>) => {
    const { data, error } = await supabase.from('roles').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (!error && data) {
      const updated = roles.map(r => r.id === id ? data : r)
      setRoles(updated)
      setCache('roles', updated)
    }
    return { data, error }
  }, [roles, setRoles])

  const deleteRole = useCallback(async (id: string) => {
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (!error) {
      const updated = roles.filter(r => r.id !== id)
      setRoles(updated)
      setCache('roles', updated)
    }
    return { error }
  }, [roles, setRoles])

  return useMemo(() => ({ 
    roles, loading, fetchRoles, createRole, updateRole, deleteRole 
  }), [roles, loading, fetchRoles, createRole, updateRole, deleteRole])
}

export function useEmployees() {
  const fetchFn = useCallback(async () => {
    const { data, error } = await supabase.from('employees').select(EMPLOYEE_SELECT).order('full_name')
    if (error) { console.error('Error fetching employees:', error); return [] }
    return data || []
  }, [])

  const { data: employees, loading, doFetch: fetchEmployees, setData: setEmployees } = useResource<Employee>('employees', fetchFn)

  const createEmployee = useCallback(async (input: EmployeeInput) => {
    const { data, error } = await supabase.from('employees').insert(input).select(EMPLOYEE_SELECT).single()
    if (!error && data) {
      const updated = [...employees, data].sort((a, b) => a.full_name.localeCompare(b.full_name))
      setEmployees(updated)
      setCache('employees', updated)
    }
    return { data, error }
  }, [employees, setEmployees])

  const updateEmployee = useCallback(async (id: string, input: Partial<EmployeeInput>) => {
    const { data, error } = await supabase.from('employees').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select(EMPLOYEE_SELECT).single()
    if (!error && data) {
      const updated = employees.map(e => e.id === id ? data : e)
      setEmployees(updated)
      setCache('employees', updated)
    }
    return { data, error }
  }, [employees, setEmployees])

  const deleteEmployee = useCallback(async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (!error) {
      const updated = employees.filter(e => e.id !== id)
      setEmployees(updated)
      setCache('employees', updated)
    }
    return { error }
  }, [employees, setEmployees])

  return useMemo(() => ({ 
    employees, loading, fetchEmployees, createEmployee, updateEmployee, deleteEmployee 
  }), [employees, loading, fetchEmployees, createEmployee, updateEmployee, deleteEmployee])
}

export function useProjects() {
  const fetchFn = useCallback(async () => {
    const { data } = await supabase.from('projects').select(PROJECT_SELECT).order('name')
    if (!data) return []
    return data.map((p: any) => ({
      ...p,
      latest_rag_status: p.project_rag_status?.length > 0
        ? p.project_rag_status.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : undefined
    }))
  }, [])

  const { data: projects, loading, doFetch: fetchProjects, setData: setProjects } = useResource<Project>('projects', fetchFn)

  const createProject = useCallback(async (input: ProjectInput) => {
    const { data, error } = await supabase.from('projects').insert(input).select(PROJECT_SELECT).single()
    if (!error && data) {
      const updated = [...projects, data].sort((a, b) => a.name.localeCompare(b.name))
      setProjects(updated)
      setCache('projects', updated)
    }
    return { data, error }
  }, [projects, setProjects])

  const updateProject = useCallback(async (id: string, input: Partial<ProjectInput>) => {
    const { data, error } = await supabase.from('projects').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select(PROJECT_SELECT).single()
    if (!error && data) {
      const updated = projects.map(p => p.id === id ? data : p)
      setProjects(updated)
      setCache('projects', updated)
    }
    return { data, error }
  }, [projects, setProjects])

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      const updated = projects.filter(p => p.id !== id)
      setProjects(updated)
      setCache('projects', updated)
    }
    return { error }
  }, [projects, setProjects])

  return useMemo(() => ({ 
    projects, loading, fetchProjects, createProject, updateProject, deleteProject 
  }), [projects, loading, fetchProjects, createProject, updateProject, deleteProject])
}

export function useAssignments() {
  const fetchFn = useCallback(async () => {
    const { data } = await supabase.from('assignments').select(ASSIGNMENT_SELECT).order('start_date')
    return data || []
  }, [])

  const { data: assignments, loading, doFetch: fetchAssignments, setData: setAssignments } = useResource<Assignment>('assignments', fetchFn)

  const createAssignment = useCallback(async (input: AssignmentInput) => {
    const { data, error } = await supabase.from('assignments').insert(input).select(ASSIGNMENT_SELECT).single()
    if (!error && data) {
      const updated = [...assignments, data]
      setAssignments(updated)
      setCache('assignments', updated)
    }
    return { data, error }
  }, [assignments, setAssignments])

  const updateAssignment = useCallback(async (id: string, input: Partial<AssignmentInput>) => {
    const { data, error } = await supabase.from('assignments').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select(ASSIGNMENT_SELECT).single()
    if (!error && data) {
      const updated = assignments.map(a => a.id === id ? data : a)
      setAssignments(updated)
      setCache('assignments', updated)
    }
    return { data, error }
  }, [assignments, setAssignments])

  const deleteAssignment = useCallback(async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (!error) {
      const updated = assignments.filter(a => a.id !== id)
      setAssignments(updated)
      setCache('assignments', updated)
    }
    return { error }
  }, [assignments, setAssignments])

  return useMemo(() => ({ 
    assignments, loading, fetchAssignments, createAssignment, updateAssignment, deleteAssignment 
  }), [assignments, loading, fetchAssignments, createAssignment, updateAssignment, deleteAssignment])
}

export function useAssignmentNotes(assignmentId: string | null) {
  const [notes, setNotes] = useState<AssignmentNote[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotes = useCallback(async () => {
    if (!assignmentId) return
    setLoading(true)
    const { data } = await supabase.from('assignment_notes').select('*').eq('assignment_id', assignmentId).order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }, [assignmentId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const createNote = useCallback(async (input: AssignmentNoteInput) => {
    const { data, error } = await supabase.from('assignment_notes').insert(input).select().single()
    if (!error && data) setNotes(prev => [data, ...prev])
    return { data, error }
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('assignment_notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
    return { error }
  }, [])

  return useMemo(() => ({ 
    notes, loading, fetchNotes, createNote, deleteNote 
  }), [notes, loading, fetchNotes, createNote, deleteNote])
}

export function useProjectStakeholders(projectId: string | null) {
  const [stakeholders, setStakeholders] = useState<ProjectStakeholder[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStakeholders = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .order('name')
    
    if (error) {
      console.error('Error fetching stakeholders:', error)
      setStakeholders([])
    } else {
      setStakeholders(data || [])
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchStakeholders() }, [fetchStakeholders])

  const createStakeholder = useCallback(async (input: ProjectStakeholderInput) => {
    const { data, error } = await supabase.from('project_stakeholders').insert(input).select().single()
    if (!error && data) setStakeholders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }, [])

  const updateStakeholder = useCallback(async (id: string, input: Partial<ProjectStakeholderInput>) => {
    const { data, error } = await supabase.from('project_stakeholders').update(input).eq('id', id).select().single()
    if (!error && data) setStakeholders(prev => prev.map(s => s.id === id ? data : s))
    return { data, error }
  }, [])

  const deleteStakeholder = useCallback(async (id: string) => {
    const { error } = await supabase.from('project_stakeholders').delete().eq('id', id)
    if (!error) setStakeholders(prev => prev.filter(s => s.id !== id))
    return { error }
  }, [])

  return useMemo(() => ({ 
    stakeholders, loading, fetchStakeholders, createStakeholder, updateStakeholder, deleteStakeholder 
  }), [stakeholders, loading, fetchStakeholders, createStakeholder, updateStakeholder, deleteStakeholder])
}

export function useProjectRagStatuses(projectId: string | null) {
  const [statuses, setStatuses] = useState<ProjectRagStatus[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStatuses = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_rag_status')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching RAG statuses:', error)
      setStatuses([])
    } else {
      setStatuses(data || [])
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchStatuses() }, [fetchStatuses])

  const createStatus = useCallback(async (input: ProjectRagStatusInput) => {
    const { data, error } = await supabase.from('project_rag_status').insert(input).select().single()
    if (!error && data) setStatuses(prev => [data, ...prev])
    return { data, error }
  }, [])

  const updateStatus = useCallback(async (id: string, input: Partial<ProjectRagStatusInput>) => {
    const { data, error } = await supabase
      .from('project_rag_status')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) setStatuses(prev => prev.map(s => s.id === id ? data : s))
    return { data, error }
  }, [])

  const deleteStatus = useCallback(async (id: string) => {
    const { error } = await supabase.from('project_rag_status').delete().eq('id', id)
    if (!error) setStatuses(prev => prev.filter(s => s.id !== id))
    return { error }
  }, [])

  return useMemo(() => ({ 
    statuses, loading, fetchStatuses, createStatus, updateStatus, deleteStatus 
  }), [statuses, loading, fetchStatuses, createStatus, updateStatus, deleteStatus])
}

export function useReminders() {
  const fetchFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_SELECT)
      .order('updated_at', { ascending: false })
    if (error) { console.error('Error fetching reminders:', error); return [] }
    return data || []
  }, [])

  const { data: reminders, loading, doFetch: fetchReminders, setData: setReminders } = useResource<Reminder>('reminders', fetchFn)

  const createReminder = useCallback(async (input: ReminderInput) => {
    const { data, error } = await supabase.from('reminders').insert(input).select(REMINDER_SELECT).single()
    if (!error && data) {
      const updated = [data, ...reminders]
      setReminders(updated)
      setCache('reminders', updated)
    }
    return { data, error }
  }, [reminders, setReminders])

  const updateReminder = useCallback(async (id: string, input: Partial<ReminderInput>) => {
    const { data, error } = await supabase
      .from('reminders')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(REMINDER_SELECT)
      .single()
    if (!error && data) {
      const updated = reminders.map(r => r.id === id ? data : r)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      setReminders(updated)
      setCache('reminders', updated)
    }
    return { data, error }
  }, [reminders, setReminders])

  const deleteReminder = useCallback(async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (!error) {
      const updated = reminders.filter(r => r.id !== id)
      setReminders(updated)
      setCache('reminders', updated)
    }
    return { error }
  }, [reminders, setReminders])

  return useMemo(() => ({ 
    reminders, loading, fetchReminders, createReminder, updateReminder, deleteReminder 
  }), [reminders, loading, fetchReminders, createReminder, updateReminder, deleteReminder])
}

export function useUsers() {
  const fetchFn = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('*').order('full_name')
    if (error) { console.error('Error fetching users:', error); return [] }
    return data || []
  }, [])

  const { data: users, loading, doFetch: fetchUsers } = useResource<User>('users', fetchFn)

  return useMemo(() => ({ users, loading, fetchUsers }), [users, loading, fetchUsers])
}

export function useCeoDashboard() {
  const fetchFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('ceo_dashboard')
      .select('*')
      .order('week_ended', { ascending: false })
    if (error) { console.error('Error fetching CEO dashboard entries:', error); return [] }
    return data || []
  }, [])

  const { data: entries, loading, doFetch: fetchEntries, setData: setEntries } = useResource<CeoDashboardEntry>('ceo_dashboard', fetchFn)

  const createEntry = useCallback(async (input: CeoDashboardEntryInput) => {
    const { data, error } = await supabase
      .from('ceo_dashboard')
      .insert(input)
      .select()
      .single()
    if (!error && data) {
      const updated = [data, ...entries].sort((a, b) =>
        new Date(b.week_ended).getTime() - new Date(a.week_ended).getTime()
      )
      setEntries(updated)
      setCache('ceo_dashboard', updated)
    }
    return { data, error }
  }, [entries, setEntries])

  const updateEntry = useCallback(async (id: string, input: Partial<CeoDashboardEntryInput>) => {
    const { data, error } = await supabase
      .from('ceo_dashboard')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      const updated = entries.map(e => e.id === id ? data : e)
      setEntries(updated)
      setCache('ceo_dashboard', updated)
    }
    return { data, error }
  }, [entries, setEntries])

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('ceo_dashboard').delete().eq('id', id)
    if (!error) {
      const updated = entries.filter(e => e.id !== id)
      setEntries(updated)
      setCache('ceo_dashboard', updated)
    }
    return { error }
  }, [entries, setEntries])

    return useMemo(() => ({ 
      entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry 
    }), [entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry])
}

const LIST_SELECT = '*, created_by_user:users!employee_lists_created_by_fkey(*), members:employee_list_members(*, employee:employees(*, role_data:roles(*), practice:practices(*)))'

export function useLists() {
  const fetchFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('employee_lists')
      .select(LIST_SELECT)
      .order('created_at', { ascending: false })
    if (error) { console.error('Error fetching lists:', error); return [] }
    return data || []
  }, [])

  const { data: lists, loading, doFetch: fetchLists, setData: setLists } = useResource<EmployeeList>('employee_lists', fetchFn)

  const createList = useCallback(async (input: EmployeeListInput, employeeIds: string[]) => {
    const { data, error } = await supabase.from('employee_lists').insert(input).select(LIST_SELECT).single()
    if (error || !data) return { data: null, error }
    if (employeeIds.length > 0) {
      await supabase.from('employee_list_members').insert(employeeIds.map(eid => ({ list_id: data.id, employee_id: eid })))
      const { data: fresh } = await supabase.from('employee_lists').select(LIST_SELECT).eq('id', data.id).single()
      if (fresh) {
        const updated = [fresh, ...lists]
        setLists(updated)
        setCache('employee_lists', updated)
        return { data: fresh, error: null }
      }
    }
    const updated = [data, ...lists]
    setLists(updated)
    setCache('employee_lists', updated)
    return { data, error: null }
  }, [lists, setLists])

  const updateList = useCallback(async (id: string, input: Partial<EmployeeListInput>, employeeIds: string[]) => {
    const { data, error } = await supabase.from('employee_lists').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select(LIST_SELECT).single()
    if (error || !data) return { data: null, error }

    // Fetch existing members to preserve their details
    const { data: existingMembers } = await supabase
      .from('employee_list_members')
      .select('id, employee_id, details')
      .eq('list_id', id)
    const detailsMap: Record<string, string | null> = {}
    for (const m of existingMembers ?? [] as { id: string; employee_id: string; details: string | null }[]) {
      detailsMap[m.employee_id] = m.details ?? null
    }

    // Only delete members that are being removed
    const existingIds = (existingMembers ?? [] as { employee_id: string }[]).map((m: { employee_id: string }) => m.employee_id)
    const toRemove = existingIds.filter((eid: string) => !employeeIds.includes(eid))
    if (toRemove.length > 0) {
      await supabase.from('employee_list_members').delete().eq('list_id', id).in('employee_id', toRemove)
    }

    // Only insert truly new members (preserve existing rows with their details)
    const toAdd = employeeIds.filter(eid => !existingIds.includes(eid))
    if (toAdd.length > 0) {
      await supabase.from('employee_list_members').insert(toAdd.map(eid => ({ list_id: id, employee_id: eid, details: detailsMap[eid] ?? null })))
    }

    const { data: fresh } = await supabase.from('employee_lists').select(LIST_SELECT).eq('id', id).single()
    const result = fresh || data
    const updated = lists.map(l => l.id === id ? result : l)
    setLists(updated)
    setCache('employee_lists', updated)
    return { data: result, error: null }
  }, [lists, setLists])

  const deleteList = useCallback(async (id: string) => {
    const { error } = await supabase.from('employee_lists').delete().eq('id', id)
    if (!error) {
      const updated = lists.filter(l => l.id !== id)
      setLists(updated)
      setCache('employee_lists', updated)
    }
    return { error }
  }, [lists, setLists])

  const updateMemberDetails = useCallback(async (memberId: string, listId: string, details: string) => {
    const { error } = await supabase
      .from('employee_list_members')
      .update({ details })
      .eq('id', memberId)
    if (!error) {
      const updated = lists.map(l => {
        if (l.id !== listId) return l
        return {
          ...l,
          members: (l.members ?? []).map(m => m.id === memberId ? { ...m, details } : m)
        }
      })
      setLists(updated)
      setCache('employee_lists', updated)
    }
    return { error }
  }, [lists, setLists])

  return useMemo(() => ({
    lists, loading, fetchLists, createList, updateList, deleteList, updateMemberDetails
  }), [lists, loading, fetchLists, createList, updateList, deleteList, updateMemberDetails])
}

export function useListComments(listId: string | null) {
  const [comments, setComments] = useState<EmployeeListComment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async () => {
    if (!listId) return
    setLoading(true)
    const { data } = await supabase
      .from('employee_list_comments')
      .select('*, created_by_user:users!employee_list_comments_created_by_fkey(*)')
      .eq('list_id', listId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }, [listId])

  useEffect(() => { fetchComments() }, [fetchComments])

  const createComment = useCallback(async (input: EmployeeListCommentInput) => {
    const { data, error } = await supabase
      .from('employee_list_comments')
      .insert(input)
      .select('*, created_by_user:users!employee_list_comments_created_by_fkey(*)')
      .single()
    if (!error && data) setComments(prev => [...prev, data])
    return { data, error }
  }, [])

  const deleteComment = useCallback(async (id: string) => {
    const { error } = await supabase.from('employee_list_comments').delete().eq('id', id)
    if (!error) setComments(prev => prev.filter(c => c.id !== id))
    return { error }
  }, [])

  const toggleReaction = useCallback(async (commentId: string, emoji: string, userId: string) => {
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return { error: new Error('Comment not found') }
    const existing = comment.reactions ?? {}
    const users: string[] = existing[emoji] ?? []
    const next = users.includes(userId)
      ? users.filter(u => u !== userId)
      : [...users, userId]
    const newReactions = { ...existing, [emoji]: next }
    if (next.length === 0) delete newReactions[emoji]
    const { error } = await supabase
      .from('employee_list_comments')
      .update({ reactions: newReactions })
      .eq('id', commentId)
    if (!error) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: newReactions } : c))
    }
    return { error }
  }, [comments])

  return useMemo(() => ({
    comments, loading, fetchComments, createComment, deleteComment, toggleReaction
  }), [comments, loading, fetchComments, createComment, deleteComment, toggleReaction])
}

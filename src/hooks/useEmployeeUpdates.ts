import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { EmployeeUpdate, EmployeeUpdateInput } from '@/lib/types'

export function useEmployeeUpdates(employeeId?: string) {
  const [updates, setUpdates] = useState<EmployeeUpdate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUpdates = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('employee_updates')
      .select('*')
      .order('created_at', { ascending: false })

    if (employeeId) {
      query.eq('employee_id', employeeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching employee updates:', error)
    } else {
      setUpdates(data || [])
    }
    setLoading(false)
  }, [employeeId])

  useEffect(() => {
    fetchUpdates()
  }, [fetchUpdates])

  const createUpdate = async (data: EmployeeUpdateInput) => {
    const { data: newUpdate, error } = await supabase
      .from('employee_updates')
      .insert([data])
      .select()
      .single()

    if (!error && newUpdate) {
      setUpdates(prev => [newUpdate, ...prev])
    }

    return { data: newUpdate, error }
  }

  const deleteUpdate = async (id: string) => {
    const { error } = await supabase
      .from('employee_updates')
      .delete()
      .eq('id', id)

    if (!error) {
      setUpdates(prev => prev.filter(u => u.id !== id))
    }

    return { error }
  }

  return {
    updates,
    loading,
    createUpdate,
    deleteUpdate,
    fetchUpdates
  }
}

export function useAllEmployeeUpdates() {
  const [updatesByEmployee, setUpdatesByEmployee] = useState<Map<string, { count: number; lastUpdateAt: string | null; lastUpdateText: string | null; lastUpdateBy: string | null }>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchUpdateCounts = async () => {
    const { data, error } = await supabase
      .from('employee_updates')
      .select('employee_id, created_at, update_text, created_by')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const stats = new Map<string, { count: number; lastUpdateAt: string | null; lastUpdateText: string | null; lastUpdateBy: string | null }>()
      data.forEach(update => {
        const existing = stats.get(update.employee_id)
        if (existing) {
          stats.set(update.employee_id, { 
            count: existing.count + 1, 
            lastUpdateAt: existing.lastUpdateAt,
            lastUpdateText: existing.lastUpdateText,
            lastUpdateBy: existing.lastUpdateBy
          })
        } else {
          stats.set(update.employee_id, { 
            count: 1, 
            lastUpdateAt: update.created_at,
            lastUpdateText: update.update_text,
            lastUpdateBy: update.created_by
          })
        }
      })
      setUpdatesByEmployee(stats)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUpdateCounts()
  }, [])

  return { updatesByEmployee, loading, fetchUpdates: fetchUpdateCounts }
}

'use client'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useEmployees, usePLEvaluations } from '@/hooks/useResourceData'
import { PLEvaluationsView } from '@/components/dashboard/PLEvaluationsView'
import { useDashboard } from '@/contexts/DashboardContext'
import type { PLEvaluationInput } from '@/lib/types'

export default function PracticeLeadsEvaluationsPage() {
  const { currentUser, isPracticeLead } = useDashboard()
  const { employees } = useEmployees()
  const { evaluations, loading, createEvaluation, updateEvaluation, deleteEvaluation } = usePLEvaluations()

  const practiceLeds = useMemo(
    () => employees.filter(e => e.practice_role === 'Lead' && e.status === 'Active'),
    [employees]
  )

  // When logged in as a practice lead, find their own employee record by name
  const myEmployee = useMemo(() => {
    if (!isPracticeLead || !currentUser) return null
    return employees.find(e => e.full_name === currentUser.full_name) ?? null
  }, [isPracticeLead, currentUser, employees])

  // In read-only mode, show only this PL's evaluations
  const visibleEvaluations = useMemo(() => {
    if (isPracticeLead && myEmployee) {
      return evaluations.filter(e => e.practice_lead_id === myEmployee.id)
    }
    return evaluations
  }, [isPracticeLead, myEmployee, evaluations])

  // For practice leads: show only themselves in the leads list (no filter dropdown needed)
  const visibleLeads = useMemo(() => {
    if (isPracticeLead && myEmployee) return [myEmployee]
    return practiceLeds
  }, [isPracticeLead, myEmployee, practiceLeds])

  const handleAdd = async (input: PLEvaluationInput) => {
    const { error } = await createEvaluation(input)
    if (error) toast.error('Failed to create evaluation')
    else toast.success('Evaluation added')
  }

  const handleUpdate = async (id: string, input: PLEvaluationInput) => {
    const { error } = await updateEvaluation(id, input)
    if (error) toast.error('Failed to update evaluation')
    else toast.success('Evaluation updated')
  }

  const handleDelete = async (id: string) => {
    const { error } = await deleteEvaluation(id)
    if (error) toast.error('Failed to delete evaluation')
    else toast.success('Evaluation deleted')
  }

  return (
    <PLEvaluationsView
      evaluations={visibleEvaluations}
      loading={loading}
      practiceLeds={visibleLeads}
      readOnly={isPracticeLead}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}

'use client'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useEmployees, useSquadLeadEvaluations } from '@/hooks/useResourceData'
import { SquadLeadEvaluationsView } from '@/components/dashboard/SquadLeadEvaluationsView'
import { useDashboard } from '@/contexts/DashboardContext'
import type { SquadLeadEvaluationInput } from '@/lib/types'

export default function SquadLeadsEvaluationsPage() {
  const { currentUser, isPracticeLead } = useDashboard()
  const { employees } = useEmployees()
  const { evaluations, loading, createEvaluation, updateEvaluation, deleteEvaluation } = useSquadLeadEvaluations()

  // Find the current practice lead's own employee record (to get their practice_id)
  const myEmployee = useMemo(() => {
    if (!isPracticeLead || !currentUser) return null
    return employees.find(e => e.full_name === currentUser.full_name) ?? null
  }, [isPracticeLead, currentUser, employees])

  // Squad leads: if practice lead, limit to their own practice; otherwise all squad leads
  const squadLeads = useMemo(() => {
    const allSquadLeads = employees.filter(e => e.practice_role === 'Squad Lead' && e.status === 'Active')
    if (isPracticeLead && myEmployee?.practice_id) {
      return allSquadLeads.filter(e => e.practice_id === myEmployee.practice_id)
    }
    return allSquadLeads
  }, [employees, isPracticeLead, myEmployee])

  const handleAdd = async (input: SquadLeadEvaluationInput) => {
    const { error } = await createEvaluation(input)
    if (error) toast.error('Failed to create evaluation')
    else toast.success('Evaluation added')
  }

  const handleUpdate = async (id: string, input: SquadLeadEvaluationInput) => {
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
    <SquadLeadEvaluationsView
      evaluations={evaluations}
      loading={loading}
      leads={squadLeads}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}

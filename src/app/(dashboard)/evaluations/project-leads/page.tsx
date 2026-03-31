'use client'
import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useEmployees, useProjects, useProjectLeadEvaluations } from '@/hooks/useResourceData'
import { ProjectLeadEvaluationsView } from '@/components/dashboard/ProjectLeadEvaluationsView'
import { useDashboard } from '@/contexts/DashboardContext'
import type { ProjectLeadEvaluationInput } from '@/lib/types'

export default function ProjectLeadsEvaluationsPage() {
  const { isPracticeLead } = useDashboard()
  const router = useRouter()
  const { employees } = useEmployees()
  const { projects } = useProjects()
  const { evaluations, loading, createEvaluation, updateEvaluation, deleteEvaluation } = useProjectLeadEvaluations()

  // Practice leads cannot access this page
  useEffect(() => {
    if (isPracticeLead) {
      router.replace('/evaluations/practice-leads')
    }
  }, [isPracticeLead, router])

  // Only include employees who are actually assigned as project lead on at least one project
  const projectLeads = useMemo(() => {
    const leadIds = new Set(projects.map(p => p.project_lead_id).filter(Boolean))
    return employees.filter(e => leadIds.has(e.id) && e.status === 'Active')
  }, [employees, projects])

  const handleAdd = async (input: ProjectLeadEvaluationInput) => {
    const { error } = await createEvaluation(input)
    if (error) toast.error('Failed to create evaluation')
    else toast.success('Evaluation added')
  }

  const handleUpdate = async (id: string, input: ProjectLeadEvaluationInput) => {
    const { error } = await updateEvaluation(id, input)
    if (error) toast.error('Failed to update evaluation')
    else toast.success('Evaluation updated')
  }

  const handleDelete = async (id: string) => {
    const { error } = await deleteEvaluation(id)
    if (error) toast.error('Failed to delete evaluation')
    else toast.success('Evaluation deleted')
  }

  if (isPracticeLead) return null

  return (
    <ProjectLeadEvaluationsView
      evaluations={evaluations}
      loading={loading}
      leads={projectLeads}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}

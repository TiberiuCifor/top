'use client'
import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProjects, useClients } from '@/hooks/useResourceData'
import { RagUpdatesViewV2 } from '@/components/dashboard/RagUpdatesViewV2'
import type { Project } from '@/lib/types'

function RagUpdatesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [initialFilterCleared, setInitialFilterCleared] = useState(false)

  const { projects, loading } = useProjects()
  const { clients } = useClients()

  const groupByLead = searchParams.get('groupByLead') === '1'
  const expandedLeads = searchParams.get('expanded')
    ? searchParams.get('expanded')!.split(',').filter(Boolean)
    : []

  const initialStatusFilter = !initialFilterCleared
    ? (searchParams.get('status') as 'all' | 'G' | 'A' | 'R' | 'noStatus' | undefined)
    : undefined

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') params.delete(key)
      else params.set(key, val)
    })
    router.replace(`/rag-updates?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const handleGroupByLeadChange = (val: boolean) => {
    updateParams({ groupByLead: val ? '1' : null, expanded: null })
    // single batched update — no separate expandedLeads call needed
  }

  const handleExpandedLeadsChange = (leads: string[]) => {
    updateParams({ expanded: leads.length > 0 ? leads.join(',') : null })
  }

  const handleViewStatus = (p: Project) => {
    router.push(`/project-status/${p.id}`)
  }

  return (
    <RagUpdatesViewV2
      projects={projects}
      clients={clients}
      loading={loading}
      onViewStatus={handleViewStatus}
      initialStatusFilter={initialStatusFilter || undefined}
      onClearInitialFilter={() => setInitialFilterCleared(true)}
      groupByLead={groupByLead}
      onGroupByLeadChange={handleGroupByLeadChange}
      expandedLeads={expandedLeads}
      onExpandedLeadsChange={handleExpandedLeadsChange}
    />
  )
}

export default function RagUpdatesPage() {
  return (
    <Suspense>
      <RagUpdatesPageInner />
    </Suspense>
  )
}

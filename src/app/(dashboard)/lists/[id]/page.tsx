'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLists, useListComments, useEmployees, useAssignments } from '@/hooks/useResourceData'
import { ListDetailView } from '@/components/dashboard/ListDetailView'
import { ListModal } from '@/components/modals/ListModal'
import { useDashboard } from '@/contexts/DashboardContext'
import type { EmployeeListInput } from '@/lib/types'

export default function ListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { currentUser } = useDashboard()
  const { lists, loading, updateList, updateMemberDetails } = useLists()
  const { employees } = useEmployees()
  const { assignments } = useAssignments()
  const { comments, loading: commentsLoading, createComment, deleteComment, toggleReaction } = useListComments(id)

  const [editModal, setEditModal] = useState(false)

  const list = lists.find(l => l.id === id)

  useEffect(() => {
    if (!loading && !list) {
      router.replace('/lists')
    }
  }, [loading, list, router])

  if (loading || !list) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  const handleSave = async (input: EmployeeListInput, employeeIds: string[]) => {
    const { error } = await updateList(list.id, input, employeeIds)
    if (error) toast.error('Failed to update list')
    else toast.success('List updated')
  }

  const handleAddComment = async (text: string) => {
    const { error } = await createComment({
      list_id: id,
      comment_text: text,
      created_by: currentUser?.id ?? null,
    })
    if (error) toast.error('Failed to add comment')
  }

  const handleUpdateMemberDetails = async (memberId: string, details: string) => {
    const { error } = await updateMemberDetails(memberId, id, details)
    if (error) toast.error('Failed to save details')
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await deleteComment(commentId)
    if (error) toast.error('Failed to delete comment')
  }

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    if (!currentUser?.id) return
    const { error } = await toggleReaction(commentId, emoji, currentUser.id)
    if (error) toast.error('Failed to update reaction')
  }

  return (
    <>
        <ListDetailView
            list={list}
            assignments={assignments}
            comments={comments}
            commentsLoading={commentsLoading}
            currentUserId={currentUser?.id ?? null}
            currentUserName={currentUser?.full_name ?? null}
            onEdit={() => setEditModal(true)}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onUpdateMemberDetails={handleUpdateMemberDetails}
            onToggleReaction={handleToggleReaction}
            employees={employees}
          />

      <ListModal
        open={editModal}
        onClose={() => setEditModal(false)}
        onSave={handleSave}
        list={list}
        employees={employees}
        currentUserId={currentUser?.id ?? null}
      />
    </>
  )
}

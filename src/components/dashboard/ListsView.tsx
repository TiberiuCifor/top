'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users, ChevronRight, ListChecks } from 'lucide-react'
import type { EmployeeList, Employee } from '@/lib/types'

interface ListsViewProps {
  lists: EmployeeList[]
  employees: Employee[]
  loading: boolean
  currentUserId: string | null
  onAdd: () => void
  onEdit: (list: EmployeeList) => void
  onDelete: (list: EmployeeList) => void
}

export function ListsView({ lists, employees, loading, currentUserId, onAdd, onEdit, onDelete }: ListsViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all')

  const filtered = useMemo(() => {
    return lists.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      const matchOwner = ownerFilter === 'all' || l.created_by === currentUserId
      return matchSearch && matchStatus && matchOwner
    })
  }, [lists, search, statusFilter, ownerFilter, currentUserId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-[#ea2775]/30 dark:border-[#ea2775]/30 rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground">Loading lists...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search lists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card border-border rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${statusFilter === s ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Owner filter */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            {([{ v: 'all', label: 'All' }, { v: 'mine', label: 'Mine' }] as const).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setOwnerFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${ownerFilter === v ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white shadow-sm h-8">
            <Plus className="w-4 h-4 mr-1.5" />
            New List
          </Button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-2xl bg-[#ea2775]/10 mb-5">
              <ListChecks className="w-10 h-10 text-[#ea2775]" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No lists found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {search ? 'Try adjusting your search or filters.' : 'Create your first employee list to get started.'}
            </p>
            {!search && (
              <Button onClick={onAdd} size="sm" className="bg-[#ea2775] hover:bg-[#d01e65] text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                New List
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employees</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Created By</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="w-[52px] px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(list => (
                  <tr key={list.id} className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/lists/${list.id}`}
                        className="flex items-center gap-2 font-semibold text-sm text-foreground hover:text-[#ea2775] dark:hover:text-[#ea2775] transition-colors group/link"
                      >
                        <ListChecks className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        {list.name}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground truncate max-w-[240px] block">
                        {list.description || <span className="opacity-40">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        list.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${list.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {list.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {list.members?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {list.created_by_user?.full_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(list.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-3 py-3 w-[52px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onEdit(list)} className="gap-2 text-xs">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(list)} className="text-destructive gap-2 text-xs">
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of {lists.length} lists
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, User } from 'lucide-react'
import type { EmployeeList, EmployeeListInput, Employee } from '@/lib/types'

interface ListModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: EmployeeListInput, employeeIds: string[]) => Promise<void>
  list?: EmployeeList | null
  employees: Employee[]
  currentUserId: string | null
}

export function ListModal({ open, onClose, onSave, list, employees, currentUserId }: ListModalProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      setName(list?.name ?? '')
      setDescription(list?.description ?? '')
      setStatus(list?.status ?? 'active')
      setSelectedIds(new Set(list?.members?.map(m => m.employee_id) ?? []))
      setSearch('')
    }
  }, [open, list])

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase()
    return employees.filter(e =>
      e.status === 'Active' &&
      (e.full_name.toLowerCase().includes(q) ||
       (e.role_data?.name ?? '').toLowerCase().includes(q))
    )
  }, [employees, search])

  const toggleEmployee = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() || null, status, created_by: currentUserId }, Array.from(selectedIds))
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const selectedEmployees = employees.filter(e => selectedIds.has(e.id))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{list ? 'Edit List' : 'Create List'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bench Q1 2026" required />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." className="resize-none h-16" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as 'active' | 'inactive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <Label>Employees</Label>
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 rounded-lg border border-border bg-muted/30">
                {selectedEmployees.map(e => (
                  <span key={e.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775]">
                    {e.full_name}
                    <button type="button" onClick={() => toggleEmployee(e.id)} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 max-h-52 rounded-lg border border-border divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No employees found</div>
              ) : (
                filteredEmployees.map(emp => {
                  const selected = selectedIds.has(emp.id)
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployee(emp.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selected ? 'bg-[#ea2775]/10' : 'hover:bg-muted/50'}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-[#ea2775] border-[#ea2775]' : 'border-border'}`}>
                        {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{emp.full_name}</span>
                        <span className="text-xs text-muted-foreground truncate">{emp.role_data?.name ?? '—'}</span>
                      </div>
                      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${emp.contract_type === 'FTE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-[#ea2775]/15 text-[#ea2775] dark:bg-[#ea2775]/15 dark:text-[#ea2775]'}`}>
                        {emp.contract_type}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !name.trim()} className="bg-[#ea2775] hover:bg-[#d01e65] text-white">
              {loading ? 'Saving...' : list ? 'Save Changes' : 'Create List'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

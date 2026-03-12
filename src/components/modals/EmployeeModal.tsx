'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Employee, EmployeeInput, Role, Practice, Squad } from '@/lib/types'
import { User, Briefcase, Calendar, Users, Loader2, Save, Link2, Search, X, Check, ChevronDown } from 'lucide-react'

interface BambooEmployee {
  id: string
  displayName: string
  jobTitle: string
  department: string
}

interface JiraUser {
  accountId: string
  displayName: string
  emailAddress: string | null
  avatarUrl: string | null
}

const inputClass = 'h-10 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all'
const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider'

interface EmployeeModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: EmployeeInput) => Promise<void>
  employee?: Employee | null
  roles: Role[]
  practices: Practice[]
  squads: Squad[]
}

export function EmployeeModal({ open, onClose, onSave, employee, roles, practices, squads }: EmployeeModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EmployeeInput>({
    full_name: '',
    contract_type: 'FTE',
    role_id: null,
    practice_id: null,
    squad_id: null,
    practice_role: 'Member',
    company_start_date: '',
    employee_updates: '',
      status: 'Active',
      bamboo_id: null,
      jira_user_id: null,
    })

  const [bambooEmployees, setBambooEmployees] = useState<BambooEmployee[]>([])
  const [bambooLoading, setBambooLoading] = useState(false)
  const [bambooSearch, setBambooSearch] = useState('')
  const [bambooOpen, setBambooOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  const [jiraUsers, setJiraUsers] = useState<JiraUser[]>([])
  const [jiraLoading, setJiraLoading] = useState(false)
  const [jiraSearch, setJiraSearch] = useState('')
  const [jiraOpen, setJiraOpen] = useState(false)
  const jiraComboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        contract_type: employee.contract_type,
        role_id: employee.role_id ?? roles[0]?.id ?? null,
        practice_id: employee.practice_id,
        squad_id: employee.squad_id,
        practice_role: employee.practice_role || 'Member',
        company_start_date: employee.company_start_date || '',
        employee_updates: employee.employee_updates || '',
          status: employee.status || 'Active',
          bamboo_id: employee.bamboo_id ?? null,
          jira_user_id: employee.jira_user_id ?? null,
        })
    } else {
      setFormData({
        full_name: '',
        contract_type: 'FTE',
        role_id: roles[0]?.id ?? null,
        practice_id: null,
        squad_id: null,
        practice_role: 'Member',
        company_start_date: '',
        employee_updates: '',
        status: 'Active',
        bamboo_id: null,
        jira_user_id: null,
      })
    }
  }, [employee, open, roles])

  useEffect(() => {
    if (!open) return
    setBambooLoading(true)
    fetch('/api/bamboohr/employees')
      .then(r => r.json())
      .then(d => setBambooEmployees(d.employees ?? []))
      .finally(() => setBambooLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    setJiraLoading(true)
    fetch('/api/jira/users')
      .then(r => r.json())
      .then(d => setJiraUsers(d.users ?? []))
      .finally(() => setJiraLoading(false))
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setBambooOpen(false)
      }
      if (jiraComboRef.current && !jiraComboRef.current.contains(e.target as Node)) {
        setJiraOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedBamboo = bambooEmployees.find(b => b.id === formData.bamboo_id)
  const filteredBamboo = bambooEmployees.filter(b =>
    b.displayName.toLowerCase().includes(bambooSearch.toLowerCase()) ||
    b.jobTitle?.toLowerCase().includes(bambooSearch.toLowerCase())
  )

  const selectedJira = jiraUsers.find(u => u.accountId === formData.jira_user_id)
  const filteredJira = jiraUsers.filter(u =>
    u.displayName.toLowerCase().includes(jiraSearch.toLowerCase()) ||
    (u.emailAddress ?? '').toLowerCase().includes(jiraSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const dataToSave = {
        ...formData,
        company_start_date: formData.company_start_date || null,
        employee_updates: formData.employee_updates || null,
      }
      await onSave(dataToSave)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const roleSelected = formData.role_id !== null && formData.role_id !== undefined

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden rounded-xl border-border max-h-[90vh] flex flex-col">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-[#c01560] to-[#ea2775] px-6 py-5 shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">
                  {employee ? 'Edit Employee' : 'New Employee'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-white/60 text-xs mt-0.5">
                {employee ? 'Update employee details below' : 'Fill in the details to add a new employee'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Employee Hiring Details */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Hiring Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className={labelClass}>
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter full name"
                      className={`${inputClass} pl-10`}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company_start_date" className={labelClass}>Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      id="company_start_date"
                      type="date"
                      value={formData.company_start_date || ''}
                      onChange={(e) => setFormData({ ...formData, company_start_date: e.target.value })}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contract_type" className={labelClass}>
                    Contract Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.contract_type} onValueChange={(v) => setFormData({ ...formData, contract_type: v as EmployeeInput['contract_type'] })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FTE">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          FTE
                        </div>
                      </SelectItem>
                      <SelectItem value="CTR">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#ea2775]/100" />
                          CTR
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status" className={labelClass}>
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as 'Active' | 'Inactive' })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="Inactive">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          Inactive
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role" className={labelClass}>
                  Role <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
                  <Select
                    value={formData.role_id ?? 'none'}
                    onValueChange={(v) => setFormData({ ...formData, role_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className={`${inputClass} pl-10`}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>{roles.length === 0 ? 'No roles available' : 'Select role'}</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* Practice Details */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Practice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="practice" className={labelClass}>Practice</Label>
                  <Select
                    value={formData.practice_id ?? 'none'}
                    onValueChange={(v) => setFormData({ ...formData, practice_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select practice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {practices.map((practice) => (
                        <SelectItem key={practice.id} value={practice.id}>{practice.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="practice_role" className={labelClass}>Practice Role</Label>
                  <Select
                    value={formData.practice_role}
                    onValueChange={(v) => setFormData({ ...formData, practice_role: v as 'Lead' | 'Member' | 'Squad Lead' })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Squad Lead">Squad Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="squad" className={labelClass}>Squad</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
                  <Select
                    value={formData.squad_id ?? 'none'}
                    disabled={!formData.practice_id}
                    onValueChange={(v) => setFormData({ ...formData, squad_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className={`${inputClass} pl-10`}>
                      <SelectValue placeholder={formData.practice_id ? "Select squad" : "Select a practice first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {formData.practice_id && squads
                        .filter(s => s.practice_id === formData.practice_id)
                        .map((squad) => (
                          <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

              <div className="h-px bg-border" />

              {/* BambooHR Link */}
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  BambooHR Link
                </h3>
                <div className="space-y-1.5" ref={comboRef}>
                  <Label className={labelClass}>Linked BambooHR Employee</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setBambooOpen(o => !o); setBambooSearch('') }}
                      className={`w-full flex items-center justify-between gap-2 ${inputClass} px-3 text-sm text-left`}
                    >
                      {bambooLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading BambooHR...
                        </span>
                      ) : selectedBamboo ? (
                        <span className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-md bg-[#ea2775]/15 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-[#ea2775]" />
                          </span>
                          <span className="truncate font-medium">{selectedBamboo.displayName}</span>
                          <span className="text-muted-foreground truncate text-xs">{selectedBamboo.jobTitle}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search BambooHR employees...</span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        {formData.bamboo_id && (
                          <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(f => ({ ...f, bamboo_id: null })) }}
                            className="p-0.5 rounded hover:bg-muted"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>

                    {bambooOpen && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Search by name or title..."
                              value={bambooSearch}
                              onChange={e => setBambooSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:border-violet-500/50"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredBamboo.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">No employees found</div>
                          ) : filteredBamboo.map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { setFormData(f => ({ ...f, bamboo_id: b.id })); setBambooOpen(false) }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                            >
                              <span className="w-6 h-6 rounded-md bg-[#ea2775]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#ea2775]">
                                {b.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium truncate">{b.displayName}</span>
                                <span className="block text-xs text-muted-foreground truncate">{b.jobTitle}</span>
                              </span>
                              {formData.bamboo_id === b.id && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedBamboo && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-500" />
                      Linked to BambooHR ID <span className="font-mono font-semibold">#{selectedBamboo.id}</span> · {selectedBamboo.department}
                    </p>
                  )}
                </div>
                </section>

                <div className="h-px bg-border" />

                {/* Jira Link */}
                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Jira Link
                  </h3>
                  <div className="space-y-1.5" ref={jiraComboRef}>
                    <Label className={labelClass}>Linked Jira User</Label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setJiraOpen(o => !o); setJiraSearch('') }}
                        className={`w-full flex items-center justify-between gap-2 ${inputClass} px-3 text-sm text-left`}
                      >
                        {jiraLoading ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading Jira users...
                          </span>
                        ) : selectedJira ? (
                          <span className="flex items-center gap-2 truncate">
                            {selectedJira.avatarUrl ? (
                              <img src={selectedJira.avatarUrl} alt="" className="w-5 h-5 rounded-md shrink-0" />
                            ) : (
                              <span className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-blue-500" />
                              </span>
                            )}
                            <span className="truncate font-medium">{selectedJira.displayName}</span>
                            {selectedJira.emailAddress && (
                              <span className="text-muted-foreground truncate text-xs">{selectedJira.emailAddress}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Search Jira users...</span>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {formData.jira_user_id && (
                            <span
                              role="button"
                              onClick={(e) => { e.stopPropagation(); setFormData(f => ({ ...f, jira_user_id: null })) }}
                              className="p-0.5 rounded hover:bg-muted"
                            >
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>

                      {jiraOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-border">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search by name or email..."
                                value={jiraSearch}
                                onChange={e => setJiraSearch(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 text-sm bg-muted/30 border border-border rounded-md focus:outline-none focus:border-violet-500/50"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredJira.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">No users found</div>
                            ) : filteredJira.map(u => (
                              <button
                                key={u.accountId}
                                type="button"
                                onClick={() => { setFormData(f => ({ ...f, jira_user_id: u.accountId })); setJiraOpen(false) }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                              >
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-md shrink-0" />
                                ) : (
                                  <span className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-500">
                                    {u.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                )}
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-medium truncate">{u.displayName}</span>
                                  {u.emailAddress && (
                                    <span className="block text-xs text-muted-foreground truncate">{u.emailAddress}</span>
                                  )}
                                </span>
                                {formData.jira_user_id === u.accountId && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedJira && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Linked to Jira account <span className="font-mono font-semibold">{selectedJira.accountId.slice(0, 12)}…</span>
                      </p>
                    )}
                  </div>
                </section>

                <div className="h-px bg-border" />

                {/* Employee Updates */}
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Notes</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="employee_updates" className={labelClass}>Employee Updates</Label>
                  <Textarea
                    id="employee_updates"
                    placeholder="Add any updates or notes here..."
                    className="min-h-[80px] bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 rounded-lg transition-all resize-none"
                    value={formData.employee_updates || ''}
                    onChange={(e) => setFormData({ ...formData, employee_updates: e.target.value })}
                  />
                </div>
              </section>
            </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.full_name || !roleSelected || roles.length === 0}
              className="bg-[#ea2775] hover:bg-[#d01e65] text-white rounded-lg h-9 px-5 text-sm shadow-sm min-w-[110px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {employee ? 'Update' : 'Add Employee'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

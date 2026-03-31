'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Users, Plus, Pencil, Trash2, Search, X, Eye, EyeOff, ChevronDown, Settings2, Check } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import { EmployeeAvatar } from '@/components/ui/employee-avatar'

// ─── Color presets ───
const COLOR_PRESETS = [
  { name: 'Red',    color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',        dot: 'bg-red-500' },
  { name: 'Orange', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', dot: 'bg-orange-500' },
  { name: 'Amber',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500' },
  { name: 'Green',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { name: 'Teal',   color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',    dot: 'bg-teal-500' },
  { name: 'Cyan',   color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',    dot: 'bg-cyan-500' },
  { name: 'Blue',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',    dot: 'bg-blue-500' },
  { name: 'Violet', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400', dot: 'bg-violet-500' },
  { name: 'Pink',   color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',    dot: 'bg-pink-500' },
  { name: 'Rose',   color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',    dot: 'bg-rose-500' },
  { name: 'Slate',  color: 'bg-muted text-muted-foreground',                                       dot: 'bg-slate-400' },
]

const DEFAULT_ROLES: RoleConfig[] = [
  { value: 'admin',         label: 'Admin',         color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  { value: 'leadership',    label: 'Leadership',    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' },
  { value: 'practice_lead', label: 'Practice Lead', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  { value: 'project_lead',  label: 'Project Lead',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  { value: 'sales',         label: 'Sales',         color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  { value: 'hr',            label: 'HR',            color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400' },
  { value: 'user',          label: 'IT Support',    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400' },
]

interface AppUser { id: string; full_name: string; email: string; role: string; created_at: string }
type RoleConfig = { value: string; label: string; color: string }

// ─── Color Picker ───
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {COLOR_PRESETS.map(p => (
        <button
          key={p.name}
          type="button"
          onClick={() => onChange(p.color)}
          title={p.name}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border-2 transition-all text-left ${value === p.color ? 'border-[#ea2775]' : 'border-transparent hover:border-border'}`}
        >
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${p.dot}`} />
          <span className="text-[10px] text-muted-foreground truncate">{p.name}</span>
          {value === p.color && <Check className="w-3 h-3 text-[#ea2775] ml-auto flex-shrink-0" />}
        </button>
      ))}
    </div>
  )
}

// ─── Role Badge ───
function RoleBadge({ role, roles }: { role: string; roles: RoleConfig[] }) {
  const r = roles.find(x => x.value === role) || { label: role, color: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${r.color}`}>
      {r.label}
    </span>
  )
}

// ─── Manage Roles Drawer ───
function ManageRolesDrawer({ open, onClose, roles, users, onSaveRole, onAddRole }: {
  open: boolean; onClose: () => void
  roles: RoleConfig[]; users: AppUser[]
  onSaveRole: (role: RoleConfig) => Promise<void>
  onAddRole: (role: RoleConfig) => Promise<void>
}) {
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[6].color)
  const [addSaving, setAddSaving] = useState(false)

  function startEdit(r: RoleConfig) {
    setShowAddForm(false)
    setEditingValue(r.value)
    setEditLabel(r.label)
    setEditColor(r.color)
  }

  function cancelEdit() { setEditingValue(null) }

  async function saveEdit() {
    if (!editLabel.trim() || !editingValue) return
    setEditSaving(true)
    try {
      await onSaveRole({ value: editingValue, label: editLabel.trim(), color: editColor })
      setEditingValue(null)
      toast.success('Role updated')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update role')
    } finally {
      setEditSaving(false)
    }
  }

  function openAddForm() {
    setEditingValue(null)
    setNewLabel('')
    setNewValue('')
    setNewColor(COLOR_PRESETS[6].color)
    setShowAddForm(true)
  }

  function cancelAdd() { setShowAddForm(false) }

  function handleNewLabelChange(val: string) {
    setNewLabel(val)
    setNewValue(val.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
  }

  async function saveNewRole() {
    if (!newLabel.trim() || !newValue.trim()) return
    if (roles.some(r => r.value === newValue)) {
      toast.error('A role with this system value already exists')
      return
    }
    setAddSaving(true)
    try {
      await onAddRole({ value: newValue, label: newLabel.trim(), color: newColor })
      setShowAddForm(false)
      toast.success('Role added')
    } catch (e: any) {
      toast.error(e.message || 'Failed to add role')
    } finally {
      setAddSaving(false)
    }
  }

  const userCountByRole = (value: string) => users.filter(u => u.role === value).length

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full z-50 w-[480px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Manage Roles</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Edit display names and colors for each role</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAddForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ea2775] hover:bg-[#c01560] text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Role
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Role list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Add new role form */}
          {showAddForm && (
            <div className="rounded-xl border border-[#ea2775]/40 bg-[#ea2775]/5 px-4 py-4 space-y-3">
              <span className="text-xs font-semibold text-[#ea2775] uppercase tracking-wider">New Role</span>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => handleNewLabelChange(e.target.value)}
                  placeholder="e.g. Department Manager"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60"
                  onKeyDown={e => { if (e.key === 'Enter') saveNewRole(); if (e.key === 'Escape') cancelAdd() }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  System Value <span className="font-normal normal-case">(auto-generated)</span>
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. dept_manager"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Badge Color</label>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${newColor}`}>
                  {newLabel || 'New Role'}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={cancelAdd} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveNewRole}
                  disabled={addSaving || !newLabel.trim() || !newValue.trim()}
                  className="flex-1 py-2 text-sm rounded-lg bg-[#ea2775] hover:bg-[#c01560] text-white font-medium transition-colors disabled:opacity-50"
                >
                  {addSaving ? 'Adding…' : 'Add Role'}
                </button>
              </div>
            </div>
          )}

          {roles.map(r => {
            const count = userCountByRole(r.value)
            const isEditing = editingValue === r.value
            return (
              <div key={r.value} className={`rounded-xl border transition-all ${isEditing ? 'border-[#ea2775]/40 bg-[#ea2775]/5' : 'border-border bg-muted/20 hover:bg-muted/40'}`}>
                {!isEditing ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${r.color}`}>
                      {r.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">{r.value}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">{count} {count === 1 ? 'user' : 'users'}</span>
                    <button
                      onClick={() => startEdit(r)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editing:</span>
                      <span className="text-xs font-mono text-muted-foreground">{r.value}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60"
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-2">Badge Color</label>
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Preview:</span>
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${editColor}`}>
                        {editLabel || r.label}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={cancelEdit} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={editSaving || !editLabel.trim()}
                        className="flex-1 py-2 text-sm rounded-lg bg-[#ea2775] hover:bg-[#c01560] text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Role values (shown in monospace) are system identifiers and cannot be changed. You can rename the display label and color of any role.
          </p>
        </div>
      </div>
    </>
  )
}

// ─── Edit User Modal ───
function EditUserModal({ user, roles, onClose, onSave }: { user: AppUser; roles: RoleConfig[]; onClose: () => void; onSave: (id: string, role: string) => Promise<void> }) {
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(user.id, role)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold">Edit User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <EmployeeAvatar name={user.full_name} size="md" />
            <div>
              <p className="font-semibold text-sm">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Role</label>
            <div className="relative">
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60">
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || role === user.role}
            className="px-4 py-2 text-sm rounded-lg bg-[#ea2775] hover:bg-[#c01560] text-white font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create User Modal ───
function CreateUserModal({ roles, onClose, onCreate }: { roles: RoleConfig[]; onClose: () => void; onCreate: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'user' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.password) { toast.error('Please fill in all fields'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('User created successfully')
      onCreate(); onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create user')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold">Create New User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'john@company.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60" />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Role</label>
            <div className="relative">
              <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60">
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-[#ea2775] hover:bg-[#c01560] text-white font-medium transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───
export default function UsersPage() {
  const { currentUser } = useDashboard()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('__all__')
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showManageRoles, setShowManageRoles] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES)

  // Load roles from DB on mount
  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setRoles(data)
      }
      // else: fall back to DEFAULT_ROLES (table not yet created)
    } catch {
      // silently fall back to defaults
    }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  if (currentUser?.role !== 'admin') {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Access denied. Admin only.</div>
  }

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=id,full_name,email,role,created_at&order=full_name`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        }
      })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleUpdateRole(userId: string, role: string) {
    const res = await fetch('/api/users/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    const data = await res.json()
    if (data.error) { toast.error(data.error); return }
    toast.success('Role updated')
    await fetchUsers()
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    setDeletingId(userId)
    try {
      const res = await fetch('/api/users/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('User deleted')
      await fetchUsers()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user')
    } finally { setDeletingId(null) }
  }

  // ─── Role config handlers (persisted to DB) ───
  async function handleSaveRole(updated: RoleConfig) {
    const res = await fetch('/api/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setRoles(prev => prev.map(r => r.value === updated.value ? updated : r))
  }

  async function handleAddRole(newRole: RoleConfig) {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRole),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setRoles(prev => [...prev, newRole])
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = filterRole === '__all__' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const roleCounts = roles.map(r => ({ ...r, count: users.filter(u => u.role === r.value).length })).filter(r => r.count > 0)

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {roleCounts.map(r => (
          <div key={r.value} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-medium truncate">{r.label}</p>
            <p className="text-2xl font-bold mt-1">{r.count}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60" />
          </div>
          <div className="relative">
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea2775]/30 focus:border-[#ea2775]/60">
              <option value="__all__">All Roles</option>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowManageRoles(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent text-foreground text-sm font-medium transition-colors">
            <Settings2 className="w-4 h-4" />
            Manage Roles
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ea2775] hover:bg-[#c01560] text-white text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            New User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{filtered.length} users</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="pl-6 pr-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Joined</th>
                <th className="pr-6 pl-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="pl-6 pr-4 py-3">
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar name={u.full_name} size="md" />
                      <div>
                        <p className="text-sm font-semibold">{u.full_name}</p>
                        {u.id === currentUser?.id && <span className="text-[10px] text-[#ea2775] font-semibold">You</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} roles={roles} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="pr-6 pl-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit role">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u.id, u.full_name)} disabled={deletingId === u.id}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50" title="Delete user">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editUser && <EditUserModal user={editUser} roles={roles} onClose={() => setEditUser(null)} onSave={handleUpdateRole} />}
      {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} onCreate={fetchUsers} />}
      <ManageRolesDrawer
        open={showManageRoles}
        onClose={() => setShowManageRoles(false)}
        roles={roles}
        users={users}
        onSaveRole={handleSaveRole}
        onAddRole={handleAddRole}
      />
    </div>
  )
}

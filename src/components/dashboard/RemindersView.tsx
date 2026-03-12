'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Reminder, User } from '@/lib/types'
import { Plus, MoreHorizontal, Pencil, Trash2, Bell, AlertTriangle, AlertCircle, Info, Building2, Briefcase, Users, Layers, HelpCircle, Clock, CheckCircle2, PlayCircle } from 'lucide-react'
import { format } from 'date-fns'

interface RemindersViewProps {
  reminders: Reminder[]
  users: User[]
  currentUserId: string | null
  loading: boolean
  onAdd: () => void
  onEdit: (reminder: Reminder) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'New' | 'In Progress' | 'Done') => void
}

const topicIcons: Record<string, React.ReactNode> = {
  Clients: <Building2 className="w-4 h-4" />,
  Projects: <Briefcase className="w-4 h-4" />,
  Employees: <Users className="w-4 h-4" />,
  Practices: <Layers className="w-4 h-4" />,
  Other: <HelpCircle className="w-4 h-4" />,
}

const topicColors: Record<string, string> = {
  Clients: 'bg-[#ea2775]/15 text-[#ea2775]',
  Projects: 'bg-purple-100 text-purple-700',
  Employees: 'bg-green-100 text-green-700',
  Practices: 'bg-orange-100 text-orange-700',
  Other: 'bg-gray-100 text-gray-700',
}

const priorityConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  High: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  Medium: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  Low: { icon: <Info className="w-4 h-4" />, color: 'text-[#ea2775]', bgColor: 'bg-[#ea2775]/15' },
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  New: { icon: <Bell className="w-4 h-4" />, color: 'text-[#ea2775]', bgColor: 'bg-[#ea2775]/15' },
  'In Progress': { icon: <PlayCircle className="w-4 h-4" />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  Done: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
}

export function RemindersView({ reminders, users, currentUserId, loading, onAdd, onEdit, onDelete, onStatusChange }: RemindersViewProps) {
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('New')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (currentUserId && !initialized) {
      setOwnerFilter(currentUserId)
      setInitialized(true)
    }
  }, [currentUserId, initialized])

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      if (topicFilter !== 'all' && r.topic !== topicFilter) return false
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
      if (ownerFilter !== 'all' && r.owner_id !== ownerFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
  }, [reminders, topicFilter, priorityFilter, ownerFilter, statusFilter])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading reminders...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="Clients">Clients</SelectItem>
              <SelectItem value="Projects">Projects</SelectItem>
              <SelectItem value="Employees">Employees</SelectItem>
              <SelectItem value="Practices">Practices</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      {filteredReminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No reminders found</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first reminder</p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[120px]">Topic</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Owner</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[160px]">Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReminders.map(reminder => (
                <TableRow key={reminder.id}>
                  <TableCell className="font-medium">
                    {format(new Date(reminder.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${topicColors[reminder.topic]}`}>
                      {topicIcons[reminder.topic]}
                      {reminder.topic}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="text-sm line-clamp-2">{reminder.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm">{reminder.owner?.full_name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${priorityConfig[reminder.priority].bgColor} ${priorityConfig[reminder.priority].color}`}>
                      {priorityConfig[reminder.priority].icon}
                      {reminder.priority}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={reminder.status} 
                      onValueChange={(value) => onStatusChange(reminder.id, value as 'New' | 'In Progress' | 'Done')}
                    >
                      <SelectTrigger className={`w-[130px] h-8 ${statusConfig[reminder.status].bgColor} ${statusConfig[reminder.status].color} border-0`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">
                          <div className="flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-[#ea2775]" />
                            New
                          </div>
                        </SelectItem>
                        <SelectItem value="In Progress">
                          <div className="flex items-center gap-1.5">
                            <PlayCircle className="w-4 h-4 text-amber-600" />
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="Done">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Done
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(reminder.updated_at), 'MMM d, HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(reminder)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(reminder.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

export interface Client {
  id: string
  name: string
  industry?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  status?: string | null
  created_at: string
  updated_at?: string
}

export interface ProjectStakeholder {
  id: string
  project_id: string
  name: string
  email?: string | null
  position?: string | null
  created_at: string
  updated_at?: string
}

export type ProjectStakeholderInput = Omit<ProjectStakeholder, 'id' | 'created_at' | 'updated_at'>

export interface Project {
  id: string
  name: string
  description?: string | null
  client_id: string | null
  status?: string | null
  start_date: string | null
  end_date: string | null
  budget?: number | null
  priority?: string | null
  stakeholders?: string | null // Keep for backward compatibility if needed, but we'll use the table
  project_stakeholders?: ProjectStakeholder[]
  project_lead_id?: string | null
  project_lead?: Employee
  important_updates?: string | null
  sow_signed?: boolean
  sow_url?: string | null
  jira_project_key?: string | null
  created_at: string
  updated_at?: string
  client?: Client
  latest_rag_status?: ProjectRagStatus
}

export interface ProjectRagStatus {
  id: string
  project_id: string
  team_score: number
  client_score: number
  rag_score: 'R' | 'A' | 'G'
  important_updates?: string | null
  important_achievements?: string | null
  top_performers?: string | null
  concerns_risks?: string | null
  action_items?: string | null
  created_at: string
  updated_at?: string
}

export type ProjectRagStatusInput = Omit<ProjectRagStatus, 'id' | 'created_at' | 'updated_at'>

export interface Role {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at?: string
}

export type ClientInput = Omit<Client, 'id' | 'created_at' | 'updated_at'>
export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>

export interface Practice {
  id: string
  name: string
  created_at: string
  squads?: Squad[]
}

export interface Squad {
  id: string
  name: string
  practice_id: string
  squad_lead_id: string | null
  created_at: string
  practice?: Practice
  squad_lead?: Employee
}

export interface Employee {
  id: string
  full_name: string
  contract_type: 'FTE' | 'CTR'
  role_id: string | null
  role?: string
  role_data?: Role
  practice_id: string | null
  practice?: Practice
  squad_id: string | null
  squad?: Squad
  practice_role: 'Lead' | 'Member' | 'Squad Lead'
  company_start_date?: string | null
  employee_updates?: string | null
  status: 'Active' | 'Inactive'
  bamboo_id?: string | null
  jira_user_id?: string | null
  photo_url?: string | null
  created_at: string
}

export interface Assignment {
  id: string
  employee_id: string
  project_id: string
  role_on_project: string | null
  allocation_percentage: number
  start_date: string
  end_date: string | null
  status: 'active' | 'inactive'
  employee?: Employee
  project?: Project
  created_at: string
}

export interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'user' | 'project_lead' | 'sales' | 'practice_lead' | 'leadership'
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export type PracticeInput = Omit<Practice, 'id' | 'created_at' | 'squads'>
export type SquadInput = Omit<Squad, 'id' | 'created_at' | 'practice' | 'squad_lead'>
export type EmployeeInput = Omit<Employee, 'id' | 'created_at' | 'role' | 'role_data' | 'practice' | 'squad'>
export type AssignmentInput = Omit<Assignment, 'id' | 'created_at' | 'employee' | 'project'>
export type RoleInput = Omit<Role, 'id' | 'created_at' | 'updated_at'>
export type UserInput = Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }

export type Tab = 'overview' | 'dashboard' | 'clients' | 'projects' | 'employees' | 'assignments' | 'practices' | 'rag-updates' | 'reminders' | 'project-status' | 'ceo-dashboard'

export interface Reminder {
  id: string
  date: string
  topic: 'Clients' | 'Projects' | 'Employees' | 'Practices' | 'Other'
  description: string
  owner_id: string | null
  owner?: User
  priority: 'High' | 'Medium' | 'Low'
  status: 'New' | 'In Progress' | 'Done'
  created_at: string
  updated_at: string
}

export type ReminderInput = Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'owner'>

export interface EmployeeUpdate {
  id: string
  employee_id: string
  update_text: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EmployeeUpdateInput = Omit<EmployeeUpdate, 'id' | 'created_at' | 'updated_at'>

export interface AssignmentNote {
  id: string
  assignment_id: string
  content: string
  author: string | null
  created_at: string
}

export type AssignmentNoteInput = Omit<AssignmentNote, 'id' | 'created_at'>

export interface EmployeeProjectHistory {
  id: string
  assignment_id: string | null
  employee_id: string
  project_id: string | null
  project_name: string | null
  client_name: string | null
  start_date: string
  end_date: string | null
  allocation_percentage: number | null
  role_on_project: string | null
  status: 'active' | 'completed' | 'canceled'
  created_at: string
}

export interface CeoDashboardEntry {
  id: string
  week_ended: string
  cash_eur: number
  total_ar_eur: number
  ar_over_60d_eur: number
  ar_over_60d_percent: number | null
  red_projects: number | null
  amber_projects: number | null
  green_projects: number | null
  discovery_calls: number | null
  pipeline_total_eur: number | null
  pipeline_weighted_eur: number | null
  opps_added: number | null
  opps_won_eur: number | null
  opps_lost: number | null
  expected_closes_30d_eur: number | null
  utilization_percent: number | null
  bench_count: number | null
  critical_open_roles: string | null
  top_3_risks: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CeoDashboardEntryInput = Omit<CeoDashboardEntry, 'id' | 'created_at' | 'updated_at'>

export interface EmployeeList {
  id: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  created_by: string | null
  created_by_user?: User
  created_at: string
  updated_at: string
  members?: EmployeeListMember[]
}

export interface EmployeeListMember {
  id: string
  list_id: string
  employee_id: string
  employee?: Employee
  details: string | null
  created_at: string
}

export interface EmployeeListComment {
  id: string
  list_id: string
  comment_text: string
  created_by: string | null
  created_by_user?: User
  created_at: string
  updated_at: string
  reactions: Record<string, string[]>
}

export type EmployeeListInput = Omit<EmployeeList, 'id' | 'created_at' | 'updated_at' | 'created_by_user' | 'members'>
export type EmployeeListCommentInput = Omit<EmployeeListComment, 'id' | 'created_at' | 'updated_at' | 'created_by_user' | 'reactions'> & { reactions?: Record<string, string[]> }

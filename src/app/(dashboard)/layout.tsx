'use client'
import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext'
import { LayoutDashboard, Building2, Briefcase, Users, CalendarDays, Settings, LogOut, KeyRound, Layers, Bell, ChevronDown, ChevronRight, Activity, TrendingUp, FolderOpen, PanelLeftClose, PanelLeft, Sun, Moon, UserX, ListChecks, RefreshCw, Timer, TableProperties, History, ClipboardList, GraduationCap } from 'lucide-react'
import { useTheme } from 'next-themes'

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Dashboard',
  '/allocations': 'Allocations',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/employees': 'Employees',
  '/assignments': 'Assignments',
  '/practices': 'Practices',
  '/practices/activities-log': 'Practices — Activities Log',
  '/skills-matrix': 'Skills Matrix',
  '/projects-updates': 'Projects Updates',
  '/projects-updates/rag-updates': 'RAG Updates',
  '/projects-updates/pre-sales': 'Pre-Sales Updates',
  '/projects-updates/workload': 'Workload',
  '/reminders': 'Reminders',
  '/ceo-dashboard': 'CEO Dashboard',
  '/lists': 'Lists',
  '/hiring-pipeline': 'Hiring Pipeline',
  '/trainings-certs': 'Trainings & Certs',
  '/settings': 'Settings',
}

const PROJECTS_UPDATES_PATHS = ['/projects-updates/rag-updates', '/projects-updates/pre-sales', '/projects-updates/workload']
const PROJECTS_UPDATES_SUB_ITEMS = [
  { href: '/projects-updates/rag-updates', label: 'RAG Updates', Icon: Activity },
  { href: '/projects-updates/pre-sales', label: 'Pre-Sales Updates', Icon: RefreshCw },
  { href: '/projects-updates/workload', label: 'Workload', Icon: Timer },
]

const PRACTICES_PATHS = ['/practices', '/practices/activities-log', '/skills-matrix']
const PRACTICES_SUB_ITEMS = [
  { href: '/practices', label: 'Practices', Icon: Layers },
  { href: '/practices/activities-log', label: 'Activities Log', Icon: History },
  { href: '/skills-matrix', label: 'Skills Matrix', Icon: TableProperties },
]

const MANAGE_PATHS = ['/clients', '/projects', '/employees', '/assignments', '/lists']

const MANAGE_SUB_ITEMS = [
  { href: '/clients', label: 'Clients', Icon: Building2 },
  { href: '/projects', label: 'Projects', Icon: Briefcase },
  { href: '/employees', label: 'Employees', Icon: Users },
  { href: '/assignments', label: 'Assignments', Icon: CalendarDays },
  { href: '/lists', label: 'Lists', Icon: ListChecks },
]

function SidebarLink({ href, label, icon, indent = false, active, collapsed }: {
  href: string; label: string; icon: React.ReactNode; indent?: boolean; active: boolean; collapsed: boolean
}) {
  return (
    <div className="relative">
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
          ${indent ? 'pl-10' : ''}
          ${collapsed ? 'justify-center' : ''}
          ${active
            ? 'bg-[#ea2775] text-white shadow-md shadow-[#ea2775]/25'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
      >
        <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-muted-foreground'}`}>
          {icon}
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </div>
  )
}

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}

const Sidebar = memo(function Sidebar({ pathname, benchCount, sidebarCollapsed, isProjectLead, isItSupport, isLeadership, onToggleCollapse }: {
  pathname: string; benchCount: number; sidebarCollapsed: boolean; isProjectLead: boolean; isItSupport: boolean; isLeadership: boolean; onToggleCollapse: () => void
}) {
  const [manageOpen, setManageOpen] = useState(true)
  const [projectsUpdatesOpen, setProjectsUpdatesOpen] = useState(true)
  const [practicesOpen, setPracticesOpen] = useState(true)
  const isManageTab = MANAGE_PATHS.includes(pathname)
  const isProjectsUpdatesTab = PROJECTS_UPDATES_PATHS.some(p => pathname.startsWith(p))
  const isPracticesTab = PRACTICES_PATHS.some(p => pathname.startsWith(p))

  return (
      <aside className={`self-stretch sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-[width] duration-300 z-40 flex-shrink-0 overflow-x-hidden ${sidebarCollapsed ? 'w-[68px]' : 'w-60'}`}>
      <div className={`flex items-center h-16 border-b border-border ${sidebarCollapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#ea2775] shadow-md flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="m4.93 4.93 2.83 2.83" />
            <path d="m16.24 16.24 2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="m4.93 19.07 2.83-2.83" />
            <path d="m16.24 7.76 2.83-2.83" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-foreground tracking-tight truncate">Operational Platform</span>
            <span className="text-[11px] text-muted-foreground">Tecknoworks</span>
          </div>
        )}
      </div>

        <nav className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? 'px-2' : 'px-3'} space-y-1`}>
            {isItSupport ? (
              <SidebarLink href="/trainings-certs" label="Trainings & Certs" icon={<GraduationCap className="w-4 h-4" />} active={isActive(pathname, '/trainings-certs')} collapsed={sidebarCollapsed} />
            ) : null}
            {!isProjectLead && !isItSupport && (

            <>
              <SidebarLink href="/overview" label="Dashboard" icon={<LayoutDashboard className="w-4 h-4" />} active={isActive(pathname, '/overview')} collapsed={sidebarCollapsed} />
            <SidebarLink href="/allocations" label="Allocations" icon={<CalendarDays className="w-4 h-4" />} active={isActive(pathname, '/allocations')} collapsed={sidebarCollapsed} />

            {!sidebarCollapsed ? (
              <div>
                <button
                  onClick={() => setManageOpen(!manageOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isManageTab ? 'text-[#ea2775] dark:text-[#ea2775] bg-[#ea2775]/10 dark:bg-[#ea2775]/10' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <span className={`flex-shrink-0 ${isManageTab ? 'text-[#ea2775]' : 'text-muted-foreground'}`}>
                    <FolderOpen className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-left truncate">Manage</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${manageOpen ? 'rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${manageOpen ? 'max-h-64 mt-1' : 'max-h-0'}`}>
                  <div className="space-y-0.5">
                    {MANAGE_SUB_ITEMS.map(item => (
                      <SidebarLink key={item.href} href={item.href} label={item.label} icon={<item.Icon className="w-4 h-4" />} indent active={isActive(pathname, item.href, true)} collapsed={sidebarCollapsed} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
            <>
              {MANAGE_SUB_ITEMS.map(item => (
                <SidebarLink key={item.href} href={item.href} label={item.label} icon={<item.Icon className="w-4 h-4" />} active={isActive(pathname, item.href, true)} collapsed={sidebarCollapsed} />
              ))}
            </>
            )}

            <div className="relative">
              <Link
                href="/employees?bench=true"
                title={sidebarCollapsed ? `Bench${benchCount > 0 ? ` (${benchCount})` : ''}` : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${sidebarCollapsed ? 'justify-center' : ''}
                  text-muted-foreground hover:bg-accent hover:text-foreground`}
              >
                <span className="flex-shrink-0 text-muted-foreground">
                  <UserX className="w-4 h-4" />
                </span>
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate">Bench</span>
                    {benchCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                        {benchCount}
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && benchCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {benchCount}
                  </span>
                )}
              </Link>
            </div>

              {!sidebarCollapsed ? (
                <div>
                  <button
                    onClick={() => setPracticesOpen(!practicesOpen)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                      ${isPracticesTab ? 'text-[#ea2775] dark:text-[#ea2775] bg-[#ea2775]/10 dark:bg-[#ea2775]/10' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    <span className={`flex-shrink-0 ${isPracticesTab ? 'text-[#ea2775]' : 'text-muted-foreground'}`}>
                      <Layers className="w-4 h-4" />
                    </span>
                    <span className="flex-1 text-left truncate">Practices</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${practicesOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${practicesOpen ? 'max-h-48 mt-1' : 'max-h-0'}`}>
                    <div className="space-y-0.5">
                      {PRACTICES_SUB_ITEMS.map(item => (
                        <SidebarLink key={item.href} href={item.href} label={item.label} icon={<item.Icon className="w-4 h-4" />} indent active={isActive(pathname, item.href, true)} collapsed={sidebarCollapsed} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {PRACTICES_SUB_ITEMS.map(item => (
                    <SidebarLink key={item.href} href={item.href} label={item.label} icon={<item.Icon className="w-4 h-4" />} active={isActive(pathname, item.href, true)} collapsed={sidebarCollapsed} />
                  ))}
                </>
              )}
              <SidebarLink href="/trainings-certs" label="Trainings & Certs" icon={<GraduationCap className="w-4 h-4" />} active={isActive(pathname, '/trainings-certs')} collapsed={sidebarCollapsed} />
              <SidebarLink href="/hiring-pipeline" label="Hiring Pipeline" icon={<ClipboardList className="w-4 h-4" />} active={isActive(pathname, '/hiring-pipeline')} collapsed={sidebarCollapsed} />
          </>
        )}

            {!isItSupport && (!sidebarCollapsed ? (
              <div>
                <button
                  onClick={() => setProjectsUpdatesOpen(!projectsUpdatesOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isProjectsUpdatesTab ? 'text-[#ea2775] dark:text-[#ea2775] bg-[#ea2775]/10 dark:bg-[#ea2775]/10' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <span className={`flex-shrink-0 ${isProjectsUpdatesTab ? 'text-[#ea2775]' : 'text-muted-foreground'}`}>
                    <Activity className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-left truncate">Projects Updates</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${projectsUpdatesOpen ? 'rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${projectsUpdatesOpen ? 'max-h-32 mt-1' : 'max-h-0'}`}>
                  <div className="space-y-0.5">
                    {PROJECTS_UPDATES_SUB_ITEMS.map(item => (
                      <SidebarLink key={item.href} href={item.href} label={item.label} icon={<item.Icon className="w-4 h-4" />} indent active={isActive(pathname, item.href, true)} collapsed={sidebarCollapsed} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {PROJECTS_UPDATES_SUB_ITEMS.map(item => (
                  <SidebarLink key={item.href} href={item.href} label={item.label} icon={<item.Icon className="w-4 h-4" />} active={isActive(pathname, item.href, true)} collapsed={sidebarCollapsed} />
                ))}
              </>
            ))}

        {isLeadership && (
          <SidebarLink href="/ceo-dashboard" label="CEO Dashboard" icon={<TrendingUp className="w-4 h-4" />} active={isActive(pathname, '/ceo-dashboard')} collapsed={sidebarCollapsed} />
        )}
      </nav>

      <div className={`border-t border-border py-3 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
        <div className="relative">
          <button
            onClick={onToggleCollapse}
            title={sidebarCollapsed ? 'Expand' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  )
})

const Header = memo(function Header({ pathname, currentUser, newRemindersCount, handleLogout }: {
  pathname: string; currentUser: any; newRemindersCount: number; handleLogout: () => Promise<void>
}) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

    const pageTitle = pathname.startsWith('/project-status')
      ? 'Project Status'
      : pathname.startsWith('/lists/')
      ? 'Lists'
      : pathname.startsWith('/projects-updates/')
      ? (PAGE_TITLES[pathname] || 'Projects Updates')
      : pathname.startsWith('/practices/')
      ? (PAGE_TITLES[pathname] || 'Practices')
      : pathname.startsWith('/trainings-certs/')
      ? 'Trainings & Certs'
      : PAGE_TITLES[pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        <Link
          href="/reminders"
          className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${pathname === '/reminders'
              ? 'bg-[#ea2775]/10 dark:bg-[#ea2775]/10 text-[#ea2775] dark:text-[#ea2775]'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
        >
          <Bell className="w-4 h-4" />
          <span className="hidden md:inline">Reminders</span>
          {newRemindersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
              {newRemindersCount}
            </span>
          )}
        </Link>

        <div className="w-px h-6 bg-border mx-1" />

        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto px-3 py-2 hover:bg-accent flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ea2775] flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                  {currentUser.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-foreground hidden md:inline">
                  {currentUser.full_name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{currentUser.full_name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/users')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Users
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/auth/change-password')}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
})

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { currentUser, isProjectLead, isItSupport, isLeadership, newRemindersCount, benchCount, handleLogout, ready } = useDashboard()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleCollapse = useCallback(() => setSidebarCollapsed(prev => !prev), [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#ea2775] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar
        pathname={pathname}
        benchCount={benchCount}
        sidebarCollapsed={sidebarCollapsed}
        isProjectLead={isProjectLead}
        isItSupport={isItSupport}
        isLeadership={isLeadership}
        onToggleCollapse={toggleCollapse}
      />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          pathname={pathname}
          currentUser={currentUser}
          newRemindersCount={newRemindersCount}
          handleLogout={handleLogout}
        />

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </DashboardProvider>
  )
}

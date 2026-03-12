# Orchids Application - Comprehensive Assessment & Improvement Plan

**Date:** 2026-02-11
**Stack:** Next.js 15 (App Router) | React 19 | TypeScript | Supabase | Tailwind CSS v4 | shadcn/ui

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Flickering Issue - Root Cause Analysis](#3-flickering-issue---root-cause-analysis)
4. [Frontend Performance Issues](#4-frontend-performance-issues)
5. [Backend & Data Layer Issues](#5-backend--data-layer-issues)
6. [Security Vulnerabilities](#6-security-vulnerabilities)
7. [Architecture & Code Quality Issues](#7-architecture--code-quality-issues)
8. [State Management Analysis](#8-state-management-analysis)
9. [Improvement Plan](#9-improvement-plan)
10. [Priority Matrix](#10-priority-matrix)
11. [Files Reference](#11-files-reference)

---

## 1. Executive Summary

This is an **enterprise resource management platform** managing employees, projects, clients, assignments, and practices. The application is built on a modern stack but has critical issues across performance, security, and architecture that need to be addressed.

### Overall Scores

| Area | Score | Notes |
|------|-------|-------|
| **Security** | 3/10 | Critical: unauthenticated API endpoint, client-side auth only |
| **Performance** | 5/10 | Works but unoptimized: no pagination, no memoization, full table loads |
| **Code Quality** | 7/10 | Clean and readable, but has duplication and dead code |
| **Scalability** | 4/10 | Won't handle 1000+ concurrent users without pagination |
| **UX** | 6/10 | Good caching strategy, but flickering issue degrades experience |

### Key Findings

- **Flickering** caused by triple-layer authentication waterfall + full-page loading spinner
- **Zero `React.memo`** usage on data components (biggest frontend perf issue)
- **No pagination** - loads entire database tables into memory
- **Critical security flaw** - `/api/users/set-password` has no authentication
- **Dead code** - `AuthContext.tsx` and `NotificationContext.tsx` are created but never used
- **Excellent caching layer** in `useResourceData.ts` (the strongest part of the codebase)

---

## 2. Architecture Overview

### Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (Server Component)
│   ├── page.tsx                          # Root redirect → /overview
│   ├── (dashboard)/                      # Route group (shared layout)
│   │   ├── layout.tsx                    # Dashboard layout (Client Component)
│   │   ├── overview/page.tsx             # 11 dashboard pages...
│   │   └── ...
│   ├── auth/                             # Auth pages + OAuth callback
│   ├── api/users/                        # 3 API routes (create, delete, set-password)
│   └── users/page.tsx, roles/page.tsx    # Admin pages
├── components/
│   ├── ui/                               # 55+ shadcn/ui components
│   ├── dashboard/                        # Business views (V1 + V2 duplicates)
│   └── modals/                           # 15 modal dialogs
├── contexts/                             # 3 contexts (1 used, 2 dead code)
├── hooks/                                # 3 custom hooks
└── lib/                                  # Supabase clients, types, utils
```

### Data Flow

```
Browser → Middleware (auth check + DB query)
       → Server Component (root layout)
       → Client Component (dashboard layout)
         → DashboardContext (auth check AGAIN + DB query AGAIN)
           → useResourceData hooks (8 parallel Supabase queries)
             → Components render
```

### Key Dependencies

| Dependency | Version | Size | Notes |
|-----------|---------|------|-------|
| next | ^15.5.7 | - | App Router |
| react | 19.2.0 | - | Latest |
| @supabase/supabase-js | ^2.87.3 | - | Backend |
| tailwindcss | ^4 | - | Latest (v4) |
| framer-motion | ^12.23.24 | ~70kb | Used only in carousel |
| recharts | ^2.15.4 | ~150kb | Charts |
| date-fns | ^4.1.0 | tree-shakeable | Date utilities |

---

## 3. Flickering Issue - Root Cause Analysis

### The Problem

When accessing any dashboard page, users see the page load, then a spinner, then the page loads again. This is caused by a **triple-layer authentication waterfall**.

### The Sequence

```
Step 1: MIDDLEWARE (server-side)
        ├── Calls supabase.auth.getUser()          ← DB query #1
        ├── Queries users table                     ← DB query #2
        └── Allows request through

Step 2: ROOT PAGE (app/page.tsx)
        └── Server-side redirect('/overview')       ← FLASH #1

Step 3: DASHBOARD LAYOUT MOUNTS (client-side)
        ├── DashboardProvider useEffect fires
        ├── ready = false → FULL-PAGE SPINNER       ← FLASH #2
        ├── Calls supabase.auth.getUser() AGAIN     ← DB query #3 (redundant!)
        ├── Queries users table AGAIN               ← DB query #4 (redundant!)
        ├── Calls prefetchCoreData() (8 queries)    ← DB queries #5-12
        ├── If project_lead → router.replace()      ← FLASH #3
        └── Sets ready = true → renders content     ← FLASH #4
```

### Root Cause Files

| File | Line(s) | Issue |
|------|---------|-------|
| `src/contexts/DashboardContext.tsx` | 38 | Re-checks auth client-side (redundant with middleware) |
| `src/contexts/DashboardContext.tsx` | 46-50 | Re-queries users table (redundant with middleware) |
| `src/app/(dashboard)/layout.tsx` | 300-309 | Full-page spinner while `ready === false` |
| `src/contexts/DashboardContext.tsx` | 58-59 | Client-side redirect for project_leads |
| `src/app/page.tsx` | 1-5 | Server redirect creates additional flash |
| `src/app/(dashboard)/loading.tsx` | DELETED | No Suspense fallback during navigation |

### Fix Strategy

1. Move auth + user data fetch to a **server-side layout** component
2. Pass `userData` as a prop to client layout (eliminates redundant client auth)
3. Handle role-based redirects in **middleware** (not client-side)
4. Replace full-page spinner with **skeleton loaders** that match page structure
5. Restore `loading.tsx` with proper skeleton UI

---

## 4. Frontend Performance Issues

### 4.1 Missing Component Memoization (HIGH)

**Zero components use `React.memo`** (except Sidebar and Header in layout).

| Component | Lines | Impact |
|-----------|-------|--------|
| `EmployeesViewV2.tsx` | 773 | Re-renders 100+ employee rows on any state change |
| `EmployeesView.tsx` | 743 | Same issue |
| `ProjectsView.tsx` | 303 | Project tables re-render unnecessarily |
| `AssignmentsView.tsx` | 348 | Full assignment table re-renders |
| `OverviewDashboard.tsx` | 568 | Dashboard re-renders on filter changes |
| `ClientsView.tsx` | ~300 | Client tables re-render |

**Fix:** Extract row components and wrap with `React.memo`:
```tsx
const EmployeeRow = React.memo(function EmployeeRow({ employee, onEdit, onDelete }) {
  return <TableRow>...</TableRow>
})
```

### 4.2 Inline Functions in JSX (HIGH)

Every table row creates new function closures on every render:

```tsx
// CURRENT (bad) - creates new function per render per row
{projects.map((projectName) => (
  <Badge onClick={() => handleClick(assignment)}>
    {projectName}
  </Badge>
))}
```

**Fix:** Use `useCallback` and extract handlers:
```tsx
const handleBadgeClick = useCallback((assignment) => {
  setAssignmentModal({ open: true, assignment })
}, [])
```

### 4.3 Missing `useCallback` (HIGH)

Only 3 files use `useCallback` (out of ~40 that need it). All modal open/close handlers, CRUD operations, and event handlers in page components create new functions every render.

**Affected files:**
- All `src/app/(dashboard)/*/page.tsx` files
- All `src/components/dashboard/*View*.tsx` files

### 4.4 No Virtual Scrolling (MEDIUM)

Tables render ALL rows in the DOM simultaneously. With 100+ employees or assignments, this creates significant DOM pressure.

**Fix:** Use `@tanstack/react-virtual` for tables with 50+ rows.

### 4.5 No Lazy Loading for Modals (MEDIUM)

15 modal components are bundled upfront even though they're rarely opened:

```
EmployeeModal, ClientModal, ProjectModal, AssignmentModal,
RoleModal, PracticeModal, SquadModal, ReminderModal,
UserModal, SetPasswordModal, EmployeeUpdateModal,
ProjectHistoryModal, ProjectStatusDetailModal,
ClientModalV2, ProjectModalV2
```

**Fix:**
```tsx
const EmployeeModal = dynamic(() => import('@/components/modals/EmployeeModal'), { ssr: false })
```

### 4.6 Monolithic Components (MEDIUM)

Several components exceed 700 lines with no sub-component extraction:

| Component | Lines | Should Split Into |
|-----------|-------|-------------------|
| `EmployeesViewV2.tsx` | 773 | EmployeeFilters, EmployeeStats, EmployeeRow, EmployeeGroupRow |
| `EmployeesView.tsx` | 743 | Same as above |
| `OverviewDashboard.tsx` | 568 | StatCards, ProjectsTable, AllocationChart |
| `ProjectModal.tsx` | 474 | ProjectForm, StakeholdersSection |

### 4.7 Heavy Unused Dependencies (LOW)

| Dependency | Size | Usage | Recommendation |
|-----------|------|-------|----------------|
| `framer-motion` | ~70kb | Only `carousel.tsx` | Replace with CSS animations |
| `recharts` | ~150kb | CEO dashboard only | Lazy load or use lighter lib |

### 4.8 No Code Splitting (LOW)

All dashboard views are loaded upfront. Dynamic imports for route-level code splitting would reduce initial bundle.

---

## 5. Backend & Data Layer Issues

### 5.1 No Pagination (HIGH)

Every query loads the **entire table**:

```typescript
// CURRENT - loads ALL employees with full joins
const { data } = await supabase
  .from('employees')
  .select('*, role_data:roles(*), practice:practices(*), squad:squads!employees_squad_id_fkey(*)')
  .order('full_name')
```

`prefetchCoreData()` fires **8 full table queries** on every dashboard load:
- practices, squads, clients, roles, employees, projects, assignments, reminders

**Impact:** 500KB+ payloads on initial load. Will degrade significantly as data grows.

**Fix:**
```typescript
const { data, count } = await supabase
  .from('employees')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('full_name')
```

### 5.2 Client-Side Sorting/Filtering (MEDIUM)

RAG statuses are sorted in JavaScript instead of SQL:

```typescript
// CURRENT (useResourceData.ts:74) - fetches ALL statuses, sorts in JS
return data.map((p) => ({
  ...p,
  latest_rag_status: p.project_rag_status?.length > 0
    ? p.project_rag_status.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : undefined
}))
```

**Fix:** Use Supabase `order` and `limit` in nested select.

### 5.3 Inefficient Aggregation (MEDIUM)

`useAllEmployeeUpdates` fetches ALL employee updates and aggregates in JavaScript:

```typescript
// CURRENT (useEmployeeUpdates.ts:74-103)
const { data } = await supabase
  .from('employee_updates')
  .select('employee_id, created_at, update_text, created_by')
  .order('created_at', { ascending: false })

// Then manually groups in JS...
data.forEach(update => { stats.set(update.employee_id, ...) })
```

**Fix:** Use SQL aggregation or create a database view.

### 5.4 Middleware DB Queries on Every Request (MEDIUM)

`middleware.ts` makes **2 database queries** on every page navigation:

1. `supabase.auth.getUser()` — validates JWT
2. `supabase.from('users').select('id').eq('id', user.id).single()` — checks users table

**Impact:** Adds 50-100ms to every page load.

**Fix:** Cache user role in JWT claims or session cookie (set during login).

### 5.5 Cache Has No Eviction Policy (LOW)

The in-memory cache in `useResourceData.ts` grows indefinitely:
- No maximum size
- No LRU eviction
- Never cleared on navigation
- Only cleared on logout (`resetPrefetch()`)

### 5.6 No Cross-Resource Cache Invalidation (LOW)

Creating an assignment doesn't invalidate the employees cache. Updating a project doesn't invalidate the assignments cache. This can lead to stale data being displayed.

---

## 6. Security Vulnerabilities

### 6.1 CRITICAL: Unauthenticated Password Reset API

**File:** `src/app/api/users/set-password/route.ts`

```typescript
// NO AUTHENTICATION CHECK!
export async function POST(request: Request) {
  const { userId, newPassword } = await request.json()
  // Uses service role key to reset ANY user's password
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
}
```

**Impact:** Anyone who knows the API URL can change any user's password.

**Fix:** Add authentication and authorization checks:
```typescript
export async function POST(request: Request) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'leadership'].includes(currentUser?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... proceed with password reset
}
```

### 6.2 HIGH: Client-Side Authorization Only

All role checks happen in React components (easily bypassed):

```typescript
// Can be bypassed by modifying React state in DevTools
if (data.role !== 'admin') {
  toast.error('Access denied')
  router.push('/')
}
```

**Fix:** Enforce authorization server-side via API route checks and middleware.

### 6.3 HIGH: Weak Password Policy

Minimum password length is 6 characters (`api/users/create/route.ts:43`).

**Fix:** Require 12+ characters with complexity rules.

### 6.4 MEDIUM: Wildcard Image Domains

```typescript
// next.config.ts
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**' }]
}
```

**Fix:** Restrict to actual domains used (e.g., `*.supabase.co`).

### 6.5 MEDIUM: TypeScript/ESLint Errors Ignored

```typescript
// next.config.ts
typescript: { ignoreBuildErrors: true }
eslint: { ignoreDuringBuilds: true }
```

Type errors and lint violations ship to production silently.

---

## 7. Architecture & Code Quality Issues

### 7.1 Dual V1/V2 Components

The codebase maintains **two versions** of most views:

| V1 | V2 | Combined Lines |
|----|-----|---------------|
| `DashboardView.tsx` | `DashboardViewV2.tsx` | ~1100 |
| `OverviewDashboard.tsx` | `OverviewDashboardV2.tsx` | ~1100 |
| `ClientsView.tsx` | `ClientsViewV2.tsx` | ~600 |
| `ProjectsView.tsx` | `ProjectsViewV2.tsx` | ~600 |
| `EmployeesView.tsx` | `EmployeesViewV2.tsx` | ~1500 |
| `PracticesView.tsx` | `PracticesViewV2.tsx` | ~600 |
| `RagUpdatesView.tsx` | `RagUpdatesViewV2.tsx` | ~600 |
| `ClientModal.tsx` | `ClientModalV2.tsx` | ~300 |
| `ProjectModal.tsx` | `ProjectModalV2.tsx` | ~900 |

**Impact:** ~7000+ lines of duplicate code, doubles bundle size.

**Fix:** Commit to V2, remove V1 completely.

### 7.2 Dead Code - Unused Contexts

| File | Lines | Status |
|------|-------|--------|
| `src/contexts/AuthContext.tsx` | 92 | Created but NEVER imported/mounted |
| `src/contexts/NotificationContext.tsx` | 77 | Created but NEVER imported/mounted |

Both duplicate functionality already in `DashboardContext.tsx`.

**Fix:** Delete both files.

### 7.3 No Error Boundaries

No `error.tsx` files exist. Unhandled errors crash the entire route with no recovery UI.

**Fix:** Add `src/app/(dashboard)/error.tsx`:
```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### 7.4 No Loading States for Navigation

`loading.tsx` was deleted. When navigating between dashboard pages, there's no visual feedback.

**Fix:** Add `src/app/(dashboard)/loading.tsx` with skeleton UI matching the page structure.

### 7.5 All Dashboard Pages Are Client Components

Every page uses `'use client'`, meaning zero SSR data fetching for dashboard content. All data loads client-side after hydration.

**Opportunity:** Convert pages to server components that pass initial data to client subcomponents.

---

## 8. State Management Analysis

### Current Architecture

```
DashboardContext (used everywhere)
├── currentUser: User | null
├── isProjectLead: boolean
├── isLeadership: boolean
├── newRemindersCount: number
├── benchCount: number
├── ready: boolean
└── handleLogout: () => Promise<void>

AuthContext (DEAD CODE - never mounted)
├── currentUser: User | null  ← duplicates DashboardContext
├── isProjectLead: boolean    ← duplicates DashboardContext
└── isLeadership: boolean     ← duplicates DashboardContext

NotificationContext (DEAD CODE - never mounted)
├── newRemindersCount: number ← duplicates DashboardContext
└── benchCount: number        ← duplicates DashboardContext
```

### Redundant Data Fetching

| Data | DashboardContext | NotificationContext | Times Fetched |
|------|-----------------|--------------------:|:-------------:|
| Auth user | `getUser()` | - | 2x (middleware + context) |
| Users table | `.from('users').select('*')` | - | 2x (middleware + context) |
| Bench count | Complex assignments query | Same query | Could be 2x if both mounted |
| Reminders count | `.from('reminders').select(...)` | Same query | Could be 2x if both mounted |

### Issues

1. **DashboardContext mixes concerns:** auth + notifications + data prefetching + routing
2. **Volatile state (counts) triggers stable component re-renders** (Sidebar/Header)
3. **No way to refresh notification counts** without full re-initialization
4. **Cache in `useResourceData.ts` never invalidates related resources** on mutations

### Recommended Architecture

```
Server Layout (auth + user data)
└── AuthContext (stable: currentUser, roles, logout)
    └── NotificationContext (volatile: counts, refreshCounts)
        └── Dashboard UI
```

---

## 9. Improvement Plan

### Phase 1: Fix Flickering (Immediate - 2-3 days)

#### 1.1 Move auth to server-side dashboard layout

Convert `src/app/(dashboard)/layout.tsx` to a **server component** that:
- Fetches user data using server Supabase client
- Redirects project_leads server-side
- Passes `userData` as prop to client layout

```tsx
// NEW: app/(dashboard)/layout.tsx (SERVER)
export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (userData?.role === 'project_lead') redirect('/rag-updates')

  return (
    <DashboardClientLayout initialUser={userData}>
      {children}
    </DashboardClientLayout>
  )
}
```

#### 1.2 Simplify DashboardContext

Remove auth logic — receive user as prop instead:

```tsx
// SIMPLIFIED DashboardContext
export function DashboardProvider({ initialUser, children }) {
  const [currentUser] = useState(initialUser)
  // Only manages notification counts + data prefetch
  // No auth checks, no redirects
}
```

#### 1.3 Handle root redirect in middleware

```typescript
// middleware.ts - add:
if (user && request.nextUrl.pathname === '/') {
  return NextResponse.redirect(new URL('/overview', request.url))
}
```

#### 1.4 Restore loading.tsx with skeleton UI

```tsx
// src/app/(dashboard)/loading.tsx
export default function Loading() {
  return <DashboardSkeleton /> // Matches sidebar + header + content structure
}
```

#### 1.5 Add error boundary

```tsx
// src/app/(dashboard)/error.tsx
'use client'
export default function Error({ error, reset }) {
  return <ErrorUI error={error} onRetry={reset} />
}
```

---

### Phase 2: Performance Optimization (1-2 weeks)

#### 2.1 Memoize table row components

For every `*View.tsx` and `*ViewV2.tsx`:
- Extract row components
- Wrap with `React.memo`
- Add `useCallback` for all event handlers

#### 2.2 Add pagination to data fetching

Modify `useResourceData.ts` hooks to accept pagination:

```typescript
function useResource<T>(key: string, fetchFn: (opts: PaginationOpts) => Promise<PaginatedResult<T>>) {
  // Support page, limit, total count
}
```

Priority tables for pagination:
1. `employees` (most rows)
2. `assignments` (most joins)
3. `projects`
4. `reminders`

#### 2.3 Lazy load modals

```tsx
const EmployeeModal = dynamic(() => import('@/components/modals/EmployeeModal'), { ssr: false })
```

Apply to all 15 modal components.

#### 2.4 Add virtual scrolling

Install `@tanstack/react-virtual` and apply to:
- Employees table
- Assignments table
- Any table with 50+ potential rows

#### 2.5 Optimize middleware

Cache user role in JWT metadata during login to avoid querying users table on every request:

```typescript
// During login/OAuth callback:
await supabase.auth.admin.updateUserById(user.id, {
  user_metadata: { role: userData.role }
})

// In middleware:
const role = user?.user_metadata?.role  // No DB query needed
```

---

### Phase 3: Architecture Cleanup (1-2 weeks)

#### 3.1 Remove V1 components

Delete all V1 view components and their toggle logic:
- `DashboardView.tsx`, `OverviewDashboard.tsx`, `ClientsView.tsx`
- `ProjectsView.tsx`, `EmployeesView.tsx`, `PracticesView.tsx`
- `RagUpdatesView.tsx`, `ClientModal.tsx`, `ProjectModal.tsx`

Expected reduction: **~4000+ lines of dead code removed**.

#### 3.2 Delete unused contexts

- Delete `src/contexts/AuthContext.tsx`
- Delete `src/contexts/NotificationContext.tsx`

#### 3.3 Enable TypeScript/ESLint checking

Remove from `next.config.ts`:
```typescript
// DELETE THESE:
typescript: { ignoreBuildErrors: true }
eslint: { ignoreDuringBuilds: true }
```

Fix all resulting type and lint errors.

#### 3.4 Split monolithic components

| Component | Split Into |
|-----------|-----------|
| `EmployeesViewV2.tsx` (773 lines) | `EmployeeFilters`, `EmployeeStats`, `EmployeeRow`, `EmployeeGroupHeader` |
| `OverviewDashboard.tsx` (568 lines) | `StatCards`, `ProjectsOverview`, `AllocationSummary` |
| `ProjectModal.tsx` (474 lines) | `ProjectForm`, `StakeholdersSection` |

#### 3.5 Add cross-resource cache invalidation

```typescript
const createAssignment = useCallback(async (input) => {
  const { data, error } = await supabase.from('assignments').insert(input)
  if (!error) {
    // Update assignments cache
    setCache('assignments', [...assignments, data])
    // Invalidate related caches
    invalidateCache('employees')  // Allocation changed
    invalidateCache('projects')   // Staffing changed
  }
}, [])
```

#### 3.6 Consider migrating to SWR or React Query

The custom cache in `useResourceData.ts` is well-built but reinvents the wheel. Migrating to `swr` or `@tanstack/react-query` would provide:
- Automatic garbage collection / LRU eviction
- Window focus revalidation
- Built-in optimistic mutations API
- DevTools for debugging
- Community-maintained, battle-tested

---

### Phase 4: Security Hardening (Parallel track)

#### 4.1 Fix set-password endpoint (IMMEDIATE)

Add authentication + authorization to `src/app/api/users/set-password/route.ts`.

#### 4.2 Server-side authorization

Move all role checks from client components to:
- API routes (for mutations)
- Middleware (for page access)

#### 4.3 Restrict image domains

```typescript
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },
    // Add other specific domains as needed
  ]
}
```

#### 4.4 Strengthen password policy

```typescript
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) return { valid: false, error: 'Min 12 characters' }
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Needs lowercase' }
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Needs uppercase' }
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Needs number' }
  if (!/[!@#$%^&*]/.test(password)) return { valid: false, error: 'Needs special char' }
  return { valid: true }
}
```

---

## 10. Priority Matrix

| Priority | Task | Impact | Effort | Phase |
|----------|------|--------|--------|-------|
| **P0** | Fix `/api/users/set-password` auth | Critical (security) | Low (1 hour) | 4 |
| **P0** | Fix flickering (server-side layout + simplified context) | Very High (UX) | Medium (2-3 days) | 1 |
| **P1** | Enable Supabase RLS | High (security) | Medium (2-3 days) | 4 |
| **P1** | Add pagination to data fetching | High (perf) | Medium (3-5 days) | 2 |
| **P1** | Memoize components + useCallback | High (perf) | Medium (2-3 days) | 2 |
| **P1** | Add error boundary + loading.tsx | High (UX) | Low (2 hours) | 1 |
| **P2** | Remove V1 components | Medium (maintenance) | Low (1 day) | 3 |
| **P2** | Delete dead contexts | Medium (clarity) | Low (30 min) | 3 |
| **P2** | Enable TS/ESLint checks | Medium (quality) | High (3-5 days) | 3 |
| **P2** | Lazy load modals | Medium (perf) | Low (1 day) | 2 |
| **P2** | Add database indexes | Medium (perf) | Low (1 hour) | 4 |
| **P2** | Restrict image domains | Medium (security) | Low (10 min) | 4 |
| **P3** | Migrate to SWR/React Query | Medium (architecture) | High (1-2 weeks) | 3 |
| **P3** | Virtual scrolling for tables | Medium (perf) | Medium (2-3 days) | 2 |
| **P3** | Split monolithic components | Low (maintenance) | Medium (3-5 days) | 3 |
| **P3** | Code splitting / dynamic imports | Low (perf) | Medium (1-2 days) | 2 |
| **P3** | Remove framer-motion | Low (bundle size) | Low (1 hour) | 3 |

---

## 11. Files Reference

### Critical Files (Must Modify)

| File | Lines | Why |
|------|-------|-----|
| `src/app/(dashboard)/layout.tsx` | 345 | Convert to server component + client wrapper |
| `src/contexts/DashboardContext.tsx` | 132 | Remove auth logic, accept user as prop |
| `src/middleware.ts` | 67 | Add root redirect, optimize user query |
| `src/hooks/useResourceData.ts` | 730 | Add pagination, cross-cache invalidation |
| `src/app/api/users/set-password/route.ts` | 21 | Add authentication/authorization |
| `next.config.ts` | 37 | Fix TS/ESLint/image settings |

### Files to Delete

| File | Lines | Reason |
|------|-------|--------|
| `src/contexts/AuthContext.tsx` | 92 | Never used (dead code) |
| `src/contexts/NotificationContext.tsx` | 77 | Never used (dead code) |
| `src/components/dashboard/DashboardView.tsx` | ~500 | V1 duplicate |
| `src/components/dashboard/OverviewDashboard.tsx` | ~500 | V1 duplicate |
| `src/components/dashboard/ClientsView.tsx` | ~300 | V1 duplicate |
| `src/components/dashboard/ProjectsView.tsx` | ~300 | V1 duplicate |
| `src/components/dashboard/EmployeesView.tsx` | 743 | V1 duplicate |
| `src/components/dashboard/PracticesView.tsx` | ~300 | V1 duplicate |
| `src/components/dashboard/RagUpdatesView.tsx` | ~300 | V1 duplicate |
| `src/components/modals/ClientModal.tsx` | ~150 | V1 duplicate |
| `src/components/modals/ProjectModal.tsx` | 474 | V1 duplicate |
| `debug.log` | 91 | Should not be tracked |

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/loading.tsx` | Skeleton UI during navigation |
| `src/app/(dashboard)/error.tsx` | Error boundary with retry |

### Hooks Architecture (Well-Built)

| File | Lines | Quality | Notes |
|------|-------|---------|-------|
| `src/hooks/useResourceData.ts` | 730 | Excellent | Caching, dedup, stale-while-revalidate |
| `src/hooks/useEmployeeUpdates.ts` | 111 | Good | Needs caching integration |
| `src/hooks/use-mobile.ts` | 20 | OK | Minor hydration mismatch risk |

---

*Generated by comprehensive codebase analysis on 2026-02-11*

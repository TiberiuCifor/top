# Tecknoworks Operational Platform - Improvement Plan

## CRITICAL SECURITY ISSUES (Fix Immediately)

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| SEC-001 | **No authorization on admin API routes** - Any authenticated user can create/delete users | `src/app/api/users/create/route.ts`, `delete/route.ts`, `set-password/route.ts` | Add admin role check before processing requests |
| SEC-002 | **No Row Level Security (RLS)** - All data accessible to any authenticated user | Supabase Database | Enable RLS on all tables with appropriate policies |
| SEC-003 | **No input validation** - SQL injection and XSS possible | All API routes | Add Zod validation schemas for all inputs |
| SEC-004 | **Weak password policy** - Only 6 characters required | `api/users/create/route.ts:12` | Require 12+ chars, uppercase, lowercase, number, special char |
| SEC-005 | **No rate limiting** - Brute force attacks possible | All auth & API endpoints | Implement Upstash Redis rate limiting |
| SEC-006 | **No CSRF protection** | All mutation endpoints | Add CSRF tokens or use Server Actions |
| SEC-007 | **No security headers** - XSS/clickjacking possible | `next.config.ts` | Add CSP, X-Frame-Options, X-Content-Type-Options headers |

## MEDIUM SECURITY ISSUES

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| SEC-008 | **Overly permissive image config** - `hostname: '**'` allows any domain | `next.config.ts:9-17` | Whitelist only trusted domains |
| SEC-009 | **Middleware doesn't verify roles** for admin routes | `src/middleware.ts` | Add role-based route protection |
| SEC-010 | **Console.error in production** exposes sensitive info | `src/hooks/useResourceData.ts` | Use proper logging service, disable in prod |
| SEC-011 | **No audit logging** - No traceability for actions | All CRUD operations | Create audit_logs table, log all mutations |
| SEC-012 | **All data loaded to client** - Visible in DevTools | `src/app/page.tsx` | Fetch only needed data, use server components |

## CRITICAL PERFORMANCE ISSUES

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| PERF-001 | **All pages are client components** - No SSR | `src/app/page.tsx`, all pages | Convert to Server Components with client islands |
| PERF-002 | **No data caching** - Refetches on every render | `src/hooks/useResourceData.ts` | Use React Query/SWR with staleTime |
| PERF-003 | **No pagination** - Fetches all records | All data hooks | Add `.range()` pagination to queries |
| PERF-004 | **No database indexes** | Supabase Database | Add indexes on foreign keys, status, dates |

## MEDIUM PERFORMANCE ISSUES

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| PERF-005 | **No loading.tsx files** - No loading states | `src/app/` | Create loading.tsx for each route |
| PERF-006 | **No memoization** - Unnecessary re-renders | `src/app/page.tsx` | Use `useMemo` and `useCallback` for computed values |
| PERF-007 | **No code splitting** - All views loaded upfront | `src/app/page.tsx` | Use `dynamic()` imports for view components |
| PERF-008 | **No optimistic updates** - Waits for server | All mutations | Update UI immediately, rollback on error |
| PERF-009 | **Sequential data fetching** | `useResourceData.ts` | Use `Promise.all()` for parallel fetches |

## ENGINEERING BEST PRACTICES

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| ENG-001 | **No error boundaries** - Crashes break entire app | `src/app/` | Add `error.tsx` files for graceful error handling |
| ENG-002 | **No tests** - Zero test coverage | Project-wide | Add Jest/Vitest with React Testing Library |
| ENG-003 | **TypeScript `any` types used** | Multiple files | Replace with proper types |
| ENG-004 | **No API response types** | API routes | Define and enforce response schemas |
| ENG-005 | **Duplicate Supabase client logic** | `src/lib/supabase.ts` + `src/lib/supabase/` | Consolidate into single source |
| ENG-006 | **God component** - 500+ lines, handles everything | `src/app/page.tsx` | Split into smaller, focused components |
| ENG-007 | **No environment validation** | Startup | Use Zod to validate env vars at build time |
| ENG-008 | **No proper error messages** - Generic toasts only | All handlers | Return specific, actionable error messages |

## DATABASE ISSUES

| ID | Issue | Location | Recommendation |
|----|-------|----------|----------------|
| DB-001 | **No indexes on foreign keys** | All tables | `CREATE INDEX` on all `_id` columns |
| DB-002 | **No indexes on filtered columns** | `status`, `date` columns | Add indexes for commonly filtered fields |
| DB-003 | **No soft deletes** - Data permanently lost | All tables | Add `deleted_at` column, filter in queries |
| DB-004 | **No created_by/updated_by tracking** | All tables | Add audit columns to all tables |

---

## Quick Wins (Fix in < 1 day)

1. Add security headers to `next.config.ts`
2. Add admin role check to API routes
3. Strengthen password validation
4. Add database indexes
5. Create `loading.tsx` and `error.tsx` files
6. Restrict image domains

---

## Implementation Priority

### Week 1: Critical Security
- [ ] SEC-001: Add admin authorization to user management API routes
- [ ] SEC-002: Enable RLS on all Supabase tables
- [ ] SEC-003: Add Zod input validation
- [ ] SEC-004: Strengthen password requirements
- [ ] SEC-005: Implement rate limiting
- [ ] SEC-006: Add CSRF protection
- [ ] SEC-007: Add security headers

### Week 2: Critical Performance
- [ ] PERF-001: Convert to Server Components where possible
- [ ] PERF-002: Implement React Query/SWR for caching
- [ ] PERF-003: Add pagination to data fetching
- [ ] PERF-004: Add database indexes

### Week 3: Database & Remaining Security
- [ ] DB-001: Add foreign key indexes
- [ ] DB-002: Add indexes on filtered columns
- [ ] DB-003: Implement soft deletes
- [ ] DB-004: Add audit columns
- [ ] SEC-008 through SEC-012

### Week 4: Engineering Practices
- [ ] ENG-001: Add error boundaries
- [ ] ENG-002: Set up testing framework
- [ ] ENG-003: Fix TypeScript types
- [ ] ENG-004: Define API response schemas
- [ ] ENG-005: Consolidate Supabase clients
- [ ] ENG-006: Refactor god component
- [ ] ENG-007: Add environment validation
- [ ] ENG-008: Improve error messages

---

## Detailed Implementation Guide

### SEC-001: Admin Authorization

```typescript
// src/app/api/users/create/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (userData?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // ... rest of the logic
}
```

### SEC-007: Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
]

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

### PERF-004: Database Indexes

```sql
-- Run in Supabase SQL Editor
CREATE INDEX idx_assignments_employee_id ON assignments(employee_id);
CREATE INDEX idx_assignments_project_id ON assignments(project_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_employees_role_id ON employees(role_id);
CREATE INDEX idx_employees_practice_id ON employees(practice_id);
CREATE INDEX idx_employees_squad_id ON employees(squad_id);
CREATE INDEX idx_squads_practice_id ON squads(practice_id);
CREATE INDEX idx_reminders_owner_id ON reminders(owner_id);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_assignments_start_date ON assignments(start_date);
CREATE INDEX idx_assignments_end_date ON assignments(end_date);
```

---

## Success Metrics

| Category | Current | Target |
|----------|---------|--------|
| Security Score | Low | High |
| Lighthouse Performance | ~60 | 90+ |
| Time to First Byte | >1s | <200ms |
| Test Coverage | 0% | 80%+ |
| TypeScript Errors | Multiple | 0 |

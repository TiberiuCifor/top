import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200,
      async json() { return this._body },
    }),
  },
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockSupabaseFrom = vi.fn((table: string) => {
  if (table === 'employees') {
    return {
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'uuid-1', bamboo_id: '101' },
          { id: 'uuid-2', bamboo_id: '102' },
        ],
        error: null,
      }),
    }
  }
  return { upsert: mockUpsert }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockSupabaseFrom })),
}))

// ── fetch mock helpers ────────────────────────────────────────────────────────

function makeBambooReportsResponse(employees: Array<Record<string, string>>) {
  return { ok: true, json: async () => ({ employees }) }
}

function makeJsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 404, text: async () => String(body), json: async () => body }
}

import { POST } from '@/app/api/trainings-certs/sync/route'

beforeEach(() => {
  process.env.BAMBOO_API_KEY = 'bamboo-key'
  process.env.BAMBOO_SUBDOMAIN = 'testco'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.KNOWBE4_API_TOKEN = 'kb4-token'
  vi.clearAllMocks()
  mockUpsert.mockResolvedValue({ error: null })
})

describe('POST /api/trainings-certs/sync', () => {
  it('returns success with synced employee count', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/reports/custom')) {
        // training report + email report
        return makeJsonResponse(makeBambooReportsResponse([
          { id: '101', workEmail: 'a@example.com' },
          { id: '102', workEmail: 'b@example.com' },
        ]))
      }
      if (url.includes('/training/enrollments')) {
        return makeJsonResponse([])
      }
      // certs + goals per employee
      if (url.includes('/tables/employeeCertifications')) return makeJsonResponse([])
      if (url.includes('/performance/employees')) return makeJsonResponse([])
      return makeJsonResponse({})
    }))

    const res = await POST() as { status: number; json: () => Promise<{ success: boolean; synced: number }> }
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.synced).toBe(2)
  })

  it('upserts rows with correct shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/reports/custom') && url.includes('format=json')) {
        return makeJsonResponse({ employees: [
          { id: '101', '4575': '2024-01-15', workEmail: 'alice@example.com' },
        ]})
      }
      if (url.includes('/training/enrollments')) return makeJsonResponse([{ user: { email: 'alice@example.com' } }])
      if (url.includes('/tables/employeeCertifications')) return makeJsonResponse([{}, {}]) // 2 certs
      if (url.includes('/performance/employees')) return makeJsonResponse([{}]) // 1 goal
      return makeJsonResponse({})
    }))

    await POST()

    expect(mockUpsert).toHaveBeenCalledOnce()
    const [rows] = mockUpsert.mock.calls[0]
    expect(rows).toBeInstanceOf(Array)
    expect(rows[0]).toMatchObject({
      employee_id: expect.any(String),
      trainings: expect.any(Number),
      certifications: expect.any(Number),
      goals: expect.any(Number),
      company_trainings: expect.any(Number),
      last_synced_at: expect.any(String),
    })
  })

  it('sets company_trainings to 0 when KNOWBE4_API_TOKEN is missing', async () => {
    delete process.env.KNOWBE4_API_TOKEN

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/reports/custom')) return makeJsonResponse({ employees: [{ id: '101' }, { id: '102' }] })
      if (url.includes('/tables/employeeCertifications')) return makeJsonResponse([])
      if (url.includes('/performance/employees')) return makeJsonResponse([])
      return makeJsonResponse({})
    }))

    const res = await POST() as { json: () => Promise<{ success: boolean }> }
    const body = await res.json()
    expect(body.success).toBe(true)

    const [rows] = mockUpsert.mock.calls[0]
    for (const row of rows) {
      expect(row.company_trainings).toBe(0)
    }
  })

  it('returns 500 when Supabase upsert fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/reports/custom')) return makeJsonResponse({ employees: [] })
      if (url.includes('/training/enrollments')) return makeJsonResponse([])
      return makeJsonResponse({})
    }))

    mockUpsert.mockResolvedValue({ error: new Error('constraint violation') })

    const res = await POST() as { status: number; json: () => Promise<{ error: string }> }
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })
})

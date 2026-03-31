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

// ── Supabase mock setup ───────────────────────────────────────────────────────

const mockOrderFn = vi.fn()
const mockChain = {
  select: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: mockOrderFn,
}
const mockFrom = vi.fn().mockReturnValue(mockChain)

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET } from '@/app/api/trainings-certs/stats/route'

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  vi.clearAllMocks()
  mockChain.select.mockReturnThis()
  mockChain.not.mockReturnThis()
  mockChain.eq.mockReturnThis()
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/trainings-certs/stats', () => {
  it('returns employees with null stats when employee_training_stats table is empty', async () => {
    mockOrderFn.mockResolvedValue({
      data: [
        { id: 'e1', full_name: 'Alice Smith', bamboo_id: '1', photo_url: null, contract_type: 'FTE', practice_id: 'p1', practice: { id: 'p1', name: 'Engineering' }, stats: [] },
      ],
      error: null,
    })

    const res = await GET() as { json: () => Promise<{ employees: Array<{ trainings: null }>, last_synced_at: null }> }
    const body = await res.json()
    expect(body.employees).toHaveLength(1)
    expect(body.employees[0].trainings).toBeNull()
    expect(body.last_synced_at).toBeNull()
  })

  it('maps stats and practice arrays to flat fields', async () => {
    mockOrderFn.mockResolvedValue({
      data: [
        {
          id: 'e1', full_name: 'Bob Jones', bamboo_id: '2', photo_url: 'https://img', contract_type: 'Contractor', practice_id: 'p2',
          practice: [{ id: 'p2', name: 'Design' }],
          stats: [{ trainings: 3, certifications: 1, goals: 2, company_trainings: 5, last_synced_at: '2024-06-01T00:00:00Z' }],
        },
      ],
      error: null,
    })

    const res = await GET() as { json: () => Promise<{ employees: Array<Record<string, unknown>>, last_synced_at: string }> }
    const body = await res.json()
    const emp = body.employees[0]
    expect(emp.practice_name).toBe('Design')
    expect(emp.trainings).toBe(3)
    expect(emp.certifications).toBe(1)
    expect(emp.goals).toBe(2)
    expect(emp.company_trainings).toBe(5)
    expect(body.last_synced_at).toBe('2024-06-01T00:00:00Z')
  })

  it('returns last_synced_at as the most recent timestamp across all employees', async () => {
    mockOrderFn.mockResolvedValue({
      data: [
        { id: 'e1', full_name: 'A', bamboo_id: '1', photo_url: null, contract_type: null, practice_id: null, practice: null,
          stats: [{ trainings: 1, certifications: 0, goals: 0, company_trainings: 0, last_synced_at: '2024-01-01T00:00:00Z' }] },
        { id: 'e2', full_name: 'B', bamboo_id: '2', photo_url: null, contract_type: null, practice_id: null, practice: null,
          stats: [{ trainings: 2, certifications: 0, goals: 0, company_trainings: 0, last_synced_at: '2024-06-15T00:00:00Z' }] },
      ],
      error: null,
    })

    const res = await GET() as { json: () => Promise<{ last_synced_at: string }> }
    const body = await res.json()
    expect(body.last_synced_at).toBe('2024-06-15T00:00:00Z')
  })

  it('returns 500 when Supabase returns an error', async () => {
    mockOrderFn.mockResolvedValue({ data: null, error: new Error('DB connection failed') })

    const res = await GET() as { status: number; json: () => Promise<{ error: string }> }
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('DB connection failed')
  })
})

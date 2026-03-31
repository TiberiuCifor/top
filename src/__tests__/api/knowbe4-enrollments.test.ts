import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server before importing the route
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200,
      async json() { return this._body },
    }),
  },
}))

import { GET } from '@/app/api/knowbe4/enrollments/route'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRequest(bambooId?: string) {
  const url = bambooId
    ? `http://localhost/api/knowbe4/enrollments?bambooId=${bambooId}`
    : 'http://localhost/api/knowbe4/enrollments'
  return new Request(url)
}

function mockFetchSequence(responses: Array<{ ok: boolean; body: unknown }>) {
  let i = 0
  vi.stubGlobal('fetch', vi.fn(async () => {
    const r = responses[i] ?? responses[responses.length - 1]
    i++
    return { ok: r.ok, status: r.ok ? 200 : 404, text: async () => String(r.body), json: async () => r.body }
  }))
}

beforeEach(() => {
  process.env.KNOWBE4_API_TOKEN = 'test-token'
  process.env.BAMBOO_API_KEY = 'bamboo-key'
  process.env.BAMBOO_SUBDOMAIN = 'testco'
  vi.restoreAllMocks()
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/knowbe4/enrollments', () => {
  it('returns 400 when bambooId is missing', async () => {
    const res = await GET(makeRequest()) as { status: number; json: () => Promise<unknown> }
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ error: expect.stringContaining('bambooId') })
  })

  it('returns empty enrollments with a note when employee has no work email', async () => {
    mockFetchSequence([
      { ok: true, body: { workEmail: '' } },   // BambooHR employee
    ])
    const res = await GET(makeRequest('123')) as { status: number; json: () => Promise<{ enrollments: unknown[]; note: string }> }
    const body = await res.json()
    expect(body.enrollments).toEqual([])
    expect(body.note).toBeTruthy()
  })

  it('returns empty enrollments when no KnowBe4 user matches email', async () => {
    mockFetchSequence([
      { ok: true, body: { workEmail: 'jane@example.com' } },  // BambooHR
      { ok: true, body: [] },                                  // KB4 users (no match)
      { ok: true, body: [] },                                  // KB4 campaigns
    ])
    const res = await GET(makeRequest('456')) as { status: number; json: () => Promise<{ enrollments: unknown[]; note: string }> }
    const body = await res.json()
    expect(body.enrollments).toEqual([])
    expect(body.note).toContain('jane@example.com')
  })

  it('computes due_date from campaign end_date', async () => {
    const enrollment = {
      enrollment_id: 1,
      campaign_name: 'Security Basics',
      module_name: 'Phishing 101',
      content_type: 'video',
      status: 'not_started',
      start_date: null,
      completion_date: null,
      enrollment_date: '2024-01-01T00:00:00Z',
      policy_acknowledged: false,
      time_spent: null,
    }
    mockFetchSequence([
      { ok: true, body: { workEmail: 'alice@example.com' } },
      { ok: true, body: [{ id: 99, email: 'alice@example.com' }] },
      { ok: true, body: [{ name: 'Security Basics', end_date: '2024-06-30', relative_duration: null }] },
      { ok: true, body: [enrollment] },
      { ok: true, body: [] }, // next page empty
    ])
    const res = await GET(makeRequest('789')) as { json: () => Promise<{ enrollments: Array<{ due_date: string }> }> }
    const body = await res.json()
    expect(body.enrollments[0].due_date).toBe('2024-06-30')
  })

  it('computes due_date from enrollment_date + relative_duration when no end_date', async () => {
    const enrollment = {
      enrollment_id: 2,
      campaign_name: 'GDPR Awareness',
      module_name: 'Data Privacy',
      content_type: 'quiz',
      status: 'not_started',
      start_date: null,
      completion_date: null,
      enrollment_date: '2024-01-01T00:00:00.000Z',
      policy_acknowledged: false,
      time_spent: null,
    }
    mockFetchSequence([
      { ok: true, body: { workEmail: 'bob@example.com' } },
      { ok: true, body: [{ id: 42, email: 'bob@example.com' }] },
      { ok: true, body: [{ name: 'GDPR Awareness', end_date: null, relative_duration: '30 days' }] },
      { ok: true, body: [enrollment] },
      { ok: true, body: [] },
    ])
    const res = await GET(makeRequest('101')) as { json: () => Promise<{ enrollments: Array<{ due_date: string }> }> }
    const body = await res.json()
    // 2024-01-01 + 30 days = 2024-01-31
    const due = new Date(body.enrollments[0].due_date)
    expect(due.getUTCFullYear()).toBe(2024)
    expect(due.getUTCMonth()).toBe(0) // January
    expect(due.getUTCDate()).toBe(31)
  })

  it('sorts incomplete enrollments before completed ones', async () => {
    const enrollments = [
      { enrollment_id: 1, campaign_name: 'C1', module_name: 'M1', content_type: 'video', status: 'passed', start_date: null, completion_date: '2024-03-01', enrollment_date: '2024-01-01', policy_acknowledged: true, time_spent: null },
      { enrollment_id: 2, campaign_name: 'C2', module_name: 'M2', content_type: 'video', status: 'not_started', start_date: null, completion_date: null, enrollment_date: '2024-02-01', policy_acknowledged: false, time_spent: null },
    ]
    mockFetchSequence([
      { ok: true, body: { workEmail: 'carol@example.com' } },
      { ok: true, body: [{ id: 55, email: 'carol@example.com' }] },
      { ok: true, body: [] }, // no campaigns
      { ok: true, body: enrollments },
      { ok: true, body: [] },
    ])
    const res = await GET(makeRequest('202')) as { json: () => Promise<{ enrollments: Array<{ enrollment_id: number; status: string }> }> }
    const body = await res.json()
    expect(body.enrollments[0].status).toBe('not_started')
    expect(body.enrollments[1].status).toBe('passed')
  })
})

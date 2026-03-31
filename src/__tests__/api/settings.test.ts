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

import { GET, POST } from '@/app/api/settings/route'

const ALLOWED_KEYS = [
  'JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN',
  'TEMPO_API_TOKEN', 'BAMBOO_API_KEY', 'BAMBOO_SUBDOMAIN',
  'WORKABLE_API_TOKEN', 'KNOWBE4_API_TOKEN',
]

beforeEach(() => {
  // Set known env values for testing
  process.env.JIRA_BASE_URL = 'https://test.atlassian.net'
  process.env.JIRA_EMAIL = 'test@example.com'
  process.env.JIRA_API_TOKEN = 'jira-token'
  process.env.TEMPO_API_TOKEN = 'tempo-token'
  process.env.BAMBOO_API_KEY = 'bamboo-key'
  process.env.BAMBOO_SUBDOMAIN = 'testco'
  process.env.WORKABLE_API_TOKEN = 'workable-token'
  process.env.KNOWBE4_API_TOKEN = 'kb4-token'
  process.env.NODE_ENV = 'test'
  vi.clearAllMocks()
})

describe('GET /api/settings', () => {
  it('returns all allowed keys', async () => {
    const res = await GET() as { json: () => Promise<{ data: Record<string, string> }> }
    const body = await res.json()
    expect(Object.keys(body.data).sort()).toEqual(ALLOWED_KEYS.sort())
  })

  it('returns env values for configured keys', async () => {
    const res = await GET() as { json: () => Promise<{ data: Record<string, string> }> }
    const body = await res.json()
    expect(body.data.JIRA_BASE_URL).toBe('https://test.atlassian.net')
    expect(body.data.BAMBOO_SUBDOMAIN).toBe('testco')
  })

  it('returns empty string for unset keys', async () => {
    delete process.env.WORKABLE_API_TOKEN
    const res = await GET() as { json: () => Promise<{ data: Record<string, string> }> }
    const body = await res.json()
    expect(body.data.WORKABLE_API_TOKEN).toBe('')
  })

  it('does not leak non-allowed env vars', async () => {
    process.env.SECRET_INTERNAL = 'super-secret'
    const res = await GET() as { json: () => Promise<{ data: Record<string, string> }> }
    const body = await res.json()
    expect(body.data).not.toHaveProperty('SECRET_INTERNAL')
  })
})

describe('POST /api/settings', () => {
  it('returns success (production mode skips file write)', async () => {
    // In production the handler skips the fs write and returns success directly
    process.env.NODE_ENV = 'production'
    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ JIRA_EMAIL: 'new@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req) as { status: number; json: () => Promise<{ success: boolean }> }
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

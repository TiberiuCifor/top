import { NextResponse } from 'next/server'

const ALLOWED_KEYS = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'TEMPO_API_TOKEN', 'BAMBOO_API_KEY', 'BAMBOO_SUBDOMAIN', 'WORKABLE_API_TOKEN']

export async function GET() {
  try {
    const filtered: Record<string, string> = {}
    for (const key of ALLOWED_KEYS) {
      filtered[key] = process.env[key] ?? ''
    }
    return NextResponse.json({ data: filtered })
  } catch {
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await req.json()
    // In production (Vercel), env vars are managed via the Vercel dashboard.
    // Writing to .env.local is only possible in local development.
    if (process.env.NODE_ENV !== 'production') {
      const fs = await import('fs')
      const path = await import('path')
      const ENV_PATH = path.resolve(process.cwd(), '.env.local')
      const body = await req.clone().json().catch(() => ({}))
      const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
      const all: Record<string, string> = {}
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx === -1) continue
        all[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
      }
      for (const key of ALLOWED_KEYS) {
        if (key in body) all[key] = body[key]
      }
      fs.writeFileSync(ENV_PATH, Object.entries(all).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', 'utf-8')
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

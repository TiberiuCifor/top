import { NextResponse } from 'next/server'

const TOKEN = process.env.WORKABLE_API_TOKEN!
const SUBDOMAIN = 'tecknoworks'
const BASE = `https://${SUBDOMAIN}.workable.com/spi/v3`

const STAGES = ['Applied', 'Assessment', 'HR Interview', 'Technical Interview', 'Hiring Manager', 'Offer']

async function fetchAllCandidates(shortcode: string): Promise<{ stage: string; disqualified: boolean }[]> {
  const all: { stage: string; disqualified: boolean }[] = []
  let url: string | null = `${BASE}/jobs/${shortcode}/candidates?limit=100`

  while (url) {
      const fetchRes: Response = await fetch(url, {
        headers: { Authorization: `Bearer ${TOKEN}` },
        next: { revalidate: 0 },
      })
      if (!fetchRes.ok) break
      const data: { candidates?: any[]; paging?: { next?: string } } = await fetchRes.json()
    const candidates = data.candidates ?? []
    for (const c of candidates) {
      all.push({ stage: c.stage ?? '', disqualified: !!c.disqualified })
    }
    url = data.paging?.next ?? null
  }
  return all
}

export async function GET() {
  try {
      const [publishedRes, internalRes, closedRes] = await Promise.all([
        fetch(`${BASE}/jobs?state=published&limit=100`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
          next: { revalidate: 0 },
        }),
        fetch(`${BASE}/jobs?state=internal&limit=100`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
          next: { revalidate: 0 },
        }),
        fetch(`${BASE}/jobs?state=closed&limit=100`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
          next: { revalidate: 0 },
        }),
      ])
      if (!publishedRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 502 })
      }
      const [publishedData, internalData, closedData] = await Promise.all([
        publishedRes.json(),
        internalRes.ok ? internalRes.json() : { jobs: [] },
        closedRes.ok ? closedRes.json() : { jobs: [] },
      ])
      const rawJobs = [...(publishedData.jobs ?? []), ...(internalData.jobs ?? []), ...(closedData.jobs ?? [])]
    const jobs: { shortcode: string; title: string; department: string; location: string; status: string }[] = rawJobs.map((j: any) => ({
      shortcode: j.shortcode,
      title: j.title,
      department: j.department ?? '',
      location: j.location?.city ?? j.location?.location_str ?? '',
      status: j.state ?? 'published',
    }))

    const results = await Promise.all(
      jobs.map(async (job) => {
        const candidates = await fetchAllCandidates(job.shortcode)
        const stageCounts: Record<string, number> = {}
        for (const stage of STAGES) stageCounts[stage] = 0
        for (const c of candidates) {
          if (!c.disqualified && STAGES.includes(c.stage)) {
            stageCounts[c.stage]++
          }
        }
        const total = Object.values(stageCounts).reduce((a, b) => a + b, 0)
          return { shortcode: job.shortcode, title: job.title, department: job.department, location: job.location, status: job.status, stageCounts, total }
      })
    )

    results.sort((a, b) => b.total - a.total)

    return NextResponse.json({ jobs: results, stages: STAGES })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

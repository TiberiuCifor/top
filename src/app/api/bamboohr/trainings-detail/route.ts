import { NextResponse } from 'next/server'

// Training completion fields: integer field IDs from /v1/meta/fields where name ends in "- Completed"
// Key = field ID, Value = display name (with " - Completed" stripped)
const TRAINING_FIELDS: Record<string, string> = {
  '4575': 'AI-102: Designing and Implementing a Microsoft Azure AI Solution',
  '4576': 'AI-102: preparation via ESI',
  '4613': 'AI-900: Azure AI Fundamentals',
  '4532': 'Atlassian: Jira Fundamentals',
  '4588': 'AWS Certified Cloud Practitioner',
  '4587': 'AWS Certified Solutions Architect – Associate',
  '4524': 'AZ-104: Microsoft Azure Administrator',
  '4525': 'AZ-104: preparation via ESI',
  '4519': 'AZ-204: Developing Solutions for Microsoft Azure',
  '4520': 'AZ-204: preparation via ESI',
  '4529': 'AZ-305: Designing Microsoft Azure Infrastructure Solutions',
  '4528': 'AZ-305: preparation via ESI',
  '4526': 'AZ-400: Designing and Implementing Microsoft DevOps Solutions',
  '4527': 'AZ-400: preparation via ESI',
  '4535': 'AZ-700: Azure Network Engineer Associate',
  '4536': 'AZ-700: preparation via ESI',
  '4589': 'AZ-900: Microsoft Azure Fundamentals',
  '4582': 'DP-100: Designing and Implementing a Data Science Solution on Azure',
  '4585': 'DP-100: preparation via ESI',
  '4521': 'DP-203: Data Engineering on Microsoft Azure',
  '4522': 'DP-203: preparation via ESI',
  '4583': 'DP-300: Administering Microsoft Azure SQL Solutions',
  '4584': 'DP-300: preparation via ESI',
  '4534': 'DP-420: Designing and Implementing Cloud-Native Applications Using Microsoft Azure Cosmos DB',
  '4533': 'DP-420: preparation via ESI',
  '4574': 'DP-600: Implementing Analytics Solutions Using Microsoft Fabric',
  '4596': 'High Bridge Business Excellence Bootcamp',
  '4530': 'KnowBe4 Security Trainings',
  '4523': 'PL-300: Microsoft Power BI Data Analyst',
  '4581': 'PL-300: preparation via ESI',
  '4580': 'PL-400: Microsoft Power Platform Developer',
  '4579': 'PL-400: preparation via ESI',
  '4577': 'PL-600: Microsoft Power Platform Solution Architect',
  '4578': 'PL-600: preparation via ESI',
  '4616': 'Quality Management System',
  '4531': 'TKW Security ISMS',
}

const TRAINING_FIELD_IDS = Object.keys(TRAINING_FIELDS)

function bambooAuth() {
  const key = process.env.BAMBOO_API_KEY
  const sub = process.env.BAMBOO_SUBDOMAIN
  if (!key || !sub) throw new Error('BambooHR not configured')
  return {
    base: `https://api.bamboohr.com/api/gateway.php/${sub}/v1`,
    auth: `Basic ${Buffer.from(`${key}:x`).toString('base64')}`,
  }
}

function isValidDate(d: string | null | undefined) {
  return d && d !== '0000-00-00' && d !== ''
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bambooId = searchParams.get('bambooId')
  if (!bambooId) {
    return NextResponse.json({ error: 'bambooId is required' }, { status: 400 })
  }

  try {
    const { base, auth } = bambooAuth()
    const headers = { Authorization: auth, Accept: 'application/json' }

    const [trainingRes, certRes, goalsRes] = await Promise.allSettled([
      fetch(`${base}/employees/${bambooId}?fields=${TRAINING_FIELD_IDS.join(',')}`, {
        headers, cache: 'no-store',
      }),
      fetch(`${base}/employees/${bambooId}/tables/employeeCertifications/`, {
        headers, cache: 'no-store',
      }),
      fetch(`${base}/performance/employees/${bambooId}/goals`, {
        headers, cache: 'no-store',
      }),
    ])

    // Parse trainings from individual employee fields
    type TrainingEntry = { name: string; completionDate: string }
    const trainings: TrainingEntry[] = []

    if (trainingRes.status === 'fulfilled' && trainingRes.value.ok) {
      const empData = await trainingRes.value.json()
      for (const id of TRAINING_FIELD_IDS) {
        const val = empData[id]
        if (isValidDate(val)) {
          trainings.push({ name: TRAINING_FIELDS[id], completionDate: val })
        }
      }
      // Sort by date descending
      trainings.sort((a, b) => b.completionDate.localeCompare(a.completionDate))
    }

    // Parse certifications from table
    type CertEntry = {
      id?: string; title?: string; completionDate?: string;
      certificationNumber?: string; expirationDate?: string; notes?: string
    }
    let certifications: CertEntry[] = []

    if (certRes.status === 'fulfilled' && certRes.value.ok) {
      const rows: CertEntry[] = await certRes.value.json()
      certifications = Array.isArray(rows) ? rows : []
      certifications.sort((a, b) => {
        const da = a.completionDate ?? ''
        const db = b.completionDate ?? ''
        return db.localeCompare(da)
      })
    }

    // Parse goals
    type GoalRow = {
      id?: string; title?: string; description?: string;
      percentComplete?: number | string; dueDate?: string; status?: string
    }
    let goals: GoalRow[] = []

    if (goalsRes.status === 'fulfilled' && goalsRes.value.ok) {
      const data = await goalsRes.value.json()
      goals = Array.isArray(data) ? data : (data.goals ?? [])
    }

    return NextResponse.json({ trainings, certifications, goals })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

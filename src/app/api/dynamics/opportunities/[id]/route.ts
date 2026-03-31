import { NextResponse } from 'next/server'

async function getDynamicsToken() {
  const rawBase = process.env.DYNAMICS_BASE_URL!
  const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`
  const tenantId = process.env.DYNAMICS_TENANT_ID!
  const clientId = process.env.DYNAMICS_CLIENT_ID!
  const clientSecret = process.env.DYNAMICS_CLIENT_SECRET!

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: `${baseUrl}/.default`,
      }),
      cache: 'no-store',
    }
  )
  if (!tokenRes.ok) throw new Error(`Token error: ${tokenRes.status}`)
  const { access_token } = await tokenRes.json()
  return { access_token, baseUrl }
}

function dynamicsHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  }
}

/** Strip all HTML tags and decode common entities */
function stripHtml(html: string | null): string | null {
  if (!html) return null
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Parse Dynamics auto-post XML into a human-readable string.
 * Example XML:
 *   <pi id="Contact.Opportunity.ProbabilityUpdate.Post" ...>
 *     <ps><p type="1" otc="8" id="...">User Name</p>
 *         <p type="2" otc="3" a="closeprobability"/>
 *         <p type="0" .../><p type="0" .../>
 *         <p type="3" ... >25</p>
 *         <p type="3" ... >40</p></ps></pi>
 */
function parseTimelinePost(xml: string, createdBy: string | null): { summary: string; icon: string } {
  // Extract pi id
  const piIdMatch = xml.match(/pi\s+id="([^"]+)"/)
  const piId = piIdMatch?.[1] || ''

  const decodeXmlEntities = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

  // Extract all <p> elements with their attributes and text
  const pElements: { type: string; otc: string; a: string; id: string; text: string }[] = []
  const pRegex = /<p([^>]*)>([^<]*)<\/p>|<p([^>]*)\/>/g
  let m
  while ((m = pRegex.exec(xml)) !== null) {
    const attrs = m[1] || m[3] || ''
    const text = decodeXmlEntities((m[2] || '').trim())
    const type = (attrs.match(/type="([^"]*)"/) || [])[1] || ''
    const otc = (attrs.match(/otc="([^"]*)"/) || [])[1] || ''
    const a = (attrs.match(/\ba="([^"]*)"/) || [])[1] || ''
    const id = (attrs.match(/\bid="([^"]*)"/) || [])[1] || ''
    pElements.push({ type, otc, a, id, text })
  }

  // Helper: find first person name (type=1, otc=8)
  const personEl = pElements.find(p => p.type === '1' && p.otc === '8')
  const person = personEl?.text || createdBy || 'Someone'

  // Helper: find all numeric values (type=3)
  const values = pElements.filter(p => p.type === '3').map(p => p.text).filter(Boolean)

  // Match by pi id pattern
  if (piId.includes('ProbabilityUpdate')) {
    const field = pElements.find(p => p.type === '2')?.a || 'probability'
    const fieldName = field === 'closeprobability' ? 'Close Probability' : field
    if (values.length >= 2) {
      return { summary: `${person} updated ${fieldName} from ${values[0]}% to ${values[1]}%`, icon: 'update' }
    }
    return { summary: `${person} updated ${fieldName}`, icon: 'update' }
  }

  if (piId.includes('OpportunityCreate')) {
    const oppName = pElements.find(p => p.type === '1' && p.otc === '3')?.text
    return { summary: `${person} created opportunity${oppName ? ` "${oppName}"` : ''}`, icon: 'create' }
  }

  if (piId.includes('StageUpdate') || piId.includes('StepName') || piId.toLowerCase().includes('stage')) {
    return { summary: `${person} updated the pipeline stage`, icon: 'stage' }
  }

  if (piId.includes('ValueUpdate') || piId.toLowerCase().includes('revenue') || piId.toLowerCase().includes('value')) {
    return { summary: `${person} updated the estimated value`, icon: 'update' }
  }

  if (piId.includes('OwnerUpdate') || piId.toLowerCase().includes('owner')) {
    return { summary: `${person} changed the owner`, icon: 'update' }
  }

  if (piId.includes('CloseDateUpdate') || piId.toLowerCase().includes('closedate')) {
    return { summary: `${person} updated the close date`, icon: 'update' }
  }

  // Generic fallback: try to build from elements
  const fieldEl = pElements.find(p => p.type === '2')
  const fieldName = fieldEl?.a || ''
  if (fieldName && values.length >= 2) {
    return { summary: `${person} changed ${fieldName} from "${values[0]}" to "${values[1]}"`, icon: 'update' }
  }
  if (fieldName && values.length === 1) {
    return { summary: `${person} updated ${fieldName} to "${values[0]}"`, icon: 'update' }
  }

  // Last resort: strip all XML tags
  const stripped = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return { summary: stripped.substring(0, 200) || 'System update', icon: 'update' }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { access_token, baseUrl } = await getDynamicsToken()
    const h = dynamicsHeaders(access_token)

    // Fetch core data and timeline posts in parallel
    const [oppRes, activitiesRes, notesRes, postsRes] = await Promise.all([
      fetch(
        `${baseUrl}/api/data/v9.2/opportunities(${id})?$expand=customerid_account($select=name,telephone1,websiteurl),customerid_contact($select=fullname,emailaddress1,telephone1)`,
        { headers: h, cache: 'no-store' }
      ),
      fetch(
        `${baseUrl}/api/data/v9.2/activitypointers?$filter=_regardingobjectid_value eq ${id}&$select=activitytypecode,subject,createdon,statecode,_ownerid_value&$top=100&$orderby=createdon desc`,
        { headers: h, cache: 'no-store' }
      ),
      fetch(
        `${baseUrl}/api/data/v9.2/annotations?$filter=_objectid_value eq ${id}&$select=notetext,subject,createdon,_createdby_value&$top=50&$orderby=createdon desc`,
        { headers: h, cache: 'no-store' }
      ),
      fetch(
        `${baseUrl}/api/data/v9.2/posts?$filter=_regardingobjectid_value eq ${id}&$select=text,createdon,_createdby_value,source&$top=100&$orderby=createdon desc`,
        { headers: h, cache: 'no-store' }
      ),
    ])

    if (!oppRes.ok) {
      const err = await oppRes.text()
      throw new Error(`Opportunity detail → ${oppRes.status}: ${err}`)
    }

    const [opp, activitiesData, notesData, postsData] = await Promise.all([
      oppRes.json(),
      activitiesRes.ok ? activitiesRes.json() : { value: [] },
      notesRes.ok ? notesRes.json() : { value: [] },
      postsRes.ok ? postsRes.json() : { value: [] },
    ])

    // Fetch activity details in parallel
    const emailIds = (activitiesData.value || []).filter((a: any) => a.activitytypecode === 'email').map((a: any) => a.activityid)
    const taskIds = (activitiesData.value || []).filter((a: any) => a.activitytypecode === 'task').map((a: any) => a.activityid)
    const apptIds = (activitiesData.value || []).filter((a: any) => a.activitytypecode === 'appointment').map((a: any) => a.activityid)
    const phoneIds = (activitiesData.value || []).filter((a: any) => a.activitytypecode === 'phonecall').map((a: any) => a.activityid)

    const fetchByIds = async (entity: string, ids: string[], fields: string) => {
      if (!ids.length) return []
      const filter = ids.slice(0, 20).map((i: string) => `activityid eq ${i}`).join(' or ')
      const res = await fetch(`${baseUrl}/api/data/v9.2/${entity}?$filter=${filter}&$select=${fields}`, { headers: h, cache: 'no-store' })
      if (!res.ok) return []
      const d = await res.json()
      return d.value || []
    }

    const [emailDetails, taskDetails, apptDetails, phoneDetails] = await Promise.all([
      fetchByIds('emails', emailIds, 'subject,description,createdon,_ownerid_value,directioncode,statecode'),
      fetchByIds('tasks', taskIds, 'subject,description,createdon,_ownerid_value,scheduledend,statecode'),
      fetchByIds('appointments', apptIds, 'subject,description,createdon,_ownerid_value,scheduledstart,scheduledend,statecode'),
      fetchByIds('phonecalls', phoneIds, 'subject,description,createdon,_ownerid_value,directioncode,statecode'),
    ])

    const emailMap = Object.fromEntries(emailDetails.map((e: any) => [e.activityid, e]))
    const taskMap = Object.fromEntries(taskDetails.map((t: any) => [t.activityid, t]))
    const apptMap = Object.fromEntries(apptDetails.map((a: any) => [a.activityid, a]))
    const phoneMap = Object.fromEntries(phoneDetails.map((p: any) => [p.activityid, p]))

    const activities = (activitiesData.value || []).map((a: any) => {
      const type = a.activitytypecode
      let det: any = {}
      if (type === 'email') det = emailMap[a.activityid] || {}
      else if (type === 'task') det = taskMap[a.activityid] || {}
      else if (type === 'appointment') det = apptMap[a.activityid] || {}
      else if (type === 'phonecall') det = phoneMap[a.activityid] || {}

      return {
        id: a.activityid,
        type,
        subject: a.subject || det.subject || '(no subject)',
        // Strip HTML from description
        description: stripHtml(det.description || null),
        createdOn: a.createdon,
        owner: a['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || det['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || null,
        status: a['statecode@OData.Community.Display.V1.FormattedValue'] || null,
        scheduledStart: det.scheduledstart || null,
        scheduledEnd: det.scheduledend || null,
        direction: det['directioncode@OData.Community.Display.V1.FormattedValue'] || null,
      }
    })

    const notes = (notesData.value || []).map((n: any) => ({
      id: n.annotationid,
      subject: n.subject || null,
      text: n.notetext || null,
      createdBy: n['_createdby_value@OData.Community.Display.V1.FormattedValue'] || null,
      createdOn: n.createdon,
    }))

    // Parse timeline posts
    const timeline = (postsData.value || []).map((p: any) => {
      const rawText = p.text || ''
      const createdBy = p['_createdby_value@OData.Community.Display.V1.FormattedValue'] || null
      const source = p['source@OData.Community.Display.V1.FormattedValue'] || null
      const isXml = rawText.trim().startsWith('<?xml') || rawText.trim().startsWith('<pi')

      if (isXml) {
        const parsed = parseTimelinePost(rawText, createdBy)
        return {
          id: p.postid,
          createdOn: p.createdon,
          createdBy,
          source,
          summary: parsed.summary,
          icon: parsed.icon,
          isSystemPost: true,
        }
      }

      // Plain text post (manual comment)
      return {
        id: p.postid,
        createdOn: p.createdon,
        createdBy,
        source,
        summary: rawText,
        icon: 'comment',
        isSystemPost: false,
      }
    })

    const detail = {
      id: opp.opportunityid,
      name: opp.name,
      stage: opp.stepname || null,
      description: opp.description || null,
      estimatedValue: opp.estimatedvalue || 0,
      estimatedValueFormatted: opp['estimatedvalue@OData.Community.Display.V1.FormattedValue'] || null,
      currency: opp['_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue'] || null,
      closeDate: opp.estimatedclosedate || null,
      createdOn: opp.createdon,
      modifiedOn: opp.modifiedon || null,
      owner: opp['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || null,
      confidenceLevel: opp.new_confidencelevel ?? null,
      closeProbability: opp.closeprobability ?? null,
      rating: opp['opportunityratingcode@OData.Community.Display.V1.FormattedValue'] || null,
      status: opp['statuscode@OData.Community.Display.V1.FormattedValue'] || null,
      account: opp.customerid_account?.name || null,
      accountPhone: opp.customerid_account?.telephone1 || null,
      accountWebsite: opp.customerid_account?.websiteurl || null,
      contact: opp.customerid_contact?.fullname || opp['_parentcontactid_value@OData.Community.Display.V1.FormattedValue'] || null,
      contactEmail: opp.customerid_contact?.emailaddress1 || null,
      contactPhone: opp.customerid_contact?.telephone1 || null,
      weightedValue: opp.crd55_weightedvalue ?? null,
      forecastCategory: opp['msdyn_forecastcategory@OData.Community.Display.V1.FormattedValue'] || null,
      commercialOwner: opp['_new_commercialofferresponsible_value@OData.Community.Display.V1.FormattedValue'] || null,
      techResponsible: opp['_new_techresponsible_value@OData.Community.Display.V1.FormattedValue'] || null,
      businessType: opp['new_businesstype@OData.Community.Display.V1.FormattedValue'] || null,
      newBusiness: opp['new_newbusiness@OData.Community.Display.V1.FormattedValue'] || null,
      opportunityAge: opp.crd55_opportunityage ?? null,
      activities,
      notes,
      timeline,
    }

    return NextResponse.json(detail)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

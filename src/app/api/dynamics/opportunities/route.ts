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

export async function GET() {
  try {
    const { access_token, baseUrl } = await getDynamicsToken()

    const res = await fetch(
      `${baseUrl}/api/data/v9.2/opportunities?$filter=statecode eq 0 and statuscode eq 1` +
      `&$select=name,estimatedvalue,estimatedclosedate,stepname,description,_ownerid_value,createdon,new_confidencelevel,closeprobability,opportunityratingcode,_transactioncurrencyid_value` +
      `&$expand=customerid_account($select=name)` +
      `&$top=200&$orderby=estimatedclosedate asc`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Opportunities → ${res.status}: ${err}`)
    }

    const data = await res.json()

    const opportunities = (data.value || []).map((o: any) => ({
      id: o.opportunityid,
      name: o.name,
      stage: o.stepname || 'Unknown',
      account: o.customerid_account?.name || null,
      estimatedValue: o.estimatedvalue || 0,
      estimatedValueFormatted: o['estimatedvalue@OData.Community.Display.V1.FormattedValue'] || null,
      currency: o['_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue'] || null,
      closeDate: o.estimatedclosedate || null,
      description: o.description || null,
      owner: o['_ownerid_value@OData.Community.Display.V1.FormattedValue'] || null,
      createdOn: o.createdon,
      confidenceLevel: o.new_confidencelevel ?? null,
      closeProbability: o.closeprobability ?? null,
      rating: o['opportunityratingcode@OData.Community.Display.V1.FormattedValue'] || null,
    }))

    // Fetch won + lost counts for last 7 days in parallel
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const statsHeaders = {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    }
    const [wonRes, lostRes] = await Promise.all([
      fetch(
        `${baseUrl}/api/data/v9.2/opportunities?$filter=statecode eq 1 and modifiedon gt ${sevenDaysAgo}&$select=opportunityid,name,estimatedvalue&$top=500`,
        { headers: statsHeaders, cache: 'no-store' }
      ),
      fetch(
        `${baseUrl}/api/data/v9.2/opportunities?$filter=statecode eq 2 and modifiedon gt ${sevenDaysAgo}&$select=opportunityid,name,estimatedvalue&$top=500`,
        { headers: statsHeaders, cache: 'no-store' }
      ),
    ])
    const wonData = wonRes.ok ? await wonRes.json() : { value: [] }
    const lostData = lostRes.ok ? await lostRes.json() : { value: [] }

    const mapMini = (o: any) => ({ id: o.opportunityid, name: o.name, estimatedValue: o.estimatedvalue || 0 })

    return NextResponse.json({
      opportunities,
      total: opportunities.length,
      wonLast7d: (wonData.value || []).map(mapMini),
      lostLast7d: (lostData.value || []).map(mapMini),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token
  }

  const tenantId = process.env.DYNAMICS_TENANT_ID!
  const clientId = process.env.DYNAMICS_CLIENT_ID!
  const clientSecret = process.env.DYNAMICS_CLIENT_SECRET!
  const rawBase = process.env.DYNAMICS_BASE_URL!
  const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`

  const res = await fetch(
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dynamics token error ${res.status}: ${err}`)
  }
  const data = await res.json()

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return tokenCache.token
}

export async function dynamicsFetch(path: string) {
  const rawBase = process.env.DYNAMICS_BASE_URL!
  const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`
  const token = await getAccessToken()

  const res = await fetch(`${baseUrl}/api/data/v9.2${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dynamics ${path} → ${res.status}: ${err}`)
  }
  return res.json()
}

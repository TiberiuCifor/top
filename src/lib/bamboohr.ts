export async function bambooFetch(path: string) {
  const subdomain = process.env.BAMBOO_SUBDOMAIN!
  const apiKey = process.env.BAMBOO_API_KEY!
  const base = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1`
  const auth = Buffer.from(`${apiKey}:x`).toString('base64')
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`BambooHR ${path} → ${res.status}`)
  return res.json()
}

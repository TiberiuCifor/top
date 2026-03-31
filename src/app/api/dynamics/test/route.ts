import { NextResponse } from 'next/server'
import { dynamicsFetch } from '@/lib/dynamics'

export async function GET() {
  try {
    const data = await dynamicsFetch('/WhoAmI')
    return NextResponse.json({ ok: true, userId: data.UserId, orgId: data.OrganizationId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

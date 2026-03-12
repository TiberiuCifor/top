import { NextResponse } from 'next/server'
import { bambooFetch } from '@/lib/bamboohr'

export async function GET() {
  try {
    const data = await bambooFetch('/employees/directory')
    const employees = (data.employees || []).map((e: any) => ({
      id: e.id,
      displayName: e.displayName,
      firstName: e.firstName,
      lastName: e.lastName,
      jobTitle: e.jobTitle,
      department: e.department,
      workEmail: e.workEmail,
      mobilePhone: e.mobilePhone,
      photoUrl: e.photoUrl || null,
    }))
    return NextResponse.json({ employees, total: employees.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUserRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!currentUserRecord || !['admin', 'leadership'].includes(currentUserRecord.role)) {
      return NextResponse.json({ error: 'Forbidden: Only admins can create users' }, { status: 403 })
    }

    const { email, password, full_name, role } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 })
    }

    // Check if user exists in auth.users but not in our users table (orphaned)
    const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const orphanedAuthUser = allAuthUsers?.find(u => u.email === email)
    
    if (orphanedAuthUser) {
      // Delete orphaned auth user first
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphanedAuthUser.id)
      if (deleteError) {
        return NextResponse.json({ error: `Failed to clean up orphaned user: ${deleteError.message}` }, { status: 400 })
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
    }

    // Update the user record created by the trigger with correct role and must_change_password
    // Note: A trigger on auth.users automatically creates a row in public.users
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        full_name,
        email,
        role,
        must_change_password: true
      })
      .eq('id', authData.user.id)

    if (updateError) {
      // Rollback: delete auth user if update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

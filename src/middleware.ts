import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check if user exists in the managed users list (public.users)
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!userRecord && !request.nextUrl.pathname.startsWith('/auth')) {
      // Forbidden: User not in management list
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/auth/login?error=unauthorized', request.url))
    }
  }

  // Redirect to login if not authenticated (except for login page)
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect to home if authenticated and trying to access auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth/login')) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const dest = userRecord?.role === 'project_lead'
      ? '/projects-updates/rag-updates'
      : userRecord?.role === 'user'
      ? '/trainings-certs'
      : '/overview'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

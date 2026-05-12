import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { morningHandoffPathFromTodaySearchParams } from '@/lib/morning-handoff-from-today-query'

/**
 * Next.js 16+ Edge proxy (replaces deprecated `middleware.ts`): refreshes Supabase session cookies.
 * Onboarding routing stays in `OnboardingSessionGate` (client) so sessionStorage breakout works.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/blog') || path.startsWith('/_next')) {
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  // OAuth `code` is exchanged on `/auth/callback` only; forward unchanged (do not strip / redirect).
  if (request.nextUrl.searchParams.has('code') && path.startsWith('/auth')) {
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  if (path === '/sw.js') {
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
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
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  response.headers.set('x-pathname', request.nextUrl.pathname)

  // Unauthenticated `/today` → login with same post-login destination as `/today` → `/morning` (preserves
  // `from`, `funnel`, `context` / parser handoff and leaves `wof_blog_trial_gift` on the request untouched).
  if (path === '/today' && !session) {
    const returnPath = morningHandoffPathFromTodaySearchParams(request.nextUrl.searchParams)
    const login = new URL('/auth/login', request.url)
    login.searchParams.set('returnTo', returnPath)
    const redirectResponse = NextResponse.redirect(login)
    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value)
    })
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|blog|_next/static|_next/image|favicon.ico|manifest\\.json|offline\\.html|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

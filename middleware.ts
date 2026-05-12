import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js middleware: refreshes Supabase session cookies.
 * Onboarding routing is enforced in `OnboardingSessionGate` (client) so sessionStorage breakout works.
 */
export async function middleware(request: NextRequest) {
  console.log('[MIDDLEWARE RUNNING FOR]:', request.nextUrl.pathname)
  const path = request.nextUrl.pathname
  // Safe zone: never run auth/session logic for blog/content shell routes.
  if (path.startsWith('/blog') || path.startsWith('/_next')) {
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  if (request.nextUrl.pathname.startsWith('/auth')) {
    console.log(
      '[MIDDLEWARE DEBUG] Path:',
      request.nextUrl.pathname,
      'Has Code:',
      request.nextUrl.searchParams.has('code'),
    )
  }

  // OAuth `code` is exchanged on `/auth/callback` only; we forward the request unchanged (no strip/redirect).
  // `/auth/calendar-popup-done` is the post-exchange redirect target and has no `code` — still under `/auth` public paths.
  if (request.nextUrl.searchParams.has('code') && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  if (request.nextUrl.pathname === '/sw.js') {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getSession()

  response.headers.set('x-pathname', request.nextUrl.pathname)

  // Onboarding enforcement: handled in `OnboardingSessionGate` so `sessionStorage` breakout works.

  return response
}

export const config = {
  matcher: [
    '/((?!api|blog|_next/static|_next/image|favicon.ico|manifest\\.json|offline\\.html|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

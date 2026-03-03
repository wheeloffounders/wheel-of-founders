import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ONBOARDING_PUBLIC_PATHS = [
  '/api',
  '/_next',
  '/auth/callback',
  '/login',
  '/pricing',
  '/help',
  '/onboarding',
  '/emergency',
]

/**
 * Refreshes the Supabase auth session so Server Components (e.g. admin layout)
 * see a valid session. Without this, getSession()/getUser() in layouts can
 * return null when the access token in the cookie is expired.
 * Also enforces forced onboarding flow for new users.
 * Note: Renamed from middleware.ts per Next.js 16 proxy convention.
 */
export async function proxy(request: NextRequest) {
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

  // Refresh session if expired; updates cookies on response
  const { data: { session } } = await supabase.auth.getSession()

  // Preserve pathname for returnTo in auth redirects
  response.headers.set('x-pathname', request.nextUrl.pathname)

  // Onboarding redirect: if logged in and onboarding not complete, redirect to appropriate step
  if (session && !ONBOARDING_PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed_at, onboarding_step')
      .eq('id', session.user.id)
      .single()

    if (!profile?.onboarding_completed_at) {
      const step = profile?.onboarding_step ?? 0
      const onboardingUrls = [
        '/onboarding/goal',
        '/morning?tutorial=true',
        '/evening?tutorial=true',
      ]
      const targetUrl = onboardingUrls[Math.min(step, 2)] ?? '/onboarding/goal'
      const targetPath = targetUrl.split('?')[0]

      if (!request.nextUrl.pathname.startsWith(targetPath)) {
        return NextResponse.redirect(new URL(targetUrl, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

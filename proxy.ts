import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ONBOARDING_PUBLIC_PATHS = [
  '/api',
  '/_next',
  '/auth',
  '/auth/callback',
  '/auth/login',
  '/auth/signup',
  '/auth/confirm',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/login',
  '/pricing',
  '/help',
  '/privacy',
  '/terms',
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
  // Never run auth/onboarding on the service worker script (redirects break registration).
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

  // Refresh session if expired; updates cookies on response
  const { data: { session } } = await supabase.auth.getSession()

  // Preserve pathname for returnTo in auth redirects
  response.headers.set('x-pathname', request.nextUrl.pathname)

  // Onboarding redirect: if logged in and onboarding not complete, redirect to appropriate step
  if (session && !ONBOARDING_PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed_at, onboarding_step, questionnaire_completed_at, primary_goal_text, struggles')
      .eq('id', session.user.id)
      .maybeSingle()

    const p = profile as {
      onboarding_completed_at?: string
      questionnaire_completed_at?: string
      primary_goal_text?: string
      struggles?: string[]
      onboarding_step?: number
    } | null

    // Skip forced flow if: completed full flow, OR completed questionnaire, OR has goal + personalization (struggles)
    const hasStruggles = Array.isArray(p?.struggles) && p.struggles.length > 0
    const hasCompletedOnboarding =
      !!p?.onboarding_completed_at ||
      !!p?.questionnaire_completed_at ||
      (!!p?.primary_goal_text?.trim() && (hasStruggles || (p?.onboarding_step ?? 0) >= 2))

    if (process.env.NODE_ENV === 'development') {
      console.log('[Proxy] Onboarding check:', {
        userId: session.user.id,
        hasProfile: !!profile,
        primary_goal_text: !!p?.primary_goal_text?.trim(),
        hasStruggles,
        hasCompletedOnboarding,
      })
    }

    if (!hasCompletedOnboarding) {
      const path = request.nextUrl.pathname

      // Step 1: No goal → redirect to goal
      if (!p?.primary_goal_text?.trim()) {
        if (!path.startsWith('/onboarding/goal')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Proxy] No goal found, redirecting to /onboarding/goal')
          }
          return NextResponse.redirect(new URL('/onboarding/goal', request.url))
        }
        return response
      }

      // Step 2: Has goal but no personalization (struggles) → redirect to personalization
      if (!hasStruggles || (p?.struggles?.length ?? 0) === 0) {
        if (!path.startsWith('/onboarding/personalization')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Proxy] Has goal but no struggles, redirecting to /onboarding/personalization')
          }
          return NextResponse.redirect(new URL('/onboarding/personalization', request.url))
        }
        return response
      }

      // Step 3: Has both goal and struggles (onboarding_step 2) → redirect to dashboard
      // Tutorial (?tutorial=start) only in development; production goes to plain /dashboard
      const step = p?.onboarding_step ?? 0
      if (step >= 2 && !path.startsWith('/dashboard')) {
        const dashboardUrl = process.env.NODE_ENV === 'development'
          ? new URL('/dashboard?tutorial=start', request.url)
          : new URL('/dashboard', request.url)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Proxy] Has goal and struggles, redirecting to /dashboard?tutorial=start')
        }
        return NextResponse.redirect(dashboardUrl)
      }
    }

    // Only force tutorial redirect in development; production: no tutorial
    const searchParamsForTutorial = request.nextUrl.searchParams
    if (
      process.env.NODE_ENV === 'development' &&
      p?.onboarding_step === 2 &&
      !p?.onboarding_completed_at &&
      request.nextUrl.pathname === '/dashboard' &&
      searchParamsForTutorial.get('tutorial') !== 'start'
    ) {
      return NextResponse.redirect(new URL('/dashboard?tutorial=start', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Run proxy for /sw.js so we return immediately (no redirect / session work). Excluding sw.js here
    // meant another layer could still rewrite the request; matching ensures a straight NextResponse.next().
    // Exclude static assets and PWA manifest so they never hit auth/onboarding logic (avoids 401 on manifest.json)
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|offline\\.html|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

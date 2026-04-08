import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/** Paths that skip onboarding enforcement (auth, static API, marketing, onboarding itself). */
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
 * Next.js middleware: refreshes Supabase session cookies and enforces onboarding.
 * Must live in `middleware.ts` at the project root (single edge entry).
 */
export async function middleware(request: NextRequest) {
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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  response.headers.set('x-pathname', request.nextUrl.pathname)

  const path = request.nextUrl.pathname
  const isPublicPath = ONBOARDING_PUBLIC_PATHS.some((prefix) => path.startsWith(prefix))

  if (session && !isPublicPath) {
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

    const hasStruggles = Array.isArray(p?.struggles) && p.struggles.length > 0
    const hasCompletedOnboarding =
      !!p?.onboarding_completed_at ||
      !!p?.questionnaire_completed_at ||
      (!!p?.primary_goal_text?.trim() && (hasStruggles || (p?.onboarding_step ?? 0) >= 2))

    if (process.env.NODE_ENV === 'development') {
      console.log('[middleware] Onboarding check:', {
        userId: session.user.id,
        hasProfile: !!profile,
        primary_goal_text: !!p?.primary_goal_text?.trim(),
        hasStruggles,
        hasCompletedOnboarding,
      })
    }

    if (!hasCompletedOnboarding) {
      if (!profile) {
        if (!path.startsWith('/onboarding/goal')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[middleware] No user_profiles row, redirecting to /onboarding/goal')
          }
          return NextResponse.redirect(new URL('/onboarding/goal', request.url))
        }
        return response
      }

      if (!p?.primary_goal_text?.trim()) {
        if (!path.startsWith('/onboarding/goal')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[middleware] No goal found, redirecting to /onboarding/goal')
          }
          return NextResponse.redirect(new URL('/onboarding/goal', request.url))
        }
        return response
      }

      if (!hasStruggles || (p?.struggles?.length ?? 0) === 0) {
        if (!path.startsWith('/onboarding/personalization')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[middleware] Has goal but no struggles, redirecting to /onboarding/personalization')
          }
          return NextResponse.redirect(new URL('/onboarding/personalization', request.url))
        }
        return response
      }

      const step = p?.onboarding_step ?? 0
      if (step >= 2 && !path.startsWith('/dashboard')) {
        const dashboardUrl =
          process.env.NODE_ENV === 'development'
            ? new URL('/dashboard?tutorial=start', request.url)
            : new URL('/dashboard', request.url)
        if (process.env.NODE_ENV === 'development') {
          console.log('[middleware] Has goal and struggles, redirecting to /dashboard?tutorial=start')
        }
        return NextResponse.redirect(dashboardUrl)
      }
    }

    const searchParamsForTutorial = request.nextUrl.searchParams
    if (
      process.env.NODE_ENV === 'development' &&
      p?.onboarding_step === 2 &&
      !p?.onboarding_completed_at &&
      path === '/dashboard' &&
      searchParamsForTutorial.get('tutorial') !== 'start'
    ) {
      return NextResponse.redirect(new URL('/dashboard?tutorial=start', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|offline\\.html|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

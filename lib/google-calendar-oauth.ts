'use client'

import { CALENDAR_OAUTH_PENDING_KEY } from '@/lib/calendar-oauth-bridge'
import { supabase } from '@/lib/supabase'

const POPUP_NAME = 'wof_google_calendar_oauth'

/**
 * OAuth redirect must stay on the **current** host (e.g. localhost:3000 vs production).
 * Never use NEXT_PUBLIC_APP_URL here — that forces the wrong origin in dev.
 * Shape: `${origin}/auth/callback?next=...&calendar_oauth=1`
 */
function buildCalendarRedirectTo(origin: string, nextPath: string, usePopup: boolean): string {
  const postOAuthPath = usePopup
    ? `/auth/calendar-popup-done?returnTo=${encodeURIComponent(nextPath)}`
    : nextPath
  return `${origin}/auth/callback?next=${encodeURIComponent(postOAuthPath)}&calendar_oauth=1`
}

function openOAuthPopup(url: string): Window | null {
  return window.open(url, POPUP_NAME, 'popup=yes,width=520,height=720,scrollbars=yes')
}

/**
 * Google Calendar connect. Defaults to **popup** so the main app stays mounted.
 * Manual identity linking is not used (disabled in many Supabase projects).
 *
 * Do not poll `popup.closed` — COOP on Google vs our origin blocks that from the opener.
 * Completion is signaled via postMessage, localStorage pending + session observer (see SupabaseAuthDebugListener).
 */
export async function startGoogleCalendarOAuth(
  nextPath = '/settings/notifications',
  opts?: { usePopup?: boolean },
): Promise<void> {
  const usePopup = opts?.usePopup !== false
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  if (!origin) {
    throw new Error('Google Calendar OAuth must run in the browser (window.location.origin missing)')
  }
  const redirectTo = buildCalendarRedirectTo(origin, nextPath, usePopup)

  const baseOptions = {
    redirectTo,
    scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    ...(usePopup ? { skipBrowserRedirect: true as const } : {}),
  }

  console.log('[OAUTH DEBUG] Initiating with params:', {
    provider: 'custom:google-calendar',
    nextPath,
    usePopup,
    redirectTo,
    options: baseOptions,
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  console.log('[OAUTH DEBUG] Session before flow', {
    hasSession: !!session,
    userId: session?.user?.id ?? null,
  })

  console.log('[OAUTH DEBUG] Calling signInWithOAuth (linkIdentity not used — manual linking disabled in project)')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'custom:google-calendar' as any,
    options: baseOptions,
  })

  console.log('[OAUTH DEBUG] signInWithOAuth response', {
    error: error?.message ?? null,
    hasUrl: !!data?.url,
  })

  if (error) throw error

  if (usePopup && data?.url) {
    const popup = openOAuthPopup(data.url)
    if (!popup) {
      console.warn('[OAUTH DEBUG] Popup blocked or null — check browser popup settings')
    } else {
      try {
        localStorage.setItem(CALENDAR_OAUTH_PENDING_KEY, String(Date.now()))
      } catch {
        // ignore (private mode, etc.)
      }
      console.log('[OAUTH DEBUG] Popup opened; pending flag set — session observer / postMessage will refresh UI', {
        openerOrigin: typeof window !== 'undefined' ? window.location.origin : null,
      })
    }
    return
  }

  if (!usePopup && data?.url) {
    window.location.assign(data.url)
    return
  }

  console.warn('[OAUTH DEBUG] No URL from signInWithOAuth — falling back to full redirect')
  const { error: err2 } = await supabase.auth.signInWithOAuth({
    provider: 'custom:google-calendar' as any,
    options: {
      redirectTo,
      scopes: baseOptions.scopes,
      queryParams: baseOptions.queryParams,
    },
  })
  if (err2) throw err2
}

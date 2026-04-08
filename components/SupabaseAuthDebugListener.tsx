'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CALENDAR_OAUTH_PENDING_KEY,
  CALENDAR_POPUP_POSTMESSAGE_TYPE,
} from '@/lib/calendar-oauth-bridge'

let calendarOAuthUiRefreshInFlight = false

const CALENDAR_OAUTH_PENDING_TTL_MS = 15 * 60 * 1000

function clearCalendarOAuthPending() {
  try {
    localStorage.removeItem(CALENDAR_OAUTH_PENDING_KEY)
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(CALENDAR_OAUTH_PENDING_KEY)
  } catch {
    // ignore — one-time cleanup if older builds used sessionStorage
  }
}

function isCalendarOAuthPendingFresh(): boolean {
  try {
    const raw = localStorage.getItem(CALENDAR_OAUTH_PENDING_KEY)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    if (!Number.isFinite(ts)) return false
    if (Date.now() - ts > CALENDAR_OAUTH_PENDING_TTL_MS) {
      clearCalendarOAuthPending()
      return false
    }
    return true
  } catch {
    return false
  }
}

async function completeCalendarOAuthUi(reason: string) {
  if (calendarOAuthUiRefreshInFlight) return
  calendarOAuthUiRefreshInFlight = true
  try {
    console.log('[OAUTH DEBUG] Message received, refreshing UI...', { reason })
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession()
    console.log('[AUTH EVENT] refreshSession (calendar OAuth complete)', {
      error: sessionError?.message ?? null,
      hasSession: !!sessionData.session,
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('[AUTH EVENT] getUser after refreshSession (calendar OAuth)', {
      error: userError?.message ?? null,
      userId: userData.user?.id ?? null,
    })
    clearCalendarOAuthPending()
    window.location.reload()
  } catch (e) {
    console.warn('[OAUTH DEBUG] completeCalendarOAuthUi failed', e)
    calendarOAuthUiRefreshInFlight = false
  }
}

function shouldRunSessionObserver(
  event: string,
  session: { user?: { id?: string } } | null,
): session is NonNullable<typeof session> & { user: { id: string } } {
  if (!session?.user?.id) return false
  if (typeof window !== 'undefined' && window.opener != null) return false
  if (event === 'INITIAL_SESSION') return false
  if (!isCalendarOAuthPendingFresh()) return false
  return true
}

/**
 * Calendar OAuth completion: localStorage pending + live session (source of truth), with postMessage as a hint.
 */
export function SupabaseAuthDebugListener() {
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type !== CALENDAR_POPUP_POSTMESSAGE_TYPE) return
      if (typeof ev.origin !== 'string' || !ev.origin.startsWith('http')) {
        return
      }

      console.log('[AUTH EVENT] postMessage from calendar OAuth popup', {
        origin: ev.origin,
        data: ev.data,
      })
      void completeCalendarOAuthUi('postMessage')
    }
    window.addEventListener('message', onMessage)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH EVENT]', event, session)

      if (!shouldRunSessionObserver(event, session)) return

      console.log('[OAUTH DEBUG] Session + calendar OAuth pending — refreshing UI (auth observer)', { event })
      void completeCalendarOAuthUi('auth_session_observer')
    })

    return () => {
      window.removeEventListener('message', onMessage)
      subscription.unsubscribe()
    }
  }, [])

  // Hydration race: session already updated before this component subscribed.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id || (typeof window !== 'undefined' && window.opener != null)) return
      if (!isCalendarOAuthPendingFresh()) return
      console.log('[OAUTH DEBUG] getSession hydrate + pending — refreshing UI')
      void completeCalendarOAuthUi('session_hydrate')
    })
  }, [])

  return null
}

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CALENDAR_POPUP_POSTMESSAGE_TYPE } from '@/lib/calendar-oauth-bridge'

function withSyncSuccess(returnPath: string): string {
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  try {
    const u = new URL(path, window.location.origin)
    u.searchParams.set('sync', 'success')
    return `${u.pathname}${u.search}${u.hash}`
  } catch {
    return '/settings?sync=success'
  }
}

/** Non-secret done signal; `*` avoids localhost vs 127.0.0.1 targetOrigin mismatches on the opener. */
function postMessageToOpener(returnTo: string): boolean {
  const payload = { type: CALENDAR_POPUP_POSTMESSAGE_TYPE, returnTo }

  if (!window.opener) {
    console.warn('[OAUTH DEBUG] No window.opener — parent cannot receive postMessage')
    return false
  }

  try {
    window.opener.postMessage(payload, '*')
    console.log('[OAUTH DEBUG] postMessage sent', { targetOrigin: '*', returnTo })
    return true
  } catch (e) {
    console.warn('[OAUTH DEBUG] postMessage failed', e)
    return false
  }
}

function CalendarPopupDoneInner() {
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get('returnTo') || '/settings?tab=notifications'
  const fallbackUrl = withSyncSuccess(returnTo)
  const [showCloseButton, setShowCloseButton] = useState(false)

  useEffect(() => {
    const showBtnTimer = window.setTimeout(() => setShowCloseButton(true), 3000)

    console.log('[OAUTH DEBUG] calendar-popup-done mounted', {
      returnTo,
      fallbackUrl,
      hasOpener: !!window.opener,
      pageOrigin: window.location.origin,
    })

    const postedToOpener = postMessageToOpener(returnTo)

    const t = window.setTimeout(() => {
      try {
        window.close()
      } catch {
        // ignore
      }

      if (!postedToOpener) {
        window.location.assign(fallbackUrl)
      }
    }, 500)

    return () => {
      window.clearTimeout(t)
      window.clearTimeout(showBtnTimer)
    }
  }, [returnTo, fallbackUrl])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 p-8 text-center">
      <div
        className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40"
        role="status"
      >
        <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          Success! Calendar is connected.
        </p>
        <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-200/90">
          You can close this window. If it does not close on its own, use the button below — your main tab should
          refresh automatically.
        </p>
      </div>
      {showCloseButton ? (
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          onClick={() => {
            try {
              window.close()
            } catch {
              // ignore
            }
            window.setTimeout(() => {
              window.location.assign(fallbackUrl)
            }, 300)
          }}
        >
          Close window
        </button>
      ) : (
        <p className="text-xs text-slate-500">Closing automatically…</p>
      )}
    </div>
  )
}

export default function CalendarPopupDonePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-slate-500">Finishing…</div>}>
      <CalendarPopupDoneInner />
    </Suspense>
  )
}

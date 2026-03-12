/**
 * Service worker helpers for registration and force-update (dev/debug).
 * Use from browser console: window.__forceSWUpdate?.() or import and call.
 */

const SW_URL = '/sw.js'

export async function forceServiceWorkerUpdate(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[sw-utils] Not in browser or no serviceWorker support')
    return
  }
  const regs = await navigator.serviceWorker.getRegistrations()
  for (const reg of regs) {
    await reg.unregister()
    console.log('[sw-utils] Unregistered', reg.scope)
  }
  const reg = await navigator.serviceWorker.register(SW_URL)
  console.log('[sw-utils] Re-registered', reg.scope, '- reload the page to use new SW')
  // Optional: reload so the new SW takes control
  window.location.reload()
}

export async function getServiceWorkerState(): Promise<{
  registrations: Array<{ scope: string; active: string | null; installing: string | null; waiting: string | null }>
  controller: string | null
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { registrations: [], controller: null }
  }
  const regs = await navigator.serviceWorker.getRegistrations()
  const registrations = regs.map((r) => ({
    scope: r.scope,
    active: r.active?.state ?? null,
    installing: r.installing?.state ?? null,
    waiting: r.waiting?.state ?? null,
  }))
  const controller = navigator.serviceWorker.controller?.state ?? null
  return { registrations, controller }
}

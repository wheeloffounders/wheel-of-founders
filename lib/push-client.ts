/**
 * Client-side push notification helpers (browser only).
 * For server-side send, use lib/push-notifications.ts.
 */

export function getNotificationStatus(): {
  supported: boolean
  permission: NotificationPermission
} {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'default' }
  }
  return {
    supported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'default',
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Request notification permission and subscribe to push; save subscription via API.
 * Returns true if permission granted and subscription saved.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('Notifications only available in the browser')
  }
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    throw new Error('Push notifications not configured (missing VAPID key)')
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Your browser does not support push notifications')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription.toJSON()),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || 'Failed to save subscription')
  }

  return true
}

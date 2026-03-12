/**
 * Web Push notifications - sends push to user's devices even when app is closed.
 * Requires VAPID keys: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
 */
import webpush from 'web-push'
import { getServerSupabase } from '@/lib/server-supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

function initVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  let subject = process.env.VAPID_SUBJECT || 'mailto:support@wheeloffounders.com'
  if (!publicKey || !privateKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[push] VAPID not configured: publicKey=', !!publicKey, 'privateKey=', !!privateKey)
    }
    return false
  }
  // web-push requires subject to be a valid URL; if it's just an email, prefix mailto:
  if (subject && !subject.startsWith('mailto:') && !/^https?:\/\//.test(subject)) {
    subject = `mailto:${subject}`
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  if (process.env.NODE_ENV === 'development') {
    console.log('[push] VAPID initialized (subject present:', !!subject, ')')
  }
  return true
}

export interface PushSubscriptionJson {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  expirationTime?: number | null
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushNotification(
  userId: string,
  subscription: PushSubscriptionJson,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!initVapid()) {
    console.warn('[push] VAPID keys not configured, skipping')
    return { success: false, error: 'VAPID not configured' }
  }

  const endpointShort =
    subscription.endpoint.length > 60
      ? subscription.endpoint.slice(0, 50) + '...' + subscription.endpoint.slice(-8)
      : subscription.endpoint

  if (process.env.NODE_ENV === 'development') {
    console.log('[push] Sending to endpoint:', endpointShort, 'title:', payload.title)
  }

  try {
    const fullPayload = {
      title: String(payload.title ?? ''),
      body: String(payload.body ?? ''),
      url: payload.url || APP_URL,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
    }

    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(fullPayload),
      {
        TTL: 86400, // 24 hours
      }
    )

    if (process.env.NODE_ENV === 'development') {
      console.log('[push] webpush.sendNotification succeeded for', endpointShort)
    }

    await logNotification(userId, payload.title, payload.body, true)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const statusCode = (err as { statusCode?: number })?.statusCode

    console.error('[push] sendNotification failed:', {
      endpoint: endpointShort,
      statusCode,
      error: msg,
    })

    // 410 Gone = subscription expired, remove it
    if (statusCode === 410) {
      await removeExpiredSubscription(userId, subscription.endpoint)
    }

    await logNotification(userId, payload.title, payload.body, false, msg)
    return { success: false, error: msg }
  }
}

async function logNotification(
  userId: string,
  title: string,
  body: string,
  success: boolean,
  error?: string
) {
  try {
    const db = getServerSupabase()
    await (db.from('notification_logs') as any).insert({
      user_id: userId,
      type: 'push',
      title,
      body,
      success,
      error: error || null,
    })
  } catch (e) {
    console.warn('[push] Failed to log notification:', e)
  }
}

async function removeExpiredSubscription(userId: string, endpoint: string) {
  try {
    const db = getServerSupabase()
    await (db.from('push_subscriptions') as any)
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
    console.log('[push] Removed expired subscription for user', userId)
  } catch (e) {
    console.warn('[push] Failed to remove expired subscription:', e)
  }
}

/** Send push to all of a user's subscribed devices */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; details?: Array<{ endpoint: string; success: boolean; error?: string }> }> {
  const db = getServerSupabase()
  const { data: rows, error: fetchError } = await (db.from('push_subscriptions') as any)
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (fetchError) {
    console.error('[push] Failed to fetch subscriptions:', fetchError)
    return { sent: 0, failed: 0, details: [] }
  }

  const subs = rows || []
  if (process.env.NODE_ENV === 'development') {
    console.log('[push] User', userId, 'has', subs.length, 'subscription(s). Endpoints:', subs.map((r: { endpoint?: string }) => (r?.endpoint ? r.endpoint.slice(0, 40) + '...' : '?')))
  }

  let sent = 0
  let failed = 0
  const details: Array<{ endpoint: string; success: boolean; error?: string }> = []

  for (const row of subs) {
    const r = row as { endpoint?: string; p256dh?: string; auth?: string }
    if (!r?.endpoint || !r?.p256dh || !r?.auth) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[push] Skipping row with missing endpoint/p256dh/auth:', { hasEndpoint: !!r?.endpoint, hasP256dh: !!r?.p256dh, hasAuth: !!r?.auth })
      }
      details.push({ endpoint: r?.endpoint || '(missing)', success: false, error: 'Missing keys' })
      failed++
      continue
    }

    const subscription: PushSubscriptionJson = {
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
    }

    const result = await sendPushNotification(userId, subscription, payload)
    if (result.success) {
      sent++
      details.push({ endpoint: r.endpoint.slice(0, 50) + '...', success: true })
    } else {
      failed++
      details.push({ endpoint: r.endpoint.slice(0, 50) + '...', success: false, error: result.error })
    }
  }

  return { sent, failed, details }
}

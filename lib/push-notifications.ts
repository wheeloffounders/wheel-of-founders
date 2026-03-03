/**
 * Web Push notifications - sends push to user's devices even when app is closed.
 * Requires VAPID keys: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
 */
import webpush from 'web-push'
import { getServerSupabase } from '@/lib/server-supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@wheeloffounders.com'
  if (!publicKey || !privateKey) {
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
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

  try {
    const fullPayload = {
      ...payload,
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

    await logNotification(userId, payload.title, payload.body, true)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const statusCode = (err as { statusCode?: number })?.statusCode

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
): Promise<{ sent: number; failed: number }> {
  const db = getServerSupabase()
  const { data: rows } = await (db.from('push_subscriptions') as any)
    .select('subscription')
    .eq('user_id', userId)

  let sent = 0
  let failed = 0

  for (const row of rows || []) {
    const sub = (row as { subscription?: PushSubscriptionJson }).subscription
    if (!sub?.endpoint) continue

    const result = await sendPushNotification(userId, sub, payload)
    if (result.success) sent++
    else failed++
  }

  return { sent, failed }
}

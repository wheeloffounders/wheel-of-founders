import { getServerSupabase } from '@/lib/server-supabase'

export type EmailFrequency = 'daily' | 'weekly_only' | 'achievements_only' | 'none'

export interface EmailPreferencesV1 {
  morningTime: string
  eveningTime: string
  frequency: EmailFrequency
  unsubscribedAt: Date | null
}

const DEFAULTS: EmailPreferencesV1 = {
  morningTime: '09:00',
  eveningTime: '20:00',
  frequency: 'daily',
  unsubscribedAt: null,
}

function normalizeTime(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  return String(raw).slice(0, 5)
}

function parseFrequency(raw: unknown): EmailFrequency {
  if (raw === 'daily' || raw === 'weekly_only' || raw === 'achievements_only' || raw === 'none') {
    return raw
  }
  return DEFAULTS.frequency
}

export async function getUserEmailPreferencesV1(userId: string): Promise<EmailPreferencesV1> {
  const db = getServerSupabase()

  const { data: notif } = await (db.from('user_notification_settings') as any)
    .select('email_morning_reminder_time, email_evening_reminder_time, email_frequency, email_unsubscribed_at')
    .eq('user_id', userId)
    .maybeSingle()

  const notifRow = notif as
    | {
        email_morning_reminder_time?: string | null
        email_evening_reminder_time?: string | null
        email_frequency?: EmailFrequency | null
        email_unsubscribed_at?: string | null
      }
    | null

  if (notifRow && (notifRow.email_frequency || notifRow.email_morning_reminder_time || notifRow.email_evening_reminder_time || notifRow.email_unsubscribed_at)) {
    return {
      morningTime: normalizeTime(notifRow.email_morning_reminder_time, DEFAULTS.morningTime),
      eveningTime: normalizeTime(notifRow.email_evening_reminder_time, DEFAULTS.eveningTime),
      frequency: parseFrequency(notifRow.email_frequency),
      unsubscribedAt: notifRow.email_unsubscribed_at ? new Date(notifRow.email_unsubscribed_at) : null,
    }
  }

  const { data: profile } = await (db.from('user_profiles') as any)
    .select('email_preferences')
    .eq('id', userId)
    .maybeSingle()

  const legacy = (profile as { email_preferences?: Record<string, unknown> } | null)?.email_preferences ?? {}
  const weeklyDigestEnabled = legacy.weekly_digest !== false

  return {
    morningTime: DEFAULTS.morningTime,
    eveningTime: DEFAULTS.eveningTime,
    frequency: weeklyDigestEnabled ? DEFAULTS.frequency : 'none',
    unsubscribedAt: null,
  }
}


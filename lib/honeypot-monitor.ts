/**
 * Honeypot monitoring - detects suspicious patterns from security_logs.
 */
import { getServerSupabase } from './server-supabase'

export interface HoneypotAlertResult {
  ipAlerts: number
  uaAlerts: number
  payloadAlerts: number
}

/** Check for honeypot triggers and create alerts. */
export async function checkHoneypotAlerts(): Promise<HoneypotAlertResult> {
  const db = getServerSupabase()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: logs } = await db
    .from('security_logs')
    .select('ip, user_agent, action, reason')
    .eq('action', 'honeypot_triggered')
    .gte('created_at', oneHourAgo)

  const ipCounts = new Map<string, number>()
  const uaCounts = new Map<string, number>()
  for (const row of logs ?? []) {
    const ip = (row as { ip?: string }).ip || 'unknown'
    ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1)
    const ua = (row as { user_agent?: string }).user_agent || 'unknown'
    uaCounts.set(ua, (uaCounts.get(ua) || 0) + 1)
  }

  const ipAlerts: { ip: string; count: number }[] = []
  for (const [ip, count] of ipCounts) {
    if (count > 5) ipAlerts.push({ ip, count })
  }

  const uaAlerts: { user_agent: string; count: number }[] = []
  for (const [ua, count] of uaCounts) {
    if (count > 10) uaAlerts.push({ user_agent: ua, count })
  }

  const { data: payloadLogs } = await db
    .from('security_logs')
    .select('ip')
    .eq('action', 'honeypot_triggered')
    .gte('created_at', oneHourAgo)
    .not('metadata', 'is', null)

  const payloadIpCounts = new Map<string, number>()
  for (const row of payloadLogs ?? []) {
    const ip = (row as { ip?: string }).ip || 'unknown'
    payloadIpCounts.set(ip, (payloadIpCounts.get(ip) || 0) + 1)
  }
  const payloadAlerts: { ip: string; count: number }[] = []
  for (const [ip, count] of payloadIpCounts) {
    if (count > 2) payloadAlerts.push({ ip, count })
  }

  if (ipAlerts.length > 0) {
    await logAlert('Honeypot: Multiple triggers from same IP', { ips: ipAlerts })
  }
  if (uaAlerts.length > 0) {
    await logAlert('Honeypot: Suspicious user agent patterns', { userAgents: uaAlerts })
  }
  if (payloadAlerts.length > 0) {
    await logAlert('Honeypot: Multiple payload attempts', { payloadIps: payloadAlerts })
  }

  return {
    ipAlerts: ipAlerts.length,
    uaAlerts: uaAlerts.length,
    payloadAlerts: payloadAlerts.length,
  }
}

async function logAlert(title: string, data: unknown) {
  console.warn(`[SECURITY ALERT] ${title}`, data)
  try {
    const db = getServerSupabase()
    await (db.from('security_alerts') as any).insert({
      title,
      data,
    })
  } catch (e) {
    console.error('[Honeypot Monitor] Failed to log alert:', e)
  }
}

import { getServerSupabase } from '@/lib/server-supabase'
import type { RetentionEmailType } from './triggers'

export type AbVariant = 'A' | 'B'

export type ActiveAbTest = {
  id: string
  email_type: string
  variant_a_subject: string
  variant_b_subject: string
  variant_a_content?: string | null
  variant_b_content?: string | null
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

export async function getActiveAbTest(emailType: RetentionEmailType): Promise<ActiveAbTest | null> {
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data } = await (db.from('email_ab_tests') as any)
    .select('id, email_type, variant_a_subject, variant_b_subject, variant_a_content, variant_b_content')
    .eq('email_type', emailType)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ActiveAbTest | null) ?? null
}

export async function recordTestAssignment(userId: string, testId: string, variant: AbVariant): Promise<void> {
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  await (db.from('email_ab_assignments') as any).upsert(
    { ab_test_id: testId, user_id: userId, variant },
    { onConflict: 'ab_test_id,user_id' }
  )
}

export async function getVariantForUser(
  userId: string,
  emailType: RetentionEmailType
): Promise<{ testId: string; variant: AbVariant; subject: string; content?: string | null } | null> {
  const test = await getActiveAbTest(emailType)
  if (!test) return null

  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data: existing } = await (db.from('email_ab_assignments') as any)
    .select('variant')
    .eq('ab_test_id', test.id)
    .eq('user_id', userId)
    .maybeSingle()

  let variant: AbVariant
  const existingVariant = (existing as { variant?: string } | null)?.variant
  if (existingVariant === 'A' || existingVariant === 'B') {
    variant = existingVariant
  } else {
    variant = hashString(`${userId}:${test.id}`) % 2 === 0 ? 'A' : 'B'
    await recordTestAssignment(userId, test.id, variant)
  }

  return {
    testId: test.id,
    variant,
    subject: variant === 'A' ? test.variant_a_subject : test.variant_b_subject,
    content: variant === 'A' ? test.variant_a_content : test.variant_b_content,
  }
}

export async function completeAbTest(testId: string, winnerVariant: AbVariant): Promise<void> {
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  await (db.from('email_ab_tests') as any)
    .update({ status: 'completed', winner_variant: winnerVariant, end_date: new Date().toISOString() })
    .eq('id', testId)
}

export async function getAbTestResults(testId: string): Promise<{
  testId: string
  byVariant: Record<AbVariant, { sent: number; opened: number; clicked: number; openRate: number; clickRate: number }>
}> {
  const db = getServerSupabase()
  const [logsRes, eventsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table typing gap
    (db.from('email_logs') as any)
      .select('id, ab_variant')
      .eq('ab_test_id', testId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table typing gap
    (db.from('email_events') as any)
      .select('email_log_id, event_type'),
  ])

  const byVariant: Record<AbVariant, { sent: number; opened: number; clicked: number; openRate: number; clickRate: number }> = {
    A: { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 },
    B: { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 },
  }

  const logVariant = new Map<string, AbVariant>()
  for (const l of (logsRes.data || []) as Array<{ id?: string; ab_variant?: string | null }>) {
    if (!l.id) continue
    const v: AbVariant = l.ab_variant === 'B' ? 'B' : 'A'
    logVariant.set(l.id, v)
    byVariant[v].sent += 1
  }

  const opened = new Set<string>()
  const clicked = new Set<string>()
  for (const e of (eventsRes.data || []) as Array<{ email_log_id?: string | null; event_type?: string | null }>) {
    if (!e.email_log_id || !logVariant.has(e.email_log_id)) continue
    if (e.event_type === 'opened') opened.add(e.email_log_id)
    if (e.event_type === 'clicked') clicked.add(e.email_log_id)
  }

  for (const id of opened) {
    const v = logVariant.get(id)
    if (v) byVariant[v].opened += 1
  }
  for (const id of clicked) {
    const v = logVariant.get(id)
    if (v) byVariant[v].clicked += 1
  }

  ;(['A', 'B'] as AbVariant[]).forEach((v) => {
    const sent = byVariant[v].sent
    byVariant[v].openRate = sent > 0 ? byVariant[v].opened / sent : 0
    byVariant[v].clickRate = sent > 0 ? byVariant[v].clicked / sent : 0
  })

  return { testId, byVariant }
}


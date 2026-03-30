import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

type TriggerCronBody = {
  cron?: 'weekly' | 'monthly' | 'quarterly'
}

const CRON_PATH: Record<NonNullable<TriggerCronBody['cron']>, string> = {
  weekly: '/api/cron/generate-weekly-insights',
  monthly: '/api/cron/generate-monthly-insights',
  quarterly: '/api/cron/generate-quarterly-insights',
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }

  let body: TriggerCronBody = {}
  try {
    body = (await req.json()) as TriggerCronBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const cron = body.cron
  if (!cron || !(cron in CRON_PATH)) {
    return NextResponse.json({ error: 'Invalid cron (weekly|monthly|quarterly)' }, { status: 400 })
  }

  const url = `${req.nextUrl.origin}${CRON_PATH[cron]}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  return NextResponse.json(
    {
      cron,
      status: response.status,
      ok: response.ok,
      ...(typeof data === 'object' && data !== null ? data : { data }),
    },
    { status: response.ok ? 200 : response.status }
  )
}

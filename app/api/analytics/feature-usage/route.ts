import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'

/**
 * Record feature usage for founder analytics. Requires authenticated session.
 * RLS allows only service_role to write feature_usage, so we insert via server client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      feature_name: string
      action: string
      page?: string
      duration_seconds?: number
      metadata?: Record<string, unknown>
    }
    const { feature_name, action, page, duration_seconds, metadata } = body
    if (!feature_name || !action) {
      return NextResponse.json({ error: 'feature_name and action required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as object)
            })
          },
        },
      }
    )
    const { data: { session } } = await authClient.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    await db.from('feature_usage').insert({
      user_id: session.user.id,
      feature_name,
      action,
      page: page ?? null,
      duration_seconds: duration_seconds ?? null,
      metadata: metadata ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[feature-usage]', e)
    return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
  }
}

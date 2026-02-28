import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  try {
    let userId: string | null = null

    // 1. Try Bearer token (session in localStorage - works when cookies are empty)
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (bearerToken) {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )
      const { data: { user }, error } = await anon.auth.getUser(bearerToken)
      if (!error && user?.id) userId = user.id
    }

    // 2. Fall back to cookies
    if (!userId) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set() {},
            remove() {},
          },
        }
      )
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!error && session?.user?.id) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to save timezone.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { timezone, timezone_offset } = body as { timezone?: string; timezone_offset?: number }

    if (!timezone || typeof timezone !== 'string') {
      return NextResponse.json({ error: 'timezone required' }, { status: 400 })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit user_profiles columns
    const { error: updateError } = await (db.from('user_profiles') as any)
      .update({
        timezone: timezone.trim(),
        timezone_offset: typeof timezone_offset === 'number' ? timezone_offset : 0,
        timezone_detected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Timezone update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update timezone' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Timezone API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

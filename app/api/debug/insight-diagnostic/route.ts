/**
 * Diagnostic endpoint for evening/morning insight system.
 * GET /api/debug/insight-diagnostic?userId=xxx&date=yyyy-MM-dd
 *
 * Returns: env vars, recent prompts, evening review for date, and 
optional test result
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const date = req.nextUrl.searchParams.get('date') ?? new 
Date().toISOString().split('T')[0]

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 
})
    }

    const db = getServerSupabase()

    // Check environment variables (just existence, not values)
    const env = {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }

    // Get evening review for the date
    const { data: eveningReview } = await db
      .from('evening_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('review_date', date)
      .maybeSingle()

    // Get recent prompts
    const { data: recentPrompts } = await db
      .from('personal_prompts')
      .select('id, prompt_type, prompt_date, generated_at')
      .eq('user_id', userId)
      .in('prompt_type', ['post_evening', 'morning'])
      .order('generated_at', { ascending: false })
      .limit(10)

    // Check for post-evening insight for this date
    const { data: postEveningForDate } = await db
      .from('personal_prompts')
      .select('id, prompt_text')
      .eq('user_id', userId)
      .eq('prompt_type', 'post_evening')
      .eq('prompt_date', date)
      .maybeSingle()

    // Check for morning insight for next day
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toISOString().split('T')[0]
    
    const { data: morningForNextDay } = await db
      .from('personal_prompts')
      .select('id, prompt_text')
      .eq('user_id', userId)
      .eq('prompt_type', 'morning')
      .eq('prompt_date', nextDayStr)
      .maybeSingle()

    return NextResponse.json({
      env,
      eveningReview: eveningReview || null,
      recentPrompts: recentPrompts || [],
      hasPostEveningForDate: !!(postEveningForDate as any),
      postEveningPreview: (postEveningForDate as any)?.prompt_text?.substring(0, 100) + '...',
      hasMorningForNextDay: !!(morningForNextDay as any),
      morningPreview: (morningForNextDay as any)?.prompt_text?.substring(0, 100) + '...',
      date,
      nextDay: nextDayStr
    })

  } catch (error) {
    console.error('[insight-diagnostic] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

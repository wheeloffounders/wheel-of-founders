import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 
})
    }

    const db = getServerSupabase()
    
    // Check personal_prompts
    const { data: prompts, error: promptsError } = await db
      .from('personal_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('prompt_type', 'weekly')
      .order('created_at', { ascending: false })
      .limit(5)

    if (promptsError) {
      return NextResponse.json({ error: promptsError.message }, { status: 
500 })
    }

    // Check insight_jobs
    const { data: jobs, error: jobsError } = await db
      .from('insight_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      prompts: prompts || [],
      jobs: jobs || [],
      hasInsight: prompts && prompts.length > 0
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

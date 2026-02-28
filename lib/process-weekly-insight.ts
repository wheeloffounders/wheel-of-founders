import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'

interface ProcessWeeklyInsightJobParams {
  jobId: string
  userId: string
  weekStart: string
  weekEnd: string
  wins: string[]
  lessons: string[]
  favoriteWinIndices?: number[]
  keyLessonIndices?: number[]
  avgMood: number | null
  avgEnergy: number | null
  tasksCompleted: number
  totalTasks: number
  needleMoversCompleted: number
  needleMoversTotal: number
  primaryGoal: string | null
  pastFeedback: any[]
  lastWeekSelections: any
  lastWeekWins: string[]
  lastWeekLessons: string[]
  userPrompt: string
  systemPrompt: string
  hasHistory: boolean
}

export async function processWeeklyInsightJob(params: ProcessWeeklyInsightJobParams) {
  const db = getServerSupabase()

  try {
    // Update job status to processing
    await (db.from('insight_jobs') as any)
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', params.jobId)

    // Generate the insight
    const insight = await generateAIPrompt({
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Save to personal_prompts
    await (db.from('personal_prompts') as any).insert({
      user_id: params.userId,
      prompt_text: insight,
      prompt_type: 'weekly',
      prompt_date: params.weekStart,
      stage_context: null,
      generation_count: 1,
    })

    // Save to insight_history
    await (db.from('insight_history') as any).upsert(
      {
        user_id: params.userId,
        insight_type: 'weekly',
        period_start: params.weekStart,
        period_end: params.weekEnd,
        insight_text: insight,
      },
      { onConflict: 'user_id,insight_type,period_start,period_end' }
    )

    // Update job as completed
    await (db.from('insight_jobs') as any)
      .update({
        status: 'completed',
        result: insight,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.jobId)

    console.log(`[weekly-insight] Job ${params.jobId} completed successfully`)
  } catch (error) {
    console.error(`[weekly-insight] Job ${params.jobId} failed:`, error)

    // Update job as failed
    await (db.from('insight_jobs') as any)
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.jobId)
  }
}

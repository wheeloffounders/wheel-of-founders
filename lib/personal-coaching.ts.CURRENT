import { getServerSupabase } from './server-supabase'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { detectFounderStage, getUserStage, updateUserStage } from './stage-detection'
import { filterInsightLabels } from './insight-utils'
import { GENTLE_ARCHITECT, MRS_DEER_RULES, FounderStage, toNaturalStage } from './mrs-deer'

/** Safe get for Supabase/unknown data - avoids 'never' type errors */
function safeGet<T>(obj: unknown, key: string, defaultValue: T): T {
  const val = (obj as Record<string, unknown> | null | undefined)?.[key]
  return (val as T) ?? defaultValue
}

const NO_LABELS = ' DO NOT use labels like "Observe:", "Validate:", "Reframe:", or "Question:" in your response. Write naturally without headers or section titles.'

import { analyzeUserPatterns, UserPatterns } from './analysis-engine'
import { generateAIPrompt, generateAIPromptStream } from './ai-client'
import { getUserGoal, getUserLanguage } from './user-language'

/** Call AI - streams chunks to onChunk when provided, otherwise returns full string */
async function callAI(
  opts: { systemPrompt: string; userPrompt: string; maxTokens?: number; temperature?: number },
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (onChunk) {
    let full = ''
    for await (const chunk of generateAIPromptStream(opts)) {
      full += chunk
      onChunk(chunk)
    }
    return full
  }
  return generateAIPrompt(opts)
}
import { checkUserHistory } from './user-history'

export type PromptType = 'morning' | 'post_morning' | 'post_evening' | 'weekly' | 'monthly' | 'emergency'

interface UserData {
  userId: string
  stage: FounderStage
  patterns: UserPatterns | null
  todayPlan?: any
  todayReview?: any
todayDecision?: {           // ← ADD THIS
    decision: string
    decision_type: string
    why_this_decision?: string | null
  } | null
  weekData?: any
  monthData?: any
  /** For date-specific prompts: the date we're generating for (e.g. Feb 15 morning prompt) */
  targetDate?: string
}

/**
 * Generate Pro+ personal coaching prompt
 * @param userId - User ID
 * @param promptType - Type of prompt (morning, post_morning, post_evening, weekly, monthly)
 * @param promptDate - Optional date for date-specific prompts (defaults to today)
 * @param opts - Optional { onChunk } for streaming; when provided, yields chunks as they arrive
 */
export async function generateProPlusPrompt(
  userId: string,
  promptType: PromptType,
  promptDate?: string, // Format: 'yyyy-MM-dd', defaults to today
  opts?: { onChunk?: OnChunk; postMorningOverride?: PostMorningOverride | null; postEveningOverride?: PostEveningOverride | null; morningOverride?: MorningOverride | null }
): Promise<string> {
  // Get user's current stage
  let stage = await getUserStage(userId)
  if (!stage) {
    stage = await detectFounderStage(userId)
    await updateUserStage(userId, stage)
  }

  // Get user's goal for personalized language
  const userGoal = await getUserGoal(userId)
  const userLang = getUserLanguage(userGoal)

  // Use provided date or default to today
  const targetDate = promptDate || format(new Date(), 'yyyy-MM-dd')

  // Use server client for DB access in API context (RLS can block anon client)
  const db = getServerSupabase()

  // TEMPORARY: Generation limit disabled for debugging. Re-enable once date logic is verified.
  // Check generation count for date-specific prompts (morning, post_morning, post_evening)
  // Limit to 3 generations per prompt_type + prompt_date combination
  // if (['morning', 'post_morning', 'post_evening'].includes(promptType)) {
  //   const { data: existingPrompts } = await db
  //     .from('personal_prompts')
  //     .select('generation_count')
  //     .eq('user_id', userId)
  //     .eq('prompt_type', promptType)
  //     .eq('prompt_date', targetDate)
  //     .order('generated_at', { ascending: false })
  //     .limit(1)
  //     .maybeSingle()
  //
  //   if (existingPrompts) {
  //     const currentCount = existingPrompts.generation_count || 1
  //     if (currentCount >= 3) {
  //       console.log(`[Personal Coaching] Generation limit reached (${currentCount}/3) for ${promptType} on ${targetDate}`)
  //       const { data: latestPrompt } = await db
  //         .from('personal_prompts')
  //         .select('prompt_text')
  //         .eq('user_id', userId)
  //         .eq('prompt_type', promptType)
  //         .eq('prompt_date', targetDate)
  //         .order('generated_at', { ascending: false })
  //         .limit(1)
  //         .maybeSingle()
  //
  //       if (latestPrompt?.prompt_text) {
  //         return latestPrompt.prompt_text
  //       }
  //     }
  //   }
  // }
  const { hasHistory } = await checkUserHistory(userId)
  console.log('[Personal Coaching] Generating', promptType, 'prompt for', targetDate, 'hasHistory=', hasHistory)

  // Get user data based on prompt type (uses targetDate for date-specific prompts)
  const optsTyped = opts as { postMorningOverride?: PostMorningOverride | null; postEveningOverride?: PostEveningOverride | null }
  const userData = await getUserDataForPrompt(
    userId,
    promptType,
    stage,
    targetDate,
    optsTyped?.postMorningOverride,
    optsTyped?.postEveningOverride
  )

  if (promptType === 'morning') {
    console.log('[Personal Coaching] Generating morning prompt for', targetDate, '— will use yesterday\'s (', format(subDays(new Date(targetDate), 1), 'yyyy-MM-dd'), ') evening review')
  }

  // Generate prompt based on type (throws on AI failure - no fallbacks)
  const optsFull = opts as { onChunk?: OnChunk; morningOverride?: MorningOverride | null }
  const onChunk = optsFull?.onChunk
  let promptText: string
  switch (promptType) {
    case 'morning':
      promptText = await generateGentleArchitectPrompt(userData, userLang, hasHistory, onChunk, optsFull?.morningOverride)
      break
    case 'post_morning':
      promptText = await analyzeMorningPlan(userData, userLang, hasHistory, onChunk)
      break
    case 'post_evening':
      promptText = await reflectOnDay(userData, userLang, hasHistory, onChunk)
      break
    case 'weekly':
      promptText = await generateWeeklyInsight(userData, userLang)
      break
    case 'monthly':
      promptText = await generateMonthlyInsight(userData, userLang)
      break
    default:
      throw new Error(`Unknown prompt type: ${promptType}`)
  }

  // Calculate generation count for date-specific prompts (db already set above)
  let generationCount = 1
  if (['morning', 'post_morning', 'post_evening'].includes(promptType)) {
    const { data: existingPromptsData } = await db
      .from('personal_prompts')
      .select('generation_count')
      .eq('user_id', userId)
      .eq('prompt_type', promptType)
      .eq('prompt_date', targetDate)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    type PromptRow = { generation_count?: number | null }
    const existingPrompts = existingPromptsData as PromptRow | null
    
    if (existingPrompts?.generation_count) {
      generationCount = existingPrompts.generation_count + 1
    }
  }

  // Store prompt in database with prompt_date for date-specific prompts
  const insertData = {
    user_id: userId,
    prompt_text: promptText,
    prompt_type: promptType,
    stage_context: stage,
    prompt_date: ['morning', 'post_morning', 'post_evening'].includes(promptType) ? targetDate : null,
    generation_count: generationCount,
  }

  // Real insert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit personal_prompts
  const { data: insertedData, error: insertError } = await (db.from('personal_prompts') as any)
    .insert(insertData as any)
    .select()

  if (insertError) {
    console.error('[SAVE DEBUG] ❌ INSERT ERROR:', insertError)
    console.error('[SAVE DEBUG] Error code:', insertError.code)
    console.error('[SAVE DEBUG] Error message:', insertError.message)
    console.error('[SAVE DEBUG] Error details:', insertError.details)
    console.error('[SAVE INSIGHT] ❌ Insert FAILED:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    })
    // Don't throw - still return the prompt text so user sees it
  } else {
    console.log('[SAVE DEBUG] ✅ INSERT SUCCESS:', insertedData)
    console.log('[SAVE INSIGHT] ✅ Insert SUCCEEDED:', {
      insertedRows: insertedData?.length || 0,
      insertedId: insertedData?.[0]?.id,
      prompt_date: insertedData?.[0]?.prompt_date,
    })
  }

  console.log(`[Personal Coaching] Generated ${promptType} insight (generation ${generationCount}/3) for ${targetDate}`)

  return promptText
}

/**
 * Get user profile data for AI context (including struggles and message to Mrs. Deer for deep personalization)
 */
async function getUserProfileData(userId: string): Promise<{ context: string; name?: string; preferredName?: string; companyName?: string }> {
  const db = getServerSupabase()
  const { data } = await db
    .from('user_profiles')
    .select('name, preferred_name, company_name, primary_goal_text, destress_activity, hobbies, hobbies_other, message_to_mrs_deer, founder_stage, founder_stage_other, primary_role, primary_role_other, struggles, struggles_other, years_as_founder, founder_personality, founder_personality_other')
    .eq('id', userId)
    .maybeSingle()

  if (!data) return { context: '' }

  let context = ''
  const profileData = data as Record<string, unknown>

  const userName = (profileData.preferred_name as string) || (profileData.name as string)
  const companyName = profileData.company_name as string | undefined

  if (profileData.primary_goal_text) {
    context += ` They described their goal as: "${profileData.primary_goal_text}". `
  }
  if (companyName) {
    context += ` They're building ${companyName}. `
  }
  if (profileData.destress_activity) {
    context += ` They destress by ${profileData.destress_activity}. `
  }
  if (profileData.hobbies && Array.isArray(profileData.hobbies) && profileData.hobbies.length > 0) {
    const hobbyList = (profileData.hobbies as string[]).join(', ')
    context += ` Outside work, they enjoy ${hobbyList}. `
    if (profileData.hobbies_other) context += ` They also mentioned: ${profileData.hobbies_other}. `
  }

  // Message to Mrs. Deer — use as primary personal lens; reference in prompts
  if (profileData.message_to_mrs_deer) {
    context += ` They shared this with you personally (use it to sound like you know them): "${profileData.message_to_mrs_deer}". `
  }

  const stage = (profileData.founder_stage === 'other' ? profileData.founder_stage_other : profileData.founder_stage) as string | undefined
  if (stage) context += ` Their startup stage: ${stage}. `
  const role = (profileData.primary_role === 'other' ? profileData.primary_role_other : profileData.primary_role) as string | undefined
  if (role) context += ` Their primary role: ${role}. `

  // Struggles and fears — reference these when relevant; validate these as part of growth
  if (profileData.struggles && Array.isArray(profileData.struggles) && profileData.struggles.length > 0) {
    const struggleList = (profileData.struggles as string[]).join(', ')
    context += ` Their stated struggles/fears include: ${struggleList}. When relevant, acknowledge these and reframe—e.g. "It makes sense that [X] feels heavy given [their struggle]. What would change if…?" `
    if (profileData.struggles_other) {
      context += ` They also wrote: ${profileData.struggles_other}. `
    }
  }

  if (profileData.years_as_founder) {
    context += ` They've been a founder for ${profileData.years_as_founder}. `
  }
  const personality = (profileData.founder_personality === 'other' ? profileData.founder_personality_other : profileData.founder_personality) as string | undefined
  if (personality) {
    context += ` Their founder personality/style: ${personality}. `
  }

  return {
    context: context.trim(),
    name: (profileData.name as string) || undefined,
    preferredName: (profileData.preferred_name as string) || undefined,
    companyName: companyName || undefined,
  }
}

/**
 * Get recent challenges for personalization: last 7 days of emergencies and/or repeated lessons from reviews
 */
async function getRecentChallengesContext(userId: string, targetDate: string): Promise<string> {
  const end = new Date(targetDate)
  const start = subDays(end, 7)
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')

  const db = getServerSupabase()
  const [emergenciesRes, reviewsRes] = await Promise.all([
    db
      .from('emergencies')
      .select('description, severity, fire_date')
      .eq('user_id', userId)
      .gte('fire_date', startStr)
      .lte('fire_date', endStr)
      .order('fire_date', { ascending: false })
      .limit(5),
    db
      .from('evening_reviews')
      .select('lessons')
      .eq('user_id', userId)
      .gte('review_date', startStr)
      .lte('review_date', endStr),
  ])

  const emergencies = emergenciesRes.data || []
  const reviews = reviewsRes.data || []
  const lessonsList: string[] = []
  reviews.forEach((r: { lessons?: string }) => {
    if (!r.lessons) return
    try {
      const parsed = typeof r.lessons === 'string' && r.lessons.startsWith('[') ? JSON.parse(r.lessons) : [r.lessons]
      if (Array.isArray(parsed)) lessonsList.push(...parsed.filter(Boolean).map((l: string) => l.trim()))
    } catch {
      lessonsList.push(r.lessons)
    }
  })

  let context = ''
  if (emergencies.length > 0) {
    const recent = emergencies.slice(0, 3).map((e: { description: string; severity: string }) => `${e.description} (${e.severity})`).join('; ')
    context += ` Recent fires (last 7 days): ${recent}. When relevant, reference these without judgment—e.g. "You've been carrying [theme]. What would make that load slightly lighter?" `
  }
  if (lessonsList.length > 0) {
    const unique = [...new Set(lessonsList)].slice(0, 5).join('; ')
    context += ` Recurring lessons they've written: ${unique}. Weave in when it deepens the insight. `
  }
  return context.trim()
}

/** Override for post_morning when client passes tasks/decision to avoid DB timing issues */
export interface PostMorningOverride {
  todayPlan: Array<{ description?: string; needle_mover?: boolean; [k: string]: unknown }>
  todayDecision: { decision: string; decision_type: string; why_this_decision?: string | null } | null
}

/** Override for post_evening when client passes review/tasks to avoid DB timing issues */
export interface PostEveningOverride {
  todayReview: { wins?: string | null; lessons?: string | null; journal?: string | null; mood?: number | null; energy?: number | null } | null
  todayPlan: Array<{ description?: string; completed?: boolean; needle_mover?: boolean; [k: string]: unknown }>
}

/** Override for morning when client passes yesterday's evening review to avoid DB timing issues */
export interface MorningOverride {
  yesterdayReview: { wins?: string | null; lessons?: string | null; journal?: string | null; mood?: number | null; energy?: number | null } | null
}

/**
 * Get user data needed for prompt generation
 */
async function getUserDataForPrompt(
  userId: string,
  promptType: PromptType,
  stage: FounderStage,
  targetDate?: string, // Format: 'yyyy-MM-dd', defaults to today
  postMorningOverride?: PostMorningOverride | null,
  postEveningOverride?: PostEveningOverride | null
): Promise<UserData> {
  const db = getServerSupabase()
  const patterns = await analyzeUserPatterns(userId, 14)

  let todayPlan = null
  let todayReview = null
  let todayDecision: UserData['todayDecision'] = null
  let weekData = null
  let monthData = null

  const dateToUse = targetDate || format(new Date(), 'yyyy-MM-dd')

  // When client passes tasks/decision for post_morning, use them directly to avoid DB timing/race
  if (promptType === 'post_morning' && postMorningOverride) {
    todayPlan = postMorningOverride.todayPlan || []
    todayDecision = postMorningOverride.todayDecision
  } else if (promptType === 'post_morning' || promptType === 'morning') {
    const [tasksRes, decisionRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', dateToUse),
      db
        .from('morning_decisions')
        .select('decision, decision_type, why_this_decision')
        .eq('user_id', userId)
        .eq('plan_date', dateToUse)
        .maybeSingle(),
    ])
    todayPlan = tasksRes.data || []
    todayDecision = decisionRes.data
  }

  // When client passes review/tasks for post_evening, use them directly to avoid DB timing/race
  if (promptType === 'post_evening' && postEveningOverride) {
    todayReview = postEveningOverride.todayReview
    todayPlan = postEveningOverride.todayPlan || []
  } else if (promptType === 'post_evening') {
    const [reviewRes, tasksRes] = await Promise.all([
      db
        .from('evening_reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('review_date', dateToUse)
        .maybeSingle(),
      db
        .from('morning_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', dateToUse)
        .order('task_order', { ascending: true }),
    ])
    todayReview = reviewRes.data
    todayPlan = tasksRes.data || []
  }

  if (promptType === 'weekly') {
    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    const [tasksRes, decisionsRes, reviewsRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', weekStartStr)
        .lte('plan_date', weekEndStr),
      db
        .from('morning_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', weekStartStr)
        .lte('plan_date', weekEndStr),
      db
        .from('evening_reviews')
        .select('*')
        .eq('user_id', userId)
        .gte('review_date', weekStartStr)
        .lte('review_date', weekEndStr),
    ])

    weekData = {
      tasks: tasksRes.data || [],
      decisions: decisionsRes.data || [],
      reviews: reviewsRes.data || [],
    }
  }

  if (promptType === 'monthly') {
    const monthStart = startOfMonth(new Date())
    const monthEnd = endOfMonth(new Date())
    const monthStartStr = format(monthStart, 'yyyy-MM-dd')
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

    const [tasksRes, decisionsRes, reviewsRes, emergenciesRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', monthStartStr)
        .lte('plan_date', monthEndStr),
      db
        .from('morning_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', monthStartStr)
        .lte('plan_date', monthEndStr),
      db
        .from('evening_reviews')
        .select('*')
        .eq('user_id', userId)
        .gte('review_date', monthStartStr)
        .lte('review_date', monthEndStr),
      db
        .from('emergencies')
        .select('*')
        .eq('user_id', userId)
        .gte('fire_date', monthStartStr)
        .lte('fire_date', monthEndStr),
    ])

    monthData = {
      tasks: tasksRes.data || [],
      decisions: decisionsRes.data || [],
      reviews: reviewsRes.data || [],
      emergencies: emergenciesRes.data || [],
    }
  }

  return {
    userId,
    stage,
    patterns,
    todayPlan,
    todayReview,
    todayDecision,
    weekData,
    monthData,
    targetDate: dateToUse,
  }
}

const FIRST_DAY_MIRROR_RULES = `CRITICAL: User has NO prior history. ONLY use what's in TODAY'S or YESTERDAY'S entry. DO NOT say "I recall", "lately you've been", or reference past conversations. DO NOT claim to see patterns. DO NOT interpret what it "represents"—just observe. Be a mirror, not a coach. Notice: multiple entries at same timestamp? Tension named clearly (e.g. "gut yes, risk no")? What did they do differently than most?`

type OnChunk = (chunk: string) => void

/**
 * Generate Gentle Architect morning prompt (loop-aware)
 * (Short, calm, 3 sentences + 1 question max)
 */
async function generateGentleArchitectPrompt(
  userData: UserData,
  userLang: ReturnType<typeof getUserLanguage>,
  hasHistory: boolean,
  onChunk?: OnChunk,
  morningOverride?: MorningOverride | null
): Promise<string> {
  const patterns = userData.patterns
  const targetDate = userData.targetDate
    || (userData.todayPlan && userData.todayPlan.length > 0 ? (userData.todayPlan[0] as any).plan_date : null)
    || format(new Date(), 'yyyy-MM-dd')

  // When client passes yesterday's review (e.g. from evening save), use it to avoid DB timing/race
  let yesterdayData: Record<string, unknown> | null = null
  if (morningOverride?.yesterdayReview) {
    yesterdayData = morningOverride.yesterdayReview as Record<string, unknown>
  } else {
    const yesterday = subDays(new Date(targetDate), 1)
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
    const db = getServerSupabase()
    const { data: yesterdayReview } = await db
      .from('evening_reviews')
      .select('wins, lessons, mood, energy')
      .eq('user_id', userData.userId)
      .eq('review_date', yesterdayStr)
      .maybeSingle()

    yesterdayData = yesterdayReview as Record<string, unknown> | null
  }

  const historyNote = hasHistory ? '' : `\n\n${FIRST_DAY_MIRROR_RULES}`
  const historyContext = hasHistory ? '' : "\n\nHISTORY: This appears to be their first entry or they have very limited history. DO NOT claim to see patterns or mention 'lately'—just focus on today's entry."
  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Morning insight: 80-120 words. STRUCTURE (internal only—do not output these as labels): OBSERVE (something specific from their data—quote their exact words) → VALIDATE (if low mood/energy or struggles) → REFRAME lightly → One open question. MUST use at least one of their exact phrases.' + NO_LABELS + ' BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, clichés, "futures you imagine", "save the space", "keep the day open", "trading in futures", "the weight of only the top priority", abstract metaphors. Think with them, not at them.' + historyNote

  const userGoal = await getUserGoal(userData.userId)
  const profileData = await getUserProfileData(userData.userId)
  const recentChallenges = await getRecentChallengesContext(userData.userId, targetDate)
  const displayName = profileData.preferredName || profileData.name
  const greeting = displayName ? `Good morning, ${displayName}` : 'Good morning'
  
  const contextBlock = hasHistory && profileData.context ? '\n\nCONTEXT ABOUT THIS FOUNDER (use to sound like you know them; reference struggles/fears when relevant):\n' + profileData.context : ''
  const challengesBlock = hasHistory && recentChallenges ? '\n\nRECENT CHALLENGES / REPEATED LESSONS (reference when it deepens the insight):\n' + recentChallenges : ''
  const hasYesterdayData = yesterdayData && (yesterdayData.wins || yesterdayData.lessons || yesterdayData.journal)
  const userPrompt = `Generate a personalized morning insight for a founder${displayName ? ` named ${displayName}` : ''}. Goal: ${userGoal || 'clarity and sustainable progress'}.${contextBlock}${challengesBlock}${historyContext}

CRITICAL: USE THEIR EXACT PHRASES from yesterday's data below. ${hasYesterdayData ? 'Quote at least one phrase they wrote.' : 'If data is sparse, reference what they did record (mood/energy)—do NOT say "blank" or "nothing to reflect on".'}

VOICE: Warm, specific, earned. USE THEIR EXACT PHRASES from yesterday's wins/lessons below—quote what they wrote. Validate emotional reality before reframing. Then reframe lightly. End with ONE question that shifts perspective. No product terms, no clichés, no abstract metaphors.

YESTERDAY'S DATA:
- Wins: ${(yesterdayData?.wins ? (typeof yesterdayData.wins === 'string' && yesterdayData.wins.startsWith('[') ? JSON.parse(yesterdayData.wins).join('; ') : yesterdayData.wins) : 'None recorded')}
- Lessons: ${(yesterdayData?.lessons ? (typeof yesterdayData.lessons === 'string' && yesterdayData.lessons.startsWith('[') ? JSON.parse(yesterdayData.lessons).join('; ') : yesterdayData.lessons) : 'None recorded')}
- Mood: ${yesterdayData?.mood ?? 'Not recorded'}/5
- Energy: ${yesterdayData?.energy ?? 'Not recorded'}/5

PATTERN CONTEXT (last 14 days):
- Total tasks: ${patterns?.taskPatterns.totalTasks || 0}
- Focus trend: ${patterns?.productivityPatterns.focusScoreTrend || 'steady'}
- Stage (use natural language only): ${toNaturalStage(userData.stage)}

Use stage naturally. BANNED: Needle Mover, Action Plan, Smart Constraints, raw stage codes, Keep shining.`

  const raw = await callAI(
    { systemPrompt, userPrompt, maxTokens: 150, temperature: 0.7 },
    onChunk
  )
  if (process.env.NODE_ENV === 'development') {
    const words = raw.split(/\s+/).length
    console.log('[morning insight word count]:', words)
  }
  return filterInsightLabels(raw)
}

// Stub implementations for the other prompt types.
// These are intentionally concise and pattern-focused.

async function analyzeMorningPlan(userData: UserData, userLang: ReturnType<typeof getUserLanguage>, hasHistory: boolean, onChunk?: OnChunk): Promise<string> {
  const totalTasks = userData.patterns?.taskPatterns.totalTasks ?? 0
  const needleRate = userData.patterns?.taskPatterns.needleMoversRate ?? 0
  const todayPlan = userData.todayPlan || []
  const needleMoversToday = todayPlan.filter((t: any) => t.needle_mover).length

  console.log('[analyzeMorningPlan] todayPlan count:', todayPlan.length, 'targetDate:', userData.targetDate, 'descriptions:', todayPlan.map((t: any) => t.description).filter(Boolean))

  const historyNote = hasHistory ? '' : `\n\n${FIRST_DAY_MIRROR_RULES}`
  const historyContext = hasHistory ? '' : "\n\nHISTORY: This appears to be their first entry or they have very limited history. DO NOT claim to see patterns or mention 'lately'—just focus on today's entry."
  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Post-morning insight: 70-110 words. STRUCTURE (internal only—do not output these as labels): OBSERVE (quote their exact task/decision text) → VALIDATE what they wrote → REFRAME lightly → One open question. MUST use at least one of their exact phrases from their tasks or decision. Address the specific tension they named.' + NO_LABELS + ' BANNED: Needle Mover, Action Plan, Smart Constraints, "top priority", "marked as top priority", stage codes, statistics, percentages, "futures you imagine", "save the space", "keep the day open", "the weight of only the top priority", abstract metaphors. Use qualitative observations only. Think with them, not at them.' + historyNote

  const profileData = await getUserProfileData(userData.userId)
  const displayName = profileData.preferredName || profileData.name
  const contextBlock = hasHistory && profileData.context ? '\n\nCONTEXT (use to sound like you know them; reference struggles/goals when relevant):\n' + profileData.context : ''
  const taskDescriptions = todayPlan.map((t: any) => t.description).filter(Boolean)
  const taskListForAI = taskDescriptions.length > 0
    ? taskDescriptions.map((d: string) => `"${d}"`).join(', ')
    : 'None recorded'

  const userPrompt = `Generate a personalized plan review for a founder${displayName ? ` named ${displayName}` : ''} who just saved their morning plan.${contextBlock}${historyContext}

CRITICAL: You MUST reference their actual tasks or decision. ${taskDescriptions.length > 0 ? `They wrote these tasks: ${taskListForAI}. Quote at least one by name.` : 'They may have written only a decision below. Reference what they wrote—do NOT say "zero tasks", "blank slate", or "empty plan".'}

VOICE: Warm, specific, earned. USE THEIR EXACT PHRASES from the data below—quote what they wrote. Address the specific tension they named (e.g. if they wrote "gut yes, risk no", name it back). Show what they hadn't noticed. End with ONE question that reframes. No product terms, no clichés, no abstract metaphors.

TODAY'S PLAN:
- Total tasks: ${todayPlan.length}
- Tasks they marked as most important: ${needleMoversToday}
- Task descriptions: ${taskDescriptions.join('; ') || 'None'}
${userData.todayDecision ? `
TODAY'S DECISION:
- Decision: ${userData.todayDecision.decision}
- Decision type: ${userData.todayDecision.decision_type}
- Why this decision: ${userData.todayDecision.why_this_decision || 'Not specified'}
` : ''}

${hasHistory ? `PATTERN CONTEXT (last 14 days):
- Total tasks: ${totalTasks}
- Share of tasks they treat as most important: ${Math.round(needleRate * 100)}%
- Stage (natural language only): ${toNaturalStage(userData.stage)}

` : ''}Generate an insight that shows them something they hadn't seen. Use warm, human language. Do NOT include any statistics or percentages. Speak like a wise friend, not a data analyst. End with one reframing question. Feel like a person who knows their journey, not a template.`

  const raw = await callAI(
    { systemPrompt, userPrompt, maxTokens: 150, temperature: 0.7 },
    onChunk
  )
  if (process.env.NODE_ENV === 'development') {
    const words = raw.split(/\s+/).length
    console.log('[post_morning insight word count]:', words)
  }
  return filterInsightLabels(raw)
}

async function reflectOnDay(userData: UserData, userLang: ReturnType<typeof getUserLanguage>, hasHistory: boolean, onChunk?: OnChunk): Promise<string> {
  const completionRate = userData.patterns?.taskPatterns.completionRate ?? 0

  // Get review data (already fetched for the target date in getUserDataForPrompt)
  const todayReview = userData.todayReview as Record<string, unknown> | null | undefined

  // Get tasks for the date (already fetched in getUserDataForPrompt)
  const tasks = userData.todayPlan || []
  const completedTasks = tasks.filter((t: any) => t.completed).length
  const totalTasks = tasks.length

  // Parse wins and lessons (handle JSON arrays)
  let winsText = ''
  let lessonsText = ''
  if (todayReview?.wins) {
    try {
      const winsVal = todayReview.wins
      const parsed = typeof winsVal === 'string' ? JSON.parse(winsVal) : winsVal
      winsText = Array.isArray(parsed) ? parsed.filter((w: string) => w?.trim()).join('; ') : String(winsVal)
    } catch {
      winsText = String(todayReview.wins)
    }
  }
  if (todayReview?.lessons) {
    try {
      const lessonsVal = todayReview.lessons
      const parsed = typeof lessonsVal === 'string' ? JSON.parse(lessonsVal) : lessonsVal
      lessonsText = Array.isArray(parsed) ? parsed.filter((l: string) => l?.trim()).join('; ') : String(lessonsVal)
    } catch {
      lessonsText = String(todayReview.lessons)
    }
  }

  const historyNote = hasHistory ? '' : `\n\n${FIRST_DAY_MIRROR_RULES}`
  const historyContext = hasHistory ? '' : "\n\nHISTORY: This appears to be their first entry or they have very limited history. DO NOT claim to see patterns or mention 'lately'—just focus on today's entry."
  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Evening insight: 100-150 words. STRUCTURE (internal only—do not output these as labels): OBSERVE (quote their exact wins/lessons/journal) → VALIDATE emotional state if relevant → REFRAME lightly → One open question. MUST use at least one of their exact phrases from wins, lessons, or journal. Address what they actually wrote.' + NO_LABELS + ' BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, clichés, "futures you imagine", "save the space", "keep the day open", "the weight of only the top priority", abstract metaphors. Think with them, not at them. Treat fear and exhaustion as part of growth.' + historyNote

  const profileData = await getUserProfileData(userData.userId)
  const displayName = profileData.preferredName || profileData.name
  const contextBlock = hasHistory && profileData.context ? '\n\nCONTEXT (reference struggles/fears when relevant; validate as part of growth):\n' + profileData.context : ''
  const hasEveningData = winsText || lessonsText || todayReview?.journal
  const userPrompt = `Generate a personalized evening reflection for a founder${displayName ? ` named ${displayName}` : ''}.${contextBlock}${historyContext}

CRITICAL: USE THEIR EXACT PHRASES from the data below. ${hasEveningData ? 'Quote at least one phrase from their wins, lessons, or journal.' : 'Reference what they did record (tasks, mood, energy)—do NOT say "blank", "nothing", or "empty reflection".'}

VOICE: Warm, specific, earned. USE THEIR EXACT PHRASES from wins, lessons, or journal below—quote what they wrote. If mood or energy was low, validate first. Then reframe lightly. End with ONE question that reframes. No product terms, no clichés, no abstract metaphors.

TODAY'S DATA:
- Tasks planned: ${totalTasks}
- Tasks completed: ${completedTasks}${totalTasks > 0 ? ` (${Math.round((completedTasks / totalTasks) * 100)}%)` : ''}
- Top-priority tasks completed: ${tasks.filter((t: any) => t.needle_mover && t.completed).length}
- Mood: ${todayReview?.mood != null ? `${todayReview.mood}/5` : 'Not recorded'}
- Energy: ${todayReview?.energy != null ? `${todayReview.energy}/5` : 'Not recorded'}
- Wins: ${winsText || 'None recorded'}
- Lessons: ${lessonsText || 'None recorded'}
- Journal: ${todayReview?.journal ? String(todayReview.journal).substring(0, 200) : 'None'}

${hasHistory ? `PATTERN CONTEXT (last 14 days):
- Overall completion rate: ${Math.round(completionRate * 100)}%
- Total tasks: ${userData.patterns?.taskPatterns.totalTasks ?? 0}
- Stage (natural language only): ${toNaturalStage(userData.stage)}

` : ''}Write as a wise friend: one or two short paragraphs + one open question. Use natural stage language only. BANNED: Needle Mover, Action Plan, Smart Constraints, raw stage codes, Keep shining.`

  const raw = await callAI(
    { systemPrompt, userPrompt, maxTokens: 200, temperature: 0.7 },
    onChunk
  )
  if (process.env.NODE_ENV === 'development') {
    const words = raw.split(/\s+/).length
    console.log('[evening insight word count]:', words)
  }
  return filterInsightLabels(raw)
}

async function generateWeeklyInsight(userData: UserData, userLang: ReturnType<typeof getUserLanguage>): Promise<string> {
  const patterns = userData.patterns
  const weekData = userData.weekData || { tasks: [], decisions: [], reviews: [] }
  const weekTasks = weekData.tasks || []
  const weekReviews = weekData.reviews || []
  const weekDecisions = weekData.decisions || []

  // Extract raw content for quoting
  const taskDescriptions = weekTasks.map((t: any) => t.description).filter(Boolean).join('; ')
  const decisionTexts = weekDecisions.map((d: any) => `${d.decision}${d.why_this_decision ? ` (why: ${d.why_this_decision})` : ''}`).filter(Boolean).join('; ')
  const winsList: string[] = []
  const lessonsList: string[] = []
  weekReviews.forEach((r: any) => {
    if (r.wins) {
      try {
        const parsed = typeof r.wins === 'string' && r.wins.startsWith('[') ? JSON.parse(r.wins) : [r.wins]
        if (Array.isArray(parsed)) winsList.push(...parsed.filter(Boolean).map((w: string) => w.trim()))
      } catch {
        winsList.push(r.wins)
      }
    }
    if (r.lessons) {
      try {
        const parsed = typeof r.lessons === 'string' && r.lessons.startsWith('[') ? JSON.parse(r.lessons) : [r.lessons]
        if (Array.isArray(parsed)) lessonsList.push(...parsed.filter(Boolean).map((l: string) => l.trim()))
      } catch {
        lessonsList.push(r.lessons)
      }
    }
  })

  const profileData = await getUserProfileData(userData.userId)
  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Weekly insight: max 150 words. STRUCTURE (internal only—do not output these as labels): OBSERVE (quote specific wins/lessons/tasks from their week) → VALIDATE → REFRAME lightly → One open question. MUST use at least one of their exact phrases.' + NO_LABELS + ' BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, "futures you imagine", "save the space", "keep the day open", "the weight of only the top priority", abstract metaphors. Think with them, not at them.'

  const hasWeekData = taskDescriptions || decisionTexts || winsList.length > 0 || lessonsList.length > 0
  const userPrompt = `Generate a personalized weekly insight for a founder.${profileData.context ? '\n\nCONTEXT (reference struggles/goals when relevant):\n' + profileData.context : ''}

CRITICAL: USE THEIR EXACT PHRASES from the data below. ${hasWeekData ? 'Quote at least one phrase they wrote.' : 'Reference what they did record—do NOT say "empty week" or "nothing to reflect on".'}

THIS WEEK'S DATA (quote their exact words in your response):
- Tasks they wrote: ${taskDescriptions || 'None'}
- Decisions they wrote: ${decisionTexts || 'None'}
- Wins they wrote: ${[...new Set(winsList)].slice(0, 10).join('; ') || 'None'}
- Lessons they wrote: ${[...new Set(lessonsList)].slice(0, 10).join('; ') || 'None'}
- Evening reviews: ${weekReviews.length}
- Completion rate: ${patterns?.taskPatterns.completionRate ? Math.round(patterns.taskPatterns.completionRate * 100) : 0}%
- Stage (natural language only): ${toNaturalStage(userData.stage)}

VOICE: Warm, specific. USE THEIR EXACT PHRASES from above—quote what they wrote. Show what they hadn't noticed. End with one question that reframes the week. No product terms, clichés, or abstract metaphors. Feel like a person who knows their journey.`

  const raw = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    maxTokens: 250,
    temperature: 0.7,
  })
  return filterInsightLabels(raw)
}

async function generateMonthlyInsight(userData: UserData, userLang: ReturnType<typeof getUserLanguage>): Promise<string> {
  const patterns = userData.patterns
  const monthData = userData.monthData || { tasks: [], decisions: [], reviews: [], emergencies: [] }
  
  let totalTasks = 0
  let completedTasks = 0
  let totalDecisions = 0
  let emergenciesResolved = 0

  if (patterns) {
    totalTasks = patterns.taskPatterns.totalTasks
    completedTasks = Math.round(totalTasks * (patterns.taskPatterns.completionRate ?? 0))
    totalDecisions = patterns.decisionPatterns.total ?? 0
    emergenciesResolved = Math.round(
      (patterns.emergencyPatterns.total ?? 0) *
        (patterns.emergencyPatterns.resolutionRate ?? 0)
    )
  }

  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

  // Extract raw content for quoting
  const monthTasks = monthData.tasks || []
  const monthReviews = monthData.reviews || []
  const monthEmergencies = monthData.emergencies || []
  const taskDescriptions = monthTasks.slice(0, 15).map((t: any) => t.description).filter(Boolean).join('; ')
  const winsList: string[] = []
  const lessonsList: string[] = []
  monthReviews.forEach((r: any) => {
    if (r.wins) {
      try {
        const parsed = typeof r.wins === 'string' && r.wins.startsWith('[') ? JSON.parse(r.wins) : [r.wins]
        if (Array.isArray(parsed)) winsList.push(...parsed.filter(Boolean).map((w: string) => w.trim()))
      } catch {
        winsList.push(r.wins)
      }
    }
    if (r.lessons) {
      try {
        const parsed = typeof r.lessons === 'string' && r.lessons.startsWith('[') ? JSON.parse(r.lessons) : [r.lessons]
        if (Array.isArray(parsed)) lessonsList.push(...parsed.filter(Boolean).map((l: string) => l.trim()))
      } catch {
        lessonsList.push(r.lessons)
      }
    }
  })
  const emergencyDescriptions = monthEmergencies.map((e: any) => e.description).filter(Boolean).join('; ')

  const db = getServerSupabase()
  const { data: profile } = await db
    .from('user_profiles')
    .select('longest_streak')
    .eq('id', userData.userId)
    .maybeSingle()

  const profileData = await getUserProfileData(userData.userId)
  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Monthly insight: max 250 words. STRUCTURE (internal only—do not output these as labels): OBSERVE (quote specific themes from their month) → VALIDATE → REFRAME lightly → One open question for next month. MUST use at least one of their exact phrases from tasks, wins, lessons, or emergencies.' + NO_LABELS + ' BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, "futures you imagine", "save the space", "keep the day open", "the weight of only the top priority", abstract metaphors. Think with them, not at them.'

  const hasMonthData = taskDescriptions || winsList.length > 0 || lessonsList.length > 0 || emergencyDescriptions
  const userPrompt = `Generate a personalized monthly insight for a founder.${profileData.context ? '\n\nCONTEXT (reference struggles/goals when relevant):\n' + profileData.context : ''}

CRITICAL: USE THEIR EXACT PHRASES from the data below. ${hasMonthData ? 'Quote at least one phrase they wrote.' : 'Reference what they did record—do NOT say "empty month" or "nothing to reflect on".'}

THIS MONTH'S DATA (quote their exact words in your response):
- Tasks they wrote: ${taskDescriptions || 'None'}
- Wins they wrote: ${[...new Set(winsList)].slice(0, 12).join('; ') || 'None'}
- Lessons they wrote: ${[...new Set(lessonsList)].slice(0, 12).join('; ') || 'None'}
- Emergencies they wrote: ${emergencyDescriptions || 'None'}
- Total tasks: ${totalTasks}, Completed: ${completedTasks} (${Math.round(completionRate * 100)}%)
- Longest streak: ${safeGet(profile, 'longest_streak', 0)} days
- Stage (natural language only): ${toNaturalStage(userData.stage)}

VOICE: USE THEIR EXACT PHRASES from above—quote what they wrote. Show what they hadn't noticed. End with one reframing question for next month. No product terms, clichés, or abstract metaphors.`

  const raw = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    maxTokens: 400,
    temperature: 0.7,
  })
  return filterInsightLabels(raw)
}

/**
 * Generate a one-off emergency insight when the user logs a fire.
 * Short, calm, and pattern-aware.
 */
export async function generateEmergencyInsight(
  userId: string,
  emergencyDescription: string,
  severity: 'hot' | 'warm' | 'contained',
  promptDate?: string, // Format: 'yyyy-MM-dd', defaults to today
  onChunk?: OnChunk
): Promise<string> {
  // Get user's current stage (same mechanism as other prompts)
  let stage = await getUserStage(userId)
  if (!stage) {
    stage = await detectFounderStage(userId)
    await updateUserStage(userId, stage)
  }

  // Look at recent emergency patterns (last 14 days)
  const patterns = await analyzeUserPatterns(userId, 14)
  const totalEmergencies = patterns?.emergencyPatterns.total ?? 0

  const profileData = await getUserProfileData(userId)
  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Emergency insight: max 80 words. STRUCTURE (internal only—do not output these as labels): OBSERVE (quote their exact fire description) → VALIDATE the weight → REFRAME lightly → One open question. MUST use a phrase from their fire description. Address what they actually wrote.' + NO_LABELS + ' BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, "futures you imagine", "save the space", "keep the day open", "the weight of only the top priority", abstract metaphors. Calm, supportive, never judgmental. Think with them, not at them.'

  const userPrompt = `Generate a personalized emergency insight for a founder who just logged a fire.${profileData.context ? '\n\nCONTEXT (reference struggles when relevant):\n' + profileData.context : ''}

CRITICAL: You MUST quote a phrase from their fire description below. Do not give generic advice—reference what they actually wrote.

EMERGENCY DETAILS:
- Description: ${emergencyDescription}
- Severity: ${severity}
- Stage (natural language only): ${toNaturalStage(stage)}

PATTERN CONTEXT (last 14 days):
- Total emergencies: ${totalEmergencies}
- Resolution rate: ${Math.round((patterns?.emergencyPatterns.resolutionRate ?? 0) * 100)}%

VOICE: USE THEIR EXACT PHRASES from the fire description above—quote what they wrote. Acknowledge and validate the weight. Reframe lightly. End with one open question. Supportive, never prescriptive. No abstract metaphors.`

  const targetDate = promptDate || format(new Date(), 'yyyy-MM-dd')
  
  const db = getServerSupabase()
  const { data: existingPrompts } = await db
    .from('personal_prompts')
    .select('generation_count')
    .eq('user_id', userId)
    .eq('prompt_type', 'emergency')
    .eq('prompt_date', targetDate)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // TEMPORARY: Generation limit disabled for debugging - always generate new
  // if (existingPrompts && (existingPrompts.generation_count || 1) >= 3) {
  //   const { data: latestPrompt } = await supabase...
  //   return latestPrompt.prompt_text
  // }
  
  const rawResponse = await callAI(
    { systemPrompt, userPrompt, maxTokens: 200, temperature: 0.7 },
    onChunk
  )
  const aiResponse = filterInsightLabels(rawResponse)

  console.log('[Personal Coaching] Emergency: AI insight generated successfully')
  const existingCount = safeGet(existingPrompts, 'generation_count', 0) as number
  const generationCount = existingCount > 0 ? existingCount + 1 : 1

  const insertData = {
    user_id: userId,
    prompt_text: aiResponse,
    prompt_type: 'emergency',
    stage_context: stage,
    prompt_date: targetDate,
    generation_count: generationCount,
  }

  const serverSupabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit personal_prompts
  const { data: insertedData, error: insertError } = await (serverSupabase.from('personal_prompts') as any)
    .insert(insertData as any)
    .select()

  if (insertError) {
    console.error('[SAVE INSIGHT] ❌ Emergency insight insert FAILED:', insertError)
  } else {
    console.log('[SAVE INSIGHT] ✅ Emergency insight insert SUCCEEDED:', insertedData?.[0]?.id)
  }

  return aiResponse
}

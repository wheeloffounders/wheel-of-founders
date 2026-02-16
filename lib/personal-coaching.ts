import { supabase } from './supabase'
import { getServerSupabase } from './server-supabase'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { detectFounderStage, getUserStage, updateUserStage } from './stage-detection'
import { GENTLE_ARCHITECT, MRS_DEER_RULES, FounderStage, toNaturalStage } from './mrs-deer'
import { analyzeUserPatterns, UserPatterns } from './analysis-engine'
import { generateAIPrompt, getAIModel } from './ai-client'
import { getUserGoal, getUserLanguage } from './user-language'

export type PromptType = 'morning' | 'post_morning' | 'post_evening' | 'weekly' | 'monthly' | 'emergency'

interface UserData {
  userId: string
  stage: FounderStage
  patterns: UserPatterns | null
  todayPlan?: any
  todayReview?: any
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
 */
export async function generateProPlusPrompt(
  userId: string,
  promptType: PromptType,
  promptDate?: string // Format: 'yyyy-MM-dd', defaults to today
): Promise<string | null> {
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
  console.log('[Personal Coaching] Generating new prompt (3-gen limit temporarily disabled for debugging)')

  // Get user data based on prompt type (uses targetDate for date-specific prompts)
  const userData = await getUserDataForPrompt(userId, promptType, stage, targetDate)

  if (promptType === 'morning') {
    console.log('[Personal Coaching] Generating morning prompt for', targetDate, '— will use yesterday\'s (', format(subDays(new Date(targetDate), 1), 'yyyy-MM-dd'), ') evening review')
  }

  // Generate prompt based on type
  let promptText: string | null = null

  switch (promptType) {
    case 'morning':
      promptText = await generateGentleArchitectPrompt(userData, userLang)
      break
    case 'post_morning':
      promptText = await analyzeMorningPlan(userData, userLang)
      break
    case 'post_evening':
      promptText = await reflectOnDay(userData, userLang)
      break
    case 'weekly':
      promptText = await generateWeeklyInsight(userData, userLang)
      break
    case 'monthly':
      promptText = await generateMonthlyInsight(userData, userLang)
      break
  }

  if (!promptText) return null

  // Calculate generation count for date-specific prompts (db already set above)
  let generationCount = 1
  if (['morning', 'post_morning', 'post_evening'].includes(promptType)) {
    const { data: existingPrompts } = await db
      .from('personal_prompts')
      .select('generation_count')
      .eq('user_id', userId)
      .eq('prompt_type', promptType)
      .eq('prompt_date', targetDate)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
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
  
  console.log('[SAVE INSIGHT] Attempting to save to personal_prompts (server client):', {
    userId,
    promptType,
    targetDate,
    generationCount,
    promptTextLength: promptText.length,
    promptTextPreview: promptText.substring(0, 100),
    prompt_date: insertData.prompt_date,
  })
  
  const { data: insertedData, error: insertError } = await db
    .from('personal_prompts')
    .insert(insertData)
    .select()
  
  if (insertError) {
    console.error('[SAVE INSIGHT] ❌ Insert FAILED:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    })
    // Don't throw - still return the prompt text so user sees it
  } else {
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
 * Get user profile data for AI context
 */
async function getUserProfileData(userId: string): Promise<{ context: string; name?: string; preferredName?: string; companyName?: string }> {
  const { data } = await supabase
    .from('user_profiles')
    .select('name, preferred_name, company_name, primary_goal_text, destress_activity, hobbies, hobbies_other, message_to_mrs_deer, founder_stage, founder_stage_other, primary_role, primary_role_other, struggles, struggles_other, years_as_founder, founder_personality, founder_personality_other')
    .eq('id', userId)
    .maybeSingle()

  if (!data) return { context: '' }

  let context = ''
  
  // Name and company for personalization (prefer preferred_name over name)
  const userName = data.preferred_name || data.name
  const companyName = data.company_name

  // Primary goal text
  if (data.primary_goal_text) {
    context += ` They described their goal as: "${data.primary_goal_text}". `
  }
  
  // Company name
  if (companyName) {
    context += ` They're building ${companyName}. `
  }

  // Destress activity
  if (data.destress_activity) {
    context += ` They destress by ${data.destress_activity}. `
  }

  // Hobbies
  if (data.hobbies && data.hobbies.length > 0) {
    const hobbyList = data.hobbies.join(', ')
    context += ` Outside work, they enjoy ${hobbyList}. `
    if (data.hobbies_other) {
      context += ` They also mentioned: ${data.hobbies_other}. `
    }
  }

  // Message to Mrs. Deer (personal introduction)
  if (data.message_to_mrs_deer) {
    context += ` They shared this with you personally: "${data.message_to_mrs_deer}". `
  }

  // Stage
  const stage = data.founder_stage === 'other' ? data.founder_stage_other : data.founder_stage
  if (stage) {
    context += ` Their startup stage: ${stage}. `
  }

  // Role
  const role = data.primary_role === 'other' ? data.primary_role_other : data.primary_role
  if (role) {
    context += ` Their primary role: ${role}. `
  }

  // Struggles
  if (data.struggles && data.struggles.length > 0) {
    const struggleList = data.struggles.join(', ')
    context += ` Their biggest struggles include: ${struggleList}. `
    if (data.struggles_other) {
      context += ` They also mentioned: ${data.struggles_other}. `
    }
  }

  // Years as founder
  if (data.years_as_founder) {
    context += ` They've been a founder for ${data.years_as_founder}. `
  }

  // Personality
  const personality = data.founder_personality === 'other' ? data.founder_personality_other : data.founder_personality
  if (personality) {
    context += ` Their founder personality/style: ${personality}. `
  }

  return { 
    context: context.trim(), 
    name: data.name || undefined, 
    preferredName: data.preferred_name || undefined,
    companyName: companyName || undefined 
  }
}

/**
 * Get user data needed for prompt generation
 */
async function getUserDataForPrompt(
  userId: string,
  promptType: PromptType,
  stage: FounderStage,
  targetDate?: string // Format: 'yyyy-MM-dd', defaults to today
): Promise<UserData> {
  const patterns = await analyzeUserPatterns(userId, 14)

  let todayPlan = null
  let todayReview = null
  let weekData = null
  let monthData = null

  const dateToUse = targetDate || format(new Date(), 'yyyy-MM-dd')

  if (promptType === 'post_morning' || promptType === 'morning') {
    const { data } = await supabase
      .from('morning_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', dateToUse)
    todayPlan = data || []
  }

  if (promptType === 'post_evening') {
    const { data } = await supabase
      .from('evening_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('review_date', dateToUse)
      .maybeSingle()
    todayReview = data
  }

  if (promptType === 'weekly') {
    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    const [tasksRes, decisionsRes, reviewsRes] = await Promise.all([
      supabase
        .from('morning_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', weekStartStr)
        .lte('plan_date', weekEndStr),
      supabase
        .from('morning_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', weekStartStr)
        .lte('plan_date', weekEndStr),
      supabase
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
      supabase
        .from('morning_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', monthStartStr)
        .lte('plan_date', monthEndStr),
      supabase
        .from('morning_decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', monthStartStr)
        .lte('plan_date', monthEndStr),
      supabase
        .from('evening_reviews')
        .select('*')
        .eq('user_id', userId)
        .gte('review_date', monthStartStr)
        .lte('review_date', monthEndStr),
      supabase
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
    weekData,
    monthData,
    targetDate: dateToUse,
  }
}

/**
 * Generate Gentle Architect morning prompt (loop-aware)
 * (Short, calm, 3 sentences + 1 question max)
 */
async function generateGentleArchitectPrompt(userData: UserData, userLang: ReturnType<typeof getUserLanguage>): Promise<string> {
  const patterns = userData.patterns
  
  // Get yesterday's review relative to the morning we're generating for.
  // When evening save triggers next day's morning prompt, todayPlan is empty but targetDate is set (e.g. Feb 15).
  // Use userData.targetDate when available so we fetch yesterday (Feb 14) evening review, not the wrong day.
  const targetDate = userData.targetDate 
    || (userData.todayPlan && userData.todayPlan.length > 0 ? (userData.todayPlan[0] as any).plan_date : null) 
    || format(new Date(), 'yyyy-MM-dd')
  
  const yesterday = subDays(new Date(targetDate), 1)
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
  const { data: yesterdayReview } = await supabase
    .from('evening_reviews')
    .select('wins, lessons, mood, energy')
    .eq('user_id', userData.userId)
    .eq('review_date', yesterdayStr)
    .maybeSingle()

  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Morning insight: max 100 words. STRUCTURE: (1) Observe something specific from yesterday (2) Reframe unexpectedly (3) One open question. BANNED: Needle Mover, Action Plan, Smart Constraints, BALANCED_STAGE, clichés. Use toNaturalStage for stage—never raw codes. Think with them, not at them.'

  // Get user's goal and profile data for context
  const userGoal = await getUserGoal(userData.userId)
  const profileData = await getUserProfileData(userData.userId)
  const displayName = profileData.preferredName || profileData.name
  const greeting = displayName ? `Good morning, ${displayName}` : 'Good morning'
  
  const userPrompt = `Generate a personalized morning insight for a founder${displayName ? ` named ${displayName}` : ''}. The founder's goal is: ${userGoal || 'general clarity'}.${profileData.context ? '\n\nADDITIONAL CONTEXT ABOUT THIS FOUNDER:\n' + profileData.context : ''}

VOICE: Think WITH them, not AT them. Show what they hadn't noticed. Structure: (1) Observe something specific (2) Reframe unexpectedly (3) One open question. Never use product terms or clichés. Aim for surprise, brevity, humanity.

YESTERDAY'S DATA:
- Wins: ${yesterdayReview?.wins ? (typeof yesterdayReview.wins === 'string' && yesterdayReview.wins.startsWith('[') ? JSON.parse(yesterdayReview.wins).join('; ') : yesterdayReview.wins) : 'None recorded'}
- Lessons: ${yesterdayReview?.lessons ? (typeof yesterdayReview.lessons === 'string' && yesterdayReview.lessons.startsWith('[') ? JSON.parse(yesterdayReview.lessons).join('; ') : yesterdayReview.lessons) : 'None recorded'}
- Mood: ${yesterdayReview?.mood || 'Not recorded'}/5
- Energy: ${yesterdayReview?.energy || 'Not recorded'}/5

PATTERN CONTEXT (last 14 days):
- Total tasks: ${patterns?.taskPatterns.totalTasks || 0}
- Focus trend: ${patterns?.productivityPatterns.focusScoreTrend || 'steady'}
- Stage (describe naturally, e.g. "in this season of balance"): ${toNaturalStage(userData.stage)}

Follow STRUCTURE: Observe → Reframe → Question. Show what they hadn't noticed. Use stage naturally (e.g. "${toNaturalStage(userData.stage)}")—never raw codes. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, Keep shining.`

  const aiResponse = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    model: getAIModel(),
    maxTokens: 150,
    temperature: 0.7,
  })

  if (aiResponse) return aiResponse

  // Fallback template
  if (!patterns) {
    return [
      'Good morning. Ready to turn yesterday into a better today?',
      '',
      'Start with one clear priority—what would genuinely move you forward if it were the only thing you finished?',
      '',
      `Today's focusing question: What one thing today would matter most?`,
    ].join('\n')
  }

  let para1 = 'This is a meaningful turn.'
  if (yesterdayReview?.wins) {
    const winsText = typeof yesterdayReview.wins === 'string' && yesterdayReview.wins.startsWith('[') 
      ? JSON.parse(yesterdayReview.wins).join('; ') 
      : yesterdayReview.wins
    para1 += ` Yesterday's wins ("${winsText}") tell you something about what's working.`
  } else if (patterns.taskPatterns.totalTasks > 0) {
    para1 += " Yesterday still contributed, even if it didn't feel perfect."
  }

  const focusTrend = patterns.productivityPatterns.focusScoreTrend || 'steady'
  const line2 = `Over the last 14 days, you've generally followed through when one clear priority leads—today can follow that same pattern.`
  const line3 = `Your focus has been ${focusTrend}. Yesterday is one more data point, not a verdict.`
  const question = "What's the smallest change that would make today feel more intentional than yesterday?"

  return [para1, '', line2, line3, '', question].join('\n')
}

// Stub implementations for the other prompt types.
// These are intentionally concise and pattern-focused.

async function analyzeMorningPlan(userData: UserData, userLang: ReturnType<typeof getUserLanguage>): Promise<string> {
  const totalTasks = userData.patterns?.taskPatterns.totalTasks ?? 0
  const needleRate = userData.patterns?.taskPatterns.needleMoverRate ?? 0
  const todayPlan = userData.todayPlan || []
  const needleMoversToday = todayPlan.filter((t: any) => t.needle_mover).length

  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Post-morning insight: max 100 words. STRUCTURE: Observe → Reframe → Question. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes. Use natural stage language only. Think with them, not at them.'

  const profileData = await getUserProfileData(userData.userId)
  const displayName = profileData.preferredName || profileData.name
  const userPrompt = `Generate a personalized plan review insight for a founder${displayName ? ` named ${displayName}` : ''} who just saved their morning plan.${profileData.context ? '\n\nADDITIONAL CONTEXT ABOUT THIS FOUNDER:\n' + profileData.context : ''}

VOICE: Think WITH them, not AT them. Show what they hadn't noticed—don't echo what they already know.
STRUCTURE: (1) Observe something specific from their plan (2) Reframe it unexpectedly (3) End with one open question.
EXAMPLE: "After two weeks of maintenance, you're finally moving again. But here's the thing — you're not abandoning rest to do it. You're learning to hold both. That's rarer than any launch."
Never use product terms (Needle Mover, Action Plan, stage codes) or clichés (Keep shining). Aim for surprise, specificity, brevity.

TODAY'S PLAN:
- Total tasks: ${todayPlan.length}
- Tasks they marked as top priority: ${needleMoversToday}
- Task descriptions: ${todayPlan.map((t: any) => t.description).join('; ') || 'None'}

PATTERN CONTEXT (last 14 days):
- Total tasks: ${totalTasks}
- Share of tasks they treat as top priority: ${Math.round(needleRate * 100)}%
- Stage (describe naturally): ${toNaturalStage(userData.stage)}

Generate an insight that shows them something they hadn't seen. Reframe their situation unexpectedly. End with one open question. Make it feel like it came from a person, not a prompt.`

  const aiResponse = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    model: getAIModel(),
    maxTokens: 150,
    temperature: 0.7,
  })

  if (aiResponse) return aiResponse

  // Fallback template
  const lines: string[] = []
  lines.push('This is a clear, intentional plan.')
  if (totalTasks > 0) {
    lines.push(
      `Over the last 14 days, you've tended to focus on what matters most—today's list fits that pattern.`
    )
  }
  lines.push('If you removed or delegated just one non-essential task, where would you free the most attention?')
  return lines.join('\n')
}

async function reflectOnDay(userData: UserData, userLang: ReturnType<typeof getUserLanguage>): Promise<string> {
  const completionRate = userData.patterns?.taskPatterns.completionRate ?? 0

  // Get review data (already fetched for the target date in getUserDataForPrompt)
  const todayReview = userData.todayReview
  
  // Get tasks for the date (already fetched in getUserDataForPrompt)
  const tasks = userData.todayPlan || []
  const completedTasks = tasks.filter((t: any) => t.completed).length
  const totalTasks = tasks.length

  // Parse wins and lessons (handle JSON arrays)
  let winsText = ''
  let lessonsText = ''
  if (todayReview?.wins) {
    try {
      const parsed = JSON.parse(todayReview.wins)
      winsText = Array.isArray(parsed) ? parsed.filter(w => w?.trim()).join('; ') : todayReview.wins
    } catch {
      winsText = todayReview.wins
    }
  }
  if (todayReview?.lessons) {
    try {
      const parsed = JSON.parse(todayReview.lessons)
      lessonsText = Array.isArray(parsed) ? parsed.filter(l => l?.trim()).join('; ') : todayReview.lessons
    } catch {
      lessonsText = todayReview.lessons
    }
  }

  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Evening insight: max 120 words. STRUCTURE: (1) Observe something specific from today (2) Reframe unexpectedly (3) One open question. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, clichés. Think with them, not at them.'

  const profileData = await getUserProfileData(userData.userId)
  const displayName = profileData.preferredName || profileData.name
  const userPrompt = `Generate a personalized evening reflection insight for a founder${displayName ? ` named ${displayName}` : ''}.${profileData.context ? '\n\nADDITIONAL CONTEXT ABOUT THIS FOUNDER:\n' + profileData.context : ''}

VOICE: Think WITH them, not AT them. Show what they hadn't noticed. (1) Observe something specific (2) Reframe unexpectedly (3) One open question. Never use product terms or clichés. Surprise, brevity, humanity.

TODAY'S DATA:
- Tasks planned: ${totalTasks}
- Tasks completed: ${completedTasks}${totalTasks > 0 ? ` (${Math.round((completedTasks / totalTasks) * 100)}%)` : ''}
- Top-priority tasks completed: ${tasks.filter(t => t.needle_mover && t.completed).length}
- Mood: ${todayReview?.mood ? `${todayReview.mood}/5` : 'Not recorded'}
- Energy: ${todayReview?.energy ? `${todayReview.energy}/5` : 'Not recorded'}
- Wins: ${winsText || 'None recorded'}
- Lessons: ${lessonsText || 'None recorded'}
- Journal: ${todayReview?.journal ? todayReview.journal.substring(0, 200) : 'None'}

PATTERN CONTEXT (last 14 days):
- Overall completion rate: ${Math.round(completionRate * 100)}%
- Total tasks: ${userData.patterns?.taskPatterns.totalTasks ?? 0}
- Stage (describe naturally, e.g. "in this season of balance"): ${toNaturalStage(userData.stage)}

Follow STRUCTURE: Observe → Reframe → Question. Do NOT use section headers or formulas—write as a wise friend would: one or two short paragraphs + one open question. If they had wins, celebrate specifically. If completion was low, frame as useful data, not failure. Use natural stage language (e.g. "${toNaturalStage(userData.stage)}")—never raw codes. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes, Keep shining.`

  const aiResponse = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    model: getAIModel(),
    maxTokens: 200,
    temperature: 0.7,
  })

  if (aiResponse) return aiResponse

  // Fallback to template if LLM fails
  const completionRatePercent = Math.round(completionRate * 100)
  return `This reflection is a meaningful checkpoint.\n\nIn the last couple of weeks you've completed about ${completionRatePercent}% of what you plan—today adds another data point to that pattern.\n\nIf you changed just one part tomorrow (planning, doing, or reflecting), which shift would reduce the most friction?`
}

async function generateWeeklyInsight(userData: UserData, userLang: ReturnType<typeof getUserLanguage>): Promise<string> {
  const patterns = userData.patterns
  const weekData = userData.weekData || { tasks: [], decisions: [], reviews: [] }
  const weekTasks = weekData.tasks || []
  const weekReviews = weekData.reviews || []

  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Weekly insight: max 150 words. STRUCTURE: Observe → Reframe → Question. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes. Use natural stage language only. Think with them, not at them.'

  const userPrompt = `Generate a personalized weekly insight for a founder.

THIS WEEK'S DATA:
- Tasks: ${weekTasks.length}
- Decisions: ${weekData.decisions?.length || 0}
- Evening reviews: ${weekReviews.length}
- Completion rate: ${patterns?.taskPatterns.completionRate ? Math.round(patterns.taskPatterns.completionRate * 100) : 0}%
- Stage (describe naturally): ${toNaturalStage(userData.stage)}

PATTERN CONTEXT:
- Focus trend: ${patterns?.productivityPatterns.focusScoreTrend || 'steady'}
- Share of tasks they treat as top priority: ${patterns?.taskPatterns.needleMoverRate ? Math.round(patterns.taskPatterns.needleMoverRate * 100) : 0}%

VOICE: Think WITH them, not AT them. Show what they hadn't noticed. (1) Observe (2) Reframe unexpectedly (3) One open question. Never product terms or clichés. Surprise, brevity.

Generate a weekly insight that shows them something they hadn't seen. End with one open question. Feel like a person, not a prompt.`

  const aiResponse = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    model: getAIModel(),
    maxTokens: 250,
    temperature: 0.7,
  })

  if (aiResponse) return aiResponse

  // Fallback template
  const lines: string[] = []
  lines.push('Weekly loop review.')
  if (patterns) {
    lines.push(
      `Your week shows a consistent pattern in how you handle what matters most, routine work, and the unexpected—this is the current architecture of your days.`
    )
  }
  lines.push(
    'Looking at the past 7 days, which small structural change would most improve next week?'
  )
  return lines.join('\n')
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
    totalDecisions = patterns.decisionPatterns.totalDecisions ?? 0
    emergenciesResolved = Math.round(
      (patterns.emergencyPatterns.total ?? 0) *
        (patterns.emergencyPatterns.resolutionRate ?? 0)
    )
  }

  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('longest_streak')
    .eq('id', userData.userId)
    .maybeSingle()

  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Monthly insight: max 250 words. STRUCTURE: Observe → Reframe → Question. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes. Use natural stage language only. Think with them, not at them.'

  const userPrompt = `Generate a personalized monthly insight for a founder.

THIS MONTH'S DATA:
- Total tasks: ${totalTasks}
- Completed: ${completedTasks} (${Math.round(completionRate * 100)}%)
- Decisions: ${totalDecisions}
- Emergencies resolved: ${emergenciesResolved}
- Longest streak: ${profile?.longest_streak || 0} days
- Stage (describe naturally): ${toNaturalStage(userData.stage)}

PATTERN CONTEXT:
- Focus trend: ${patterns?.productivityPatterns.focusScoreTrend || 'steady'}
- Completion rate: ${Math.round((patterns?.taskPatterns.completionRate ?? 0) * 100)}%
- Emergency resolution rate: ${Math.round((patterns?.emergencyPatterns.resolutionRate ?? 0) * 100)}%

Follow STRUCTURE: Observe → Reframe → Question. Show what they hadn't noticed. Use natural stage language only—never raw codes. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes. End with one open question for next month.`

  const aiResponse = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    model: getAIModel(),
    maxTokens: 400,
    temperature: 0.7,
  })

  if (aiResponse) return aiResponse

  // Fallback template
  const lines: string[] = []
  lines.push('🎯 Monthly Founder Review')
  lines.push('')
  lines.push(
    "This month wasn't just a blur of days—you've been running repeated loops of planning, acting, and reflecting. Let's see what your system actually produced."
  )
  lines.push('')
  lines.push('Month in numbers:')
  lines.push(`• ${totalTasks} total tasks`)
  lines.push(`• ${completedTasks} completed (${Math.round(completionRate * 100)}%)`)
  lines.push(`• ${totalDecisions} decisions recorded`)
  lines.push(`• ${emergenciesResolved} fires extinguished`)
  if (profile?.longest_streak) {
    lines.push(`• ${profile.longest_streak} day streak (best so far)`)
  }
  lines.push('')
  lines.push('Growth patterns this month:')
  if (patterns?.productivityPatterns.focusScoreTrend === 'improving') {
    lines.push('• Your focus score is trending upward—your loop is becoming more intentional.')
  }
  if ((patterns?.taskPatterns.completionRate ?? 0) > 0.7) {
    lines.push(
      `• Strong execution rate around ${Math.round((patterns?.taskPatterns.completionRate ?? 0) * 100)}%—most of what you plan actually happens.`
    )
  }
  if ((patterns?.emergencyPatterns.resolutionRate ?? 0) > 0.8) {
    lines.push(
      `• High emergency resolution rate (${Math.round((patterns?.emergencyPatterns.resolutionRate ?? 0) * 100)}%)—you're not leaving many fires unattended.`
    )
  }
  lines.push('')
  lines.push('Monthly theme:')
  if (userData.stage === 'FIRE_FIGHTING_STAGE') {
    lines.push(
      "• You're in a fire‑fighting season. Next month can gently shift toward designing systems that reduce your most common fires."
    )
  } else if (userData.stage === 'SYSTEM_BUILDING_STAGE') {
    lines.push(
      "• You're in system‑building mode. Strengthening a few key processes will compound the gains you're already creating."
    )
  } else {
    lines.push(
      "• You're in a more balanced phase. Staying aware of the patterns that work will keep things from quietly drifting."
    )
  }
  lines.push('')
  lines.push("Next month's structural options:")
  if ((patterns?.emergencyPatterns.total ?? 0) > 0) {
    lines.push('• Choose one recurring emergency source and design a simple safeguard around it.')
  }
  lines.push(
    "• Decide on a \"minimum rhythm\": the smallest version of planning and reflecting you'll still do on hard days."
  )
  lines.push(
    '• Pick one habit that anchors you to protect, even when everything else flexes.'
  )
  lines.push('')
  lines.push(
    "Next month's focusing question: If you only improved one part of your daily loop, which change would reduce the most friction?"
  )
  return lines.join('\n')
}

/**
 * Generate a one-off emergency insight when the user logs a fire.
 * Short, calm, and pattern-aware.
 */
export async function generateEmergencyInsight(
  userId: string,
  emergencyDescription: string,
  severity: 'hot' | 'warm' | 'contained',
  promptDate?: string // Format: 'yyyy-MM-dd', defaults to today
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

  const systemPrompt = MRS_DEER_RULES + '\n\nYou are Mrs. Deer. Emergency insight: max 80 words. STRUCTURE: Observe → Reframe → Question. BANNED: Needle Mover, Action Plan, Smart Constraints, stage codes. Calm, supportive, never judgmental. Think with them, not at them.'

  const userPrompt = `Generate a personalized emergency insight for a founder who just logged a fire.

EMERGENCY DETAILS:
- Description: ${emergencyDescription}
- Severity: ${severity}
- Stage (describe naturally): ${toNaturalStage(stage)}

PATTERN CONTEXT (last 14 days):
- Total emergencies: ${totalEmergencies}
- Resolution rate: ${Math.round((patterns?.emergencyPatterns.resolutionRate ?? 0) * 100)}%

Follow STRUCTURE: (1) Observe—acknowledge the fire appropriately for severity (2) Reframe—put it in context of their recent pattern (3) Question—one open question about what would help. Use natural stage language only. BANNED: product terms, stage codes. Supportive, never prescriptive.`

  const targetDate = promptDate || format(new Date(), 'yyyy-MM-dd')
  
  const { data: existingPrompts } = await supabase
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
  
  const aiResponse = await generateAIPrompt({
    systemPrompt,
    userPrompt,
    model: getAIModel(),
    maxTokens: 200,
    temperature: 0.7,
  })

  if (aiResponse) {
    // Calculate generation count
    let generationCount = 1
    if (existingPrompts?.generation_count) {
      generationCount = existingPrompts.generation_count + 1
    }
    
    // Store AI-generated emergency insight in database
    const insertData = {
      user_id: userId,
      prompt_text: aiResponse,
      prompt_type: 'emergency',
      stage_context: stage,
      prompt_date: targetDate,
      generation_count: generationCount,
    }
    
    // Use server-side Supabase client for inserts (bypasses RLS)
    const serverSupabase = getServerSupabase()
    
    console.log(`[SAVE INSIGHT] Attempting to save emergency insight to personal_prompts:`, {
      table: 'personal_prompts',
      userId,
      promptType: 'emergency',
      targetDate,
      generationCount,
      promptTextLength: aiResponse.length,
      promptTextPreview: aiResponse.substring(0, 100),
      timestamp: new Date().toISOString(),
      usingServerClient: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })
    
    const { data: insertedData, error: insertError } = await serverSupabase
      .from('personal_prompts')
      .insert(insertData)
      .select()
    
    if (insertError) {
      console.error('[SAVE INSIGHT] ❌ Emergency insight insert FAILED:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        insertData
      })
    } else {
      console.log('[SAVE INSIGHT] ✅ Emergency insight insert SUCCEEDED:', {
        insertedRows: insertedData?.length || 0,
        insertedId: insertedData?.[0]?.id,
        insertedData: insertedData?.[0]
      })
    }
    
    console.log(`[Emergency Insight] Generated emergency insight (generation ${generationCount}/3) for ${targetDate}`)
    return aiResponse
  }

  // Fallback template
  const lines: string[] = []
  if (severity === 'hot') {
    lines.push('This is a hot fire—right now is about stabilizing, not perfecting the system.')
  } else if (severity === 'warm') {
    lines.push('This is a warm fire—important, but you still have room to respond deliberately.')
  } else {
    lines.push('This fire is contained—good containment, and useful data for your loop.')
  }

  if (totalEmergencies > 0) {
    if (totalEmergencies > 3) {
      lines.push(
        `You've logged ${totalEmergencies} emergencies in the last 14 days—this is starting to look like a pattern worth designing around.`
      )
    } else {
      lines.push(
        `This is one of ${totalEmergencies} emergencies in the last 14 days—use it as a concrete example, not a verdict on your system.`
      )
    }
  } else {
    lines.push('This is your first logged emergency in a while—treat it as a useful outlier to learn from.')
  }

  if (stage === 'FIRE_FIGHTING_STAGE') {
    lines.push(
      "Today's structural question: After you put this out, what is one small safeguard you could add so this exact fire is less likely to repeat?"
    )
  } else {
    lines.push(
      "Today's structural question: What is the simplest process or boundary that would turn this kind of fire into a routine, low-friction event next time?"
    )
  }

  const fallbackInsight = lines.join('\n')
  
  // Store fallback insight in database
  const insertData = {
    user_id: userId,
    prompt_text: fallbackInsight,
    prompt_type: 'emergency',
    stage_context: stage,
    prompt_date: targetDate,
    generation_count: 1,
  }
  
  // Use server-side Supabase client for inserts (bypasses RLS)
  const serverSupabase = getServerSupabase()
  
  console.log(`[SAVE INSIGHT] Attempting to save emergency fallback insight to personal_prompts:`, {
    table: 'personal_prompts',
    userId,
    promptType: 'emergency',
    targetDate,
    promptTextLength: fallbackInsight.length,
    timestamp: new Date().toISOString(),
    usingServerClient: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })
  
  const { data: insertedData, error: insertError } = await serverSupabase
    .from('personal_prompts')
    .insert(insertData)
    .select()
  
  if (insertError) {
    console.error('[SAVE INSIGHT] ❌ Emergency fallback insight insert FAILED:', {
      error: insertError,
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      insertData
    })
  } else {
    console.log('[SAVE INSIGHT] ✅ Emergency fallback insight insert SUCCEEDED:', {
      insertedRows: insertedData?.length || 0,
      insertedId: insertedData?.[0]?.id
    })
  }
  
  return fallbackInsight
}

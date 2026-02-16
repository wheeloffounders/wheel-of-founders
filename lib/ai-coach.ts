import { supabase } from './supabase'
import { format, subDays } from 'date-fns'
import { UserPatterns } from './analysis-engine'

export type AICoachTrigger = 'morning_before' | 'morning_after' | 'evening_after'

interface AICoachPromptData {
  message: string
  trigger: AICoachTrigger
}

/**
 * Generate AI Coach prompt based on trigger point and user data
 */
export async function generateAICoachPrompt(
  userId: string,
  trigger: AICoachTrigger,
  userTier: string
): Promise<string | null> {
  // Only Pro+ users get real-time prompts (beta users count as Pro+)
  const isProPlus = userTier === 'beta' || userTier === 'pro_plus'
  if (!isProPlus) return null

  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

    switch (trigger) {
      case 'morning_before': {
        // Get yesterday's data to inform today's planning
        const [yesterdayReview, yesterdayTasks] = await Promise.all([
          supabase
            .from('evening_reviews')
            .select('mood, energy, wins, lessons')
            .eq('user_id', userId)
            .eq('review_date', yesterday)
            .maybeSingle(),
          supabase
            .from('morning_tasks')
            .select('description, completed, needle_mover')
            .eq('user_id', userId)
            .eq('plan_date', yesterday),
        ])

        const review = yesterdayReview.data
        const tasks = yesterdayTasks.data || []
        const completedTasks = tasks.filter((t) => t.completed).length

        if (!review && tasks.length === 0) {
          return "Good morning! Ready to plan today? Start with 1-2 needle movers—what will move the needle most?"
        }

        const energyLevel = review?.energy || 0
        const moodLevel = review?.mood || 0

        if (energyLevel >= 4 && completedTasks >= 2) {
          return `Yesterday you had high energy and completed ${completedTasks} tasks. Today, capitalize on that momentum—what needle mover will you tackle first?`
        } else if (energyLevel <= 2) {
          return `Yesterday felt lower energy. Today, start with one clear priority and build momentum. What's the ONE thing that matters most?`
        } else if (completedTasks < tasks.length) {
          return `You completed ${completedTasks}/${tasks.length} tasks yesterday. Today, focus on fewer, higher-impact priorities. What's your needle mover?`
        }

        return `Based on yesterday's patterns, you're ready to plan today. What's the ONE thing that will move the needle most?`
      }

      case 'morning_after': {
        // Get today's plan to provide feedback
        const { data: todayTasks } = await supabase
          .from('morning_tasks')
          .select('description, needle_mover, action_plan')
          .eq('user_id', userId)
          .eq('plan_date', today)

        const tasks = todayTasks || []
        const needleMovers = tasks.filter((t) => t.needle_mover).length

        if (tasks.length === 0) {
          return null
        }

        if (needleMovers === 0 && tasks.length > 0) {
          return `You've planned ${tasks.length} tasks. Consider marking at least one as a needle mover—what will move the needle most today?`
        } else if (needleMovers >= 2) {
          return `Great planning! You have ${needleMovers} needle movers. Focus on these first—they'll create the most impact.`
        } else if (tasks.length > 3) {
          return `You've planned ${tasks.length} tasks. That's ambitious! Make sure your needle mover gets done first—everything else can wait.`
        }

        return `Your plan looks focused. Start with your needle mover—tackle it before anything else today.`
      }

      case 'evening_after': {
        // Get today's data to provide reflection insights
        const [todayReview, todayTasks] = await Promise.all([
          supabase
            .from('evening_reviews')
            .select('mood, energy, wins')
            .eq('user_id', userId)
            .eq('review_date', today)
            .maybeSingle(),
          supabase
            .from('morning_tasks')
            .select('description, completed, needle_mover')
            .eq('user_id', userId)
            .eq('plan_date', today),
        ])

        const review = todayReview.data
        const tasks = todayTasks.data || []
        const completedTasks = tasks.filter((t) => t.completed).length
        const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length

        if (!review && tasks.length === 0) {
          return null
        }

        const energyLevel = review?.energy || 0
        const moodLevel = review?.mood || 0

        if (needleMoversCompleted > 0) {
          return `You completed ${needleMoversCompleted} needle mover${needleMoversCompleted > 1 ? 's' : ''} today! That's what moves the needle. Keep this momentum going tomorrow.`
        } else if (completedTasks >= tasks.length * 0.8 && tasks.length > 0) {
          return `You completed ${completedTasks}/${tasks.length} tasks today—strong execution! Tomorrow, make sure your needle mover is first on the list.`
        } else if (energyLevel >= 4 && moodLevel >= 4) {
          return `You're ending today with high energy and good mood. That's a great foundation for tomorrow. What will you prioritize?`
        } else if (completedTasks < tasks.length * 0.5 && tasks.length > 0) {
          return `You completed ${completedTasks}/${tasks.length} tasks today. Tomorrow, try focusing on fewer priorities—quality over quantity.`
        }

        return `You've reflected on today. What patterns do you notice? Use them to plan a better tomorrow.`
      }

      default:
        return null
    }
  } catch (error) {
    console.error('Error generating AI Coach prompt:', error)
    return null
  }
}

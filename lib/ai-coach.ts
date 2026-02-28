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
          return "Good morning. No pressure to have it all figured out—what's the one thing that would make today feel like a win if it were the only thing you finished?"
        }

        const energyLevel = review?.energy || 0
        const moodLevel = review?.mood || 0

        if (energyLevel >= 4 && completedTasks >= 2) {
          return `Yesterday you had good energy and got ${completedTasks} things done. That momentum is real. This morning: what's the one piece of work that deserves to ride that wave first?`
        } else if (energyLevel <= 2) {
          return `Yesterday took something out of you—that's data, not a verdict. Today, one clear priority is enough. What's the single thing that would matter most if you protected it from everything else?`
        } else if (completedTasks < tasks.length) {
          return `You finished ${completedTasks} of ${tasks.length} yesterday. Less can be more: what's the one outcome that would make today feel intentional rather than full?`
        }

        return `Yesterday's in the books. This morning: what's the one thing that would make today feel like it belonged to you?`
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
          return `You've named ${tasks.length} things for today. If you could only protect one from getting crowded out, which one would it be? Start there.`
        } else if (needleMovers >= 2) {
          return `You've got ${needleMovers} priorities that really matter today. Guard the time for the first one—the rest will follow from that clarity.`
        } else if (tasks.length > 3) {
          return `${tasks.length} things is a lot to hold. Which one, if you did it first, would make the rest feel lighter? Put that one at the top.`
        }

        return `Your plan has a clear center. Do the one that matters most before the day pulls you elsewhere.`
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
          return `You finished what mattered most today—${needleMoversCompleted} piece${needleMoversCompleted > 1 ? 's' : ''} of work that really moved things. That's the kind of day that compounds. What made it possible?`
        } else if (completedTasks >= tasks.length * 0.8 && tasks.length > 0) {
          return `You got ${completedTasks} of ${tasks.length} done today. That's strong. Tomorrow: put the one that matters most first, and let the rest arrange around it.`
        } else if (energyLevel >= 4 && moodLevel >= 4) {
          return `You're closing the day with good energy and mood. That's a gift. What do you want to protect or extend when you plan tomorrow?`
        } else if (completedTasks < tasks.length * 0.5 && tasks.length > 0) {
          return `Today didn't go to plan—${completedTasks}/${tasks.length}. That's useful data, not a verdict. What's one small shift that would make tomorrow feel more yours?`
        }

        return `You've sat with today. What did you notice—about what worked, what drained you, or what you'd do differently? Let that shape tomorrow.`
      }

      default:
        return null
    }
  } catch (error) {
    console.error('Error generating AI Coach prompt:', error)
    return null
  }
}

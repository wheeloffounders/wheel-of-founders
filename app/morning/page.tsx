'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday } from 'date-fns'
import { Target, Zap, X, AlertCircle, Edit2, Check, Square, Save, X as XIcon, HelpCircle } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import { getFeatureAccess } from '@/lib/features'
import { DateSelector } from '@/components/DateSelector'
import { useUserLanguage } from '@/lib/use-user-language'
import { getUserGoal, getActionPlanOptions } from '@/lib/user-language'
import { trackEvent } from '@/lib/analytics'
import { trackFunnelStep } from '@/lib/analytics/track-funnel'


export type ActionPlanOption2 = 'my_zone' | 'systemize' | 'delegate_founder' | 'eliminate_founder' | 'quick_win_founder'

// Legacy constant for backward compatibility - use getActionPlanOptions() instead
export const ACTION_PLAN_OPTIONS_2: { value: ActionPlanOption2; label: string; emoji: string; description: string }[] = [
  { value: 'my_zone', label: 'My Zone', emoji: '🎯', description: 'Only I should do this - core strengths/strategy' },
  { value: 'systemize', label: 'Systemize', emoji: '⚙️', description: 'Create process/template or automate this' },
  { value: 'delegate_founder', label: 'Delegate', emoji: '👥', description: 'Assign to team member or VA' },
  { value: 'eliminate_founder', label: 'Eliminate', emoji: '🗑️', description: 'A nice-to-have or could forget about it' },
  { value: 'quick_win_founder', label: 'Quick Win', emoji: '⚡', description: 'I can knock this out fast (do immediately)' },
] as const

interface Task {
  id: string
  dbId?: string // Database ID for existing tasks
  description: string
  whyThisMatters: string
  needleMover: boolean | null
  isProactive: boolean | null
  actionPlan: ActionPlanOption2 | ''
  completed?: boolean
}

interface Decision {
  decision: string
  decisionType: 'strategic' | 'tactical'
  whyThisDecision: string
}

const EMPTY_TASK: Task = {
  id: '',
  description: '',
  whyThisMatters: '',
  needleMover: null,
  isProactive: null,
  actionPlan: 'my_zone',
}

function generateTaskId(): string {
  return crypto.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function MorningPage() {
  const router = useRouter()
  const lang = useUserLanguage() // Personalized language
  const [userGoal, setUserGoal] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [userTier, setUserTier] = useState<string>('beta')
  const [morningInsight, setMorningInsight] = useState<string | null>(null)
  const [postMorningInsight, setPostMorningInsight] = useState<string | null>(null)
  const [showAddFourthModal, setShowAddFourthModal] = useState(false)
  const [decision, setDecision] = useState<Decision>({
    decision: '',
    decisionType: 'strategic',
    whyThisDecision: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPlan, setHasPlan] = useState(false)
  const [editingTasks, setEditingTasks] = useState(false)
  const [editingDecision, setEditingDecision] = useState(false)
  const [planCreatedAt, setPlanCreatedAt] = useState<Date | null>(null)
  const [planUpdatedAt, setPlanUpdatedAt] = useState<Date | null>(null)
  const [decisionDbId, setDecisionDbId] = useState<string | null>(null)
  const [planDate, setPlanDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [planningMode, setPlanningMode] = useState<'full' | 'light'>('full')
  const funnelStepRef = useRef<Set<number>>(new Set())

  const fireFunnelStep = useCallback((step: number, name: string) => {
    if (funnelStepRef.current.has(step)) return
    funnelStepRef.current.add(step)
    trackFunnelStep('morning_flow', name, step)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
      
      // Load user's goal for personalized action plans
      const goal = await getUserGoal(session.user.id)
      setUserGoal(goal)
      
      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })
      
      if (features.dailyMorningPrompt) {
        // Fetch insights for THIS EXACT DATE ONLY (no cross-day fallback)
        try {
          console.log('[MORNING LOAD] Looking for morning prompt for date:', planDate, 'user:', session.user.id)
          
          // Query morning and post_morning separately so we get newest of each
          const planDateStart = new Date(planDate + 'T00:00:00').toISOString()
          const planDateEnd = new Date(planDate + 'T23:59:59').toISOString()

          const [morningRes, postMorningRes, fallbackRes] = await Promise.all([
            // Morning: get NEWEST only (generation 3 > 2 > 1)
            supabase
              .from('personal_prompts')
              .select('prompt_text, prompt_type, prompt_date, stage_context, generated_at')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'morning')
              .eq('prompt_date', planDate)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            // Post-morning: get NEWEST only
            supabase
              .from('personal_prompts')
              .select('prompt_text, prompt_type, prompt_date, generated_at')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'post_morning')
              .eq('prompt_date', planDate)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            // Fallback: if prompt_date fails, try generated_at date range
            supabase
              .from('personal_prompts')
              .select('prompt_text, prompt_type, stage_context, generated_at')
              .eq('user_id', session.user.id)
              .gte('generated_at', planDateStart)
              .lte('generated_at', planDateEnd)
              .in('prompt_type', ['morning', 'post_morning'])
              .order('generated_at', { ascending: false }),
          ])

          let morningInsightToShow = null
          let postMorningInsightToShow = null

          if (morningRes.error) {
            console.error('[MORNING LOAD] prompt_date query error:', morningRes.error.message)
          }
          if (morningRes.data) {
            morningInsightToShow = morningRes.data.prompt_text
            console.log('[MORNING LOAD] ✅ Found morning prompt for', planDate, 'generated_at:', morningRes.data.generated_at)
          } else if (fallbackRes.data?.length) {
            const morningFromFallback = fallbackRes.data.find(p => p.prompt_type === 'morning')
            if (morningFromFallback) {
              morningInsightToShow = morningFromFallback.prompt_text
              console.log('[MORNING LOAD] ✅ Found morning via fallback, generated_at:', morningFromFallback.generated_at)
            }
          }
          if (!morningInsightToShow) {
            console.log('[MORNING LOAD] ⚠️ No morning prompt for', planDate, '(generated when you save previous evening)')
          }

          if (postMorningRes.data) {
            postMorningInsightToShow = postMorningRes.data.prompt_text
            console.log('[MORNING LOAD] Found post-morning insight for', planDate)
          } else if (fallbackRes.data?.length) {
            const postFromFallback = fallbackRes.data.find(p => p.prompt_type === 'post_morning')
            if (postFromFallback) postMorningInsightToShow = postFromFallback.prompt_text
          }
          
          setMorningInsight(morningInsightToShow)
          setPostMorningInsight(postMorningInsightToShow)
        } catch (error) {
          console.error('[MORNING LOAD] Exception:', error)
        }
      }
    }
    checkAuth()
  }, [router, planDate])

  useEffect(() => {
    const loadTodayPlan = async () => {
      const session = await getUserSession()
      if (!session) return

      setLoading(true)
      try {
        const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
        
        const [prefsRes, tasksRes, decisionsRes, postMorningInsightRes] = await Promise.all([
          fetch('/api/user-preferences').then((r) => r.json()).catch(() => ({ planning_mode: 'full' })),
          supabase
            .from('morning_tasks')
            .select('*')
            .eq('plan_date', planDate)
            .eq('user_id', session.user.id)
            .order('task_order', { ascending: true }),
          supabase
            .from('morning_decisions')
            .select('*')
            .eq('plan_date', planDate)
            .eq('user_id', session.user.id)
            .maybeSingle(),
          // Fetch post_morning insight for THIS EXACT DATE ONLY (Mrs. Deer)
          features.dailyPostMorningPrompt
            ? (async () => {
                const { data, error } = await supabase
                  .from('personal_prompts')
                  .select('prompt_text, prompt_type, prompt_date, generated_at')
                  .eq('user_id', session.user.id)
                  .eq('prompt_date', planDate) // EXACT date match
                  .eq('prompt_type', 'post_morning')
                  .order('generated_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                
                return { data, error }
              })()
            : Promise.resolve({ data: null, error: null }),
        ])
        const planning_mode = (prefsRes as { planning_mode?: 'full' | 'light' })?.planning_mode ?? 'full'
        setPlanningMode(planning_mode)

        const loadedTasks = (tasksRes.data ?? []) as Array<{
          id: string
          description: string
          why_this_matters?: string
          needle_mover: boolean
          action_plan?: string
          completed?: boolean
          created_at: string
          updated_at: string
        }>

        // Load post_morning insight only if user has plan for this date (unlock after input)
        const hasPlanForDate = loadedTasks.length > 0 || decisionsRes.data
        console.log(`[Morning Page Load] Has plan for ${planDate}:`, hasPlanForDate)
        if (hasPlanForDate && postMorningInsightRes.data?.prompt_text) {
          console.log(`[Morning Page Load] Post-morning insight found for ${planDate} - setting`)
          setPostMorningInsight(postMorningInsightRes.data.prompt_text)
        } else if (!hasPlanForDate) {
          // Clear insights if no plan (they'll be unlocked after input)
          console.log(`[Morning Page Load] No plan for ${planDate} - clearing post-morning insight`)
          setPostMorningInsight(null)
        } else {
          console.log(`[Morning Page Load] Plan exists but no post-morning insight for ${planDate}`)
        }

        if (loadedTasks.length > 0 || decisionsRes.data) {
          setHasPlan(true)
          if (loadedTasks.length > 0) {
            setTasks(
              loadedTasks.map((t) => ({
                id: generateTaskId(),
                dbId: t.id,
                description: t.description,
                whyThisMatters: t.why_this_matters || '',
                needleMover: t.needle_mover ?? null,
                isProactive: t.is_proactive ?? null,
                actionPlan: (t.action_plan as ActionPlanOption2) || 'my_zone',
                completed: t.completed || false,
              }))
            )
            setPlanCreatedAt(new Date(loadedTasks[0].created_at))
            setPlanUpdatedAt(new Date(loadedTasks[0].updated_at))
          }
          if (decisionsRes.data) {
            setDecision({
              decision: decisionsRes.data.decision,
              decisionType: decisionsRes.data.decision_type as 'strategic' | 'tactical',
              whyThisDecision: decisionsRes.data.why_this_decision || '',
            })
            setDecisionDbId(decisionsRes.data.id)
            if (!planCreatedAt) {
              setPlanCreatedAt(new Date(decisionsRes.data.created_at))
              setPlanUpdatedAt(new Date(decisionsRes.data.updated_at))
            }
          }
        } else {
          setHasPlan(false)
          const maxTasks = planning_mode === 'light' ? 2 : 3
          setTasks(
            Array.from({ length: maxTasks }, () => ({ ...EMPTY_TASK, id: generateTaskId() }))
          )
          // Clear only post-morning (unlocks after plan save). Keep morning prompt — it's pre-generated from previous evening.
          console.log('[Morning Page Load] No plan for', planDate, '- clearing post-morning only')
          setPostMorningInsight(null)
        }
        trackEvent('morning_page_view', { has_existing_plan: loadedTasks.length > 0 || !!decisionsRes.data, plan_date: planDate })
        fireFunnelStep(1, 'morning_page_view')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan')
      } finally {
        setLoading(false)
      }
    }

    loadTodayPlan()
  }, [planDate])

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      fireFunnelStep(2, 'power_list_engaged')
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      )
    },
    [fireFunnelStep]
  )

  const maxTasks = planningMode === 'light' ? 2 : 3
  const handleAddTask = () => {
    if (tasks.length >= maxTasks) {
      if (maxTasks === 3) setShowAddFourthModal(true)
      return
    }
    setTasks((prev) => [...prev, { ...EMPTY_TASK, id: generateTaskId() }])
  }

  const confirmAddFourthTask = () => {
    setTasks((prev) => [...prev, { ...EMPTY_TASK, id: generateTaskId() }])
    setShowAddFourthModal(false)
  }

  const cancelAddFourthTask = () => setShowAddFourthModal(false)

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const savePlan = async () => {
    setSaving(true)
    setError(null)

    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      setSaving(false)
      router.push('/login')
      return
    }

    try {
      const filteredTasks = tasks.filter((t) => t.description.trim())
      
      // Database constraint limits task_order to 1-3, so only save first 3 tasks
      const tasksToSave = filteredTasks.slice(0, 3).map((t, i) => ({
        user_id: session.user.id,
        plan_date: planDate,
        task_order: i + 1,
        description: t.description.trim(),
        why_this_matters: t.whyThisMatters.trim() || null,
        needle_mover: t.needleMover ?? null,
        is_proactive: t.isProactive ?? null,
        action_plan: t.actionPlan || null,
        completed: t.completed || false,
      }))
      
      // Warn if more than 3 tasks (database constraint limits to 3)
      if (filteredTasks.length > 3) {
        console.warn(`Note: ${filteredTasks.length} tasks provided, but database constraint limits to 3. Only the first 3 tasks will be saved.`)
        setError(`Note: Only the first 3 tasks were saved. The database limits tasks to 3 per day.`)
      }

      await supabase.from('morning_tasks').delete().eq('plan_date', planDate).eq('user_id', session.user.id)
      if (tasksToSave.length > 0) {
        const { data: insertedTasks, error: insertTasksError } = await supabase
          .from('morning_tasks')
          .insert(tasksToSave)
          .select()
        if (insertTasksError) {
          console.error('Error inserting tasks:', insertTasksError)
          throw insertTasksError
        }
        if (insertedTasks && insertedTasks.length > 0) {
          setTasks((prev) =>
            prev.map((t, i) => ({
              ...t,
              dbId: insertedTasks[i]?.id,
            }))
          )
          if (!planCreatedAt) setPlanCreatedAt(new Date())
          setPlanUpdatedAt(new Date())
        }
      }

      if (decision.decision.trim()) {
        if (decisionDbId) {
          const { error: updateError } = await supabase
            .from('morning_decisions')
            .update({
              decision: decision.decision.trim(),
              decision_type: decision.decisionType,
              why_this_decision: decision.whyThisDecision.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', decisionDbId)
          if (updateError) throw updateError
        } else {
          await supabase.from('morning_decisions').delete().eq('plan_date', planDate).eq('user_id', session.user.id)
          const { data: insertedDec, error: insertDecError } = await supabase
            .from('morning_decisions')
            .insert({
              user_id: session.user.id,
              plan_date: planDate,
              decision: decision.decision.trim(),
              decision_type: decision.decisionType,
              why_this_decision: decision.whyThisDecision.trim() || null,
            })
            .select()
            .single()
          if (insertDecError) throw insertDecError
          if (insertedDec) {
            setDecisionDbId(insertedDec.id)
            if (!planCreatedAt) setPlanCreatedAt(new Date())
          }
        }
        setPlanUpdatedAt(new Date())
      }

      setHasPlan(true)
      setEditingTasks(false)
      setEditingDecision(false)

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      // Funnel step 3: plan complete
      fireFunnelStep(3, 'plan_complete')

      // Generate post-morning insight only (morning prompt is generated the previous evening)
      trackEvent('morning_plan_saved', {
        task_count: tasks.filter((t) => t.description.trim()).length,
        has_decision_log: !!(decision.decision?.trim()),
        needle_mover_count: tasks.filter((t) => t.needleMover === true).length,
        plan_date: planDate,
      })
      // Founder analytics: enqueue pattern extraction from decision
      const decisionText = [decision.decision?.trim(), decision.whyThisDecision?.trim()].filter(Boolean).join('\n')
      if (decisionText) {
        fetch('/api/analytics/enqueue-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_table: 'morning_decisions',
            source_id: decisionDbId || planDate,
            content: decisionText,
          }),
        }).catch(() => {})
      }
      // Founder analytics: feature usage
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'morning_plan',
          action: 'save',
          page: '/morning',
          metadata: {
            task_count: tasksToSave.length,
            has_needle_mover: tasksToSave.some((t) => (t as { needle_mover?: boolean }).needle_mover === true),
          },
        }),
      }).catch(() => {})

      if (features.dailyPostMorningPrompt) {
        try {
          console.log('[MORNING PLAN SAVE] Generating post-morning insight for date:', planDate)
          const res = await fetch('/api/personal-coaching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptType: 'post_morning', userId: session.user.id, promptDate: planDate }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.prompt) {
              console.log('[MORNING PLAN SAVE] Post-morning insight generated for', planDate)
              setTimeout(() => setPostMorningInsight(data.prompt as string), 500)
            }
          }
        } catch (error) {
          console.error('Failed to load post-morning AI prompt:', error)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save. Please try again.'
      console.error('Save plan error:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      setError(`${errorMessage} Check console for details.`)
    } finally {
      setSaving(false)
    }
  }

  const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task?.dbId) return

    const session = await getUserSession()
    if (!session) return

    const newCompleted = !currentCompleted
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)))

    const { error } = await supabase
      .from('morning_tasks')
      .update({ completed: newCompleted, updated_at: new Date().toISOString() })
      .eq('id', task.dbId)
      .eq('user_id', session.user.id)

    if (error) {
      setError('Failed to update completion status')
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t)))
    } else {
      setPlanUpdatedAt(new Date())
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'task_completion',
          action: 'complete',
          page: '/morning',
          metadata: { is_needle_mover: task.needleMover === true },
        }),
      }).catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
        <p className="text-gray-500">Loading your plan...</p>
      </div>
    )
  }

  const tasksCompleted = tasks.filter((t) => t.completed).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#152b50] dark:text-[#E2E8F0] mb-2">
          Morning Plan
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {hasPlan ? (isToday(new Date(planDate)) ? "Today's Plan" : `Plan for ${format(new Date(planDate), 'MMMM d, yyyy')}`) : 'Ready to own the day? Let\'s plan your focus.'}
        </p>
        <DateSelector selectedDate={planDate} onDateChange={setPlanDate} maxDaysBack={30} maxDaysForward={1} />
        {hasPlan && planCreatedAt && (
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Plan created: {format(planCreatedAt, 'h:mm a')}</span>
            {planUpdatedAt && planUpdatedAt.getTime() !== planCreatedAt.getTime() && (
              <span>Last updated: {format(planUpdatedAt, 'h:mm a')}</span>
            )}
          </div>
        )}
      </div>

      {/* Mrs. Deer AI Coach - Morning prompt: pre-generated from previous evening, shown before user saves plan */}
      {morningInsight && (
        <AICoachPrompt
          message={morningInsight}
          trigger="morning_before"
          onClose={() => {}}
        />
      )}

      {/* Power List */}
      {hasPlan && !editingTasks ? (
        <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-l-4 border-[#ef725c] dark:border-[#ef725c]/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] flex items-center gap-2">
              <Target className="w-5 h-5 text-[#ef725c]" />
              Today&apos;s Focus
            </h2>
            <button
              type="button"
              onClick={() => setEditingTasks(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-[#ef725c] transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No tasks planned for today.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    task.completed
                      ? 'bg-emerald-50 dark:bg-emerald-900/30'
                      : 'bg-gray-50 dark:bg-[#111827]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTaskCompletion(task.id, task.completed || false)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {task.completed ? (
                      <Check className="w-5 h-5 text-[#10b981]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-[#E2E8F0]">
                      {index + 1}. {task.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {task.needleMover !== null && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            task.needleMover
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {task.needleMover ? `✓ ${lang.needleMover}` : `○ Not ${lang.needleMover}`}
                        </span>
                      )}
                      {task.isProactive !== null && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            task.isProactive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                          }`}
                        >
                          {task.isProactive ? '↑ Proactive' : '↓ Reactive'}
                        </span>
                      )}
                      {task.actionPlan && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded">
                          {getActionPlanOptions(userGoal).find((o) => o.value === task.actionPlan)?.label || task.actionPlan}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.completed ? '1/1' : '0/1'} completed
                      </span>
                    </div>
                    {task.whyThisMatters && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">
                        {task.whyThisMatters}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-l-4 border-[#ef725c] dark:border-[#ef725c]/70">
          <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#ef725c]" />
            {lang.powerList}
          </h2>
          <div className="space-y-5">
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onChange={(updates) => updateTask(task.id, updates)}
                onRemove={tasks.length > 1 ? () => removeTask(task.id) : undefined}
                lang={lang}
                userGoal={userGoal}
              />
            ))}
          </div>
          {tasks.length < maxTasks && (
            <button
              type="button"
              onClick={handleAddTask}
              className="mt-4 w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#ef725c] hover:text-[#ef725c] transition"
            >
              + Add Task
            </button>
          )}
        </section>
      )}

      {/* Decision Log */}
      {hasPlan && !editingDecision && decision.decision && decision.decision.trim() ? (
        <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-l-4 border-[#152b50] dark:border-[#152b50]/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#152b50]" />
              {lang.decisionLog}
            </h2>
            <button
              type="button"
              onClick={() => setEditingDecision(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-[#152b50] transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-gray-900 dark:text-[#E2E8F0] font-medium">
              {decision.decision}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded capitalize">
                {decision.decisionType === 'strategic' ? lang.strategicLabel : lang.tacticalLabel}
              </span>
            </div>
            {decision.whyThisDecision && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
                {decision.whyThisDecision}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-white dark:bg-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-l-4 border-[#152b50] dark:border-[#152b50]/70">
          <h2 className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#152b50]" />
            Decision Log
          </h2>
          <div className="space-y-4">
          <div>
            <label
              htmlFor="decision"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              What's the key decision you're sitting on today?
            </label>
            <SpeechToTextInput
              id="decision"
              type="text"
              value={decision.decision}
              onChange={(e) =>
                setDecision((d) => ({ ...d, decision: e.target.value }))
              }
              placeholder="e.g. Hire a part-time ops lead"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {lang.strategicLabel} (🎯) vs {lang.tacticalLabel} (⚡)
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setDecision((d) => ({ ...d, decisionType: 'strategic' }))
                }
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  decision.decisionType === 'strategic'
                    ? 'bg-[#152b50] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                🎯 {lang.strategicLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDecision((d) => ({ ...d, decisionType: 'tactical' }))
                }
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  decision.decisionType === 'tactical'
                    ? 'bg-[#152b50] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ⚡ {lang.tacticalLabel}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="why-decision"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              What's your gut telling you? Capture your reasoning.
            </label>
            <SpeechToTextInput
              as="textarea"
              id="why-decision"
              rows={3}
              value={decision.whyThisDecision}
              onChange={(e) =>
                setDecision((d) => ({ ...d, whyThisDecision: e.target.value }))
              }
              placeholder="Capture your reasoning..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent resize-none text-gray-900 dark:text-[#E2E8F0] dark:bg-[#0F1419]"
            />
          </div>
        </div>
      </section>
      )}

      {/* Save/Cancel Buttons */}
      {(editingTasks || editingDecision || !hasPlan) && (
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={savePlan}
            disabled={saving}
            className="flex-1 py-2 px-4 bg-[#ef725c] text-white rounded-lg font-medium hover:bg-[#e8654d] disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                Starting...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Start my day
              </>
            )}
          </button>
          {(editingTasks || editingDecision) && (
            <button
              type="button"
              onClick={() => {
                setEditingTasks(false)
                setEditingDecision(false)
                // Reload data to reset changes
                window.location.reload()
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
            >
              <XIcon className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {hasPlan && !editingTasks && !editingDecision && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
          <p className="font-medium">Your plan for today is set! You can adjust as needed.</p>
        </div>
      )}

      {/* Mrs. Deer AI Coach - Plan Review Insight (permanent, always shown if exists) */}
      {/* Post-morning insight: only after user has submitted morning input for this date */}
      {hasPlan && postMorningInsight && (
        <AICoachPrompt
          message={postMorningInsight}
          trigger="morning_after"
          onClose={() => {
            // Insights are permanent - don't actually close them
            // This handler is kept for component compatibility but does nothing
          }}
        />
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/history"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            View Full History
          </Link>
          <Link
            href="/evening"
            className="px-4 py-2 bg-[#152b50] text-white rounded-lg hover:bg-[#1a3565] transition text-sm font-medium"
          >
            Evening Review →
          </Link>
        </div>
      </div>

      {/* 4th Task Warning Modal */}
      {showAddFourthModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={cancelAddFourthTask}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[#152b50] mb-2">
              Add 4th Task?
            </h3>
            <p className="text-gray-600 mb-6">
              Research shows 3 tasks optimizes focus. Add anyway?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelAddFourthTask}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddFourthTask}
                className="flex-1 py-2 px-4 bg-[#ef725c] text-white rounded-lg font-medium hover:bg-[#e8654d]"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function TaskCard({
  task,
  index,
  onChange,
  onRemove,
  lang,
  userGoal,
}: {
  task: Task
  index: number
  onChange: (updates: Partial<Task>) => void
  onRemove?: () => void
  lang: ReturnType<typeof useUserLanguage>
  userGoal: string | null
}) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#152b50]">Task {index + 1}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-500 hover:text-red-500 p-1"
            aria-label="Remove task"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <SpeechToTextInput
        type="text"
        value={task.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder={lang.taskLabel}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#152b50] focus:border-transparent text-gray-900"
      />

      <SpeechToTextInput
        type="text"
        value={task.whyThisMatters}
        onChange={(e) => onChange({ whyThisMatters: e.target.value })}
        placeholder={lang.priorityLabel}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#152b50] focus:border-transparent text-gray-900"
      />

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          {lang.actionPlanLabel}
        </label>
        <select
          value={task.actionPlan}
          onChange={(e) => onChange({ actionPlan: e.target.value as ActionPlanOption2 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900"
        >
          {getActionPlanOptions(userGoal).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.emoji} {opt.label} - {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* Task Classification */}
      <div className="pt-2 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          {/* Needle Mover */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                {lang.needleMover}?
              </label>
              <InfoTooltip text={lang.needleMoverTooltip} />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange({ needleMover: true })}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition ${
                  task.needleMover === true
                    ? 'bg-[#152b50] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => onChange({ needleMover: false })}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition ${
                  task.needleMover === false
                    ? 'bg-[#152b50] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Initiative */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Initiative:
              </label>
              <InfoTooltip text="Did you initiate this (Proactive) or respond to something (Reactive)?" />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange({ isProactive: true })}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition ${
                  task.isProactive === true
                    ? 'bg-[#152b50] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Proactive
              </button>
              <button
                type="button"
                onClick={() => onChange({ isProactive: false })}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition ${
                  task.isProactive === false
                    ? 'bg-[#152b50] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Reactive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

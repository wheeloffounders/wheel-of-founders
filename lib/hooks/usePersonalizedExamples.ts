'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

const CACHE_KEY = 'wof_personalized_examples'
const CACHE_HOURS = 24

interface CachedExamples {
  goal: string
  decision: string
  task: string
  action: Record<string, string>
  ts: number
}

function getCached(goal: string): CachedExamples | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedExamples
    if (cached.goal !== goal) return null
    const ageHours = (Date.now() - cached.ts) / (1000 * 60 * 60)
    if (ageHours > CACHE_HOURS) return null
    return cached
  } catch {
    return null
  }
}

function setCached(examples: CachedExamples): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(examples))
  } catch {
    // ignore
  }
}

/** Extract a short key phrase from goal for action plan examples */
function extractKeyPhrase(goal: string): string {
  const trimmed = goal.trim()
  if (!trimmed) return 'your priority'
  const words = trimmed.split(/\s+/).slice(0, 4)
  return words.join(' ') || 'your priority'
}

const DEFAULT_DECISION = 'Hire a part-time ops lead'
const DEFAULT_TASK = 'Write blog post, Research competitors'
const DEFAULT_ACTION: Record<string, string> = {
  my_zone: 'Only I should do this - core strengths/strategy',
  systemize: 'Create process/template or automate this',
  delegate_founder: 'Assign to team member or VA',
  eliminate_founder: 'A nice-to-have or could forget about it',
  quick_win_founder: 'I can knock this out fast (do immediately)',
}

export interface PersonalizedExamples {
  decision: string
  task: string
  action: Record<string, string>
  loading: boolean
}

export function usePersonalizedExamples(): PersonalizedExamples {
  const [goal, setGoal] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [examples, setExamples] = useState({
    decision: DEFAULT_DECISION,
    task: DEFAULT_TASK,
    action: { ...DEFAULT_ACTION },
  })

  const fetchGoal = useCallback(async () => {
    const session = await getUserSession()
    if (!session) return null

    const { data } = await supabase
      .from('user_profiles')
      .select('primary_goal_text')
      .eq('id', session.user.id)
      .maybeSingle()

    const text = (data as { primary_goal_text?: string } | null)?.primary_goal_text?.trim()
    return text || null
  }, [])

  const generateExamples = useCallback(async (goalText: string) => {
    const cached = getCached(goalText)
    if (cached) {
      setExamples({
        decision: cached.decision,
        task: cached.task,
        action: cached.action,
      })
      return
    }

    const keyPhrase = extractKeyPhrase(goalText)
    const actionExamples: Record<string, string> = {
      my_zone: `Work on ${keyPhrase}`,
      systemize: `Create a system for ${keyPhrase}`,
      delegate_founder: `Find someone to help with ${keyPhrase}`,
      eliminate_founder: DEFAULT_ACTION.eliminate_founder,
      quick_win_founder: `Small step toward ${keyPhrase}`,
    }

    const session = await getUserSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session) {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      if (supabaseSession?.access_token) {
        headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
      }
    }

    let decision = DEFAULT_DECISION
    let task = DEFAULT_TASK

    try {
      const [decisionRes, taskRes] = await Promise.all([
        fetch('/api/generate-example', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'decision', goal: goalText }),
        }),
        fetch('/api/generate-example', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'task', goal: goalText }),
        }),
      ])

      const decisionData = await decisionRes.json().catch(() => ({}))
      const taskData = await taskRes.json().catch(() => ({}))

      if (decisionData.example?.trim()) decision = decisionData.example.trim()
      if (taskData.example?.trim()) task = taskData.example.trim()
    } catch {
      // Keep defaults
    }

    const result = {
      decision,
      task,
      action: actionExamples,
    }
    setExamples(result)
    setCached({
      goal: goalText,
      ...result,
      ts: Date.now(),
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const goalText = await fetchGoal()
      if (cancelled) return

      setGoal(goalText)
      setLoading(false)

      if (goalText) {
        await generateExamples(goalText)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [fetchGoal, generateExamples])

  return {
    ...examples,
    loading,
  }
}
